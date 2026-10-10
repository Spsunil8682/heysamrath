// macOS helper for scripts/import-media.mjs (uses built-in AVFoundation/CoreImage, no installs needed).
//   frame probe  <video>                          → prints {"width","height","duration"} (display orientation)
//   frame poster <video> <out.jpg> <maxEdge> <s>  → JPEG frame at <s> seconds, no metadata
//   frame image  <in>    <out.jpg> <maxEdge> <q>  → re-encoded JPEG, orientation applied, EXIF/GPS dropped
//   frame poster <video> <out.jpg> <maxEdge> <s> <rotateCW>
//   frame export <video> <out.mp4> <maxEdge> <rotateCW> <start|-> <duration|-> <audio 0|1>
//                → H.264 MP4 rotated (for clips recorded/exported sideways), scaled, trimmed, metadata dropped
//   frame reencode <video> <out.mp4> <maxEdge> <rotateCW> <start|-> <duration|-> <audio 0|1>
//                → same result via frame-by-frame decode at 30 fps; for files the export presets refuse
//                  (e.g. 4K 120 fps H.264, which the hardware decoder and most browsers can't play)
import AVFoundation
import CoreImage
import Foundation

let args = CommandLine.arguments
let ctx = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!

func fail(_ msg: String) -> Never {
  FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
  exit(1)
}

func scaled(_ img: CIImage, _ maxEdge: Double) -> CIImage {
  let e = img.extent
  let s = min(1.0, maxEdge / max(e.width, e.height))
  if s >= 1.0 { return img }
  let f = CIFilter(name: "CILanczosScaleTransform")!
  f.setValue(img, forKey: kCIInputImageKey)
  f.setValue(s, forKey: kCIInputScaleKey)
  f.setValue(1.0, forKey: kCIInputAspectRatioKey)
  return f.outputImage!
}

func writeJpeg(_ img: CIImage, _ out: String, _ quality: Double) {
  let key = CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String)
  guard let data = ctx.jpegRepresentation(of: img, colorSpace: srgb, options: [key: quality]) else { fail("encode failed") }
  do { try data.write(to: URL(fileURLWithPath: out)) } catch { fail("write failed: \(error)") }
}

guard args.count >= 3 else { fail("usage: frame probe|poster|image ...") }
let mode = args[1]
let input = URL(fileURLWithPath: args[2])

switch mode {
case "probe":
  let asset = AVURLAsset(url: input)
  guard let track = asset.tracks(withMediaType: .video).first else { fail("no video track") }
  let size = track.naturalSize.applying(track.preferredTransform)
  let json = String(format: "{\"width\":%d,\"height\":%d,\"duration\":%.3f}",
                    Int(abs(size.width)), Int(abs(size.height)), CMTimeGetSeconds(asset.duration))
  print(json)
case "poster":
  guard args.count >= 6 else { fail("usage: frame poster <video> <out> <maxEdge> <seconds>") }
  let gen = AVAssetImageGenerator(asset: AVURLAsset(url: input))
  gen.appliesPreferredTrackTransform = true
  gen.requestedTimeToleranceBefore = .zero
  gen.requestedTimeToleranceAfter = .zero
  let t = CMTime(seconds: Double(args[5])!, preferredTimescale: 600)
  guard let cg = try? gen.copyCGImage(at: t, actualTime: nil) else { fail("could not read frame") }
  var img = CIImage(cgImage: cg)
  let rotateCW = args.count >= 7 ? Double(args[6])! : 0
  if rotateCW != 0 {
    // Core Image is y-up: a clockwise turn is a negative angle.
    img = img.transformed(by: CGAffineTransform(rotationAngle: CGFloat(-rotateCW * .pi / 180)))
    img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY))
  }
  writeJpeg(scaled(img, Double(args[4])!), args[3], 0.82)
case "image":
  guard args.count >= 6 else { fail("usage: frame image <in> <out> <maxEdge> <quality>") }
  guard let img = CIImage(contentsOf: input, options: [.applyOrientationProperty: true]) else { fail("unreadable image") }
  writeJpeg(scaled(img, Double(args[4])!), args[3], Double(args[5])!)
