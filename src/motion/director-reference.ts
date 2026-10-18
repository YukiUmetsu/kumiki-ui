import { createCameraTimeline } from "../../registry/motion/camera";
import { AnimationGroup, CinematicShot, ScenePreset, motionTimelineGroup } from "../../registry/motion/director-authoring";
import { cinematicRevealRecipe, diagramConstructionRecipe, particleAssemblyRecipe, sceneContinuityRecipe, sequentialDataFlowRecipe, synchronizedTransformationsRecipe, technicalExplanationRecipe } from "../../registry/motion/director-recipes";
import { compileMotionDirector } from "../../registry/motion/motion-director";
import type { DirectorNode, DirectorProfile, MotionDirection } from "../../registry/motion/director-types";
import type { ColorValue, Vec2 } from "../../registry/motion/types";
import type { VisualElement, VisualScene } from "../../registry/motion/visual-transformation-types";

export const DIRECTOR_BEATS = [
  { title: "Gather the pieces.", claim: "Independent signals become a legible field.", detail: "Thirty-six objects arrive on their own trajectories, then pause so the pattern can be read.", caption: "Independent motion. Shared purpose.", label: "Gather" },
  { title: "Give motion a route.", claim: "Connections define where information can travel.", detail: "Packets move along the authored route while the camera moves with the subjects.", caption: "Connections turn a collection into a process.", label: "Connect" },
  { title: "Build the mechanism.", claim: "A complex structure is easier to read in stages.", detail: "Overlapping construction groups establish one relationship at a time, with holds between ideas.", caption: "Establish. Explain. Leave room to read.", label: "Construct" },
  { title: "Run in parallel.", claim: "Independent groups can arrive at one shared moment.", detail: "Three lanes move concurrently. Two separately compiled transformations share the same frame domain.", caption: "Different paths. One synchronized handoff.", label: "Synchronize" },
  { title: "Focus the result.", claim: "A camera move and object reveal can reinforce each other.", detail: "The field concentrates around a focal object. A restrained lift and camera approach share their timing.", caption: "Motion directs attention to what changed.", label: "Reveal" },
  { title: "Keep the same idea.", claim: "Identity survives a change in arrangement.", detail: "The original thirty-six objects form a compact recap; the same reveal recipe is reused on a second set.", caption: "Gather → Connect → Resolve", label: "Resolve" },
] as const;
export const DIRECTOR_THEMES = {
  "theme-a": { surface: "#eff2f5", ink: "#172e3a", muted: "#4e6572", accent: "#176775", secondary: "#95aab2", line: "#bccbd1" },
  "theme-b": { surface: "#142731", ink: "#f0f4f2", muted: "#b1c5cc", accent: "#84d1ce", secondary: "#597e8b", line: "#3b5663" },
};
type Theme = typeof DIRECTOR_THEMES["theme-a"];
const ids = Array.from({ length: 36 }, (_, i) => `unit-${i}`);
const packets = Array.from({ length: 6 }, (_, i) => `packet-${i}`);
const fps = { num: 30, den: 1 };
const durationFrames = 1620;
const beatFrames = 270;
const color = (hex: string): ColorValue => ({ space: "srgb", r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), alpha: 1 });

