/** Everyday paper-world objects. Units = centimeters, positive Y is up.
 * Authored original models/print, no fetched textures, timers, or external rights.
 */
import {
  CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PlaneGeometry,
  TorusGeometry, TubeGeometry, CatmullRomCurve3, Vector3,
} from "three";
import type { BufferGeometry, Material } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "./hero-asset";
import type { AssetResources, HeroAsset } from "./hero-asset";
import { actionTime, captureRest, smooth } from "./hero-action";
import type { HeroActionSpec } from "./hero-action";
import { paintTexture } from "./canvas-texture";
import { applySurfaceDetail } from "./surface-detail";
import { roundedSlab } from "./shapes";

export type EverydayObjectKind = "paper" | "invoice" | "folder" | "pen";

export interface EverydayDocumentContent {
  title?: string;
  sender?: string;
  reference?: string;
  rows?: readonly { label: string; value: string }[];
  total?: string;
  status?: string;
}
export interface EverydayObjectOptions {
  id?: string;
  color?: string;
  accent?: string;
  document?: EverydayDocumentContent;
  /** Zero-based printed line to reveal with the deterministic `highlight` action. */
  highlightRow?: number;
}

function add(res: AssetResources, parent: Group, geo: BufferGeometry, mat: Material, name: string,
  at: readonly [number, number, number] = [0, 0, 0]) {
  const mesh = new Mesh(res.own(geo), mat);
  mesh.position.set(...at);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(res.name(mesh, name));
  return mesh;
}

function printDocument(ctx: CanvasRenderingContext2D, w: number, h: number,
  kind: "invoice" | "paper", doc: EverydayDocumentContent, accent: string) {
  // Texture-space typography is crisp at close-up; the underlying sheet handles
  // paper light response and soft edge shadows. This is illustrative document copy.
  ctx.fillStyle = "#f2f0e8"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#24303e"; ctx.textAlign = "left";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText(doc.sender ?? "STUDIO DOCUMENTS", 85, 112, w - 170);
  ctx.fillStyle = accent; ctx.fillRect(85, 151, w - 170, 6);
  ctx.fillStyle = "#1f2a35";
  ctx.font = "700 86px system-ui, sans-serif";
  ctx.fillText(doc.title ?? (kind === "invoice" ? "INVOICE" : "PROJECT NOTES"), 85, 285, w - 170);
  ctx.fillStyle = "#56636a"; ctx.font = "600 32px system-ui, sans-serif";
  ctx.fillText(doc.reference ?? (kind === "invoice" ? "REFERENCE  ·  0001" : "A blank page for fresh ideas"), 85, 353, w - 170);
  const rows = doc.rows ?? (kind === "invoice" ? [
    { label: "Creative direction", value: "$ 800.00" },
    { label: "Design system", value: "$ 540.00" },
    { label: "Production", value: "$ 260.00" },
  ] : [
    { label: "Plan the story", value: "01" },
    { label: "Find the main idea", value: "02" },
    { label: "Explain the result", value: "03" },
  ]);
  ctx.strokeStyle = "#a6b4b3"; ctx.lineWidth = 3;
  let y = 500;
  for (const row of rows.slice(0, 8)) {
    ctx.beginPath(); ctx.moveTo(85, y - 45); ctx.lineTo(w - 85, y - 45); ctx.stroke();
    ctx.fillStyle = "#24343b"; ctx.font = "600 39px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(row.label, 90, y + 14, w * .59);
    ctx.textAlign = "right"; ctx.fillText(row.value, w - 90, y + 14, w * .27);
    y += 135;
  }
  if (kind === "invoice") {
    const totalY = Math.max(y + 45, 1410);
    ctx.fillStyle = "#dce8e3"; ctx.fillRect(85, totalY - 60, w - 170, 118);
    ctx.fillStyle = "#273b41"; ctx.textAlign = "left"; ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText("TOTAL", 116, totalY + 15);
    ctx.textAlign = "right"; ctx.font = "bold 54px system-ui, sans-serif";
    ctx.fillText(doc.total ?? "$ 1,600.00", w - 112, totalY + 24, w * .5);
  }
  ctx.fillStyle = accent; ctx.font = "bold 28px system-ui, sans-serif"; ctx.textAlign = "left";
  ctx.fillText(doc.status ?? (kind === "invoice" ? "PREPARED" : "WORK IN PROGRESS"), 90, h - 105);
  ctx.fillStyle = "#9ca4a9"; ctx.fillRect(90, h - 75, w - 180, 2);
}

