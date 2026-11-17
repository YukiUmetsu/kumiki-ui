"""MediaPipe face landmarks (478 points) and head pose for each portrait photograph."""
import json, sys, os, math
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
model, folder, out = sys.argv[1], sys.argv[2], sys.argv[3]
res = json.load(open(out)) if os.path.exists(out) else {}
opts = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=model), running_mode=vision.RunningMode.IMAGE, num_faces=1, output_facial_transformation_matrixes=True, min_face_detection_confidence=0.5)
with vision.FaceLandmarker.create_from_options(opts) as lm:
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith(".jpg") or fn in res: continue
        img = cv2.imread(os.path.join(folder, fn))
        if img is None: res[fn] = {"error": "unreadable"}; continue
        h, w = img.shape[:2]
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) if img.ndim == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
        r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
        if not r.face_landmarks: res[fn] = {"error": "no face"}; print(fn, "no face"); continue
        pts = [[p.x, p.y, p.z] for p in r.face_landmarks[0]]
        M = np.array(r.facial_transformation_matrixes[0])[:3, :3]
        # yaw (turn), pitch (nod), roll from the rotation part
        yaw = math.degrees(math.atan2(-M[2, 0], math.hypot(M[2, 1], M[2, 2]))); pitch = math.degrees(math.atan2(M[2, 1], M[2, 2])); roll = math.degrees(math.atan2(M[1, 0], M[0, 0]))
        xs = [p[0] * w for p in pts]; ys = [p[1] * h for p in pts]
        res[fn] = {"w": w, "h": h, "pts": pts, "yaw": yaw, "pitch": pitch, "roll": roll, "faceW": max(xs) - min(xs), "faceH": max(ys) - min(ys)}
        print(fn, f"yaw {yaw:+.1f} pitch {pitch:+.1f} roll {roll:+.1f} face {max(xs)-min(xs):.0f}px"); sys.stdout.flush()
json.dump(res, open(out, "w"))
