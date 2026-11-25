#!/usr/bin/env python3
"""Paints what a new person of the storybook films needs from the owner's full-body painting, and checks each painting
against it. A painting that fails its check is not kept: it is painted again with the next seed, three times at most.

  python scripts/storybook-paint.py <id> [--kinds prepare,faces] [--seed 1] [--again] [--src dir] [--models dir]
  python scripts/storybook-paint.py <id> --check faces/<id>_blink.png --kind face-blink

The person is src/video/storybook/people/<id>.json (`looks`, and `keep`: what the face paintings keep besides hair and
clothes, for example "thin glasses"). The painting is <src>/cast/<id>_full_body.png, RGBA or on white paper, in an A-pose.

  prepare      flat/<id>.png (on white), flat/<id>@2.png, heads/<id>_src.png, heads/<id>.png (4x), heads/<id>_768.png.
               Prints the head box [x, y, size] of the card: the top of the hair, the ears and the chin are in it.
  face-a       faces/<id>_a.png      the mouth open; the brows, the nose and the upper outline stay
  face-blink   faces/<id>_blink.png  the eyes closed; the nose, the outline and the mouth stay
  face-joy     faces/<id>_happy.png  a laugh; the nose and the upper outline stay
  face-rest    faces/<id>_rest.png   the mouth closed and the eyes open, for a painting that laughs
  faces        the faces of these four that the painting does not show itself (storybook-rig.py OWN)
  rear         views/<id>_rear.png and @2: the person from behind. views/<id>_back.png (the back of the owner's sheet) is
               a second reference when it is there

A face is the 768 px head painted again by FLUX.2 Klein 4B (Apache-2.0) with a template. It is kept when the head stays
where it was (hair, ears and clothes aligned: less than 1.5 % of the face height and 1.5 % of size) and the change that was
asked for is measured on the landmarks. Only the eyes, the cheeks and the mouth of a face painting go into a figure, and
storybook-art.py matches their colour at the edge, so the change of colour is printed and not judged. Points of MediaPipe
inside a face that changed its expression move 1 to 11 % on paintings that did not move: they are not a measure of place.
A rear view is kept when no face is found and its figure covers that of the painting.
Each kind prints one JSON line: { kind, file, seed, seconds, kept, why?, ... }. Files that exist are kept without --again.

Models in <models>: klein6/ (FLUX.2 Klein 4B), RealESRGAN_x4plus_anime_6B.pth (BSD-3-Clause), and the MediaPipe models
of storybook-rig.py. Set-up: docs/component-specs/storybook-character.md#tools
"""
import argparse, importlib.util, json, os, sys, time
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
_s = importlib.util.spec_from_file_location("storybook_rig", Path(__file__).with_name("storybook-rig.py")); rig = importlib.util.module_from_spec(_s); _s.loader.exec_module(rig)

KEEP = ("Keep everything else exactly identical: same face, same front view, same head size and position, same hair, same hat or hair "
        "accessory, {keep}same clothes, same colors, same thin ink lines, same watercolor and colored pencil texture, same plain white background.")
FACES = {
    "face-a": ("a", 'Change only the mouth: the mouth is open, saying "ah", the jaw a little lower, a rounded open mouth with the upper teeth edge '
               "and a pink tongue visible, friendly. The eyes stay open and the same. "),
    "face-blink": ("blink", "Change only the eyes and the mouth: both eyes are gently closed like in a blink, smooth upper eyelids, the closed "
                   "lash line curves downward, calm. The mouth is closed, lips together. "),
    "face-joy": ("happy", "Change only the facial expression to laughing happily: both eyes are closed in happy upward arcs, cheeks raised, big "
                 "open smile with upper teeth. "),
    "face-rest": ("rest", "Change only the facial expression to calm and friendly: the mouth is closed now, lips together in a gentle relaxed "
                  "smile, no teeth. Both eyes are open. "),
}
REAR = ("The same person as in the first picture, seen exactly from behind (rear view, no face visible){like}: {looks}. Full body from head "
        "to shoes, standing straight in the same A-pose as the first picture: arms straight and slightly away from the body, hands open, legs "
        "a little apart, same body height and same position in the frame. Plain white background, no shadow. Warm retro Japanese storybook "
        "illustration: hand-painted watercolor washes, fine dark brown ink outlines, colored pencil texture.")

