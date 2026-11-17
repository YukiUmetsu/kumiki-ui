"""
Search Wikimedia Commons for public-domain or CC0 portrait photographs of the named people (the API only, no image
downloads), and list standard-size (960 px) thumbnail URLs to fetch later. Slow: one query every eight seconds.
"""
import json, sys, time, urllib.parse, urllib.request, urllib.error
H = {"User-Agent": "kumiki-research/1.0 (anatomy reference study; low-volume)"}
names = json.load(open(sys.argv[1])); out = sys.argv[2]
try: res = json.load(open(out))
except Exception: res = {}
def ok(lic): return lic in ("CC0", "Public domain", "PD") or lic.startswith("CC0") or "ublic domain" in lic
for sex, people in names.items():
    for name in people:
        key = f"{sex}|{name}"
        if key in res: continue
        q = f'"{name}"'
        url = ("https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=30&format=json"
               "&prop=imageinfo&iiprop=extmetadata|size|url&iiurlwidth=960&gsrsearch=" + urllib.parse.quote(q))
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=40))
        except urllib.error.HTTPError as e:
            print("HTTP", e.code, name, flush=True); time.sleep(60); continue
        except Exception as e:
            print("ERR", name, e, flush=True); time.sleep(20); continue
        picks = []
        for p in sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0)):
            t = p["title"]; ii = p["imageinfo"][0]; em = ii["extmetadata"]
            lic = em.get("LicenseShortName", {}).get("value", "")
            if not ok(lic) or not t.lower().endswith((".jpg", ".jpeg", ".png", ".tif", ".tiff")): continue
            surname = name.split()[-1].lower()
            low = t.lower()
            if surname not in low: continue
            if any(w in low for w in (" and ", " with ", "&", "poster", "lobby card", "signature", "grave", "statue", "star on", "house", "home")): continue
            if ii.get("width", 0) < 500 or ii.get("height", 0) < 500: continue
            picks.append({"title": t, "thumb": ii.get("thumburl"), "page": ii.get("descriptionurl"), "licence": lic, "w": ii.get("width"), "h": ii.get("height")})
        res[key] = picks[:8]
        json.dump(res, open(out, "w"), indent=1)
        print(sex, name, len(picks), flush=True)
        time.sleep(8)
print("done", flush=True)
