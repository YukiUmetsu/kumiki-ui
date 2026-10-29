/**
 * A physical open book on a desk, built with Three.js for the page-turn
 * scenes. Reusable pieces:
 *   createPageLeaf     a bending leaf: front and back sheets a paper thickness
 *                      apart, a paper edge rim, real normals from the curl
 *   createPageBlock    one side's page block: gutter-curved top that carries a
 *                      page face, a fore edge and head/tail edges of stacked leaves
 *   createPageTurnBook the whole set: blocks, boards, spine, headbands, desk,
 *                      contact shadow, warm key light with soft shadows and an
 *                      optional HDRI fill
 * The rig never animates itself. `update()` takes the book state and camera for
 * one frame (from page-curl.ts) and the host renders once, so export is exact.
 */
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, FogExp2, Group,
  HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, RepeatWrapping,
  SRGBColorSpace, Scene, SpotLight, Texture, Vector2,
} from "three";
import type { Material } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { blockTop, cameraEye, createLeafSurface, deformLeaf, hingeHeight, restRow, sheetIndex } from "./page-curl";
import type { BookFrameState, BookShape, LeafBend, LeafSurface } from "./page-curl";
export type { BookFrameState } from "./page-curl";

/** Decoded tileable maps; colour maps multiply the material colour. */
export interface SurfaceImages { color?: TexImageSource; normal?: TexImageSource; roughness?: TexImageSource; repeat?: number }
type TexImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;
/** Approximate blackbody colour for a colour temperature in kelvin (Tanner Helland's fit). */
export function kelvinColor(k: number): Color {
  const t = k / 100, c = (n: number) => Math.max(0, Math.min(255, n)) / 255;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return new Color().setRGB(c(r), c(g), c(b), SRGBColorSpace);
}
/** Wraps a decoded image as a repeating texture. */
export function surfaceTexture(source: TexImageSource, repeat: [number, number], srgb: boolean, anisotropy = 8): Texture {
  const t = new Texture(source as HTMLImageElement);
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = anisotropy;
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true; return t;
}
/** PBR surface from a colour, a roughness and optional detail maps. */
export function surfaceMaterial(color: string, roughness: number, maps: SurfaceImages | undefined, repeat: [number, number], normalScale = 1): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: new Color(color), roughness, metalness: 0 });
  if (maps?.color) m.map = surfaceTexture(maps.color, repeat, true);
  if (maps?.normal) { m.normalMap = surfaceTexture(maps.normal, repeat, false); m.normalScale = new Vector2(normalScale, normalScale); }
  if (maps?.roughness) { m.roughnessMap = surfaceTexture(maps.roughness, repeat, false); m.roughness = Math.min(1, roughness * 1.15); }
  return m;
}
/** A printed page face material: colour and roughness canvases plus tiled paper relief. */
export function pageFaceMaterial(color: HTMLCanvasElement, rough: HTMLCanvasElement, paperNormal?: Texture): MeshStandardMaterial {
  const map = new CanvasTexture(color); map.colorSpace = SRGBColorSpace; map.anisotropy = 8;
  const roughnessMap = new CanvasTexture(rough); roughnessMap.anisotropy = 8;
  const m = new MeshStandardMaterial({ map, roughnessMap, roughness: 1, metalness: 0 });
  if (paperNormal) { m.normalMap = paperNormal; m.normalScale = new Vector2(.35, .35); }
  return m;
}

/* ------------------------------------------------------------------------ */

