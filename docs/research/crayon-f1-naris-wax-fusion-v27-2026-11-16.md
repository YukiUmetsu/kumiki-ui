# ArtCraft F1 V27 — native alpha-feathered alar wax / source cavity

**Quarantined experiment in draft PR #461. Do not merge or call this a realistic portrait.**

Reference: [Christopher Campbell CC0 photograph](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), 608×1082 original screenshot SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. A real source's near nostril is a hooked black-to-maroon shadow, not an outlined dark bean. Far is a narrow foreshortened vertical recess. Both are occluded by skin/cartilage with a warm soft edge.

## Native reference evaluation (no claims of approval)

[Actual native Chromium V26 1×/3× run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43862871274), artifact 14224673900, visually **REJECTED**. Quantitative scikit-image SSIM from source at 608×1082:

| Crop | V25 | V26 |
|---|---:|---:|
| Full image | .361674 | .361722 |
| Nose x340..493 / y570..684 | .548200 | .550149 |
| Near naris x389..415/y628..645 | .191387 | .244186 |
| Far naris x444..464/y616..646 | .306096 | .365474 |
| Bulb x374..411/y594..633 | .500784 | **.462016** |
| Septal x412..451/y627..664 | .495639 | **.467748** |

V26 source core (405,631) RGB [29,4,4], rendered median [103,75,67]. Far source (450,627) [74,22,18] vs V26 native [91,68,62]. Thus a *visible cavity is not yet correctly integrated into an anatomically attached nose*.

## Five-axis physical reconstruction

1. **Topology:** preserve the identical V26 asymmetric near/far Bezier outlines and exact overhang order, no new pieces or unrelated remap.
2. **Vector flow:** near native dry wax -27°; far 66°, aligned to each differently projected alar cutout. No mirrored geometry.
3. **Edge hierarchy:** solid dark core + 2.15/2.55 native *alpha* boundary feather; reduce the bright roof's high-contrast edge under the same paper. This changes the material, not the color texture by Gaussian filter.
4. **Local value:** near red/black 95% pressure and .96 burnish, far .91/.94, warm value ramps informed by original dark recess; dark is optically cohesive with skin.
5. **Paper tooth:** dry-nib microtexture is preserved; no source pixels, blur-image, postprocessing canvas or raster overlay in shipped code.

Four existing named wax elements only: two naris shadows and two alar roofs. Old variants and every other control/stroke/300-frame scene exactly retained. Use the same Storybook laboratory's reversible V27 3× state. Tests cover preserved identity, exact existing SVG geometry, matte native wax, density and copy/duplicate failure; native browser frame 299 1×/3× A/B screenshots must be inspected against the original reference, and regression is allowed to reject V27.

**HARD STOP:** official ArtCraft 9.1 ≥.85 source SSIM, independently observed 18 facial landmarks, five-value-plane face, independent visual acceptance at 1× and 3×, whole-film 300-frame review are not satisfied. Even an improved nose score does not certify the human figure.
