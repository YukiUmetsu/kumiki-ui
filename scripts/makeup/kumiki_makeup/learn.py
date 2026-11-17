"""Phase 2 (many faces): what a set of reference blueprints teaches.

  prior               per zone, what bare faces show under the same analysis (natural redness, lid shadow, lip colour);
                      a made-up face's effect is its observed colour minus this
  finish_thresholds   sheen and sparkle percentiles of bare skin, so 'matte', 'dewy' and 'shimmer' mean 'beyond bare'
  shape_reference     the bare faces' mean face-shape features (the average face is cosmetology's 'oval')
  effects             per zone, the makeup's median dL*, da*, db* with quartiles, overall and by style
  placement           where contour, highlight and blush actually sat, relative to the atlas, in eye widths
  contrast            facial contrast of brows, eyes and lips, bare against made up (compare Jones et al. 2015)
  beauty              correlations of measured features with rated attractiveness (Face Research Lab London Set)
"""

from __future__ import annotations

import json
import math
from datetime import date
from pathlib import Path

import numpy as np

from .geometry import FACE_SHAPES

ZONE_KEYS = ("dL", "da", "db")


def _q(vals: list[float]) -> dict:
    a = np.asarray(vals, dtype=np.float64)
    return {"median": round(float(np.median(a)), 2), "p25": round(float(np.percentile(a, 25)), 2), "p75": round(float(np.percentile(a, 75)), 2)}


def _pearson(x: list[float], y: list[float]) -> dict | None:
    x, y = np.asarray(x, dtype=np.float64), np.asarray(y, dtype=np.float64)
    ok = ~(np.isnan(x) | np.isnan(y))
    x, y = x[ok], y[ok]
    n = len(x)
    if n < 10 or x.std() == 0 or y.std() == 0:
        return None
    r = float(np.corrcoef(x, y)[0, 1])
    z, se = math.atanh(max(-0.999999, min(0.999999, r))), 1 / math.sqrt(n - 3)
    p = math.erfc(abs(z) / se / math.sqrt(2))
    return {"r": round(r, 3), "ci95": [round(math.tanh(z - 1.96 * se), 3), round(math.tanh(z + 1.96 * se), 3)], "p": round(p, 4), "n": n}


def _features(bp: dict) -> dict:
    """Numbers from one blueprint that the beauty correlations test."""
    g, sk, c, z = bp["geometry"], bp["skin"], bp.get("contrast", {}), bp["zones"]
    f = {
        "skin L*": sk["lab"][0], "skin a*": sk["lab"][1], "skin b*": sk["lab"][2], "skin evenness sd L*": sk["evenness"]["sd_L"], "skin evenness sd a*": sk["evenness"]["sd_a"],
        "eye contrast L*": c.get("eyes", {}).get("L", np.nan), "brow contrast L*": c.get("brows", {}).get("L", np.nan), "lip contrast L*": c.get("lips", {}).get("L", np.nan),
        "lip contrast a*": c.get("lips", {}).get("a", np.nan),
        "cheek redness (apples da*)": z.get("blush-apples", {}).get("observed", {}).get("da", np.nan),
        "under-eye lightness (dL*)": z.get("under-eye", {}).get("observed", {}).get("dL", np.nan),
        "canthal tilt deg": (g["canthal_tilt_deg"]["R"] + g["canthal_tilt_deg"]["L"]) / 2, "lower/upper lip": g["lips"]["lower_over_upper"],
        "asymmetry mm": g.get("asymmetry_mm", np.nan),
    }
    for k, v in g["face_shape"]["features"].items():
        f[f"shape {k}"] = v
    return f


def load_blueprints(refs: str) -> list[dict]:
    return [json.loads(p.read_text()) for p in sorted((Path(refs) / "blueprints").glob("*.blueprint.json"))]


