# Travel Study 3D — Visual Craft & Verification

Part of [Premium Everyday 3D / PR #51](https://github.com/YukiUmetsu/kumiki-ui/pull/51). Original geometry and original printed illustrations, inspired by the supplied travel-workspace photograph. The design is a handcrafted miniature set intended for video motion and interactive inspection, **not** a photogrammetric reconstruction or a claim of literal photographic realism.

## The composed room

![Travel Study, wide shot at film frame 90](assets/everyday-3d/travel-study-scene-90.png)

[Watch the verified five-second Travel Study film](assets/everyday-3d/travel-study.mp4) (960 × 540, 30 fps).

The original photograph's strongest visual hierarchy—large archival atlas, dense personal travel imagery, amber brass, dark walnut, worn leather—is reflected in a small, reusable collection. The laptop is the existing model; every other principal object is newly constructed. Four matted picture prints, two original illustrated travel posters, a catenary of thirteen glowing festoon bulbs, joined walnut shelves with individually bound books and ceramic vessels surround the desk. The chair was shifted toward the right foreground after wide-shot QA to reveal the laptop screen and the desktop cluster.

## Object craftsmanship

| Isolated render | Modeling and material evidence |
|---|---|
| ![Chestnut chair](assets/everyday-3d/travel-study-chair-front.png) | Deep chestnut, pebbled leather and piping; separately shaped seat and back; saddle stitches; bentwood arms; five-spoke castors and iron height piston |
| ![Framed atlas](assets/everyday-3d/travel-study-world-map-front.png) | Accurate Natural Earth coast and country paths; 15° graticule; route pins; compass; two-stage matte paper/wood framing with brass inset and physical fasteners |
| ![Spinning globe](assets/everyday-3d/travel-study-globe-front.png) | Textured geography on a 96-segment sphere; independently rotating inclined spindle; 23.5° tilt; graduated brass meridian and turned wooden base |
| ![Matted travel picture](assets/everyday-3d/travel-study-photograph-front.png) | Original painterly landscape, silver-grain halation, thick mount, handwritten-style caption, four pins and metal spring clip |
| ![Original travel poster](assets/everyday-3d/travel-study-poster-front.png) | Original period letterpress title, illustrated mountain silhouettes, color-separated inks, grain, wooden frame, brass corner tacks and hanging stud |
| ![Bound books](assets/everyday-3d/travel-study-book-stack-detail.png) | Four imperfectly stacked cloth-bound volumes with deckle-edged page blocks, gilt spine bands, fabric endbands and a separate strapped leather journal |
| ![Analog clock](assets/everyday-3d/travel-study-clock-front.png) | Brushed nickel body, enamel dial with sixty graduations and twelve numerals, independent hand pivots, winding crown and little easel feet |
| ![Desk lamp](assets/everyday-3d/travel-study-desk-lamp-detail.png) | Lathed brushed-brass conical shade with internal enamel reflector; raised base; paired mechanical arms and pivot knuckles; springs, insulated cable and warm local light |

The heritage desk itself is a **standalone stage-set option**, not a replacement for the modern desk: four solid-wood legs, apron joinery, drawers, reveals, brass pulls, edge-rounded 160 × 80 cm top and a saddle-stitched leather desk mat.

## Reusability and film behavior

- `createTravelStudyObject(kind, options)` returns a self-contained, disposable `HeroAsset` with part names, materials and construction notes. Eight kinds are available: `chair`, `world-map`, `globe`, `photograph`, `travel-poster`, `book-stack`, `clock`, `desk-lamp`.
- `createStageSet("desk", { deskStyle: "heritage" })` exposes the desk alone; `createStageSet("travel-study")` supplies the room and named object slots.
- `recipeId: "travel-study"` composes the existing laptop and objects with separate 16:9 and 9:16 camera paths. Seeking is absolute-frame: two globes turn, the articulated lamp adjusts, the clock hands advance, and the laptop opens, with consistent results after backward seeks.
- The geometry and drawings load locally, with no runtime network fetch. Natural Earth's public-domain 1:110m geographic paths are reproduced from `scripts/import-travel-geography.mjs`; the source and usage terms are recorded in `assets/THIRD_PARTY_ASSETS.json`.

## Review notes

Browser review uses Storybook's WebGL capture, not mock raster artwork. Isolated object images above are actual 3D screenshots at independent azimuths; the globe and clock frames are independently seekable. The renderer preserves part-level material variation, but small text and microstitches naturally reduce in a 960 × 540 wide film frame. The photographs/posters are original illustrations rather than the exact user-supplied photos. Camera, mug, ivy and miniatures are not modeled. The repository's separate `hero:quality` check still has **zero owner-approved 3D assets**; this work should remain draft until the owner signs off the intended aesthetic.

### Observed automated verification

- Chromium capture checked that frame 90 differs from the starting frame and reproduces **identical WebGL pixels** after seeking backward and returning. Front and detail screenshots for each of the eight object families rendered without error. The split existing-object gallery also passed. One extra repeated gallery run stalled in browser UI startup; a fresh rerun passed, so a real-browser retry can still be needed in resource-constrained environments.
- TypeScript (`npm run typecheck`), changed-source ESLint, catalog check (**371 entries / 797 stories**), registry validation (**201 entries**) and focused unit tests (**29/29**) passed. The full unit suite was also green earlier in this branch (**2,185 tests**), before the final palette and staging refinement.
- The **entire** `travel-study-capture` film exported through the production FFmpeg pipeline, then independently decoded via `ffprobe`: **150/150 frames, 960 × 540, 30/1 fps, 5.000 seconds**, 1,064,841 bytes. SHA-256: `bb254df1bfcd828914c0aff51ebcecb92a4eb584472c273187edbe855f3c20e5`. The exporter used absolute-frame seeking and streamed PNG frames without retaining an intermediate image sequence.

