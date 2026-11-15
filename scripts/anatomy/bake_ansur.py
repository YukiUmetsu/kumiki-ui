#!/usr/bin/env python3
"""Bake ANSUR II public anthropometric data into measured adult body ranges for ANAT1.

Input: the two public ANSUR II CSV files (US Army Natick Soldier RD&E Center, 2012 survey, public release 2017):
  https://tools.openlab.psu.edu/publicData/ANSUR_II_MALE_Public.csv
  https://tools.openlab.psu.edu/publicData/ANSUR_II_FEMALE_Public.csv
Usage: python3 -I scripts/anatomy/bake_ansur.py MALE.csv FEMALE.csv registry/anatomy/data/ansur-ii-ranges.json

The output keeps summary statistics only (no rows). Female and male files are summarised separately, as the survey
documentation requires. The self-reported Heightin/Weightlbs columns are ignored.
"""
import csv
import hashlib
import json
import math
import sys

# Measurement -> (kind, plain description). kind: height (above floor, standing unless noted), breadth (side to side),
# depth (front to back), length, circumference, arc, mass.
MEASURES = {
    "stature": ("height", "Floor to the top of the head (vertex), standing"),
    "eyeheightsitting": ("height", "Sitting surface to the outer eye corner (ectocanthus)"),
    "tragiontopofhead": ("length", "Ear opening (tragion) up to the top of the head"),
    "cervicaleheight": ("height", "Floor to the 7th cervical vertebra (C7, the bump at the base of the neck)"),
    "suprasternaleheight": ("height", "Floor to the top of the breastbone (jugular notch)"),
    "acromialheight": ("height", "Floor to the acromion (outer tip of the shoulder bone)"),
    "axillaheight": ("height", "Floor to the armpit (posterior axillary fold)"),
    "chestheight": ("height", "Floor to the chest at nipple level (men) or the bust point (women)"),
    "tenthribheight": ("height", "Floor to the lowest point of the 10th rib"),
    "waistheightomphalion": ("height", "Floor to the navel (omphalion)"),
    "iliocristaleheight": ("height", "Floor to the top of the iliac crest (hip bone) at the side"),
    "trochanterionheight": ("height", "Floor to the greater trochanter (bony point at the side of the hip)"),
    "buttockheight": ("height", "Floor to the fullest point of the buttock"),
    "crotchheight": ("height", "Floor to the crotch"),
    "lateralfemoralepicondyleheight": ("height", "Floor to the outer knee bone (lateral femoral epicondyle)"),
    "kneeheightmidpatella": ("height", "Floor to the middle of the kneecap"),
    "tibialheight": ("height", "Floor to the top inner edge of the shin bone (tibiale)"),
    "lateralmalleolusheight": ("height", "Floor to the outer ankle bone (lateral malleolus)"),
    "wristheight": ("height", "Floor to the wrist (stylion), arms hanging"),
    "sittingheight": ("height", "Sitting surface to the top of the head"),
    "kneeheightsitting": ("height", "Floor to the top of the knee, sitting"),
    "poplitealheight": ("height", "Floor to the back of the knee, sitting"),
    "elbowrestheight": ("height", "Sitting surface to the underside of the bent elbow"),
    "abdominalextensiondepthsitting": ("depth", "Belly depth at its fullest, sitting"),
    "biacromialbreadth": ("breadth", "Between the two acromion points (bony shoulder width)"),
    "bideltoidbreadth": ("breadth", "Maximum shoulder width across the deltoid muscles"),
    "shoulderlength": ("length", "Side of the neck to the acromion"),
    "chestbreadth": ("breadth", "Chest width at nipple/bust level"),
    "chestdepth": ("depth", "Chest depth at nipple/bust level"),
    "chestcircumference": ("circumference", "Chest girth at nipple/bust level"),
    "shouldercircumference": ("circumference", "Girth around both deltoids"),
    "waistbreadth": ("breadth", "Waist width at the navel"),
    "waistdepth": ("depth", "Waist depth at the navel"),
    "waistcircumference": ("circumference", "Waist girth at the navel"),
    "hipbreadth": ("breadth", "Maximum hip width, standing"),
    "hipbreadthsitting": ("breadth", "Maximum hip width, sitting"),
    "bicristalbreadth": ("breadth", "Between the iliac crests (bony pelvis width)"),
    "buttockdepth": ("depth", "Front of the body to the back of the buttock at its fullest"),
    "buttockcircumference": ("circumference", "Girth at the fullest point of the buttocks"),
    "neckcircumference": ("circumference", "Neck girth just below the larynx"),
    "neckcircumferencebase": ("circumference", "Neck girth at its base"),
    "verticaltrunkcircumferenceusa": ("circumference", "Loop from shoulder over the front, through the crotch and up the back"),
    "waistbacklength": ("length", "C7 down the back to the waist"),
    "waistfrontlengthsitting": ("length", "Jugular notch down the front to the waist, sitting"),
    "crotchlengthomphalion": ("arc", "Navel down through the crotch, front half"),
    "crotchlengthposterioromphalion": ("arc", "Back waist down through the crotch, back half"),
    "interscyei": ("breadth", "Across the back between the armpit creases, arms down"),
    "interscyeii": ("breadth", "Across the back between the armpit creases, arms forward"),
    "acromionradialelength": ("length", "Upper arm: acromion to the elbow (radiale)"),
    "shoulderelbowlength": ("length", "Acromion to the underside of the bent elbow"),
    "radialestylionlength": ("length", "Forearm: elbow (radiale) to the wrist (stylion)"),
    "forearmhandlength": ("length", "Back of the bent elbow to the middle fingertip"),
    "forearmcenterofgriplength": ("length", "Back of the bent elbow to the centre of a gripped bar"),
    "sleevelengthspinewrist": ("length", "C7 over the shoulder and arm to the wrist"),
    "sleeveoutseam": ("length", "Acromion along the outside of the arm to the wrist"),
    "span": ("length", "Fingertip to fingertip, arms outstretched"),
    "overheadfingertipreachsitting": ("height", "Sitting surface to the fingertips, arm raised"),
    "thumbtipreach": ("length", "Wall (shoulder blades) to the thumb tip, arm forward"),
    "bicepscircumferenceflexed": ("circumference", "Upper arm girth, biceps flexed"),
    "forearmcircumferenceflexed": ("circumference", "Forearm girth at its fullest, fist clenched"),
    "forearmforearmbreadth": ("breadth", "Across both forearms, elbows bent and touching the body"),
    "wristcircumference": ("circumference", "Wrist girth"),
    "handlength": ("length", "Wrist crease to the middle fingertip"),
    "palmlength": ("length", "Wrist crease to the base of the middle finger"),
    "handbreadth": ("breadth", "Across the knuckles (metacarpals 2–5)"),
    "handcircumference": ("circumference", "Hand girth around the knuckles"),
    "buttockkneelength": ("length", "Back of the buttock to the front of the knee, sitting"),
    "buttockpopliteallength": ("length", "Back of the buttock to the back of the knee, sitting"),
    "functionalleglength": ("length", "Back to the heel, leg extended, sitting"),
    "thighcircumference": ("circumference", "Upper-thigh girth just below the buttock"),
    "lowerthighcircumference": ("circumference", "Thigh girth just above the knee"),
    "thighclearance": ("height", "Sitting surface to the top of the thigh, sitting"),
    "calfcircumference": ("circumference", "Calf girth at its fullest"),
    "anklecircumference": ("circumference", "Minimum girth just above the ankle bones"),
    "heelanklecircumference": ("circumference", "Diagonal girth around the heel and ankle"),
    "bimalleolarbreadth": ("breadth", "Across the two ankle bones"),
    "footlength": ("length", "Heel to the tip of the longest toe"),
    "footbreadthhorizontal": ("breadth", "Maximum foot width"),
    "balloffootlength": ("length", "Heel to the ball of the foot (1st metatarsal head)"),
    "balloffootcircumference": ("circumference", "Foot girth around the ball"),
    "heelbreadth": ("breadth", "Width of the heel"),
    "headlength": ("length", "Glabella (between the brows) to the back of the head"),
    "headbreadth": ("breadth", "Maximum head width above the ears"),
    "headcircumference": ("circumference", "Maximum head girth above the brow ridges"),
    "bizygomaticbreadth": ("breadth", "Face width across the cheekbones (zygomatic arches)"),
    "interpupillarybreadth": ("breadth", "Between the pupil centres, looking ahead"),
    "mentonsellionlength": ("length", "Face height: nasal root (sellion) to the bottom of the chin (menton)"),
    "bitragionchinarc": ("arc", "Ear to ear across the front of the chin"),
    "bitragionsubmandibulararc": ("arc", "Ear to ear under the jaw"),
    "earlength": ("length", "Top to bottom of the ear"),
    "earbreadth": ("breadth", "Ear width"),
    "earprotrusion": ("depth", "How far the ear stands out from the head"),
    "weightkg": ("mass", "Body mass (kg)"),
}

