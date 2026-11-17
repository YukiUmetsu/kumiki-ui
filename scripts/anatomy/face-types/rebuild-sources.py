"""Rebuild img/sources.json from the candidates (the download order is the score order, so file index k is pick k)."""
import json, os, re, sys
img, cands = sys.argv[1], sys.argv[2:]
C = {}
for f in cands: C.update(json.load(open(f)))
def score(c):
    t = c["title"].lower(); s = 0
    if "crop" in t: s += 4
    if c["h"] >= 0.95 * c["w"]: s += 2
    if (c.get("year") or 0) >= 2010: s += 1
    for w in ("portrait", "headshot", "face", "photocall", "red carpet", "premiere", "interview"): s += 1 * (w in t)
    for w in ("concert", "performing", "performance", "stage", "live", "game", "match", "trailer", "screenshot", "scene", "dance", "singing"): s -= 2 * (w in t)
    return s
idx = {}
for key, lst in C.items():
    g, sx, name = key.split("|")
    stem = f"{g}__{sx}__{re.sub(r'[^A-Za-z0-9]+', '_', name).strip('_')}"
    for k, c in enumerate(sorted(lst, key=score, reverse=True)): idx[f"{stem}__{k}.jpg"] = c
src, missing = {}, []
for f in sorted(os.listdir(img)):
    if not f.endswith(".jpg"): continue
    c = idx.get(f)
    if c is None: missing.append(f); continue
    src[f] = {k: c.get(k) for k in ("title", "page", "licence", "licenceUrl", "author", "year")}
json.dump(src, open(os.path.join(img, "sources.json"), "w"), ensure_ascii=False)
print(len(src), "credited;", len(missing), "missing", missing[:5])
