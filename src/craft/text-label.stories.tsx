import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoxGeometry, Color, Mesh, Scene } from "three";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createCraftTextLabel } from "../../registry/craft/text-label";
import { createCraftSolidCuts } from "../../registry/craft/solid-cut";
import { createCraftMaterialKit } from "../../registry/craft/material-kit";
import { createCraftStudio } from "../../registry/craft/studio-kit";
import fontUrl from "../media/thumbnail-examples/Anton-Regular.ttf?url";

type Variant = "signage" | "instrument";

function TextLabelShowcase({ initial = "signage" }: { initial?: Variant }) {
  const [variant, setVariant] = useState<Variant>(initial);
  const [frame, setFrame] = useState(34);
  const [revision, setRevision] = useState(0);
  const [showOutlines, setShowOutlines] = useState(true);
  const timeline = useMemo(() => compileCameraPoses({
    id: `text-label-${variant}`, cameraId: "text-label-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, f) => {
      const t = f / 120, theta = -.28 + t * .57;
      const radius = 6.8;
      const position: [number, number, number] = [Math.sin(theta) * radius, .72 + .5 * t, Math.cos(theta) * radius];
      const focus: [number, number, number] = [0, 0, 0];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 33 }, near: .05, far: 40,
        focusDistance: radius };
    }),
  }), [variant]);
  const createScene = useCallback(() => {
    let live = true;
    const scene = new Scene(); scene.background = new Color("#111d26");
    const kit = createCraftMaterialKit({ overrides: {
      "painted-metal": { color: variant === "instrument" ? "#243440" : "#2b424d", roughness: .35 },
      "soft-touch": { color: "#071622" },
    } });
    const studio = createCraftStudio({ mood: "cinematic", ground: true, groundY: -1.3, background: "#192631" });
    scene.add(studio.group);
    const base = createCraftSolidCuts(variant === "signage" ? {
      schemaVersion: 1, id: "wayfinding-sign", body: { width: 4.7, height: 2.05, depth: .35 },
      apertures: [{ id: "fixing", face: "front", at: [.44, -.38], shape: "round", radius: .065, depth: .12 }],
    } : {
      schemaVersion: 1, id: "precision-control-panel", body: { width: 4.7, height: 2.05, depth: .38 },
      apertures: [{ id: "power-port", face: "front", at: [.37, -.29], shape: "round", radius: .24, depth: .18 }],
    }, { material: kit.get("painted-metal") });
    scene.add(base.mesh);
    const accentGeom = new BoxGeometry(4.1, .045, .032);
    const accent = new Mesh(accentGeom, kit.get("indicator"));
    accent.position.set(0, -.13, .21); accent.name = "physical-emphasis-rail";
    scene.add(accent);
    const common = { schemaVersion: 1 as const, fontUrl, anchorX: "left" as const, anchorY: "middle" as const,
      color: 0xf4efe0, outline: showOutlines ? { width: .009, color: 0x071421 } : undefined };
    const titles = variant === "signage" ? [
      { id: "sign-headline", text: "PLATFORM 04", at: [-1.95, .39, .207] as const, fontSize: .46 },
      { id: "sign-direction", text: "DEPARTURES  /  WEST", at: [-1.95, -.52, .206] as const, fontSize: .20 },
    ] : [
      { id: "instrument-headline", text: "FIELD UNIT 7", at: [-1.97, .39, .226] as const, fontSize: .43 },
      { id: "instrument-voltage", text: "12V DC  /  INPUT", at: [-1.97, -.52, .226] as const, fontSize: .19 },
    ];
    const labels = titles.map(label => createCraftTextLabel({ ...common, ...label }));
    for (const label of labels) scene.add(label.mesh);
    // CameraViewport3D is absolute-frame/paused: explicitly request a redraw
    // when Troika's async SDF worker has finished preparing all glyphs.
    void Promise.all(labels.map(label => label.ready)).then(() => {
      if (live) setRevision(value => value + 1);
    });
    return { scene, dispose() {
      live = false;
      labels.forEach(label => label.dispose());
      base.dispose(); accentGeom.dispose(); kit.dispose(); studio.dispose(); scene.clear();
    } };
  }, [variant, showOutlines]);

  return <main style={{ background: "#0b121a", color: "#eef4f5", minHeight: "100vh", padding: "clamp(20px, 4vw, 54px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1150, margin: "0 auto" }}>
      <p style={{ letterSpacing: ".15em", fontSize: 12, textTransform: "uppercase", color: "#93c4c7" }}>3D asset toolkit / crisp world-space lettering</p>
      <h1 style={{ fontWeight: 500, fontSize: "clamp(28px, 4vw, 44px)", margin: "10px 0" }}>Typeset words. Never hallucinated letters.</h1>
      <p style={{ color: "#a9bbc8", lineHeight: 1.6, maxWidth: 810 }}>Troika SDF text keeps exact wording sharp as the Three.js camera moves, with an explicitly supplied bundled font, scene-space pose and optional optical outline. The lettering is not baked into generated imagery.</p>
      <div style={{ marginTop: 25, border: "1px solid #304c57", borderRadius: 12, overflow: "hidden" }}>
        <CameraViewport3D timeline={timeline} frame={frame} cameraId="text-label-camera" cameraMode="pose" createScene={createScene}
          sceneRevision={revision} width={1600} height={900} ariaLabel="Crisp sign and device text mounted on physical 3D surfaces" style={{ width: "100%" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 24, marginTop: 22 }}>
        <label style={{ display: "grid", gap: 8 }}>Usage
          <select value={variant} onChange={event => setVariant(event.target.value as Variant)} style={{ padding: 10, background: "#20323d", color: "inherit" }}>
            <option value="signage">Architecture / wayfinding</option>
            <option value="instrument">Equipment / small labels</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 8, flex: "1 1 240px" }}>Camera frame · {frame}
          <input type="range" min="0" max="120" value={frame} onChange={event => setFrame(Number(event.target.value))} />
        </label>
        <label><input type="checkbox" checked={showOutlines} onChange={event => setShowOutlines(event.target.checked)} /> Subtle optical outline</label>
      </div>
      <p style={{ color: "#94a9b4", fontSize: 13, maxWidth: 800, lineHeight: 1.6, marginTop: 20 }}>These are flat SDF glyphs placed in 3D space, not physically extruded metal letters. The asset factory must supply a licensed .ttf/.otf/.woff font and await `ready` before capturing video frames. GPU close-up review is pending.</p>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Precise World Text", id: "craft-text-label", component: TextLabelShowcase,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof TextLabelShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Wayfinding: Story = {};
export const Equipment: Story = { args: { initial: "instrument" } };