MOVE, TRIES = 0.015, 3
# What each face must show, in shares of the face height (brow to chin): the opening of the lips and of the eyes. Measured on
# the 21 faces in use: lips 0.11 to 0.15 open for `a`, 0.07 to 0.15 for a laugh, under 0.008 when closed; closed eyes under 0.023.
ASKED = {"face-a": ("gap", ">", 0.04, "eyes", ">", 0.02), "face-blink": ("eyes", "<", 0.03, "gap", "<", 0.015),
         "face-joy": ("corners", ">", 0, "gap", ">", 0.04), "face-rest": ("gap", "<", 0.015, "eyes", ">", 0.02)}
WORDS = {"gap": "the lips are {:.1%} apart", "eyes": "the eyes are {:.1%} open", "corners": "the corners of the mouth are {:.1%} over the middle of the lips"}


def write(path, rgb):
    path.parent.mkdir(parents=True, exist_ok=True); cv2.imwrite(str(path), np.clip(rgb, 0, 255).round().astype(np.uint8)[:, :, ::-1])


class Upscaler:
    """Real-ESRGAN anime 6B in tiles of 208 px with 20 px of overlap, then a blend of 0.6 with Lanczos, which keeps the paper."""
    def __init__(self, path):
        import spandrel, torch
        self.torch = torch; self.dev = "mps" if torch.backends.mps.is_available() else "cpu"
        self.m = spandrel.ModelLoader(device="cpu").load_from_file(str(path)).model.eval().to(self.dev)

    def __call__(self, rgb, fac):
        from PIL import Image
        im = np.clip(rgb, 0, 255).astype(np.uint8); x = im.astype(np.float32) / 255; H, W = x.shape[:2]; T, P, S = 208, 20, 4
        out = np.zeros((H * S, W * S, 3), np.float32); pad = np.pad(x, ((P, P + T), (P, P + T), (0, 0)), "edge")
        with self.torch.no_grad():
            for y in range(0, H, T):
                for x0 in range(0, W, T):
                    t = self.torch.from_numpy(np.ascontiguousarray(pad[y:y + T + 2 * P, x0:x0 + T + 2 * P])).permute(2, 0, 1)[None].to(self.dev)
                    o = self.m(t)[0].permute(1, 2, 0).clamp(0, 1).float().cpu().numpy()[P * S:(P + T) * S, P * S:(P + T) * S]
                    h, w = min(T, H - y) * S, min(T, W - x0) * S; out[y * S:y * S + h, x0 * S:x0 * S + w] = o[:h, :w]
        size = (round(W * fac), round(H * fac)); r = Image.fromarray((out * 255).round().astype(np.uint8)).resize(size, Image.LANCZOS)
        return np.asarray(Image.blend(Image.fromarray(im).resize(size, Image.LANCZOS), r, 0.6)).astype(np.float32)


def lab(rgb, m): return cv2.cvtColor((np.clip(rgb, 0, 255) / 255).astype(np.float32), cv2.COLOR_RGB2Lab)[m].mean(0)


def grey(rgb): return cv2.GaussianBlur(cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 2)


