/** An original, illustrative precision assembly. Every layer is a named physical
 * group; the host owns time, camera, copy and media. No downloaded assets. */
import { forwardRef, useMemo } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../../craft/hero-asset";
import type { HeroAsset } from "../../craft/hero-asset";
import { HeroAssetViewer } from "../../craft/hero-viewer";
import type { SceneTemplateSpec } from "../scene-templates";

const smooth = (value: number) => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };
/** One deliberate unsealing action, followed by a sustained inspection hold. */
export function cutawayOpening(frame: number, duration: number) { return smooth((frame / Math.max(1, duration - 1) - .18) / .42); }

export function createCutawayHero(spec: SceneTemplateSpec<"layered-cutaway">): HeroAsset {
  const resources = createAssetResources();
  const group = new Group();
  const layers: Group[] = [];
  const metal = resources.own(new MeshStandardMaterial({ color: "#aeb7bf", roughness: .27, metalness: .94 }));
  const dark = resources.own(new MeshStandardMaterial({ color: "#20292c", roughness: .42, metalness: .72 }));
  const copper = resources.own(new MeshStandardMaterial({ color: "#bd8050", roughness: .31, metalness: .95 }));
  const board = resources.own(new MeshStandardMaterial({ color: "#193d38", roughness: .68, metalness: .12 }));
  const ceramic = resources.own(new MeshStandardMaterial({ color: "#15191c", roughness: .68 }));
  const glass = resources.own(new MeshPhysicalMaterial({ color: "#b6d6d6", roughness: .13, metalness: 0,
    transmission: .78, thickness: .09, ior: 1.48, clearcoat: .5 }));
  const block = (parent: Group | Mesh, size: [number, number, number], position: [number, number, number], material: MeshStandardMaterial, radius = .035) => {
    const geometry = resources.own(new RoundedBoxGeometry(...size, 3, Math.min(radius, Math.min(...size) * .45)));
    const mesh = new Mesh(geometry, material); mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const screwGeometry = resources.own(new CylinderGeometry(.055, .055, .04, 24));
  const slotGeometry = resources.own(new BoxGeometry(.065, .005, .012));
  const count = spec.content.layers.length;
  for (let index = 0; index < count; index++) {
    const layer = new Group(); resources.name(layer, spec.content.layers[index].id);
    layer.position.y = .16 + (count - index - 1) * .21;
    layer.userData.baseY = layer.position.y; layers.push(layer); group.add(layer);
    const role = index === 0 ? "cover" : index === count - 1 ? "chassis" : index % 2 ? "spreader" : "circuit";
    if (role === "cover" || role === "chassis") {
      // A real open frame, rather than a solid slab with a painted fake recess.
      const frameMaterial = role === "cover" ? metal : dark;
      for (const x of [-1.30, 1.30]) block(layer, [.17, .16, 1.94], [x, 0, 0], frameMaterial);
      for (const z of [-.94, .94]) block(layer, [2.58, .16, .16], [0, 0, z], frameMaterial);
      if (role === "cover") block(layer, [2.45, .065, 1.77], [0, -.025, 0], glass);
      else {
        block(layer, [2.58, .09, 1.84], [0, -.10, 0], dark);
        // Machined ventilation slots are separated ribs with real light gaps.
        for (let rib = 0; rib < 17; rib++) block(layer, [.055, .12, .40], [-.88 + rib * .11, .01, .67], metal, .008);
      }
    } else if (role === "spreader") {
      block(layer, [2.76, .075, 1.96], [0, 0, 0], copper);
      for (let fin = 0; fin < 19; fin++) block(layer, [.055, .13, 1.28], [-1.06 + fin * .118, .09, 0], copper, .008);
      for (const x of [-.72, .72]) block(layer, [.18, .045, 1.45], [x, -.058, 0], dark, .012);
    } else {
      block(layer, [2.76, .07, 1.96], [0, 0, 0], board);
      block(layer, [.61, .095, .61], [0, .075, 0], ceramic);
      block(layer, [.42, .017, .42], [0, .13, 0], metal, .012);
      for (const side of [-1, 1]) for (let component = 0; component < 7; component++) {
        const x = side * (.48 + component * .09);
        block(layer, [.025, .008, .89], [x, .039, 0], copper, .003);
        block(layer, [.13, .07, .23], [side * .86, .085, -.61 + component * .195], ceramic, .012);
      }
    }
    for (const x of [-1.29, 1.29]) for (const z of [-.93, .93]) {
      const screw = new Mesh(screwGeometry, metal); screw.position.set(x, role === "cover" || role === "chassis" ? .105 : .058, z); screw.castShadow = true; layer.add(screw);
      const slot = new Mesh(slotGeometry, ceramic); slot.position.y = .022; screw.add(slot);
    }
  }
  return { id: `cutaway-${spec.id}`, group, parts: resources.parts,
    bounds: { min: [-1.5, 0, -1.1], max: [1.5, count * .69 + .2, 1.1] },
    tier: "hero", metersPerUnit: .06, exposure: 1.02,
    studio: { palette: "graphite", backdrop: "#101619", environmentIntensity: .6, keyAzimuth: -48, rimColor: "#c5d7dc" },
    craft: { materials: ["anodized metal", "copper", "ceramic", "dielectric glass"],
      details: ["open machined frames", "recessed screw slots", "individual heat fins", "board traces and surface-mounted components"],
      stylization: "Illustrative precision assembly; layer roles are authored, not a scanned product cross-section." },
    pose(state) {
      const opening = cutawayOpening(state.frame, spec.durationFrames);
      layers.forEach((layer, index) => {
        // All parts stay on their physical mounting axis; no decorative rotation or drift.
        layer.position.y = Number(layer.userData.baseY) + opening * (count - index - 1) * .49;
      });
    }, dispose: () => resources.dispose() };
}

export interface LayeredCutaway3DProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: SceneTemplateSpec<"layered-cutaway">;
  frame: number;
  reducedMotion?: boolean;
}
export const LayeredCutaway3D = forwardRef<HTMLDivElement, LayeredCutaway3DProps>(function LayeredCutaway3D({ spec, frame, reducedMotion = false, className, style, ...props }, ref) {
  const createAsset = useMemo(() => () => createCutawayHero(spec), [spec]);
  const opening = reducedMotion ? 1 : cutawayOpening(frame, spec.durationFrames);
  const portrait = spec.height > spec.width;
  const active = Math.min(spec.content.layers.length - 1, Math.floor(opening * spec.content.layers.length));
  return <div {...props} ref={ref} className={className} data-km-premium-cutaway-3d="" data-km-3d-travel={opening.toFixed(3)}
    role="img" aria-label={`${spec.content.relationship}. ${spec.content.layers.map(layer => layer.label).join(", ")}. Illustrative assembly.`}
    style={{ position: "relative", width: "100%", aspectRatio: `${spec.width}/${spec.height}`, background: "#151a1e", color: "#eae8e2",
      containerType: "inline-size", display: "grid", gridTemplateColumns: portrait ? "1fr" : "minmax(0, 1fr) minmax(0, .40fr)",
      gridTemplateRows: portrait ? "64% 36%" : "1fr", overflow: "hidden", ...style }}>
    <div style={{ position: "relative", minWidth: 0, minHeight: 0 }}>
      <HeroAssetViewer data-km-frame-addressed="" createAsset={createAsset} width={portrait ? 1080 : 1372} height={portrait ? 1230 : 1080}
        action="explode" actionFrame={reducedMotion ? spec.durationFrames - 1 : frame} fps={spec.fps.num / spec.fps.den}
        azimuth={29 - opening * 5} elevation={24} zoom={(portrait ? 1.25 : 1.3) - opening * .15} target={[0, .66 + opening * .76, 0]} pixelRatio={1}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}/>
    </div>
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: portrait ? "1.8cqw" : "2.8cqw",
      padding: portrait ? "5cqw 7cqw 8cqw" : "6cqw 4cqw 6cqw 1cqw", minWidth: 0, background: "#151a1e", zIndex: 1 }}>
      <div style={{ color: "#b79973", letterSpacing: ".2em", font: `600 ${portrait ? 2.4 : .85}cqw system-ui` }}>MATERIAL / ANATOMY</div>
      <h2 style={{ font: `500 ${portrait ? 6 : 2.65}cqw/1.08 "Newsreader Variable", Georgia, serif`, margin: 0, textWrap: "balance" }}>{spec.content.relationship}</h2>
      <div style={{ display: "grid", gridTemplateColumns: portrait ? "1fr 1fr" : "1fr", gap: portrait ? "2cqw" : "1.35cqw" }}>
        {spec.content.layers.map((layer, index) => <div key={layer.id} style={{ display: "flex", gap: "1.2cqw", alignItems: "baseline",
          opacity: opening === 1 || index <= active ? 1 : .35, borderTop: "1px solid #ffffff20", paddingTop: portrait ? "1.5cqw" : ".8cqw" }}>
          <span style={{ font: `500 ${portrait ? 2.5 : .9}cqw system-ui`, color: "#b79973" }}>{String(index + 1).padStart(2, "0")}</span>
          <span style={{ font: `400 ${portrait ? 3.4 : 1.25}cqw/1.4 system-ui`, overflowWrap: "anywhere" }}>{layer.label}{layer.note && <small style={{ display: "block", color: "#a5aaaa", font: `400 ${portrait ? 2.5 : .95}cqw/1.45 system-ui`, marginTop: ".4cqw" }}>{layer.note}</small>}</span>
        </div>)}
      </div>
      <p style={{ margin: 0, color: "#989d9d", font: `400 ${portrait ? 2.4 : .88}cqw/1.5 system-ui` }}>Illustrative assembly · authored geometry</p>
    </div>
  </div>;
});
