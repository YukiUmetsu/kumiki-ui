# Finance Hero 3D Assets + Crafted 3D Hero Toolkit

**Registry items:** `crafted-3d-hero` (domain-agnostic toolkit) · `domain-finance-hero-3d` (assets).
`domain-finance-objects-3d` depends on both: kinds with a crafted asset render through it automatically.
**Status:** development implementation; rendered views inspected by the implementing agent (see
[verification](../verification/2026-10-19-finance-hero-3d.md)). **Not** human-approved photoreal —
`finance-object-review.ts` statuses are unchanged.

## Use it

Existing API — no change needed. These kinds now render crafted hero assets with a product studio,
bounds-correct framing and a per-asset exposure:

```tsx
<FinanceObject3D spec={{ id: "market-up", kind: "bull-market" }} frame={frame} width={1920} height={1080} />
<FinanceObject3D spec={{ id: "market-down", kind: "bear-market" }} finish="natural" frame={frame} width={1080} height={1920} />
// Force the older procedural model: createFinanceObjectScene3D(spec, { hero: false })
```

| Finance kind(s) | Hero asset | Variant |
|---|---|---|
| `bull-market` / `bear-market` | sculpted bull / bear | `finish`: `"aged-bronze"` (statue on granite plinth, default) or `"natural"` (living coat, wet eyes, no plinth) |
| `cash-stack`, `banknote`, `dollar` | banded bundles + loose notes / single note | `dollar` uses `$` and "Dollars" on the original note design |
| `coin`, `coins`, `interest` | proof coins (stack, leaning, flat) | count varies |
| `gold-bars` (new kind) | cast bar pyramid | — |
| `money-bag` | cinched sack, rope, stencil decal, spilled coins | — |
| `credit-card`, `debit-card`, `gift-card` | ISO ID-1 card(s) | palette/tier per kind; debit/gift are single cards |
| `bank`, `bank-branch`, `investment-bank` | neoclassical bank | frieze inscription varies |

Direct use in any Three.js scene or with the standalone viewer:

```tsx
import { createFinanceHeroAsset } from "./components/domains/finance-hero-3d";
import { HeroAssetViewer } from "./components/craft/hero-viewer";
const create = useCallback(() => createFinanceHeroAsset("money-bag", { symbol: "€", coins: 6 }), []);
<HeroAssetViewer createAsset={create} width={1080} height={1080} azimuth={20 + frame * .2} elevation={12} zoom={1.1} />
// Or: scene.add(asset.group); camera targets: asset.parts.get("card-primary-emv-contact-plate"); asset.dispose() when done.
```

`HeroAssetViewer` props are plain numbers (azimuth, elevation, zoom, target, fov), so turntables and
push-ins are driven by the caller's absolute frame clock. Every asset exposes `bounds` (authored, available
before render), named `parts`, `exposure`, studio hints and `craft` notes.

## Toolkit (`crafted-3d-hero`) — reusable for any domain

| Module | What it gives you |
|---|---|
| `sdf-sculpt` | Signed-distance sculpting (ellipsoid, tapered `roundCone`, `chain`, `roundBox` with taper, torus; smooth union/subtract, `mirrorZ`, `displace`, `bounded`) meshed by projected surface nets with a hierarchical narrow band; analytic normals; baked occlusion + Laplacian curvature; `shadingShape` so patina follows anatomy, not fine relief; memoized `meshSdfCached`. |
| `surface-detail` | `applySurfaceDetail(material, { kind })`: shader micro-relief for UV-less meshes (cast metal, stone, fur strands, paper, brushed, hammered, glaze, fabric) via derivative bump with pixel-frequency fade, roughness/albedo modulation, per-vertex roughness/metalness. |
| `sculpt-finish` | Aged bronze (patina in recesses, polished wear on ridges, faint verdigris in tight cavities), polished bronze, gold, chrome, graphite, clay, glazed ceramic, natural (sheen). |
| `sculpt-anatomy` | `seatEye` (ray-march an eye onto any head surface), almond eyelid patches meshed at fine resolution, painted eyeballs with fibrils, limbal ring and horizontal/round/vertical pupils under a wet cornea or as incised bronze. |
| `canvas-texture` | Seeded painted textures, Sobel height→normal maps, `paintWithRelief` (print + tactile relief from one painter); 2×2 neutral fallback without canvas (tests). |
| `hero-studio` | HDR softbox environment (half-float, generated), seamless cyclorama with light pool, bounds-fitted soft key shadow, rim/fill, contact-occlusion blob, five palettes. |

