"""Measure the photographs not yet in GEO.json (facegeo.py's frontalised landmarks). Usage: measure.py MODEL GEO.json DIR"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facegeo import detector, measure, frontal
model, geo, d = sys.argv[1:4]
try: G = json.load(open(geo))
except Exception: G = {}
det = detector(model); n = 0
for f in sorted(os.listdir(d)):
    if f in G or not f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")): continue
    m = measure(det, os.path.join(d, f))
    G[f] = None if not m else {"Q": frontal(m).tolist(), "yaw": m["yaw"], "pitch": m["pitch"], "roll": m["roll"], "w": m["w"], "h": m["h"], "faceW": m["faceW"], "others": m["others"]}
    n += 1
json.dump(G, open(geo, "w"))
print(n, "measured;", sum(1 for v in G.values() if v), "with a face of", len(G))
