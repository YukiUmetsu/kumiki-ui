"""Subject masks for `npm run video:matte` (VE1.5): reads raw RGB frames on stdin and writes one 8-bit mask per frame on stdout.

    python3 -I scripts/video-matte-model.py --model=<file.onnx> --kind=isnet|u2net --width=W --height=H

The model finds the salient subject of each frame (a person, an animal, a car). It runs on the CPU through onnxruntime, loaded once.
The two supported families are the authors' own Apache-2.0 models, as ONNX files: U^2-Net (Qin et al. 2020,
https://github.com/xuebinqin/U-2-Net) and IS-Net / DIS (Qin et al. 2022, https://github.com/xuebinqin/DIS). Pre- and post-processing
follow the authors' code: the frame is scaled to the model's square input, normalised, and the first output is stretched to 0..1
and scaled back to the frame. The masks are raw: the caller refines their edges and steadies them over time.
"""
import argparse
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image

# Per-family input size and normalisation, as in the authors' code.
FAMILIES = {
    "u2net": {"size": 320, "mean": (0.485, 0.456, 0.406), "std": (0.229, 0.224, 0.225)},
    "isnet": {"size": 1024, "mean": (0.5, 0.5, 0.5), "std": (1.0, 1.0, 1.0)},
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--kind", required=True, choices=sorted(FAMILIES))
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--threads", type=int, default=0)
    args = parser.parse_args()
    family, w, h = FAMILIES[args.kind], args.width, args.height
    options = ort.SessionOptions()
    if args.threads:
        options.intra_op_num_threads = args.threads
    session = ort.InferenceSession(args.model, options, providers=["CPUExecutionProvider"])
    name, size = session.get_inputs()[0].name, family["size"]
    mean, std = np.array(family["mean"], np.float32), np.array(family["std"], np.float32)
    frame_bytes, source, sink = w * h * 3, sys.stdin.buffer, sys.stdout.buffer
    while True:
        raw = source.read(frame_bytes)
        if not raw:
            break
        if len(raw) != frame_bytes:
            sys.stderr.write("matte-model: a short frame on stdin\n")
            sys.exit(2)
        image = Image.frombuffer("RGB", (w, h), raw, "raw", "RGB", 0, 1).resize((size, size), Image.BILINEAR)
        x = np.asarray(image, np.float32)
        x = x / max(float(x.max()), 1e-6)
        x = ((x - mean) / std).transpose(2, 0, 1)[None]
        pred = session.run(None, {name: x.astype(np.float32)})[0][0, 0]
        lo, hi = float(pred.min()), float(pred.max())
        pred = (pred - lo) / max(hi - lo, 1e-6)
        mask = Image.fromarray(np.clip(pred * 255 + 0.5, 0, 255).astype(np.uint8), "L").resize((w, h), Image.BILINEAR)
        sink.write(mask.tobytes())
        sink.flush()


if __name__ == "__main__":
    main()
