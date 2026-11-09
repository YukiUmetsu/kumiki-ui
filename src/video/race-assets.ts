/** The race scenes' files for stories: a CC BY car (logos removed) and photographed CC0 surfaces and sky. Provenance and credit are in
 * assets/THIRD_PARTY_ASSETS.json and assets/models/vehicles/concept-car.LICENSE.md. */
import car from "../../assets/models/vehicles/concept-car.glb?url";
import asphalt from "../../assets/textures/track/asphalt_track_diff_1k.jpg?url";
import asphaltNormal from "../../assets/textures/track/asphalt_track_nor_gl_1k.jpg?url";
import asphaltRough from "../../assets/textures/track/asphalt_track_rough_1k.jpg?url";
import grass from "../../assets/textures/meadow/grass_ground_diff.jpg?url";
import grassNormal from "../../assets/textures/meadow/grass_ground_nor_gl.jpg?url";
import sky from "../../assets/textures/sky/kloofendal_48d_partly_cloudy_puresky_1k.hdr?url";

export const RACE_CAR = car;
/** Your own cars from the git-ignored local-assets/vehicles, by file name: for local renders only. Empty on other machines. */
export const LOCAL_CARS: Record<string, string> = Object.fromEntries(Object.entries(import.meta.glob("../../local-assets/vehicles/*.glb", { eager: true, query: "?url", import: "default" }))
  .map(([path, url]) => [path.split("/").pop()!.replace(/\.glb$/, ""), url as string]));
export const RACE_CARS: Record<string, string> = { "concept-car": car, ...LOCAL_CARS };
/** Your own mountain models from the git-ignored local-assets/scenery, by file name: for local renders only. Without one, the shots
 * use the generated range. */
export const LOCAL_MOUNTAINS: Record<string, string> = Object.fromEntries(Object.entries(import.meta.glob("../../local-assets/scenery/*.glb", { eager: true, query: "?url", import: "default" }))
  .map(([path, url]) => [path.split("/").pop()!.replace(/\.glb$/, ""), url as string]));
export const RACE_TRACK = { asphalt: { map: asphalt, normal: asphaltNormal, roughness: asphaltRough }, grass: { map: grass, normal: grassNormal }, sky };