const LIFT_ACTIONS: readonly HeroActionSpec[] = [
  { id: "lift", label: "Lift from surface", durationFrames: 60, loop: false, meaning: "Select and lift an object above a tabletop." },
  { id: "slide", label: "Slide across surface", durationFrames: 60, loop: false, meaning: "Move an object without lifting it." },
];

function documentAsset(res: AssetResources, root: Group, kind: "paper" | "invoice", options: EverydayObjectOptions) {
  const W = 21, D = 29.7;
  const sheet = res.own(new MeshPhysicalMaterial({ color: options.color ?? "#f9f7f0", roughness: .9,
    metalness: 0, sheen: .19, sheenColor: "#fff7e6" }));
  const edge = res.own(new MeshPhysicalMaterial({ color: "#e5dfd1", roughness: .98 }));
  add(res, root, roundedSlab(W, D, .068, .15, { bevel: .012 }), edge, "paper-fiber-edge");
  add(res, root, new RoundedBoxGeometry(W - .14, .014, D - .14, 2, .045), sheet,
    "paper-face-stock", [0, .068, 0]);
  const texture = res.own(paintTexture(1280, 1800, (ctx,w,h) =>
    printDocument(ctx, w, h, kind, options.document ?? {}, options.accent ?? "#547e88"),
  { fallback: [250, 249, 244, 255], anisotropy: 16 }));
  const ink = res.own(new MeshPhysicalMaterial({ map: texture, transparent: false, roughness: .88,
    metalness: 0, depthWrite: true }));
  const front = add(res, root, new PlaneGeometry(W - .4, D - .4), ink, "document-print", [0, .085, 0]);
  front.rotation.x = -Math.PI / 2;
  const corner = add(res, root, new PlaneGeometry(2.1, 2.1), sheet, "paper-corner-fiber", [W / 2 - 1.13, .095, -D / 2 + 1.13]);
  corner.rotation.set(-Math.PI / 2, 0, -.05);
  // Keep emphasis in the document plane, a hair above the printed ink. It
  // follows the actual authored row coordinates, even when the paper moves.
  const selected = options.highlightRow ?? 0;
  const marker = new Group();
  marker.position.set(-W / 2 + 1.55, .102, -D / 2 + (490 + selected * 135) / 1800 * D);
  marker.visible = false;
  root.add(res.name(marker, "document-highlight-region"));
  const markerMat = res.own(new MeshBasicMaterial({ color: "#dfb04c", transparent: true,
    opacity: .42, depthWrite: false, toneMapped: false }));
  const stripe = add(res, marker, new PlaneGeometry(W - 3.1, 1.65), markerMat,
    "document-marker-wash", [(W - 3.1) / 2, 0, 0]);
  stripe.rotation.x = -Math.PI / 2;
  // Restrained edge cue: the viewer can locate the chosen passage even when
  // soft paper lighting reduces the perceived saturation of the wash.
  const markerEdge = res.own(new MeshBasicMaterial({ color: "#b98935", transparent: true,
    opacity: .72, depthWrite: false, toneMapped: false }));
  const edgeCue = add(res, marker, new PlaneGeometry(.13, 1.7), markerEdge,
    "document-marker-edge", [.09, .003, 0]);
  edgeCue.rotation.x = -Math.PI / 2;
  return { bounds: { min: [-W / 2, 0, -D / 2], max: [W / 2, .2, D / 2] } as const,
    materials: ["off-white long-fiber paper", "matte printed pigment"],
    details: ["physical paper edge", "high-resolution authored print", "slightly curled corner", "row-aligned translucent ink emphasis"], marker };
}

