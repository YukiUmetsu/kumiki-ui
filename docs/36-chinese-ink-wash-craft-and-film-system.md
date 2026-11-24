# Chinese ink — craft study and film direction

**Reviewed:** 2026-11-14  
**Roadmap:** [35 — Material-native film styles](35-material-native-film-styles-implementation-roadmap.md)  
**Implementation:** [INK-FILM1](component-specs/chinese-ink-film.md) (films, scenes, figures) on [INK-RISO1](component-specs/ink-riso-press.md) (brush marks).

## 1. Reference study and evidence limits

Reference material was used to study *technique and motion*, not to copy scenes, drawings, camera shots, copyrighted footage, or text. Pages, supplied descriptions/timecodes and accessible study imagery were inspected; do not claim that each hosted streaming video was watched in full at normal speed. The actual Kumiki MP4 requires separate playback QA.

| Real-world source | Technique / footage worth studying | Generalized design decision |
|---|---|---|
| [Asian Art Museum: Chinese brush-painting techniques](https://education.aamstage.org/resources/an-introduction-to-chinese-brushpainting-techniques/) | Upright versus oblique brush, fast versus slow motion, loaded tip, dry flying-white | Expose brush orientation, \`tipInk\`, \`drag\`, pressure/width and varying opacity *inside* the stroke; never treat it as a postprocess |
| [Asian Art Museum: brushstrokes, paper and size](https://education.asianart.org/wp-content/uploads/sites/6/2019/09/Brushstrokes.pdf) | Wet unsized versus more controlled sized paper; brushwork as a shape-making language | Style presets have distinct paper absorption; no identically blurred brush preset |
| [Oriental Art Supply: ink loading/shades demonstration](https://www.youtube.com/watch?v=WWAS9JHKWPU) | Tonal loading and dilution while a mark is deposited | Five tones and cross-brush tip loading; wash has lower core opacity, dark accents hold structure |
| [BlueHeronArts: Yao Jurong painting a landscape](https://www.youtube.com/watch?v=VTsQ83IlkEU) | Mountain mass, water, foreground detail painted in a deliberate sequence | Defer intricate dark accents until the broad diluted landscape is established; allow quiet holds |
| [Basic rock and mountain painting: Gou / Cun / Ran / Dian](https://www.youtube.com/watch?v=REFx8Vi1Te8) | Outline, rock texture, wash, structural dots | Separate \`axe-cut\`, \`hemp-fiber\` and \`moss-dot\` local rock marks |
| [Jingxi Huangcaoliang: axe-cut landscape](https://www.youtube.com/watch?v=dNcPi7TK-n8) | Broad side-brush structural rock gestures and depth staging | Angle-specific rock texture, different spatial density and treatment by distance |
| [Inkston: bamboo in the Mustard Seed Garden tradition](https://www.inkston.com/stories/mustard-seed-garden/4gentlemen-bamboo/) | Leaf grouping and five shades | Avoid repeated X/star leaf silhouettes; varied branch length, overlap, density, orientation |
| [Christie's: Zhang Daqian's lotus demonstration](https://www.christies.com/en/stories/capturing-light-and-shadow-moving-images-of-zhang-7b44c0edfeb1469b8f6909402451324c) | Large wet gestures and purposeful material application | Favor a finite set of confident strokes, not thousands of animated particle dots |
| [National Palace Museum: Traveling Through Brush and Ink](https://www.taiwanplus.com/shows/documentary/arts/368/traveling-through-brush-and-ink) | Camera travels through painting and negative space | Handscroll camera motion and layer parallax independent from paint deposition |
| [The Herd Boy's Flute: ink animation cinematography study](https://doi.org/10.1080/17508061.2026.2749963) | Painted layers moving under an animation camera and sustained washes | Use fixed painted layers + camera/characters rather than re-simulating a whole raster every frame |

**Licensing:** The linked demonstrations are references, not reusable assets. The in-repo mountain photograph used for the generic proof is an existing licensed asset; see the repository's third-party asset manifest.

**Acting and motion:** [ink animation: acting, brushcraft and production](research/ink-animation-acting-and-visual-language.md). **Four masters:** [plum, orchid, bamboo, chrysanthemum study](research/chinese-ink-four-masters-reference-study-2026-11-15.md).

## 2. Material direction: what must be true

Chinese ink painting is not monochrome film grading. An authentic stylized shot has *a source of marks*, local tonal contrast and paper behavior.

- **Upright brush (中鋒 / 中锋):** balanced tapered contour, strong tip, distinct pressure at the beginning and the release.
- **Oblique/side brush (側鋒 / 侧锋):** uneven broad contact and dark pigment on one side, lighter toward the other; helpful for slopes, leaves and expressive rocks.
- **Flying white (飛白 / 飞白):** coherent bristle-direction gaps when dragged quickly with little moisture. Scattered point noise alone is not this technique.
- **Moist wash:** pale, broad color; the capillary fringe spreads into absorbent paper while a stronger local core remains identifiable. Avoid a uniform gaussian blur applied to a finished illustration.
- **Rock construction:** outline → axe cut or hemp fiber texture → diluted wash → structural dark dots. The four methods occupy different *regions and layers*, not a flat all-over surface texture.
- **Bamboo:** joints and leaves obey the branch and gravity; strong asymmetry, reserved air and changes in tone across front/back branches.
- **Negative space (留白):** white is a subject: mist, water, sky, passage between hills, reading room. Do not fill it with algorithmic noise.
- **Cinnabar seal:** a sparse ending accent. Do not turn every slide into multiple decorative red labels.

## 3. Recipes for different genres

| Video need | Composition | What the ink does |
|---|---|---|
| Landscape or travel | `inkPeaksScene`, `inkRiverScene`, `inkTownScene`, `inkAutumnScene`, `inkSnowScene` | Pale water first (`develop`), mist between the planes, a slow camera, one seal |
| Story or character | One figure of the cast, or a small one from behind in a landscape | The figure paints itself, then only breathes and blinks; wind in hair and ribbons |
| Poem or title | Few strong strokes and much paper; `inkLettering` down the page | Letters written in order, the seal pressed last, a long hold |
| Science or history explainer | Captions on paper, `arrow`, `underline`, `tick`, `enso` beside the drawing | Each mark painted as it is named |
| A place or thing with a photograph | `inkPicture` of an owned or licensed photograph | Developed from the palest tone to the darkest |
| Season or weather | A swarm of petals, leaves, rain or snow before or behind the hero | Constant and quiet, faded near words |
| Change of time or place | `mist`, `flood`, `scroll` between shots; `fan` or `leaf` mounts | One kind of transition per film, two at most |

## 4. Questions before it is called done

1. Is the paper still the largest thing in the picture?
2. Can you tell wet from dry, and the darkest stroke from the palest?
3. Is there one hero, and does the eye reach it first?
4. Does everything that moves move for a reason (wind, water, breath, wings)?
5. Is every caption on bare paper, in both formats, for long enough to read?
6. Does the film end on a held picture?
7. Have you watched it at normal speed, not only as stills?
