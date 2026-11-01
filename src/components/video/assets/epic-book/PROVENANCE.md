# Epic Book — photographic PBR material provenance

All nine textures in this directory are locally bundled, optimized derivatives
of [Poly Haven](https://polyhaven.com/) **CC0 1.0** assets. Commercial use,
modification and source redistribution are permitted without attribution under
[Poly Haven's license](https://polyhaven.com/license). Attribution is recorded
for reproducibility and appreciation. No preview images or site branding are
included. Rights reviewed **2026-11-01**.

| Files (color, OpenGL normal, roughness) | Original asset and author | Original download size | Changes |
| --- | --- | --- | --- |
| `leather_red_02_*` | [Leather Red 02](https://polyhaven.com/a/leather_red_02) — Rob Tuytel | 2K JPG maps | Downscaled to max 1536 px, JPEG quality 86; original `coll1` is the albedo color variant |
| `wood_table_001_*` | [Wood Table 001](https://polyhaven.com/a/wood_table_001) — Dimitrios Savva (photography), Rico Cilliers (processing) | 2K JPG maps | Downscaled to max 1536 px, JPEG quality 86 |
| `brown_leather_*` | [Brown Leather](https://polyhaven.com/a/brown_leather) — Rob Tuytel | 1K JPG maps | Re-encoded JPEG quality 86; source `albedo` channel |

The maps are used as PBR albedo, normal and roughness inputs by the Epic Book
Storytelling WebGL demo; they do not replace the original code-authored page
engraving or soundtrack. They are fixed local files, decoded before the first
video frame for deterministic seeks. `createBookHero3D` preserves its no-DOM
procedural fallback for standalone unit tests and other non-browser clients.

The photo-texture adaptation is a material upgrade, **not** evidence of path-
traced photographic realism. Real lens depth of field, GI, subsurface page
transmission, natural joint deformation and human color-grade approval remain
separate requirements.
