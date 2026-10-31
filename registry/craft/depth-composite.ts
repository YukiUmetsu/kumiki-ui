/** Depth-aware 2.5D assembly for externally authored, aligned color/depth/mask
 * packs. The actual image assets, depth estimation and clean-plate inpainting
 * are produced outside Kumiki; this adapter never manufactures missing pixels.
 *
 * Layer separation uses the real depth buffer. Optional matte-projected contact
 * shadows follow the receiving relief's displaced surface, rather than floating
 * on an unrelated flat plane. All geometry, animation and rendering remain in
 * the existing Three.js scene and absolute-frame camera system.
 */
import {
  Color, DoubleSide, Group, Mesh, ShaderMaterial, Vector2,
} from "three";
import type { Texture } from "three";
import {
  createImageRelief, validateImageRelief,
} from "./image-relief";
import type { ImageReliefSpec, ReliefDepthPixels } from "./image-relief";

export interface DepthCompositeLayer {
  id: string;
  /** Aligned image frame in world units. World +Z faces the camera. */
  width: number;
  height: number;
  /** Layer center in composite-local XYZ coordinates. */
  at: readonly [number, number, number];
  /** Displacement around the layer center; set 0 for a flat clean plate. */
  depthScale: number;
  segmentsX?: number;
  segmentsY?: number;
  nearIsWhite?: boolean;
  depthChannel?: ImageReliefSpec["depthChannel"];
  smoothRadius?: number;
  edgeFeather?: number;
  /** Only relight art supplied as clean albedo, not an already-lit photo. */
  lighting?: "baked" | "relight";
  /** An optional cutout can cast a projected shadow onto an earlier layer. */
  shadow?: {
    receiverId: string;
    /** Shadow offset in local world XY, relative to the caster. */
    offset?: readonly [number, number];
    opacity?: number;
    /** Penumbra size in normalized caster-UV units, 0–0.04. */
    softness?: number;
    /** Distance above the receiver's relief, in world +Z. */
    surfaceBias?: number;
    color?: string;
  };
}

export interface DepthCompositeSpec {
  schemaVersion: 1;
  id: string;
  /** Back-to-front order: real geometry depth intervals must not intersect. */
  layers: readonly DepthCompositeLayer[];
}

/** Assets keyed by semantic layer ID. All textures remain caller-owned. */
export type DepthCompositeAssets = Record<string, {
  color: Texture;
  depth: ReliefDepthPixels;
  alpha?: Texture;
}>;

const safeId = (id: unknown): id is string => typeof id === "string" && !!id.trim() && id.length <= 128;
const finite = (value: number) => Number.isFinite(value);

function reliefSpec(layer: DepthCompositeLayer): ImageReliefSpec {
  return {
    schemaVersion: 1, id: layer.id, width: layer.width, height: layer.height,
    depthScale: layer.depthScale, segmentsX: layer.segmentsX, segmentsY: layer.segmentsY,
    nearIsWhite: layer.nearIsWhite, depthChannel: layer.depthChannel,
    smoothRadius: layer.smoothRadius, edgeFeather: layer.edgeFeather,
  };
}

