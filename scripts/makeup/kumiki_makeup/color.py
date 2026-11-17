"""Colour science for skin and makeup: sRGB, linear light, CIELAB (D65), CIEDE2000, ITA, undertone, palettes, contrast.

The same formulas live in registry/anatomy/anatomy-color.ts and makeup-color.ts; keep them in step.
"""

from __future__ import annotations

import math

import numpy as np

WHITE_D65 = np.array([0.95047, 1.0, 1.08883])
M_RGB_XYZ = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
M_XYZ_RGB = np.array([[3.2404542, -1.5371385, -0.4985314], [-0.9692660, 1.8760108, 0.0415560], [0.0556434, -0.2040259, 1.0572252]])


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c: np.ndarray) -> np.ndarray:
    c = np.clip(np.asarray(c, dtype=np.float64), 0, None)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def linear_to_lab(rgb: np.ndarray) -> np.ndarray:
    """Linear RGB (..., 3) -> CIELAB (..., 3)."""
    xyz = np.asarray(rgb, dtype=np.float64) @ M_RGB_XYZ.T / WHITE_D65
    e = 216 / 24389
    f = np.where(xyz > e, np.cbrt(np.maximum(xyz, e)), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def lab_to_linear(lab: np.ndarray) -> np.ndarray:
    lab = np.asarray(lab, dtype=np.float64)
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], axis=-1)
    xyz = np.where(f ** 3 > 216 / 24389, f ** 3, (116 * f - 16) / (24389 / 27)) * WHITE_D65
    return xyz @ M_XYZ_RGB.T


def srgb8_to_lab(img: np.ndarray) -> np.ndarray:
    """uint8 sRGB (RGB order) -> CIELAB."""
    return linear_to_lab(srgb_to_linear(img.astype(np.float64) / 255.0))


def lab_to_srgb8(lab: np.ndarray) -> np.ndarray:
    return np.clip(np.round(linear_to_srgb(np.clip(lab_to_linear(lab), 0, 1)) * 255), 0, 255).astype(np.uint8)


def hex_of_lab(lab) -> str:
    r, g, b = lab_to_srgb8(np.asarray(lab, dtype=np.float64))
    return f"#{int(r):02x}{int(g):02x}{int(b):02x}"


