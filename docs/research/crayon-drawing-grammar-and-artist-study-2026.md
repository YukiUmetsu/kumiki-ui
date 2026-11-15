# Crayon drawing grammar — artist reference study and executable construction contract

**2026-11-14. State:** strict structural foundation implemented; original botanical workbench is **artistically unapproved** and kept under the existing `Video production / Film Looks / Crayon / Materials` Storybook tree with `!dev`. No third-party images are imported, traced, distributed or used as runtime sprites.

## Medium boundary: why this is not a crayon filter

The native medium target is **dry wax crayon on toothy paper**. It uses successive local wax depositions, varying pressure, opaque underpaint for solids, an intentional uncovered paper contribution, parent-clipped glazes and subtractive scratch marks where supported. Do not collapse graphite/colored-pencil, dry wax crayon, wax-soluble watercolor crayon and oil pastel into one material preset. Caran d'Ache differentiates Neocolor wax crayons from Neopastel oil pastels and water-soluble wax crayons: https://www.carandache.com/us/en/guide-to-choosing-pastels .

A dense computer-generated fleck mask added to a cartoon head is **not** artistic crayon construction. Fix the underlying subject before texturing it.

## Artist evidence studied and engineering translation

These are references for **technique and visual principles**, not images to copy or exact proprietary styles to reproduce.

