"""Find public-domain portrait photographs of actors on Wikimedia Commons (licence read from the API), a few per name."""
import json, sys, time, urllib.parse, urllib.request
H = {"User-Agent": "kumiki-research/1.0 (research script)"}
names = json.load(open(sys.argv[1])); out = {}
for sex, people in names.items():
    for name in people:
        q = f"{name} portrait publicity"
        url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=12&format=json&prop=imageinfo&iiprop=extmetadata|size|url&iiurlwidth=1200&gsrsearch=" + urllib.parse.quote(q)
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=40))
        except Exception as e:
            print("ERR", name, e); time.sleep(10); continue
        picks = []
        for p in sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0)):
            t = p["title"]; ii = p["imageinfo"][0]; em = ii["extmetadata"]
            lic = em.get("LicenseShortName", {}).get("value", "")
            if not (lic in ("CC0", "Public domain", "PD") or lic.startswith("CC0") or "ublic domain" in lic): continue
            if not t.lower().endswith((".jpg", ".jpeg", ".png")): continue
            if name.split()[-1].lower() not in t.lower(): continue
            if ii.get("width", 0) < 400: continue
            picks.append({"title": t, "thumb": ii.get("thumburl") or ii["url"], "page": ii.get("descriptionurl"), "licence": lic, "w": ii.get("width"), "h": ii.get("height")})
            if len(picks) >= 3: break
        out.setdefault(sex, {})[name] = picks
        print(sex, name, len(picks)); sys.stdout.flush()
        time.sleep(2.5)
json.dump(out, open(sys.argv[2], "w"), indent=1)
