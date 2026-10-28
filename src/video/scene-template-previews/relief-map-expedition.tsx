import { ReliefMapExpeditionScene } from "../../../registry/video/recipes/relief-map-expedition";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";
import terrain from "../assets/relief-rainier-route.json";

const heightmap = new URL("../assets/relief-rainier-terrarium.png", import.meta.url).href;
export const reliefSpec: SceneTemplateSpec<"relief-map-expedition"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "relief-map-expedition", id: "relief-volcano",
  fps: { num: 24, den: 1 }, durationFrames: 336, width: 960, height: 540,
  // Hold above the model, descend to the oblique view, trace the route, hold the summit.
  cueFrames: [64, 156, 260], background: "#0a0f13", accent: "#ffb547",
  content: {
    title: "Mount Rainier", eyebrow: "Cascade Range · Washington",
    terrain: { heightmap: { id: "rainier-dem", src: heightmap, alt: "Elevation model of Mount Rainier and its surroundings", licenseRef: "terrain-tiles-rainier-z12", width: 1024, height: 1024 },
      encoding: "terrarium", bounds: terrain.bounds, projection: "web-mercator", source: "USGS 3DEP and SRTM via Terrain Tiles" },
    verticalExaggeration: 1.5, exaggerationNote: "Vertical scale ×1.5",
    route: { points: terrain.route.map(([latitude, longitude]) => ({ latitude, longitude })), label: "Paradise" },
    destination: { label: "Columbia Crest", detail: "4,392 m", detailLabel: "Summit elevation", latitude: 46.8529, longitude: -121.7604 },
    routeNote: "Computed path via Camp Muir, not a guided route",
    credit: "Elevation: USGS 3DEP/SRTM via Terrain Tiles",
    light: { azimuth: 255, altitude: 22 },
    palette: [
      { elevation: 400, color: "#2d4128" }, { elevation: 1200, color: "#38502e" }, { elevation: 1650, color: "#5f6f43" },
      { elevation: 1950, color: "#776656" }, { elevation: 2250, color: "#c9ccce" }, { elevation: 2700, color: "#eef1f4" }, { elevation: 4400, color: "#ffffff" },
    ],
  },
};
export function ReliefMapExpeditionPreview() {
  return <ScenePreviewShell title="Relief-Map Expedition" subtitle="WebGL heightfield from a 1024² USGS elevation model · oblique sun with cast shadows · 14 seconds"
    fps={24} durationFrames={reliefSpec.durationFrames} reducedFrame={320}
    credits={<>Elevation: USGS 3DEP and SRTM (public domain), via <a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a> (Mapzen, AWS Open Data), zoom 12. Route computed from the terrain between Paradise, Camp Muir and Columbia Crest; not a guided route. Height exaggerated ×1.5 and declared on screen. No audio.</>}>
    {({ frame, portrait, reduced }) => <ReliefMapExpeditionScene spec={{ ...reliefSpec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f4f1ea" }}/>}
  </ScenePreviewShell>;
}
