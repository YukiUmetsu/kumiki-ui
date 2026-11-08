/** Crafted technology hero assets: laptop, smartphone and server rack.
 *
 * Hard-surface construction at real dimensions (1 unit = 1 cm for the laptop
 * and phone, 10 cm for the rack): anodized aluminium unibody with chamfers,
 * recessed keyboard with instanced keycaps, glass trackpad, hinge and bezel;
 * a phone with machined frame, island cutout, lathe-turned lens stacks and
 * side controls; a 42U rack of servers with drive bays, vents, instanced
 * status LEDs and patch cables. Screens are painted, generic, brand-free UIs.
 */
import {
  BoxGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, RingGeometry, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3,
} from "three";
import type { BufferGeometry, Material, Texture } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import type { AssetResources, HeroAsset } from "../craft/hero-asset";
import { paintTexture, paintWithRelief, seededRandom } from "../craft/canvas-texture";
import { applySurfaceDetail } from "../craft/surface-detail";
import { roundedSlab } from "../craft/shapes";
import { actionTime, captureRest, easeInOut, findAction, pulse, smooth, spring, TAU, window01 } from "../craft/hero-action";
import type { HeroActionSpec, HeroActionState } from "../craft/hero-action";

const UI_FONT = '"SF Pro Display", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';

function add(res: AssetResources, parent: Group, geometry: BufferGeometry, material: Material, name: string, at?: [number, number, number]) {
  const mesh = new Mesh(res.own(geometry), material);
  if (at) mesh.position.set(...at);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(res.name(mesh, name));
  return mesh;
}


// ------------------------------------------------------------------ painted screens

/** Authored screens remain textures at 2048px rather than tiny WebGL text. */
export interface LaptopScreenContent {
  title: string;
  status: string;
  view?: "analytics" | "document-record";
  record?: { title?: string; sender?: string; reference?: string; total?: string };
  /** Whether the record has arrived in the software yet. */
  confirmed?: boolean;
}

/** Brand-neutral document intake, with a distinct awaiting/received state. */
const documentRecord = (ctx: CanvasRenderingContext2D, w: number, h: number, content: LaptopScreenContent) => {
  const done = content.confirmed === true;
  const rect = (x: number, y: number, width: number, height: number, radius: number, fill: string) => {
    ctx.fillStyle = fill; roundRect(ctx, x, y, width, height, radius); ctx.fill();
  };
  ctx.fillStyle = "#101923"; ctx.fillRect(0, 0, w, h);
  rect(0, 0, w * .155, h, 0, "#17222d");
  rect(w * .026, h * .061, h * .038, h * .038, h * .011, "#b6d8cd");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e9f2ee"; ctx.font = `650 ${Math.round(h * .04)}px ${UI_FONT}`;
  ctx.fillText("RECORDS", w * .055, h * .091, w * .084);
  const nav = ["Overview", "Documents", "Workflows", "Archive"];
  nav.forEach((label, i) => {
    const y = h * (.2 + i * .092);
    if (i === 1) rect(w * .015, y - h * .045, w * .126, h * .068, h * .013, "#294a4b");
    ctx.fillStyle = i === 1 ? "#e1f5ed" : "#849ba8";
    ctx.font = `500 ${Math.round(h * .025)}px ${UI_FONT}`;
    ctx.fillText(label, w * .038, y, w * .091);
  });
  ctx.fillStyle = "#f1f5f3"; ctx.font = `660 ${Math.round(h * .055)}px ${UI_FONT}`;
  ctx.fillText(content.title.slice(0, 36), w * .192, h * .119, w * .56);
  rect(w * .77, h * .063, w * .196, h * .057, h * .017, done ? "#1b5649" : "#353f49");
  ctx.fillStyle = done ? "#baf3d7" : "#e2d8bf";
  ctx.font = `650 ${Math.round(h * .023)}px ${UI_FONT}`;
  ctx.fillText(content.status.slice(0, 40), w * .785, h * .103, w * .17);
  rect(w * .192, h * .165, w * .762, h * .724, h * .026, "#eaf0ee");
  rect(w * .213, h * .194, w * .72, h * .102, h * .018, done ? "#cfe9de" : "#e6e9e7");
  rect(w * .23, h * .218, h * .05, h * .05, h * .013, done ? "#347965" : "#c4b18e");
  ctx.fillStyle = "#ffffff"; ctx.font = `750 ${Math.round(h * .034)}px ${UI_FONT}`;
  ctx.textAlign = "center"; ctx.fillText(done ? "✓" : "↓", w * .23 + h * .025, h * .256);
  ctx.textAlign = "left"; ctx.fillStyle = "#253a3a";
  ctx.font = `650 ${Math.round(h * .035)}px ${UI_FONT}`;
  ctx.fillText(done ? "Document received" : "Ready for document", w * .28, h * .251, w * .35);
  ctx.fillStyle = "#748784"; ctx.font = `500 ${Math.round(h * .023)}px ${UI_FONT}`;
  ctx.fillText(done ? "Verified and added to records" : "Waiting for a source document", w * .705, h * .248, w * .21);
  const field = (label: string, value: string, x: number, y: number, maxWidth: number) => {
    ctx.fillStyle = "#6b7f7b"; ctx.font = `600 ${Math.round(h * .023)}px ${UI_FONT}`;
    ctx.fillText(label, x, y, maxWidth);
    ctx.fillStyle = "#243834"; ctx.font = `650 ${Math.round(h * .037)}px ${UI_FONT}`;
    ctx.fillText(value.slice(0, 42), x, y + h * .058, maxWidth);
  };
  field("DOCUMENT", done ? content.record?.title ?? "Document" : "Not received", w * .239, h * .387, w * .26);
  field("REFERENCE", done ? content.record?.reference ?? "—" : "—", w * .565, h * .387, w * .32);
  field("FROM", done ? content.record?.sender ?? "—" : "Awaiting sender", w * .239, h * .555, w * .26);
  field("AMOUNT", done ? content.record?.total ?? "—" : "—", w * .565, h * .555, w * .32);
  ctx.strokeStyle = "#c3cfca"; ctx.lineWidth = h * .0016;
  ctx.beginPath(); ctx.moveTo(w * .239, h * .69); ctx.lineTo(w * .902, h * .69); ctx.stroke();
  ctx.fillStyle = "#56746b"; ctx.font = `600 ${Math.round(h * .027)}px ${UI_FONT}`;
  ctx.fillText(done ? "✓  Saved to your workspace" : "○  Intake queue is ready", w * .239, h * .767);
};

