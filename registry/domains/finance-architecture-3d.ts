/** Neoclassical bank: the universally legible "bank" for explainers.
 *
 * Hard-surface construction following classical proportion: a three-step
 * stylobate; lathe-turned columns with entasis, torus base, real cut flutes
 * and echinus/abacus capital; a three-fascia architrave, inscribed frieze,
 * cornice with an instanced dentil course; a pediment with recessed tympanum
 * and medallion; an ashlar cella with world-space block texture, paneled
 * bronze doors with transom grille, and bronze lanterns with warm glass.
 *
 * Front faces +Z, ground is y = 0, 1 unit ≈ 2.5 m. Original, anonymous design.
 */
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Group, InstancedMesh,
  LatheGeometry, Matrix4, Mesh, MeshPhysicalMaterial, Shape, Vector2,
} from "three";
import type { Material } from "three";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { paintWithRelief } from "../craft/canvas-texture";
import { applySurfaceDetail } from "../craft/surface-detail";

export interface ClassicalBankOptions {
  id?: string;
  /** Carved frieze inscription (keep anonymous). */
  inscription?: string;
  /** Front columns: 4 (tetrastyle) or 6 (hexastyle). */
  columns?: 4 | 6;
  lanterns?: boolean;
  /** Stone tone (sRGB hex). */
  stone?: string;
}

/** Planar world-space UVs by dominant normal; keeps texel density equal on every face. */
function worldUv<T extends BufferGeometry>(geometry: T, scale: number): T {
  const pos = geometry.attributes.position as BufferAttribute;
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal as BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i)), nz = Math.abs(normal.getZ(i));
    const [u, v] = ny >= nx && ny >= nz ? [pos.getX(i), pos.getZ(i)] : nx >= nz ? [pos.getZ(i), pos.getY(i)] : [pos.getX(i), pos.getY(i)];
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  return geometry;
}

/** Ashlar masonry: running bond with per-block tone variation (albedo + joint relief). */
const ashlar = (base: string) => (ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number) => {
  ctx.fillStyle = "#6f6a60"; ctx.fillRect(0, 0, w, h); // mortar
  const rows = 4, cols = 2, bh = h / rows, bw = w / cols, joint = 5;
  for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
    const x = c * bw + (r % 2 ? bw / 2 : 0);
    const tone = .9 + random() * .14;
    ctx.fillStyle = base; ctx.globalAlpha = 1;
    ctx.fillRect(x + joint, r * bh + joint, bw - joint * 2, bh - joint * 2);
    ctx.fillStyle = tone > 1 ? "#ffffff" : "#000000"; ctx.globalAlpha = Math.abs(tone - 1) * 1.6;
    ctx.fillRect(x + joint, r * bh + joint, bw - joint * 2, bh - joint * 2);
    // Soft weathering toward the bottom of each block.
    const grad = ctx.createLinearGradient(0, r * bh, 0, (r + 1) * bh);
    grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(60,50,40,.12)");
    ctx.globalAlpha = 1; ctx.fillStyle = grad; ctx.fillRect(x + joint, r * bh + joint, bw - joint * 2, bh - joint * 2);
  }
  ctx.globalAlpha = 1;
};

const frieze = (text: string, base: string) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#3d3a33"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(h * .58)}px "Trajan Pro", "Cinzel", "Optima", "Palatino Linotype", Georgia, serif`;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(h * .32)}px`;
  ctx.fillText(text.toUpperCase(), w / 2 + h * .16, h * .54);
};

