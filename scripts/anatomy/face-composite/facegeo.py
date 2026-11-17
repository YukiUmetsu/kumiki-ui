"""
Face geometry in one measurement space, for photographs and renders alike.

- MediaPipe Face Landmarker (478 points) and its facial transformation matrix;
- the landmarks lifted to 3D (x, y in pixels, z scaled like x), the head's rotation undone (frontalised), centred on
  the midpoint of the two eyes' centres (each eye's centre the middle of its corners, so gaze does not move it) and
  scaled so those centres sit 1 unit apart;
- features measured in units of that distance;
- the largest face is measured; the other faces found are counted (a second face of over a third of its width marks a
  group photograph).
"""
import json, math, os, sys
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions

def detector(model):
    opts = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=model), running_mode=vision.RunningMode.IMAGE, num_faces=4,
                                        output_facial_transformation_matrixes=True, min_face_detection_confidence=0.4)
    return vision.FaceLandmarker.create_from_options(opts)

def measure(det, path):
    img = cv2.imread(path)
    if img is None: return None
    h, w = img.shape[:2]
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
    if not r.face_landmarks:
        # close crops: the face detector wants some context, so pad the frame (and map the points back)
        pad = int(0.35 * max(w, h))
        big = cv2.copyMakeBorder(rgb, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
        r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(big)))
        if not r.face_landmarks: return None
        W2, H2 = w + 2 * pad, h + 2 * pad
        for f in r.face_landmarks:
            for p in f: p.x = (p.x * W2 - pad) / w; p.y = (p.y * H2 - pad) / h; p.z = p.z * W2 / w
    widths = [(max(p.x for p in f) - min(p.x for p in f)) * w for f in r.face_landmarks]
    k = int(np.argmax(widths)); others = sum(1 for i, x in enumerate(widths) if i != k and x > widths[k] / 3)
    P = np.array([[p.x * w, p.y * h, p.z * w] for p in r.face_landmarks[k]])
    M = np.array(r.facial_transformation_matrixes[k])
    R = M[:3, :3] / np.cbrt(np.linalg.det(M[:3, :3]))
    yaw = math.degrees(math.atan2(-R[2, 0], math.hypot(R[2, 1], R[2, 2]))); pitch = math.degrees(math.atan2(R[2, 1], R[2, 2])); roll = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    return {"pts": P, "R": R, "yaw": yaw, "pitch": pitch, "roll": roll, "w": w, "h": h, "faceW": widths[k], "others": others}

EYE_R, EYE_L = (33, 133), (263, 362)
def frontal(m):
    """
    Undo the head's rotation (image y down, so y and z flipped for a right-handed frame); centre on the midpoint of the
    two eyes' centres (each the middle of its corners, so gaze does not move it) and scale by their distance; level them.
    """
    P = m["pts"].copy(); P[:, 1] *= -1; P[:, 2] *= -1
    er, el = P[list(EYE_R)].mean(0), P[list(EYE_L)].mean(0)
    Q = (P - (er + el) / 2) @ m["R"]  # rows times R = R^T applied to each point
    er, el = Q[list(EYE_R)].mean(0), Q[list(EYE_L)].mean(0)
    Q /= np.linalg.norm(el[:2] - er[:2])
    er, el = Q[list(EYE_R)].mean(0), Q[list(EYE_L)].mean(0)
    a = math.atan2(el[1] - er[1], el[0] - er[0]); ca, sa = math.cos(-a), math.sin(-a)
    Q = Q @ np.array([[ca, sa, 0], [-sa, ca, 0], [0, 0, 1]]).T
    er, el = Q[list(EYE_R)].mean(0), Q[list(EYE_L)].mean(0)
    if el[0] < er[0]: Q[:, 0] *= -1
    return Q

# features, in IPD units (the subject's left is +x in this frame after the flip)
def features(Q):
    d = lambda a, b: float(np.linalg.norm(Q[a, :2] - Q[b, :2]))
    eyeH = lambda up, lo: float(Q[up, 1] - Q[lo, 1])
    f = {
        "face width (cheek)": d(234, 454), "jaw width": d(172, 397), "chin width": d(149, 378),
        "eye width": 0.5 * (d(33, 133) + d(263, 362)), "eye height": 0.5 * (eyeH(159, 145) + eyeH(386, 374)),
        "inner eye gap": d(133, 362), "outer eye span": d(33, 263),
        "brow above eye (mid)": 0.5 * (float(Q[105, 1] - Q[159, 1]) + float(Q[334, 1] - Q[386, 1])),
        "brow tail height": 0.5 * (float(Q[70, 1] - Q[33, 1]) + float(Q[300, 1] - Q[263, 1])),
        "canthal tilt (deg)": 0.5 * (math.degrees(math.atan2(Q[33, 1] - Q[133, 1], abs(Q[33, 0] - Q[133, 0]))) + math.degrees(math.atan2(Q[263, 1] - Q[362, 1], abs(Q[263, 0] - Q[362, 0])))),
        "nose width": d(129, 358), "nose length (eyes-to-subnasale)": float(-Q[2, 1]),
        "mouth width": d(61, 291), "upper lip height": float(Q[0, 1] - Q[13, 1]), "lower lip height": float(Q[14, 1] - Q[17, 1]),
        "philtrum (subnasale-lip)": float(Q[2, 1] - Q[0, 1]), "chin (lip-to-menton)": float(Q[17, 1] - Q[152, 1]),
        "eyes-to-menton": float(-Q[152, 1]), "eyes-to-forehead top (lm 10)": float(Q[10, 1]),
        "cheekbone height": 0.5 * (float(Q[234, 1]) + float(Q[454, 1])),
    }
    return f

if __name__ == "__main__":
    # usage: python facegeo.py face_landmarker.task geo.json img/*
    model, out = sys.argv[1], sys.argv[2]
    det = detector(model)
    res = {}
    for path in sys.argv[3:]:
        m = measure(det, path)
        if not m: print(os.path.basename(path), "no face"); continue
        Q = frontal(m)
        res[os.path.basename(path)] = {"Q": Q.tolist(), "yaw": m["yaw"], "pitch": m["pitch"], "roll": m["roll"], "w": m["w"], "h": m["h"], "faceW": m["faceW"], "others": m["others"]}
        print(os.path.basename(path), f"yaw {m['yaw']:+.1f} pitch {m['pitch']:+.1f} roll {m['roll']:+.1f} face {m['faceW']:.0f}px others {m['others']}")
    json.dump(res, open(out, "w"))
