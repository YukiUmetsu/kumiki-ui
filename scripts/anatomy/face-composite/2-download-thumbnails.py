"""
Download up to K portrait thumbnails a person from candidates.json (standard 960 px thumbnails, public domain or CC0
only, as listed by the Commons API), politely: one request every few seconds, backing off on 429.
Writes OUT/{sex}__{Name}__{k}.jpg and OUT/sources.json (file -> title, page, licence).
"""
import json, os, re, sys, time, urllib.request, urllib.error
cands, out, K = sys.argv[1], sys.argv[2], int(sys.argv[3])
H = {"User-Agent": "kumiki-research/1.0 (anatomy reference study; low-volume)"}
os.makedirs(out, exist_ok=True)
src_path = os.path.join(out, "sources.json")
try: sources = json.load(open(src_path))
except Exception: sources = {}
def score(c):
    t = c["title"].lower(); s = 0
    if c["h"] >= 0.95 * c["w"]: s += 3
    for w in ("portrait", "publicity", "studio", "headshot", "cropped", "photo"): s += 1.5 * (w in t)
    for w in ("trailer", "screenshot", "scene", " in ", "film", "movie", "still", "set of", "stage", "group"): s -= 1.5 * (w in t)
    return s
C = json.load(open(cands))
for key, lst in C.items():
    sex, name = key.split("|")
    picks = sorted(lst, key=score, reverse=True)[:K]
    for k, c in enumerate(picks):
        fn = f"{sex}__{re.sub(r'[^A-Za-z0-9]+', '_', name)}__r{k}.jpg"
        path = os.path.join(out, fn)
        if os.path.exists(path): continue
        url = c["thumb"].split("?")[0]
        for attempt in range(3):
            try:
                data = urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60).read()
                if data[:3] != b"\xff\xd8\xff" and data[:8] != b"\x89PNG\r\n\x1a\n": raise ValueError("not an image")
                open(path, "wb").write(data)
                sources[fn] = {"title": c["title"], "page": c["page"], "licence": c["licence"], "w": c["w"], "h": c["h"]}
                json.dump(sources, open(src_path, "w"), indent=1)
                print("ok", fn, len(data), flush=True); break
            except urllib.error.HTTPError as e:
                print("HTTP", e.code, fn, flush=True); time.sleep(60 if e.code == 429 else 5)
            except Exception as e:
                print("ERR", fn, e, flush=True); time.sleep(5)
        time.sleep(3)
print("done", flush=True)
