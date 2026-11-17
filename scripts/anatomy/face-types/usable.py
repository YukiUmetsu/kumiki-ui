"""Which people already have a usable photograph (the targets' filters, not excluded): writes skip.json for the next pass."""
import json, re, sys, numpy as np
geo, excl, cands, out = sys.argv[1:5]
G = {k: v for k, v in json.load(open(geo)).items() if v}; X = set(json.load(open(excl)))
C = {}
for f in cands.split(","): C.update(json.load(open(f)))
def ok(f):
    r = G.get(f)
    if not r or f in X or abs(r["yaw"]) > 22 or r.get("others", 0) > 0 or r.get("faceW", 999) < 120: return False
    Q = np.array(r["Q"]); op = np.mean([(Q[u, 1] - Q[l, 1]) / np.linalg.norm(Q[o, :2] - Q[i, :2]) for o, i, u, l in ((33, 133, 159, 145), (263, 362, 386, 374))])
    return op >= 0.27
have = []
for key in C:
    g, sx, name = key.split("|"); stem = f"{g}__{sx}__{re.sub(r'[^A-Za-z0-9]+', '_', name).strip('_')}__"
    if any(ok(f) for f in G if f.startswith(stem)): have.append(key)
json.dump(have, open(out, "w"), ensure_ascii=False)
print(len(have), "of", len(C), "people have a usable photograph;", sum(1 for k in C if C[k]), "have candidates")