/** Generic analytics dashboard: sidebar, KPI tiles, area chart, bar chart. */
const dashboard = (ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number,
  content: LaptopScreenContent = { title: "Overview", status: "Synced" }) => {
  ctx.fillStyle = "#0e1420"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#141c2b"; ctx.fillRect(0, 0, w * .16, h);
  ctx.fillStyle = "#4f8cff"; ctx.beginPath(); ctx.arc(w * .045, h * .07, h * .025, 0, TAU); ctx.fill();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i === 1 ? "#24324b" : "transparent"; ctx.fillRect(w * .015, h * (.16 + i * .07), w * .13, h * .05);
    ctx.fillStyle = i === 1 ? "#cfe0ff" : "#6f7d95"; ctx.fillRect(w * .03, h * (.18 + i * .07), w * (.06 + (i % 3) * .02), h * .012);
  }
  ctx.fillStyle = "#e9eef7"; ctx.font = `600 ${Math.round(h * .045)}px ${UI_FONT}`; ctx.textBaseline = "alphabetic";
  ctx.fillText(content.title.slice(0, 36), w * .19, h * .1, w * .53);
  ctx.fillStyle = "#1d4239"; roundRect(ctx, w * .735, h * .052, w * .24, h * .055, h * .02); ctx.fill();
  ctx.fillStyle = "#a9f0d2"; ctx.font = `600 ${Math.round(h * .024)}px ${UI_FONT}`;
  ctx.fillText(content.status.slice(0, 40), w * .75, h * .088, w * .21);
  const tiles: Array<[string, string, string]> = [["Revenue", "128.4k", "#3ddc97"], ["Active users", "24,310", "#4f8cff"], ["Churn", "1.8%", "#ff7a6b"], ["Uptime", "99.98%", "#f5c451"]];
  tiles.forEach(([label, value, color], i) => {
    const x = w * (.19 + i * .2), y = h * .15;
    ctx.fillStyle = "#151e2e"; roundRect(ctx, x, y, w * .185, h * .17, h * .02); ctx.fill();
    ctx.fillStyle = "#7d8aa3"; ctx.font = `500 ${Math.round(h * .024)}px ${UI_FONT}`; ctx.fillText(label, x + w * .015, y + h * .05);
    ctx.fillStyle = "#f2f5fb"; ctx.font = `650 ${Math.round(h * .05)}px ${UI_FONT}`; ctx.fillText(value, x + w * .015, y + h * .12);
    ctx.fillStyle = color; ctx.fillRect(x + w * .015, y + h * .145, w * .05, h * .006);
  });
  // Area chart.
  const cx = w * .19, cy = h * .37, cw = w * .5, ch = h * .55;
  ctx.fillStyle = "#151e2e"; roundRect(ctx, cx, cy, cw, ch, h * .02); ctx.fill();
  ctx.strokeStyle = "#1f2a3e"; ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx + w * .02, cy + ch * i / 5); ctx.lineTo(cx + cw - w * .02, cy + ch * i / 5); ctx.stroke(); }
  const pts: Array<[number, number]> = [];
  let v = .55;
  for (let i = 0; i <= 40; i++) { v = Math.max(.15, Math.min(.85, v + (random() - .42) * .08)); pts.push([cx + w * .02 + (cw - w * .04) * i / 40, cy + ch * (1 - v * .85)]); }
  const grad = ctx.createLinearGradient(0, cy, 0, cy + ch);
  grad.addColorStop(0, "rgba(79,140,255,.45)"); grad.addColorStop(1, "rgba(79,140,255,0)");
  ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(pts[0][0], cy + ch - h * .02);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], cy + ch - h * .02); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#6aa2ff"; ctx.lineWidth = 4; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  // Bar chart.
  const bx = w * .71, by = h * .37, bw = w * .27, bh = h * .55;
  ctx.fillStyle = "#151e2e"; roundRect(ctx, bx, by, bw, bh, h * .02); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const hh = bh * (.25 + random() * .55);
    ctx.fillStyle = i === 5 ? "#3ddc97" : "#2b3a55";
    roundRect(ctx, bx + w * .02 + i * bw * .13, by + bh - h * .03 - hh, bw * .08, hh, h * .008); ctx.fill();
  }
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

const lockScreen = (accent: string) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0b1d3a"); g.addColorStop(.55, accent); g.addColorStop(1, "#1a0f2e");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // Soft wallpaper shapes.
  for (let i = 0; i < 5; i++) {
    const r = ctx.createRadialGradient(w * (.2 + i * .17), h * (.6 + (i % 2) * .15), 0, w * (.2 + i * .17), h * (.6 + (i % 2) * .15), w * .5);
    r.addColorStop(0, "rgba(255,255,255,.12)"); r.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.textAlign = "center";
  ctx.font = `500 ${Math.round(w * .055)}px ${UI_FONT}`; ctx.fillText("Monday, 19 October", w / 2, h * .17);
  ctx.font = `200 ${Math.round(w * .3)}px ${UI_FONT}`; ctx.fillText("9:41", w / 2, h * .33);
  ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.beginPath(); ctx.arc(w * .2, h * .92, w * .06, 0, TAU); ctx.arc(w * .8, h * .92, w * .06, 0, TAU); ctx.fill();
  ctx.fillRect(w * .36, h * .975, w * .28, h * .006);
};

