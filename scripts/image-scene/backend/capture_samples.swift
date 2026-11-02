// Local prepared-photo boundary; never guesses mask polarity or depth units.
import Foundation
import RealityKit
import CoreImage
import CoreVideo
import ImageIO

struct PreparedCaptureViews: Decodable {
    let schemaVersion: Int
    let mode: String
    let views: [PreparedCaptureView]

    static func read(_ url: URL) throws -> PreparedCaptureViews {
        let bytes = try Data(contentsOf: url, options: .mappedIfSafe)
        guard bytes.count <= 32 * 1024 * 1024 else { throw CaptureFailure("Prepared view set exceeds the 32 MiB metadata budget") }
        if let object = try JSONSerialization.jsonObject(with: bytes) as? [String: Any],
           let views = object["views"] as? [[String: Any]], views.contains(where: { $0["calibration"] != nil }) {
            throw CaptureFailure("This native backend cannot apply a calibration override. Do not silently discard calibrated intrinsics/poses; use a calibrated reconstruction backend")
        }
        let document = try JSONDecoder().decode(PreparedCaptureViews.self, from: bytes)
        guard document.schemaVersion == 1 else { throw CaptureFailure("Prepared views require schemaVersion 1") }
        guard ["camera-orbit", "object-rotation"].contains(document.mode) else { throw CaptureFailure("Declare camera-orbit or object-rotation explicitly") }
        guard (3...4096).contains(document.views.count) else { throw CaptureFailure("Provide 3–4096 distinct prepared views; three is a syntax floor, not a coverage guarantee") }
        let directory = url.deletingLastPathComponent()
        var ids = Set<String>(), paths = Set<String>()
        let views = try document.views.map { view -> PreparedCaptureView in
            guard !view.id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, view.id.count <= 128,
                  ids.insert(view.id).inserted else { throw CaptureFailure("Prepared views need distinct nonempty IDs") }
            let image = try resolvedCapturePath(view.image, directory: directory, label: "view \(view.id) image")
            guard paths.insert(image).inserted else { throw CaptureFailure("Provide distinct source photographs; view \(view.id) repeats an image") }
            let mask = try resolvedCapturePath(view.mask, directory: directory, label: "view \(view.id) mask")
            let depth: PreparedCaptureDepth?
            if let supplied = view.depth {
                guard supplied.encoding == "camera-z-meters-f32" else { throw CaptureFailure("View \(view.id) depth must use camera-z-meters-f32, never brightness or relative depth") }
                depth = PreparedCaptureDepth(path: try resolvedCapturePath(supplied.path, directory: directory, label: "view \(view.id) depth"), encoding: supplied.encoding)
            } else { depth = nil }
            let dimensions = try captureDimensions(image, label: "view \(view.id) image", canonical: true)
            guard try captureDimensions(mask, label: "view \(view.id) mask", canonical: true) == dimensions else {
                throw CaptureFailure("View \(view.id) mask must match the canonical image pixel grid \(dimensions.0)×\(dimensions.1)")
            }
            if let depth, try captureDimensions(depth.path, label: "view \(view.id) depth", canonical: true) != dimensions {
                throw CaptureFailure("View \(view.id) depth must match the canonical image pixel grid")
            }
            return PreparedCaptureView(id: view.id, image: image, mask: mask, depth: depth)
        }
        return PreparedCaptureViews(schemaVersion: 1, mode: document.mode, views: views)
    }
}
struct PreparedCaptureView: Decodable {
    let id: String
    let image: String
    let mask: String
    let depth: PreparedCaptureDepth?
}
struct PreparedCaptureDepth: Decodable { let path: String; let encoding: String }