export interface PageLeaf {
  group: Group; front: Mesh; back: Mesh; edge: Mesh; surface: LeafSurface;
  /** Re-shapes the leaf for one frame. */
  bend(shape: BookShape, bend: LeafBend, side: 1 | -1): void;
  dispose(): void;
}
/** A turning leaf with two printed faces and a visible paper edge. */
export function createPageLeaf(edgeMaterial: Material, columns = 72, rows = 28): PageLeaf {
  const surface = createLeafSurface(columns, rows);
  const n = (columns + 1) * (rows + 1);
  const sheet = (pos: Float32Array, nor: Float32Array, uv: Float32Array) => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3)); g.setAttribute("normal", new BufferAttribute(nor, 3)); g.setAttribute("uv", new BufferAttribute(uv, 2));
    return g;
  };
  const frontGeo = sheet(surface.position, surface.normal, surface.uv), backGeo = sheet(surface.backPosition, surface.backNormal, surface.backUv);
  // Rim: fore edge (rows + 1) plus head and tail (columns + 1 each), two vertices (top, underside) per sample.
  const rimCount = (rows + 1) + 2 * (columns + 1);
  const rimPos = new Float32Array(rimCount * 2 * 3), rimIdx: number[] = [];
  const strip = (start: number, count: number) => { for (let k = 0; k < count - 1; k++) { const a = (start + k) * 2; rimIdx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); } };
  strip(0, rows + 1); strip(rows + 1, columns + 1); strip(rows + 1 + columns + 1, columns + 1);
  const rimGeo = new BufferGeometry(); rimGeo.setAttribute("position", new BufferAttribute(rimPos, 3)); rimGeo.setIndex(rimIdx);
  const front = new Mesh(frontGeo), back = new Mesh(backGeo), edge = new Mesh(rimGeo, edgeMaterial);
  for (const m of [front, back, edge]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
  const group = new Group(); group.add(front, back, edge); group.name = "page-leaf";
  let wound = 0;
  return { group, front, back, edge, surface,
    bend(shape, b, side) {
      deformLeaf(surface, shape, b, side);
      if (wound !== side) {
        frontGeo.setIndex(new BufferAttribute(sheetIndex(columns, rows, side < 0), 1));
        backGeo.setIndex(new BufferAttribute(sheetIndex(columns, rows, side > 0), 1));
        wound = side;
      }
      const P = surface.position, B = surface.backPosition;
      const put = (slot: number, k: number) => { rimPos.set(P.subarray(k * 3, k * 3 + 3), slot * 6); rimPos.set(B.subarray(k * 3, k * 3 + 3), slot * 6 + 3); };
      let slot = 0;
      for (let j = 0; j <= rows; j++) put(slot++, j * (columns + 1) + columns);
      for (let i = 0; i <= columns; i++) put(slot++, i);
      for (let i = 0; i <= columns; i++) put(slot++, rows * (columns + 1) + i);
      for (const g of [frontGeo, backGeo]) { g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.attributes.uv.needsUpdate = true; }
      rimGeo.attributes.position.needsUpdate = true; rimGeo.computeVertexNormals();
      void n;
    },
    dispose() { frontGeo.dispose(); backGeo.dispose(); rimGeo.dispose(); },
  };
}

export interface PageBlock { group: Group; top: Mesh; dispose(): void }
/**
 * One side's page block (`side` +1 = right of the spine). The top follows the
 * gutter curve and carries a page face; the fore edge and head/tail faces show
 * stacked leaves whose lines follow that curve.
 */
export function createPageBlock(shape: BookShape, side: 1 | -1, edgeMaterial: Material, columns = 64): PageBlock {
  const xs = new Float32Array(columns + 1), ys = new Float32Array(columns + 1), as = new Float32Array(columns + 1);
  restRow(shape, columns, { x: xs, y: ys, angle: as });
  const h = shape.aspect, base = shape.board, rows = 6;
  // Top surface.
  const n = (columns + 1) * (rows + 1), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    const k = j * (columns + 1) + i, v = j / rows;
    pos.set([side * xs[i], ys[i], (v - .5) * h], k * 3);
    nor.set([-side * Math.sin(as[i]), Math.cos(as[i]), 0], k * 3);
    uv.set([side > 0 ? i / columns : 1 - i / columns, 1 - v], k * 2);
  }
  const topGeo = new BufferGeometry();
  topGeo.setAttribute("position", new BufferAttribute(pos, 3)); topGeo.setAttribute("normal", new BufferAttribute(nor, 3)); topGeo.setAttribute("uv", new BufferAttribute(uv, 2));
  topGeo.setIndex(new BufferAttribute(sheetIndex(columns, rows, side < 0), 1));
  const top = new Mesh(topGeo); top.receiveShadow = true; top.castShadow = true; top.name = "page-block-top";
  // Edges: fore edge (a vertical strip down the page) and head/tail (curve to board).
  const ep: number[] = [], eu: number[] = [], ei: number[] = [];
  const quadStrip = (a: number[][], b: number[][], ua: number[][], ub: number[][]) => {
    const s = ep.length / 3;
    for (let k = 0; k < a.length; k++) { ep.push(...a[k], ...b[k]); eu.push(...ua[k], ...ub[k]); }
    for (let k = 0; k < a.length - 1; k++) { const p = s + k * 2; ei.push(p, p + 1, p + 2, p + 2, p + 1, p + 3); }
  };
  const fx = side * xs[columns], fy = ys[columns];
  const zs = Array.from({ length: rows + 1 }, (_, j) => (j / rows - .5) * h);
  quadStrip(zs.map(z => [fx, fy, z]), zs.map(z => [fx, base, z]), zs.map((_, j) => [j / rows, 1]), zs.map((_, j) => [j / rows, 0]));
  for (const z of [-h / 2, h / 2]) {
    const idx = Array.from({ length: columns + 1 }, (_, i) => i);
    quadStrip(idx.map(i => [side * xs[i], ys[i], z]), idx.map(i => [side * xs[i], base, z]), idx.map(i => [i / columns * 4, 1]), idx.map(i => [i / columns * 4, 0]));
  }
  const edgeGeo = new BufferGeometry();
  edgeGeo.setAttribute("position", new BufferAttribute(new Float32Array(ep), 3)); edgeGeo.setAttribute("uv", new BufferAttribute(new Float32Array(eu), 2));
  edgeGeo.setIndex(ei); edgeGeo.computeVertexNormals();
  const edges = new Mesh(edgeGeo, edgeMaterial); edges.castShadow = true; edges.receiveShadow = true; edges.name = "page-block-edges";
  const group = new Group(); group.add(top, edges);
  return { group, top, dispose() { topGeo.dispose(); edgeGeo.dispose(); } };
}