/** App icon on the notification: a short glyph on a coloured tile. Defaults keep the original payment look. */
export interface PhoneNotificationIcon { glyph: string; color: string }
const notificationCard = (title: string, body: string, icon: PhoneNotificationIcon = { glyph: "$", color: "#2fbf71" }) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(245,247,250,.88)"; roundRect(ctx, 0, 0, w, h, h * .22); ctx.fill();
  ctx.fillStyle = icon.color; roundRect(ctx, w * .04, h * .2, h * .6, h * .6, h * .14); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `700 ${Math.round(h * .38)}px ${UI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(icon.glyph, w * .04 + h * .3, h * .52);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#14171c"; ctx.font = `650 ${Math.round(h * .2)}px ${UI_FONT}`; ctx.fillText(title, w * .04 + h * .78, h * .42);
  ctx.fillStyle = "#3b4350"; ctx.font = `450 ${Math.round(h * .18)}px ${UI_FONT}`; ctx.fillText(body, w * .04 + h * .78, h * .72);
  ctx.fillStyle = "#7a8391"; ctx.textAlign = "right"; ctx.font = `450 ${Math.round(h * .15)}px ${UI_FONT}`; ctx.fillText("now", w * .95, h * .42);
};

function screenMaterial(res: AssetResources, map: Texture, antiReflective = false) {
  return res.own(new MeshPhysicalMaterial({ color: "#050608", emissive: "#ffffff", emissiveMap: map, emissiveIntensity: 1,
    // The large display needs a *low reflectance* coating, not a rough glass
    // layer that spreads the softbox across the entire readable interface.
    // The smaller phone retains its physically glossy original treatment.
    roughness: antiReflective ? .16 : .08, metalness: 0,
    specularIntensity: antiReflective ? .08 : 1,
    clearcoat: antiReflective ? .025 : 1, clearcoatRoughness: antiReflective ? .2 : .03 }));
}

// ------------------------------------------------------------------ laptop

export const LAPTOP_ACTIONS: readonly HeroActionSpec[] = [
  { id: "open", label: "Open lid", durationFrames: 60, loop: false, meaning: "Start working / log in: the lid opens and the screen wakes." },
  { id: "wake", label: "Wake screen", durationFrames: 30, loop: false, meaning: "A device comes to life." },
  { id: "open-and-process", label: "Receive a document", durationFrames: 150, loop: false,
    meaning: "Open the laptop and show the record appearing only when the source document arrives." },
];

/** 13-inch class ultrabook: 30.4 × 21.2 × 1.1 cm base. */
export function createLaptop(options: { id?: string; color?: string; screen?: LaptopScreenContent;
  screenBefore?: LaptopScreenContent } = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "laptop";
  const W = 30.4, D = 21.2, T = 1.1;
  // Bead-blasted anodized aluminium: a fine, even matte with soft highlights, not the brushed streaks of a phone frame.
  const shell = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.color ?? "#b9bdc3", metalness: 1, roughness: .42, clearcoat: .08, clearcoatRoughness: .5 }),
    { kind: "cast-metal", frequency: 280, strength: .00016, roughnessVariation: .1 }));
  const deck = res.own(new MeshPhysicalMaterial({ color: "#26282c", roughness: .55, metalness: .4 }));
  const keyMat = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#16171a", roughness: .62, metalness: 0, sheen: .2 }),
    { kind: "stone", frequency: 60, strength: .0002, roughnessVariation: .2 }));
  const dark = res.own(new MeshPhysicalMaterial({ color: "#121316", roughness: .4, metalness: .3 }));
  add(res, group, roundedSlab(W, D, T, .95, { bevel: .14 }), shell, "laptop-unibody-base");
  // Keyboard deck and instanced keys (row widths are fitted to the deck).
  // The keyboard sits between two speaker grilles, as on current thin laptops.
  const deckW = 24.8, deckD = 11.8, deckZ = -3.6;
  add(res, group, roundedSlab(deckW, deckD, .02, .5), deck, "laptop-keyboard-deck", [0, T, deckZ]);
  const rows: number[][] = [
    Array(14).fill(1), [...Array(13).fill(1), 1.55], [1.55, ...Array(13).fill(1)], [1.8, ...Array(11).fill(1), 1.8],
    [2.35, ...Array(10).fill(1), 2.35], [1, 1, 1, 1.25, 5.2, 1.25, 1, 3],
  ];
  const gap = .26, keyGeo = res.own(new RoundedBoxGeometry(1, .14, 1, 2, .12));
  let z = deckZ - deckD / 2 + .55;
  const keyMatrices: Matrix4[] = [];
  rows.forEach((row, r) => {
    const depth = r === 0 ? .78 : 1.5;
    const unit = (deckW - .8 - gap * (row.length - 1)) / row.reduce((a, b) => a + b, 0);
    let x = -deckW / 2 + .4;
    for (const width of row) {
      const kw = width * unit;
      keyMatrices.push(new Matrix4().makeScale(kw, 1, depth).premultiply(new Matrix4().makeTranslation(x + kw / 2, T + .09, z + depth / 2)));
      x += kw + gap;
    }
    z += depth + gap;
  });
  // Printed legends: one decal just above the key tops, painted from the same key rectangles, so every label sits on its key.
  const LEGENDS = [
    ["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "⏻"],
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"],
    ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
    ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return"],
    ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift"],
    ["fn", "ctrl", "alt", "meta", "", "meta", "alt", "◀ ▲▼ ▶"],
  ];
  const keyRects: Array<{ x: number; z: number; w: number; d: number; label: string }> = [];
  { let i = 0; rows.forEach((row, r) => row.forEach((_, k) => { const e = keyMatrices[i++].elements; keyRects.push({ x: e[12], z: e[14], w: e[0], d: e[10], label: LEGENDS[r][k] ?? "" }); })); }
  const legendTex = res.own(paintTexture(2048, Math.round(2048 * deckD / deckW), (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const sx = w / deckW, sz = h / deckD;
    for (const key of keyRects) {
      if (!key.label) continue;
      const px = (key.x + deckW / 2) * sx, pz = (key.z - (deckZ - deckD / 2)) * sz, kw = key.w * sx, kd = key.d * sz;
      const single = key.label.length <= 2, size = Math.round(Math.min(kd, kw) * (single ? .34 : .2));
      ctx.fillStyle = "rgba(236,239,243,.92)"; ctx.font = `500 ${size}px ${UI_FONT}`; ctx.textBaseline = "middle";
      if (single) { ctx.textAlign = "center"; ctx.fillText(key.label, px, pz); }
      else { ctx.textAlign = key.x < 0 ? "left" : "right"; ctx.fillText(key.label, key.x < 0 ? px - kw * .38 : px + kw * .38, pz + kd * .24); }
    }
  }, { seed: 6, fallback: [0, 0, 0, 0] }));
  const legend = new Mesh(res.own(new BoxGeometry(deckW, .001, deckD)), res.own(new MeshBasicMaterial({ map: legendTex, transparent: true, depthWrite: false, toneMapped: true })));
  legend.position.set(0, T + .09 + .07 + .003, deckZ); legend.renderOrder = 2;
  group.add(res.name(legend, "laptop-key-legends"));
  // Speaker grilles: fields of fine perforations either side of the keyboard.
  const holes = res.own(paintTexture(256, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "rgba(8,9,11,.92)";
    for (let y = 10; y < h - 6; y += 13) for (let x = 10 + ((y / 13) % 2) * 6.5; x < w - 6; x += 13) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill(); }
  }, { seed: 7, fallback: [0, 0, 0, 0] }));
  const grille = res.own(new MeshBasicMaterial({ map: holes, transparent: true, depthWrite: false }));
  for (const side of [-1, 1]) {
    const g = new Mesh(res.own(new BoxGeometry(1.5, .001, deckD - .4)), grille);
    g.position.set(side * (deckW / 2 + 1.25), T + .002, deckZ); group.add(res.name(g, "laptop-speaker-grille"));
  }
  // Ports on the left side: two rounded data ports and a round audio jack.
  for (const zz of [-4.6, -2.9]) add(res, group, new RoundedBoxGeometry(.04, .32, .92, 2, .14), dark, "laptop-port", [-W / 2 - .005, T * .52, zz]);
  add(res, group, new CylinderGeometry(.19, .19, .04, 20).rotateZ(Math.PI / 2), dark, "laptop-port", [-W / 2 - .005, T * .52, -1.2]);
  // And on the right: a data port and a card slot.
  add(res, group, new RoundedBoxGeometry(.04, .32, .92, 2, .14), dark, "laptop-port", [W / 2 + .005, T * .52, -4.2]);
  add(res, group, new RoundedBoxGeometry(.04, .14, 2.4, 2, .06), dark, "laptop-port", [W / 2 + .005, T * .5, -1.6]);
  const keys = new InstancedMesh(keyGeo, keyMat, keyMatrices.length);
  keyMatrices.forEach((m, i) => keys.setMatrixAt(i, m));
  keys.castShadow = true; keys.receiveShadow = true;
  group.add(res.name(keys, "laptop-keycaps"));
  const pad = res.own(new MeshPhysicalMaterial({ color: "#aeb3b9", roughness: .22, metalness: .5, clearcoat: .6, clearcoatRoughness: .25 }));
  add(res, group, roundedSlab(13.4, 8.2, .03, .45), pad, "laptop-glass-trackpad", [0, T - .005, 5.6]);
  for (const x of [-12, 12]) for (const zz of [-8.6, 8.6]) add(res, group, new CylinderGeometry(.55, .55, .12, 20), dark, "laptop-rubber-foot", [x, -.06, zz]);
  add(res, group, new CylinderGeometry(.42, .42, 24, 24).rotateZ(Math.PI / 2), dark, "laptop-hinge-barrel", [0, T + .05, -D / 2 + .25]);
  // Lid on a hinge pivot: built closed (screen facing down), opened by rotation.x.
  // Hinge axis sits above the keycaps so the closed lid clears them.
  const hinge = new Group();
  hinge.position.set(0, T + .26, -D / 2 + .25);
  group.add(res.name(hinge, "laptop-lid-hinge"));
  const lid = new Group();
  lid.position.set(0, 0, -.25);
  hinge.add(lid);
  const LT = .55;
  const lidShell = add(res, lid, roundedSlab(W, D - .3, LT, .95, { bevel: .1 }), shell, "laptop-lid-shell");
  lidShell.position.set(0, 0, (D - .3) / 2);
  const bezel = res.own(new MeshPhysicalMaterial({ color: "#060708", roughness: .05, clearcoat: 1, clearcoatRoughness: .02 }));
  const bezelMesh = add(res, lid, roundedSlab(W - .5, D - .8, .02, .75), bezel, "laptop-glass-bezel");
  bezelMesh.position.set(0, -.021, (D - .3) / 2);
  const paintScreen = (content: LaptopScreenContent | undefined) => res.own(paintTexture(2048, 1300, (ctx, w, h, random) =>
    content?.view === "document-record" ? documentRecord(ctx, w, h, content) : dashboard(ctx, w, h, random, content),
  { seed: 4, fallback: [30, 40, 60, 255] }));
  const ui = paintScreen(options.screen);
  const uiBefore = options.screenBefore ? paintScreen(options.screenBefore) : ui;
  const screen = screenMaterial(res, ui, true);
  const panel = add(res, lid, roundedSlab(W - 2.0, D - 2.9, .01, .2), screen, "laptop-display");
  panel.rotation.x = Math.PI; panel.position.set(0, -.03, (D - .3) / 2 + .35);
  const cam = add(res, lid, new CylinderGeometry(.12, .12, .02, 16), res.own(new MeshPhysicalMaterial({ color: "#1b2433", roughness: .1, metalness: .4 })), "laptop-camera");
  cam.position.set(0, -.035, D - 1.05);
  const OPEN = -1.92;
  hinge.rotation.x = OPEN;
  const rest = captureRest([hinge]);
  return {
    id: group.name, group, parts: res.parts, tier: "hero", metersPerUnit: .01, exposure: .9,
    bounds: { min: [-W / 2 - .5, 0, -D / 2 - 6], max: [W / 2 + .5, 20, D / 2 + .5] },
    studio: { palette: "graphite", keyAzimuth: -35 },
    craft: {
      materials: ["bead-blasted anodized aluminium (fine cast-metal micro-roughness)", "matte polymer keycaps with printed legends", "perforated speaker grilles", "satin glass trackpad", "glossy glass bezel", "emissive painted UI"],
      details: ["chamfered unibody", "recessed keyboard deck between two speaker grilles", "fitted keys with legends from the key rectangles", "data ports, audio jack and card slot", "hinge barrel and rubber feet", "camera dot", "lid on a real hinge pivot"],
    },
    actions: LAPTOP_ACTIONS,
    pose(state: HeroActionState) {
      rest.restore();
      screen.emissiveIntensity = 1;
      // Texture selection is a pure frame function; a random backward seek
      // cannot retain the "saved" state from a later frame.
      screen.emissiveMap = ui;
      if (!state.id) return;
      const spec = findAction(LAPTOP_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
      if (spec.id === "open") {
        hinge.rotation.x = OPEN * spring(t * 1.15, 1.1, .55);
        screen.emissiveIntensity = window01(t, .55, .85);
      } else if (spec.id === "open-and-process") {
        hinge.rotation.x = OPEN * spring(Math.max(0, (t - .07) / .43) * 1.15, 1.1, .55);
        screen.emissiveMap = t >= .8 ? ui : uiBefore;
        const wake = window01(t, .305, .435);
        // Dip the panel backlight through the instantaneous texture handoff.
        screen.emissiveIntensity = wake * (1 - .9 * Math.max(0, 1 - Math.abs(t - .8) / .035));
      } else {
        screen.emissiveIntensity = .15 + .85 * smooth(t);
      }
    },
    dispose: res.dispose,
  };
}

// ------------------------------------------------------------------ camera optics

/** One phone camera, built like the real part, local +Y pointing out of the device, base on the camera plateau:
 * - a lathe-turned bezel, polished on its rounded crown and satin down its side, standing about 3 mm proud;
 * - an anodized black lip, then the cover glass: clear, with an anti-reflection coating that throws purple and green;
 * - under it, a matte black barrel holding three stacked glass elements, each with its own coating tint, a metal spacer ring
 *   catching a highlight, and the dark aperture at the bottom.
 * The cover is dark, partly transparent glass under a gentle dome: the barrel reads as deep black with sharp reflections on top
 * and the elements only hinted at, which is how phone cameras photograph. (A transmissive cover rendered the interior as a beige
 * blur, and a flat cover mirrored a whole softbox white.) */
function cameraLens(res: AssetResources, radius: number, bezelColor: string): Group {
  const r = radius, lens = new Group();
  const bezel = res.own(new MeshPhysicalMaterial({ color: new Color(bezelColor).multiplyScalar(1.05), metalness: 1, roughness: .2, clearcoat: .35, clearcoatRoughness: .08, envMapIntensity: 1.1 }));
  const lip = res.own(new MeshPhysicalMaterial({ color: "#0c0d10", metalness: .6, roughness: .38 }));
  const matte = res.own(new MeshPhysicalMaterial({ color: "#050506", roughness: .9, side: DoubleSide }));
  // Real camera glass reads as deep black: light that enters is absorbed by the dark barrel, and only sharp reflections and faint
  // coating colours come back. The cover glass absorbs strongly, so the elements are a hint, not a view.
  const cover = res.own(new MeshPhysicalMaterial({ color: "#07080c", transparent: true, opacity: .5, depthWrite: false, roughness: .01, metalness: 0,
    iridescence: .7, iridescenceIOR: 1.38, iridescenceThicknessRange: [260, 620], specularIntensity: .9, clearcoat: 1, clearcoatRoughness: 0 }));
  const element = (tint: string, range: [number, number]) => res.own(new MeshPhysicalMaterial({ color: tint, roughness: .05, metalness: .1, envMapIntensity: .18,
    iridescence: .8, iridescenceIOR: 1.6, iridescenceThicknessRange: range, clearcoat: .6, clearcoatRoughness: .04 }));
  const spacer = res.own(new MeshPhysicalMaterial({ color: "#55585e", metalness: 1, roughness: .35 }));
  const crown = new LatheGeometry([[.77, .11], [.77, .37], [.82, .415], [.93, .415], [.985, .37], [1, .08], [1, 0]].map(([x, y]) => new Vector2(x * r, y * r)), 72);
  lens.add(new Mesh(res.own(crown), bezel));
  const lipRing = new Mesh(res.own(new RingGeometry(.64 * r, .78 * r, 72)), lip); lipRing.rotation.x = -Math.PI / 2; lipRing.position.y = .372 * r; lens.add(lipRing);
  const barrel = new Mesh(res.own(new CylinderGeometry(.64 * r, .64 * r, .3 * r, 64, 1, true)), matte); barrel.position.y = .22 * r; lens.add(barrel);
  const floor = new Mesh(res.own(new CylinderGeometry(.64 * r, .64 * r, .01 * r, 64)), matte); floor.position.y = .07 * r; lens.add(floor);
  ([[.6, .31, "#030409", [300, 520]], [.47, .24, "#05030a", [420, 700]], [.33, .17, "#020403", [220, 460]]] as const).forEach(([rr, y, tint, range]) => {
    const disc = new Mesh(res.own(new CylinderGeometry(rr * r, rr * r, .012 * r, 64)), element(tint, [range[0], range[1]])); disc.position.y = y * r; lens.add(disc);
  });
  const ring = new Mesh(res.own(new TorusGeometry(.54 * r, .012 * r, 8, 72)), spacer); ring.rotation.x = Math.PI / 2; ring.position.y = .275 * r; lens.add(ring);
  const aperture = new Mesh(res.own(new CylinderGeometry(.13 * r, .13 * r, .01 * r, 32)), matte); aperture.position.y = .13 * r; lens.add(aperture);
  // A very gently domed cover: a flat disc mirrors a whole softbox and goes white; the dome gathers it into a small highlight.
  const arc = .32, sphere = .775 * r / Math.sin(arc);
  const glass = new Mesh(res.own(new SphereGeometry(sphere, 72, 10, 0, TAU, 0, arc)), cover);
  glass.position.y = .372 * r - sphere * Math.cos(arc); lens.add(glass);
  for (const child of lens.children) { child.castShadow = true; child.receiveShadow = true; }
  return lens;
}

/** A flash diffuser: a warm, frosted disc moulded with fine concentric fresnel rings. */
function flashDiffuser(res: AssetResources, radius: number): Mesh {
  const rings = res.own(paintTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, "#fffaf0"); g.addColorStop(1, "#e9dcc0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 4; i < w / 2; i += 5) { ctx.strokeStyle = `rgba(150,130,90,${.18 + .12 * Math.sin(i)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(w / 2, h / 2, i, 0, TAU); ctx.stroke(); }
  }, { seed: 5, fallback: [240, 232, 210, 255] }));
  const mesh = new Mesh(res.own(new CylinderGeometry(radius, radius, .03, 40)), res.own(new MeshPhysicalMaterial({ map: rings, roughness: .35, clearcoat: .8, clearcoatRoughness: .1, emissive: "#2a2416" })));
  mesh.castShadow = true;
  return mesh;
}