/** Strict preflight; no allocations occur until every input has been checked. */
export function validateDepthComposite(spec: DepthCompositeSpec, assets: DepthCompositeAssets): void {
  if (spec?.schemaVersion !== 1 || !safeId(spec.id) || !Array.isArray(spec.layers) ||
    spec.layers.length < 1 || spec.layers.length > 12)
    throw new Error("Depth composite requires schemaVersion 1, a safe ID and 1–12 layers.");
  if (!assets || typeof assets !== "object") throw new Error("Depth composite assets must be provided by layer ID.");
  const ids = new Set<string>();
  let previousMaxZ = -Infinity;
  for (const [index, layer] of spec.layers.entries()) {
    if (!safeId(layer?.id) || ids.has(layer.id))
      throw new Error("Depth composite layer IDs must be nonempty and unique.");
    ids.add(layer.id);
    if (!Array.isArray(layer.at) || layer.at.length !== 3 || !layer.at.every(finite))
      throw new Error(`Depth composite ${layer.id}: at must be a finite XYZ position.`);
    if (layer.lighting && !["baked", "relight"].includes(layer.lighting))
      throw new Error(`Depth composite ${layer.id}: unsupported lighting mode.`);
    const asset = assets[layer.id];
    if (!asset?.color || !asset.depth)
      throw new Error(`Depth composite ${layer.id}: provide an approved color texture and decoded depth pixels.`);
    validateImageRelief(reliefSpec(layer), asset.depth);
    const minZ = layer.at[2] - layer.depthScale / 2;
    const maxZ = layer.at[2] + layer.depthScale / 2;
    if (index > 0 && minZ <= previousMaxZ + 1e-4)
      throw new Error(`Depth composite ${layer.id}: layer depth intervals overlap or are out of back-to-front order.`);
    previousMaxZ = maxZ;
    if (layer.shadow) {
      const shadow = layer.shadow;
      if (!safeId(shadow.receiverId) || !ids.has(shadow.receiverId) || shadow.receiverId === layer.id)
        throw new Error(`Depth composite ${layer.id}: shadow receiver must be an earlier layer ID.`);
      if (!asset.alpha)
        throw new Error(`Depth composite ${layer.id}: shadow caster needs a cutout alpha mask.`);
      if (shadow.offset && (!Array.isArray(shadow.offset) || shadow.offset.length !== 2 || !shadow.offset.every(finite)))
        throw new Error(`Depth composite ${layer.id}: invalid shadow XY offset.`);
      if (![shadow.opacity ?? .32, shadow.softness ?? .012, shadow.surfaceBias ?? .002].every(finite) ||
        (shadow.opacity ?? .32) < 0 || (shadow.opacity ?? .32) > .8 ||
        (shadow.softness ?? .012) < 0 || (shadow.softness ?? .012) > .04 ||
        (shadow.surfaceBias ?? .002) < 0.0001 || (shadow.surfaceBias ?? .002) > .02)
        throw new Error(`Depth composite ${layer.id}: invalid shadow opacity, softness or surface bias.`);
      if (shadow.color && !/^#[0-9a-fA-F]{6}$/.test(shadow.color))
        throw new Error(`Depth composite ${layer.id}: shadow color must be a six-digit hex value.`);
    }
  }
}

/** A bounded nine-tap projection: shadow alpha follows receiver geometry,
 * while foreground and background retain their native depth-test occlusion.
 * Source alpha textures use Three.js alphaMap's green channel convention.
 */
function makeShadowMaterial(
  caster: DepthCompositeLayer,
  receiver: DepthCompositeLayer,
  casterAlpha: Texture,
  receiverAlpha: Texture | undefined,
): ShaderMaterial {
  const shadow = caster.shadow!;
  return new ShaderMaterial({
    name: `km-depth-shadow:${caster.id}->${receiver.id}`,
    uniforms: {
      casterAlpha: { value: casterAlpha },
      receiverAlpha: { value: receiverAlpha ?? casterAlpha },
      useReceiverAlpha: { value: Boolean(receiverAlpha) },
      casterCenter: { value: new Vector2(caster.at[0], caster.at[1]) },
      receiverCenter: { value: new Vector2(receiver.at[0], receiver.at[1]) },
      casterSize: { value: new Vector2(caster.width, caster.height) },
      shadowOffset: { value: new Vector2(...(shadow.offset ?? [0, 0])) },
      shadowSoftness: { value: shadow.softness ?? .012 },
      shadowOpacity: { value: shadow.opacity ?? .32 },
      shadowColor: { value: new Color(shadow.color ?? "#111923") },
    },
    vertexShader: `
      varying vec2 vSurfaceXY;
      varying vec2 vReceiverUV;
      uniform vec2 receiverCenter;
      void main() {
        vSurfaceXY = position.xy + receiverCenter;
        vReceiverUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D casterAlpha;
      uniform sampler2D receiverAlpha;
      uniform bool useReceiverAlpha;
      uniform vec2 casterCenter;
      uniform vec2 casterSize;
      uniform vec2 shadowOffset;
      uniform float shadowSoftness;
      uniform float shadowOpacity;
      uniform vec3 shadowColor;
      varying vec2 vSurfaceXY;
      varying vec2 vReceiverUV;
      float maskAt(vec2 uv) {
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
        return texture2D(casterAlpha, uv).g;
      }
      void main() {
        vec2 uv = (vSurfaceXY - casterCenter - shadowOffset) / casterSize + 0.5;
        vec2 r = vec2(shadowSoftness);
        float coverage = 4.0 * maskAt(uv)
          + 2.0 * (maskAt(uv + vec2(r.x, 0.0)) + maskAt(uv - vec2(r.x, 0.0))
          + maskAt(uv + vec2(0.0, r.y)) + maskAt(uv - vec2(0.0, r.y)))
          + maskAt(uv + r) + maskAt(uv - r)
          + maskAt(uv + vec2(r.x, -r.y)) + maskAt(uv + vec2(-r.x, r.y));
        float receiverCoverage = useReceiverAlpha ? texture2D(receiverAlpha, vReceiverUV).g : 1.0;
        float alpha = coverage / 16.0 * receiverCoverage * shadowOpacity;
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(shadowColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
}

/** Assemble approved photo/depth/mask layers into a single poseable Group.
 * The compositor owns only its meshes, geometry and materials, not any texture.
 */
export function createDepthComposite(spec: DepthCompositeSpec, assets: DepthCompositeAssets) {
  validateDepthComposite(spec, assets);
  const group = new Group();
  group.name = spec.id;
  group.userData.partRole = "depth-composite";
  const layers = new Map<string, ReturnType<typeof createImageRelief>>();
  const shadows = new Map<string, Mesh>();
  const materials: ShaderMaterial[] = [];
  try {
    for (const layer of spec.layers) {
      const asset = assets[layer.id];
      const relief = createImageRelief(reliefSpec(layer), asset.depth, {
        color: asset.color, alpha: asset.alpha, lighting: layer.lighting ?? "baked",
      });
      relief.mesh.position.set(...layer.at);
      relief.mesh.userData.compositeLayerId = layer.id;
      group.add(relief.mesh);
      layers.set(layer.id, relief);
      if (layer.shadow) {
        const receiver = spec.layers.find(candidate => candidate.id === layer.shadow!.receiverId)!;
        const receiverRelief = layers.get(receiver.id)!;
        const material = makeShadowMaterial(layer, receiver, asset.alpha!, assets[receiver.id].alpha);
        materials.push(material);
        const shadowMesh = new Mesh(receiverRelief.geometry, material);
        shadowMesh.name = `${layer.id}-contact-shadow-on-${receiver.id}`;
        shadowMesh.position.set(receiver.at[0], receiver.at[1], receiver.at[2] + (layer.shadow.surfaceBias ?? .002));
        shadowMesh.userData.partRole = "projected-matte-shadow";
        group.add(shadowMesh);
        shadows.set(layer.id, shadowMesh);
      }
    }
  } catch (error) {
    for (const relief of layers.values()) relief.dispose();
    for (const material of materials) material.dispose();
    group.clear();
    throw error;
  }
  let disposed = false;
  return {
    group, layers, shadows,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const relief of layers.values()) relief.dispose();
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
