import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAY_WORLD_IDS, inspectRayWorld, rayTrack, rayView, rayWorldTime } from "../registry/video/ray-world";
import { compileFilm } from "../registry/video/film-document";
import type { RayWorld } from "../registry/video/ray-world";
import { RayWorldStage } from "../registry/video/ray-world-react";
import { pendantModes, waterDropWorld } from "../registry/video/ray-world-water-drop";
import { terracedReliefWorld } from "../registry/video/ray-world-terraced-relief";
import { RIVER_FLIGHT_TEXTURE_FILES, riverFlightWorld } from "../registry/video/ray-world-river-flight";
import { FilmGallery } from "../registry/video/film-gallery";
import { buildCatalog, searchCatalog } from "../src/catalog/catalog-core";
import { CATALOG_FILMS } from "../src/catalog/catalog-films";

const worlds: readonly RayWorld[] = [waterDropWorld, terracedReliefWorld, riverFlightWorld], fps = { num: 30, den: 1 };
const picture = (id: string, licenseRef = "cc0") => ({ id, src: id + ".jpg", alt: id, licenseRef });

describe("ray worlds in a film file", () => {
  const measure = (_font: string, text: string) => text.length * 10;
  const film = (content: Record<string, unknown>, durationFrames = 120) => ({ schemaVersion: 1, id: "f", fps: { num: 30, den: 1 }, outputs: [{ id: "landscape", preset: "youtube" }],
    scenes: [{ id: "w", recipeId: "ray-world", durationFrames, content: { world: "terraced-relief", label: "An island", ...content } }] });
  const compiled = (content: Record<string, unknown>, durationFrames?: number) => compileFilm(film(content, durationFrames), { objectStory: { measure } });
  const codes = (content: Record<string, unknown>, durationFrames?: number) => compiled(content, durationFrames).diagnostics.filter(item => item.severity === "error").map(item => item.code);
  it("compiles a world, and names its titles and moments as cues", () => {
    const result = compiled({ titles: [{ id: "ask", text: "Why?", startFrame: 10, endFrame: 60 }], moments: [{ id: "crack", frame: 30 }] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.film.scenes[0].cues.map(cue => cue.id)).toEqual(["start", "ask", "crack"]);
  });
  it("refuses an unknown world, a missing picture, a missing label and a scene past the world's end", () => {
    expect(codes({ world: "nowhere" })).toContain("schema-value");
    expect(codes({ world: "water-drop" })).toContain("ray-world-image");
    expect(codes({ label: "" })).toContain("ray-world-label");
    expect(codes({ fromSeconds: 21 })).toContain("ray-world-length");
  });
  it("refuses a picture with no rights, and a cue outside the scene", () => {
    expect(codes({ world: "river-flight", images: [{ id: "sky", src: "a.jpg", alt: "Sky", licenseRef: "" }] })).toContain("unlicensed-asset");
    expect(codes({ moments: [{ id: "late", frame: 500 }] })).toContain("ray-world-cue");
  });
  it("carries pictures into the rights manifest", () => {
    const result = compiled({ world: "river-flight", images: [{ id: "sky", src: "a.jpg", alt: "Sky", licenseRef: "cc0" }] });
    expect(result.ok && result.film.manifest.assets?.map(asset => asset.licenseRef)).toContain("cc0");
  });
  it("keeps the table of worlds true to the worlds", () => {
    for (const world of worlds) {
      const row = RAY_WORLD_IDS[world.id as keyof typeof RAY_WORLD_IDS];
      expect(row.durationSeconds).toBe(world.durationSeconds);
      expect(row.images).toBe(world.imageSlots.length);
    }
  });
  it("widens a tall frame, and leaves 16:9 alone", () => {
    expect(rayView(1920, 1080).fit).toBe(1);
    expect(rayView(1080, 1920).fit).toBe(1.6);
    expect(waterDropWorld.state(7, rayView(1080, 1920)).uCurZ).toBeCloseTo((waterDropWorld.state(7).uCurZ as number) * 1.6, 0);
  });
});

describe("ray track", () => {
  const track = rayTrack<number>([[0, 0], [1, 10], [2, 0]]);
  it("holds its ends and passes through each key", () => {
    expect(track(-1)).toBe(0);
    expect(track(1)).toBeCloseTo(10);
    expect(track(5)).toBe(0);
  });
  it("carries vectors", () => expect(rayTrack<readonly number[]>([[0, [0, 0]], [1, [2, 4]]])(.5)).toHaveLength(2));
  it("refuses keys out of order", () => expect(() => rayTrack<number>([[1, 0], [0, 1]])).toThrow(/time order/));
});

describe("hanging drop", () => {
  it("stays near a sphere when surface tension wins, and pulls into a pear as gravity grows", () => {
    const light = pendantModes(.06), heavy = pendantModes(.3);
    expect(Math.abs(light.a2) + Math.abs(light.a3)).toBeLessThan(Math.abs(heavy.a2) + Math.abs(heavy.a3));
    expect(Math.abs(light.a2)).toBeLessThan(.1);
  });
  it("gives the same shape every time", () => expect(pendantModes(.2)).toEqual(pendantModes(.2)));
  it("lets go: the bridge to the rock is gone once the drop is free", () => {
    expect(waterDropWorld.state(2).uBridge).toBeGreaterThan(0);
    expect(waterDropWorld.state(4).uBridge).toBe(0);
  });
});

describe("ray worlds", () => {
  it("draw the same state for the same time, in any order", () => {
    for (const world of worlds) {
      const times = [0, 1.25, 7.5, 20.4, world.durationSeconds - .01];
      const forward = times.map(time => JSON.stringify(world.state(time)));
      const backward = [...times].reverse().map(time => JSON.stringify(world.state(time))).reverse();
      expect(backward).toEqual(forward);
    }
  });
  it("give finite uniforms at every frame, so no pixel turns to NaN", () => {
    for (const world of worlds) for (let frame = 0; frame < world.durationSeconds * 30; frame += 7)
      for (const value of Object.values(world.state(frame / 30)).flat()) expect(Number.isFinite(value)).toBe(true);
  });
  it("hold no clock and no random source", () => {
    for (const file of ["ray-world.ts", "ray-world-water-drop.ts", "ray-world-terraced-relief.ts", "ray-world-river-flight.ts"]) expect(readFileSync("registry/video/" + file, "utf8")).not.toMatch(/Date\.now|Math\.random|performance\.now/);
  });
  it("set a poster moment inside the film", () => {
    for (const world of worlds) expect(world.posterSeconds).toBeLessThan(world.durationSeconds);
  });
});

describe("ray world time", () => {
  it("is exact at a fractional rate, stops inside the world, and holds the poster for reduced motion", () => {
    expect(rayWorldTime(waterDropWorld, 30000, { num: 30000, den: 1001 })).toBe(26 - 1e-3);
    expect(rayWorldTime(waterDropWorld, 300, { num: 30000, den: 1001 })).toBeCloseTo(10.01);
    expect(rayWorldTime(waterDropWorld, 300, fps, true)).toBe(waterDropWorld.posterSeconds);
  });
});

describe("ray world checks", () => {
  it("asks for each picture, and refuses one with no rights", () => {
    expect(inspectRayWorld(waterDropWorld, []).map(item => item.code)).toEqual(["ray-world-image"]);
    expect(inspectRayWorld(waterDropWorld, [picture("a"), picture("b"), picture("c"), picture("d"), picture("e"), picture("f"), picture("g", "")]).map(item => item.code)).toEqual(["ray-world-rights"]);
    expect(inspectRayWorld(terracedReliefWorld, [], { samples: 500 }).map(item => item.code)).toEqual(["ray-world-range"]);
    expect(inspectRayWorld(terracedReliefWorld)).toEqual([]);
  });
  it("asks for a world's own surface maps, and every shipped map is there and recorded", () => {
    const sky = [picture("sky")];
    expect(inspectRayWorld(riverFlightWorld, sky).map(item => item.code)).toEqual(["ray-world-texture"]);
    expect(inspectRayWorld(riverFlightWorld, sky, { textures: RIVER_FLIGHT_TEXTURE_FILES })).toEqual([]);
    // Each slot the shader samples has a file, each file is in the repository, and each carries its licence in the asset manifest.
    expect(Object.keys(RIVER_FLIGHT_TEXTURE_FILES).sort()).toEqual(riverFlightWorld.textureSlots!.map(slot => slot.uniform).sort());
    const manifest = JSON.parse(readFileSync("assets/THIRD_PARTY_ASSETS.json", "utf8")) as Array<{ assetPath: string; license: string }>;
    for (const file of Object.values(RIVER_FLIGHT_TEXTURE_FILES)) {
      const path = "assets/textures/river-flight/" + file;
      expect(readFileSync(path).length).toBeGreaterThan(10_000);
      expect(manifest.find(item => item.assetPath === path)?.license).toBe("CC0-1.0");
    }
    // And the shader samples every one of them.
    for (const slot of riverFlightWorld.textureSlots!) expect(riverFlightWorld.frag).toContain(`(${slot.uniform},`);
  });
});

describe("RayWorldStage", () => {
  it("shows an alert and reports an error where WebGL2 is missing", () => {
    const view = render(<RayWorldStage world={terracedReliefWorld} frame={3} fps={fps} label="A plaster island" />);
    expect(screen.getByRole("img", { name: "A plaster island" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("could not draw");
    expect(view.container.querySelector("[data-km-ray-world]")?.getAttribute("data-km-shader-fx-status")).toBe("error");
    expect(view.container.querySelector("[data-km-shader-fx-frame]")?.getAttribute("data-km-shader-fx-frame")).toBe("3");
  });
  it("uses the fallback when one is given", () => {
    render(<RayWorldStage world={terracedReliefWorld} frame={0} fps={fps} fallback={<p>A still picture</p>} />);
    expect(screen.getByText("A still picture")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("FilmGallery", () => {
  const films = [{ id: "a", title: "The Drop", summary: "Water", src: "a.mp4", poster: "a.jpg", keywords: ["refraction"] }, { id: "b", title: "Upstream", summary: "A flight", src: "b.mp4", poster: "b.jpg" }];
  it("finds a film by a keyword, and says when nothing matches", async () => {
    render(<FilmGallery films={films} />);
    expect(screen.getByText("2 films")).toBeTruthy();
    await userEvent.type(screen.getByRole("searchbox"), "refraction");
    expect(screen.getByText("1 of 2 films")).toBeTruthy();
    await userEvent.type(screen.getByRole("searchbox"), " zzz");
    expect(screen.getByText(/No film matches/)).toBeTruthy();
  });
  it("never plays by itself and loads nothing first", () => {
    const view = render(<FilmGallery films={films} />), video = view.container.querySelector("video")!;
    expect(video.autoplay).toBe(false);
    expect(video.getAttribute("preload")).toBe("none");
  });
});

describe("film search", () => {
  const pack = (name: string) => ({ name, title: name, description: name, files: [{ path: `registry/video/${name}.ts`, target: "x" }] });
  const entries = buildCatalog({ items: [...new Set(CATALOG_FILMS.map(film => film.registryItem))].map(pack), films: CATALOG_FILMS, vocabularies: { finance: [], business: [], technology: [] }, heroes: [] } as never);
  it("makes each film an entry with a real story", () => {
    expect(entries.filter(entry => entry.type === "film").map(entry => entry.id).sort()).toEqual(CATALOG_FILMS.map(film => "film:" + film.id).sort());
    for (const film of CATALOG_FILMS) expect(entries.find(entry => entry.id === "film:" + film.id)?.storyId).toBe("showcases-films--" + film.storyExport);
  });
  it("finds films by words a person would use", () => {
    for (const query of ["water drop", "refraction", "glacier", "showcase"]) expect(searchCatalog(entries, { query, type: "film" }).length).toBeGreaterThan(0);
    expect(searchCatalog(entries, { query: "receipt", type: "film" }).map(entry => entry.name)).toEqual(["billing-gap"]);
  });
});
