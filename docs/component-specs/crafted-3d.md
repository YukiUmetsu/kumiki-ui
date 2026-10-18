# Crafted 3D — reusable material, studio and constructed asset kit

Optional `crafted-3d` source registry item. Requires Three.js, not imported
by the ordinary UI primitives. No third-party models, textures, HDR downloads,
or proprietary assets.

```ts
const surfaces = createCraftMaterialKit({
  overrides: { "anodized-metal": { color: "#596b80" } },
});
const studio = createCraftStudio({ mood: "studio", groundY: -.45 });
const reflections = createCraftEnvironment({ mood: "neutral" });
const restore = reflections.apply(scene);
const enclosure = createCraftedEnclosure({
  id: "router", materials: surfaces, ports: 4, quality: "hero",
});
scene.add(studio.group, enclosure.group);
// enclosure.parts: real named geometry for component-level camera targets.
// enclosure.asset / attachments: semantically declared ports and components.
// createThreeCameraTargets can register specific meshes as camera subjects.
// When the scene goes away:
restore(); reflections.dispose(); enclosure.dispose(); studio.dispose(); surfaces.dispose();
```

Surfaces are physically distinct PBR materials: machined/anodized metals,
painted metal, molded/soft-touch polymers, elastomer, ceramic, glass, display
and indicators. Selected materials use deterministic, tiny *roughness* maps,
not uniform decorative noise. The light rig separates key/fill/rim/hemisphere,
provides contact shadows and exposes distinct studio/technical/cinematic moods.
The generated, deterministic equirectangular reflection map supplies controlled
softboxes to metal/glass without downloading HDRs or mutating the renderer.
The enclosure is actual layered geometry: seam/gasket, vent channels and lips,
fasteners/slots, inset Ethernet socket wells and pins, physical controls, a
power socket and rubber feet. Hero/supporting profiles change meaningful
detail density; they do not falsely certify photorealism.

The created object owns its geometries, but never disposes an externally
supplied material kit. The studio owns its lights and floor. Caller owns
renderer, environmental reflections, asset licenses, camera and output encoding.
Material response and visual craftsmanship still require close-up inspection.
See **Craft → 3D Constructed Enclosure** in Storybook.

The enclosure is a reference *component*, not a claim of exact electrical,
regulatory or manufacturer compliance. For an actual product, replace its
dimensions and constructed parts with verified engineering geometry.