def learn(refs: str, prior_from: str | None = None, labels: str | None = None) -> dict:
    bps = load_blueprints(refs)
    bare = [b for b in bps if b["labels"].get("makeup") is False]
    made = [b for b in bps if b["labels"].get("makeup") is True and not b["labels"].get("exclude_stats")]
    excluded = lambda b, zid: zid in b["labels"].get("exclude_zones", [])

    # 1. bare-skin prior
    if prior_from:
        prev = json.loads(Path(prior_from).read_text())
        prior, thresholds, shape_ref = prev["prior"], prev["finish_thresholds"], prev["shape_reference"]
    else:
        prior = {}
        zones = sorted({z for b in bare for z, v in b["zones"].items() if "observed" in v})
        for zid in zones:
            rows = [b["zones"][zid]["observed"] for b in bare if "observed" in b["zones"].get(zid, {}) and not excluded(b, zid)]
            if len(rows) >= 8:
                prior[zid] = {k: round(float(np.median([r[k] for r in rows])), 2) for k in ZONE_KEYS} | {"n": len(rows)}
        fin = [b["finish"]["overall"] for b in bare if b["finish"].get("overall")]
        peaks, shares, sparks = [f["peak"] for f in fin], [f["specular_share"] for f in fin], [f["sparkle_per_ew2"] for f in fin]
        thresholds = {"matte_peak": round(float(np.percentile(peaks, 20)), 3), "dewy_peak": round(float(np.percentile(peaks, 90)), 3),
                      "dewy_share": round(float(np.percentile(shares, 90)), 4), "shimmer": round(float(np.percentile(sparks, 95)), 2),
                      "glitter": round(float(2 * np.percentile(sparks, 95)), 2), "n": len(fin)}
        keys = list(bare[0]["geometry"]["face_shape"]["features"]) if bare else []
        shape_ref = {k: round(float(np.mean([b["geometry"]["face_shape"]["features"][k] for b in bare])), 4) for k in keys}
    if bare and "eye_spacing" not in shape_ref:
        # the average inner-corner distance in eye widths: photo eye-corner landmarks sit inside the true canthi, so
        # 'close-set' and 'wide-set' are judged against this, not against the textbook 'one eye width'
        shape_ref = {**shape_ref, "eye_spacing": round(float(np.mean([b["geometry"]["intercanthal_over_eye_width"] for b in bare])), 4)}

    # 2. makeup effects, overall and by style
    def effects(group: list[dict]) -> dict:
        out = {}
        for zid in sorted({z for b in group for z in b["zones"]}):
            rows = []
            for b in group:
                v = b["zones"].get(zid, {})
                if "observed" in v and zid in prior and not excluded(b, zid):
                    rows.append({k: v["observed"][k] - prior[zid][k] for k in ZONE_KEYS})
            if len(rows) >= 3:
                out[zid] = {"n": len(rows)} | {k: _q([r[k] for r in rows]) for k in ZONE_KEYS}
        return out
    by_style: dict[str, list[dict]] = {}
    for b in made:
        by_style.setdefault(b["labels"].get("style", "unlabelled"), []).append(b)

    # 3. placement: the effect's centroid, angle and spread relative to the atlas zone, both sides pooled
    placement = {}
    for zid in sorted({z for b in made for z, v in b["zones"].items() if v.get("placement")}):
        pts = [s for b in made if not excluded(b, zid) for s in (b["zones"][zid].get("placement") or {}).values()]
        if len(pts) >= 5:
            placement[zid] = {"n": len(pts), "centroid_ew": [round(float(np.median([p["centroid_ew"][i] for p in pts])), 3) for i in (0, 1)],
                              "angle_deg": round(float(np.median([p["angle_deg"] for p in pts])), 1),
                              "spread_ew": [round(float(np.median([p["spread_ew"][i] for p in pts])), 3) for i in (0, 1)]}

    # 4. facial contrast, bare against made up
    def contrast(group):
        out = {}
        for feat in ("brows", "eyes", "lips"):
            for ch in ("L", "a", "b"):
                vals = [b["contrast"][feat][ch] for b in group if feat in b.get("contrast", {})
                        and not (feat == "eyes" and excluded(b, "liner")) and not (feat == "lips" and excluded(b, "lips"))]
                if len(vals) >= 3:
                    out.setdefault(feat, {})[ch] = _q(vals) | {"n": len(vals)}
        return out

    # 5. palettes the references wore (dominant cluster of each)
    palettes = {k: [{"hex": b["palettes"][k][0]["hex"], "lab": b["palettes"][k][0]["lab"], "style": b["labels"].get("style")} for b in made
                    if b["palettes"].get(k) and not excluded(b, "lips" if k == "lips" else "lid")] for k in ("lips", "lids")}

    # 6. beauty: correlations with rated attractiveness, by sex (Face Research Lab London Set)
    beauty = {}
    rated = [b for b in bare if b["labels"].get("attractiveness") is not None]
    for sex in ("female", "male"):
        grp = [b for b in rated if b["labels"].get("gender") == sex]
        if len(grp) < 15:
            continue
        feats = [_features(b) for b in grp]
        y = [b["labels"]["attractiveness"] for b in grp]
        rows = []
        for k in feats[0]:
            res = _pearson([f[k] for f in feats], y)
            if res:
                rows.append({"feature": k, **res})
        beauty[sex] = sorted(rows, key=lambda r: -abs(r["r"]))

    sources = [{k: b["source"].get(k) for k in ("id", "licence", "credit", "url", "sha256", "ship")} | {"makeup": b["labels"].get("makeup"), "style": b["labels"].get("style")} for b in bps]
    learned = {
        "schema": "kumiki.makeup.learned/1", "generated": date.today().isoformat(),
        "counts": {"bare": len(bare), "made_up": len(made), "rated": len(rated)},
        "prior": prior, "finish_thresholds": thresholds, "shape_reference": shape_ref,
        "effects": effects(made), "effects_by_style": {s: effects(g) for s, g in sorted(by_style.items())},
        "placement": placement, "contrast": {"bare": contrast(bare), "made_up": contrast(made)}, "palettes": palettes,
        "beauty": beauty, "sources": sources,
    }
    learned["summary"] = {
        "counts": learned["counts"],
        "effects (median dL*, da*, db*)": {z: [v["dL"]["median"], v["da"]["median"], v["db"]["median"], v["n"]] for z, v in learned["effects"].items()},
        "contrast L* bare -> made up": {f: [learned["contrast"]["bare"].get(f, {}).get("L", {}).get("median"), learned["contrast"]["made_up"].get(f, {}).get("L", {}).get("median")] for f in ("brows", "eyes", "lips")},
        "strongest beauty correlations": {s: [f"{r['feature']}: r={r['r']} (p={r['p']}, n={r['n']})" for r in rows[:5]] for s, rows in beauty.items()},
    }
    return learned


