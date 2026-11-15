# Crayon and Oil-Pastel Animation: Film and Craft Reference Study

Status: original reference-derived implementation study, 2026-11-14.
Research method: public filmmaker/artist production notes, film listings and
accessible documented frame stills; **not** an undocumented claim of watching
every minute of every film. References are for craft analysis only; no
copyrighted textures, screenshots or film frames are copied into Kumiki.

## Film / technique comparison

| Film or production | Verified primary reference and technique | Transferable craft decision | What Kumiki was missing |
| --- | --- | --- | --- |
| **Alisi Telengut — *Tears of Inge* (2013)** | [National Screen Institute](https://nsi-canada.ca/film/tears-of-inge/), [film page](https://alisitelengut.com/filter/experimental-animation/Tears-of-Inge-2013): hand-painted oil pastel on one physical surface, each new frame modified on top of the last | Keep the paper and spatial composition coherent; change deposits in meaningful local areas and retain traces | Wax texture had a fixed seed across hundreds of moving frames |
| **Alisi Telengut — *The Fourfold* (2020)** | [Official film (Vimeo)](https://vimeo.com/722066469), [Concordia University](https://www.concordia.ca/finearts/about/galleries-venues/fofa-gallery/exhibitions/2021/alisi-telengut.html), [Animate Materials Workshop demo](https://www.animatematerials.org/workshops/demo-alisi-telenguts-oil-pastel-animation-method/): under-camera paint, plants, found-object relief and buildup across shots; demo made at a preferred **8 fps** | Hold physically distinct paintings for several 30-fps film frames, not unique random noise each display refresh; use composited props for believable surfaces | No medium-specific exposure period, and no independent wax redrawing |
| **Hannah Jacobs — *It's OK* (2014)** | [Creative Review interview](https://www.creativereview.co.uk/hannah-jacobs-animator-illustrator/), [music-video discussion](https://directorsnotes.com/2014/12/04/hannah-jacobs-tom-rosenthal/): digitally illustrated frame-by-frame, around **12 drawings per second**, hand-colored textural look | Emphasize attitude, figure gesture and held poses over camera shake; use readable line art and strong silhouette | Existing rigs were mostly rotations of unchanging vector parts |
| **Gotye / Gina Thorstensen and Nacho Rodríguez (2012)** | [Artists' production interview](https://heisthewallrus.wordpress.com/the-wall-nuts-interview-with-gina-nacho-giving-video-coming-soon/): 122 crayon-painted traveling sequence frames were printed, redrawn and scanned; a dark character was physically cut out as a hole against a starry sheet | Distinguish special transparent cutouts from *solid*, wax-covered characters; change the entire silhouette on selected exposures | Kumiki recently corrected transparent creatures but lacked silhouette redraws |
| **Daphna Awadish — *Bear With Me* (2018)** | [Director interview at Skwigly](https://www.skwigly.co.uk/showcase/bear-with-me/): printed live-action video frames painted over with hand oil pastels | Preserve character-level identity and continuity when moving against a different background medium; vary hand-painted coverage but not all pixels | Identical texture projected across any pose lacked handwork |
| **Clara Elia — Oil Pastel Frame-by-Frame Animation (2025)** | [Artist-uploaded Vimeo film](https://vimeo.com/1130878764): each frame described as a unique oil-pastel-on-paper painting | Permit discrete pigment redraws without resetting the underpainting; allow intentionally rough edges | Lacked redraw strength and exposure cadence controls |
| **Alisi Telengut — *Nutag – Homeland* (2016)** | [Concordia University artist interview](https://www.concordia.ca/cunews/main/stories/2016/04/04/concordians-visual-poem-is-off-to-cannes-alisi-telengut-short-nutag-homeland.html): accumulated and removed pastel on a single sheet, irreversible frame-to-frame material transformations | Keep a *persistent* paper substrate and visible wax history; avoid independent frame-wide procedural grain | Atmosphere/character surfaces were all treated uniformly |

## Frame-to-frame material and animation principles

### 1. Separate three sources of motion

- **Pose / silhouette motion**: head, wing, jaw and limb actually change
  geometry on selected exposures. Original outlines and internal ribs must
  remain anatomically correlated.
- **Pigment reworking**: partial wax deposits are revised on every held
  exposure, keeping position near the previous deposits. Paper fiber and
  opaque silhouette remain fixed in local drawing coordinates.
- **Cinematography**: camera movement is independent and frame-accurate.
  It must not generate fake wax flicker from changing arbitrary noise.

### 2. Exposure timing

References range from Telengut's documented 8 fps demo to Hannah Jacobs'
12 hand illustrations/second. Kumiki still exports **30 fps**, but can
hold original wax-redraw exposures for 2, 3, 4, 5 or 6 output frames. The
default 3-frame hold corresponds to roughly **10 hand-painted exposures/s**.
This is a creative parameter, not a claim that the source artists use it.

An exposure must be repeatable under direct seeks. The same frame must
always produce the same wax. Adjacent film frames in a single held exposure
keep identical local pigment. The next exposure changes only a few
local dabs; no random movement of the background or character silhouette.

### 3. Wax edge craft

Traditional crayon makes broken nib deposits and variable pressure at
boundaries. A smooth, uniform SVG outline reads like a digital sticker.
Draw several subtle offset, discontinuous wax deposits around *opaque*
silhouettes, keeping the underlying silhouette solid and its contacts
stable. Do not cut transparent holes in torsos, faces or buildings.
Unchanged geometry and stable paper fibers should remain readable.

### 4. Deformation and continuity

One-piece affine rotation flattens wing membranes even when wing ribs
animate. Keyframe alternative hand-drawn paths for each membrane shape:
extended, tensioned, relaxed and tucked. Redraw the matching primary ribs
in the same exposure. Allow overlapping wing/body color to occlude
correctly; compare frames at 138, 155, 182, 227, 272 and 312.

Neck arch changes must be subtle enough to preserve the dragon's identity
and not separate the head, cheek scales, horns or jaw from its rig parent.
This iteration demonstrates **explicit silhouette substitutions**, not
physical mesh deformation or procedural skinning.

### 5. Review motion, not only stills

Every material-native style must produce an actual encoded video:
- 30-fps, codec-probed MP4, with real frame content and stable aspect.
- Extract an early and a late source frame from that MP4.
- Browser-test frame seeking / repeatability / outline and rib synchronization.
- Inspect a sequence or contact sheet for temporal boil and unwanted popping,
  plus the complete film at **normal speed** before declaring artistic approval.

A short **48-frame / 1.6-second encoded PR smoke** uses
`examples/film/crayon-painted-exposure-preview.film.json`, offset to fox
art from source frames 269–316. This proves the video production path on
each crayon PR without expensively rendering every 14-second film.

The existing on-demand full 14-second / two-aspect
`.github/workflows/crayon-browser-qa.yml` workflow remains available
through GitHub Actions `workflow_dispatch`, using 420 frames each.
Passing the short smoke alone does **not** mean that the whole film or
a human artistic review is complete.

## Implementation crosswalk, 2026-11-14

| Previously identified gap | Concrete work | Verification | Still missing |
| --- | --- | --- | --- |
| Wax never redrawn after paint completion | `crayon-exposure.ts`: 14 deterministic short dabs, held-exposure sampler; `WaxRegion` overpaint only | Unit and Chromium same-seek/adjacent-exposure tests | Full physical accumulation, smudging and pigment erosion |
| Rigid creature movement | Dragon near/far wing membrane redraws, synchronized near-wing ribs and re-arched neck | Across-frame tests at 138/182/227/272 and two aspect ratios | True wing membrane skinning; grounded quadruped IK |
| Uniform SVG edge | Two displaced, discontinuous wax-nib traces along existing outlines, only when fully painted | Undercoat remains opaque; frayed rim present after deposition | Resculpted boundary silhouette from scanned nibs |
| No moving film proof | 48-frame original FilmDocument, ffmpeg/ffprobe and extracted MP4 frames in PR CI | Encoded stream audit and visual artifact | Full 11/14-second manual two-aspect encoded films and human evaluation |
| Style not configurable | `redrawStrength` and `exposureFrames` Storybook Controls; independent original hand-redraw story | Storybook browser QA | Generalized compositor for all media recipes |

## Future art-direction priorities

1. **Anatomy beyond affine animation**: IK for all four dragon paws,
   heel/metatarsal/toe contacts, wing wrists and articulated primary
   membrane skin. Current exposed skeleton is too schematic at closeups.
2. **Acquired real wax nibs with documented redistribution licenses**:
   scanning strokes at variable pressure/direction, not stealing artists'
   stills. Derive film-native texture maps and test against scalar geometry.
3. **Real pigment state**: pressure-driven wax height, layering and scrapes
   tied to stable local space. Actual strokes should not get repeatedly
   repositioned every exposure.
4. **Organic scene staging**: more differentiated clouds, organic foliage
   and architectural handwork; reduce empty or mechanically symmetric
   negative spaces.
5. **Formal full-film acceptance**: view encoded MP4 at native dimensions,
   check temporal boiling, visual continuity and paper jitter with a
   frame-by-frame QA report signed by an artist.

## Copyright and honesty

All visuals remain originally authored for Kumiki. This study references
public film pages and production interviews rather than redistributing
third-party frames, textures or audio. An image on a public website does
not imply permission for extraction or commercial reuse.
