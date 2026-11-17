"""
Search Wikimedia Commons (the API only) for modern portrait photographs (1995 or later where the file gives a date) of
each named person, by group and sex, under licences that allow measuring them: public domain, CC0, CC BY, CC BY-SA.
Records author, licence and date for the credits. Writes candidates.json keyed "group|sex|name" -> up to 10 picks.
Usage: search.py groups.json candidates.json [group ...]
"""
import json, re, sys, time, html, urllib.parse, urllib.request, urllib.error
H = {"User-Agent": "kumiki-research/1.0 (https://github.com/YukiUmetsu/kumiki-ui; face reference study, low volume)"}
groups = json.load(open(sys.argv[1])); out = sys.argv[2]; only = set(sys.argv[3:])
try: res = json.load(open(out))
except Exception: res = {}
def ok(lic):
    l = lic.lower()
    return l.startswith("cc0") or "public domain" in l or l == "pd" or re.match(r"^cc by(-sa)? \d", l) is not None
BAD = (" and ", " with ", "&", "poster", "signature", "grave", "statue", "star on", "stamp", "mural", "wax", "caricature", "drawing", "painting", "sculpture", "bust ", "plaque", "autograph", "family", "wedding", "logo", "cover art", "album")
def year(em):
    for k in ("DateTimeOriginal", "DateTime"):
        m = re.search(r"(19|20)\d\d", html.unescape(re.sub("<[^>]+>", " ", em.get(k, {}).get("value", ""))))
        if m: return int(m.group(0))
    return None
def save():
    json.dump(res, open(out + ".tmp", "w"), ensure_ascii=False); __import__("os").replace(out + ".tmp", out)
for group, sexes in groups.items():
    if only and group not in only: continue
    for sex, people in sexes.items():
        for name in people:
            key = f"{group}|{sex}|{name}"
            if key in res: continue
            q = re.sub(r"\s*\(.*?\)", "", name).strip()
            words = q.lower().replace(".", "").split()
            url = ("https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=50&format=json"
                   "&prop=imageinfo&iiprop=extmetadata|size|url&iiurlwidth=960&gsrsearch=" + urllib.parse.quote(f'"{q}"'))
            try:
                d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=40))
            except urllib.error.HTTPError as e:
                print("HTTP", e.code, name, flush=True); time.sleep(60); continue
            except Exception as e:
                print("ERR", name, e, flush=True); time.sleep(15); continue
            picks = []
            for p in sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0)):
                t = p["title"]; ii = p["imageinfo"][0]; em = ii["extmetadata"]
                lic = em.get("LicenseShortName", {}).get("value", "")
                if not ok(lic) or not t.lower().endswith((".jpg", ".jpeg", ".png", ".webp")): continue
                low = t.lower()
                # the person's name in the title (all of a two-word name; the longest word otherwise)
                need = words if len(words) <= 2 else [max(words, key=len)]
                if not all(w in low for w in need) or any(w in low for w in BAD): continue
                y = year(em)
                if y is not None and y < 1995: continue
                if ii.get("width", 0) < 400 or ii.get("height", 0) < 400: continue
                artist = html.unescape(re.sub("<[^>]+>", "", em.get("Artist", {}).get("value", ""))).strip()[:120]
                picks.append({"title": t, "thumb": (ii.get("thumburl") or ii.get("url")), "page": ii.get("descriptionurl"), "licence": lic,
                              "licenceUrl": em.get("LicenseUrl", {}).get("value", ""), "author": artist, "year": y, "w": ii.get("width"), "h": ii.get("height")})
            res[key] = picks[:10]
            save()
            print(group, sex, name, len(picks), flush=True)
            time.sleep(1)
print("done", flush=True)