case "export":
  guard args.count >= 9 else { fail("usage: frame export <video> <out> <maxEdge> <rotateCW> <start|-> <duration|-> <audio>") }
  let asset = AVURLAsset(url: input)
  guard let vtrack = asset.tracks(withMediaType: .video).first else { fail("no video track") }
  let maxEdge = Double(args[4])!
  let rotateCW = Double(args[5])!
  let total = CMTimeGetSeconds(asset.duration)
  let start = args[6] == "-" ? 0 : Double(args[6])!
  let length = args[7] == "-" ? total - start : min(Double(args[7])!, total - start)
  let range = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600),
                          duration: CMTime(seconds: length, preferredTimescale: 600))

  let comp = AVMutableComposition()
  guard let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else { fail("composition") }
  do { try cv.insertTimeRange(range, of: vtrack, at: .zero) } catch { fail("insert video: \(error)") }
  if args[8] == "1", let atrack = asset.tracks(withMediaType: .audio).first,
     let ca = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    try? ca.insertTimeRange(range, of: atrack, at: .zero)
  }

  // Video compositions are y-down, so a positive angle turns clockwise on screen.
  var t = vtrack.preferredTransform.concatenating(CGAffineTransform(rotationAngle: CGFloat(rotateCW * .pi / 180)))
  let box = CGRect(origin: .zero, size: vtrack.naturalSize).applying(t)
  t = t.concatenating(CGAffineTransform(translationX: -box.minX, y: -box.minY))
  let s = min(1.0, maxEdge / Double(max(box.width, box.height)))
  t = t.concatenating(CGAffineTransform(scaleX: CGFloat(s), y: CGFloat(s)))
  let w = floor(Double(box.width) * s / 2) * 2
  let h = floor(Double(box.height) * s / 2) * 2

  let vc = AVMutableVideoComposition()
  vc.renderSize = CGSize(width: w, height: h)
  let fps = vtrack.nominalFrameRate > 0 ? Int32(vtrack.nominalFrameRate.rounded()) : 30
  vc.frameDuration = CMTime(value: 1, timescale: fps)
  let instruction = AVMutableVideoCompositionInstruction()
  instruction.timeRange = CMTimeRange(start: .zero, duration: range.duration)
  let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: cv)
  layer.setTransform(t, at: .zero)
  instruction.layerInstructions = [layer]
  vc.instructions = [instruction]

  let out = URL(fileURLWithPath: args[3])
  try? FileManager.default.removeItem(at: out)
  guard let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality) else { fail("export session") }
  ex.videoComposition = vc
  ex.outputURL = out
  ex.outputFileType = .mp4
  ex.shouldOptimizeForNetworkUse = true
  ex.metadata = []
  let done = DispatchSemaphore(value: 0)
  ex.exportAsynchronously { done.signal() }
  done.wait()
  if ex.status != .completed { fail("export failed: \(ex.error?.localizedDescription ?? "unknown")") }