## Craft notes (doc 14 §7)

| Asset | Made of / proving details | Closest intended shot | Intentional simplifications |
|---|---|---|---|
| Bull | One sculpted hide: crest, scapula, thigh masses, flank tuck, rib relief; brow ridges, seated almond-lidded eyes with horizontal pupils, carved nostrils, ringed elliptical horn bases; carpus/fetlock/hock landmarks, cloven hooves, tufted tail. Bronze: patina/wear from curvature+occlusion; natural: coat, keratin horns, wet nose. | Head ¾ close-up | Original heroic maquette proportions; hide is sculpted relief, no hair cards. |
| Bear | Hump, haunches, hanging belly; cupped high ears, forehead stop, short broad muzzle, round-pupil eyes; raised swiping paw; five curved claws per paw; strand-like fur locks. | Head ¾ close-up | Body still slightly long/low; claws thin at close range (next iteration). |
| Cash / note | Original guilloche, rosettes, hatched facade medallion, watermark window, windowed thread with microtext, seal, serials, SPECIMEN line; intaglio relief from the print; stratified bundle edges with per-sheet misalignment; kraft straps; curled notes. | Medium ¾ | No real currency artwork; flat-print colors approximate intaglio ink. |
| Coins | Lathe body, raised rim, 140 reeds cut in geometry, bead ring, curved legend, laurel, temple/numeral devices; satin field vs frosted relief via roughness map. | Macro of top coin | Relief is a normal map, not displaced geometry. |
| Gold bars | SDF-cast trapezoid with mould radii, struck cartouche recess, stamped text (normal map), hammered micro-surface. | Medium ¾ | One shared geometry for all bars. |
| Money bag | Sagging sculpted sack, gather folds, hourglass cinch, ruffled flared top, twisted three-ply rope with knot and frayed unequal ends seated on the cloth; woven micro-relief; projected stencil decal; spilled coins. | Neck close-up | Opening interior is shallow. |
| Cards | ISO ID-1 with 3.18 mm radius, beveled edge showing white core; raised EMV plate with separated pads; foil via metalness mask; contactless mark; back: magstripe, signature panel, iridescent hologram; brushed-metal variant. | Medium overhead ¾ | No embossing; last-four only. |
| Bank | Three-step stylobate; lathe columns (attic base, entasis, 20 cut flutes, echinus, abacus); three-fascia architrave; carved frieze; instanced dentils; pediment with recessed tympanum and medallion; ashlar cella with world-space UVs; paneled bronze doors, transom grille; open bronze lanterns with warm glass. | Medium front ¾ | No interior; roof is simple slabs. |

**Cost (CPU, Node 24, Apple Silicon, cold):** bull ≈1.8 s, bear ≈1.8 s, money bag ≈1.8 s, gold ≈0.2 s;
remounts reuse memoized meshes. Bull ≈100k vertices incl. eyelid patches. **GPU frame time was not measured.**

## Safety and licensing

Every design is original and anonymous: no real currency artwork, portraits, issuer, refiner or card-network
marks, valid serial formats or full card numbers. No downloaded models, textures or HDRs; no new dependencies
(`DecalGeometry`/`RoundedBoxGeometry` ship with the pinned `three`).