/* ------------------------------------------------------------------------ */

export interface PageTurnBookOptions {
  shape: BookShape;
  /** +1: leaves travel from the right page to the left (left-to-right books). */
  side: 1 | -1;
  /** Page faces, indexed: colour and roughness canvases from page-face.ts. */
  faces: { color: HTMLCanvasElement; roughness: HTMLCanvasElement }[];
  edgeCanvas: HTMLCanvasElement;
  paper: { normal?: TexImageSource };
  cover: { color: string; roughness: number; maps?: SurfaceImages; headband?: string; material: "cloth" | "leather" | "paper" };
  desk: { color: string; roughness: number; maps?: SurfaceImages };
  light: { azimuth: number; elevation: number; warmth: number; intensity: number };
  /** Pre-filtered environment (PMREM) for reflections and fill. */
  environment?: Texture;
  backdrop: string;
  shadowOpacity: number;
}
export interface PageTurnBook {
  scene: Scene; camera: PerspectiveCamera;
  update(state: BookFrameState): void;
  dispose(): void;
}
function contactShadowTexture(): CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.filter = "blur(18px)"; g.fillStyle = "#000"; g.fillRect(40, 40, 176, 176);
  const t = new CanvasTexture(c); return t;
}
function headbandTexture(color: string): CanvasTexture {
  const c = document.createElement("canvas"); c.width = 64; c.height = 8;
  const g = c.getContext("2d")!;
  for (let x = 0; x < 64; x += 8) { g.fillStyle = color; g.fillRect(x, 0, 4, 8); g.fillStyle = "#efe6d2"; g.fillRect(x + 4, 0, 4, 8); }
  const t = new CanvasTexture(c); t.wrapS = RepeatWrapping; t.repeat.set(6, 1); t.colorSpace = SRGBColorSpace; return t;
}

