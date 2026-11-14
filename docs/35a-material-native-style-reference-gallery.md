# 35A — Material-native visual reference gallery

**Date verified:** 2026-11-13  
**Parent roadmap:** [35 — Material-native film styles](35-material-native-film-styles-implementation-roadmap.md)  
**Purpose:** provide a *playable reference film, directly linked full-quality MP4, and still-image previews for every visual style in the roadmap*, with specific motion/material study points and separate real-world technique references. **These are study references, not files bundled with Kumiki or approved production assets.**

## How to use this board

1. Open the linked **film + four stills** for a style, play the film at normal speed, and inspect the listed frame checkpoints; use the downloadable MP4 only if actually necessary and permitted. The frame times are **gallery still positions to inspect, not claims that we personally reviewed those precise frames or verified full playback**.
2. Identify **what makes the medium itself distinctive** (geometry, surface, texture, layering, light), how it moves (cadence/acceleration), the camera rules, and at least one native transition tied to the material. Record what must *not* be imitated: story, characters, signature shots, branding, music, and text.
3. Before implementation, add an **independent real-world/artistic-process reference** wherever material authenticity matters. The Lemo demos alone are authored simulations and must not be taken as evidence of physical accuracy.
4. Produce an original neutral fixture using Kumiki's existing film pipeline. Compare opening/active/peak/resolved stages, then inspect the **encoded video in motion**, not only screenshots. Use actual exported frame evidence; do not assert visual acceptance without watching.
5. Keep reference images linked remotely, not copied to the repository or packaged. **A visible image or downloadable MP4 is not a redistribution license.** Record provenance and permissions if a future task requires local copies or commercial production reuse.