// ------------------------------------------------------------------ smartphone

export const PHONE_ACTIONS: readonly HeroActionSpec[] = [
  { id: "notify", label: "Notification", durationFrames: 48, loop: false, meaning: "Something happened: the phone buzzes and a notification slides in." },
  { id: "turn", label: "Turn around", durationFrames: 60, loop: false, meaning: "Show the device: it turns to reveal the camera." },
];

/** 6.1-inch class phone: 7.15 × 14.7 × 0.78 cm, standing on its bottom edge. */
export function createSmartphone(options: { id?: string; frame?: string; back?: string; notification?: { title: string; body: string; icon?: PhoneNotificationIcon } } = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "smartphone";
  const W = 7.15, H = 14.7, T = .78;
  const device = new Group();
  device.position.y = H / 2;
  group.add(res.name(device, "phone-body"));
  // Frame: extruded rounded slab stood upright (thickness along Z).
  // Brushed, along the frame's length: anisotropic metal stretches highlights into the long streaks real machined frames show.
  const frameMat = res.own(new MeshPhysicalMaterial({ color: options.frame ?? "#8d9198", metalness: 1, roughness: .3, anisotropy: .75, anisotropyRotation: Math.PI / 2, clearcoat: .1 }));
  const body = add(res, device, roundedSlab(W, H, T, 1.1, { bevel: .1, curveSegments: 20 }), frameMat, "phone-machined-frame");
  body.rotation.x = Math.PI / 2; body.position.z = -T / 2;
  const glass = res.own(new MeshPhysicalMaterial({ color: "#050506", roughness: .03, clearcoat: 1, clearcoatRoughness: .01 }));
  const front = add(res, device, roundedSlab(W - .14, H - .14, .02, 1.04), glass, "phone-front-glass");
  front.rotation.x = Math.PI / 2; front.position.z = T / 2 + .01;
  const wallpaper = res.own(paintTexture(720, 1520, lockScreen("#2c5ea8"), { seed: 2, fallback: [30, 60, 120, 255] }));
  const screen = screenMaterial(res, wallpaper);
  const display = add(res, device, roundedSlab(W - .5, H - .5, .005, .9), screen, "phone-display");
  display.rotation.x = Math.PI / 2; display.position.z = T / 2 + .028;
  const island = add(res, device, roundedSlab(2.0, .62, .005, .31), glass, "phone-camera-island");
  island.rotation.x = Math.PI / 2; island.position.set(0, H / 2 - .9, T / 2 + .036);
  // Notification card: separate plane so it can slide in.
  const note = options.notification ?? { title: "Payment received", body: "$120.00 · from A. Customer" };
  const cardTex = res.own(paintTexture(1024, 256, notificationCard(note.title, note.body, "icon" in note ? note.icon : undefined), { seed: 3, fallback: [240, 240, 240, 255] }));
  const card = add(res, device, roundedSlab(W - 1.0, 1.55, .004, .3), res.own(new MeshBasicMaterial({ map: cardTex, transparent: true, toneMapped: false })), "phone-notification");
  card.rotation.x = Math.PI / 2; card.position.set(0, -H * .02, T / 2 + .04); // clear band below the clock
  // Back: frosted colored glass, camera plateau with three lens stacks, flash.
  const backGlass = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.back ?? "#3d4a5c", roughness: .55, clearcoat: .6, clearcoatRoughness: .5 }),
    { kind: "paper", frequency: 400, strength: .00004, roughnessVariation: .2 }));
  const back = add(res, device, roundedSlab(W - .14, H - .14, .02, 1.04), backGlass, "phone-back-glass");
  back.rotation.x = -Math.PI / 2; back.position.z = -T / 2 - .01;
  // The camera plateau is raised glass: a polished band around its edge and a frosted top, like the back around it.
  // Seen from the back, the camera sits top left: +x in the phone's own frame, which faces +z.
  const cx = W / 2 - 2.15, cy = H / 2 - 2.15;
  const polished = res.own(new MeshPhysicalMaterial({ color: options.back ?? "#3d4a5c", roughness: .07, clearcoat: 1, clearcoatRoughness: .03 }));
  const plateau = add(res, device, roundedSlab(3.7, 3.7, .1, .95, { bevel: .045 }), polished, "phone-camera-plateau");
  plateau.rotation.x = -Math.PI / 2; plateau.position.set(cx, cy, -T / 2 - .02);
  const top = add(res, device, roundedSlab(3.4, 3.4, .006, .82), backGlass, "phone-camera-plateau");
  top.rotation.x = -Math.PI / 2; top.position.set(cx, cy, -T / 2 - .125);
  // Three cameras in the triangle phones use, each standing proud of the plateau.
  for (const [x, y] of [[.82, .84], [.82, -.84], [-.86, 0]] as const) {
    const assy = cameraLens(res, .8, options.frame ?? "#8d9198");
    assy.position.set(cx + x, cy + y, -T / 2 - .128);
    assy.rotation.x = -Math.PI / 2;
    device.add(res.name(assy, "phone-lens-stack"));
  }
  const flash = flashDiffuser(res, .27); flash.rotation.x = Math.PI / 2; flash.position.set(cx - .98, cy + 1.2, -T / 2 - .14);
  device.add(res.name(flash, "phone-flash"));
  // Depth sensor window and microphone: small, but their absence is what makes a camera module look like a toy.
  add(res, device, new CylinderGeometry(.3, .3, .03, 40).rotateX(Math.PI / 2), res.own(new MeshPhysicalMaterial({ color: "#07070a", roughness: .05, clearcoat: 1, iridescence: .5, iridescenceIOR: 1.5 })), "phone-depth-sensor", [cx - .98, cy - 1.2, -T / 2 - .14]);
  add(res, device, new CylinderGeometry(.05, .05, .03, 16).rotateX(Math.PI / 2), res.own(new MeshPhysicalMaterial({ color: "#020203", roughness: .9 })), "phone-microphone", [cx - .3, cy + 1.42, -T / 2 - .14]);
  // Antenna breaks: thin polymer bands across the frame, as every metal-framed phone has.
  const band = res.own(new MeshPhysicalMaterial({ color: "#3a3d42", roughness: .55, metalness: 0 }));
  for (const y of [H / 2 - 1.15, -H / 2 + 1.15]) add(res, device, new BoxGeometry(W + .014, .07, T * .86), band, "phone-antenna-band", [0, y, 0]);
  // Side controls.
  add(res, device, new RoundedBoxGeometry(.12, 1.9, .32, 2, .05), frameMat, "phone-side-button", [W / 2 + .02, 2.6, 0]);
  for (const y of [3.4, 2.0]) add(res, device, new RoundedBoxGeometry(.12, 1.1, .32, 2, .05), frameMat, "phone-volume-button", [-W / 2 - .02, y, 0]);
  add(res, device, new RoundedBoxGeometry(.9, .1, .28, 2, .04), res.own(new MeshPhysicalMaterial({ color: "#0b0b0c", roughness: .6 })), "phone-port", [0, -H / 2 - .005, 0]);
  const rest = captureRest([device, card]);
  return {
    id: group.name, group, parts: res.parts, tier: "hero", metersPerUnit: .01, exposure: .95,
    bounds: { min: [-W / 2 - .5, 0, -T / 2 - 1], max: [W / 2 + .5, H + .2, T / 2 + 1] },
    studio: { palette: "graphite", keyAzimuth: -30 },
    craft: {
      materials: ["brushed anisotropic metal frame", "glossy front glass", "frosted back glass", "polished glass plateau edge", "polished lathe-turned lens bezels", "dark coated cover glass over stacked coated elements", "fresnel flash diffuser", "emissive painted UI"],
      details: ["continuous-radius frame with chamfers and antenna breaks", "island cutout", "three raised camera assemblies (bezel, lip, cover, barrel, three elements, spacer ring, aperture) on a raised plateau", "flash, depth-sensor window and microphone hole", "side and volume buttons, port"],
    },
    actions: PHONE_ACTIONS,
    pose(state: HeroActionState) {
      rest.restore();
      screen.emissiveIntensity = 1;
      if (!state.id) return;
      const spec = findAction(PHONE_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
      const r = rest.of(card);
      if (spec.id === "notify") {
        screen.emissiveIntensity = .08 + .92 * window01(t, .02, .15);
        const slide = spring(Math.max(0, t - .2) * 1.6, 1.4, .5);
        card.visible = t > .2;
        card.position.y = r.position.y + 2.2 * (1 - slide);
        card.scale.setScalar(.92 + .08 * slide);
        const buzz = pulse(t, .2, .24, .4, .45) * Math.sin(t * 260);
        device.rotation.z = .025 * buzz;
      } else {
        card.visible = false;
        const turn = easeInOut(window01(t, .05, .45)) - easeInOut(window01(t, .6, .95));
        device.rotation.y = turn * Math.PI;
      }
    },
    dispose: res.dispose,
  };
}

