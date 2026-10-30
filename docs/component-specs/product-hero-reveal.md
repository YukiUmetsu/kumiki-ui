# Product Hero Reveal

A single scene at **Video production / Scene Templates / Product Hero Reveal**.
Status: implementation checkpoint; native Blender footage is rendering. Do not
interpret this checkpoint as completed video, artistic approval or a live Blender
MCP connection.

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
`--km-product-muted`, `--km-product-accent`, `--km-product-background`.
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

The desktop Blender add-on was unreachable. A separate installed Blender 5.2.3
LTS process successfully generated real look renders; the user's open project
was not changed. Detailed render/QA evidence will be appended to docs/23 after
actual exports finish. Human visual/audio playback review remains pending.
