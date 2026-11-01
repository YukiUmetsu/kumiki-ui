import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoxGeometry, Color, IcosahedronGeometry, Mesh, MeshBasicMaterial,
  PlaneGeometry, Scene, SphereGeometry } from "three";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createCraftNaturalMaterial } from "../../registry/craft/natural-materials";
import type { CraftNaturalMaterialKind } from "../../registry/craft/natural-materials";
import { createCraftGlassMaterial } from "../../registry/craft/glass-materials";
import type { CraftGlassKind } from "../../registry/craft/glass-materials";
import { createCraftMineralDebris } from "../../registry/craft/mineral-debris";
import type { CraftMineralDebrisKind } from "../../registry/craft/mineral-debris";
import { createCraftScatter } from "../../registry/craft/scatter-placement";
import { createCraftStudio } from "../../registry/craft/studio-kit";

type Aspect = "landscape" | "portrait";
type SceneKind = "rock-sand" | "glass" | "particles";

const ROCK_SAND: CraftNaturalMaterialKind[] = ["granite", "basalt", "sandstone", "limestone",
  "river-pebble", "weathered-stone", "dry-sand", "wet-sand", "red-sand"];
const GLASS: CraftGlassKind[] = ["clear", "smoked", "amber", "frosted", "ribbed", "rain-streaked"];
const DEBRIS: CraftMineralDebrisKind[] = ["sand-grains", "rock-chips"];

/** Irregular rock specimen; normal maps add micro-relief, this provides the silhouette. */
function specimenRock(seed: number) {
  const geometry = new IcosahedronGeometry(.72, 4);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const displacement = 1 + .1 * Math.sin(x * 8.1 + z * 4.3 + seed) *
      Math.cos(y * 7.7 - seed * .19) + .055 * Math.sin(x * 16 + y * 13 + z * 11);
    position.setXYZ(i, x * displacement * 1.1, y * displacement * .84,
      z * displacement * .94);
  }
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