**Source and attribution:** Linked demo films/stills are from [Lemo-Opuscar by Lemomo (LemoLab)](https://github.com/lemomo-ai/lemo-opuscar), credited as [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) for Lemo-authored film/still content, subject to third-party exceptions listed in [their license](https://github.com/lemomo-ai/lemo-opuscar/blob/main/LICENSE) and each film's credits. Images here are unmodified remote previews; these links are for studying visual principles. Lemo's Markdown documents are not generally licensed for republication in this commercial library.

## Verified film and still references

Every style page below has **an embedded video and four clickable timecoded stills**. The separate MP4 links were cross-checked against the public GitHub `films` release assets on the verification date. The thumbnail URLs resolve through the gallery's published still-link pattern; they are **not vendored**. If a remote thumbnail stops loading, the linked style page remains the primary reference.

### Printmaking & image materials

| Preview | Style and reference media | Reference checkpoints | What to inspect / reproduce independently |
| --- | --- | --- | --- |
| [![Risograph print reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/risograph/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/risograph/) | **Risograph print** (PRs 1–3) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/risograph/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/risograph.mp4) | 00:06, 00:15, 00:24, 00:32 | Separate spot-ink plates; overprint, misregistration, dot/ink-paper texture; plate-onset timing |
| [![Woodcut relief print reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/woodcut/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/woodcut/) | **Woodcut relief print** (later extension) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/woodcut/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/woodcut.mp4) | 00:08, 00:22, 00:35, 00:47 | Carved negative spaces, raised black ink, directional hatch density and knife-cut emergence |
| [![Ukiyo-e / handscroll reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/ukiyoe/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/ukiyoe/) | **Ukiyo-e / handscroll** (later extension) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/ukiyoe/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/ukiyoe.mp4) | 00:07, 00:16, 00:26, 00:36 | Stable layered prints, key-block line, colour registration, deliberately flat depth and horizontal scroll camera |
| [![Impasto oil paint reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/impasto/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/impasto/) | **Impasto oil paint** (future material) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/impasto/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/impasto.mp4) | 00:06, 00:15, 00:23, 00:32 | Raised knife strokes, raking highlights, paint thickness; moving paint must not boil when static |

### Painting & illustration

| Preview | Style and reference media | Reference checkpoints | What to inspect / reproduce independently |
| --- | --- | --- | --- |
| [![Chinese ink wash reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/ink-wash/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/ink-wash/) | **Chinese ink wash** (PRs 4–5) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/ink-wash/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/ink-wash.mp4) | 00:07, 00:18, 00:28, 00:39 | Wet vs dry strokes, bristle split, reserved white paper, strokes becoming the action; hold/gesture timing |
| [![Watercolour / brush reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/watercolor/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/watercolor/) | **Watercolour / brush** (PRs 6–7) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/watercolor/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/watercolor.mp4) | 00:17, 00:42, 01:07, 01:32 | Translucent layers, pigment spread, dry brush and paper tooth across a moving camera |
| [![Colour-pencil science art reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/colored-pencil/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/colored-pencil/) | **Colour-pencil science art** (later extension) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/colored-pencil/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/colored-pencil.mp4) | 00:06, 00:19, 00:30, 00:41 | Stroke-direction geometry, graphite contour, texture retained during cutaway and zoom |
| [![Crayon storybook reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/crayon-book/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/crayon-book/) | **Crayon storybook** (later extension) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/crayon-book/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/crayon-book.mp4) | 00:08, 00:19, 00:31, 00:42 | Wax resistance, irregular coverage and animated drawing sequences on tactile paper |

### Characters & performance

| Preview | Style and reference media | Reference checkpoints | What to inspect / reproduce independently |
| --- | --- | --- | --- |
| [![Cel animation reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/cel-anime-80s/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/cel-anime-80s/) | **Cel animation** (PR 9) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/cel-anime-80s/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/cel-anime-80s.mp4) | 00:09, 00:22, 00:35, 00:48 | Pose spacing, on-twos character cadence with smooth camera, flat shadow shapes and lip/gaze clarity |
| [![Rubber-hose character acting reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/rubber-hose/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/rubber-hose/) | **Rubber-hose character acting** (PR 10) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/rubber-hose/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/rubber-hose.mp4) | 00:08, 00:18, 00:30, 00:40 | Arc/spline limbs, anticipation, squash and stretch, follow-through, prop-and-character rhythm |
| [![Cross-medium microgame switch reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/microgame/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/microgame/) | **Cross-medium microgame switch** (PR 16 (cross-style)) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/microgame/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/microgame.mp4) | 00:09, 00:22, 00:35, 00:48 | Character silhouette survives a rapid change of materials; independent style changes land on rhythm |

### Paper engineering & puppetry

| Preview | Style and reference media | Reference checkpoints | What to inspect / reproduce independently |
| --- | --- | --- | --- |
| [![Red paper-cut theatre reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/papercut-red/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/papercut-red/) | **Red paper-cut theatre** (PR 11) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/papercut-red/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/papercut-red.mp4) | 00:07, 00:17, 00:29, 00:40 | Physical holes, riveted joints, opaque paper edges, fold/cut/unfold and frame occlusion |
| [![Pop-up book reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/paper-popup/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/paper-popup/) | **Pop-up book** (PR 11 (reuse)) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/paper-popup/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/paper-popup.mp4) | 00:20, 00:49, 01:18, 01:48 | V-fold and box-fold mechanisms, paper-stage depth, physical assembly timing |
| [![Layered paper lightbox reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/paper-lantern/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/paper-lantern/) | **Layered paper lightbox** (PR 11 (extension)) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/paper-lantern/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/paper-lantern.mp4) | 00:08, 00:19, 00:30, 00:41 | Multiple cut-card planes, transmitted lamp light, consistent parallax and shadows |
| [![Shadow puppetry reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/shadow-puppet/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/shadow-puppet/) | **Shadow puppetry** (PR 12) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/shadow-puppet/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/shadow-puppet.mp4) | 00:08, 00:20, 00:32, 00:44 | Translucent dyed-hide optics, lamp hot spots, control rods, pendulum motion and screen contact |

### Scientific observation

| Preview | Style and reference media | Reference checkpoints | What to inspect / reproduce independently |
| --- | --- | --- | --- |
| [![Thermal camera reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/thermal-camera/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/thermal-camera/) | **Thermal camera** (PR 13) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/thermal-camera/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/thermal-camera.mp4) | 00:07, 00:17, 00:30, 00:40 | Material temperature mapping, one calibrated palette/scale, moving scan boundary, spot meters |
| [![LiDAR survey reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/lidar-survey/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/lidar-survey/) | **LiDAR survey** (PR 14) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/lidar-survey/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/lidar-survey.mp4) | 00:06, 00:15, 00:24, 00:32 | Real point density, canopy vs bare earth, scan/reconstruction reveal, location/height provenance |
| [![Security X-ray reference still](https://lemomo-ai.github.io/lemo-opuscar/media/films/security-xray/still-0-640.webp)](https://lemomo-ai.github.io/lemo-opuscar/styles/security-xray/) | **Security X-ray** (PR 14) — [Watch film + 4 stills](https://lemomo-ai.github.io/lemo-opuscar/styles/security-xray/) · [Full video MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/security-xray.mp4) | 00:08, 00:19, 00:31, 00:42 | Layered attenuation/material responses and inspection overlay that must not invent observations |

## Independent real-material / craft references

Use the following to correct stylized assumptions when designing the implementation. These are **reference-only links**, not evidence that underlying footage/artwork can be included in Kumiki or ContentGen exports.

| Medium / component | Primary independent reference | Study objective | Reuse status |
| --- | --- | --- | --- |
| Risograph | [Risolana: how the stencil-based Risograph process works](https://www.risolana.org/printing) and [two-colour plate/registration workflow](https://ressources.technoculture.club/riso/two-colour-prints/what-is-the-workflow-for-a-multi-colour-print) | Distinct paper passes, translucent color mixing, registration errors and trapping | Website reading/reference only; check rights before copying diagrams |
| Chinese ink wash | [Metropolitan Museum: *Ink Art* video interviews](https://www.metmuseum.org/exhibitions/listings/2013/ink-art/video) | Work/artist context; ground brush-medium choices beyond digital filters | Museum page/video: view only; embedded video and images retain original rights |
| Watercolour | [Lemo Watercolor gallery](https://lemomo-ai.github.io/lemo-opuscar/styles/watercolor/) plus on-site observation of actual wet-on-wet/wet-on-dry paint | Pigment spread on wet paper versus crisp marks on dry paper, paper tooth and dried edges | Independent hands-on or separately sourced art-process film is an **open reference task** before Phase 4 |
| Woodcut / ukiyo-e | [Tokyo National Museum — Ukiyo-e printing demonstration (video)](https://www.youtube.com/watch?v=Ej6HRzYarEU) and [Allen Memorial Art Museum — color application video](https://vimeo.com/112820067) | Multiple engraved/printed blocks, registration, baren pressure and print-lift sequence | Educational view only; do not assume a museum video has reusable rights |
| Physical paper-cut | [UNESCO — Chinese paper-cut documentary](https://ich.unesco.org/en/video/1630) | Holes as positive design elements, symmetry, cutting order and sheet thickness | UNESCO attribution to original craft source; no footage reuse assumed |
| Shadow puppetry | [UNESCO — Chinese shadow puppetry (10-minute video)](https://www.youtube.com/watch?v=8-mzqxZNp2g) | Translucent hides, puppet rods and joints, screen proximity, performer cadence | Filmed performance rights retained; reference only |
| Paper engineering | [University of Warwick — pop-up-book mechanisms and videos](https://warwick.ac.uk/fac/sci/wmg/about/outreach/resources/paperengineering/) | V-fold, box fold, pull slider, rotary and flap mechanisms | Reference and engineering study, not permission to redistribute example media |
| Thermal imaging | [FLIR: how thermal cameras work](https://www.flir.com/discover/rd-science/how-do-thermal-cameras-work/) and [FLIR camera radiometry vs. relative heat](https://www.oem.flir.com/learn/discover/choosing-the-right-thermal-imager-for-your-integrated-project/) | Sensor resolution, radiometry, emissivity and why a temperature readout needs calibration | Reading/reference; product images proprietary unless otherwise specified |
| LiDAR | [USGS: visualizing 3DEP LiDAR in QGIS (20-minute training video)](https://www.usgs.gov/media/videos/lesson-10j1-importing-and-visualizing-3dep-point-cloud-data-qgis) | Inspect source point cloud, density/coloring, point-to-terrain camera movement; see **07:25** and **14:44** | The cited USGS video is explicitly marked **Public Domain**; verify each acquired data set separately |
| Security X-ray | [Lemo Security X-ray gallery](https://lemomo-ai.github.io/lemo-opuscar/styles/security-xray/) | Treat stylized console as a motion UI reference only; source actual calibrated attenuation/material data separately | **Independent physics/scan-data reference required** before Phase 7; no fictional sensor readings |

## Required per-style visual evidence packet (before a PR can claim readiness)

Keep a concise proof record in `docs/verification/` (or an existing review mechanism if one already covers it). **Do not create a second review system.** Suggested metadata fields—not a shipped schema:

```json
{
  "styleId": "riso-editorial-v1",
  "referenceSources": [
    {
      "kind": "reference-video",
      "url": "https://lemomo-ai.github.io/lemo-opuscar/styles/risograph/",
      "author": "Lemomo (LemoLab)",
      "usage": "research-only",
      "checkpoints": ["00:06", "00:15", "00:24", "00:32"],
      "observedByReviewer": false,
      "study": ["spot-ink overprint", "registration", "plate reveal"]
    }
  ],
  "originalFixture": "examples/film/<new-neutral-fixture>.film.json",
  "renderEvidence": {
    "landscape": "<path to actual captured frame contact sheet>",
    "portrait": "<path to actual captured frame contact sheet>",
    "normalSpeedVideo": "<path to actual encoded MP4>"
  },
  "humanReview": {
    "status": "not-reviewed",
    "reviewer": null,
    "date": null,
    "issues": []
  }
}
```

**Source data in example is illustrative.** Replace placeholder paths only when files actually exist. A URL being present does **not** make `observedByReviewer` true.

### Visual comparison rubric

| Attribute | Compare from references | What blocks a quality gate |
| --- | --- | --- |
| Silhouette and shapes | Object contour, proportions, negative space, stroke topology, layering | Distinctive silhouette lost, generated generic blobs, wrong joint structure |
| Material microstructure | Tooth/fibre, print dots, pigment edge, stroke ridge, translucency | Looks like a generic full-frame noise/blur filter; texture crawls |
| Color and light | Plate roles, pigment transparency, lamp/sensor response and contrast | Incorrect overprint/illumination; unreadable text; false sensor colors |
| Motion and animation | Cadence, poses, anticipation/action/follow-through, static holds, secondary motion | Jitter, stale joints, foot sliding, frame-dependent state, move without narrative job |
| Camera/edit | Shot scale, tracking, zoom, image-space anchors and transitions | Teleporting subject, broken screen geography, unmotivated transition |
| Sound and rhythm | Diegetic foley, silence, cue peak, voice/music balance | Sound applied to every edit; hits do not land with visible physical events |
| Evidence and rights | Provenance, verified data/units, source licensing, independent authorship | Reused copyrighted demo or unsourced readings presented as data |

**Review loop:** reference research → independent style specification → original fixture → deterministic tests → actual 16:9 + 9:16 frame captures → normal-speed visual/audio review → explicit `accepted` or `needs-revision`. The reference examples are *quality targets to learn from*, not source footage to paste into the resulting film.

## Maintenance

- Every new style in this roadmap **must** add at least **one viewable video reference and one still** (or two stills if no animated reference exists), plus medium-specific study notes, at the time its own implementation PR is opened. For animation/transition styles, a still alone is **insufficient** to approve motion.
- Where authentic physical behavior matters, add a second **independent primary or museum/technical source** before implementing the visual simulation.
- Validate all links and license notes whenever a source URL changes. Keep generated frame evidence (our own original output) separate from external references.
- This board currently provides verified *destinations and the producer's description*, **not a claim that all reference films were watched or frame-by-frame analyzed**. Treat playback review as outstanding until logged explicitly.
