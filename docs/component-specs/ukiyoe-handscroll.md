# UKIYO1 — ukiyo-e woodblock & emaki handscroll

**Registry pack:** `ukiyoe-handscroll`
**Files:** `registry/video/ukiyoe/`:
- `ukiyoe-core.ts`: noise, eases, keys, entrances, loops, cadence, wind, camera, `scrollPan`, carved lines, colour.
- `ukiyoe-pigments.ts`: pigment roles and presets.
- `ukiyoe-prims.ts`: drawing primitives and patterns.
- `ukiyoe-texture.ts`: washi, wood-grain and baren-mottle PNG tiles.
- `ukiyoe-motifs.ts`
- `ukiyoe-particles.ts`
- `ukiyoe-figure.ts`: Edo figures, including oni.
- `ukiyoe-creatures.ts`: four-legged animals, birds and the dragon.
- `ukiyoe-yokai.ts`: yōkai and ghosts (snow woman, yūrei, umbrella and lantern spirits, soul-flames).
- `ukiyoe-scenery.ts`: mountain ranges, thatched farmhouses, jizō and komainu.
- `ukiyoe-castle.ts`: the castle motif.
- `ukiyoe-town.ts`: the castle-town motifs and the `castleTown()` scene.
- `ukiyoe-interior.ts`: rooms and their furnishings, and the `interiorScene()` recipes.
- `ukiyoe-onna.ts`: the women of the ghost stories (faces, props, the candle crown) and `onnaScene()`.
- `ukiyoe-folk.ts`: folk work, tools and props, and `folkScene()`.
- `ukiyoe-effects.ts`: fire, halo, smoke, lightning, ash and fox-fire effects, and `effectScene()`.
- `ukiyoe-kami.ts`: gods and heavenly beings, the auspicious cloud, and `kamiScene()`.
- `ukiyoe-crowd.ts`: crowds of townsfolk.
- `ukiyoe-scene.ts`: the contract and validation.
- `ukiyoe-react.tsx`: `UkiyoeScene`.
- `ukiyoe-transitions.tsx`: `UkiyoeKasumi`.

**Storybook:** Video Production → Film Looks → Ukiyo-e Handscroll:
- **The Night Ferry (film)**
- **The Peach and the Oni (folktale film)**
- **Folktale bestiary**
- **Printer's proof**
- **Cast & actions**
- **Motif library**
- **Scene JSON editor**

**Showcases:** `src/video/ukiyoe-night-ferry.ts` (six shots, 1770 frames at 30 fps, 16:9 and 9:16) and `src/video/ukiyoe-folktale.ts` (three shots, 1170 frames), `ukiyoe-film.ts` (FD1 film), `ukiyoe-slot.tsx` (FilmStage slots)
**Research:** [reference study](../research/ukiyoe-handscroll-reference-study.md)
**Status:** implemented. The visual review recorded below is the agent's, **not** a human sign-off.

A film look that behaves like the medium. Scenes are printed from a carved key block and colour blocks on washi. The camera unrolls a picture scroll. Edo-period figures act on twos inside one shared wind field.

## Contract

A scene (`UkiyoeSceneSpec`) is JSON-safe: size, duration, seed, `palette` (preset plus role overrides), `paper` (tone, fibre, age), `print` (registration px, mottle, grain, key-line weight), optional `printIn` (print-pass reveal), `mount` (`none` | `print` sheet margin | `scroll` brocade bands), default figure `cadence`, `wind` (base, gusts, turbulence), `camera` (keys, shake, drift) and up to 1500 `nodes`. No clocks, callbacks or remote code. `UkiyoeScene` draws one SVG from the spec and an absolute `frame`. `inspectUkiyoeScene` returns every problem with a JSON path, and the renderer throws on invalid scenes.

Colours are pigment **roles**: `sumi`, `usuzumi`, `ai`, `bero`, `sora`, `asagi`, `kusa`, `matsu`, `ki`, `kincha`, `beni`, `shu`, `tan`, `sakura`, `murasaki`, `cha`, `kogecha`, `gofun`, `hada`, `kin`, `yoru` and `paper`, or a literal `#rrggbb`. The presets are `edo`, `twilight`, `night`, `snow`, `spring`, `autumn` and `aizuri` (the blue print style).

### Print model

- Each colour fill is assigned to one of 8 **impressions** by its lightness (light first, as printers worked). Each impression lands with a fixed seeded **registration** offset against the key line.
- Fills with `grain` show **itame** wood grain. **Baren mottle** is one sheet of paper-coloured blots and specks laid over the printed picture in the paper's plane: invisible on bare paper, uneven pressure on ink. Closing captions and titles sit above it.
- A **washi** skin lies over the finished print, anchored to the scroll so it pans with the paper. `emboss` gives a light karazuri relief.
- **Great-wave idiom.** The `wave` motif follows the print's anatomy, with its silhouette measured from the scan:
  - **Dome.** A broad white dome whose top rolls in soft, uneven bumps, edged in fine indigo.
  - **Column.** A deep-navy column under the crest. Its thin medium-blue (`hanada`) stripes run parallel to the column's front edge, bow back at mid-height and fan from under the crest toward the trough, with thick dark bands between them. Snow-like flecks gather along the stripes.
  - **Lip.** A lace of foam claws, with no smooth contour. Each claw is one thick arm that rises forward from the foam, arcs over and drops into a hook whose tip points back and down, so every claw stretches forward and down with the wave's travel. About a quarter of the claws branch into a second hook at the claw's own scale.
  - **Foam colour.** Claws stand out against the pale-blue impression with a pale tongue inside each curl. All the foam is one connected white with a single outline (claws open into it; nothing is separately outlined), and the indigo line marks only white against blue or sky.
  - **Fuji and sky.** The default `mountain` is the great-wave Fuji. `sky` `style: "horizon"` is bare paper above a grey bokashi.