export function createPageTurnBook(o: PageTurnBookOptions): PageTurnBook {
  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { owned.push(x); return x; };
  const { shape } = o, h = shape.aspect;
  const scene = new Scene();
  scene.background = new Color(o.backdrop);
  scene.fog = new FogExp2(new Color(o.backdrop), .075);
  if (o.environment) { scene.environment = o.environment; scene.environmentIntensity = .32; }
  const camera = new PerspectiveCamera(30, 16 / 9, .05, 60);

  const paperNormal = o.paper.normal ? own(surfaceTexture(o.paper.normal, [2.2, 2.2 * h], false)) : undefined;
  const faces = o.faces.map(f => own(pageFaceMaterial(f.color, f.roughness, paperNormal)));
  const edgeTex = own(new CanvasTexture(o.edgeCanvas)); edgeTex.colorSpace = SRGBColorSpace; edgeTex.wrapS = RepeatWrapping;
  const edgeMat = own(new MeshStandardMaterial({ map: edgeTex, roughness: .95, side: DoubleSide }));
  const leafEdge = own(new MeshStandardMaterial({ color: new Color(0xf3ead6), roughness: .9, side: DoubleSide }));
  const coverRepeat: [number, number] = o.cover.material === "leather" ? [1.2, 1.6] : [3, 4];
  const cover = own(surfaceMaterial(o.cover.color, o.cover.roughness, o.cover.maps, coverRepeat, o.cover.material === "cloth" ? .9 : .6));
  const deskRepeat = o.desk.maps?.repeat ?? 2.2;
  const desk = own(surfaceMaterial(o.desk.color, o.desk.roughness, o.desk.maps, [deskRepeat, deskRepeat], .7));
  // The desk is a broad, low-gloss surface: keep the room's windows from reading as a milky smear across it.
  desk.envMapIntensity = .28;

  const book = new Group(); book.name = "open-book"; scene.add(book);
  const blocks = ([1, -1] as const).map(side => { const b = createPageBlock(shape, side, edgeMat); owned.push(b); book.add(b.group); return b; });
  // Boards: cloth-covered, rounded edges, with squares standing proud of the pages.
  const joint = .028, sq = shape.squares, bw = 1 + sq - joint * .4, bd = h + sq * 2;
  for (const side of [1, -1]) {
    const geo = own(new RoundedBoxGeometry(bw, shape.board, bd, 3, shape.board * .45));
    const board = new Mesh(geo, cover); board.position.set(side * (joint + bw / 2), shape.board / 2, 0);
    board.castShadow = board.receiveShadow = true; board.name = "cover-board"; book.add(board);
  }
  const spine = new Mesh(own(new BoxGeometry(joint * 2.2, shape.board * .8, bd - sq * .5)), cover);
  spine.position.set(0, shape.board * .4, 0); spine.receiveShadow = true; book.add(spine);
  // Headbands at head and tail of the spine, filling the gap where the leaves meet.
  const hb = hingeHeight(shape) - shape.board, hbTex = own(headbandTexture(o.cover.headband ?? "#7a2a22"));
  const hbMat = own(new MeshStandardMaterial({ map: hbTex, roughness: .7 }));
  for (const z of [-h / 2 - .002, h / 2 + .002]) {
    const band = new Mesh(own(new CylinderGeometry(hb * .42, hb * .42, joint * 2.4, 16)), hbMat);
    band.rotation.z = Math.PI / 2; band.position.set(0, shape.board + hb * .45, z); book.add(band);
  }
  const leaf = createPageLeaf(leafEdge); owned.push(leaf); book.add(leaf.group);

  // Desk and a soft contact shadow that grounds the book.
  const deskMesh = new Mesh(own(new PlaneGeometry(18, 18)), desk); deskMesh.rotation.x = -Math.PI / 2; deskMesh.receiveShadow = true;
  scene.add(deskMesh);
  const contact = new Mesh(own(new PlaneGeometry((1 + sq) * 2 * 1.45, bd * 1.45)),
    own(new MeshBasicMaterial({ color: 0x000000, alphaMap: own(contactShadowTexture()), transparent: true, opacity: o.shadowOpacity, depthWrite: false })));
  contact.rotation.x = -Math.PI / 2; contact.position.y = .0015; scene.add(contact);

  // Key: a warm lamp from the authored direction, wide soft penumbra so the desk falls off into shadow.
  const key = new SpotLight(kelvinColor(o.light.warmth), o.light.intensity * 3.2, 0, Math.PI / 7, .85, 0);
  const az = o.light.azimuth * Math.PI / 180, el = o.light.elevation * Math.PI / 180, R = 9;
  key.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, -Math.cos(az) * Math.cos(el) * R);
  key.target.position.set(0, blockTop(shape), 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5;
  key.shadow.bias = -.00012; key.shadow.normalBias = .0025; key.shadow.camera.near = 4; key.shadow.camera.far = 16;
  scene.add(key, key.target);
  const fill = new HemisphereLight(kelvinColor(Math.max(o.light.warmth + 2600, 6500)), new Color("#3a2414"), o.environment ? .22 : .5);
  scene.add(fill);

  const facesAt = (i: number) => faces[Math.max(0, Math.min(faces.length - 1, i))];
  return {
    scene, camera,
    update(s) {
      // blocks[0] is the physical right (+x) block, blocks[1] the left.
      blocks[0].top.material = facesAt(s.right); blocks[1].top.material = facesAt(s.left);
      leaf.group.visible = !!s.leaf;
      if (s.leaf) { leaf.bend(shape, s.leaf.bend, o.side); leaf.front.material = facesAt(s.leaf.front); leaf.back.material = facesAt(s.leaf.back); }
      const eye = cameraEye(s.camera);
      camera.fov = s.camera.fov; camera.aspect = s.aspect; camera.position.set(eye[0], eye[1], eye[2]);
      camera.lookAt(s.camera.target[0], s.camera.target[1], s.camera.target[2]); camera.updateProjectionMatrix();
    },
    dispose() {
      for (const x of owned) x.dispose();
      for (const m of [cover, desk]) for (const t of [m.map, m.normalMap, m.roughnessMap]) t?.dispose();
      for (const m of faces) { m.map?.dispose(); m.roughnessMap?.dispose(); }
    },
  };
}
