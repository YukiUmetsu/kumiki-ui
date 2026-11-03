// Optional local foreground preparation. Uses system Vision; no model weights are redistributed.
import Foundation
import Vision
import CoreImage
import CoreVideo
import ImageIO
import UniformTypeIdentifiers

struct PhotoFailure: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

func preparePhoto() throws {
    let args = Array(CommandLine.arguments.dropFirst())
    let allowed: Set<String> = ["--image", "--mask", "--metadata", "--override", "--normalized"]
    var options: [String: String] = [:]
    guard args.count % 2 == 0 else { throw PhotoFailure("Each option needs a value") }
    for index in stride(from: 0, to: args.count, by: 2) {
        guard allowed.contains(args[index]), options[args[index]] == nil else { throw PhotoFailure("Unknown/repeated option \(args[index])") }
        options[args[index]] = args[index + 1]
    }
    guard let imagePath = options["--image"], let maskPath = options["--mask"], let metadataPath = options["--metadata"] else {
        throw PhotoFailure("Provide --image, --mask and --metadata")
    }
    let sourceURL = URL(fileURLWithPath: imagePath), maskURL = URL(fileURLWithPath: maskPath), metadataURL = URL(fileURLWithPath: metadataPath)
    for path in [maskPath, metadataPath] + (options["--normalized"].map { [$0] } ?? []) {
        guard !FileManager.default.fileExists(atPath: path) else { throw PhotoFailure("Output already exists: \(path); choose a new cache revision") }
    }
    guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let rawImage = CIImage(contentsOf: sourceURL, options: [.applyOrientationProperty: false]) else {
        throw PhotoFailure("Cannot decode photograph \(imagePath); check its path and image format")
    }
    let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 1
    guard (1...8).contains(orientation) else { throw PhotoFailure("Invalid EXIF orientation in \(imagePath)") }
    var image = rawImage.oriented(forExifOrientation: Int32(orientation))
    image = image.transformed(by: CGAffineTransform(translationX: -image.extent.minX, y: -image.extent.minY))
    let width = Int(image.extent.width), height = Int(image.extent.height)
    guard width >= 2, height >= 2, width <= 16384, height <= 16384, width * height <= 128_000_000 else {
        throw PhotoFailure("Photograph dimensions exceed the 16384 px / 128 MP preparation budget")
    }
    let context = CIContext()
    let mask: CIImage
    let method: String
    if let override = options["--override"] {
        guard let supplied = CIImage(contentsOf: URL(fileURLWithPath: override)),
              Int(supplied.extent.width) == width, Int(supplied.extent.height) == height else {
            throw PhotoFailure("Mask override must match the oriented photograph's \(width)×\(height) pixel grid: \(override)")
        }
        mask = supplied
        method = "manual-mask-override"
    } else {
        guard let cgImage = context.createCGImage(image, from: image.extent) else { throw PhotoFailure("Cannot decode the oriented image pixels") }
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        let request = VNGenerateForegroundInstanceMaskRequest()
        try handler.perform([request])
        guard let observation = request.results?.first else { throw PhotoFailure("No foreground observation; supply a manual subject mask") }
        let labels = observation.instanceMask
        guard CVPixelBufferGetPixelFormatType(labels) == kCVPixelFormatType_OneComponent8 else { throw PhotoFailure("Unsupported Vision instance-label format on this OS build") }
        CVPixelBufferLockBaseAddress(labels, .readOnly)
        let stride = CVPixelBufferGetBytesPerRow(labels), rows = CVPixelBufferGetHeight(labels), columns = CVPixelBufferGetWidth(labels)
        let bytes = CVPixelBufferGetBaseAddress(labels)!.assumingMemoryBound(to: UInt8.self)
        var counts: [Int: Int] = [:]
        for y in 0..<rows { for x in 0..<columns { let label = Int(bytes[y * stride + x]); if label > 0 { counts[label, default: 0] += 1 } } }
        CVPixelBufferUnlockBaseAddress(labels, .readOnly)
        guard let largest = counts.max(by: { $0.value < $1.value })?.key else { throw PhotoFailure("No foreground instance; supply a manual subject mask") }
        let scaled = try observation.generateScaledMaskForImage(forInstances: IndexSet(integer: largest), from: handler)
        mask = CIImage(cvPixelBuffer: scaled)
        method = "vision-largest-foreground-instance"
    }
    // Evaluate the actual full-size matte rather than trusting the provider label.
    var pixels = [UInt8](repeating: 0, count: width * height)
    context.render(mask, toBitmap: &pixels, rowBytes: width, bounds: CGRect(x: 0, y: 0, width: width, height: height), format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
    let foreground = pixels.reduce(0) { $0 + ($1 >= 128 ? 1 : 0) }
    guard foreground > 0 else { throw PhotoFailure("The subject mask is empty; supply a corrected mask") }
    var preparedImagePath = imagePath
    var normalizedPath: String?
    if orientation != 1 {
        guard let path = options["--normalized"], let cgImage = context.createCGImage(image, from: image.extent) else {
            throw PhotoFailure("Rotated EXIF input needs --normalized <new-photo.png> to preserve a canonical image/mask grid")
        }
        let url = URL(fileURLWithPath: path)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { throw PhotoFailure("Cannot create normalized image") }
        var metadata = properties
        metadata[kCGImagePropertyOrientation] = 1
        metadata[kCGImagePropertyPixelWidth] = width; metadata[kCGImagePropertyPixelHeight] = height
        if var exif = metadata[kCGImagePropertyExifDictionary] as? [CFString: Any] {
            exif[kCGImagePropertyExifPixelXDimension] = width; exif[kCGImagePropertyExifPixelYDimension] = height
            metadata[kCGImagePropertyExifDictionary] = exif
        }
        CGImageDestinationAddImage(destination, cgImage, metadata as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw PhotoFailure("Normalized PNG encoding failed") }
        preparedImagePath = path; normalizedPath = path
    }
    do {
        try FileManager.default.createDirectory(at: maskURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: metadataURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try context.writePNGRepresentation(of: mask, to: maskURL, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
        let report: [String: Any] = ["schemaVersion": 1, "image": preparedImagePath, "width": width, "height": height,
            "sourceOrientation": orientation, "normalization": orientation == 1 ? "original-encoded-bytes" : "EXIF-orientation-to-canonical-grid",
            "maskMethod": method, "foregroundFraction": Double(foreground) / Double(width * height),
            "backendRevision": ProcessInfo.processInfo.operatingSystemVersionString, "visualReview": "pending"]
        try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]).write(to: metadataURL, options: .atomic)
    } catch {
        try? FileManager.default.removeItem(at: maskURL)
        if let normalizedPath { try? FileManager.default.removeItem(atPath: normalizedPath) }
        throw error
    }
}

do { try preparePhoto() }
catch {
    FileHandle.standardError.write(Data("Photo preparation: \(error). Correct the source or provide an aligned subject mask.\n".utf8))
    exit(1)
}