function columnGeometry(height: number, radius: number): BufferGeometry {
  const r = radius, pts: Vector2[] = [];
  // Attic-style base: plinth, lower torus, scotia, upper torus.
  pts.push(new Vector2(0, 0), new Vector2(r * 1.32, 0), new Vector2(r * 1.32, r * .1));
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI; pts.push(new Vector2(r * 1.18 + Math.cos(a) * r * .14, r * .24 + Math.sin(a) * r * .14)); }
  pts.push(new Vector2(r * 1.05, r * .42), new Vector2(r * 1.09, r * .5));
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI; pts.push(new Vector2(r * 1.03 + Math.cos(a) * r * .09, r * .6 + Math.sin(a) * r * .09)); }
  // Shaft with entasis: straight for the lower third, then a gentle taper.
  const shaftStart = r * .7, shaftEnd = height - r * .75, steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, y = shaftStart + (shaftEnd - shaftStart) * t;
    const taper = t < .33 ? 1 : 1 - .16 * Math.pow((t - .33) / .67, 1.4);
    pts.push(new Vector2(r * taper, y));
  }
  // Astragal ring, necking and echinus curve up to the abacus seat.
  const top = r * .84;
  pts.push(new Vector2(top * 1.1, shaftEnd + r * .02), new Vector2(top * 1.1, shaftEnd + r * .1), new Vector2(top, shaftEnd + r * .12));
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new Vector2(top + (r * 1.35 - top) * Math.sin(t * Math.PI / 2), shaftEnd + r * .3 + t * r * .33)); }
  pts.push(new Vector2(0, shaftEnd + r * .63));
  const g = new LatheGeometry(pts, 80);
  // Cut 20 flutes into the shaft only (concave channels separated by fillets).
  const pos = g.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < shaftStart + r * .15 || y > shaftEnd - r * .05) continue;
    const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    const channel = Math.max(0, Math.cos(a * 20)), depth = rr * .055 * Math.pow(channel, .7);
    const k = (rr - depth) / rr; pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function createClassicalBank(options: ClassicalBankOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "classical-bank";
  const stoneHex = options.stone ?? "#cbc2b0";
  const cols = options.columns ?? 6;
  const W = cols === 6 ? 4.4 : 3.4, D = 3.0, stepH = .12, base = stepH * 3;
  const colH = 2.3, colR = .135;

  // Materials: plain dressed stone, ashlar walls, carved frieze, bronze, glass.
  const stone = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: stoneHex, roughness: .78, metalness: 0 }),
    { kind: "stone", frequency: 14, strength: .0018, roughnessVariation: .2, albedoVariation: .16 }));
  const blockTex = paintWithRelief(1024, 1024, ashlar(stoneHex), { seed: 7, strength: 2.2, repeat: true, fallback: [210, 202, 186, 255] });
  res.own(blockTex.map); res.own(blockTex.normalMap);
  const masonry = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ map: blockTex.map, normalMap: blockTex.normalMap, normalScale: new Vector2(.9, .9), roughness: .82 }),
    { kind: "stone", frequency: 14, strength: .0015, roughnessVariation: .2, albedoVariation: .1 }));
  const friezeTex = paintWithRelief(2048, 256, frieze(options.inscription ?? "Bank", stoneHex), { seed: 2, strength: 2.6, fallback: [210, 202, 186, 255] });
  res.own(friezeTex.map); res.own(friezeTex.normalMap);
  const inscribed = res.own(new MeshPhysicalMaterial({ map: friezeTex.map, normalMap: friezeTex.normalMap, roughness: .8 }));
  const bronze = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#5e4129", metalness: 1, roughness: .42 }),
    { kind: "cast-metal", frequency: 30, strength: .0006 }));
  const darkGlass = res.own(new MeshPhysicalMaterial({ color: "#1a2228", metalness: 0, roughness: .06, clearcoat: 1 }));
  const warmGlass = res.own(new MeshPhysicalMaterial({ color: "#ffe2b0", emissive: "#ffb85c", emissiveIntensity: .9, roughness: .3, transmission: .2 }));

  const add = (geometry: BufferGeometry, material: Material | Material[], name: string, shadow = true) => {
    const mesh = new Mesh(res.own(geometry), material);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    group.add(res.name(mesh, name));
    return mesh;
  };
  const block = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new BoxGeometry(w, h, d); g.translate(x, y, z); return g;
  };

  // Stylobate: three steps.
  for (let i = 0; i < 3; i++) {
    const grow = (2 - i) * .2;
    add(worldUv(block(W + .5 + grow * 2, stepH, D + .5 + grow * 2, 0, stepH * (i + .5), .1 + grow * .5), .5), stone, `bank-step-${i + 1}`);
  }
  // Cella: side, back and front walls in ashlar, with door opening.
  const wallT = .28, porch = .95, cellaFront = D / 2 + .1 - porch;
  const wallH = colH + .02;
  for (const s of [-1, 1]) add(worldUv(block(wallT, wallH, D - porch + .1, s * (W / 2 - wallT / 2 - .05), base + wallH / 2, cellaFront - (D - porch + .1) / 2), .55), masonry, "bank-cella-side-wall");
  add(worldUv(block(W - .1, wallH, wallT, 0, base + wallH / 2, -D / 2 + .1 + wallT / 2), .55), masonry, "bank-cella-back-wall");
  const doorW = .95, doorH = 1.55;
  const frontW = (W - .1 - doorW) / 2;
  for (const s of [-1, 1]) add(worldUv(block(frontW, wallH, wallT, s * (doorW / 2 + frontW / 2), base + wallH / 2, cellaFront - wallT / 2), .55), masonry, "bank-cella-front-wall");
  add(worldUv(block(doorW, wallH - doorH, wallT, 0, base + doorH + (wallH - doorH) / 2, cellaFront - wallT / 2), .55), masonry, "bank-door-lintel-wall");
  // Antae: pilasters terminating the side walls at the porch.
  for (const s of [-1, 1]) add(worldUv(block(.32, wallH, .34, s * (W / 2 - .2), base + wallH / 2, cellaFront + .02), .5), stone, "bank-anta-pilaster");
  // Door surround (architrave molding) and paneled bronze leaves.
  for (const [w, h, x, y] of [[.1, doorH + .1, -doorW / 2 - .05, base + doorH / 2 + .05], [.1, doorH + .1, doorW / 2 + .05, base + doorH / 2 + .05],
    [doorW + .3, .12, 0, base + doorH + .1]] as const) add(worldUv(block(w, h, .08, x, y, cellaFront + .02), .5), stone, "bank-door-surround");
  for (const s of [-1, 1]) {
    const leafX = s * doorW / 4;
    add(block(doorW / 2 - .02, doorH * .8, .05, leafX, base + doorH * .4, cellaFront - .05), bronze, "bank-bronze-door-leaf");
    for (const py of [.22, .58]) add(block(doorW / 2 - .16, doorH * .26, .03, leafX, base + doorH * py, cellaFront - .015), bronze, "bank-door-raised-panel");
    add(new CylinderGeometry(.018, .018, .18, 12).translate(s * .06, base + doorH * .42, cellaFront + .005), bronze, "bank-door-pull");
  }
  // Transom with bronze grille over dark glass.
  add(block(doorW - .04, doorH * .18, .02, 0, base + doorH * .9, cellaFront - .06), darkGlass, "bank-transom-glass");
  for (let i = 1; i < 6; i++) add(block(.016, doorH * .18, .03, -doorW / 2 + i * doorW / 6, base + doorH * .9, cellaFront - .045), bronze, "bank-transom-grille");

  // Columns (shared geometry) on square plinths.
  const columnGeo = res.own(columnGeometry(colH - .08, colR));
  const abacusGeo = res.own(new BoxGeometry(colR * 3.1, .07, colR * 3.1));
  const colZ = D / 2 - .1;
  for (let i = 0; i < cols; i++) {
    const x = -W / 2 + .35 + i * (W - .7) / (cols - 1);
    const column = new Mesh(columnGeo, stone);
    column.position.set(x, base, colZ);
    column.castShadow = true; column.receiveShadow = true;
    group.add(res.name(column, `bank-fluted-column-${i + 1}`));
    const abacus = new Mesh(abacusGeo, stone);
    abacus.position.set(x, base + colH - .045, colZ); abacus.castShadow = true; abacus.receiveShadow = true;
    group.add(res.name(abacus, "bank-capital-abacus"));
  }

  // Entablature: three stepped fasciae, inscribed frieze, cornice with dentils.
  const front = D / 2 + .08;
  let y = base + colH;
  for (let i = 0; i < 3; i++) {
    add(worldUv(block(W + .02 + i * .03, .1, D - .1 + i * .03, 0, y + .05, front - (D - .1 + i * .03) / 2 + i * .015), .5), stone, "bank-architrave-fascia");
    y += .1;
  }
  const friezeH = .34;
  const friezeGeo = block(W + .1, friezeH, .06, 0, y + friezeH / 2, front + .02);
  // Frieze front face reads the inscription: map UVs across the front.
  const fpos = friezeGeo.attributes.position as BufferAttribute, fuv = friezeGeo.attributes.uv as BufferAttribute;
  for (let i = 0; i < fpos.count; i++) fuv.setXY(i, fpos.getX(i) / (W + .1) + .5, (fpos.getY(i) - y) / friezeH);
  add(friezeGeo, inscribed, "bank-inscribed-frieze");
  add(worldUv(block(W + .08, friezeH, D - .1, 0, y + friezeH / 2, front - .03 - (D - .1) / 2), .5), stone, "bank-frieze-body");
  y += friezeH;
  // Dentil course (instanced) under the projecting corona.
  const dentil = res.own(new BoxGeometry(.05, .07, .06));
  const count = Math.floor((W + .2) / .1);
  const dentils = new InstancedMesh(dentil, stone, count);
  for (let i = 0; i < count; i++) dentils.setMatrixAt(i, new Matrix4().makeTranslation(-(W + .2) / 2 + .05 + i * .1, y + .035, front + .07));
  dentils.castShadow = true; dentils.receiveShadow = true;
  group.add(res.name(dentils, "bank-dentil-course"));
  // Bed sits behind the dentils so they read as a separate toothed course.
  add(worldUv(block(W + .26, .08, D, 0, y + .04, front + .03 - D / 2), .5), stone, "bank-cornice-bed");
  add(worldUv(block(W + .42, .12, D + .2, 0, y + .14, front + .16 - (D + .2) / 2), .5), stone, "bank-cornice-corona");
  y += .2;

  // Pediment: extruded gable with recessed tympanum, raking cornices and medallion.
  const pedH = .78, pedW = W + .38;
  const gable = new Shape();
  gable.moveTo(-pedW / 2, 0); gable.lineTo(pedW / 2, 0); gable.lineTo(0, pedH); gable.closePath();
  const pediment = new ExtrudeGeometry(gable, { depth: D - .2, bevelEnabled: false });
  pediment.translate(0, y, front + .03 - (D - .2));
  add(worldUv(pediment, .5), stone, "bank-pediment-mass");
  const inset = .16, tri = new Shape();
  const slope = Math.atan2(pedH, pedW / 2);
  const innerW = pedW / 2 - inset / Math.sin(slope) - inset / Math.tan(slope);
  tri.moveTo(-innerW, 0); tri.lineTo(innerW, 0); tri.lineTo(0, innerW * Math.tan(slope)); tri.closePath();
  const tympanum = new ExtrudeGeometry(tri, { depth: .04, bevelEnabled: false });
  tympanum.translate(0, y + inset * .6, front + .025);
  add(worldUv(tympanum, .5), masonry, "bank-tympanum");
  // Raking cornices: sloped corona bars along both roof edges.
  const rakeLen = Math.hypot(pedW / 2, pedH) + .12;
  for (const s of [-1, 1]) {
    const rake = new BoxGeometry(rakeLen, .11, .3);
    rake.rotateZ(s * -slope);
    rake.translate(s * pedW / 4, y + pedH / 2 + .05, front + .05);
    add(rake, stone, "bank-raking-cornice");
  }
  // Medallion: a lathe-turned disc and ring in the tympanum.
  // Lathe profiles run bottom → top (counter-clockwise) for outward-facing normals.
  const disc = new LatheGeometry([new Vector2(.13, 0), new Vector2(.13, .02), new Vector2(.125, .04), new Vector2(.11, .035), new Vector2(.09, .05), new Vector2(0, .045)], 48);
  disc.rotateX(Math.PI / 2);
  disc.translate(0, y + pedH * .36, front + .06);
  add(disc, bronze, "bank-tympanum-medallion");
  // Roof behind the pediment: two sloped slabs.
  for (const s of [-1, 1]) {
    const roof = new BoxGeometry(Math.hypot(pedW / 2, pedH) + .05, .06, D - .25);
    roof.rotateZ(s * -slope);
    roof.translate(s * pedW / 4, y + pedH / 2 + .02, front + .08 - (D - .25) / 2 - .05);
    add(roof, stone, "bank-roof-slab");
  }

  // Bronze lanterns on pedestals flanking the steps.
  if (options.lanterns ?? true) for (const s of [-1, 1]) {
    const lx = s * (W / 2 + .62), lz = D / 2 + .55;
    add(worldUv(block(.36, .55, .36, lx, .275, lz), .5), stone, "bank-lantern-pedestal");
    add(new CylinderGeometry(.03, .045, .55, 16).translate(lx, .55 + .275, lz), bronze, "bank-lantern-post");
    // Open lantern: cup, warm glass, four corner bars, domed cap and finial.
    const ly = 1.1;
    add(new LatheGeometry([new Vector2(0, 0), new Vector2(.05, 0), new Vector2(.11, .05), new Vector2(.11, .07), new Vector2(0, .07)], 24).translate(lx, ly, lz), bronze, "bank-lantern-cup");
    add(new CylinderGeometry(.088, .08, .26, 24).translate(lx, ly + .2, lz), warmGlass, "bank-lantern-glass", false);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2;
      add(new CylinderGeometry(.009, .009, .28, 8).translate(lx + Math.cos(a) * .1, ly + .2, lz + Math.sin(a) * .1), bronze, "bank-lantern-bar");
    }
    add(new LatheGeometry([new Vector2(0, 0), new Vector2(.135, 0), new Vector2(.135, .01), new Vector2(.1, .05), new Vector2(.04, .11), new Vector2(0, .12)], 24).translate(lx, ly + .34, lz), bronze, "bank-lantern-cap");
    add(new CylinderGeometry(.012, .02, .06, 10).translate(lx, ly + .49, lz), bronze, "bank-lantern-finial");
  }

  return {
    id: group.name, group, parts: res.parts, tier: "hero", exposure: .78,
    bounds: { min: [-(W / 2 + .9), 0, -D / 2], max: [W / 2 + .9, y + pedH + .1, D / 2 + .9] },
    studio: { palette: "slate", keyAzimuth: -40 },
    craft: {
      materials: ["dressed limestone with grain", "ashlar masonry (world-space block texture with joint relief)",
        "carved inscription (normal map from lettering)", "cast bronze doors, medallion and lanterns", "warm lantern glass"],
      details: ["three-step stylobate", "lathe-turned columns: attic base, entasis, 20 cut flutes, echinus and abacus",
        "three-fascia architrave", "inscribed frieze", "instanced dentil course under the corona", "pediment with recessed tympanum and medallion",
        "paneled bronze doors with pulls and transom grille", "antae pilasters", "bronze lanterns"],
    },
    dispose: res.dispose,
  };
}

