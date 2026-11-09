# concept-car.glb

**"Car Concept"** by Eric Chadwick, © 2024 Darmstadt Graphics Group GmbH, from the Khronos glTF Sample Assets:
https://github.com/KhronosGroup/glTF-Sample-Assets/tree/7d4ba189827916452eeadc82d4b712dbc6280a6f/Models/CarConcept

Licensed under **Creative Commons Attribution 4.0 International** (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/legalcode

That asset was itself made from a public-domain (CC0) model, "Free Concept Car 004" by Unity Fan:
https://sketchfab.com/3d-models/free-concept-car-004-public-domain-cc0-4cba124633eb494eadc3bb0c4660ad7e

**Changes made for Kumiki UI (2026-11-08):**

- **Logos removed.** The Khronos Group logo, a trademark not covered by the licence, is removed. Its texture is taken out of the emissive slots of the rim, mirror, brake and hardware materials, whose emission is set to zero. The licence plate's image is replaced with a blank plate made for Kumiki UI.
- **Packed as one binary.** The glTF-JPG files are packed into a single binary glTF (GLB). Geometry, the other textures, materials and material variants are unchanged.
- **Rear kit added (2026-11-08).** A carbon diffuser with seven strakes and two side fences under the rear bumper, twin titanium exhaust tips, and an LED rain light over the licence plate, appended as new meshes, materials and textures under a node named `RearKit` by `scripts/assets/concept-car-rear-kit.py`. Nothing already in the file is changed.

This file is not covered by Kumiki UI's own licence; it keeps the CC BY 4.0 licence above. Credit as: "Car Concept" by Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0, modified (logos removed, rear kit added).