// ------------------------------------------------------------------ server rack

export const RACK_ACTIONS: readonly HeroActionSpec[] = [
  { id: "activity", label: "Activity", durationFrames: 60, loop: true, meaning: "Servers at work: drive and network lights flicker." },
  { id: "power-on", label: "Power on", durationFrames: 90, loop: false, meaning: "A data center comes online, unit by unit from the bottom." },
];

const ventTexture = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = "#9a9a9a"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#101010";
  const r = 6, dx = r * 2.6, dy = r * 2.25;
  for (let y = 0, row = 0; y < h + dy; y += dy, row++) for (let x = row % 2 ? dx / 2 : 0; x < w + dx; x += dx) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.fill();
  }
};

/** 42U, 60 × 100 cm rack (1 unit = 10 cm) with compute, storage, switches and cabling. */
export function createServerRack(options: { id?: string } = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "server-rack";
  const U = .4445, W = 6, D = 10, H = 20;
  const coat = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#1c1e21", roughness: .55, metalness: .5 }), { kind: "stone", frequency: 20, strength: .0004 }));
  const steel = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#8d9298", metalness: 1, roughness: .35 }), { kind: "brushed", flow: [0, 1, 0] }));
  // Cabinet: top, base, sides, posts.
  add(res, group, new BoxGeometry(W, .3, D), coat, "rack-top-panel", [0, H - .15, 0]);
  add(res, group, new BoxGeometry(W, .5, D), coat, "rack-plinth", [0, .25, 0]);
  for (const s of [-1, 1]) {
    add(res, group, new BoxGeometry(.08, H - .8, D - .2), coat, "rack-side-panel", [s * (W / 2 - .04), H / 2, 0]);
    add(res, group, new BoxGeometry(.25, H - .8, .25), steel, "rack-front-post", [s * (W / 2 - .45), H / 2, D / 2 - .6]);
  }
  // Mounting-hole pattern on the posts (instanced).
  const holeGeo = res.own(new BoxGeometry(.06, .06, .02));
  const holeMat = res.own(new MeshPhysicalMaterial({ color: "#050505", roughness: .9 }));
  const holeCount = 42 * 3 * 2;
  const holes = new InstancedMesh(holeGeo, holeMat, holeCount);
  let hc = 0;
  for (let u = 0; u < 42; u++) for (let k = 0; k < 3; k++) for (const s of [-1, 1])
    holes.setMatrixAt(hc++, new Matrix4().makeTranslation(s * (W / 2 - .45), .55 + u * U + (k + .5) * U / 3, D / 2 - .47));
  group.add(res.name(holes, "rack-mounting-holes"));
  // Equipment (bottom → top): [height in U, kind].
  const vent = paintWithRelief(512, 128, ventTexture, { repeat: true, seed: 1, strength: 2, fallback: [60, 60, 60, 255] });
  res.own(vent.map); res.own(vent.normalMap);
  const bezel = res.own(new MeshPhysicalMaterial({ color: "#2a2d31", map: vent.map, normalMap: vent.normalMap, roughness: .5, metalness: .6 }));
  const blank = res.own(new MeshPhysicalMaterial({ color: "#16181b", roughness: .7, metalness: .3 }));
  const bayMat = res.own(new MeshPhysicalMaterial({ color: "#3a3e44", roughness: .45, metalness: .7 }));
  // A fully populated 42U elevation (bottom → top); real racks close gaps with blanking panels.
  const compute = (n: number) => Array.from({ length: n }, () => [1, "compute"] as [number, "compute"]);
  const layout: Array<[number, "ups" | "storage" | "compute" | "blank" | "switch" | "patch"]> = [
    [2, "ups"], [2, "storage"], [2, "storage"], [2, "storage"], [1, "blank"], ...compute(10), [1, "blank"],
    [1, "switch"], [1, "patch"], [1, "switch"], [1, "blank"], ...compute(8), [2, "storage"], [1, "blank"], ...compute(4), [2, "blank"],
  ];
  const ledGeo = res.own(new BoxGeometry(.075, .045, .02));
  const ledMat = res.own(new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  const leds: Array<{ m: Matrix4; kind: "power" | "disk" | "net"; unit: number }> = [];
  const bayGeo = res.own(new RoundedBoxGeometry(.36, .3, .06, 1, .015));
  const bays: Matrix4[] = [];
  const portGeo = res.own(new BoxGeometry(.14, .11, .05));
  const ports: Matrix4[] = [];
  const front = D / 2 - .55;
  let y = .55, unitIndex = 0;
  const vis = new Group(); group.add(vis);
  for (const [h, kind] of layout) {
    const hh = h * U - .02, cy = y + h * U / 2;
    const face = new BoxGeometry(W - 1.1, hh, .08);
    const uv = face.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (W - 1.1) / 1.6, uv.getY(i) * hh / .4);
    add(res, vis, face, kind === "blank" ? blank : bezel, `rack-${kind}-faceplate`, [0, cy, front]);
    add(res, vis, new BoxGeometry(W - 1.2, hh - .02, D - 2), blank, `rack-${kind}-chassis`, [0, cy, front - (D - 2) / 2 - .05]);
    if (kind === "storage") for (let i = 0; i < 12; i++) {
      bays.push(new Matrix4().makeTranslation(-2.1 + (i % 6) * .45, cy + (i < 6 ? .2 : -.2), front + .07));
      leds.push({ m: new Matrix4().makeTranslation(-2.0 + (i % 6) * .45, cy + (i < 6 ? .08 : -.32), front + .1), kind: "disk", unit: unitIndex });
    }
    if (kind === "compute") for (let i = 0; i < 8; i++) {
      bays.push(new Matrix4().makeScale(1, .7, 1).premultiply(new Matrix4().makeTranslation(-.6 + i * .4, cy, front + .07)));
      leds.push({ m: new Matrix4().makeTranslation(-.5 + i * .4, cy - .15, front + .1), kind: "disk", unit: unitIndex });
    }
    if (kind === "switch") for (let i = 0; i < 24; i++) {
      ports.push(new Matrix4().makeTranslation(-2.2 + (i % 12) * .3 + (i % 12 >= 6 ? .12 : 0), cy + (i < 12 ? .08 : -.08), front + .05));
      leds.push({ m: new Matrix4().makeTranslation(-2.2 + (i % 12) * .3 + (i % 12 >= 6 ? .12 : 0), cy + (i < 12 ? .16 : -.16), front + .1), kind: "net", unit: unitIndex });
    }
    if (kind !== "blank" && kind !== "patch") leds.push({ m: new Matrix4().makeTranslation(2.3, cy, front + .1), kind: "power", unit: unitIndex });
    y += h * U; unitIndex++;
  }
  const bayMesh = new InstancedMesh(bayGeo, bayMat, bays.length);
  bays.forEach((m, i) => bayMesh.setMatrixAt(i, m));
  const portMesh = new InstancedMesh(portGeo, holeMat, ports.length);
  ports.forEach((m, i) => portMesh.setMatrixAt(i, m));
  const ledMesh = new InstancedMesh(ledGeo, ledMat, leds.length);
  leds.forEach((l, i) => ledMesh.setMatrixAt(i, l.m));
  group.add(res.name(bayMesh, "rack-drive-bays"), res.name(portMesh, "rack-switch-ports"), res.name(ledMesh, "rack-status-leds"));
  // Patch cables from switch ports into the side cable manager.
  const cableColors = ["#2f6fd6", "#e0b43a", "#9aa3ad", "#2fb36b"];
  const switchY = .55 + layout.slice(0, layout.findIndex(([, k]) => k === "switch")).reduce((a, [h]) => a + h * U, 0) + U / 2;
  for (let i = 0; i < 12; i++) {
    const x0 = -2.2 + i * .3 + (i >= 6 ? .12 : 0), side = i < 6 ? -1 : 1;
    const curve = new CatmullRomCurve3([
      new Vector3(x0, switchY + .08, front + .1), new Vector3(x0, switchY + .05, front + .45),
      new Vector3(side * (W / 2 - .7), switchY - .4 - i * .03, front + .4), new Vector3(side * (W / 2 - .55), switchY - 2.5, front + .1),
    ]);
    const cableMat = res.own(new MeshPhysicalMaterial({ color: cableColors[i % 4], roughness: .45, clearcoat: .3 }));
    add(res, group, new TubeGeometry(curve, 40, .035, 8, false), cableMat, "rack-patch-cable");
  }
  const color = new Color();
  const setLeds = (fn: (l: (typeof leds)[number], i: number) => string | null) => {
    leds.forEach((l, i) => { const c = fn(l, i); ledMesh.setColorAt(i, color.set(c ?? "#0a0c0a")); });
    if (ledMesh.instanceColor) ledMesh.instanceColor.needsUpdate = true;
  };
  const idle = (l: (typeof leds)[number]) => l.kind === "power" ? "#3df07a" : l.kind === "net" ? "#3df07a" : "#38c8ff";
  setLeds(idle);
  return {
    id: group.name, group, parts: res.parts, tier: "hero", metersPerUnit: .1, exposure: 1.05,
    bounds: { min: [-W / 2 - .5, 0, -D / 2], max: [W / 2 + .5, H, D / 2 + 1] },
    studio: { palette: "midnight", keyAzimuth: -30 },
    craft: {
      materials: ["powder-coated steel cabinet", "brushed steel posts", "hex-perforated bezels (normal mapped)", "unlit status LEDs", "patch cables"],
      details: ["42U posts with mounting holes", "UPS, storage with 24 drive bays, 8 compute nodes, two switches with 48 ports, patch panel",
        "per-unit LEDs with deterministic activity", "cables routed into the side manager"],
    },
    actions: RACK_ACTIONS,
    pose(state: HeroActionState) {
      if (!state.id) { setLeds(idle); return; }
      const spec = findAction(RACK_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
      const frame = Math.floor(t * spec.durationFrames);
      if (spec.id === "activity") {
        setLeds((l, i) => {
          if (l.kind === "power") return "#3df07a";
          const r = seededRandom(i * 977 + Math.floor(frame / (l.kind === "net" ? 2 : 3)) * 131)();
          return r < (l.kind === "net" ? .55 : .35) ? (l.kind === "net" ? "#3df07a" : "#ffb347") : l.kind === "disk" ? "#123040" : "#0c2a14";
        });
      } else {
        const units = layout.length;
        setLeds((l, i) => {
          const on = t > .05 + l.unit / units * .7;
          if (!on) return null;
          const settle = t > .2 + l.unit / units * .7;
          return settle ? idle(l) : (seededRandom(i + frame * 7)() > .5 ? "#ffb347" : null);
        });
      }
    },
    dispose: res.dispose,
  };
}