- **Key-block lines** are filled ribbons that swell and taper (`carvedLine`). Outlines take `print.line` as a weight multiplier.
- `printIn` and the `printProgress` prop reveal the key block first, then each colour impression with a baren sweep. The `proof` prop pulls a proof up to impression *n*.

### Node kinds

| Kind | What it is |
| --- | --- |
| `block` | Any flat printed shape (`d` path, rect, ellipse or polygon). Takes a `fill` (paint or bokashi gradient), key-line width, textile `pattern`, `grain` and `emboss`. |
| `line` | A carved key line through points, with taper and draw-on via `progress`. |
| `group` | A container. Children (figures in a boat, a whole rig of blocks) ride its transform. |
| `motif` | A generated subject: `sky`, `mountain`, `hills`, `sea`, `wave`, `pine`, `sakura`, `willow`, `reeds`, `rock`, `cloud` (band or billow), `sun`, `moon`, `house` (tile, thatch, two storeys, noren, **fukinuki-yatai cutaway**), `pagoda`, `torii`, `bridge` (taiko or trestle), `boat` (ferry, sampan, yakata; the hull sits in a waterline band, `wake` × `progress` adds a bow wave and stern streaks, `sail` adds a mast and square sail), `lantern` (paper or stone; `progress` lights it), `field`, `pier`, `peach` (splits open at `openAt`), `ricefield` (terraced paddies: `crop` `young`, `ripe` or `flooded`, swaying in the wind). |
| `motif` (scenery) | `range`: a mountain range in the Kisokaidō manner. Ridges are stacked in depth (`layers`) with asymmetric peaks and shoulders, shadowed faces, axe-cut rock strokes and ledges, crest cedars and umbrella pines, mist between ranges (`mist`, `mistColor`), `snow` on every upward surface, and an optional `waterfall` from a gorge. `minka`: a thatched farmhouse. `style` is `irimoya` (hip-and-gable, smoke lattice, crossed ridge timbers) or `gassho` (steep, with a gable of stacked windows). It takes `snow` (cap, drip edge, icicles), `smoke` and `light` (glowing paper windows). `jizo`: roadside stone monks in a row (`count`), with a red `bib` and `cap`, a ringed `staff`, `snow` and `moss`. `komainu`: the shrine lion-dog, carved spiral mane and flame tail, mouth open (`a`) or shut (`un`), or a facing `pair`. |
| `motif` (castle) | `castle`: a castle after Meiji-era photographs of Nagoya, Kumamoto and Himeji and Hiroshige's castle views, seen a little from the side (`depth`, default .4). <ul><li>**Keep:** `tiers` storeys (1–6), each narrower, with deep tiled eaves turning up at the corners and shaded side faces. The roof faces carry chidori gables (drawn in front of the storey above) and one curved karahafu, and gold shachihoko stand on the top ridge.</li><li>**Walls:** white plaster, or `style: "black"` boarding below a plaster band, with rows of barred windows.</li><li>**Stone bases:** curving steeper toward the top (the fan slope), with stones in shrinking courses and long-and-short corner blocks.</li><li>**Before the keep** (`walls`): the outer stone wall topped with a long gallery building (`wall: "tamon"`, the default, as on Edo castle) or a plastered, tiled, loopholed wall (`"dobei"`), umbrella `pines` along the bailey behind it, two corner `turrets`, a `gate` tower over studded doors, a `moat` that mirrors the walls, and a `bridge` coming toward us.</li><li>**Stone and roofs:** stones are irregular blocks, each its own shape and tone and largest at the foot. The top roof is hip-and-gable, its big gable on the receding end face.</li><li>**Weather and light:** `snow` lays white on ridges, roofs and eaves, and `night` lights the windows. `walls: false` gives the keep alone for distant views.</li></ul> The motif stands on the foot of the outer wall at the water line; the moat and bridge lie below it. |
| `motif` (town) | Built with the castle's storeys and roofs: <ul><li>`shop`: a merchant's two-storey shop. Indigo `noren` with a white `crest` (generic) sway across the open front, with a lattice and a standing `sign` painted with a gold fan (no writing). Slit mushiko windows sit above and firewalls at the roof ends.</li><li>`kura`: a storehouse. Thick plaster over a base of namako tiles (a white lattice on grey), a heavy roof with a crested gable, an iron-clad window standing open.</li><li>`yashiki`: a samurai residence. A long wall of plaster over black boarding, the gatehouse with lattice windows and studded doors, a tiled cap, `pines` behind.</li><li>`firetower`: a fire-watch tower. Tapering timber legs braced with crosses, a lashed ladder, a railed platform under a little roof, the bell (swinging a touch in the wind) and its mallet.</li></ul> All take `snow`. |
| `particles` | Closed-form weather and effects: `rain` (two Hiroshige line families), `snow`, `embers`, `petals`, `leaves`, `fireflies`, `birds`, `ripples`, `fireworks` (gold rocket trail, rayed stars, peony, willow or ring), `spray` (ballistic burst). |
| `figure` | An articulated Edo figure with a `look` and layered `actions`. |
| `creature` | A folktale animal or spirit (`species`): `fox` (with `tails` 1–9 and `foxfire`), `tanuki` (with `hat` and `bottle`), `dog`, `cat`, `rabbit`, `monkey` (Japanese macaque), `horse` (with `tack`: harness, saddle cloth and pack), `nue` (monkey face, tiger body, snake tail), `crane`, `heron`, `crow`, `pheasant`, `sparrow`, `dragon` (with `pearl`); yōkai `yukionna` (the snow woman; `blow` breathes out the cold, `beckon` reaches), `yurei` (a ghost with soul-flames), `kasaobake` (the one-legged umbrella), `chochinobake` (the grinning lantern), `hitodama` (a soul-flame), `rokurokubi` (`stretch` raises her head on a long swaying neck), `kappa` (`bow` spills the water from its dish; `walk`, `dance`), `tengu` and `karasutengu` (wings, `fly`, and `fan` to raise a gale), `nurikabe` (the wall of the night road: three eyes, `walk`, `roar`), `tsuchigumo` (the earth spider: eight banded legs, `walk`, rears with `roar`). Actions: `walk`, `run`, `fly`, `hop`, `float` (travel to `to`/`toY`), `appear` and `vanish` (fade a spirit in or out; it is unseen before its first `appear` and stays gone after a `vanish`), `sit`, `stand` (upright), `look`, `leap`, `howl`, `drum`, `peck`, `dance`, `coil`, `roar`, `sleep`, `transform` (henge: a smoke puff, after which the creature is gone, so place what it becomes as a new node). |
| `crowd` | Townsfolk filling a strip of road (`width`, `count` 1–80, `rows` 1–4, `rowGap`, `scale`). `mood` is `stroll` (most walk, some stop to look, others talk or bow), `busy` (porters, hurrying walkers), `festival` (dancing, cheering, waving) or `procession` (all walk one way in file). Also `direction`, `frames`, and an optional `cast` of looks (the default is a varied set of Edo townsfolk). It expands into ordinary figures, seeded by the scene seed, so the same crowd is the same people on every frame. |
| `text` | `cartouche` (framed title slip; vertical CJK with the Latin sub set sideways), `caption` (subtitle slip), `seal`, `plain`. `align: "end"` anchors right edges. |

