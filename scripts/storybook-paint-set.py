#!/usr/bin/env python3
"""Paints the sources of a set recipe that carry a paint order: inserts, close-ups and props for the storybook films.

  python scripts/storybook-paint-set.py <recipe.json> [--only a,b] [--seed N] [--again] [--src dir] [--models dir] [--dry]

A source of the recipe (src/video/storybook/recipes/*.json) can have
  "paint": { "prompt": text, "refs": [file names in --src], "size": [w, h], "seed": int }
The script paints each such source whose `file` is not in --src (each one with --again) with FLUX.2 Klein 4B (Apache-2.0),
at `size`, in the order of the recipe. Each ref is read with its long side at 768 px at most. A ref can be the file of an order before it: a later state of the same picture. When the source names `sharp`, it writes that file at 2x with Real-ESRGAN (storybook-paint.py Upscaler).
Beside each painting it writes <file>.json: the prompt, the refs, the seed, the size, the model folder and the SHA-256 of
the painting. --seed replaces the seed of each order, for another try. --only names the sources to paint.

It refuses, with one line and exit 1, a ref that is not in --src, a size that is not a multiple of 16, two orders for one
file that are not the same, and <src>/.paint.lock while another run holds it (one FLUX process at a time).
--dry lists the orders and loads no model. Look at each painting at 1x and 2x before storybook-art.py cuts it.
"""
import argparse, hashlib, importlib.util, json, os, shutil, sys, tempfile, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = 768  # the long side of a ref as the model reads it: three refs at 1472 px filled 18 GB and the swap


def refuse(why):
    print(f"paint-set: {why}"); sys.exit(1)


def orders(recipe, src, only):
    out = {}
    for name, s in recipe.get("sources", {}).items():
        p = s.get("paint")
        if not p or (only and name not in only): continue
        w, h = p["size"]
        if w % 16 or h % 16: refuse(f'{name}: the size {w}x{h} is not a multiple of 16.')
        for r in p.get("refs", []):
            if not (src / r).is_file() and r not in out: refuse(f'{name}: there is no ref "{r}" in {src}, and no order before it paints it.')
        o = {"name": name, "file": s["file"], "sharp": s.get("sharp"), **p}
        if s["file"] in out and {k: v for k, v in out[s["file"]].items() if k != "name"} != {k: v for k, v in o.items() if k != "name"}:
            refuse(f'{out[s["file"]]["name"]} and {name} give two paint orders for {s["file"]}.')
        out.setdefault(s["file"], o)
    for n in sorted(only - {n for n, s in recipe.get("sources", {}).items() if s.get("paint")}): refuse(f'there is no paint order "{n}".')
    return list(out.values())


def small(path, tmp):
    """The ref with its long side at REF px at most, as RGB on white."""
    from PIL import Image
    im = Image.open(path)
    if im.mode in ("RGBA", "LA"): bg = Image.new("RGB", im.size, "white"); bg.paste(im, mask=im.getchannel("A")); im = bg
    im = im.convert("RGB"); k = REF / max(im.size)
    if k < 1: im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = tmp / f"{len(list(tmp.iterdir()))}-{path.name}"; im.save(out); return out


def alive(pid):
    try: os.kill(pid, 0)
    except ProcessLookupError: return False
    except PermissionError: return True
    return True


def lock(path):
    """Takes the lock, or refuses when a live run holds it. A lock that a run left behind when it stopped is taken."""
    for _ in range(2):
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, str(os.getpid()).encode()); os.close(fd); return
        except FileExistsError:
            try: pid = int(path.read_text().strip() or 0)
            except (OSError, ValueError): pid = 0
            if pid and alive(pid): refuse(f"{path} is held by run {pid}: one FLUX process at a time.")
            path.unlink(missing_ok=True)
    refuse(f"cannot take {path}.")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("recipe"); ap.add_argument("--only", default=""); ap.add_argument("--seed", type=int); ap.add_argument("--again", action="store_true")
    ap.add_argument("--src", default=str(ROOT / "local-assets/storybook/paintings/sets"))
    ap.add_argument("--models", default=os.environ.get("STORY_MODELS", str(ROOT / "local-assets/storybook/models"))); ap.add_argument("--dry", action="store_true")
    o = ap.parse_args(); src, models = Path(o.src), Path(o.models)
    todo = orders(json.loads(Path(o.recipe).read_text()), src, {n for n in o.only.split(",") if n})
    for q in todo:
        if o.seed is not None: q["seed"] = o.seed
        q["paint"] = o.again or not (src / q["file"]).is_file()
    if o.dry:
        for q in todo:
            print(f'{"paint" if q["paint"] else "keep "}  {q["file"]}  {q["size"][0]}x{q["size"][1]}  seed {q["seed"]}  refs {", ".join(q.get("refs", [])) or "none"}' + (f'  sharp {q["sharp"]}' if q["sharp"] else ""))
        return
    todo = [q for q in todo if q["paint"]]
    if not todo: return
    held = src / ".paint.lock"; lock(held); tmp = Path(tempfile.mkdtemp(prefix="paint-set-"))
    try:
        spec = importlib.util.spec_from_file_location("storybook_paint", Path(__file__).with_name("storybook-paint.py")); sp = importlib.util.module_from_spec(spec); spec.loader.exec_module(sp)
        paint, up, folder = sp.Painter(models / "klein6"), None, models / "klein6"
        for q in todo:
            t = time.time(); rgb = paint(q["prompt"], [small(src / r, tmp) for r in q.get("refs", [])], tuple(q["size"]), q["seed"]); sp.write(src / q["file"], rgb)
            if q["sharp"]: up = up or sp.Upscaler(models / "RealESRGAN_x4plus_anime_6B.pth"); sp.write(src / q["sharp"], up(rgb, 2))
            sha = hashlib.sha256((src / q["file"]).read_bytes()).hexdigest()
            (src / f'{q["file"]}.json').write_text(json.dumps({"prompt": q["prompt"], "refs": q.get("refs", []), "seed": q["seed"], "size": q["size"], "ref_size": REF,
                "model": str(folder.relative_to(ROOT) if folder.is_relative_to(ROOT) else folder), "sha256": sha}, ensure_ascii=False, indent=1) + "\n")
            print(json.dumps({"file": q["file"], "seed": q["seed"], "seconds": round(time.time() - t, 1), "sha256": sha[:12]}), flush=True)
    finally:
        held.unlink(missing_ok=True); shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
