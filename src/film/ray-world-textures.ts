/** The ray worlds' own surface maps, served by Vite, by world and uniform name. Provenance (all CC0) is in assets/THIRD_PARTY_ASSETS.json. */
import { RIVER_FLIGHT_TEXTURE_FILES } from "../../registry/video/ray-world-river-flight";

const FILES = import.meta.glob("../../assets/textures/river-flight/*.jpg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
export const RAY_WORLD_TEXTURES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "river-flight": Object.fromEntries(Object.entries(RIVER_FLIGHT_TEXTURE_FILES).map(([uniform, file]) => [uniform, FILES[`../../assets/textures/river-flight/${file}`]])),
};
