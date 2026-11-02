// Optional macOS benchmark boundary. No framework code or models are redistributed.
// Compile: swiftc -parse-as-library object_capture.swift -o /local/cache/object-capture
import Foundation
import RealityKit

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

    static func run() async throws {
        let args = Array(CommandLine.arguments.dropFirst())
        if args == ["--probe"] {
            try emit(["supported": PhotogrammetrySession.isSupported, "backend": "apple-object-capture",
                      "os": ProcessInfo.processInfo.operatingSystemVersionString])
            return
        }
        if args == ["--help"] {
            print("--input <training-photo-directory> --output <new-model.usdz> [--detail preview|medium|full] [--checkpoint <directory>]")
            return
        }
        let allowed: Set<String> = ["--input", "--output", "--detail", "--checkpoint"]
        var options: [String: String] = [:]
        guard args.count % 2 == 0 else { throw CaptureFailure("Options need a value; run --help") }
        for index in stride(from: 0, to: args.count, by: 2) {
            guard allowed.contains(args[index]), options[args[index]] == nil else {
                throw CaptureFailure("Unknown or repeated option \(args[index]); run --help")
            }
            options[args[index]] = args[index + 1]
        }
        guard let inputPath = options["--input"], let outputPath = options["--output"] else {
            throw CaptureFailure("Provide --input and --output; run --help")
        }
        let details: [String: PhotogrammetrySession.Request.Detail] = ["preview": .preview, "medium": .medium, "full": .full]
        guard let detail = details[options["--detail"] ?? "medium"] else {
            throw CaptureFailure("Detail must be preview, medium or full")
        }
        let input = URL(fileURLWithPath: inputPath).standardizedFileURL
        let output = URL(fileURLWithPath: outputPath).standardizedFileURL
        let fileManager = FileManager.default
        guard output.pathExtension.lowercased() == "usdz" else { throw CaptureFailure("Output must end in .usdz") }
        for path in [output.path, output.path + ".poses.json", output.path + ".report.json"] {
            guard !fileManager.fileExists(atPath: path) else { throw CaptureFailure("Output already exists: \(path); use a new revision") }
        }
        var isDirectory: ObjCBool = false
        guard fileManager.fileExists(atPath: input.path, isDirectory: &isDirectory), isDirectory.boolValue else {
            throw CaptureFailure("Training-photo directory does not exist: \(input.path)")
        }
        let photos = try fileManager.contentsOfDirectory(at: input, includingPropertiesForKeys: nil)
            .filter { ["jpg", "jpeg", "png", "heic", "tif", "tiff"].contains($0.pathExtension.lowercased()) }
        guard photos.count >= 3 else { throw CaptureFailure("Provide at least three training photographs; do not include held-out evaluation images") }
        guard PhotogrammetrySession.isSupported else { throw CaptureFailure("This machine does not support RealityKit photogrammetry") }
        try fileManager.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        var config = PhotogrammetrySession.Configuration()
        config.isObjectMaskingEnabled = true
        if let checkpoint = options["--checkpoint"] {
            let directory = URL(fileURLWithPath: checkpoint)
            try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
            config.checkpointDirectory = directory
        }
        let session = try PhotogrammetrySession(input: input, configuration: config)
        let started = Date()
        var warnings: [String] = []
        var modelComplete = false
        try session.process(requests: [.modelFile(url: output, detail: detail), .poses])
        for try await event in session.outputs {
            switch event {
            case .requestComplete(_, .modelFile): modelComplete = true
            case .requestComplete(_, .poses(let value)):
                let views: [[String: Any]] = value.posesBySample.keys.sorted().compactMap { id in
                    guard let pose = value.posesBySample[id], let url = value.urlsBySample[id] else { return nil }
                    let matrix = pose.transform.matrix
                    return ["sampleId": id, "file": url.lastPathComponent,
                            "cameraToWorld": (0..<4).flatMap { column in (0..<4).map { row in matrix[column][row] } }]
                }
                let data = try JSONSerialization.data(withJSONObject: ["schemaVersion": 1, "views": views], options: [.sortedKeys])
                try data.write(to: URL(fileURLWithPath: output.path + ".poses.json"), options: .atomic)
            case .requestError(_, let error): throw error
            case .requestProgress(_, let fraction): try emit(["event": "progress", "fraction": fraction])
            case .requestProgressInfo(_, let info):
                try emit(["event": "stage", "stage": String(describing: info.processingStage),
                          "estimatedSecondsRemaining": info.estimatedRemainingTime ?? -1])
            case .invalidSample(let id, let reason): warnings.append("Invalid sample \(id): \(reason)")
            case .skippedSample(let id): warnings.append("Skipped sample \(id)")
            case .automaticDownsampling: warnings.append("Backend automatically downsampled source imagery")
            case .processingCancelled: throw CaptureFailure("Reconstruction was cancelled; output is not ready")
            case .processingComplete:
                guard modelComplete, fileManager.fileExists(atPath: output.path) else {
                    throw CaptureFailure("Backend completed without a model; do not publish this revision")
                }
                let report: [String: Any] = ["schemaVersion": 1, "backend": "apple-object-capture",
                    "os": ProcessInfo.processInfo.operatingSystemVersionString, "trainingViews": photos.count,
                    "elapsedSeconds": Date().timeIntervalSince(started), "detail": options["--detail"] ?? "medium",
                    "automaticMaskingRequested": true, "maskQualityVerified": false,
                    "warnings": warnings, "visualApproval": "pending"]
                try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys])
                    .write(to: URL(fileURLWithPath: output.path + ".report.json"), options: .atomic)
                try emit(["event": "complete", "output": output.path])
                return
            default: break
            }
        }
        throw CaptureFailure("Backend stream ended without processingComplete")
    }
}