def shippable(learned: dict) -> dict:
    """The subset that may ship in the MIT library: aggregates only, from sources whose licence allows it."""
    if not all(s.get("ship") for s in learned["sources"]):
        raise SystemExit("some sources may not ship (research-only or NC licences): learn again without them before writing the shipped file")
    out = {k: v for k, v in learned.items() if k != "summary"}
    out["sources"] = [{k: s[k] for k in ("id", "licence", "credit", "url", "makeup", "style")} for s in learned["sources"]]
    out["about"] = ("Learned by scripts/makeup (MAKEUP1) from openly licensed photographs: the Face Research Lab London Set (CC BY 4.0; bare faces "
                    "with attractiveness ratings) and CC0 or public-domain portraits found through Openverse (labels reviewed by eye in "
                    "scripts/makeup/reference-labels.json). Aggregates only; the photographs are not redistributed.")
    out["face_shapes"] = FACE_SHAPES
    return out


# ---- Before/after pairs ---------------------------------------------------------------------------------------------

# the zones each kind of pair made up; every other zone measures the noise between two photos of the same bare skin.
# A pair with no part label (or an unknown one) had makeup on the whole face.
PART_ZONES = {"lips": {"lips"}, "eyes": {"lid", "crease", "outer-v", "liner", "lower-lash", "brow", "brow-bone"},
              "skin": {"under-eye", "cheek-contour", "temple-contour", "jaw-contour", "nose-contour", "cheekbone-highlight", "nose-highlight",
                       "forehead-highlight", "chin-highlight", "brow-bone", "blush-apples"}}