def check_face(kind, models, src, out):
    """The measures of a face painting against the head that it was painted from."""
    a, b = models.face(src, 0.2), models.face(out, 0.2)
    if a is None: return {"kept": False, "why": "no face was found in the head painting"}
    if b is None: return {"kept": False, "why": "no face was found"}
    H = float(np.linalg.norm(a[10, :2] - a[152, :2])); oval = rig.filled(src.shape[:2], a[rig.OVAL, :2]); steady = ~rig.grow(oval, 20) & (src.min(2) < 245)
    try: _, W = cv2.findTransformECC(grey(src), grey(out), np.eye(2, 3, dtype=np.float32), cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), steady.astype(np.uint8), 5)
    except cv2.error: return {"kept": False, "why": "the hair, ears and clothes could not be aligned with the head painting"}
    r = {"moved": round(float(np.hypot(W[0, 2], W[1, 2])) / H, 4), "size": round(float(np.sqrt(abs(np.linalg.det(W[:, :2])))), 4), **rig.face_state(b), "colour": round(float(np.linalg.norm(lab(src, oval) - lab(out, oval))), 1)}
    k1, o1, v1, k2, o2, v2 = ASKED[kind]; ok = lambda k, op, v: r[k] > v if op == ">" else r[k] < v
    why = (f"the head moved {r['moved']:.1%} of the face height" if r["moved"] > MOVE else f"the head is {r['size']:.1%} of its size" if abs(r["size"] - 1) > MOVE else
           next((WORDS[k].format(r[k]) + f" of the face height, not {'over' if op == '>' else 'under'} {v:.1%}" for k, op, v in ((k1, o1, v1), (k2, o2, v2)) if not ok(k, op, v)), None))
    return {"kept": why is None, **({"why": why} if why else {}), **r}


def check_rear(models, front, mask, out):
    """A rear view shows no face, and its figure covers that of the front: the same height, the same place."""
    rgb, m = out
    if m.shape != mask.shape: return {"kept": False, "why": f"the size is {m.shape[1]}x{m.shape[0]}, not that of the painting"}
    inter, union = (m & mask).sum(), (m | mask).sum(); iou = float(inter / max(union, 1))
    ra, rb = np.where(mask.any(1))[0], np.where(m.any(1))[0]; tall = float((rb[-1] - rb[0]) / (ra[-1] - ra[0]))
    r = {"cover": round(iou, 3), "height": round(tall, 3)}
    try: face = rig.head_box(models, rgb, m) and True
    except SystemExit: face = False
    why = "a face is seen" if face else f"the figure covers {iou:.0%} of the painting's, not 80 %" if iou < 0.8 else f"the figure is {tall:.0%} as tall as the painting" if abs(tall - 1) > 0.03 else None
    return {"kept": why is None, **({"why": why} if why else {}), **r}


