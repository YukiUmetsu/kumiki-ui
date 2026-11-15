# RISO19 — articulated-grip paper pressure and Risograph contact imprints

Date: 2026-11-15. Built on the existing **RISO16 unified contour → RISO17 authored finger occlusion → RISO18 deterministic paper ownership** pipeline. The change addresses a visual material defect: previous `gripPinch` altered only two short edge widths; it lacked local tension folds and showed no pressure evidence on paper between drawn fingers. This is an original *animated print illustration*, not an FEA paper solver, anatomically approved portrait or scan-matched real hand.

## ArtCraft v7 source board — actual external references

| Reference / reuse rights | Visible observations | Construction decision / wrong shortcut |
| --- | --- | --- |
| [Kat Schneider, *Pride & Prejudice Hands* mini Riso](https://www.katschneider.com/store/prideandprejudice-hands) — artist-owned; **reference only, not redistributed** | The photograph shows a mini blue/red Risograph with a top bent hand, distinct finger silhouettes, fine short knuckle marks and a lower fully splayed hand against dense colored cloth. Each finger has a separately readable root and tip; white is actual unprinted paper. | Keep the original four red closed glove digit contours and **three blue authored linework groups** in the foreground. Paper-pressure details must grow from the two contact regions, not arbitrary circles, gradient stickers, global scribbles or translucent body fills. |
| [Kilian van de Water / Studio Rosi, *Tabak* Risographie](https://studiorosi.de/products/tabak-by-kilian) — artist-owned; **reference only** | Four distinct-color printed hands curl around a bright unprinted center. The negative space is narrow in pinched fingertips, broad in the palms. Crease lines converge toward skin/finger pressure points; adjacent broad printed planes stay well-formed. | Three unequal converging crease paths *per physically contacting paper edge*, small screened crescent at each hand, short inward-directed spatial scale. Preserve readable unprinted paper and disallow a huge translucent shadow patch. |
| [Johnson County Library Risograph FAQ](https://www.jocolibrary.org/makerspace/risograph/) — printing-process reference | Each color is prepared and printed separately; uncoated paper and separated artwork rather than RGB whole-image filtering. | Draw contact hatch and screened compression on the **blue** spot master, preserve red cancellation/texture and independent plate isolation. |
| [University of Utah, Risograph Instructions](https://lib.utah.edu/collections/book-arts/risograph.php) — printing-process reference | Tight multicolor registration varies; broad saturated ink fields can be difficult and screened fills reduce solid-ink demand. | The compression pocket uses the existing dotted `RisoPaint.dots`; retain seeded paper tooth, original line weights and existing registration offsets. |

These visual observations were made on the accessible image previews. They establish a material-language direction but **do not establish pixel-exact source fidelity**; no reference pixels or third-party authored art were bundled. Source rights for tracing/masking were not secured. Full ArtCraft v7 1×/3× annotated rendered-versus-source visual comparison is still open.

## Geometry and five-axis decomposition

1. **Topology:** One closed paper silhouette drives the opaque paper knockout *and* both physical inks; each contact location has exactly three open crease strokes and one narrow closed screened pocket. The source group disappears when the donor releases; the receiver group continues. Creases never become white body knockouts or separate floating stamps.
2. **Vector flow:** All crease control points use RISO16's oriented local basis `at(t,offset)` derived from the **actual two changing paper endpoints**. Source pleats move inward from `t≈0.018`; receiving pleats move inward from `t≈0.982`. For reverse or diagonal paper, both the contour and the ink turn together. Each crease is a rooted quadratic with an independently authored length, offset and tangent bend; no copied parallel stripes.
3. **Pressure/edge character:** Three crease strokes have distinct 14.5/23/10.5-unit nominal reach and 0.95/0.70/0.55-unit spot-ink weight; their bends alternate. Pressure `p` comes from actual source or recipient grip `0..1`, multiplied by `max(0,1-contactGap/12)`, material reveal `clamp((chordLength-32)/40)`, and user `imprintDepth` `0..1`. A disconnected hand `≥12` stage units away cannot leave material wrinkles or depressions; no discontinuous random smoothing/canvas filter.
4. **Rhythm:** Draw pressure marks as the sheet leaves the Courier, unfolds and reaches the Paper Artist; material creases grow then collapse when contact breaks. The donor's crease group is zero in the received state; the recipient's group persists and inherits the **same** receiver-owned material transform. All outcomes are sampled from the target absolute frame with no frame-state history.
5. **Ink microtexture/depth:** The two small tapered closed pocket paths are screened from `paint.dots`, never white or rgba. Three open curves are blue press linework; red print stamp and hatching remain independently registered. The source/recipient joint-derived finger silhouettes still sit over **fully opaque paper** using real authored artwork.

## Explicit acceptance/rejection table

| Region | Structural positive condition | Negative control that must fail |
| --- | --- | --- |
| Finger contact, all four cardinal tilts | Three individually curved and localized creases per hand with a closed screened pocket | Generic ellipse placed over paper, disconnected crease roots, uniformly screen-aligned hatch |
| Released/free end | Donor `sourceContactPressure===0` once edge is `≥12` from its wrist, without any donor crease/shadow | A trail of floating donor pressure ink after receiver owns the paper |
| Receiving end | Three recipient creases when in contact, independent of source pressure and source body motion | Creases vanish when source releases, despite receiver holding print |
| Unfurling stub | No full-sized pressure marks for a sheet chord of 28 stage units | First-frame crease popping full-sized before paper exists |
| Original printable art | `detail=false` and `imprintDepth=0` suppress marks; both plates retain original ink and lines | A whole-frame alpha/noise filter, colored paper itself, hidden original stamp |
| Film stills / rendered contact | Required: exact source-frame 16:9 & 9:16 crops of frame 160, 177, 189, 202, 239 plus signed artist visual critique | Passing source/DOM checks represented as finished illustrated film |

## Integration and remaining work

The existing **Video production → Film Looks → Risograph** Storybook sample has a `Pressed paper creases` strength slider. Changing it only affects press-detail generation, not the paper outline or printed addresses. The original grip compression, fold shading, registration, ink isolation and 24fps playback remain available. The RISO19 unit and browser-focused cases cover registration, material-local paths, independent hand ownership, conditional appearance, invalid parameters and absolute seeking.

**Unfinished:** Rights-cleared source crop masks and measured five-axis comparisons; actual Chrome screenshots and full-speed two-aspect MP4 visual pass; specific knuckle-driven paper volume displacement and the physical thickness of folds; portrait anatomy/three-quarter identity under the ArtCraft v7 portrait gate; measured Risograph scan dot gain and paper ink bleed. Code correctness does not imply those artistic gates passed.
