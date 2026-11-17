"""
Composite face shape from MediaPipe landmarks of public-domain actor portraits, as offsets on the canonical face mesh.

- one photograph per person, of that person alone: the most frontal with |yaw| <= 15 deg, pitch within MediaPipe's offset band, face >= 150 px;
- each face aligned to the mesh (similarity Procrustes) on the stable upper face;
- the lower face (jaw, chin) only from photographs with the mouth closed; the mouth region itself left out (expression);
- the nose wings damped to a quarter (smiles flare them; shadows blur their edge);
- averaged per sex, symmetrised, smoothed over about 6 mm, depth damped by half (single-photo depth is uncertain).
"""
import json, sys
import numpy as np
T = json.load(open(sys.argv[1])); L = json.load(open(sys.argv[2])); out = sys.argv[3]
lm = T["landmarks"]
def procrustes(X, Y, idx):
    mx, my = X[idx].mean(0), Y[idx].mean(0); Xc, Yc = X[idx] - mx, Y[idx] - my
    U, S, Vt = np.linalg.svd(Xc.T @ Yc); d = np.sign(np.linalg.det(Vt.T @ U.T)); D = np.diag([1, 1, d])
    R = Vt.T @ D @ U.T; s = np.trace(np.diag(S) @ D) / (Xc ** 2).sum()
    return (s * (R @ (X - mx).T)).T + my
res = {"method": __doc__.strip(), "sexes": {}}
for sex in ("female", "male"):
    Tg = np.array(T[sex]); n = len(Tg)
    sub = Tg[lm["subnasale"]]; stom = Tg[lm["stomion"]]
    upper = np.where(Tg[:, 1] > sub[1] + 2)[0]
    # choose one photograph per person
    # photographs of two or more people are left out (one face is detected per image, and it may be the other person's)
    multi = {"male__Paul_Newman__0.jpg", "male__Paul_Newman__1.jpg", "male__William_Holden__0.jpg", "male__Rock_Hudson__1.jpg", "female__Joan_Fontaine__1.jpg",
             "female__Vivien_Leigh__1.jpg", "female__Jean_Harlow__1.jpg", "male__Burt_Lancaster__1.jpg", "male__Toshiro_Mifune__1.jpg", "male__Ricardo_Montalban__1.jpg"}
    best = {}
    for fn, r in L.items():
        if "pts" not in r or not fn.startswith(sex + "__") or fn in multi: continue
        name = fn.split("__")[1]
        if abs(r["yaw"]) > 15 or not (-6 <= r["pitch"] <= 26) or r["faceW"] < 150: continue
        score = abs(r["yaw"]) + 0.5 * abs(r["pitch"] - 12)
        if name not in best or score < best[name][0]: best[name] = (score, fn)
    faces, closed, names, files = [], [], [], []
    for name, (score, fn) in sorted(best.items()):
        files.append(fn)
        r = L[fn]; P = np.array(r["pts"][:n])
        X = np.stack([P[:, 0] * r["w"], -P[:, 1] * r["h"], -P[:, 2] * r["w"]], 1)
        A = procrustes(X, Tg, upper)
        gap = np.linalg.norm(A[lm["labiale-superius"]] - A[lm["labiale-inferius"]]) - np.linalg.norm(Tg[lm["labiale-superius"]] - Tg[lm["labiale-inferius"]])
        faces.append(A); names.append(name); closed.append(gap < 4.0)
        print(sex, name, f"yaw {r['yaw']:+.0f} pitch {r['pitch']:+.0f} lip gap {gap:+.1f} mm", "closed" if gap < 4.0 else "open")
    F = np.array(faces); C_all = F.mean(0); C_closed = F[np.array(closed)].mean(0) if any(closed) else C_all
    # region weights: the lower face from closed mouths; the mouth itself left out
    w_low = np.clip((sub[1] - Tg[:, 1]) / 15, 0, 1)
    C = C_all * (1 - w_low[:, None]) + C_closed * w_low[:, None]
    D = C - Tg
    # symmetrise (each vertex with its mirror partner) and smooth over about 6 mm, then weight by region
    mir = np.array([np.argmin(((Tg - Tg[i] * np.array([-1, 1, 1])) ** 2).sum(1)) for i in range(n)])
    D = 0.5 * (D + D[mir] * np.array([-1, 1, 1]))
    d2 = ((Tg[:, None, :] - Tg[None, :, :]) ** 2).sum(-1); W = np.exp(-d2 / (2 * 6.0 ** 2)); W /= W.sum(1, keepdims=True)
    D = W @ D
    # the mouth left out (expression)
    mouthHalf = abs(Tg[lm["cheilion.L"]][0])
    dm = np.hypot(Tg[:, 0] / (mouthHalf + 7), (Tg[:, 1] - stom[1]) / 13)
    w_mouth = np.clip((dm - 1) / 0.6, 0, 1)
    # the nose wings damped: smiles flare them and shadows blur their edge in photographs
    alx = 0.5 * (abs(Tg[lm["alare.L"]][0]) + abs(Tg[lm["alare.R"]][0])); aly = 0.5 * (Tg[lm["alare.L"]][1] + Tg[lm["alare.R"]][1])
    dn = np.hypot((np.abs(Tg[:, 0]) - alx) / 9, (Tg[:, 1] - aly) / 9)
    w_nose = 0.2 + 0.8 * np.clip((dn - 0.6) / 0.8, 0, 1)
    D = D * (w_mouth * w_nose)[:, None]
    D[:, 2] *= 0.5
    res["sexes"][sex] = {"n": len(faces), "nClosed": int(sum(closed)), "people": names, "files": files, "offsets": np.round(D, 2).tolist(),
                         "rms": float(np.sqrt((D ** 2).sum(1).mean())), "max": float(np.sqrt((D ** 2).sum(1)).max())}
    print(sex, "n", len(faces), "closed", sum(closed), "rms offset", round(res["sexes"][sex]["rms"], 2), "mm, max", round(res["sexes"][sex]["max"], 2))
json.dump(res, open(out, "w"))