/** Same loader is used by validation and the actual reconstruction iterator. */
func loadPreparedCaptureSample(_ view: PreparedCaptureView, context: CIContext) throws -> (sample: PhotogrammetrySample, diagnostic: [String: Any]) {
    var sample = try PhotogrammetrySample(contentsOf: URL(fileURLWithPath: view.image))
    let width = CVPixelBufferGetWidth(sample.image), height = CVPixelBufferGetHeight(sample.image)
    let mask = try numericCaptureBuffer(view.mask, width: width, height: height, isDepth: false, label: "View \(view.id) mask", context: context)
    sample.objectMask = mask.buffer
    var diagnostic: [String: Any] = ["id": view.id, "sampleId": sample.id, "width": width, "height": height, "maskPresent": sample.objectMask != nil, "maskPixelFormat": capturePixelFormat(mask.buffer), "imagePixelFormat": capturePixelFormat(sample.image), "depthPresent": false]
    if let depth = view.depth {
        let map = try numericCaptureBuffer(depth.path, width: width, height: height, isDepth: true, label: "View \(view.id) depth", context: context)
        sample.depthDataMap = map.buffer
        diagnostic["depthPresent"] = sample.depthDataMap != nil
        diagnostic["depthPixelFormat"] = capturePixelFormat(map.buffer)
        diagnostic["depthRangeMeters"] = [map.minimum, map.maximum]
    }
    return (sample, diagnostic)
}

/** A lazy Sequence bounds source decoding; an input failure cancels readiness, never drops a view silently. */
final class PreparedCaptureInputState {
    private let lock = NSLock()
    private var inputFailure: Error?
    private var identities: [Int: PreparedCaptureView] = [:]
    func register(_ sample: PhotogrammetrySample, view: PreparedCaptureView) throws {
        lock.lock(); defer { lock.unlock() }
        guard identities[sample.id] == nil else { throw CaptureFailure("Native sample IDs collided for view \(view.id)") }
        identities[sample.id] = view
    }
    func record(_ error: Error) { lock.lock(); defer { lock.unlock() }; if inputFailure == nil { inputFailure = error } }
    func check() throws { lock.lock(); defer { lock.unlock() }; if let inputFailure { throw inputFailure } }
    func view(for id: Int) -> PreparedCaptureView? { lock.lock(); defer { lock.unlock() }; return identities[id] }
}
struct PreparedCaptureSamples: Sequence {
    let views: [PreparedCaptureView]
    let state: PreparedCaptureInputState
    func makeIterator() -> AnyIterator<PhotogrammetrySample> {
        var index = 0
        let context = CIContext(options: [.cacheIntermediates: false])
        return AnyIterator {
            guard index < views.count else { return nil }
            let view = views[index]; index += 1
            do {
                return try autoreleasepool {
                    let loaded = try loadPreparedCaptureSample(view, context: context)
                    try state.register(loaded.sample, view: view)
                    return loaded.sample
                }
            } catch {
                state.record(error)
                index = views.count
                return nil
            }
        }
    }
}