case "reencode":
  guard args.count >= 9 else { fail("usage: frame reencode <video> <out> <maxEdge> <rotateCW> <start|-> <duration|-> <audio>") }
  let asset = AVURLAsset(url: input)
  guard let vtrack = asset.tracks(withMediaType: .video).first else { fail("no video track") }
  let maxEdge = Double(args[4])!
  let rotateCW = Double(args[5])!
  let total = CMTimeGetSeconds(asset.duration)
  let start = args[6] == "-" ? 0 : Double(args[6])!
  let length = args[7] == "-" ? total - start : min(Double(args[7])!, total - start)
  let startTime = CMTime(seconds: start, preferredTimescale: 600)

  // Frames come from AVAssetImageGenerator, which can decode streams the playback/reader pipeline rejects.
  let display = vtrack.naturalSize.applying(vtrack.preferredTransform)
  let sc = min(1.0, maxEdge / Double(max(abs(display.width), abs(display.height))))
  let w = Int(floor(Double(abs(display.width)) * sc / 2) * 2)
  let h = Int(floor(Double(abs(display.height)) * sc / 2) * 2)
  let gen = AVAssetImageGenerator(asset: asset)
  gen.appliesPreferredTrackTransform = true
  gen.requestedTimeToleranceBefore = .zero
  gen.requestedTimeToleranceAfter = CMTime(value: 1, timescale: 60)
  gen.maximumSize = CGSize(width: maxEdge, height: maxEdge)
  let fps: Int32 = 30
  let frameCount = max(1, Int(length * Double(fps)))
  let times = (0..<frameCount).map { NSValue(time: CMTimeAdd(startTime, CMTime(value: CMTimeValue($0), timescale: fps))) }

  let out = URL(fileURLWithPath: args[3])
  try? FileManager.default.removeItem(at: out)
  guard let writer = try? AVAssetWriter(outputURL: out, fileType: .mp4) else { fail("writer") }
  writer.shouldOptimizeForNetworkUse = true
  let vin = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: w,
    AVVideoHeightKey: h,
    AVVideoCompressionPropertiesKey: [
      AVVideoAverageBitRateKey: maxEdge > 1000 ? 5_000_000 : 2_500_000,
      AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      AVVideoExpectedSourceFrameRateKey: fps,
      AVVideoMaxKeyFrameIntervalKey: 60,
    ],
  ])
  vin.expectsMediaDataInRealTime = false
  // Extra rotation (for sideways exports) is stored as MP4 display metadata, which browsers honour.
  vin.transform = CGAffineTransform(rotationAngle: CGFloat(rotateCW * .pi / 180))
  let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vin, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: w,
    kCVPixelBufferHeightKey as String: h,
  ])
  writer.add(vin)

  var reader: AVAssetReader?
  var aout: AVAssetReaderTrackOutput?
  var ain: AVAssetWriterInput?
  if args[8] == "1", let atrack = asset.tracks(withMediaType: .audio).first, let r = try? AVAssetReader(asset: asset) {
    r.timeRange = CMTimeRange(start: startTime, duration: CMTime(seconds: length, preferredTimescale: 600))
    let o = AVAssetReaderTrackOutput(track: atrack, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
    r.add(o)
    let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [
      AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 44100, AVEncoderBitRateKey: 128_000,
    ])
    i.expectsMediaDataInRealTime = false
    writer.add(i)
    reader = r; aout = o; ain = i
  }

  writer.startWriting()
  writer.startSession(atSourceTime: startTime)
  if let reader, !reader.startReading() { fail("cannot read audio") }

  let group = DispatchGroup()
  if let ain, let aout {
    group.enter()
    ain.requestMediaDataWhenReady(on: DispatchQueue(label: "audio")) {
      while ain.isReadyForMoreMediaData {
        guard let buf = aout.copyNextSampleBuffer(), ain.append(buf) else { ain.markAsFinished(); group.leave(); return }
      }
    }
  }

  let colorSpace = CGColorSpaceCreateDeviceRGB()
  var remaining = times.count
  var failure: String?
  let framesDone = DispatchSemaphore(value: 0)
  gen.generateCGImagesAsynchronously(forTimes: times) { requested, image, _, result, error in
    defer { remaining -= 1; if remaining == 0 { framesDone.signal() } }
    guard failure == nil else { return }
    guard result == .succeeded, let image else { failure = error?.localizedDescription ?? "frame decode failed"; return }
    var pb: CVPixelBuffer?
    guard let pool = adaptor.pixelBufferPool, CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pb) == kCVReturnSuccess, let pb else {
      failure = "pixel buffer"; return
    }
    CVPixelBufferLockBaseAddress(pb, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb), width: w, height: h, bitsPerComponent: 8,
                        bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: colorSpace,
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
    ctx?.interpolationQuality = .high
    ctx?.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
    CVPixelBufferUnlockBaseAddress(pb, [])
    while !vin.isReadyForMoreMediaData { usleep(2000) }
    if !adaptor.append(pb, withPresentationTime: requested) { failure = writer.error?.localizedDescription ?? "append failed" }
  }
  framesDone.wait()
  vin.markAsFinished()
  group.wait()
  let finished = DispatchSemaphore(value: 0)
  writer.finishWriting { finished.signal() }
  finished.wait()
  if let failure { fail("reencode failed: \(failure)") }
  if writer.status != .completed { fail("reencode failed: \(writer.error?.localizedDescription ?? "unknown")") }
default:
  fail("unknown mode \(mode)")
}