function arrangement(portrait: boolean, theme: Theme): { width: number; height: number; direction: MotionDirection } {
  const width = portrait ? 720 : 1280, height = portrait ? 1280 : 720;
  const center = { x: width / 2, y: portrait ? 650 : 412 };
  const cluster = (i: number, cols: number, gap = 30): Vec2 => ({ x: (i % cols - (cols - 1) / 2) * gap, y: (Math.floor(i / cols) - (Math.ceil(36 / cols) - 1) / 2) * gap });
  function pose(beat: number, i: number): Vec2 {
    const lane = Math.floor(i / 6), item = i % 6;
    let x = center.x, y = center.y;
    if (beat === 0) { const p = cluster(i, 6, portrait ? 52 : 43); x += p.x; y += p.y; }
    if (beat === 1) {
      x = portrait ? 235 + (lane % 2) * 250 : 170 + lane * 188;
      y = portrait ? 400 + Math.floor(lane / 2) * 228 : center.y;
      x += (item % 2 - 0.5) * 30; y += (Math.floor(item / 2) - 1) * 30;
    }
    if (beat === 2) {
      const anchors = portrait ? [[180, 390], [480, 390], [180, 650], [480, 650], [180, 910], [480, 910]] : [[210, 320], [640, 300], [1070, 320], [210, 505], [640, 525], [1070, 505]];
      [x, y] = anchors[lane]; x += (item % 3 - 1) * 28; y += (Math.floor(item / 3) - 0.5) * 28;
    }
    if (beat === 3) {
      const section = Math.floor(i / 12), n = i % 12;
      x = portrait ? 180 + section * 180 : 220 + (n % 6) * 168;
      y = portrait ? 365 + n * 50 : 315 + section * 112 + Math.floor(n / 6) * 30;
    }
    if (beat === 4) {
      const angle = i / 36 * Math.PI * 2 - Math.PI / 2;
      x += Math.cos(angle) * (portrait ? 205 : 190); y += Math.sin(angle) * (portrait ? 260 : 170);
    }
    if (beat === 5) {
      const section = Math.floor(i / 12), n = i % 12;
      x = portrait ? center.x + (n % 4 - 1.5) * 47 : 260 + section * 380 + (n % 4 - 1.5) * 37;
      y = portrait ? 390 + section * 245 + (Math.floor(n / 4) - 1) * 40 : center.y + (Math.floor(n / 4) - 1) * 37;
    }
    return { x, y };
  }
  const text = (id: string, copy: string, x: number, y: number, size = 20): VisualElement => ({ id, semanticId: id,
    transform: { a: 1, b: 0, c: 0, d: 1, e: x, f: y }, fill: color(theme.muted),
    content: { kind: "text", text: copy, fontSize: size, fontFamily: '"Geist Variable", Arial, sans-serif', bounds: { x: 0, y: 0, width: 320, height: 40 } } });
  const scenes: VisualScene[] = DIRECTOR_BEATS.map((_, b) => {
    const elements: VisualElement[] = [];
    if (b === 1 || b === 2) for (let lane = 0; lane < 5; lane++) {
      const a = pose(b, lane * 6), z = pose(b, (lane + 1) * 6);
      // Routes and packet waypoints share the cluster's actual center.
      const dx = b === 1 ? 15 : 28, dy = b === 1 ? 30 : 14;
      elements.push({ id: `edge-${lane}`, semanticId: `edge-${lane}`, stroke: color(theme.line), strokeWidth: 2, fill: { ...color(theme.line), alpha: 0 },
        content: { kind: "svg-path", bounds: { x: 0, y: 0, width, height }, d: `M${a.x + dx},${a.y + dy} L${z.x + dx},${z.y + dy}` } });
    }
    elements.push(...ids.map((id, i): VisualElement => {
      const p = pose(b, i), side = b === 4 ? 16 : 20;
      return { id, semanticId: id, transform: { a: 1, b: 0, c: 0, d: 1, e: p.x, f: p.y },
        fill: color(i % 6 === 0 ? theme.accent : i % 3 === 0 ? theme.ink : theme.secondary),
        content: { kind: "shape", bounds: { x: -side / 2, y: -side / 2, width: side, height: side }, shape: { contours: [{ closed: true, points: [
          { x: -side / 2, y: -side / 2 }, { x: side / 2, y: -side / 2 }, { x: side / 2, y: side / 2 }, { x: -side / 2, y: side / 2 },
        ] }] } } };
    }));
    if (b === 1) elements.push(...packets.map((id): VisualElement => ({ id, semanticId: id, fill: color(theme.accent), content: { kind: "shape", bounds: { x: -5, y: -5, width: 10, height: 10 }, shape: { contours: [{ closed: true, points: [{ x: 0, y: -7 }, { x: 7, y: 0 }, { x: 0, y: 7 }, { x: -7, y: 0 }] }] } } })));
    if (b === 0) elements.push(text("field-label", "36 independent signals", center.x - 116, portrait ? 905 : 585));
    if (b === 1 || b === 2) for (let lane = 0; lane < 6; lane++) {
      const p = pose(b, lane * 6);
      elements.push(text(`lane-${lane}`, ["Receive", "Route", "Process", "Combine", "Check", "Return"][lane], p.x - 25, p.y + (b === 1 ? 95 : 80), 18));
    }
    if (b === 3) ["A", "B", "C"].forEach((name, i) => elements.push(text(`parallel-${name}`, `Group ${name}`, portrait ? 135 + i * 180 : 105, portrait ? 320 : 320 + i * 112, 18)));
    if (b === 4) {
      elements.push(text("result-name", "One result", center.x - 110, center.y - 20, 36));
      elements.push(text("result-note", "many coordinated parts", center.x - 107, center.y + 30, 18));
    }
    if (b === 5) ["Gather", "Connect", "Resolve"].forEach((copy, i) => elements.push(text(`recap-${i}`, copy, portrait ? center.x - 50 : 210 + i * 380, portrait ? 490 + i * 245 : 535, 24)));
    return { id: `scene-${b}`, elements };
  });
  const children: DirectorNode[] = [
    ...DIRECTOR_BEATS.map((beat, b) => CinematicShot({ id: `shot-${b}`, at: b * beatFrames, durationFrames: beatFrames,
      sceneRef: scenes[b].id, focusTarget: ids[b * 6], cameraRef: "camera", claim: beat.claim, visualObjective: beat.detail,
      onScreenLabels: [beat.title], narrationCue: `voice-${b}`, staticFallback: beat.caption,
      children: [
        { kind: "cue", id: `voice-${b}`, at: 12, durationFrames: 186, payload: { kind: "narration", text: beat.detail, language: "en" } },
        { kind: "cue", id: `marker-${b}`, at: 45, payload: { kind: "speech-marker", narrationId: `voice-${b}`, marker: beat.label } },
        { kind: "hold", id: `reading-hold-${b}`, at: 175, durationFrames: 35 },
      ],
    })),
    particleAssemblyRecipe.create({ id: "assemble", at: { ref: "marker-0", offsetFrames: -33 }, durationFrames: 82, staggerFrames: 2, subjects: ids.map((targetId, i) => ({ targetId,
      offset: { x: Math.cos(i * 2.4) * (portrait ? 170 : 350), y: Math.sin(i * 2.4) * 145 }, rotation: (i % 5 - 2) * 0.5 })) }),
    sequentialDataFlowRecipe.create({ id: "flow", at: { ref: "shot-1", offsetFrames: 30 }, durationFrames: 120, staggerFrames: 10, packets: packets.map((targetId) => ({ targetId,
      waypoints: Array.from({ length: 6 }, (_, lane) => { const p = pose(1, lane * 6); return { x: p.x + 15, y: p.y + 30 }; }) })) }),
    diagramConstructionRecipe.create({ id: "construct", at: 558, durationFrames: 28, holdFrames: 8, stages: Array.from({ length: 6 }, (_, i) => ids.slice(i * 6, i * 6 + 6)) }),
    AnimationGroup({ id: "parallel-lanes", at: 830, mode: "parallel", children: [0, 1, 2].map(i => cinematicRevealRecipe.create({ id: `lane-reveal-${i}`, at: i * 9, durationFrames: 90, targets: ids.slice(i * 12, i * 12 + 12), distance: 18 + i * 8 })) }),
    cinematicRevealRecipe.create({ id: "hero-reveal", at: 1100, durationFrames: 115, targets: ids, distance: 12 }),
    technicalExplanationRecipe.create({ id: "recap-explanation", at: 1365, durationFrames: 26, targets: [ids[0], ids[12], ids[24]], includeRecap: false }),
    cinematicRevealRecipe.create({ id: "recap-reuse", at: 1510, durationFrames: 50, targets: ids.slice(12, 24), distance: 9 }),
    ...scenes.slice(0, -1).map((scene, b) => sceneContinuityRecipe.create({ id: `handoff-${b}`, at: { ref: `shot-${b}`, edge: "end", offsetFrames: -60 }, durationFrames: 60, fromScene: scene.id, toScene: scenes[b + 1].id, strategy: "auto" })),
  ];
  // Existing camera authorship, imported as MG1 channels rather than rebuilt.
  children.push(motionTimelineGroup(createCameraTimeline({ id: "reference-camera", fps, durationFrames,
    keyframes: [
      { frame: 0, center, zoom: 1 }, { frame: 170, center, zoom: 1 },
      { frame: 345, center: { x: center.x + (portrait ? 0 : 18), y: center.y }, zoom: 1.04 },
      { frame: 510, center, zoom: 1 }, { frame: 780, center, zoom: 1 },
      { frame: 1060, center, zoom: 1.02 }, { frame: 1200, center, zoom: 1.12 },
      { frame: 1350, center, zoom: 1 }, { frame: 1619, center, zoom: 1 },
    ] }), { id: "camera-choreography" }));
  // Two simultaneous VT1 compositions occupy independent overlay subjects.
  const smallScenes: VisualScene[] = [0, 1].flatMap(part => [0, 1].map(state => ({ id: `sync-${part}-${state}`, elements: [{
    id: `sync-${part}`, semanticId: `sync-${part}`, fill: color(theme.accent),
    transform: { a: 1, b: 0, c: 0, d: 1, e: center.x + (part ? 45 : -45), f: portrait ? 1030 : 615 },
    content: { kind: "shape" as const, bounds: { x: -12, y: -12, width: 24, height: 24 }, shape: { contours: [{ closed: true, points: state
      ? [{ x: 0, y: -12 }, { x: 12, y: 0 }, { x: 0, y: 12 }, { x: -12, y: 0 }]
      : [{ x: -12, y: -12 }, { x: 12, y: -12 }, { x: 12, y: 12 }, { x: -12, y: 12 }] }] } },
  }] })));
  children.push(synchronizedTransformationsRecipe.create({ id: "synchronized-shapes", at: 890, transformations: [0, 1].map(part => ({ fromScene: `sync-${part}-0`, toScene: `sync-${part}-1`, durationFrames: 72, strategy: "geometric-morph" })) }));
  return { width, height, direction: { schemaVersion: 1, id: `director-reference-${portrait ? "portrait" : "landscape"}`, title: "From signals to a system", fps, durationFrames,
    targets: [...ids, ...packets, "camera"], scenes: [...scenes, ...smallScenes], children } };
}

export function createDirectorReference(options: { aspect?: "landscape" | "portrait"; theme?: keyof typeof DIRECTOR_THEMES; profile?: DirectorProfile } = {}) {
  const theme = DIRECTOR_THEMES[options.theme ?? "theme-a"];
  const preset = ScenePreset({ id: "signal-system", variants: { landscape: arrangement(false, theme), portrait: arrangement(true, theme) } });
  const selected = preset.create(options.aspect ?? "landscape", options.profile);
  const result = compileMotionDirector(selected.direction);
  if (!result.ok) throw new Error(result.diagnostics.map(d => `${d.path ?? d.code}: ${d.message}`).join("\n"));
  return { ...selected, director: result.director, theme };
}