private func resolvedCapturePath(_ path: String, directory: URL, label: String) throws -> String {
    guard !path.isEmpty, path.utf8.count <= 4096 else { throw CaptureFailure("\(label) requires a nonempty local path") }
    let url = (path.hasPrefix("/") ? URL(fileURLWithPath: path) : directory.appendingPathComponent(path)).standardizedFileURL.resolvingSymlinksInPath()
    let values: URLResourceValues
    do { values = try url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]) }
    catch { throw CaptureFailure("\(label) cannot be read at \(url.path): \(error.localizedDescription)") }
    guard values.isRegularFile == true, let count = values.fileSize, count > 0, count <= 256 * 1024 * 1024 else {
        throw CaptureFailure("\(label) must be a readable regular file of at most 256 MiB")
    }
    return url.path
}
private func captureDimensions(_ path: String, label: String, canonical: Bool) throws -> (Int, Int) {
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.intValue,
          let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.intValue,
          width >= 2, height >= 2, width <= 16384, height <= 16384, width * height <= 128_000_000 else {
        throw CaptureFailure("\(label) cannot be decoded within the 16384 px / 128 MP pixel budget")
    }
    let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 1
    if canonical && orientation != 1 { throw CaptureFailure("\(label) has EXIF rotation. Run photo preparation first so masks/depth share the canonical pixel grid") }
    return (width, height)
}
private func numericCaptureBuffer(_ path: String, width: Int, height: Int, isDepth: Bool, label: String, context: CIContext) throws -> (buffer: CVPixelBuffer, minimum: Float, maximum: Float) {
    if isDepth {
        guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              (properties[kCGImagePropertyIsFloat] as? NSNumber)?.boolValue == true else {
            throw CaptureFailure("\(label) requires floating-point depth data (for example EXR), not an integer image")
        }
    }
    guard let image = CIImage(contentsOf: URL(fileURLWithPath: path), options: [.colorSpace: NSNull(), .applyOrientationProperty: false]),
          Int(image.extent.width) == width, Int(image.extent.height) == height else { throw CaptureFailure("\(label) must match the decoded image pixel grid") }
    var optional: CVPixelBuffer?
    let status = CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_OneComponent32Float,
                                    [kCVPixelBufferIOSurfacePropertiesKey: [:]] as CFDictionary, &optional)
    guard status == kCVReturnSuccess, let buffer = optional else { throw CaptureFailure("\(label) cannot allocate its float pixel buffer") }
    // One-component CV output otherwise applies luminance weights to an R-only
    // EXR (2.5 metres becomes ~0.75). Replicate numerical R, without grading.
    let red = CIVector(x: 1, y: 0, z: 0, w: 0)
    let numericalImage = image.applyingFilter("CIColorMatrix", parameters: ["inputRVector": red, "inputGVector": red, "inputBVector": red])
    context.render(numericalImage, to: buffer, bounds: CGRect(x: 0, y: 0, width: width, height: height), colorSpace: nil)
    CVPixelBufferLockBaseAddress(buffer, .readOnly); defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(buffer) else { throw CaptureFailure("\(label) has no readable pixels") }
    let stride = CVPixelBufferGetBytesPerRow(buffer) / MemoryLayout<Float>.stride
    let values = base.assumingMemoryBound(to: Float.self)
    var minimum = Float.infinity, maximum = -Float.infinity, present = 0
    for row in 0..<height { for column in 0..<width {
        let value = values[row * stride + column]
        guard value.isFinite, value >= 0, value <= (isDepth ? 10000 : 1.00001) else {
            throw CaptureFailure("\(label) contains invalid values; use finite \(isDepth ? "camera-Z meters (zero means unknown)" : "mask coverage from zero through one")")
        }
        minimum = min(minimum, value); maximum = max(maximum, value)
        if value > (isDepth ? 0 : 0.5) { present += 1 }
    } }
    guard present > 0 else { throw CaptureFailure("\(label) is empty; provide a corrected \(isDepth ? "depth map" : "subject mask")") }
    // RealityKit's public boundary accepts an 8-bit object matte and a semantic
    // DepthFloat32 map. A generic OneComponent32Float buffer is not interchangeable.
    var accepted: CVPixelBuffer?
    let format = isDepth ? kCVPixelFormatType_DepthFloat32 : kCVPixelFormatType_OneComponent8
    guard CVPixelBufferCreate(kCFAllocatorDefault, width, height, format,
                              [kCVPixelBufferIOSurfacePropertiesKey: [:]] as CFDictionary, &accepted) == kCVReturnSuccess,
          let accepted else { throw CaptureFailure("\(label) cannot allocate the required native pixel format") }
    CVPixelBufferLockBaseAddress(accepted, []); defer { CVPixelBufferUnlockBaseAddress(accepted, []) }
    guard let destination = CVPixelBufferGetBaseAddress(accepted) else { throw CaptureFailure("\(label) has no destination pixel storage") }
    let destinationStride = CVPixelBufferGetBytesPerRow(accepted)
    for row in 0..<height {
        if isDepth {
            destination.advanced(by: row * destinationStride).copyMemory(from: base.advanced(by: row * CVPixelBufferGetBytesPerRow(buffer)), byteCount: width * MemoryLayout<Float>.stride)
        } else {
            let bytes = destination.advanced(by: row * destinationStride).assumingMemoryBound(to: UInt8.self)
            for column in 0..<width { bytes[column] = UInt8(max(0, min(255, (values[row * stride + column] * 255).rounded()))) }
        }
    }
    return (accepted, minimum, maximum)
}
private func capturePixelFormat(_ buffer: CVPixelBuffer) -> String {
    let type = CVPixelBufferGetPixelFormatType(buffer)
    return String(bytes: [24, 16, 8, 0].map { UInt8((type >> $0) & 255) }, encoding: .ascii) ?? "unknown"
}
