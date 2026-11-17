"""Contact sheet of a face type's chosen photographs, each cropped to the face, for checking by eye.
Usage: contact-sheet.py face_landmarker.task targets.json GROUP:SEX out.jpg img/"""
import json, sys, os, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facegeo import detector, measure
model, targets, sex, out = sys.argv[1:5]; dirs = sys.argv[5:]  # sex: a targets key
det = detector(model); T = json.load(open(targets))[sex]
tiles = []
for fn in T["files"]:
    path = next(os.path.join(d, fn) for d in dirs if os.path.exists(os.path.join(d, fn)))
    m = measure(det, path); im = cv2.imread(path); P = m["pts"]
    x0, y0 = P[:, 0].min(), P[:, 1].min(); x1, y1 = P[:, 0].max(), P[:, 1].max(); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; s = max(x1 - x0, y1 - y0) * 0.75
    a, b, c, d = int(cx - s), int(cy - s * 1.1), int(cx + s), int(cy + s * 0.9)
    im = cv2.copyMakeBorder(im, 400, 400, 400, 400, cv2.BORDER_CONSTANT); crop = im[b + 400:d + 400, a + 400:c + 400]
    crop = cv2.resize(crop, (200, 200)); cv2.putText(crop, (fn.split("__")[2] if fn.count("__") == 3 else fn.split("__")[1])[:22], (3, 195), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
    tiles.append(crop)
cols = 8; rows = (len(tiles) + cols - 1) // cols
while len(tiles) < rows * cols: tiles.append(np.zeros((200, 200, 3), np.uint8))
cv2.imwrite(out, np.vstack([np.hstack(tiles[r * cols:(r + 1) * cols]) for r in range(rows)]), [cv2.IMWRITE_JPEG_QUALITY, 85])
