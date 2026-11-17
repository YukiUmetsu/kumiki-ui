"""Separate natural light and shadow from painted light and shadow (chiaroscuro analysis).

Skin is close to Lambertian at the scale of the face, so under distant, smooth light its brightness is albedo times a
low-order function of the surface normal: nine spherical-harmonic terms capture over 98% of it (Basri & Jacobs 2003;
Ramamoorthi & Hanrahan 2001). Two things that function cannot hold are added from the face mesh itself:
  - ambient occlusion: how much of the sky each point sees (eye sockets, the sides of the nose, under the jaw);
  - the key light's cast shadow: whether the point sees the dominant light (the nose's shadow, the brow over the eye).
The model is  Y ~ AO * (SH9(n) . c) + k * V_key * max(0, n . l),  fitted robustly over skin (Tukey biweight), so
makeup and specular shine, which the model cannot explain, are down-weighted. The remainder, image / shading, is the
albedo that makeup changed.
"""

from __future__ import annotations

import numpy as np


def sh9(n: np.ndarray) -> np.ndarray:
    """Real spherical-harmonic basis up to order 2 (constants folded into the coefficients)."""
    x, y, z = n[..., 0], n[..., 1], n[..., 2]
    return np.stack([np.ones_like(x), y, z, x, x * y, y * z, 3 * z * z - 1, x * z, x * x - y * y], axis=-1)


def _irls(B: np.ndarray, y: np.ndarray, iters: int = 6) -> np.ndarray:
    """Robust least squares (Tukey biweight, c = 4.685)."""
    w = np.ones(len(y))
    c = np.zeros(B.shape[1])
    for _ in range(iters):
        sw = np.sqrt(w)
        c, *_ = np.linalg.lstsq(B * sw[:, None], y * sw, rcond=None)
        r = y - B @ c
        s = 1.4826 * np.median(np.abs(r - np.median(r))) + 1e-9
        u = r / (4.685 * s)
        w = np.where(np.abs(u) < 1, (1 - u * u) ** 2, 0.0)
    return c


def fit_shading(lum: np.ndarray, normals: np.ndarray, iters: int = 6) -> np.ndarray:
    """SH9 coefficients with lum ~ sh9(n) @ c (no occlusion)."""
    return _irls(sh9(normals), lum, iters)


def shading(normals: np.ndarray, c: np.ndarray) -> np.ndarray:
    s = sh9(normals) @ c
    return np.maximum(s, 0.05 * max(1e-6, float(np.percentile(s, 95))))


def _any_hit(O: np.ndarray, D: np.ndarray, tris: np.ndarray, tmin: float, chunk: int = 384) -> np.ndarray:
    """For each ray (origin O, direction D) whether it hits any triangle (Moller-Trumbore), in chunks."""
    v0, e1, e2 = tris[:, 0].astype(np.float32), (tris[:, 1] - tris[:, 0]).astype(np.float32), (tris[:, 2] - tris[:, 0]).astype(np.float32)
    out = np.zeros(len(O), dtype=bool)
    for s in range(0, len(O), chunk):
        o, d = O[s:s + chunk, None, :].astype(np.float32), D[s:s + chunk, None, :].astype(np.float32)
        p = np.cross(d, e2[None])
        det = (e1[None] * p).sum(-1)
        ok = np.abs(det) > 1e-9
        inv = np.where(ok, 1.0 / np.where(ok, det, 1), 0)
        t = o - v0[None]
        u = (t * p).sum(-1) * inv
        q = np.cross(t, e1[None])
        v = (d * q).sum(-1) * inv
        tt = (e2[None] * q).sum(-1) * inv
        out[s:s + chunk] = (ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (tt > tmin)).any(1)
    return out


def occlusion(P: np.ndarray, T: np.ndarray, N: np.ndarray, samples: int = 32, scale: float | None = None) -> np.ndarray:
    """Per-vertex ambient occlusion over the mesh itself: the share of cosine-weighted hemisphere rays that escape."""
    scale = scale or float(np.linalg.norm(P.max(0) - P.min(0)))
    k = np.arange(samples) + 0.5
    r, phi = np.sqrt(k / samples), k * 2.399963
    local = np.stack([r * np.cos(phi), r * np.sin(phi), np.sqrt(1 - r * r)], -1)  # cosine-weighted, +z up
    up = np.where(np.abs(N[:, 2:3]) < 0.9, np.array([[0, 0, 1.0]]), np.array([[1.0, 0, 0]]))
    tx = np.cross(up, N)
    tx /= np.maximum(1e-9, np.linalg.norm(tx, axis=1, keepdims=True))
    ty = np.cross(N, tx)
    D = (local[None, :, 0:1] * tx[:, None] + local[None, :, 1:2] * ty[:, None] + local[None, :, 2:3] * N[:, None]).reshape(-1, 3)
    O = np.repeat(P + N * scale * 2e-3, samples, axis=0)
    hit = _any_hit(O, D, P[T], tmin=scale * 1e-3)
    return 1 - hit.reshape(len(P), samples).mean(1)


def visibility(P: np.ndarray, T: np.ndarray, N: np.ndarray, light: np.ndarray, scale: float | None = None) -> np.ndarray:
    """Per-vertex 1 if the point sees the light direction (no cast shadow), else 0."""
    scale = scale or float(np.linalg.norm(P.max(0) - P.min(0)))
    D = np.repeat(light[None, :] / np.linalg.norm(light), len(P), axis=0)
    return (~_any_hit(P + N * scale * 2e-3, D, P[T], tmin=scale * 1e-3)).astype(np.float64)


def light_model(normals: np.ndarray, ao: np.ndarray, vis: np.ndarray, light: np.ndarray) -> np.ndarray:
    """Design matrix: AO-weighted SH9 plus the key light's shadowed Lambert term."""
    lam = np.maximum(0, normals @ (light / np.linalg.norm(light)))
    return np.concatenate([sh9(normals) * ao[:, None], (vis * lam)[:, None]], axis=1)


def fit_light(lum: np.ndarray, normals: np.ndarray, ao: np.ndarray, vis_fn) -> tuple[np.ndarray, np.ndarray]:
    """Two passes: SH9 gives the key light's direction; then the occlusion-aware model is fitted.
    vis_fn(light) returns per-sample cast-shadow visibility. Returns (coefficients, light direction)."""
    c0 = fit_shading(lum, normals)
    light = np.array([c0[3], c0[1], c0[2]])
    if np.linalg.norm(light) < 1e-9:
        light = np.array([0.0, 0.0, 1.0])
    light = light / np.linalg.norm(light)
    # a portrait's key is in front of the face; a direction behind it means rim light or sheen fooled the first pass
    if light[2] < 0.25:
        light[2] = 0.25
        light = light / np.linalg.norm(light)
    c = _irls(light_model(normals, ao, vis_fn(light), light), lum)
    if c[-1] < 0:
        # a negative key is not physical (the key adds light): the occlusion-weighted SH alone explains the face
        c = np.append(_irls(sh9(normals) * ao[:, None], lum), 0.0)
    return c, light
