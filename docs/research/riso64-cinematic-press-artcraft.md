# RISO64 — source-native two-drum cinematic print journey

**Status:** an original digital Risograph-inspired cinematic film, **not** a real physical press scan or an ink spectral simulation. This extends the merged RISO62/RISO63 art and workflow; no anatomy, hand or character work.

## Authentic reference deconstruction

- [Système Sensible real press print macro](https://www.systemesensible.fr/imprimerie_riso.html): uncoated, visibly fibrous paper; irregular edges along printed fields; two flat spot colours building nuanced overlaps. We use the *material relationship*, not their copyrighted design, and keep original vector strokes and pressure maps.
- [DRUK, Risograph print detail](https://www.druk.london/gallery): close-up of two interwoven screen and spot layers; at macro scale, the tonal dots occupy and leave recognisable substrate, not a uniform translucent RGB filter.
- [MICA image preparation and real printing](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/2d-prototyping-studio/riso-image-making-and-printing/): separate stencil master per ink, irregular registration, paper-feed direction and paper absorption, plus imperfect roller impression.
- [Marriott Library risograph press recommendations](https://lib.utah.edu/collections/book-arts/risograph.php): broad ink solids create uneven coverage, and ink density and paper grain require physical calibration.
- [Risolana printing and registration](https://www.risolana.org/printing): spot masters overprint, with trapping to avoid edge gaps and grain-touch vs screen-covered microstructures.
  
These references motivated **five beats** (close paper fibers, establish cobalt first master, release vermilion second master, inspect overprint at macro, return to completely printed sheet). No image has been scraped, copied or embedded.

## Source fidelity and temporal topology

- This film reuses **exactly** the existing 20 RISO62 original cubic brush gestures, 19 witness marks per master, nine red micro echoes, authentic source-space paper-open channel topology, 450 paper fibres and 330 sheet pores. Two independent cobalt/vermilion RisoPrint drum layers keep their own clip paths and registration. No 3D mesh proxy, raster sheet, CSS RGB halftone, foreignObject, image filter, or altered source gradient.
- `RisoBrushArt.printFrame` (default **239**) controls the *existing* native `RisoPrint` drum reveal. Default remains fully printed for all RISO62 and RISO63 stories and existing consumers. Source-frame and actual press progress are now intentionally separate. In the two press-transfer beats, original stroke geometry freezes while the two real print masters pass beneath the drum's fixed paper-tooth mask: ink doesn't crawl across a finished page.
- A reusable pure function `evaluateRisoCinematic(beat,localFrame,reducedMotion)` defines ALL temporal values. The sole master timeline is FilmStage's 24 FPS, not a hand-written accumulating animation clock; Storybook's Play button is only an interaction adapter.
- A bounded `risoCinematicCamera` computes a paper-space transform and clamps both translations: **never expose the empty stage around the sheet**. Moving the camera does not resample or simplify any original ink paths, colour separations, original scribbles or microscopic pores. No interpolation of text points; full-sheet text returns unobstructed in the final hold. Camera and original physical sheet share a single transform.
- Reduced motion bypasses all five moving beats and displays a complete, full-sheet stationary printed artwork, with both inks fully deposited and the original source locked to its authored rest pose.

| Source beat | Duration | Press state | Camera / rationale |
| --- | ---: | --- | --- |
| cobalt-macro | 48f / 2.0s | cobalt printed; red absent | extreme 3.8×→2.4× crop travels over existing paper-open cobalt micro-fibre |
| cobalt-pullback | 52f / 2.17s | first master still fully printed | 2.4×→1× reveals its entire original layout and header |
| vermilion-pass | 74f / 3.08s | 105→228 press frame on original RisoPrint two-drum sequencer | second drum reveals red ink onto unchanged cobalt, 1–1.08× breathing |
| overprint-macro | 48f / 2.0s | complete two-master print | 1×→3.1× magnifies the actual mixed-colour/negative-space intersection |
| original-hold | 66f / 2.75s | complete final print | 3.1×→1× then 1s stationary full-sheet hold; ultra-subtle final source motion |

**Total:** 288 frames, 12.000 seconds, 24fps, native landscape 960×540 and portrait 540×960. Cinematic cuts are the existing FilmStage recipe; no additional compositor.

## Art and release constraints

- Do not crossfade ink itself to simulate registration. A press reveals deposited **physical** spot master masks; the physical overprint is naturally darker where masters intersect. Source paper and registration are stationary within the original sheet even when camera moves.
- At 1×, fine dry fibres should still register as distinct irregular cutouts. At 3×, their winding physical paper-white topology should become visibly legible without synthetic blur. Witness marks and microtype are original—not repainted for each angle.
- The new Cinematic Journey is in the existing **Video production → Film Looks → Risograph** Storybook folder. It presents both video outputs, actual FilmStage Play/Pause, nonlinear seeking, five beat navigation and reduced motion. It must produce exactly the same render as the portable JSON and production `loadFilmSlots` resolver.
- Tests: exact portable JSON match; full 288-frame compile; framewise finite and paper-bounded camera; no discontinuities at first/second pass, red/drum, macro-to-final camera cuts; true source geometry unchanged; two masters and evenodd stock; real browser capture at five critical shots in both aspects; reduced-motion static and exact rewind; FFmpeg real MP4 both outputs. **Generated video is still subject to visual review**. One full frame verification does not prove perceptual artistry or physical press fidelity.

## Reproduce real production video

```bash
npm run film:check -- examples/film/riso-cinematic-two-plate.film.json --format=json
npm run film:review -- examples/film/riso-cinematic-two-plate.film.json --only=landscape --out=dist/riso64-review
npm run film:render -- examples/film/riso-cinematic-two-plate.film.json --out=dist/riso64-production
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate,nb_frames -of json dist/riso64-production/landscape.mp4
```

No audio is in the portable film; do not claim sound effects, narration or music. No physical plate scans, pressproof measurements, print stock colorimetry or sublicensed external reference art are bundled.