MIN_PAIRS = 5  # fewer pairs give no stable median


def paired_report(refs: str, shipped: dict | None = None) -> dict:
    """Each person with makeup against the same person without: the zone colour change (observed, so each photo's own
    skin is the reference), the facial contrast change and the skin's change, by the part that was made up. Zones a
    pair did not make up give the noise floor. Beside them, the shipped (unpaired) effects, to check their direction
    and size."""
    by_pair: dict[str, dict] = {}
    for b in load_blueprints(refs):
        pid = b["labels"].get("pair")
        if pid:
            by_pair.setdefault(pid, {})["made" if b["labels"].get("makeup") else "bare"] = b
    pairs = [(v["bare"], v["made"]) for _, v in sorted(by_pair.items()) if "bare" in v and "made" in v]
    changed: dict[str, list] = {}
    noise: dict[str, list] = {}
    contrast: dict[str, dict] = {}  # part -> feature -> channel -> changes
    skin: dict[str, dict] = {}  # part -> measure -> changes
    for a, m in pairs:
        part = a["labels"].get("part") or "face"
        touched = PART_ZONES.get(part, set(a["zones"]))
        for z, va in a["zones"].items():
            vm = m["zones"].get(z, {})
            if "observed" in va and "observed" in vm:
                d = {k: vm["observed"][k] - va["observed"][k] for k in ZONE_KEYS}
                (changed if z in touched else noise).setdefault(z, []).append(d)
        for f in ("brows", "eyes", "lips"):
            if f in a.get("contrast", {}) and f in m.get("contrast", {}):
                for ch in ("L", "a", "b"):
                    contrast.setdefault(part, {}).setdefault(f, {}).setdefault(ch, []).append(m["contrast"][f][ch] - a["contrast"][f][ch])
        s = skin.setdefault(part, {"sd_L": [], "sd_a": [], "dL": [], "da": [], "db": []})
        for k in ("sd_L", "sd_a"):
            s[k].append(m["skin"]["evenness"][k] - a["skin"]["evenness"][k])
        for i, k in enumerate(("dL", "da", "db")):
            s[k].append(m["skin"]["lab"][i] - a["skin"]["lab"][i])
    changed = {z: r for z, r in changed.items() if len(r) >= MIN_PAIRS}
    noise = {z: r for z, r in noise.items() if len(r) >= MIN_PAIRS}
    stat = lambda rows: {"n": len(rows)} | {k: _q([r[k] for r in rows]) for k in ZONE_KEYS}
    parts = {p: len(s["dL"]) for p, s in skin.items()}
    report = {
        "schema": "kumiki.makeup.paired-report/1", "generated": date.today().isoformat(), "pairs": len(pairs), "parts": parts,
        "licences": sorted({p[0]["source"].get("licence", "") for p in pairs}), "ship": False,
        "changed": {z: stat(r) for z, r in changed.items()},
        "noise": {z: stat(r) for z, r in noise.items()},
        "contrast_change": {p: {f: {ch: _q(v) | {"n": len(v)} for ch, v in d.items()} for f, d in fs.items()}
                            for p, fs in contrast.items() if parts[p] >= MIN_PAIRS},
        "skin_change": {p: {k: _q(v) for k, v in s.items()} for p, s in skin.items() if parts[p] >= MIN_PAIRS},
    }
    # the noise floor: typical absolute change in zones nobody made up
    floor = {k: round(float(np.median([abs(r[k]) for rows in noise.values() for r in rows])), 2) for k in ZONE_KEYS} if noise else {}
    report["noise_floor_abs_median"] = floor
    comparison = {}
    if shipped:
        for z, st in report["changed"].items():
            e = shipped.get("effects", {}).get(z)
            if e:
                comparison[z] = {k: {"paired": st[k]["median"], "shipped": e[k]["median"],
                                     "same_sign": (st[k]["median"] >= 0) == (e[k]["median"] >= 0)} for k in ZONE_KEYS}
        c_ship = shipped.get("contrast", {})
        for p, fs in report["contrast_change"].items():
            for f, d in fs.items():
                if f in c_ship.get("bare", {}) and f in c_ship.get("made_up", {}):
                    comparison[f"contrast:{f}:{p}"] = {"paired_change_L": d["L"]["median"],
                                                       "shipped_bare_to_made_L": round(c_ship["made_up"][f]["L"]["median"] - c_ship["bare"][f]["L"]["median"], 3)}
    report["comparison"] = comparison
    report["summary"] = {
        "pairs by part": parts, "licences": report["licences"],
        "changed (median dL*, da*, db*, n)": {z: [v["dL"]["median"], v["da"]["median"], v["db"]["median"], v["n"]] for z, v in report["changed"].items()},
        "noise floor |d| (median over untouched zones)": floor,
        "contrast change L*": {p: {f: d["L"]["median"] for f, d in fs.items()} for p, fs in report["contrast_change"].items()},
        "comparison with the shipped data": comparison,
    }
    return report


