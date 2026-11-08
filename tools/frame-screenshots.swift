#!/usr/bin/env swift
// Add a simple device bezel around unmodified app captures. macOS only.
// swift tools/frame-screenshots.swift <raw-capture-directory> <output-directory>
import AppKit

let arguments = CommandLine.arguments
if arguments.count != 3 {
    fputs("Usage: swift tools/frame-screenshots.swift <input-dir> <output-dir>\n", stderr)
    exit(1)
}
let input = URL(fileURLWithPath: arguments[1], isDirectory: true)
let output = URL(fileURLWithPath: arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
for name in ["explore", "recipes", "recipe-detail", "planner", "grocery", "khmer"] {
    let source = input.appendingPathComponent("\(name).jpg")
    guard let image = NSImage(contentsOf: source),
          let original = NSBitmapImageRep(data: try Data(contentsOf: source)) else {
        fatalError("Missing capture: \(source.path)")
    }
    let width = original.pixelsWide
    let height = original.pixelsHigh
    let bezel = max(10, Int(Double(width) * 0.031))
    let canvasWidth = width + bezel * 2
    let canvasHeight = height + bezel * 2
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: canvasWidth, pixelsHigh: canvasHeight,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
    ), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        fatalError("Could not create image canvas")
    }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    let outer = NSRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight)
    NSColor(calibratedWhite: 0.14, alpha: 1).setFill()
    NSBezierPath(roundedRect: outer, xRadius: CGFloat(bezel * 3), yRadius: CGFloat(bezel * 3)).fill()
    let screen = NSRect(x: bezel, y: bezel, width: width, height: height)
    NSBezierPath(roundedRect: screen, xRadius: CGFloat(bezel * 2), yRadius: CGFloat(bezel * 2)).addClip()
    image.draw(in: screen, from: .zero, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()
    guard let png = bitmap.representation(using: .png, properties: [:]) else {
        fatalError("Could not encode \(name)")
    }
    let outputName = name == "recipes" ? "recipes-kroueng-psom" : name
    try png.write(to: output.appendingPathComponent("\(outputName).png"))
    print("Framed \(name): \(canvasWidth)×\(canvasHeight)")
}