def lch(lab) -> tuple[float, float, float]:
    L, a, b = (float(x) for x in lab)
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def delta_e2000(lab1, lab2) -> float:
    """CIEDE2000 colour difference (Sharma, Wu & Dalal 2005)."""
    L1, a1, b1 = (float(x) for x in lab1)
    L2, a2, b2 = (float(x) for x in lab2)
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cm = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360
    h2p = math.degrees(math.atan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dhp = 0.0 if C1p * C2p == 0 else (h2p - h1p if abs(h2p - h1p) <= 180 else h2p - h1p - 360 if h2p - h1p > 180 else h2p - h1p + 360)
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))
    Lpm, Cpm = (L1 + L2) / 2, (C1p + C2p) / 2
    if C1p * C2p == 0:
        hpm = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hpm = (h1p + h2p) / 2
    else:
        hpm = (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2
    T = 1 - 0.17 * math.cos(math.radians(hpm - 30)) + 0.24 * math.cos(math.radians(2 * hpm)) + 0.32 * math.cos(math.radians(3 * hpm + 6)) - 0.20 * math.cos(math.radians(4 * hpm - 63))
    dTheta = 30 * math.exp(-(((hpm - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lpm - 50) ** 2 / math.sqrt(20 + (Lpm - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cpm, 1 + 0.015 * Cpm * T
    Rt = -math.sin(math.radians(2 * dTheta)) * Rc
    return math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


# ---- Skin -------------------------------------------------------------------------------------------------------

def ita_degrees(lab) -> float:
    """Individual Typology Angle: atan((L* - 50) / b*), degrees (Chardon, Dupont & Leveque 1991)."""
    return math.degrees(math.atan2(float(lab[0]) - 50, float(lab[2])))


def ita_category(ita: float) -> str:
    return "very light" if ita > 55 else "light" if ita > 41 else "intermediate" if ita > 28 else "tan" if ita > 10 else "brown" if ita > -30 else "dark"


# Cheek skin measured by spectrophotometer in 960 adults of four groups (Xiao et al. 2017, Skin Res. Technol. 23:21,
# Table 2): hue angles 51.0 (Caucasian), 51.2 (Chinese), 53.5 (Kurdish), 58.6 (Thai) degrees. Pooled with the
# within-group spread propagated from the a*, b* SDs: mean 53.6, SD 7.7 degrees. Terciles of that distribution split
# cool, neutral and warm. No study validates colorimetric undertone classes, so the split is an estimate (grade E).
UNDERTONE_REF = {"hue_mean": 53.6, "hue_sd": 7.7, "cool_below": 50.3, "warm_above": 56.9, "olive_a_below": 8.9,
                 "source": "Xiao et al. 2017, Skin Research and Technology 23:21-29, Table 2 (cheek)"}


def undertone(lab) -> dict:
    """Warm, neutral, cool or olive from the skin's CIELAB hue angle and redness (estimates; see UNDERTONE_REF)."""
    L, C, h = lch(lab)
    a, b = float(lab[1]), float(lab[2])
    z = (h - UNDERTONE_REF["hue_mean"]) / UNDERTONE_REF["hue_sd"]
    if a < UNDERTONE_REF["olive_a_below"] and b >= 13 and 35 <= L <= 72 and h > UNDERTONE_REF["cool_below"]:
        cls = "olive"
    elif h < UNDERTONE_REF["cool_below"]:
        cls = "cool"
    elif h > UNDERTONE_REF["warm_above"]:
        cls = "warm"
    else:
        cls = "neutral"
    # outside the measured lightness range (about L* 29-73 in Xiao et al.) the split is less certain
    conf = min(1.0, abs(z) / 1.0) * (0.6 if L < 35 or L > 75 else 1.0)
    return {"class": cls, "hue": round(h, 2), "chroma": round(C, 2), "z": round(z, 2), "confidence": round(conf, 2)}


# ---- Palettes and contrast -----------------------------------------------------------------------------------------

def kmeans_lab(lab_pixels: np.ndarray, k: int = 3, seed: int = 7) -> list[dict]:
    """Dominant colours of a region: k-means in CIELAB, largest share first."""
    import cv2

    x = np.asarray(lab_pixels, dtype=np.float32).reshape(-1, 3)
    if len(x) < k * 4:
        return [{"lab": [round(float(v), 2) for v in x.mean(0)], "share": 1.0, "hex": hex_of_lab(x.mean(0))}] if len(x) else []
    cv2.setRNGSeed(seed)
    _, labels, centres = cv2.kmeans(x, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.2), 4, cv2.KMEANS_PP_CENTERS)
    shares = np.bincount(labels.ravel(), minlength=k) / len(x)
    out = [{"lab": [round(float(v), 2) for v in centres[i]], "share": round(float(shares[i]), 3), "hex": hex_of_lab(centres[i])} for i in range(k)]
    return sorted(out, key=lambda c: -c["share"])


def michelson_contrast(skin_lab, feature_lab) -> dict:
    """Facial contrast (Porcheron, Mauger & Russell 2013; Jones, Russell & Ward 2015): (skin - feature) / (skin + feature)
    per channel. a* and b* use the offset (+128) encoding of those papers, so the numbers compare with their tables."""
    sL, sa, sb = (float(v) for v in skin_lab)
    fL, fa, fb = (float(v) for v in feature_lab)
    return {"L": round((sL - fL) / max(1e-6, sL + fL), 4), "a": round((sa - fa) / (sa + fa + 256), 4), "b": round((sb - fb) / (sb + fb + 256), 4)}