# Columns recorded in tenths (kg x 10, mm x 10) in the public files.
TENTHS = {"weightkg", "interpupillarybreadth"}
RACES = {"1": "white", "2": "black", "3": "hispanic", "4": "asian", "5": "native-american", "6": "pacific-islander", "8": "other"}
RACE_KEYS = ["stature", "acromialheight", "crotchheight", "biacromialbreadth", "hipbreadth", "chestcircumference",
             "waistcircumference", "headlength", "headbreadth", "bizygomaticbreadth", "mentonsellionlength", "interpupillarybreadth",
             "handlength", "footlength", "weightkg", "span", "sittingheight"]


def pct(sorted_vals, p):
    k = (len(sorted_vals) - 1) * p
    f = math.floor(k); c = math.ceil(k)
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


def summarize(vals, digits=1):
    s = sorted(vals); n = len(s); m = sum(s) / n
    sd = math.sqrt(sum((v - m) ** 2 for v in s) / (n - 1))
    out = {"mean": round(m, digits), "sd": round(sd, digits)}
    for p in (1, 5, 25, 50, 75, 95, 99):
        out[f"p{p}"] = round(pct(s, p / 100), digits)
    return out


def load(path):
    with open(path, encoding="latin-1") as f:
        rows = list(csv.DictReader(f))
    return [{k.lower(): v for k, v in r.items()} for r in rows]