class Painter:
    """FLUX.2 Klein 4B, loaded once, when the first painting is asked for."""
    def __init__(self, path): self.path, self.m = path, None

    def __call__(self, prompt, refs, size, seed):
        if self.m is None:
            from mflux.models.common.config.model_config import ModelConfig
            from mflux.models.flux2.variants import Flux2KleinEdit
            self.m = Flux2KleinEdit(model_config=ModelConfig.flux2_klein_4b(), model_path=str(self.path))
        im = self.m.generate_image(seed=seed, prompt=prompt, width=size[0], height=size[1], guidance=1.0, image_paths=[Path(p) for p in refs],
                                   num_inference_steps=4, scheduler="flow_match_euler_discrete")
        return np.asarray(im.image.convert("RGB")).astype(np.float32)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("id"); ap.add_argument("--kinds", default="prepare,faces"); ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--src", default=str(ROOT / "local-assets/storybook/paintings")); ap.add_argument("--models", default=os.environ.get("STORY_MODELS", str(ROOT / "local-assets/storybook/models")))
    ap.add_argument("--again", action="store_true"); ap.add_argument("--check"); ap.add_argument("--kind"); o = ap.parse_args()
    src, models_dir, n = Path(o.src), Path(o.models), o.id; pf = ROOT / "src/video/storybook/people" / f"{n}.json"
    if not pf.exists(): raise SystemExit(f"There is no person {n}: write {pf.relative_to(ROOT)} first.")
    person = json.loads(pf.read_text()); models = rig.Models(models_dir); painting = src / "cast" / f"{n}_full_body.png"
    flat, a = rig.paper(painting); mask = a > 0.5; head = src / "heads" / f"{n}_768.png"
    if not head.exists() and (src / "heads" / f"{n}.png").exists(): write(head, cv2.resize(rig.art.load(src / "heads" / f"{n}.png"), (768, 768), interpolation=cv2.INTER_AREA))
    if o.check:
        out = src / o.check; kind = o.kind or "face-blink"
        r = check_rear(models, flat, mask, (lambda q: (q[0], q[1] > 0.5))(rig.paper(out))) if kind == "rear" else check_face(kind, models, rig.art.load(head), rig.art.load(out))
        print(json.dumps({"kind": kind, "file": o.check, **r}, ensure_ascii=False)); sys.exit(0 if r["kept"] else 1)
    up, paint, failed = None, Painter(models_dir / "klein6"), False
    kinds = [k for kind in o.kinds.split(",") for k in ([f"face-{f}" for f in rig.FACE_FILES if f not in rig.OWN[rig.face_of(models, flat, mask)[2]]] if kind == "faces" else [kind])]
    for kind in kinds:
        t0 = time.time()
        if kind == "prepare":
            box = rig.head_box(models, flat, mask); x, y, s = box; write(src / "flat" / f"{n}.png", flat); write(src / "heads" / f"{n}_src.png", rig.square(flat, x, y, s))
            up = up or Upscaler(models_dir / "RealESRGAN_x4plus_anime_6B.pth")
            for path, rgb, fac in ((src / "heads" / f"{n}.png", rig.square(flat, x, y, s), 4), (src / "flat" / f"{n}@2.png", flat, 2)):
                if o.again or not path.exists() or cv2.imread(str(path)).shape[0] != round(rgb.shape[0] * fac): write(path, up(rgb, fac))
            write(head, cv2.resize(rig.art.load(src / "heads" / f"{n}.png"), (768, 768), interpolation=cv2.INTER_AREA))
            print(json.dumps({"kind": kind, "file": f"heads/{n}.png", "box": box, "seconds": round(time.time() - t0, 1), "kept": True}), flush=True); continue
        if kind == "rear":
            file = f"views/{n}_rear.png"; back = src / "views" / f"{n}_back.png"; refs = [src / "flat" / f"{n}.png"] + ([back] if back.exists() else [])
            prompt = REAR.format(like=", like the second picture" if back.exists() else "", looks=person.get("looks") or sys.exit(f"The person {n} has no looks."))
            size = (flat.shape[1] // 16 * 16, flat.shape[0] // 16 * 16); judge = lambda rgb: check_rear(models, flat, mask, (rgb, rgb.min(2) < 235))
        elif kind in FACES:
            suffix, ask = FACES[kind]; file = f"faces/{n}_{suffix}.png"; refs, size = [head], (768, 768)
            keep = f"same {person['keep']}, " if person.get("keep") else ""; prompt = ask + KEEP.format(keep=keep); base = rig.art.load(head)
            judge = lambda rgb, kind=kind, base=base: check_face(kind, models, base, rgb)
        else: raise SystemExit(f"There is no kind {kind}: prepare, faces, {', '.join(FACES)} or rear.")
        if (src / file).exists() and not o.again: print(json.dumps({"kind": kind, "file": file, "kept": True, "why": "it was there"}), flush=True); continue
        for seed in range(o.seed, o.seed + TRIES):
            t = time.time(); rgb = paint(prompt, refs, size, seed); r = judge(rgb)
            print(json.dumps({"kind": kind, "file": file, "seed": seed, "seconds": round(time.time() - t, 1), **r}, ensure_ascii=False), flush=True)
            if r["kept"]:
                if kind == "rear": write(src / file, rgb); up = up or Upscaler(models_dir / "RealESRGAN_x4plus_anime_6B.pth"); write(src / file.replace(".png", "@2.png"), up(rgb, 2))
                else: write(src / file, rgb)
                break
        else: failed = True
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
