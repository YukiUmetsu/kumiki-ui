"""
Write the fitted composite's metadata into face-composite.json: the photographs used (title, page, licence, sex, yaw),
the counts and the method. The offsets were written by 5-fit.py.
Usage: python 6-export.py targets.json geo.json sources.json registry/anatomy/data/face-composite.json
(sources.json: file name -> {title, page, licence}, as 2-download-thumbnails.py writes it)
"""
import json, sys
targets, geo, sources, data_path = sys.argv[1:5]
T, G, src = json.load(open(targets)), json.load(open(geo)), json.load(open(sources))
data, out = json.load(open(data_path)), []
for sex in ("female", "male"):
    for f in T[sex]["files"]:
        s = src[f]
        out.append({"title": s["title"], "page": s["page"], "licence": s["licence"], "sex": sex, "yaw": round(G[f]["yaw"], 1)})
    data[sex]["n"] = data[sex]["closedMouths"] = T[sex]["n"]; data[sex]["fitted"] = True
assert all("ublic domain" in x["licence"] or x["licence"].startswith("CC0") for x in out), "public domain or CC0 only"
data["sources"] = out
json.dump(data, open(data_path, "w"), separators=(",", ":"))
print(len(out), "photographs:", {s: data[s]["n"] for s in ("female", "male")})