function folderAsset(res: AssetResources, root: Group, options: EverydayObjectOptions) {
  const W = 24, D = 32;
  const fiber = res.own(applySurfaceDetail(new MeshPhysicalMaterial({
    color: options.color ?? "#354f4d", roughness: .92, metalness: 0, sheen: .12,
  }), { kind: "stone", frequency: 75, strength: .0006, roughnessVariation: .2 }));
  const inside = res.own(new MeshPhysicalMaterial({ color: "#e2dac7", roughness: .94 }));
  const brass = res.own(new MeshPhysicalMaterial({ color: "#b69b72", metalness: .83, roughness: .31 }));
  add(res, root, roundedSlab(W, D, .11, .3, { bevel: .025 }), fiber, "folder-back-board");
  add(res, root, roundedSlab(W - 1, D - 1, .027, .22), inside, "folder-interior", [0, .11, 0]);
  // A thin editable folio is physically retained beneath the lower pocket,
  // so the open action reveals purposeful content instead of an empty board.
  const insertMap = res.own(paintTexture(900, 1200, (ctx, w, h) =>
    printDocument(ctx, w, h, "paper", options.document ?? {
      sender: "ARCHIVE / 01", title: "PROJECT FILE", reference: "REFERENCE · 2026",
      rows: [{ label: "Brief and research", value: "01" }, { label: "Supporting notes", value: "02" }],
    }, "#52776e"), { fallback: [248, 246, 238, 255], anisotropy: 16 }));
  const insertMat = res.own(new MeshPhysicalMaterial({ map: insertMap, roughness: .95, metalness: 0 }));
  const insert = add(res, root, new PlaneGeometry(19, 27), insertMat, "folder-retained-document", [0, .157, -1.0]);
  insert.rotation.x = -Math.PI / 2;
  const pocket = add(res, root, roundedSlab(W - .5, D * .35, .045, .2), fiber,
    "folder-pocket", [0, .14, D * .31]);
  pocket.rotation.x = .014;
  const flap = new Group();
  flap.position.set(0, .19, -D / 2 + .2);
  root.add(res.name(flap, "folder-front-flap"));
  add(res, flap, roundedSlab(W, D - .4, .09, .3, { bevel: .017 }), fiber,
    "folder-cover-board", [0, 0, (D - .4) / 2]);
  add(res, flap, new RoundedBoxGeometry(5.3, .035, 2.2, 2, .16), inside,
    "folder-label-tab", [W / 2 - 3.3, .10, D - 2.1]);
  for (const x of [-8.5, 8.5]) add(res, flap, new TorusGeometry(.25, .075, 8, 28), brass,
    `folder-rivet-${x}`, [x, .115, 1.1]).rotation.x = -Math.PI / 2;
  return { flap, bounds: { min: [-W / 2 - .2, 0, -D / 2], max: [W / 2 + .2, 29, D / 2 + .2] } as const,
    materials: ["textured archival cover stock", "uncoated inner lining", "satin brass rivets"],
    details: ["independent folding front board", "retained printed folio", "document pocket", "label tab", "two reinforcing rivets"] };
}

