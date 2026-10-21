/* global fetch, OffscreenCanvas, ImageData, document, window, btoa */
/** Browser half of rocketbox-to-glb.mjs: FBX + TGA → PBR GLB with retargeted clips. */
import { AnimationClip, CanvasTexture, DoubleSide, LoadingManager, MeshStandardMaterial, NoColorSpace, SRGBColorSpace } from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { TGALoader } from "three/addons/loaders/TGALoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const fetchBuf = async f => { const r = await fetch("/src/" + f); if (!r.ok) throw new Error("missing " + f); return r.arrayBuffer(); };
const fbx = buf => { const m = new LoadingManager(); m.setURLModifier(() => "data:,"); return new FBXLoader(m).parse(buf, "/src/"); };

/** TGA → canvas at `size`, optionally transformed per pixel. */
async function tgaCanvas(file, size, pixel) {
  const tex = new TGALoader().parse(await fetchBuf(file));
  const { width, height, data } = tex;
  const src = new OffscreenCanvas(width, height), sctx = src.getContext("2d");
  const img = new ImageData(new Uint8ClampedArray(data), width, height);
  if (pixel) for (let i = 0; i < img.data.length; i += 4) pixel(img.data, i);
  sctx.putImageData(img, 0, 0);
  const c = document.createElement("canvas"); c.width = c.height = size;
  const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, size, size);
  return c;
}
function stats(canvas) {
  const d = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0, a = 0; for (let i = 0; i < d.length; i += 4) { sum += d[i]; a += d[i + 3]; }
  return { meanR: +(sum / (d.length / 4) / 255).toFixed(3), meanA: +(a / (d.length / 4) / 255).toFixed(3) };
}
function texture(canvas, color, mime) {
  // flipY stays true (FBX UV convention); GLTFExporter flips the image on export.
  const t = new CanvasTexture(canvas); t.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  t.userData.mimeType = mime; t.anisotropy = 4; return t;
}

export default async function ({ avatar, textures, clips, size, rough, out }) {
  const root = fbx(await fetchBuf(avatar));
  root.animations = [];
  // FBX scenes can carry authoring lights; the studio owns lighting.
  const lights = []; root.traverse(n => { if (n.isLight) lights.push(n); }); lights.forEach(l => l.removeFromParent());
  const report = { materials: {}, clips: [] };
  const meshes = []; root.traverse(n => { if (n.isSkinnedMesh) meshes.push(n); });
  const cache = new Map();
  for (const mesh of meshes) {
    mesh.geometry.deleteAttribute("color");
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = [];
    for (const old of mats) {
      if (!cache.has(old.name)) {
        const base = `${textures}/${old.name}`;
        const color = await tgaCanvas(`${base}_color.tga`, size);
        const normal = await tgaCanvas(`${base}_normal.tga`, size).catch(() => null);
        // Specular (grey, R) → glTF roughness (G) remapped to the declared range; metal 0.
        const [r0, r1] = rough[old.name.replace(/^.*?_/, "")] ?? rough.default;
        let specStats = null, specCanvas = null;
        try {
          specCanvas = await tgaCanvas(`${base}_specular.tga`, size, (d, i) => {
            const s = d[i] / 255; d[i + 1] = Math.round((r1 - (r1 - r0) * s) * 255); d[i] = 255; d[i + 2] = 0; d[i + 3] = 255;
          });
        } catch { /* opacity atlases ship without specular */ }
        const cs = stats(color);
        const cutout = old.name.endsWith("opacity") || cs.meanA < .98;
        if (specCanvas) specStats = stats(specCanvas);
        const m = new MeshStandardMaterial({ name: old.name,
          map: texture(color, true, cutout ? "image/png" : "image/jpeg"),
          normalMap: normal && texture(normal, false, "image/jpeg"),
          roughness: specCanvas ? 1 : (r0 + r1) / 2, metalness: 0,
          roughnessMap: specCanvas ? texture(specCanvas, false, "image/jpeg") : null,
          alphaTest: cutout ? .5 : 0, transparent: false, side: cutout ? DoubleSide : 0 });
        cache.set(old.name, m);
        report.materials[old.name] = { cutout, color: cs, roughness: specStats && { meanG: specStats } };
      }
      next.push(cache.get(old.name));
    }
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
    mesh.name = "body";
  }
  // Centimetres → metres.
  root.scale.setScalar(.01);
  root.name = "rocketbox-avatar";
  const names = new Set(); root.traverse(n => names.add(n.name));
  const animations = [];
  for (const { file, name, maxSeconds, inPlace } of clips) {
    const src = fbx(await fetchBuf(file)).animations[0];
    // Rotation tracks for bones this avatar has; root translation only (keeps this avatar's bone lengths).
    const tracks = src.tracks.filter(t => {
      const [node, prop] = t.name.split(".");
      return names.has(node) && (prop === "quaternion" || (prop === "position" && node === "Bip01"));
    });
    if (inPlace) {
      // Treadmill: remove the linear ground-plane travel, keep sway and bob, so the cycle loops on the spot.
      const root = tracks.find(t => t.name === "Bip01.position"), v = root.values, n = v.length / 3, end = root.times[n - 1] || 1;
      const dx = v[(n - 1) * 3] - v[0], dz = v[(n - 1) * 3 + 2] - v[2];
      for (let i = 0; i < n; i++) { const k = root.times[i] / end; v[i * 3] -= dx * k; v[i * 3 + 2] -= dz * k; }
      report.travel ??= {}; report.travel[name] = { metersPerCycle: +(Math.hypot(dx, dz) / 100).toFixed(3), seconds: +end.toFixed(3) };
    }
    let clip = new AnimationClip(name, -1, tracks);
    if (maxSeconds && clip.duration > maxSeconds) { clip = clip.clone(); clip.tracks.forEach(t => t.trim(0, maxSeconds)); clip.resetDuration(); }
    clip.optimize();
    animations.push(clip);
    report.clips.push({ name, seconds: +clip.duration.toFixed(2), tracks: clip.tracks.length });
  }
  const glb = await new GLTFExporter().parseAsync(root, { binary: true, animations, onlyVisible: false });
  const bytes = new Uint8Array(glb); let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  await window.saveBytes(out, btoa(s));
  report.bytes = bytes.length;
  return report;
}