| Reference | Artist-observed principle | Implementable grammar | Unverified / do not claim |
| --- | --- | --- | --- |
| [Atticus Bergman — exhibitions](https://www.atticusbergman.com/exhibitions) | Carefully applied successive Crayola layers develop dense tonal surface and physiognomy | Sequential local value planes before sharp accents; separate solid undercoat from colored pressure trails | Our engine is not proven equivalent to his portraits or anatomy |
| [Kenneth Jordan II — official bio](https://www.crayolasensei.art/bio) and [studio statement](https://paletteproductions.net/kenneth-jordan/) | Representational figure drawing; additive and subtractive wax techniques and emotionally specific form | Source-led landmarks, asymmetric connected masses, selective erasure/sgraffito, expressive local texture | Must study anatomy and rendered expression, not blindly add lines |
| [Kassia Rico-Yeh — crayon portrait series](https://www.behance.net/gallery/14450891/Portraits-2013-Crayon/modules/124832885) | Portrait colors use visible juxtaposed blues/purples against warmer skin light | Ordered warm/cool chroma planes and curved pigment direction tied to cheek, eye socket and nose | Noncommercial reference images are not bundled or pixel-matched |
| [Emilie Louise Gossiaux — process](https://www.emiliegossiaux.com/author/emiliegossiaux/) | Tactile contour comes from physical observation and continuity; wax added to an intentional connected drawing | Stroke continuity and measurable physical contact anchors before decoration | A polygon hierarchy does not evaluate expressiveness, feeling or visual likeness |
| [Nano Le Face — represented artist](https://southernguild.com/artists/nano-le-face) | Intentional recurring identities with distinct facial silhouettes and graphically organized marks | Subject identity/shape language and proportion families, expression variations evaluated in one crop scale | Stylization must not be reduced to generic eye/nose glyphs |
| [Shawn Falchetti — artist process](https://www.artistsnetwork.com/art-mediums/colored-pencil/4-artists-push-colored-pencil-drawing-to-the-expressive-edge/) | Demonstrates a mixed-medium sequence using Neocolor II and colored pencils, including underpainting and numerous later layers | Useful as **mixed-medium technique contrast**: build broad masses then progressively specific marks | Not proof of dry-wax-only technique; avoid treating soluble wax as equivalent |

## The strict construction pipeline

1. **Study reference first.** Choose at least one source for subject geometry (relevant angles and proportions), one for true crayon material, and one finished composition. Write down the separate observations and permission provenance. No generic "artist-inspired" screenshots masquerading as reference-aligned proof.
2. **Map the anatomy or object.** Specify named connected primary parts (e.g. skull–neck–torso; stem–leaf–fruit; wing–body–claw), landmark coordinates, foreground occlusions and meaningful negative-space clearances. Start by drawing one appealing static composition at final pixel size.
3. **Blocking pass (frames 1–54 in the example).** Paint unmistakable *opaque* source-shaped silhouettes. The subject must remain nontransparent with the texture disabled. Primitive-only hero geometry fails manual approval. The root mass is unparented; physically attached parts inherit its transform.
4. **Value pass (55–104).** Establish three-value light logic and directional turning masses. Open glazes are *parent clipped* and cannot substitute for the opaque primary form.
5. **Chromatic pass (105–159).** Apply local warm/cool wax for material and focal hierarchy. Avoid symmetric disks, mechanical repeats and full-frame random hue noise.
6. **Detail pass (160–239).** Add connected internal curves and pressure-weighted scratches that follow authored cubic tissue/grain guides. Contour marks must be clipped to the appropriate opaque wax mass; use seeded stratified variation in position, shape and width rather than confetti.
7. **Animate only after static acceptance.** Preserve all root-to-part relationships under pose deformation. Use world-space anchor checks for fixed attachment at final/critical frames; normal-speed performance still needs real visual review. Static 2D line art is *not* an adequate substitute for multi-angle turnarounds or deformable anatomy.
8. **Proof and release.** Run the scene schema and drawing-plan validators, native 960×540 and 540×960 Chromium captures, feature crops and independently inspected motion. Structural passes do not auto-approve art.

## Implemented contracts

- `registry/video/materials/crayon-art-direction.ts`: `CrayonDrawingPlan`, `CrayonSubjectRule`, `CrayonPartRule`, `CrayonAttachment`, `inspectCrayonDrawingPlan`, `crayonDirectionalStrokes`.
- The checker rejects **untracked nodes**, missing roots, open/transparent main masses, improperly unclipped tonal layers or strokes, non-connected attachment landmarks including mid-motion separation, duplicate claims, insufficient *declared* source curvature, wrong pass timing and orphan parts.
- Anchor error distances use `crayonWorldPoint` in camera-independent units at start/middle/end and the motion keys with in-between samples. Declared anchors must also lie inside their wax bounds. These checks guard touchpoints only; it does **not** prove all silhouettes physically intersect, topology of holes, or valid human anatomy.
- The original botanical example `src/video/crayon-drawing-system-fixtures.ts` draws a pear, stem, leaf and paper-bound cast shadow with three directional stroke fields and individually reviewed body masses. All rendering goes through the existing `CrayonScene` engine. The point is a concrete working production **pattern**, not a new independent renderer.
- `src/video/crayon-drawing-system.stories.tsx`: one hidden Storybook page in the existing Crayon/Materials folder, landscape and portrait variants, detail/pressure/paper controls and live four-stage playback. HTML explanatory text remains outside the SVG, avoiding portrait collision with art.
- `tests/crayon-drawing-system.test.tsx`: both aspects, low/high detail, native SSR, deterministic variable-width strokes and adversarial negative tests.

### How to build a new subject

```ts
const {scene,plan}=crayonBotanicalDrawing({
  aspect:"landscape",detail:1,pressure:.86,paperTooth:.8
});
const failures=inspectCrayonDrawingPlan(scene,plan);
if(failures.length)throw new Error(failures.join("\n"));
// <CrayonScene spec={scene} frame={239} />
```

Replace the botanical geometry and its `parts`/named attachments with subject-specific forms, and preserve the separate pass semantics. Use `crayonDirectionalStrokes` *only* for meaningful form-directed marks, not as a shortcut to sculpt facial features. A human head needs independent skull, eye socket, orbit, eyelids, tear duct, nasal planes, ears, mouth, teeth where visible, jaw, hair roots, neck, shoulders and cloth connections. Measurements must come from the selected references and current rendering, never a universal face-proportion preset.

### Test and ArtCraft-quality gates

| Gate | Automatic criterion | Manual criterion |
| --- | --- | --- |
| Geometry | Rich authored curved paths and explicit primary mass coverage; child hierarchy valid | Natural silhouette, identity, recognizability, intentional exaggeration |
| Topology | All declared touchpoints within tolerance and no missing ancestor | Actual touching silhouettes, correct overlap and negative space |
| Color | Wax remains clipped to opaque underpainting; phases sorted | Physically credible pigments, depth, focal hierarchy |
| Texture | Stable seeded direction, bounded count and pressure | Visible crayon contact at normal viewing distance, not digital grain |
| Film | Frame-pure source playback and responsive Storybook | No clipping, ugly pose transitions, portrait text overlap or animation jitter |

**Known limitation:** The existing unapproved adult portrait (tracked in [PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281)) still looks too flat and mouth/neck forms fail the art director's standard. Neither this validator nor a green CI run can promote it. The next priority is a measured multi-view portrait construction and image-led crop comparisons. This framework is deliberately falsifiable through tests and browser proof, but cannot compute aesthetic beauty from path counts.

## Botanical craftsmanship iteration — dry wax crayon still life (2026-11-14)

**Additional medium and compositional references, kept external:**

- [Clara Lieu / Art Prof: Still Life Drawing in Crayon](https://artprof.org/learn/tutorials-media/drawing/still-life-drawing-in-crayon/) explicitly demonstrates Neocolor I wax-crayon still life, thumbnail composition, yellow-ochre underdrawing, local light/dark, warm/cool contrasts and final detail. **Transfer:** source-shaped masses and value hierarchy before mark counts.
- [Philadelphia Museum of Art: Descriptive Terminology for Works on Paper, fig. 49](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) distinguishes high-wax deposits by dense, uneven clumping and lifting at the tips. **Transfer:** preserve pressure-led edge/mark variation rather than isotropic speckle texture.
- [Stockmar: Wax Crayon Painting](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf) explains physical transparency, layered pigments and sharp-point vs broad-side contact. **Transfer:** separate opaque mass for solid subjects from open, stacked wax rubbing for light and colour.
- [Nature morte — orange et bols](https://www.galerie-com.com/oeuvre/nature-morte-orange-et-bols.-/371110/) provides a fruit/ceramic/cloth still-life reference described as wax crayon. Observe contact shadow, cool cloth, orange light and distinct material surfaces; no image is copied into runtime.
- [Pastel pear example](https://www.edisaxe.com/la-nature-au-pastel) is **pastel, not a crayon-material proof**. Use only as a lighting/composition comparison: an illuminated fruit, opposing cool side plane and cast shadow; do not imitate the powdery pastel mark morphology.

**Previous source-native Chromium proof weaknesses:** oversized near-elliptical pear silhouette, flat yellow/olive wax, single airbrush-like blush, bright geometric leaf, faint floating oval shadow, weak stem depression, mechanically uniform dashes. All were visible even though the previous topological and deterministic checks passed.

**New original drawing revisions:**
1. Re-sculpted asymmetrical pear outline with a narrower, inset stem shoulder and less mechanically elliptical blossom end; reconstructed the leaf midrib with paired secondary branches.
2. Layered stalk cup, lower-volume umbra, cool right turning plane, raking wax highlight, broken red/orange blush pass, and a small warm reflected glow. Every glaze is clipped to opaque source geometry and assigned to its intended source pass.
3. Reduced rigid, repetitive scratches; the existing tangent-led crayon field now follows more restrained guide curves with less mark crowding. Restrained cool wax contrasts with warm amber and red in form-relevant regions.
4. Added full-frame and source-camera inspection surfaces (`surface`, `stalk-leaf`, `contact`) to the existing **single** Drawing System Storybook page. Inspection modifies only camera keys, never the original deposited wax, seed, geometric source, or playhead.
5. Structural tests cover the new anatomical wax planes and leaf branch geometry; isolated Chromium visual proofs capture 960×540 and 540×960 construction frames plus cropped detail.

**Approval status remains `!dev`:** these tests cannot certify a world-class illustration. A botanical reference can show high fidelity while the procedural wax deposition still looks too clean/digital. Inspect native captures at normal display scale, amend source geometry first, and only then consider accepting an artwork; do not claim that passing structural checks proves a finished professional drawing.

### Second visual critique and correction

The first post-implementation 960×540/540×960 Chromium source renders were reviewed.
A broad flat blush, near-vector leaflet, and U-shaped eyebrow-like stem cup
remained visually obvious, despite the new wax value planes and passing tests.

The revised iteration retains the opaque source silhouettes and adds
form-relevant **cross-direction dry-wax** contact on the pear/blush/leaf at
lower opacity, narrower and more varied curved leaf venation, an actual
stem-to-leaf overlap, lighter broken stem well marks rather than a large
cartoon arc, and a small separate umbra directly beneath the fruit.
New deposits remain deterministic, source clipped, and accounted for in
the declared drawing plan. The added detail is not a particle noise shader;
all marks follow separate authored cubic motion guides.

A professional visual gate still requires inspection of the final native
macro screenshots in both aspects. In particular, tiny lenticels, real
paper-to-wax contact, natural leaf vein branching, and the cast shadow must
remain readable without making the fruit resemble a vector gradient.

### Third material pass: avoid synthetic brush bands

A second native capture showed that the earlier increased `markStrength`
created large, identical-looking crayon bands on the pear. This is not a
convincing wax-crayon surface at close zoom. The subsequent code changes
reduce opaque base-band prominence; strengthen smaller irregular open wax
depositions in the blush, umbra and cool turning plane; and add lighter
pressure-dependent short guide-following binder deposits. The contact umbra
is intentionally stronger under the fruit. Two seed-distinct, bounded fields
stay within the source geometry and below CRAYON1's 240-node limit.

Acceptance is still **pending** a source-native browser review of the new
normal-distance render and close-up. No claim of professional artwork is
made solely because the code and tests pass.

## Dry-wax fractured nib experiment (2026-11-14)

The latest original pear crops still read as **flat vector-colored wax**, with
large smooth gradient areas and broad mechanically regular pale bands.
External macro photographs of real wax-crayon strokes reveal discontinuous
pressure-dependent ridge contact rather than a flat, uniformly filled ribbon.
The physical reference is Rudolf, Mould & Neufeld, [*A Bidirectional Deposition
Model of Wax Crayons*](https://doi.org/10.1111/j.1467-8659.2005.00826.x):
it models evolving nib profile, friction and paper height. Kumiki's new mode
is **not** a faithful reproduction of the paper's numerical model.

### New opt-in portable material: `nibStyle: "dry"`

- Split every source quadratic nib arc into **one to three pressure-dependent
  contiguous narrow wax bands**, with a bounded chance of a short lift.
  Material contact is generated from the original deterministic mark index,
  not an overlay texture or downloaded bitmap. At most six fragments per arc.
- Retain a weak, wide binder underneath the fractured bands, so the wax
  impression has shape continuity while leaving dry gaps between deposited
  pigment strips. Apply existing common paper-space relief to both.
- Low-pressure marks have less lateral contact and higher-pressure marks
  build larger contiguous deposits. No frame-specific noise, repeated
  image textures or third-party libraries are introduced.
- **Backward compatibility:** `tapered` and `rounded` remain unchanged,
  with no dry-wax geometry allocated for scenes that do not opt in.
- Use the original pear scene as A/B with both nib modes. The default
  original pear atelier now selects `dry` for material research, while
  the artist can switch to `tapered` in the existing Storybook.
  Full-frame and camera-only macro screenshots are generated for both
  960×540 and 540×960 in isolated CI.

Tests and Chromium source-native images show deterministic construction, not
professional approval. The new nib does not implement actual physical paper
height sampling, multicolor Kubelka–Munk scattering or pigment scraping and
transfer. A/B screenshots should be inspected for clumping, continuity and
paper contact before declaring this mode artistically superior.

### Browser A/B critique and micro-band correction

Native 960×540 and 540×960 macro crops showed `dry` replacing some
large soft ribbons with fine pigmented strips; however, the first dry model
painted **three overly parallel hairlines**. The follow-up now varies each
band's lateral contact at four sample points with bounded, seed-stable
paper-friction drift and independently modulated thickness. The authored
quadratic centerline is unchanged; this is a cheap approximation to
contact variation, not a claim of physically simulated microscopic paper.

The dry-mode geometry remains bounded (at most six lifted pieces per arc),
monotonic in absolute exposure and evaluated only when dry mode is chosen.
This study remains `!dev`; compare actual crops rather than only green CI.

## Opaque undercoat paper-contact study — 2026-11-14

**Problem observed in PR #317 native macro A/B:** despite more realistic dry
nib contact, the pear's dominant smooth radial underpaint looked digitally
filled, with intermittent hairlines floating over it. Simply adding many
high-contrast scratch lines would worsen the artificial appearance.

**Physical reference:** Rudolf, Mould and Neufeld (2005), [*A Bidirectional
Deposition Model of Wax Crayons*](https://doi.org/10.1111/j.1467-8659.2005.00826.x).
Their full numerical model represents a paper-height field and evolving
crayon-mask friction/wax transfer. This update **does not reproduce** their
numerical model. It uses a bounded SVG approximation to the observed
unevenness of wax concentration over toothy paper.

### Authored, opt-in `underpaintTooth: 0..1`

- All opaque subjects retain a full-opacity primary undercoat. Page
  background and occluded characters **cannot show through** pigment pores.
- At most six compound SVG paths per paper sheet describe two independent
  paper-height cohorts (shaded pits and raised highlights), seed-stable in
  page coordinates. All wax parts reuse them, rather than generating
  uncorrelated per-subject confetti.
- Two thin local-palette color layers sample those paper cohorts through
  a luminance mask clipped to each opaque silhouette. Their opacity scales
  with authored tooth strength and pressure. This changes the underlying
  mass, not just the late scratch overlay.
- A separate drawing-progress mask prevents relief from appearing
  across the fruit before the wax was deposited.
- The property defaults to zero. All existing stories/scenes keep their
  prior appearance; only the botanical demonstration enables it.
- Real paper will also deform, abrade, smear and exchange pigment. These
  effects, genuine multiscale height measurement and a physical spectrum
  shader are **not** included. Treat the work as a bounded compositing study.

**ArtCraft inspection gate:** compare source-native macro crops at 960×540
and 540×960 with `underpaintTooth=0` and `0.9`, then normal-distance
full-frame stills and drawing phases. Verify repeatable tooth at fixed
seed, no unintended transparency, natural skin color without grey dirt,
and zero text collisions. The new artwork remains `!dev` until visually
accepted; technical tests are necessary but not an aesthetic award.
