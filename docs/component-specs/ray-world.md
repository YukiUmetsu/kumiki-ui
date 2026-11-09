# Ray Worlds and Film Gallery

**Registry items:** `ray-world`, `ray-world-water-drop`, `ray-world-terraced-relief`, `ray-world-river-flight`, `film-gallery`
**Source:** `registry/video/ray-world.ts`, `registry/video/ray-world-react.tsx`, `registry/video/ray-world-*.ts`, `registry/video/film-gallery.tsx`
**Stories:** `Video production/Ray Worlds`, `Showcases/Films`

## Purpose

A ray world is a complete cinematic place drawn by one fragment shader. It is for the shots where a recipe or a card cannot make the point: light through water, a material that reads as real, a camera that flies through a place. Each frame averages sub-samples across the shutter, the lens and the pixel, which gives true motion blur, depth of field and antialiasing.

A frame depends only on its time, so any seek order gives the same picture. There is no library and no runtime dependency.

## Worlds

| World | Needs | Length | Use it for |
|---|---|---|---|
| `waterDropWorld` | 3 place photographs, a scanned rock (colour, normal and height maps) and a final photograph | 26 s | Real places seen through water. The drop refracts each picture upside down, and the camera dives through it into that place. The last photograph opens sharp, then focus pulls back to a new drop on a ledge textured from that picture |
| `terracedReliefWorld` | nothing | 22 s | A map or a system as a physical object. A plaster island, a river, an ice sheet |
| `riverFlightWorld` | 1 photograph, for its sky, and its 10 surface maps (`textures`) | 26 s | A journey to a source. One flight up a valley into a glacier, with a rewind |

## Use

```tsx
import { RayWorldStage } from "./components/video/ray-world-react";
import { waterDropWorld } from "./components/video/ray-world-water-drop";

<RayWorldStage world={waterDropWorld} frame={frame} fps={{ num: 30, den: 1 }} images={[first, second, third, rockColour, rockNormal, rockHeight, last]} label="A water drop holding a waterfall, in a glacier cave" />
```

| Prop | Meaning |
|---|---|
| `world` | The world to draw |
| `frame`, `fps` | The picture to draw. A rational frame rate keeps time exact |
| `images` | The pictures from `world.imageSlots`, in order. Each needs a `licenseRef` |
| `textures` | The world's own surface maps from `world.textureSlots`, by uniform name, as URLs your page serves |
| `width`, `height` | Render size. The default is 960 by 540 |
| `samples` | Sub-samples for each frame. Fewer draw faster, with noisier blur |
| `reducedMotion` | Holds the world's poster moment |
| `fallback` | Shown if the world cannot draw. Without it, an alert appears and an export stops |
| `label` | The text alternative. Write what the viewer sees |

`className`, `style`, `ref` and DOM props go to the root element.

## In a film file

A scene can be a world. Titles land, hold still and leave. Moments name frames, so a sound cue lands on an event.

```json
{
  "id": "drop", "recipeId": "ray-world", "durationFrames": 780,
  "content": {
    "world": "water-drop",
    "label": "A water drop holds an upside-down waterfall.",
    "images": [{ "id": "seljalandsfoss", "src": "assets/iceland-large/seljalandsfoss.jpg", "alt": "A waterfall at sunset", "licenseRef": "commons-seljalandsfoss-cc0" }],
    "titles": [{ "id": "ask", "text": "Where does a waterfall begin?", "startFrame": 15, "endFrame": 105 }],
    "moments": [{ "id": "release", "frame": 108 }]
  }
}
```

A sound cue then says `"at": "drop/release"`. See `examples/film/the-drop.film.json`, `river-flight.film.json` and `plaster-valley.film.json`.

`fromSeconds` starts a scene later in the world, so one world can fill several scenes. A world and a `film:render` run at the output size, in 16:9 or 9:16.

The drop is not sculpted. `pendantModes(bond)` solves the Young-Laplace equation for a hanging drop, and it fits the result to the sphere's two lowest shape modes, because refraction magnifies any kink in a surface. At this scale a real drop stays nearly round, and it stretches only in the instant before it lets go. After that it rings in its lowest mode.

## Your own world

A world is data: a GLSL ES 3.00 fragment shader, a pure `state(time, view)` function, and its settings. `rayTrack` gives a keyed camera curve with no clock.

The renderer sets `uT` (time), `uS` (sample index), `uRes`, `uFit`, `uJ` (pixel jitter) and `uL` (lens offset). `uFit` widens the lens on a tall frame. Each key from `state` becomes a uniform. Use `uJ` and `uL` to get antialiasing and depth of field.

