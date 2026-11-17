"""Write the composite as ANAT1 data: offsets per sex and the provenance of every photograph used."""
import json, re, sys
comp = json.load(open(sys.argv[1])); cand = json.load(open(sys.argv[2])); cand2 = json.load(open(sys.argv[3])); lmk = json.load(open(sys.argv[4])); out = sys.argv[5]
picks = {}
for sex in ("female", "male"):
    for name, ps in {**cand.get(sex, {}), **{k: v for k, v in cand2.get(sex, {}).items() if v}}.items():
        picks[(sex, re.sub("[^A-Za-z]+", "_", name))] = ps
sources, data = [], {"method": comp["method"]}
for sex in ("female", "male"):
    s = comp["sexes"][sex]
    data[sex] = {"n": s["n"], "closedMouths": s["nClosed"], "offsets": s["offsets"]}
    for fn in s["files"]:
        _, key, k = fn[:-4].split("__")
        p = picks[(sex, key)][int(k)]
        sources.append({"title": p["title"], "page": p["page"], "licence": p["licence"], "sex": sex, "yaw": round(lmk[fn]["yaw"], 1)})
data["sources"] = sources
data["model"] = "MediaPipe Face Landmarker (float16, v1; Apache 2.0), used to measure only"
json.dump(data, open(out, "w"), separators=(",", ":"))
print("sources", len(sources), "bytes", len(json.dumps(data, separators=(",", ":"))))
