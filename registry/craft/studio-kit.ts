/** Three.js studio-lighting component for physically readable surfaces.
 * Product-scale lighting with controllable key, fill and edge separation.
 * No ambient global renderer mutations, HDR downloads or postprocessing.
 */
import {
  DirectionalLight, Group, HemisphereLight, Mesh,
  MeshStandardMaterial, PlaneGeometry, Vector3,
} from "three";
import type { ColorRepresentation } from "three";

export type CraftLightingMood = "studio" | "technical" | "cinematic";
export interface CraftStudioOptions {
  mood?: CraftLightingMood;
  /** World-space light reach and shadow coverage. Default assumes a ~3-unit product. */
  scale?: number;
  ground?: boolean;
  groundY?: number;
  background?: ColorRepresentation;
  shadowMapSize?: 512 | 1024 | 2048;
}

const lighting = {
  studio: { key: 3.1, fill: 1.3, rim: 2.2, hemisphere: 1.1, keyColor: "#fff4e7", fillColor: "#e0eeff", rimColor: "#f6fbff" },
  technical: { key: 3.5, fill: 1.7, rim: 1.5, hemisphere: 1.2, keyColor: "#f6faff", fillColor: "#cbdcec", rimColor: "#c8e5ff" },
  cinematic: { key: 3.3, fill: .65, rim: 2.6, hemisphere: .55, keyColor: "#ffe6cd", fillColor: "#c8dafa", rimColor: "#dceaff" },
} as const;

export function createCraftStudio(options: CraftStudioOptions = {}) {
  const mood = options.mood ?? "studio", config = lighting[mood];
  const scale = options.scale ?? 1, y = options.groundY ?? -.8;
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(y))
    throw new Error("Craft studio requires positive finite scale and groundY.");
  const group = new Group();
  group.name = "kumiki-studio-" + mood;
  const addLight = (name: string, color: ColorRepresentation, intensity: number,
    position: [number, number, number], shadows = false) => {
    const light = new DirectionalLight(color, intensity);
    light.name = name;
    light.position.set(position[0] * scale, position[1] * scale, position[2] * scale);
    light.target.position.set(0, .2, 0);
    light.castShadow = shadows;
    if (shadows) {
      light.shadow.mapSize.set(options.shadowMapSize ?? 2048, options.shadowMapSize ?? 2048);
      light.shadow.camera.left = -6 * scale; light.shadow.camera.right = 6 * scale;
      light.shadow.camera.top = 6 * scale; light.shadow.camera.bottom = -6 * scale;
      // Frustum is proportional to the authored world scale; fixed near
      // would clip small scenes or even exceed the far plane.
      light.shadow.camera.near = .5 * scale;
      light.shadow.camera.far = 30 * scale;
      light.shadow.camera.updateProjectionMatrix();
      light.shadow.normalBias = .015 * scale;
      light.shadow.bias = -.0001;
      light.shadow.radius = 3;
    }
    group.add(light, light.target);
    return light;
  };
  const key = addLight("key-softbox", config.keyColor, config.key, [-4, 8, 7], true);
  const fill = addLight("fill-softbox", config.fillColor, config.fill, [6, 3, 3]);
  const rim = addLight("edge-separation", config.rimColor, config.rim, [2, 5, -6]);
  const ambient = new HemisphereLight("#dce9ff", "#29323d", config.hemisphere);
  ambient.name = "environment-bounce";
  group.add(ambient);
  let ground: Mesh | undefined;
  let floorGeometry: PlaneGeometry | undefined, floorMaterial: MeshStandardMaterial | undefined;
  if (options.ground ?? true) {
    floorGeometry = new PlaneGeometry(200 * scale, 200 * scale);
    floorMaterial = new MeshStandardMaterial({ color: options.background ?? "#202830", metalness: .08, roughness: .94 });
    ground = new Mesh(floorGeometry, floorMaterial);
    ground.name = "contact-shadow-floor";
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = y;
    ground.receiveShadow = true;
    group.add(ground);
  }
  return {
    group, key, fill, rim, ambient, ground,
    setFocus(x: number, y: number, z: number) {
      if (![x, y, z].every(Number.isFinite)) throw new Error("Studio light target must be finite.");
      for (const light of [key, fill, rim]) light.target.position.copy(new Vector3(x, y, z));
      for (const light of [key, fill, rim]) light.target.updateMatrixWorld();
    },
    /** Set a new mood without disposing/rebuilding lights or geometry. */
    setMood(next: CraftLightingMood) {
      const preset = lighting[next];
      key.intensity = preset.key; key.color.set(preset.keyColor);
      fill.intensity = preset.fill; fill.color.set(preset.fillColor);
      rim.intensity = preset.rim; rim.color.set(preset.rimColor);
      ambient.intensity = preset.hemisphere;
    },
    dispose() {
      // Three's shadow map is renderer-owned GPU memory; detaching a light
      // alone does not release its shadow render targets.
      key.shadow.dispose();
      floorGeometry?.dispose(); floorMaterial?.dispose();
      group.clear();
    },
  };
}
export type CraftStudio = ReturnType<typeof createCraftStudio>;
