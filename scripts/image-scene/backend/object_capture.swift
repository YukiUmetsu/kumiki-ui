// Optional macOS benchmark boundary. No framework code or models are redistributed.
// Compile: swiftc -parse-as-library object_capture.swift capture_samples.swift -o /local/cache/object-capture
import Foundation
import RealityKit
import CoreImage

struct CaptureFailure: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

@main struct ObjectCapture {
    static func emit(_ value: [String: Any]) throws {
        let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    }

    static func main() async {
        do { try await run() }
        catch {
            FileHandle.standardError.write(Data("Object Capture: \(error). Check the capture inputs and local macOS/Swift SDK.\n".utf8))
            exit(1)
        }
    }

    static func requestKind(_ request: PhotogrammetrySession.Request) -> String {
        switch request { case .modelFile: return "model"; case .poses: return "poses"; default: return "other" }
    }

    static func run() async throws {
        let args = Array(CommandLine.arguments.dropFirst())
        if args == ["--probe"] {
            try emit(["supported": PhotogrammetrySession.isSupported, "backend": "apple-object-capture",
                      "os": ProcessInfo.processInfo.operatingSystemVersionString])
            return
        }
        if args == ["--help"] {
            print("(--input <training-photo-directory> | --views <prepared-views.json>) --output <new-model.usdz> [--detail preview|medium|full] [--checkpoint <directory>]\n--validate-views <prepared-views.json> decodes masks/depth without reconstruction")
            return
        }
        let allowed: Set<String> = ["--input", "--views", "--validate-views", "--output", "--detail", "--checkpoint"]
        var options: [String: String] = [:]
        guard args.count % 2 == 0 else { throw CaptureFailure("Options need a value; run --help") }
        for index in stride(from: 0, to: args.count, by: 2) {
            guard allowed.contains(args[index]), options[args[index]] == nil else {
                throw CaptureFailure("Unknown or repeated option \(args[index]); run --help")
            }
            options[args[index]] = args[index + 1]
        }
        if let path = options["--validate-views"] {
            guard options.count == 1 else { throw CaptureFailure("--validate-views is a standalone check; it does not reconstruct or publish a model") }
            let document = try PreparedCaptureViews.read(URL(fileURLWithPath: path))
            let context = CIContext(options: [.cacheIntermediates: false])
            var views: [[String: Any]] = []
            for view in document.views {
                views.append(try autoreleasepool { try loadPreparedCaptureSample(view, context: context).diagnostic })
            }
            try emit(["schemaVersion": 1, "mode": document.mode, "views": views, "visualApproval": "pending"])
            return
        }
        guard (options["--input"] == nil) != (options["--views"] == nil) else {
            throw CaptureFailure("Provide exactly one of --input or --views")
        }
        guard let outputPath = options["--output"] else { throw CaptureFailure("Provide --output; run --help") }
        let details: [String: PhotogrammetrySession.Request.Detail] = ["preview": .preview, "medium": .medium, "full": .full]
        guard let detail = details[options["--detail"] ?? "medium"] else {
            throw CaptureFailure("Detail must be preview, medium or full")
        }
        let output = URL(fileURLWithPath: outputPath).standardizedFileURL
        let fileManager = FileManager.default
        guard output.pathExtension.lowercased() == "usdz" else { throw CaptureFailure("Output must end in .usdz") }
        for path in [output.path, output.path + ".poses.json", output.path + ".report.json", output.path + ".failure.json"] {
            guard !fileManager.fileExists(atPath: path) else { throw CaptureFailure("Output already exists: \(path); use a new revision") }
        }
        let prepared = try options["--views"].map { try PreparedCaptureViews.read(URL(fileURLWithPath: $0)) }
        var input: URL?
        let photoCount: Int
        if let prepared { photoCount = prepared.views.count }
        else {
            let directory = URL(fileURLWithPath: options["--input"]!).standardizedFileURL
            var isDirectory: ObjCBool = false
            guard fileManager.fileExists(atPath: directory.path, isDirectory: &isDirectory), isDirectory.boolValue else {
                throw CaptureFailure("Training-photo directory does not exist: \(directory.path)")
            }
            photoCount = try fileManager.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
                .filter { ["jpg", "jpeg", "png", "heic", "tif", "tiff"].contains($0.pathExtension.lowercased()) }.count
            input = directory
        }
        guard photoCount >= 3 else { throw CaptureFailure("Provide at least three training photographs; do not include held-out evaluation images") }
        guard PhotogrammetrySession.isSupported else { throw CaptureFailure("This machine does not support RealityKit photogrammetry") }
        try fileManager.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        var config = PhotogrammetrySession.Configuration()
        config.isObjectMaskingEnabled = true
        if let checkpoint = options["--checkpoint"] {
            let directory = URL(fileURLWithPath: checkpoint)
            try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
            config.checkpointDirectory = directory
        }
        let state = PreparedCaptureInputState()
        let session: PhotogrammetrySession
        if let prepared { session = try PhotogrammetrySession(input: PreparedCaptureSamples(views: prepared.views, state: state), configuration: config) }
        else { session = try PhotogrammetrySession(input: input!, configuration: config) }
        var complete = false
        defer { if !complete { session.cancel() } }
        try state.check()
        let started = Date()
        var warnings: [String] = []
        var modelComplete = false
        var posesComplete = false
        try session.process(requests: [.modelFile(url: output, detail: detail), .poses])
        for try await event in session.outputs {
            try state.check()
            switch event {
            case .requestComplete(_, .modelFile): modelComplete = true
            case .requestComplete(_, .poses(let value)):
                if let prepared, value.posesBySample.count != prepared.views.count {
                    let aligned = Set(value.posesBySample.keys.compactMap { state.view(for: $0)?.id })
                    let missing = prepared.views.map(\.id).filter { !aligned.contains($0) }
                    let failure: [String: Any] = ["schemaVersion": 1, "status": "failed", "reason": "incomplete-alignment",
                        "requestedViews": prepared.views.count, "alignedViewIds": aligned.sorted(), "unalignedViewIds": missing,
                        "modelIsReady": false, "visualApproval": "pending"]
                    try JSONSerialization.data(withJSONObject: failure, options: [.sortedKeys])
                        .write(to: URL(fileURLWithPath: output.path + ".failure.json"), options: .atomic)
                    throw CaptureFailure("Only \(aligned.count)/\(prepared.views.count) prepared views aligned; missing: \(missing.prefix(16).joined(separator: ", ")). Supply overlapping photographs of one rigid subject; do not publish partial coverage")
                }
                let views: [[String: Any]] = try value.posesBySample.keys.sorted().map { id in
                    guard let pose = value.posesBySample[id] else { throw CaptureFailure("Missing native pose \(id)") }
                    let view = state.view(for: id)
                    guard let file = view.map({ URL(fileURLWithPath: $0.image).lastPathComponent }) ?? value.urlsBySample[id]?.lastPathComponent else {
                        throw CaptureFailure("Pose \(id) lost its source-photo identity")
                    }
                    let matrix = pose.transform.matrix
                    let values = (0..<4).flatMap { column in (0..<4).map { row in matrix[column][row] } }
                    guard values.allSatisfy({ $0.isFinite }) else { throw CaptureFailure("View \(view?.id ?? file) has a nonfinite camera pose") }
                    return ["sampleId": id, "id": view?.id ?? String(id), "file": file, "cameraToWorld": values]
                }
                posesComplete = true
                let data = try JSONSerialization.data(withJSONObject: ["schemaVersion": 1, "views": views], options: [.sortedKeys])
                try data.write(to: URL(fileURLWithPath: output.path + ".poses.json"), options: .atomic)
            case .requestError(_, let error): throw error
            case .requestProgress(let request, let fraction): try emit(["event": "progress", "request": requestKind(request), "fraction": fraction])
            case .requestProgressInfo(let request, let info):
                var progress: [String: Any] = ["event": "stage", "request": requestKind(request), "stage": info.processingStage.map { String(describing: $0) } ?? "unknown"]
                if let remaining = info.estimatedRemainingTime, remaining.isFinite, remaining >= 0 { progress["estimatedSecondsRemaining"] = remaining }
                try emit(progress)
            case .invalidSample(let id, let reason):
                if prepared != nil { throw CaptureFailure("Prepared view \(state.view(for: id)?.id ?? String(id)) is invalid: \(reason)") }
                warnings.append("Invalid sample \(id): \(reason)")
            case .skippedSample(let id):
                if prepared != nil { throw CaptureFailure("Prepared view \(state.view(for: id)?.id ?? String(id)) was skipped; correct its framing/overlap before reconstructing") }
                warnings.append("Skipped sample \(id)")
            case .automaticDownsampling: warnings.append("Backend automatically downsampled source imagery")
            case .processingCancelled: throw CaptureFailure("Reconstruction was cancelled; output is not ready")
            case .processingComplete:
                guard modelComplete, posesComplete, fileManager.fileExists(atPath: output.path) else {
                    throw CaptureFailure("Backend completed without a model; do not publish this revision")
                }
                let report: [String: Any] = ["schemaVersion": 1, "backend": "apple-object-capture",
                    "os": ProcessInfo.processInfo.operatingSystemVersionString, "trainingViews": photoCount,
                    "elapsedSeconds": Date().timeIntervalSince(started), "detail": options["--detail"] ?? "medium",
                    "automaticMaskingRequested": prepared == nil, "preparedMaskViews": prepared?.views.count ?? 0,
                    "suppliedDepthViews": prepared?.views.filter { $0.depth != nil }.count ?? 0, "maskQualityVerified": false,
                    "warnings": warnings, "visualApproval": "pending"]
                try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys])
                    .write(to: URL(fileURLWithPath: output.path + ".report.json"), options: .atomic)
                complete = true
                try emit(["event": "complete", "output": output.path])
                return
            default: break
            }
        }
        throw CaptureFailure("Backend stream ended without processingComplete")
    }
}
