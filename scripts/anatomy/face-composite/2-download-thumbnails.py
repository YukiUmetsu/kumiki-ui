"""
Download the remaining portraits as standard-size Commons thumbnails (960 or 500 px wide, the sizes Wikimedia asks
clients to use), ten seconds apart, waiting five minutes after a 429.
"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
H = {"User-Agent": "kumiki-research/1.0 (research script)"}
c = json.load(open(sys.argv[1])); c2 = json.load(open(sys.argv[2])); out = sys.argv[3]

def thumb_url(p):
    title = p["title"].replace("File:", "", 1).replace(" ", "_")
    m = re.search(r"/wikipedia/commons/(?:thumb/)?([0-9a-f])/([0-9a-f]{2})/", p["thumb"])
    if not m: return None
    width = 960 if p.get("w", 0) > 960 else 500 if p.get("w", 0) > 500 else None
    if not width: return None
    q = urllib.parse.quote(title)
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{m.group(1)}/{m.group(2)}/{q}/{width}px-{q}"

todo = []
for sex in ("female", "male"):
    for name, picks in {**c.get(sex, {}), **{k: v for k, v in c2.get(sex, {}).items() if v}}.items():
        for k, p in enumerate(picks[:2]):
            fn = f"{out}/{sex}__{re.sub('[^A-Za-z]+', '_', name)}__{k}.jpg"
            if not os.path.exists(fn):
                u = thumb_url(p)
                if u: todo.append((fn, u))
print("todo", len(todo), flush=True)
for fn, url in todo:
    for attempt in range(2):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60).read()
            open(fn, "wb").write(data); print("ok", os.path.basename(fn), flush=True); break
        except urllib.error.HTTPError as e:
            print("HTTP", e.code, os.path.basename(fn), flush=True)
            if e.code == 429: time.sleep(300)
            else: break
        except Exception as e:
            print("ERR", os.path.basename(fn), e, flush=True); time.sleep(15)
    time.sleep(10)
print("done", flush=True)
