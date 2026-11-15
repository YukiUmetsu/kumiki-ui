#!/usr/bin/env python3
"""Bake the small ANAT1 reference tables: the MediaPipe canonical face mesh and CDC 2000 stature-for-age.

  python3 -I scripts/anatomy/bake_reference_data.py canonical_face_model.obj statage.csv lenageinf.csv registry/anatomy/data

* canonical_face_model.obj — google-ai-edge/mediapipe, mediapipe/modules/face_geometry/data (Apache-2.0). 468 vertices
  in centimetres, +x the face's left, +y up, +z forward. Stored in millimetres with the triangle list.
* statage.csv — CDC 2000 growth charts, stature-for-age LMS, 2–20 years (U.S. Government work). Stored as yearly
  P5/P50/P95 rows plus L, M, S so any percentile can be computed.
* lenageinf.csv — CDC 2000 length-for-age, birth to 36 months (recumbent length); the 12- and 18-month rows are added
  so the curve starts at one year (MakeHuman's youngest age).
"""
import csv
import hashlib
import json
import os
import sys


def face(path):
    V, F = [], []
    for line in open(path):
        if line.startswith("v "):
            V.append([round(float(x) * 10, 2) for x in line.split()[1:4]])
        elif line.startswith("f "):
            F.append([int(p.split("/")[0]) - 1 for p in line.split()[1:4]])
    assert len(V) == 468, len(V)
    return {
        "schema": "kumiki.anatomy.face-mesh/1",
        "source": {
            "name": "MediaPipe canonical face model (face_geometry/data/canonical_face_model.obj)",
            "url": "https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj",
            "license": "Apache-2.0",
            "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(),
            "note": "A single average adult face surface (no ears, no cranium behind the hairline). Units converted from cm to mm.",
        },
        "units": "mm", "axes": "+x face's left, +y up, +z forward",
        "vertices": V, "triangles": F,
    }


def stature(path, infant_path):
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))
    out = {"female": [], "male": []}
    for r in csv.DictReader(open(infant_path, encoding="utf-8-sig")):
        if not r["Agemos"].replace(".", "", 1).isdigit():
            continue  # the CDC files repeat the header between sexes
        m = float(r["Agemos"])
        if m not in (12.5, 18.5):
            continue
        sex = "male" if r["Sex"] == "1" else "female"
        out[sex].append({"age": 1 if m == 12.5 else 1.5, "measure": "length", "L": round(float(r["L"]), 5), "M": round(float(r["M"]) * 10, 1), "S": round(float(r["S"]), 6),
                         "p5": round(float(r["P5"]) * 10, 1), "p50": round(float(r["P50"]) * 10, 1), "p95": round(float(r["P95"]) * 10, 1)})
    for r in rows:
        if not r["Agemos"].replace(".", "", 1).isdigit():
            continue
        m = float(r["Agemos"])
        if abs((m - 0.5) % 12) > 1e-6 and m not in (24.0,):
            continue
        age = round((m - 0.5) / 12) if m != 24.0 else 2
        sex = "male" if r["Sex"] == "1" else "female"
        if any(e["age"] == age for e in out[sex]):
            continue
        out[sex].append({"age": age, "L": round(float(r["L"]), 5), "M": round(float(r["M"]) * 10, 1), "S": round(float(r["S"]), 6),
                         "p5": round(float(r["P5"]) * 10, 1), "p50": round(float(r["P50"]) * 10, 1), "p95": round(float(r["P95"]) * 10, 1)})
    return {
        "schema": "kumiki.anatomy.stature-for-age/1",
        "source": {"name": "CDC 2000 growth charts — stature-for-age, 2 to 20 years (LMS parameters)", "url": "https://www.cdc.gov/growthcharts/percentile_data_files.htm",
                   "rights": "U.S. Government work (public domain).", "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(),
                   "infantSource": "https://www.cdc.gov/growthcharts/data/zscore/lenageinf.csv (ages 1 and 1.5: recumbent length)",
                   "note": "US reference population. Values in mm. Percentile p: M*(1+L*S*z)^(1/L)."},
        **out,
    }


def main():
    obj, csvp, infant, outdir = sys.argv[1:5]
    os.makedirs(outdir, exist_ok=True)
    for name, data in (("face-mesh-mediapipe.json", face(obj)), ("stature-for-age-cdc.json", stature(csvp, infant))):
        with open(os.path.join(outdir, name), "w") as f:
            json.dump(data, f, separators=(",", ":"))
            f.write("\n")
        print("wrote", name, os.path.getsize(os.path.join(outdir, name)))


if __name__ == "__main__":
    main()
