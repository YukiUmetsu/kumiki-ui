"""
Fit ANAT1's beautiful face to the average of film stars' faces, in the landmark model's own measurement space.

Each iteration renders the face (no makeup, hair off the face), reads its landmarks with MediaPipe's face landmarker
exactly as the photographs were read (frontalised, normalised on the eye centres), and moves the face's vertices by part
of the remaining difference (x and y; depth is set by the form step), symmetrised and smoothed. The response of the
detector is not one to one (a moved jaw vertex does not always move the seen jaw line), so each landmark's step is
landmarks that do not respond are left alone, steps are half the residual and smooth, and the best iteration is kept.
The lid margins and the inner lip line are left out: photographs read the lids by their lash lines and liner (and
glamour portraits open the eyes wide), and the lips' closure is not a shape; the face sets those itself.

Usage: python 5-fit.py face_landmarker.task targets.json female|male ITERS (6 is plenty)   (writes the offsets into the repository's face-composite.json)
"""
import json, os, subprocess, sys
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from facegeo import detector, measure, frontal
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DATA = f"{REPO}/registry/anatomy/data/face-composite.json"
model, targets, sex, iters = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
T = np.array(json.load(open(targets))[sex]["mean"])[:468]
det = detector(model)
opts = {"sex": 0 if sex == "female" else 1, "width": 640, "height": 800, "supersample": 2, "hairStyle": "bun" if sex == "female" else "buzz", "hairStrands": 6000, "makeup": "none"}
REGIONS = {"brows": [70, 63, 105, 66, 107, 300, 293, 334, 296, 336, 46, 53, 52, 65, 55, 276, 283, 282, 295, 285],
           "eyes": [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
           "nose": [1, 2, 98, 327, 129, 358, 49, 279, 4, 5, 195, 197, 6, 168],
           "lips": [61, 291, 0, 17, 13, 14, 37, 267, 84, 314, 40, 270, 91, 321, 78, 308, 81, 311, 178, 402],
           "contour": [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]}

SKIP = [246, 161, 160, 159, 158, 157, 173, 7, 163, 144, 145, 153, 154, 155, 466, 388, 387, 386, 385, 384, 398, 249, 390, 373, 374, 380, 381, 382,
        78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 95, 88, 178, 87, 14, 317, 402, 318, 324]
USE = np.ones(468, bool); USE[SKIP] = False

def render():
    out = f"{HERE}/fit/{sex}"
    os.makedirs(f"{HERE}/fit", exist_ok=True)  # renders land beside the script; delete afterwards
    subprocess.run(["npx", "vite-node", f"{HERE}/fit_face.ts", json.dumps(opts), out], cwd=REPO, check=True, capture_output=True)
    d = json.load(open(out + ".verts.json"))
    rgba = np.frombuffer(open(out + ".rgba", "rb").read(), np.uint8).reshape(d["h"], d["w"], 4)
    cv2.imwrite(out + ".jpg", cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = measure(det, out + ".jpg")
    return frontal(m)[:468], np.array(d["vertices"])

def similarity(A, B):
    """Least squares B ≈ s R A + t for 2D points (reflection allowed): returns s·R (2x2)."""
    ma, mb = A.mean(0), B.mean(0); Ac, Bc = A - ma, B - mb
    U, S, Vt = np.linalg.svd(Ac.T @ Bc); M = (U @ Vt).T
    return S.sum() / (Ac ** 2).sum() * M

def write(D):
    data = json.load(open(DATA)); data[sex]["offsets"] = np.round(D, 3).tolist(); data[sex]["fitted"] = True
    json.dump(data, open(DATA, "w"), separators=(",", ":"))

D = np.zeros((468, 3)); write(D)
best = (1e9, D.copy()); prevQ = prevD = None; gain = np.ones(468); SR = None
for it in range(iters):
    Q, V = render()
    if it == 0:
        mir = np.array([np.argmin(((V - V[i] * np.array([-1, 1, 1])) ** 2).sum(1)) for i in range(468)])
        d2 = ((V[:, None, :] - V[None, :, :]) ** 2).sum(-1); W = np.exp(-d2 / (2 * 4.0 ** 2)); W /= W.sum(1, keepdims=True)
        SR = similarity(Q[:, :2], V[:, :2])  # landmark units -> mm, fixed from the first render
    R = (T[:, :2] - Q[:, :2]) @ SR.T
    R[~USE] = 0
    n = np.sqrt((R ** 2).sum(1)); rms = float(np.sqrt((n[USE] ** 2).mean()))
    by = {k: round(float(np.sqrt((n[[i for i in v if USE[i]]] ** 2).mean())), 2) for k, v in REGIONS.items()}
    print(f"{sex} iteration {it}: rms {rms:.2f} mm, max {n.max():.2f}", by, flush=True)
    if rms < best[0]: best = (rms, D.copy())
    if prevQ is not None:
        # the detector's gain per landmark: seen movement along the commanded movement
        dq = (Q[:, :2] - prevQ[:, :2]) @ SR.T; dd = (D - prevD)[:, :2]
        dd2 = (dd ** 2).sum(1); g = np.where(dd2 > 0.04, (dq * dd).sum(1) / np.maximum(dd2, 1e-9), np.nan)
        g = np.where(np.isnan(g), gain, np.clip(g, 0.0, 1.5))
        gain = 0.5 * gain + 0.5 * g
    if it == iters - 1: break
    step = np.zeros((468, 3))
    resp = gain > 0.3
    step[:, :2] = np.where(resp[:, None], R * 0.5, 0.0)
    step = 0.5 * (step + step[mir] * np.array([-1, 1, 1]))
    step = W @ step
    prevQ, prevD = Q, D.copy()
    D = D + step
    D[:, :2] = np.clip(D[:, :2], -8, 8)
    write(D)
write(best[1])
print("kept rms", round(best[0], 2), "written", DATA, flush=True)
