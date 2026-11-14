# Pressure-responsive paper relief for CRAYON1

Date: 2026-11-14.

## References studied

- [Alisi Telengut's in-camera pastel animation](https://www.animatematerials.org/workshops/demo-alisi-telenguts-oil-pastel-animation-method/):
  physical surface ridges initially catch wax; drawing over the same canvas
  deposits pigment progressively; accumulated coating fills the low valleys
  and intermittently needs surface preparation.
- Rudolf, Mould & Neufeld, *A Bidirectional Deposition Model of Wax Crayons*:
  paper height, crayon contact area, nib pressure, deposition and smearing
  interact. The original work describes a more complete simulation than this
  lightweight SVG implementation.

## Existing engine and visual gap

CRAYON1 already contains short tapered nib stroke geometry, two wax layers,
paper fibers, a clip-to-silhouette mask, hand-painted stroke ordering and
fully opaque undercoat for characters. The previous paper tooth repeated
unrelated gray dots across the page and applied an identical pattern to
light/firm strokes; changing pressure mostly affected line width/opacity.

## Implemented iteration

- Introduce a page-seeded transparent **144×144 relief pattern** with bounded,
  short, asymmetric ridge fragments. No third-party textures.
- All regions sample exactly the same paper-space pattern, so neighboring
  marks and animated characters are not given independently randomized
  paper fibers.
- Vary the relief overlay's dark contact resistance continuously from the
  existing pressure scalar. Low pressure leaves stronger grain; firm
  pressure covers the interstices. Preserve the older base tooth pattern.
- Keep every final opaque character undercoat **outside** both paper masks.
- Add controlled material A/B in Storybook and tests asserting pressure
  response, seed stability, smooth-paper case, reversibility and occlusion.

## QA boundaries

This is a seeded optical approximation, not measured height-field
geometry or radiometrically faithful oil-pastel behavior. No embedded
copyrighted assets. Check both frame crops and normal-speed full exports;
the latter requires a real Storybook/browser render signoff.
