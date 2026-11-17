"""
Download the K best candidate thumbnails a person (picks K0..K-1 by score), politely. Writes
OUT/{group}__{sex}__{Name}__{k}.jpg and OUT/sources.json (title, page, licence, licence URL, author, year).
Usage: fetch.py OUT K0 K skip.json cand.json [cand.json ...]  (loops until every search log says done)
"""
import json, os, re, sys, time, urllib.request, urllib.error
out, K0, K, skip = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), set(json.load(open(sys.argv[4])))
cands = sys.argv[5:]
H = {"User-Agent": "kumiki-research/1.0 (https://github.com/YukiUmetsu/kumiki-ui; face reference study, low volume)"}
src_path = os.path.join(out, "sources.json")
try: sources = json.load(open(src_path))
except Exception: sources = {}
def score(c):
    t = c["title"].lower(); s = 0
    if "crop" in t: s += 4
    if c["h"] >= 0.95 * c["w"]: s += 2
    if (c.get("year") or 0) >= 2010: s += 1
    for w in ("portrait", "headshot", "face", "photocall", "red carpet", "premiere", "interview"): s += 1 * (w in t)
    for w in ("concert", "performing", "performance", "stage", "live", "game", "match", "trailer", "screenshot", "scene", "dance", "singing"): s -= 2 * (w in t)
    return s
def load():
    C = {}
    for f in cands:
        try: C.update(json.load(open(f)))
        except Exception: pass
    return C
done = set()
while True:
    C = load()
    for key in [k for k in C if k not in done and k not in skip]:
        group, sex, name = key.split("|")
        for k, c in list(enumerate(sorted(C[key], key=score, reverse=True)))[K0:K]:
            fn = f"{group}__{sex}__{re.sub(r'[^A-Za-z0-9]+', '_', name).strip('_')}__{k}.jpg"
            path = os.path.join(out, fn)
            if os.path.exists(path): continue
            url = c["thumb"].split("?")[0]
            for attempt in range(4):
                try:
                    data = urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60).read()
                    if data[:3] != b"\xff\xd8\xff" and data[:8] != b"\x89PNG\r\n\x1a\n" and data[8:12] != b"WEBP": raise ValueError("not an image")
                    open(path, "wb").write(data)
                    sources[fn] = {k2: c.get(k2) for k2 in ("title", "page", "licence", "licenceUrl", "author", "year")}
                    json.dump(sources, open(src_path + ".tmp", "w"), ensure_ascii=False); os.replace(src_path + ".tmp", src_path)
                    print("ok", fn, flush=True); break
                except urllib.error.HTTPError as e:
                    print("HTTP", e.code, fn, flush=True); time.sleep(90 if e.code == 429 else 5)
                except Exception as e:
                    print("ERR", fn, e, flush=True); time.sleep(5)
            time.sleep(3)
        done.add(key)
    logs = [open(os.path.join(os.path.dirname(cands[0]), f"search-{x}.log")).read() for x in ("a", "b")]
    if all("done" in l for l in logs) and not [k for k in load() if k not in done and k not in skip]: break
    time.sleep(15)
print("done", flush=True)