Every node has placement, pivot, parallax `depth` (0 pins it to the frame), visibility window, `enter`/`exit` (`print`, `mist`, `rise`, `sink`, `slide`, `grow`, `unroll`, `stamp`, `fade`), sparse `keys` (x, y, rotate, scale, scaleX, scaleY, opacity, progress), `loops` (`sway`, `bob`, `rock`, `drift`, `flutter`, `breathe`, `spin`, `pulse`, `float`), `cadence`, `flip`, `windScale` and `blend` (`multiply` for dusk washes, `screen` for light).

### Motion

The camera is smooth. `scrollPan` builds right → left handscroll keys that linger at stations. Figures and animated motifs hold drawings on the scene cadence (twos by default). One **wind** field (base + gusts + turbulence) bends pines, willows and reeds, tilts rain, lifts hat brims, blows long hair and headband tails, and swings sleeves and hems, so a gust reads as one event. The `sea` motif can rise with a storm: `rough` (0–1, times the node's progress, so it can be keyed) turns its flat wave lines into rows of travelling swells with sharp crests, shaded troughs and white caps on the biggest crests. `direction` sets which way the sea runs and `drift` sets its pace. The wave lives like a plunging breaker. `progress` raises a blue swell that steepens and then curls; `speed` (px per frame) keeps it moving at an even pace for the whole scene, and `travel` (a fraction of its width) adds a surge with the rise and the break. At `breakAt` the crest leans and throws the lip, which falls over `breakDuration` onto the water ahead of the face. A whitewater roller boils up where it lands, then the wave sinks back to flat water (`settleTo`, default 0) over `settleDuration`, and a few weak foam bubbles drift and pop on the water where it fell (`bubbles`, 0–1). `waveSurface` follows the same water, so riders stay on it.

**Boats and water.** Three pieces keep boats honest:
- **Propulsion.** A `surge` loop pulses a hull's speed with each stroke of the figure `pole` action (same period, 44 frames). The `inQuad`/`outQuad` eases start and stop a heavy hull gently. Loops take `fade` so rocking eases in and out. The showcase helper `poled()` builds matching keys, so the hull is always advancing while the ferryman works and is at rest when he is not.
- **Riding a wave.** `ride: { on: "<wave node id>", amount, tilt, span }` floats a top-level node on a `wave` motif. The water height is sampled on every frame at nine points along the waterline (`waveSurface`), so the node climbs the face as the wave rises, pitches to its slope, and comes down smoothly when it breaks.
- **Boarding.** `walk`/`run` take `via` waypoints. Passengers walk along a pier to a point above their seat, then step down into a boat lying alongside, with the walk cycle tied to the distance covered. Mirror a boat group with `flip` to head left; child x then runs stern → bow.

### Sound

A shot can carry a recorded ambience bed (`sound` on the shot: a looping catalog sound with `gainDb`, and `lowpassHz` for a muffled bed). `ukiyoeFilm` writes it into each scene of the film document with the film's `audio` block, so a render bakes the beds in and crossfades them at the cuts. The Storybook players play the same compiled beds on their frame clock (no low-pass or mastering in the preview). A shot can also carry `layers`: more beds written as film beds over that shot's frames (rain over the storm's wind, crickets under the fireworks). The three films use CC0 field recordings from the catalog: river, stream, mountain wind, heavy rain, surf, distant fireworks and night crickets.

### Figures

Faces can be drawn in profile or three-quarter view. Set `look.view` to `"three-quarter"` for a face turned toward the viewer, as most print faces are: both eyes, the nose a hooked line at the cheek's edge, the mouth toward the cheek. The `face` action turns a profile head to three-quarter (or a three-quarter head to profile) and back, the head narrowing through the swing. Oni keep their profile face. A three-quarter figure's torso turns too, the way prints draw it while the limbs stay in profile: a broader chest with the far shoulder showing, the crossed collar seen from the front as a V (left over right) over the near sleeve, the robe's front panel edge down to the hem, and the obi cord across the front. Its limbs turn as well. The stride's sideways reach foreshortens (× 0.72), the far arm and leg stand back and higher, the near ones forward, and the feet shorten on the diagonal; the walk cycle shortens to match, so the stance foot stays planted. Creatures take `look.view: "three-quarter"` too. Four-legged animals get a body foreshortened to 80%, the far legs set back and higher, and a head turned to us with a shorter muzzle and the far eye showing. Birds get the far leg and wing set back and higher.

Figures and four-legged animals can also be seen square on: `look.view: "front"` or `"back"`. Every action keeps working, because the same pose channels drive the drawing. From the front, a figure shows both eyes and brows, the crossed collar (left over right), the front panel and the obi cord, its legs side by side, and arms that hang at the sides and rise outward to wave or cheer. A praying or cradling forearm folds in to the chest, a punt pole stands upright in both hands, and a bow drops the head. From behind: the back of the hair, the nape (the women's collar pulled low), the obi's knot and the robe's centre seam, with no face. The figure still travels along the road. Animals from the front show the face square on (both ears, both eyes, the muzzle toward us with the nose leather at its tip), the chest ruff and the front legs side by side. From behind: the backs of the ears, the rump with the tail down its middle, and the hind legs. Sitting spreads the haunches at the base, the kyūbi's tails fan out behind it with its foxfire, the drumming tanuki stands upright with its hat and sake bottle, and the nue's snake tail rears over its back. The species that take these views are listed in `UKIYOE_SQUARE_VIEW_SPECIES`. Birds, the dragon and the yōkai stay in profile or three-quarter.

**Look:** `build` (slim / average / stout / child / brute), `hair` (chonmage with shaved pate, shimada with kanzashi, child, bald, long, elder, topknot, wild, hyogo, kamuro, wareshinobu), `upper` (`bare` for a bare torso and arms), `face` (`oni`: glaring eye, heavy brow, fangs) with `horns` 0–2, `hat` (kasa, conical, eboshi, hood, headband), `robe`, `robePattern` (seigaiha, asanoha, ichimatsu, shima, kanoko, kikko, yagasuri, uroko, nami, sakura, tora), `under`, `obi` (taiko knot for shimada and long hair), `coat` (haori), `lower` (robe, tucked over leggings, hakama, loincloth), `feet` (waraji, geta, tabi, bare, koma-geta, okobo), `sleeves` (short or long furisode), `prop` (staff, umbrella, lantern, fan, pole, basket-pole, bundle, fishing-rod, scroll, pipe, kanabo, peach, parasol, maiogi), `accent`, `lips`, `beard`, and the courtesan dress fields `uchikake`, `uchikakePattern`, `lining`, `motif`, `layers`, `obiTie` and `obiPattern` `swords`, `kataginu` and `crest` (see Oiran, Maiko and Samurai below).

### Oiran

The courtesan's dress and procession (`ukiyoe-oiran.ts`) is drawn after the procession prints of Kiyonaga, Eishi and Shunchō, in all four views.

- **Hair.** `hair: "hyogo"` is the hyōgo hairstyle: a pompadour over the brow, translucent lantern side-wings with the comb lines showing, a bun at the nape, two great loops on top bound with a crêpe band, two tortoiseshell combs, a long kōgai bar, and a fan of kanzashi tipped with coral and gold. `hair: "kamuro"` is the child attendant's bob, with a straight fringe, hair cut level at the jaw and a flower pin.
- **Over-robe.** `uchikake` (with `uchikakePattern`) is an unbelted over-robe worn open. Its padded hem (fuki, in the `lining` colour) rolls on the ground and trails behind. The lining shows down the front edges, and chrysanthemum roundels in the `motif` colour (or `"none"`) lie over the pattern. Seen from the front it opens in two flaring panels; from behind it covers the back.
- **Layers and obi.** `layers` lists the colours of the under-robes, outermost first; each shows as a band at the collar and at the hem. `obiTie: "front"` ties the obi in front in a great padded bundle, its ends hanging to the knee, with an `obiPattern` weave.
- **Clogs.** `feet: "koma-geta"` puts her on tall black-lacquered three-toothed clogs, worn bare-foot with a red thong. They raise the whole figure.
- **Parasol.** `prop: "parasol"` is the long-handled procession parasol. Its bearer holds the pole up in both hands, and the canopy leans forward over whoever walks ahead of him.
- **The `dochu` action.** The procession step (soto-hachimonji) travels like `walk`, but very slowly. The free clog lifts, swings out and round (seen from the front) and is set down only a little ahead. The stance leg sweeps at an even rate, so the planted clog stays still, and the hands hold the over-robe closed at the breast.
- **Looks and recipe.** `UKIYOE_OIRAN_LOOKS` holds generic looks for the oiran, kamuro, shinzō, parasol bearer and lantern bearer. `oiranProcession({ id, x, y, scale, start, end, distance, lookBackAt, lookFor, view })` returns the procession as figure nodes, back to front: two kamuro and the lantern bearer ahead, the parasol bearer and the shinzō behind. Everyone keeps her pace. With `lookBackAt`, they all halt while she looks back over her shoulder (mikaeri).

**Actions:** `walk`, `run` and `dochu` (the courtesan's procession step) travel to `to`/`toY` (optionally through `via` waypoints), with phase from distance so feet do not skate, and set facing. The others are `bow`, `wave`, `point`, `talk` (syllable mouth), `look` (incl. `back`), `kneel` (seiza), `pole`, `row`, `brace`, `dance`, `jump`, `turn` (squeeze flip), `cheer`, `startle`, `carry`, `hold`, `sweep` and `pray`. They blend over 6 frames. Blinks are seeded.

Sleeves hang as panels under gravity, slide toward the elbow when an arm rises, and lag behind arm motion (estimated from the pose two frames earlier, so they stay frame-pure).

### Maiko

The maiko's dress and dance (`ukiyoe-maiko.ts`) is drawn after Meiji-era and later photographs and Kuroda Seiki's maiko studies, in all four views.

- **Hair.** `hair: "wareshinobu"` is the apprentice's split bun, its lobes parted over red kanoko silk (the `accent` colour), with full side-wings and a nape bun. The hana-kanzashi at her left temple has strands of tiny flowers that swing with the wind and her motion, and a silver pin sits at the back.
- **Make-up.** With `skin: "gofun"` (white make-up), the back view shows the eri-ashi: two points of bare skin at the nape.
- **Darari obi.** `obiTie: "darari"` is tied high. The knot is a folded loop at the shoulder blades, and the two long ends hang nearly to the hem, each with a woven plum crest. In profile the ends swing out behind her when she moves; from behind they hang side by side. From the front you see the red obiage above the obi and the jewelled clasp (pocchiri) on the cord.
- **Okobo.** `feet: "okobo"` are tall wooden clogs with a sloped toe and a red thong. They raise the figure, and on them `walk` takes short, quick steps. The stance leg sweeps at an even rate, so the planted clog holds still.
- **Dance fan.** `prop: "maiogi"` is the large gold dance fan with a red border. It opens as the arm rises and closes to a slat at rest.
- **The `kyomai` action.** The Kyoto dance cycles four held poses: the fan raised high, the fan before the face, the arms opened with the sleeves hanging, then low and turned in. Each pose is held, then flows into the next with a smoothstep. `amount` scales the tempo.
- **Look.** `UKIYOE_MAIKO_LOOK` is a generic look for her. Storybook **Maiko dance** shows the dance before a gold folding screen (with a View switch) and, below it, her okobo walk, a kneeling bow and the darari from behind.

### Samurai

The swords and formal dress (`ukiyoe-katana.ts`) are drawn after the Met's mounted katana and daishō and after Shunshō's samurai in kamishimo, in all four views.

- **The katana.** The curved blade has its ridge line (shinogi), a frosted wavy temper line (hamon) along the edge, the tip's yokote line and the gold habaki. The guard (tsuba) is seen edge-on in profile. The hilt has a silk diamond wrap over ray skin, a gold collar and a black end cap.
- **Wearing them.** `swords: "katana" | "daisho"` wears them edge-up through the obi at the left hip, in black lacquered scabbards with the cord knob and a hanging cord (`accent` colour).
- **Kamishimo.** `kataginu` (with `crest`) is the kamishimo's stiff, winged vest: in profile the wings stand out past both shoulders; from the front it opens in a V over the collar with a crest on each breast; from behind there is one crest at the nape. Pair it with `lower: "hakama"`.
- **The sword timeline.** The sword follows its own timeline (`swordAt`), so a guard holds after its action ends and every move starts from the last pose.
  - `draw`: the right hand reaches the hilt, the left hand pulls the scabbard back as the blade comes out along it (saya-biki), the blade sweeps down and forward, and it settles in chūdan.
  - `kamae` with `form` chudan, jodan, hasso or waki: the blade turns the short way round.
  - `cut`: a slow raise to jōdan, a fast forward diagonal strike with a pale fan of air behind the blade, the follow-through, and a low hold.
  - `sheathe`: the flick (chiburi), the blade brought to the scabbard's mouth, the slow slide home, and the hands letting go.
- **Hands.** Both hands are put on the hilt by two-bone IK (`reachArm`) in every guard. The square views project the profile placement: a blade pointing ahead is foreshortened, and hassō moves to the right shoulder, clear of the face.
- **Duels.** A `cut` can take `aim` (a point in the figure's own frame), `contact` (the frame it reaches it) and `parried`. A `parry` takes the same `aim` and `contact`.
  - **Contact:** on the contact frame both blades are turned to pass through that point, so they cross exactly there.
  - **Parried or not:** a parried cut stops on the other blade and rebounds; otherwise it follows through.
  - **Hit and fall:** `recoil` staggers the body back; `drop` lowers the blade (`angle`); `fall` topples the figure back about its heels with an accelerating ease. It stays down, its scabbards swinging round to lie along the body.
  - **Sparks:** the `sparks` particle bursts in a white flash and short gold streaks.
  - **Recipe:** `samuraiDuel({ id, x, y, scale, gap, start, exchanges, a, b })` returns both fighters and the sparks. Both draw, each exchange is timed on its contact frame and aimed in front of the defender's brow, and a final unparried cut ends it, with the victor sheathing. Storybook **Samurai duel** shows it in a moonlit field of pampas grass.
- **Look and kata.** `UKIYOE_SAMURAI_LOOK` is a generic look, and `samuraiKata(start)` builds the solo kata: draw, jōdan, cut, hassō, waki, chūdan, sheathe, bow. Storybook **Samurai kata** shows it in a raked-gravel courtyard with a View switch, and the four guards labelled. The Cast lab includes the samurai.

### Oni fighting

The oni's weapon and fighting (`ukiyoe-oni.ts`) are drawn after iron-shod kanabō in museum photographs and Kuniyoshi's and Toyoharu's oni prints.

- **The kanabō.** A long shaft swells toward the head, with rows of iron studs over the striking half (cones on the edges, round heads down the middle), iron bands, a cord-wrapped grip and an iron ring at the butt.
- **When the timeline applies.** When a figure with `prop: "kanabo"` uses any of `smash`, `swing`, `parry` or `drop`, the club follows its own timeline (`clubAt`) and both hands hold it by IK. Otherwise it stays the simple hand-held prop, so existing films are unchanged.
- **The club's moves.**
  - **Rest:** over the shoulder; once fighting it is held before the body.
  - **`smash`** (with `aim` on the ground and `contact`): a long wind-up overhead, then the club comes down so its head stops exactly on the ground, whatever the body has done to the hands. Dust and pebbles burst and the ground cracks where it landed; the cracks fade over about five seconds.
  - **`swing`:** wound back low and swept through `aim`; parried, it stops on the blade.
  - **`parry`:** blocks a cut at `aim`.
  - **`drop`:** lets the club fall to lie on the ground, where it stays when the oni falls.
- **Body.** The body throws itself into the smash and turns into the swing. `evade` springs back (or in) without turning round.
- **Square views.** The club is projected like the sword, and a `fall` seen square on foreshortens to the ground.
- **Looks and recipe.** `UKIYOE_ONI_LOOK` and `UKIYOE_MOMOTARO_LOOK` are generic looks. `oniFight({ id, x, y, scale, start, hero, oni })` returns the nodes and camera shakes of a hero-versus-oni fight. Contacts are aimed as in the duels, and the smashes shake the camera. Storybook **Oni fight** shows it on a rocky shore, choosing a samurai or Momotarō and a red or blue oni.

### Castle town

`castleTown({ frames, street, seed, snow })` returns a whole scene: one handscroll 6,400 px wide, panned (`scrollPan`) from the keep down through the town, with holds at four stations.

1. The castle on its grassy hill above the moat.
2. The samurai quarter: residence walls under pines, retainers passing.
3. The canal: an arched bridge over the water between stone banks, a boat below.
4. The merchant street: shops and storehouses, a busy crowd, the fire-watch tower over the roofs.

Mist bands drift across as in the picture scrolls. The crowds are placed so no walker ever enters the canal; the retainers stop short of it and the townsfolk walk away from it. The scroll carries no text. Storybook **Castle town** plays it, with a Snow switch, and the Motifs gallery shows each town motif.

### Interiors

A room is drawn as the prints draw it: the front wall taken away, the floor in parallel oblique projection (one unit back moves `skew` units right), the back wall seen through the opening up to the front lintel.

- **`room`.** `width`, `height` (the opening), `depth` and `skew` set the box.
  - `kind`: `tatami`, `boards` or `farmhouse` (an earthen floor a step below raised boards, its share set by `doma`). The tatami lie in columns front to back, with joints staggered so four corners never meet. Cloth borders (`heri`) run along the long sides, and fine rush lines run across.
  - `back`: a list of bays.
    - `fusuma`: painted paper with round pulls; `art` is `bamboo`, `clouds`, `waves`, `pine` or `plain`.
    - `shoji`: paper over the lattice.
    - `tokonoma`: a raised alcove with a natural post, a hanging scroll (`scroll` is `mountain`, `crane` or `moon`) and a vase of plum (`flower`).
    - `tana`: staggered shelves with cupboards.
    - `wall`, `marumado` (round window), `open` (the dark next room) and `garden` (with `snow` falling at night).
  - `side`: the bay kind of the left side wall.
  - `slide`: `[{ bay, open, start, frames, from }]` moves the right panel of a sliding bay behind the left one. A slid panel reveals `beyond` (`dark` or `garden`).
  - `torn` bursts lattice cells open, leaving scraps of paper hanging. `night` sinks the room into blue dark: lamps drawn after the room glow through it, and the shoji turn grey-blue (or warm, for front shoji lit from inside).
  - `veranda` (px) adds an engawa with its crawlspace. `eave` is `tile`, `thatch` or `none`. `frontShoji: [left, right]` closes front panels.
  - `part: "back" | "front"` splits the room so figures stand between the floor and the front posts, lintel and eave. Add the room twice, once with each part.
- **`andon`.** A standing paper lamp (`height`, `lit`) whose light flickers.
- **`irori`.** A sunken hearth: `size`, `fire` (curling flame tongues with a key line), `pot` (`kettle`, `pot` or `none`), `hook` (the jizai-kagi's length, with its fish-shaped crosspiece) and `steam`.
- **`futon`.** `layer: "under"` draws the mattress and pillow; `layer: "over"` draws the quilted cover with its velvet collar, mounded over a `sleeper`. Draw the under layer before a sleeping figure and the cover after it.
- **`loom`.** A treadle loom in oblique view. The shed flips each pick, the beater swings to the fell, the shuttle crosses while the beater is back, and the cloth winds onto the beam.
- **`byobu`.** A folding screen of gold leaf in zigzag (`panels`, `art`); its painting runs across the panels, and each face is shaded by its angle.
- **Figure actions.**
  - `sleep` lies the figure on its back with its eyes closed.
  - `weave` kneels at the loom. Given `aim` (the loom's `loomGrip`, relative to the figure) and `amount` (`LOOM_BEATER_PULL × height`), the near hand holds the beater bar by IK and pulls it in on the beat, and the far hand works the shuttle. Both the loom and the action run on `weaveBeat(frame)`, so they agree on every frame.
- **`interiorScene(kind)`.** Builds a complete room scene: `inn` (Hiroshige's Akasaka at night), `weaver` (the crane wife), `hearth` (an old couple at a farmhouse irori) or `bedroom` (a sleeper; a shoji slides open on the snow). Storybook **Interiors** plays them, and the Motifs gallery shows each motif.

### Women ghosts and hags

Most women in the ghost stories look alive until the story turns, so they are figure looks. They walk, kneel, talk and turn in every view, and a `reveal` action (over `amount` frames, default 24; it stays revealed) shows what they are.

- **`face`.** It shows in profile, three-quarter, front and, for the back of the head, the back view.
  - `noppera`: the eyes, brows, nose and lips smooth away into a bare egg.
  - `kuchisake`: a cloth over her mouth slips down to show it slit back to the ears, with teeth. It opens with `talk`.
  - `futakuchi`: a second mouth opens in the back of her head, and two locks of hair reach out like hands.
  - `skull`: the face and hands turn to bone, with sockets, a nose cavity and teeth.
  - `oiwa`: a livid swelling closes one eye, the skin greys and the hair thins into strands.
  - `hag`: lines and hollows; the reveal bares a fanged grin.
- **Props and hat.** `prop: "peony-lantern"` (the botan-dōrō, painted and tied with peonies, flickering pink) and `prop: "baby"` (a swaddled infant held at the breast in both arms). `hat: "gotoku"` is the iron trivet with three burning candles.
- **`UKIYOE_ONNA_LOOKS`.** Generic looks: `noppera`, `kuchisake`, `futakuchi`, `honeonna`, `oiwa`, `yamanba`, `hashihime` (a red face, white robe and candle crown) and `ubume`.
- **`okiku` (yōkai).** After Hokusai's *Sarayashiki*. `appear` raises her out of a well on a coil of blue-and-white plates, her hair streaming beside it, her breath curling out. `howl` moves her lips as she counts. Place her on the mouth of a `well` motif, between its `part: "back"` and `part: "front"`. The `well` has staves, rope hoops, ivy and an optional `pulley` with a bucket.
- **`onnaScene("lineup" | "okiku", view)`.** Storybook **Women ghosts** plays both.

### Folk work

- **Tools on their own timeline.** `chop` (an axe), `hoe` (a hoe) and `pound` (the mochi pestle) run on `toolAt`, like the katana and the club.
  - The tool lifts slowly over the shoulder, hangs, then drops fast (ease-in) onto its contact point. The contact lands on a whole frame and holds while chips, clods or a squash of mochi fly.
  - Both hands are placed on the handle by IK, and the body leans back on the lift and throws its weight down on the strike.
  - `toolContact(action, height)` is where the head lands, so a scene can place the chopping block (`stump`), the furrows or the mortar (`usu`) there.
- **`wash`.** Kneels at a tub (`tarai`) and scrubs the cloth at `aim` with both hands.
- **`shake`.** Shakes the mallet of luck (`prop: "kozuchi"`) overhead, pouring gold coins and rice.
- **Props and hat.** `onigiri` (a rice ball in the hand), `firewood` (a lashed bundle on the back) and `hat: "hachi"` (Hachikazuki's great black bowl, in every view).
- **`folkScene(kind)`.** Builds `woodcutter`, `farmer` (his wife brings a rice ball), `mochi`, `washing` (Hachikazuki at the tub) or `luck`. Storybook **Folk work** plays them, and the Motifs gallery shows the block, mortar and tub.
- **Square views.** Tools and the mallet are drawn in profile and three-quarter only. Seen square on, the body works but the tool is not shown.

### Effects and magic

- **`fire` motif.** Tongues of vermilion with yellow hearts and a key line, varied in height and streaming with the wind, over a warm glow. Smoke rolls away in outlined cloud billows, and embers rise. Params: `width`, `height`, `intensity`, `smoke`, `lean`.
- **`halo` motif.** Gold rays of two lengths around a ring, slowly breathing.
- **Particles.**
  - `smoke`: a henge puff of curling cloud scrolls at each burst. The creature `transform` puff is now one outlined cloud as well.
  - `lightning`: a forked bolt from the sky to each burst point, with a flash of the frame. Pair it with a camera shake for the thunder.
  - `ash`: a plume poured from each burst point (`launchFrom` = how long it pours) and carried downwind.
  - `foxfire`: teardrop flames, yellow within and red at the rim, bobbing in the area.
- **`effectScene(kind)`.** Builds `fire`, `henge` (a fox walks into the smoke; a woman node `from` the moment it is gone walks out), `storm`, `blossom` (ash, then the sakura `progress` keyed from bare to full bloom), `foxfire` or `halo`. Storybook **Effects** plays them.

### Kami and heavenly beings

- **`fly` action.** Lifts the figure off the ground and carries it to `to` / `toY`. The body leans into the flight, the legs trail back together, and it bobs gently.
- **Look fields.**
  - `stole`: the hagoromo scarf. It streams behind in two waving ribbons that stretch out when flying; in the square views it floats to both sides.
  - `beads`: magatama at the collar.
  - `bag`: Daikoku's rice bag.
- **Hair, hat and props.** Hair `mizura` (the ancient man's ear loops) and `tenko` (the celestial's crowned topknot); hat `zukin` (Daikoku's round cap). Props `mirror` (the sun-mirror, flashing), `tsurugi` (the straight sword), `hoko` (the jewelled spear) and `tai` (Ebisu's sea bream, its tail flipping). All work in every view.
- **`kumo` motif.** The auspicious cloud with curled lobes and a long tail, for gods to stand on (one outlined union).
- **`UKIYOE_KAMI_LOOKS` and `kamiScene(kind)`.** Looks for `tennyo`, `amaterasu`, `susanoo`, `izanagi`, `ebisu` and `daikoku`. Scenes: `hagoromo` (she flies down over the pine shore and away), `amaterasu` (out of the cave with the mirror and halo), `luck` (Ebisu and Daikoku on a cloud) and `susanoo` (the storm god on a cloud). Storybook **Kami** plays them.

### Transition

`UkiyoeKasumi` sweeps stepped gold mist bands (gradient, wood grain, sunago gold dust and kirikane flakes) from right to left across the frame. The incoming scene is revealed behind each band's trailing edge. The FilmStage slot is `ukiyoe-kasumi`; the incoming shot then resumes where the transition left it.

## Usage

```tsx
import { UkiyoeScene } from "./components/video/ukiyoe/ukiyoe-react";
import { scrollPan } from "./components/video/ukiyoe/ukiyoe-core";

const scene = { version: 1, id: "demo", width: 1920, height: 1080, durationFrames: 240, seed: 7,
  palette: { preset: "twilight" }, mount: { kind: "scroll" }, printIn: { frame: 0, duration: 60 },
  wind: { base: .2, gusts: [{ frame: 120, duration: 80, strength: 1.5 }] },
  camera: { keys: scrollPan({ from: 2600, to: 960, y: 540, start: 0, end: 239, stations: [{ x: 1800, hold: 40 }] }) },
  nodes: [
    { id: "sky", kind: "motif", motif: "sky", depth: .3, x: -600, y: -300, params: { width: 4200, height: 1100, horizon: "beni" } },
    { id: "fuji", kind: "motif", motif: "mountain", depth: .32, x: 1500, y: 640, params: { width: 800, height: 340 } },
    { id: "sea", kind: "motif", motif: "sea", depth: .8, x: -600, y: 640, params: { width: 4200, height: 600 } },
    { id: "boat", kind: "group", x: 1800, y: 900, loops: [{ kind: "rock", period: 60 }] },
    { id: "hull", kind: "motif", motif: "boat", parent: "boat", params: { kind: "ferry" } },
    { id: "ferryman", kind: "figure", parent: "boat", x: -180, y: -18, look: { robe: "asagi", hat: "headband", lower: "tucked", prop: "pole" }, actions: [{ type: "pole", start: 0, end: 239 }] },
    { id: "rain", kind: "particles", type: "rain", depth: 1.1, area: [-200, -200, 4000, 1600], count: 400, from: 120 },
    { id: "title", kind: "text", style: "cartouche", depth: 0, x: 1820, y: 90, align: "end", text: "渡し", sub: "The Ferry" },
  ] } as const;

<UkiyoeScene spec={scene} frame={frame} reducedMotion={prefersReducedMotion} />;
```

## Evidence

```bash
npx vitest run --project unit tests/ukiyoe.test.tsx     # 32 tests (all three films' scenes inspected): contract, purity, motifs, wave (incl. foam drawn as one connected shape with a single outline), particles, figures, oni, creatures, henge, peach, Fuji, print pass, camera, kasumi, both films, slots, playback, and boats (hull advances whenever the pole works, passengers never leave the pier or deck, wave surface is seamless, a rider's per-frame steps stay small)
npx eslint registry/video/ukiyoe src/video/ukiyoe-*.ts* tests/ukiyoe.test.tsx
npm run registry:validate
node scripts/registry-fixture.js --item=ukiyoe-handscroll   # clean consumer install + usage typecheck
```

**Interactive playback:** in headless Chromium, Storybook played the films at 30 distinct frames per second (The Snow Woman: 30 fps in all three shots), sampled over 4 s in the town pan, the squall, the fireworks and the folktale road. The playhead is time-based, so a slow paint drops frames instead of slowing the story.

**Visual review:** the agent reviewed Chromium captures of every shot (contact sheets at 0.5×), the 2× cast sheet, and the motif gallery in both palettes. Portrait framing was checked on the title shot. **A human normal-speed review has not been recorded**, so the style is `not-reviewed`. No full-length render was made; render a draft only on request.

## Limits

- SVG renderer: very dense scenes (thousands of figures) will slow interactive playback. Textures are generated PNG tiles (~1.8 MB of data URIs per scene, cached).
- Creature rigs are profile rigs. Four-legged animals now have a single tufted coat silhouette, jointed legs (hock, wrist, toes) and a detailed face; birds have feathered wings on a bone frame. They turn three-quarter, and four-legged animals also face front or back; birds, the dragon and the yōkai have no front or back view. Dragons follow a sine-wave spine (no path following yet).
- Yōkai cover the snow woman, yūrei, rokurokubi, kappa, tengu (red and crow), nue, nurikabe, tsuchigumo, and the umbrella and lantern spirits. For the horse, `stand` means rearing.
- Figures have one face design per hairstyle in each view (profile, three-quarter, front, back). There is no lip-sync from audio (time `talk` to narration) and no IK; stance feet are approximately planted.
- Mottle lies in the paper plane, so on far parallax layers it slides against the ink during a pan, as the washi fibres do.
- `ride` works for top-level nodes in the same parallax layer as the wave. Only `wave` motifs can be ridden; the open `sea` does not lift boats beyond their own `rock` loop.
- There is no soundtrack yet.
