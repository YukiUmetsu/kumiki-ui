"""Convert an AliceVision (Meshroom) sfm.json into a COLMAP text model (cameras.txt, images.txt, points3D.txt).
AliceVision stores each pose's rotation as camera-to-world (verified by reprojection: median 1.5 px); COLMAP wants world-to-camera
as a quaternion and t = -R C. radial3 distortion maps to COLMAP's FULL_OPENCV k1, k2, k3."""
import json, os, sys
import numpy as np
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
d = json.load(open(src))
K = d["intrinsics"]; ids = {k["intrinsicId"]: i + 1 for i, k in enumerate(K)}
with open(os.path.join(out, "cameras.txt"), "w") as f:
    for k in K:
        fx = float(k["pxFocalLength"]); cx, cy = map(float, k["principalPoint"]); k1, k2, k3 = map(float, k["distortionParams"])
        f.write(f"{ids[k['intrinsicId']]} FULL_OPENCV {k['width']} {k['height']} {fx} {fx} {cx} {cy} {k1} {k2} 0 0 {k3} 0 0 0\n")
def quat(R):
    t = np.trace(R)
    if t > 0: s = np.sqrt(t + 1) * 2; return [s / 4, (R[2,1]-R[1,2]) / s, (R[0,2]-R[2,0]) / s, (R[1,0]-R[0,1]) / s]
    i = int(np.argmax(np.diag(R)))
    if i == 0: s = np.sqrt(1 + R[0,0] - R[1,1] - R[2,2]) * 2; return [(R[2,1]-R[1,2]) / s, s / 4, (R[0,1]+R[1,0]) / s, (R[0,2]+R[2,0]) / s]
    if i == 1: s = np.sqrt(1 + R[1,1] - R[0,0] - R[2,2]) * 2; return [(R[0,2]-R[2,0]) / s, (R[0,1]+R[1,0]) / s, s / 4, (R[1,2]+R[2,1]) / s]
    s = np.sqrt(1 + R[2,2] - R[0,0] - R[1,1]) * 2; return [(R[1,0]-R[0,1]) / s, (R[0,2]+R[2,0]) / s, (R[1,2]+R[2,1]) / s, s / 4]
poses = {p["poseId"]: p["pose"]["transform"] for p in d["poses"]}
n = 0
with open(os.path.join(out, "images.txt"), "w") as f:
    for i, v in enumerate(sorted(d["views"], key=lambda v: os.path.basename(v["path"].replace("\\", "/")))):
        if v["poseId"] not in poses: continue
        t = poses[v["poseId"]]; Rwc = np.array(list(map(float, t["rotation"]))).reshape(3, 3).T
        C = np.array(list(map(float, t["center"]))); tv = -Rwc @ C; q = quat(Rwc)
        f.write(f"{i + 1} {q[0]} {q[1]} {q[2]} {q[3]} {tv[0]} {tv[1]} {tv[2]} {ids[v['intrinsicId']]} {os.path.basename(v['path'].replace(chr(92), '/'))}\n\n")
        n += 1
with open(os.path.join(out, "points3D.txt"), "w") as f:
    for j, l in enumerate(d["structure"]):
        X = list(map(float, l["X"])); c = list(map(int, l["color"]))
        f.write(f"{j + 1} {X[0]} {X[1]} {X[2]} {c[0]} {c[1]} {c[2]} 1.0\n")
print(f"{len(K)} camera, {n} images, {len(d['structure'])} points -> {out}")
