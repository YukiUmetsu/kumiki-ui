# Product Hero Reveal

A single scene at **Video production / Scene Templates / Product Hero Reveal**.
Status: implemented with actual 1080p landscape/portrait footage and mixed sound.
Technical MP4 QA passed; human visual/audio approval is pending. Desktop MCP
was unreachable, so generation used the installed Blender CLI in separate processes.

`ProductHeroRevealScene` composes an authored product film and an editorial hero
hold through the existing `ClipPlacement`, `ClipFrameAdapter` and
`FrameAccurateClip`. It owns no clock and has no Blender dependency at runtime.
Install `product-hero-reveal`; import from
`components/video/recipes/product-hero-reveal`.

Required inputs: `clip`, `adapter`, absolute `frame`, rational `fps`, output
`width`/`height`, `title`, accessible `description` and `copyAtFrame` inside the
clip. Optional `eyebrow`, `subtitle`, `copyFadeFrames` (18 by default),
`reducedMotion`, forwarded div props/ref, `className` and `style`. Editorial copy
is kept separate from the media, retains line breaks and wraps without ellipses.
Supply a hero hold with empty upper-left reading space. Portrait requires its
own authored clip at the matching aspect; the component rejects a blind crop.
Reduced motion samples the last supplied frame, with settled copy.

Customize typography and color with `--km-product-font`, `--km-product-ink`,
`--km-product-muted`, `--km-product-accent`, `--km-product-background`, and
`--km-product-copy-shade` (the negative-fill gradient behind the editorial region).
A consumer can supply clips from Blender, real footage or another renderer;
no particular product, model, brand, palette, generator or runtime account is
required. Missing/inexact source frames report the existing decoder error.

## Original example and authoring

`scripts/blender/product-hero.py` builds an original, hypothetical unbranded
speaker: separate walnut cheeks, powder-coated enclosure, real hexagonal grille
openings, a knurled brass dial, hardware, rubber feet and rear sockets. No external
model or texture is downloaded. Its source geometry is illustrative original
industrial design, not a claimed replica or performance measurement.

The native Blender timeline is the authoring source: 300 frames at 30 fps.
Blender frame 1 maps to output frame 0. Camera cuts at native frames 85 and 196
lead from dial detail to surface construction and a full-product hero. The
indicator's activation anchors an original designed sound at output frame 209.
The existing `audio-visual-cue` manifest mixes separate activation/motif stems;
no new mix engine or independent browser clock is introduced.

Run background Blender in a **new revision directory**:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/blender/product-hero.py -- --output .review/product-hero/my-revision --long-edge 1920 --animation
```

Add `--portrait` for an independently framed 1080×1920 film. Without `--animation`
the script saves a `.blend` and renders one look frame. Maximum long edge is 1920;
existing source revisions are not overwritten. Animation status and artifacts
are local to the supplied output directory. Camera/material/object data stays
editable in `product-hero.blend`.

Build the original activation sound from the saved event metadata:

```sh
node scripts/build-product-hero-audio.mjs .review/product-hero/my-revision/source.json .review/product-hero/my-revision/audio
```

## Playback, outputs and evidence

`renderMedia` is an optional continuous-preview slot. The host must drive `frame`
from that media's current time and pause/seek it for reduced motion. Omit the
slot for frame-verified export through the supplied adapter. The Storybook
preview uses one native video/audio clock; exported canvases decode exact frames
and mix the separate WAV once. Repeatedly seeking a paused decoder on every
preview tick was observed to stall; native playback fixed that. A three-second
sample decoded 92 frames with zero dropped frames. That is a measured sample,
not a performance guarantee on every device.

Editable native projects are committed at
`assets/models/product-hero/{product-hero,product-hero-portrait}.blend`. Their
output paths are project-relative and separated by aspect. Generated PNG frames
stay outside Git. Source media, original sound, cues and SHA256 provenance live
in `src/video/assets/product-hero/`; these binaries are demo inputs and are not
copied by the UTF-8 registry installer. The asset-specific MIT notice is
`assets/models/product-hero/LICENSE.txt`.

The saved Blender metadata supplies FPS, duration, source size and activation
frame to the demo. Landscape source was generated from `a0d6e98`, portrait from
`ec5b0bc`; later native-file normalization changed only output paths. Native
frame 1 is source frame 0. Camera cuts remain baked in the supplied clip.

Final compositions: `dist/product-hero-r04/landscape.mp4` and
`dist/product-hero-r04/portrait-ja.mp4`, each 300 frames, 30 fps, 10 seconds,
with mixed audio. Both passed the skill's MP4 QA. No black/frozen intervals;
intentional silence before activation and after the decaying tail is flagged
for listening. Human playback, audio-only and phone-scale acceptance remain open.
Rendered text bounds and Blender-projected product bounds were checked separately;
detailed receipts and reproducible commands are in docs/23's execution log.
The user's existing desktop Blender project was not changed.
