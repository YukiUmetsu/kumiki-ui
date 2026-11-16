# Rendered skies and volumetric clouds (SKY1) — research, 2026-11-16

The owner said cumulus had improved but the other genera needed much more detail. Before this, every non-cumulus genus
was a flat SVG construction:
- stratocumulus as rows of balls;
- stratus and altostratus as grey bands;
- cumulonimbus as a plate over a cumulus.

This round renders all ten genera as volumes of cloud water or ice under a physical atmosphere, on the CPU.

Grades:
- **reported:** quoted from the source;
- **measured:** from data in the repository;
- **estimated:** chosen within what the sources support.

## The atmosphere

| What | Value | Grade | Source |
| --- | --- | --- | --- |
| Rayleigh scattering at sea level | (5.802, 13.558, 33.1) × 10⁻⁶ m⁻¹; scale height 8 km | reported | Hillaire 2020 (production constants) |
| Mie aerosol | Extinction from visibility (Koschmieder 3.912 ÷ V), scale height 1.2 km, g 0.8, albedo 0.9 | reported (method), estimated (albedo) | Koschmieder; Hillaire 2020 |
| Ozone absorption | (0.650, 1.881, 0.085) × 10⁻⁶ m⁻¹ at its peak, a tent around 25 km | reported | Hillaire 2020 |
| Multiple scattering in the clear sky | A fill of 15–30% (more in blue) | estimated | Single scattering alone is too dark in blue |

**Check.** With the sun at 40°:
- light from the clear sky on the ground is 13% of the direct sun's (clear days are about 10–20%);
- the low sun reddens strongly;
- the sky overhead is blue (blue ÷ red 2.8 with the sun at 30°).

## The genera

| What | Value | Grade | Source |
| --- | --- | --- | --- |
| Extinction from water | σ = 3·LWC ÷ (2·ρ·r_e) | reported | Stephens 1978; the standard optical-thickness relation |
| Effective radii | Sc 5.3, As 7.0, Ns 10.8, St 11.2, Cu congestus 10.5 µm | reported | Hansen 1971, via a NOAA chart |
| Water contents and thicknesses | Ci 0.035 g/m³ ice over 1.6 km … Cb 1.2 g/m³ | estimated | Within textbook ranges; Ns is thickest optically, as ISCCP finds |
| Element widths | Cc < 1°, Ac 1–5°, Sc > 5° at 30° up | reported | WMO International Cloud Atlas (already in sky-data.ts) |
| Billow rows | Fastest-growing Kelvin–Helmholtz wave ≈ 7 × the shear layer's depth; billows observed at about 10 × | reported | Smyth (theory); observations reviewed |
| Cirrus fall streaks | Crystals fall at about the same speed through a wind that changes with height: a parabola for a linear shear (the hook of uncinus) | reported | Atmospheric Optics (fallstreaks); Cirrus cloud |
| 22° and 46° halos | Minimum deviation through 60° and 90° ice prisms (21.8° and 45.7° for n 1.31); red inside, blue outside; no refracted light inside the ring | reported | Halo references (Atmospheric Optics; Encyclopédie de l'environnement) |
| Mammatus | Lobes 1–3 km across, about 0.5 km deep, lasting about 10 minutes | reported | Schultz et al. 2006, *Monthly Weather Review* (review) |
| Multiple scattering in cloud | Octaves of weaker extinction and softer phase | reported (method) | Wrenninge, Kulla & Lundqvist 2013 |
| Diffuse light through a thick deck | 1 ÷ (1 + 0.75 τ (1 − g)) | reported (method) | Two-stream approximation |

## What changed in review

| Defect | Fix |
| --- | --- |
| No cumulus at all | Rank-normalised coverage map: a threshold of 1 − cover covers exactly that share |
| Orange and black speckles in the lower half of every frame | A variable name collision (the screen's y shadowed the sun's elevation sine) made the diffuse light negative |
| Overcast ground blown to white; horizon dark under cloud | Exposure from the light that actually reaches the ground; air under cloud lit by the light diffusing through |
| A grey sheet across the whole storm | The overshooting top lacked its radius test |
| The sun visible through nimbostratus | The march stopped at 0.4% transmittance, and the sun's radiance still showed; past the cut-off it is opaque |
| The anvil shading the tower; anvil streaming away from the camera | Wind convention fixed (90° = to the right); storm preset with the sun opposite the anvil |
| Distant cumulus as hard fragments | Steps that grow with distance, level of detail beyond 26 km, two rays per pixel near the horizon |
| Altostratus hiding the sun | Thinner water content: the sun shows as through ground glass |

## Limits

- Coverage maps and most thicknesses are estimated.
- The anvil still reads a little like a plate.
- Distant cumulus alias at small sizes.
- A 320 × 180 frame takes 1–2 s.
- No human visual review yet.
