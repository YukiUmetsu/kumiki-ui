# Place-Shaped Image Reveal Scene

`place-shaped-image-reveal` introduces a place by its outline, fills the outline with
photographs taken there, and holds the place name and context beside it. Supply a
`SceneTemplateSpec<"place-shaped-image-reveal">`. The caller owns playback and supplies
`frame`; the component creates no clock.

**Causal beat.** *Input:* a licensed boundary in its geographic context. *Transform:*
the camera locates the place while its outline traces on, then photographs spread
inside the outline from the spot where the first one was taken. *Output:* the
silhouette holds the imagery, each photograph pinned to where it was taken, beside
the name and a line of context.

**Beats.** `cueFrames` are *dock*, *reveal* and *resolve*.

- **Locate (0 → dock):** a wide, place-centred map with context coastlines and a
  graticule. A pulsing locator finds the place; the camera pushes in to the final
  framing while the outline traces on. The eyebrow is on screen from the first frame,
  and the name rises word by word about a third of the way to dock.
- **Flood (dock):** imagery spreads radially inside the outline from the first
  photograph's coordinates (or the centre). The silhouette lifts off the map with a
  soft shadow, the rim turns from accent glow to a warm paper edge, and the context map
  recedes. The composite disclosure appears.
- **Reveal:** the context line lands. Each photograph's pin and caption appear while it
  is on screen.
- **Resolve:** the sequence continues to the last photograph and holds.

Photographs share the time from dock to the end evenly and dissolve over 18 frames.

**Inputs.** All visible copy is an input, so localized scenes need no code change.

| field | purpose |
|---|---|
| `name` | display title; a name without spaces (including CJK) is fitted to one line |
| `eyebrow` | short kicker, e.g. a region |
| `context` | one line held from the reveal |
| `boundary` | `{ rings, source, licenseRef? }`: outer rings of `[longitude, latitude]` |
| `imagery` | 1–6 `{ image, caption?, latitude?, longitude? }`, shown in order |
| `compositeNote` | **required** disclosure, e.g. "Photographs taken in X, framed by its outline. Not an aerial view." |
| `credit` | optional source line shown verbatim |
| `projection` | orthographic centre; default is the boundary's spherical centroid |
| `mapContext` | `"coastlines"` (default) or `"none"` |
| `locateZoom` | opening scale relative to the final framing, 0.1–1 (default 0.3) |
| `look` | `grain`, `vignette` 0–1 |

**Geography.** The boundary is drawn in an orthographic projection centred on the
place. For a region of this size, that azimuthal view keeps the shape true. Validation
rejects a boundary spreading more than 60° from its projection centre, where the
silhouette would visibly distort. Context coastlines are Natural Earth 1:110m
(`land-outline-110m.ts`) through the same projection. Rings overlapping the
boundary are omitted, so the place is not drawn twice. The graticule spacing scales with the place.
Pins are projected from each photograph's coordinates through the same camera, so
they stay attached through the push. The pure geometry is `placeSilhouette()` in
`registry/video/place-silhouette.ts`.

**Honesty.** The composite is a window, not an aerial or satellite view, and
`compositeNote` is mandatory. Pins state where a photograph was taken; they do not
claim the photograph shows the whole country. Boundary geometry is caller-supplied
and must carry its own licence; a country outline is a cartographic choice, not a
political statement by this component.

**Typography and safety.** Type resolves against the stage container. The name is
14.6% of the short side in 16:9 (15% in 9:16, less for long CJK names, which are
capped so they never break inside the word). Context is about 3.9%, and the eyebrow,
disclosure and pin captions are 2.5–2.9%. In landscape the silhouette owns the left 58% and copy the right
third. In portrait the silhouette sits in the upper band and copy below it. Reduced
motion removes the push, locator, Ken Burns drift, dissolves and grain drift, and
cuts each beat in on its frame. `renderAsset` can supply video for any image. A host
`renderOverlay` is called for the `"stage"` space with the shared beat timing.

**Verification performed.** Storybook frames 0–287 were seeked and screenshotted in
16:9 and 9:16, in English and Japanese, and in reduced motion. A rendered-bounds check
found no text–text overlaps, no text outside the stage, no copy over the silhouette,
and no text below 2.3% of the short side. `annotationFraming` confirms the photograph
pins stay inside both frames (test). Human visual review at normal speed remains open.

Storybook: **Video production / Scene Templates / Place Shaped Image Reveal**, with a
`language` control (English / Japanese). The demo uses the Natural Earth 1:10m Admin 0
outline of Iceland (public domain, simplified to 1,468 points) and three CC0 photographs from
Wikimedia Commons:
[Seljalandsfoss](https://commons.wikimedia.org/wiki/File:Seljalandsfoss_Waterfall.jpg)
by Robert Lukeman,
[Jökulsárlón](https://commons.wikimedia.org/wiki/File:J%C3%B6kuls%C3%A1rl%C3%B3n_glaciers_(Unsplash).jpg)
by Jeremy Goldberg, and
[Dynjandi](https://commons.wikimedia.org/wiki/File:Dynjandi_Waterfall,_Iceland_(53752508267).jpg)
by Mustang Joe. The demo has no audio. Pin coordinates are the published locations of
the named landmarks, not EXIF data from the photographs.