function penAsset(res: AssetResources, root: Group, options: EverydayObjectOptions) {
  const metal = res.own(applySurfaceDetail(new MeshPhysicalMaterial({
    color: options.color ?? "#8d928d", metalness: .97, roughness: .27, clearcoat: .23,
  }), { kind: "brushed", flow: [0, 1, 0], strength: .00028 }));
  const grip = res.own(new MeshPhysicalMaterial({ color: "#252a2b", roughness: .76 }));
  const ink = res.own(new MeshPhysicalMaterial({ color: "#171f26", metalness: .15, roughness: .24 }));
  const barrel = new Group();
  barrel.position.set(0, .42, 0); barrel.rotation.z = Math.PI / 2;
  root.add(res.name(barrel, "pen-barrel-axis"));
  add(res, barrel, new CylinderGeometry(.42, .43, 10.1, 40), metal, "pen-brushed-barrel", [0, .7, 0]);
  add(res, barrel, new CylinderGeometry(.45, .43, 2.4, 40), grip, "pen-rubber-grip", [0, -5.6, 0]);
  add(res, barrel, new CylinderGeometry(.13, .42, 1.2, 40), metal, "pen-metal-nib", [0, -7.25, 0]);
  add(res, barrel, new CylinderGeometry(.045, .09, .35, 24), ink, "pen-writing-tip", [0, -8, 0]);
  add(res, barrel, new CylinderGeometry(.46, .46, .5, 32), metal, "pen-cap-seam", [0, 6.03, 0]);
  const curve = new CatmullRomCurve3([
    new Vector3(.45, 6.1, 0), new Vector3(.76, 5.8, 0), new Vector3(.7, 4.2, 0), new Vector3(.55, 3.0, 0),
  ]);
  add(res, barrel, new TubeGeometry(curve, 32, .09, 8, false), metal, "pen-machined-clip");
  return { bounds: { min: [-7.5, 0, -.55], max: [8.5, .95, .55] } as const,
    materials: ["directional brushed aluminum", "micro-textured rubber grip", "dark ballpoint ink"],
    details: ["tapered metal nib", "separate writing tip", "machined pocket clip", "barrel seam"] };
}

export function createEverydayObject(kind: EverydayObjectKind, options: EverydayObjectOptions = {}): HeroAsset {
  // Validate before allocating textures and GPU-backed assets so rejected
  // authoring data cannot strand resource owners during a batch export.
  if ((kind === "paper" || kind === "invoice") && options.highlightRow !== undefined &&
      (!Number.isInteger(options.highlightRow) || options.highlightRow < 0 ||
        options.highlightRow >= Math.min(8, options.document?.rows?.length ?? 3)))
    throw new Error("highlightRow must select an existing printed document line (0–7).");
  const res = createAssetResources();
  const group = new Group(); group.name = options.id ?? kind;
  const built = kind === "folder" ? folderAsset(res, group, options) : kind === "pen"
    ? penAsset(res, group, options) : documentAsset(res, group, kind, options);
  const flap = "flap" in built ? built.flap : undefined;
  const marker = "marker" in built ? built.marker : undefined;
  const rest = captureRest([group, ...(flap ? [flap] : []), ...(marker ? [marker] : [])]);
  const actions: HeroActionSpec[] = [
    ...LIFT_ACTIONS,
    ...(kind === "folder" ? [{ id: "open", label: "Open cover", durationFrames: 60, loop: false,
      meaning: "Reveal the folder's inner pocket through a paperboard hinge." }] : []),
    ...(marker ? [{ id: "highlight", label: "Highlight selected line", durationFrames: 36, loop: false,
      meaning: "Reveal a translucent emphasis wash exactly over the selected printed row." }] : []),
  ];
  return {
    id: group.name, group, parts: res.parts, bounds: built.bounds,
    metersPerUnit: .01, tier: "hero", exposure: .94,
    studio: { palette: "ivory", keyAzimuth: -32 },
    craft: { materials: built.materials, details: built.details },
    actions,
    pose(state) {
      rest.restore();
      if (!state.id) return;
      const action = actions.find(a => a.id === state.id);
      if (!action) throw new Error(`Unsupported ${kind} action: ${state.id}`);
      const t = smooth(actionTime(action, state.frame, state.fps));
      if (state.id === "lift") { group.position.y = 3.2 * t; group.rotation.z = -.08 * t; }
      if (state.id === "slide") group.position.x = 4 * t;
      if (state.id === "open" && flap) flap.rotation.x = -2.32 * t;
      if (state.id === "highlight" && marker) { marker.visible = t > 0; marker.scale.x = t; }
    },
    dispose: res.dispose,
  };
}
