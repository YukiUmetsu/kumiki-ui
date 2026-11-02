# Epic Book — photographic PBR material provenance

All twelve textures in this directory are locally bundled CC0 material maps
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
| `paper_edges_*` | [Book Encyclopedia Set 01](https://polyhaven.com/a/book_encyclopedia_set_01) — John Malcolm | 1K JPG paper diffuse, OpenGL normal and roughness | Original unmodified 1K channels from photographed encyclopedia page edges; mapped to the epic book's cut fore/head/tail edges only, not used to copy the encyclopedia's geometry or text. Source MD5: `7798b8e38721a4fc1ed45319ecc81b67`, `816a51a0b6520cf5e08751089722fc46`, `b8e5b8431b0c53b20d83ec0bcff51747` |

The maps are used as PBR albedo, normal and roughness inputs by the Epic Book
Storytelling WebGL demo; they do not replace the original code-authored page
engraving or soundtrack. They are fixed local files, decoded before the first
video frame for deterministic seeks. `createBookHero3D` preserves its no-DOM
procedural fallback for standalone unit tests and other non-browser clients.

The r10 cut-edge maps preserve the scanned paper-fibre layering and are
oriented to follow the thickness of the actual instanced textblock. They are
not suitable as a printable flat page texture.

The photo-texture adaptation is a material upgrade, **not** evidence of path-
traced photographic realism. Real lens depth of field, GI, subsurface page
transmission, natural joint deformation and human color-grade approval remain
separate requirements.