function MaterialLaboratory({ initialKind = "rock-sand", initialRock = "granite",
  initialGlass = "frosted" }: {
  initialKind?: SceneKind; initialRock?: CraftNaturalMaterialKind; initialGlass?: CraftGlassKind;
}) {
  const [kind, setKind] = useState<SceneKind>(initialKind);
  const [rock, setRock] = useState<CraftNaturalMaterialKind>(initialRock);
  const [glass, setGlass] = useState<CraftGlassKind>(initialGlass);
  const [debris, setDebris] = useState<CraftMineralDebrisKind>("sand-grains");
  const [seed, setSeed] = useState(23);
  const [frame, setFrame] = useState(58);
  const [aspect, setAspect] = useState<Aspect>("landscape");
  const [resolution, setResolution] = useState<128 | 256 | 512>(512);
  const timeline = useMemo(() => compileCameraPoses({
    id: "material-lab-camera", cameraId: "material-lab", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, index) => {
      const angle = -.48 + index / 120 * .96, r = aspect === "landscape" ? 3.3 : 4.2;
      const focus: [number, number, number] = [0, .58, 0];
      const position: [number, number, number] = [Math.sin(angle) * r, 1.75, Math.cos(angle) * r];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 46 }, near: .05, far: 50,
        focusDistance: r };
    }),
  }), [aspect]);

  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#9aa8ad");
    const studio = createCraftStudio({ mood: "studio", background: "#9aa8ad", ground: false });
    scene.add(studio.group);
    const disposables: Array<{ dispose: () => void }> = [];
    const own = <T extends { dispose: () => void }>(value: T): T => {
      disposables.push(value); return value;
    };
    const groundGeometry = own(new PlaneGeometry(8, 8, 2, 2));
    groundGeometry.rotateX(-Math.PI / 2);
    const sand = own(createCraftNaturalMaterial({ schemaVersion: 1, id: "lab-ground", seed,
      kind: kind === "rock-sand" && ROCK_SAND.includes(rock) ? rock : "dry-sand",
      repeat: [8, 8], resolution }));
    const ground = new Mesh(groundGeometry, sand.material);
    ground.receiveShadow = true; scene.add(ground);
    if (kind === "rock-sand") {
      const rockGeometry = own(specimenRock(seed));
      const finish = own(createCraftNaturalMaterial({ schemaVersion: 1, id: "lab-rock", seed,
        kind: rock, repeat: [2, 2], resolution }));
      const object = new Mesh(rockGeometry, finish.material);
      object.position.y = .59; object.castShadow = object.receiveShadow = true;
      object.name = "textured-irregular-rock"; scene.add(object);
    } else if (kind === "glass") {
      const glassSurface = own(createCraftGlassMaterial({ schemaVersion: 1, id: "lab-glass",
        seed, kind: glass, resolution, thickness: .66 }));
      // A closed sphere shows actual transmission. Behind-glass color bands
      // reveal refraction and color absorption better than a blank studio.
      const crystal = new Mesh(own(new SphereGeometry(.68, 80, 48)), glassSurface.material);
      crystal.name = "closed-glass-specimen"; crystal.position.y = .82;
      crystal.castShadow = false; crystal.receiveShadow = true; scene.add(crystal);
      const bands = ["#d2a380", "#53818a", "#ddc8a7", "#516b7b", "#e7c0a0"];
      bands.forEach((color, index) => {
        const panel = new Mesh(own(new BoxGeometry(.26, 1.7, .04)),
          own(new MeshBasicMaterial({ color })));
        panel.position.set((index - 2) * .28, .88, -.93);
        panel.name = `behind-glass-reference-${index}`;
        scene.add(panel);
      });
    } else {
      // Reuse the public surface-scatter placement pack. Static grit provides
      // parallax and silhouette detail; drifting dust is V09's job.
      const points = createCraftScatter({ schemaVersion: 1, id: "lab-grit-placements",
        seed, mode: "surface", count: debris === "sand-grains" ? 1800 : 450,
        minDistance: debris === "sand-grains" ? .036 : .105,
        minUpDot: .92, surfaceNormal: true, randomYaw: true,
        normalOffset: debris === "sand-grains" ? .01 : .04,
        scale: [.65, 1.4] }, ground);
      const grains = own(createCraftMineralDebris({ schemaVersion: 1, id: "lab-mineral-grit",
        seed, kind: debris }, points));
      scene.add(grains.mesh);
    }
    return { scene, dispose() { scene.clear(); disposables.reverse().forEach(value => value.dispose());
      studio.dispose(); } };
  }, [kind, rock, glass, debris, seed, resolution]);

  return <main data-km-craft-material-lab="" data-review-material-scene={kind}
    data-review-material-kind={rock} data-review-glass-kind={glass} data-review-debris-kind={debris}
    data-review-material-seed={seed} data-review-material-aspect={aspect}
    style={{ background: "#0b151b", minHeight: "100vh", color: "#f1f4f3",
      padding: "clamp(20px,4vw,52px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <p style={{ letterSpacing: ".13em", textTransform: "uppercase", fontSize: 12,
        color: "#aacdc4" }}>Material laboratory</p>
      <h1 style={{ fontWeight: 500, margin: "12px 0" }}>Stone, sand, glass and physical grit</h1>
      <p style={{ maxWidth: 820, lineHeight: 1.6, color: "#c1d1d4" }}>
        Inspect independently generated mineral grain and stratification, genuine physically
        transmitting glass on a closed specimen, or thousands of grounded, instanced grains.
        These are procedural supporting surfaces, not licensed photographic scans or approved hero assets.
      </p>
      <CameraViewport3D timeline={timeline} frame={frame} cameraId="material-lab" cameraMode="pose"
        createScene={createScene} width={aspect === "landscape" ? 1600 : 900}
        height={aspect === "landscape" ? 900 : 1600} pixelRatio={1.25}
        ariaLabel="Orbiting close-up material test under controlled studio lights"
        style={{ width: "100%" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "end", marginTop: 16 }}>
        <label>Material test <select aria-label="Material test" value={kind}
          onChange={e => setKind(e.target.value as SceneKind)}>
          <option value="rock-sand">Rock and sand</option><option value="glass">Physical glass</option>
          <option value="particles">Surface particles</option>
        </select></label>
        {kind === "rock-sand" && <label>Rock/sand finish <select aria-label="Rock/sand finish" value={rock}
          onChange={e => setRock(e.target.value as CraftNaturalMaterialKind)}>
          {ROCK_SAND.map(value => <option value={value} key={value}>{value}</option>)}
        </select></label>}
        {kind === "glass" && <label>Glass finish <select aria-label="Glass finish" value={glass}
          onChange={e => setGlass(e.target.value as CraftGlassKind)}>
          {GLASS.map(value => <option value={value} key={value}>{value}</option>)}
        </select></label>}
        {kind === "particles" && <label>Grit family <select aria-label="Grit family" value={debris}
          onChange={e => setDebris(e.target.value as CraftMineralDebrisKind)}>
          {DEBRIS.map(value => <option value={value} key={value}>{value}</option>)}
        </select></label>}
        <label>Output aspect <select aria-label="Output aspect" value={aspect}
          onChange={e => setAspect(e.target.value as Aspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select></label>
        <label>Texture size <select aria-label="Texture size" value={resolution}
          onChange={e => setResolution(Number(e.target.value) as 128 | 256 | 512)}>
          <option value={128}>128px</option><option value={256}>256px</option>
          <option value={512}>512px</option>
        </select></label>
        <label>Seed · {seed}<input aria-label="Seed" type="range" min="1" max="99" value={seed}
          onChange={e => setSeed(Number(e.target.value))} /></label>
        <label>Camera frame · {frame}<input aria-label="Camera frame" type="range" min="0" max="120"
          value={frame} onChange={e => setFrame(Number(e.target.value))} /></label>
      </div>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Material Laboratory", id: "craft-material-laboratory",
  component: MaterialLaboratory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof MaterialLaboratory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RockAndSand: Story = {};
export const GlassFinishes: Story = { args: { initialKind: "glass", initialGlass: "ribbed" } };
export const GroundParticles: Story = { args: { initialKind: "particles" } };
