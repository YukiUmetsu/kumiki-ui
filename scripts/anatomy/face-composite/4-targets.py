"""
The film stars' average face, in the landmark model's measurement space: one photograph a person (the most frontal:
|yaw| <= MAXYAW, one face in the frame, the face at least MINW px wide), frontalised and normalised on the eye centres.
Only photographs with the lips closed and no smile are averaged (a smile narrows the eyes and lifts the cheeks too);
if fewer than MINCALM are calm, the lower face alone comes from the calm ones.
Usage: python 4-targets.py targets.json geo.json [--exclude excluded.json]
(excluded.json: file names to leave out after looking at them: closed or squinting eyes, a child's photograph, older ages)
"""
import json, sys
import numpy as np
out, geo = sys.argv[1], sys.argv[2]
excl = set(json.load(open(sys.argv[sys.argv.index("--exclude") + 1]))) if "--exclude" in sys.argv else set()
MAXYAW, MINW, MINCALM = 22, 140, 12
G = json.load(open(geo))
def calm_of(Q):
    gap = float(np.linalg.norm(Q[13, :2] - Q[14, :2]))
    corners = 0.5 * (Q[61, 1] + Q[291, 1]) - 0.5 * (Q[13, 1] + Q[14, 1])
    width = float(np.linalg.norm(Q[61, :2] - Q[291, :2]))
    return gap < 0.035 and corners < 0.02 and width < 0.95, gap, corners, width
res = {}
for sex in ("female", "male"):
    best = {}
    for fn, r in G.items():
        if not fn.startswith(sex + "__") or fn in excl or abs(r["yaw"]) > MAXYAW or r.get("others", 0) > 0 or r.get("faceW", 999) < MINW: continue
        name = fn.split("__")[1]
        Q = np.array(r["Q"]); calm = calm_of(Q)[0]
        key = (0 if calm else 1, abs(r["yaw"]) + 0.3 * abs(r["pitch"] - 10))  # prefer a calm photograph, then the most frontal
        if name not in best or key < best[name][0]: best[name] = (key, fn)
    names = sorted(best); files = [best[n][1] for n in names]
    Qs = np.array([G[f]["Q"] for f in files]); calm = np.array([calm_of(Q)[0] for Q in Qs])
    if calm.sum() >= MINCALM: mean = Qs[calm].mean(0); used = [f for f, c in zip(files, calm) if c]; how = "calm only"
    else:
        mean_all, mean_calm = Qs.mean(0), Qs[calm].mean(0)
        lower = mean_all[:, 1] < mean_all[1, 1]
        mean = np.where(lower[:, None], mean_calm, mean_all); used = files; how = "lower face from calm"
    res[sex] = {"mean": mean.tolist(), "sd": Qs[calm].std(0).tolist() if calm.sum() >= 3 else Qs.std(0).tolist(), "n": len(used), "files": used, "how": how,
                "people": [f.split("__")[1].replace("_", " ") for f in used], "smiling_or_open": [f for f, c in zip(files, calm) if not c]}
    print(sex, "people", len(files), "calm", int(calm.sum()), "->", how)
json.dump(res, open(out, "w"))