def paired_transfer(refs: str) -> dict:
    """Phase 3 against the truth: each made-up blueprint painted (as an atlas plan) onto the same person's bare photo.
    For the zones the pair made up: the CIEDE2000 from the real made-up photo, before (the bare photo) and after the
    transfer. For the other zones: how far the transfer moved the bare colour (it should not). The plan ignores the
    blueprint's labels, so it shows what an unreviewed reference carries over. Colours are compared as each photo's zone
    colour against its own skin, put on the bare skin."""
    from .analyze import analyze, prepare
    from .color import delta_e2000
    from .ingest import load_face, load_kept
    from .paint import apply_plan, plan_from_blueprint

    by_pair: dict[str, dict] = {}
    for r in load_kept(refs):
        if r["labels"].get("pair"):
            by_pair.setdefault(r["labels"]["pair"], {})["made" if r["labels"].get("makeup") else "bare"] = r
    bps = Path(refs) / "blueprints"
    made_up: dict[str, dict] = {}
    moved: dict[str, list] = {}
    for v in by_pair.values():
        if "bare" not in v or "made" not in v:
            continue
        bare = json.loads((bps / f"{v['bare']['id']}.blueprint.json").read_text())
        made = json.loads((bps / f"{v['made']['id']}.blueprint.json").read_text())
        rgb, lm, mask = load_face(refs, v["bare"])
        out = analyze(prepare(apply_plan(prepare(rgb, lm, mask), plan_from_blueprint(made | {"labels": {}})), lm, mask), labels=v["bare"]["labels"])
        skin = np.array(bare["skin"]["lab"], dtype=np.float64)
        on_skin = lambda zone: skin + np.array([zone["observed"][k] for k in ZONE_KEYS])
        touched = PART_ZONES.get(v["bare"]["labels"].get("part") or "face", set(bare["zones"]))
        for z, zb in bare["zones"].items():
            zm, zo = made["zones"].get(z, {}), out["zones"].get(z, {})
            if not all("observed" in d for d in (zb, zm, zo)):
                continue
            if z in touched:
                d = made_up.setdefault(z, {"before": [], "after": []})
                d["before"].append(delta_e2000(on_skin(zb), on_skin(zm)))
                d["after"].append(delta_e2000(on_skin(zo), on_skin(zm)))
            else:
                moved.setdefault(z, []).append(delta_e2000(on_skin(zo), on_skin(zb)))
    return {"made_up": {z: {"n": len(d["after"]), "before": _q(d["before"]), "after": _q(d["after"])} for z, d in made_up.items() if len(d["after"]) >= MIN_PAIRS},
            "moved_untouched": {z: _q(r) | {"n": len(r)} for z, r in moved.items() if len(r) >= MIN_PAIRS}}
