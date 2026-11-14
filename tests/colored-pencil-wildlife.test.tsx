import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { inspectPencilScene } from "../registry/video/colored-pencil-scene";
import { inspectPencilDrawing } from "../registry/video/colored-pencil";
import { evaluatePencilActorRegions } from "../registry/video/colored-pencil-actor";
import { PencilScene } from "../registry/video/colored-pencil-scene-react";
import { compileFilm } from "../registry/video/film-document";
import { pencilWildlifeScene, COPPERBIRD_PART_ORDER } from "../src/video/colored-pencil-wildlife";
import { COLOR_PENCIL_WILDLIFE_FILM } from "../src/video/colored-pencil-wildlife-film";
import portableFilm from "../examples/film/colored-pencil-wildlife.film.json";

describe("fine-feathered paper-native wildlife craft", () => {
  for (const aspect of ["landscape", "portrait"] as const) {
    it("validates original 20-part bird and separately staged " + aspect + " composition", () => {
      const scene = pencilWildlifeScene({ aspect });
      expect(inspectPencilScene(scene)).toEqual([]);
      expect(scene.drawing.regions).toHaveLength(4);
      expect(scene.actors).toHaveLength(1);
      const parts = scene.actors![0].parts;
      expect(parts.map(part => part.id)).toEqual(COPPERBIRD_PART_ORDER);
      expect(parts).toHaveLength(20);
      expect(parts.every(part => part.region.opaqueSupport === true)).toBe(true);
      expect(parts.some(part => part.region.layers.some(layer => layer.texture === "fiber"))).toBe(true);
      expect(parts.filter(part => part.region.details?.length).length).toBeGreaterThan(13);
      expect(scene.drawing.width).toBe(aspect === "landscape" ? 960 : 540);
      expect(scene.drawing.height).toBe(aspect === "landscape" ? 540 : 960);
      const compact = pencilWildlifeScene({ aspect, detail: "study" });
      expect(inspectPencilScene(compact)).toEqual([]);
      const count = (spec: typeof scene) => spec.actors![0].parts.reduce((sum, part) =>
        sum + (part.region.details?.length ?? 0), 0);
      expect(count(compact)).toBeLessThan(count(scene));
    });
  }

  it("articulates the head, wing, tail, eyelids and beak with planted feet", () => {
    const actor = pencilWildlifeScene({ aspect: "landscape" }).actors![0];
    const at = (frame: number) => Object.fromEntries(evaluatePencilActorRegions(actor, frame)
      .map(region => [region.id, region.transform]));
    const before = at(180), tilted = at(255), blink = at(291);
    expect(before["copperbird-head"]).not.toBe(tilted["copperbird-head"]);
    expect(before["copperbird-tail-near"]).not.toBe(tilted["copperbird-tail-near"]);
    expect(blink["copperbird-eye"]).not.toBe(before["copperbird-eye"]);
    expect(before["copperbird-foot-far"]).toBe(tilted["copperbird-foot-far"]);
    expect(before["copperbird-foot-near"]).toBe(blink["copperbird-foot-near"]);
    expect(at(255)).toEqual(tilted);
  });

  it("places solid paper support behind finished pigment, not at frame zero", () => {
    const scene = pencilWildlifeScene({ aspect: "landscape" });
    const render = (frame: number, reducedMotion = false) =>
      renderToStaticMarkup(<PencilScene scene={scene} frame={frame} reducedMotion={reducedMotion}/>);
    const initial = render(0), finished = render(350);
    expect(initial).not.toContain('data-km-pencil-support="copperbird-torso"');
    expect(finished).toContain('data-km-pencil-support="copperbird-torso"');
    expect(finished).toContain('data-km-pencil-support="copperbird-head"');
    expect(finished).toContain('data-km-pencil-region="copperbird-wing-coverts"');
    expect(finished).toContain('data-km-pencil-region="copperbird-catchlight"');
    expect(finished).toContain('data-km-pencil-region="perch-bark"');
    expect(render(0, true)).toContain('data-km-pencil-support="copperbird-torso"');
  });

  it("rejects invalid support, paper and detail options", () => {
    const scene = pencilWildlifeScene({ aspect: "portrait" });
    const invalid = { ...scene.drawing, regions: [{
      ...scene.drawing.regions[0], opaqueSupport: "yes" as unknown as boolean,
    }] };
    expect(inspectPencilDrawing(invalid)).not.toEqual([]);
    expect(() => pencilWildlifeScene({ aspect: "portrait", paperTooth: 1.2 })).toThrow(RangeError);
    expect(() => pencilWildlifeScene({
      aspect: "portrait", detail: "unknown" as "full",
    })).toThrow(RangeError);
  });

  it("keeps ArtCraft feather shafts and opposing barbs attached to articulated wing regions", () => {
    const scene = pencilWildlifeScene({ aspect: "landscape", detail: "full" });
    const parts = scene.actors![0].parts;
    const wingParts = ["wing-main", "wing-primaries", "wing-coverts"];
    const vanes = parts.filter(part => wingParts.includes(part.id))
      .flatMap(part => part.region.details ?? [])
      .filter(trace => (trace.path.match(/M/g) ?? []).length === 11);
    // One hand-authored curved rachis plus ten barbs per vane; no random disconnected dots.
    expect(vanes).toHaveLength(12);
    expect(new Set(vanes.map(trace => trace.path)).size).toBe(12);
    for (const vane of vanes) {
      expect((vane.path.match(/ Q/g) ?? []).length).toBe(11);
      expect(vane.width).toBeLessThan(1);
      expect(vane.startFrame).toBeGreaterThanOrEqual(190);
      expect(vane.startFrame + vane.durationFrames).toBeLessThanOrEqual(270);
    }
    const wingRegion = parts.find(part => part.id === "wing-main")!.region;
    const light = wingRegion.details!.filter(trace => trace.color === "#C4DADB");
    expect(light).toHaveLength(5);
    expect(wingRegion.details!.length).toBeLessThanOrEqual(80);

    const portrait = pencilWildlifeScene({ aspect: "portrait", detail: "full" });
    expect(portrait.actors![0].parts.find(part => part.id === "wing-main")!.region.details)
      .toEqual(wingRegion.details);
    const stage = (frame: number) => renderToStaticMarkup(<PencilScene scene={scene} frame={frame}/>);
    expect(stage(350)).toEqual(stage(350));
    expect(stage(350)).toContain("M106.00 181.00");
    expect(stage(120)).not.toBe(stage(350));
  });

  it("provides a portable 420-frame three-shot video for both formats", () => {
    expect(portableFilm).toEqual(COLOR_PENCIL_WILDLIFE_FILM);
    for (const outputId of ["landscape", "portrait"]) {
      const result = compileFilm(COLOR_PENCIL_WILDLIFE_FILM, { outputId });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.film.durationFrames).toBe(420);
        expect(result.film.scenes.every(scene => scene.kind === "slot")).toBe(true);
      }
    }
  });
});