def bake(rows):
    stat = [float(r["stature"]) for r in rows]
    res = {"n": len(rows), "age": summarize([float(r["age"]) for r in rows], 1), "measurements": {}}
    for key, (kind, desc) in MEASURES.items():
        scale = 0.1 if key in TENTHS else 1.0
        vals = [float(r[key]) * scale for r in rows]
        entry = {"kind": kind, "unit": "kg" if key == "weightkg" else "mm", "description": desc, **summarize(vals)}
        if key not in ("stature", "weightkg"):
            ratios = [v / s for v, s in zip(vals, stat)]
            rs = summarize(ratios, 4)
            entry["ratioToStature"] = {k: rs[k] for k in ("mean", "sd", "p5", "p50", "p95")}
            n = len(vals); mx = sum(stat) / n; my = sum(vals) / n
            sxx = sum((x - mx) ** 2 for x in stat); sxy = sum((x - mx) * (y - my) for x, y in zip(stat, vals))
            syy = sum((y - my) ** 2 for y in vals)
            slope = sxy / sxx; r = sxy / math.sqrt(sxx * syy)
            resid = math.sqrt(sum((y - (my + slope * (x - mx))) ** 2 for x, y in zip(stat, vals)) / (n - 2))
            entry["onStature"] = {"slope": round(slope, 4), "intercept": round(my - slope * mx, 1), "r": round(r, 3), "residualSd": round(resid, 1)}
        res["measurements"][key] = entry
    w = [float(r["weightkg"]) / 10 for r in rows]
    res["bmi"] = summarize([wi / (s / 1000) ** 2 for wi, s in zip(w, stat)], 1)
    groups = {}
    for r in rows:
        groups.setdefault(RACES.get(r["dodrace"], "other"), []).append(r)
    res["byGroup"] = {}
    for g, rs in sorted(groups.items()):
        if len(rs) < 30:
            continue
        res["byGroup"][g] = {"n": len(rs), "p50": {k: round(pct(sorted(float(x[k]) * (0.1 if k in TENTHS else 1) for x in rs), 0.5), 1) for k in RACE_KEYS}}
    return res


def main():
    male, female, out = sys.argv[1:4]
    sha = {}
    for p in (male, female):
        sha[p.split("/")[-1]] = hashlib.sha256(open(p, "rb").read()).hexdigest()
    data = {
        "schema": "kumiki.anatomy.ansur-ranges/1",
        "source": {
            "name": "ANSUR II (2012 U.S. Army Anthropometric Survey), public release",
            "url": "https://www.openlab.psu.edu/ansur2/",
            "files": sha,
            "rights": "U.S. Government work released for public use; summary statistics only are stored here.",
            "population": "U.S. Army personnel aged 17–58; fitter and younger than the general population. Do not treat as children, elderly or world-population norms.",
            "caveats": ["Female and male files are summarised separately, as the survey memo requires.", "Self-reported Heightin/Weightlbs columns are ignored.", "Group medians use the DoD race code and are descriptive of this sample only."],
        },
        "female": bake(load(female)),
        "male": bake(load(male)),
    }
    with open(out, "w") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print("wrote", out)


if __name__ == "__main__":
    main()