Never call `Date.now()` or a random function in a world.

A world can also own photographed surfaces: `textureSlots` names a sampler for each map, with `colour: true` for colour maps (decoded as sRGB; normal maps stay linear). The renderer tiles them with mipmaps and anisotropic filtering, after the film's pictures. The host passes the files as `textures`, and a world with a missing map does not draw (`ray-world-texture`).

## River Flight's surfaces

The river-flight world is shaded with photographed CC0 maps from Poly Haven and ambientCG, kept in `assets/textures/river-flight` and recorded in `assets/THIRD_PARTY_ASSETS.json`:

| Surface | Map | Tile |
|---|---|---|
| Basalt cliffs and rock | Lichen Rock (Rico Cilliers), its orange lichen mostly greyed and darkened to wet volcanic stone | 24 m and 3 m |
| Moss close by | Mossy Rock (Rob Tuytel) | 22 m and 3.2 m |
| Moss and earth farther out | Rocky Terrain 02 (Amal Kumar), a 90 m aerial scan | 70 m |
| Snow | Snow 02 (Rob Tuytel) | 2.5 m |
| Glacier ice: melt scallops | Ice 001 (ambientCG), its cells as relief and brightness, tinted blue | 6 m outside, 1.8 m in the tunnel |

`RIVER_FLIGHT_TEXTURE_FILES` lists the files by uniform; Kumiki's own pages serve them through `src/film/ray-world-textures.ts`.

How it is drawn, and what went wrong on the way:

- **Triplanar, by the slope as a whole.** Each map is sampled from three sides and blended by the surface normal, so cliffs and ground both take it. The weights come from a normal measured over 4 m. The cliff's basalt-column grooves repeat every 3.9 m; a finer normal turned each groove's side toward the side projection and smeared one column of texels down it.
- **Two layers of each photograph.** A 3 m tile of rock is below a pixel from across the valley, so it averages to a flat colour. A large layer (about eight times the tile) carries the cracks and patches that read from afar; the close layer multiplies it by its grain relative to its mean, so it adds texture up close and nothing far away.
- **Mip level from the pixel's footprint**, not from screen derivatives, so the ray-marched surfaces filter the same at every edge and distant slopes do not shimmer.
- **No ground-plane patterns on walls.** A bump or map sampled on the ground plane runs straight down a vertical face as streaks: the old procedural bump and the far moss both did. Both are now triplanar or kept to slopes that face the sky.
- **Directional sky light.** The waterfall's cliff is in shadow (the sun is behind it); light from above and from the open valley lets the stone's relief read in shade.
- **The river** has fine, fast ripples over its slow swell, fading out before they alias, and a milky grey-teal body, as glacial meltwater carries rock flour.

## States

| State | What happens |
|---|---|
| Pending | Pictures decode first, so no frame shows a missing texture. `data-km-shader-fx-status` is `pending` |
| Ready | The frame is drawn, and `data-km-shader-fx-drawn` holds its number |
| Error | An alert names the problem, or `fallback` is shown. `VideoExportStage` stops the export |
| Context lost | The stage goes to `pending`, then rebuilds on a new canvas when the browser restores the context |
| Reduced motion | The stage holds the poster moment |

## Film Gallery

`FilmGallery` is a searchable wall of `FilmCard` elements. A film loads only when a viewer presses play, and it never plays by itself. The search reads titles, summaries and keywords, and all the words must match. Add a caption file to any film with speech.

## Search

Every world is a catalog pack, and each finished film is a catalog entry of type `film`.

```bash
npm run catalog:find -- --query="water drop"
npm run catalog:find -- --query="showcase" --type=film
```

In Storybook, use **Start here → Component Catalog**, and set the level to **Films**. To add a film, add a line to `src/catalog/catalog-films.ts`, and put `<id>.mp4` and `<id>.jpg` in `src/video/assets/film-showcase/`.

## Accessibility

The canvas has `role="img"` and a label. Write a label that says what the picture shows. A film needs captions if it has speech. The film controls are the browser's own.

## Limits

- **Human review is pending.** Nobody has approved the look.
- WebGL2 and a float render target are required. There is no software fallback, and a slow GPU will not play these in real time. Render them.
- `waterDropWorld` moves water with a distortion of still photographs. It is not footage. The film uses 3200 px pictures, so use larger ones above 1080p.
- `riverFlightWorld` is computer graphics, and it looks like it. Procedural terrain does not pass as a real place. When a film must look real, use real aerial footage.
