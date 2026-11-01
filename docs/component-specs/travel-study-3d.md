# Travel Study — Reusable 3D Environment & Objects

Status: **implemented geometry and Storybook integration; visual acceptance in progress**. Added to the existing `everyday-3d-scenes` source registry item and to PR #51. An original, warm travel-workspace composition inspired by a user-supplied reference, without reproducing its particular posters or photographs.

## Art direction

The image's visual identity is a *collected lifetime of travel* rather than a generic office: amber practical lighting over scratched dark walnut; a large sepia atlas and pinned imagery behind the table; an imperfect leather chair in the foreground; heavy bound books and analog instruments. Keep the new objects coherent with the existing physical laptop.

| Role | Material / surface | Approximate color | Geometry cues |
|---|---|---|---|
| Grounded furniture | walnut and joined drawer apron | `#4e3323` | rounded edges, drawer reveals, solid brass pulls, visible legs |
| Chair | deep chestnut full-grain leather | `#4b2b20` | curved back, piping, saddle stitches, bentwood arms, five-spoke castors |
| Lamps and instruments | aged brushed brass | `#c6a162` | lathed shade, turned base, machined pin joints, spring and cable |
| Cartography | parchment, faded ink | `#d9c29a` | graticule, precise country/coast boundaries, pins, compass rose |
| Books and travel cards | burgundy/teal cloth, warm ivory paper | `#6e473c`, `#e6d8bd` | revealed page blocks, headbands, gilt spines, tactile photo mounts |
| Warm window/practical | copper amber highlights | `#ffbb70` | restrained local lamp emission + studio area illumination |

### Source and usage

- [Natural Earth 1:110m countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson) — public-domain cartographic source; its [terms](https://www.naturalearthdata.com/about/terms-of-use/) explicitly allow source redistribution. `travel-geography.ts` contains quantized outer rings, reproduced by `scripts/import-travel-geography.mjs`. These geometries intentionally carry **no contemporary geopolitical labels or border claims**.
- [Poly Haven walnut veneer](https://polyhaven.com/a/walnut_veneer), [desk lamp arm](https://polyhaven.com/a/desk_lamp_arm_01) and [vintage armchair](https://polyhaven.com/a/ArmChair_01) — CC0 **research references only**, not downloaded/imported into this implementation.
- Object shapes, original travel art, canvas printing, wood/leather/brass shaders and lamps are built locally from code. The four postcard-like landscape pictures and two letterpress posters are deliberately *illustrated*, not copied travel photos or photogrammetry.

## Object API

```ts
import { createTravelStudyObject } from "./registry/craft/travel-study-3d";
const lamp = createTravelStudyObject("desk-lamp", { color: "#b99752" });
lamp.pose?.({ id: "adjust", frame: 45, fps: 30 });
const globus = createTravelStudyObject("globe", { globeRadius: 12, atlasPalette: "sage" });
globus.pose?.({ id: "spin", frame: 72, fps: 30 });
lamp.dispose(); globus.dispose();
```

| Kind | Physical construction | Configurable parts / actions |
|---|---|---|
| `chair` | padded back/seat, seam piping, bentwood arms, swivel/castors | leather `color`; rest pose |
| `world-map` | framed 146 × 76 cm atlas, gilt inset edge, corner pins | wood `color`, `atlasPalette` |
| `globe` | lacquered sphere, inclined graduated brass meridian, pole spindle, turned stand | `globeRadius` 5–28 cm, `atlasPalette`, `spin` |
| `photograph` | paper mount, original landscape illustration, caption and pin/clip | `photoVariant`: `alpine`, `coast`, `old-town` |
| `travel-poster` | illustrated two-tone landscapes, original letterpress title, inset mat, walnut frame and brass fasteners | `posterVariant`: `summit`, `coastal-route` |
| `book-stack` | four cloth-bound folios and a leather journal | cover `color`; rest pose |
| `clock` | circular enamel face, 60 graduations, separate hands, nickel bezel | casing `color`, `tick` |
| `desk-lamp` | conical spun-brass shade and enamel interior, jointed arms, cable, mechanical springs, bulb, weighted foot | finish `color`, `adjust` |

All dimensions are centimeters with +Y up; the `HeroAsset` contract exposes `metersPerUnit: .01`, independent semantic part names, PBR materials and resource lifetime/disposal. Pose calls restore exact rest transforms before evaluation; no elapsed-time integrator or randomized animation. Globe, clock and lamp action frames are aligned to the film when used in a composed scene.

## Travel-study scene

The existing generic desk remains intact. `createStageSet("desk", {deskStyle:"heritage"})` exposes the standalone joined-wood/drawer version without the room. `createStageSet("travel-study")` adds that heritage desk, a textured plaster wall, walnut shelves stocked with hand-built cloth journals and ceramic vases, a catenary of glowing amber festoon bulbs, and an extended physical floor. New semantic slots position the chair at floor level, both globes, the lamp and book stack on the desk, and the framed world map, four photographs, and two original vintage-inspired posters on the wall.

To author an exportable scene use `recipeId: "travel-study"` in the existing `EverydaySceneSpec` interface. `createEverydayDeskScene` composes the existing laptop and all the new objects, while `evaluateEverydayCamera` provides distinct landscape/portrait film paths. During 150 reference frames the laptop opens, both globes spin at different speeds, the lamp arm adjusts and the clock hands advance.

Storybook: **Video Production → Scene Templates → 3D Everyday Objects**:

- **Object Gallery**: select all eight new object families or the complete heritage stage; adjust finish, lamp/globe/clock action, frame, azimuth, elevation, zoom and lighting.
- **Travel Study**: frame seek, play/pause, lighting presets and aspect switching.
- **Travel Study Capture**: fixed 960 × 540 export, the same WebGL renderer and absolute-frame contract as the other films.

## Constraints and remaining art-direction review

This is *crafted original procedural 3D*. It has detailed construction and genuine geography but is **not a photoreal scanned reconstruction** of the supplied photograph. The postcard and poster imagery are original illustrations; the reference photograph's camera body, mug, ivy and miniature architecture are not included. Very small atlas labels will not read in a 960 × 540 wide shot; use a close-up camera or editable editorial text in a production film. High-quality final signoff requires reviewing both medium/wide and detail renders in Chromium, alternate lighting and the MP4 at normal speed; frame parity alone is not aesthetic proof.
