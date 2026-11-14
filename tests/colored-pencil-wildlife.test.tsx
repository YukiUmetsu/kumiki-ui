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
    // Covert/primary detail moves once with the main wing, not twice at its joint.
    const posed = evaluatePencilActorRegions(actor, 255);
    const main = posed.find(region => region.id === "copperbird-wing-main")!;
    const covert = posed.find(region => region.id === "copperbird-wing-coverts")!;
    const primary = posed.find(region => region.id === "copperbird-wing-primaries")!;
    expect(covert.transform).toContain(main.transform + " translate(0 0) rotate(0");
    expect(primary.transform).toContain(main.transform + " translate(0 0) rotate(0");
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
    const finished = stage(350);
    stage(120);
    expect(stage(350)).toBe(finished);
    expect(stage(350)).toContain("M106.00 181.00");
    expect(stage(120)).not.toBe(stage(350));
  });

  it("layers form-following breast, throat, mantle and cheek tracts with attached highlights", () => {
    const landscape = pencilWildlifeScene({ aspect: "landscape" });
    const portrait = pencilWildlifeScene({ aspect: "portrait" });
    const names = ["torso", "flank", "breast", "throat", "head", "cheek"];
    const palette = new Set([
      "#415F71", "#D3DBCF", "#334A64", "#A6C3C1", "#985862", "#F9D9B2",
      "#AC8680", "#FFF2CF", "#456B85", "#CEDFDC", "#A96867", "#F7D9BA",
    ]);
    let traced = 0;
    for (const name of names) {
      const current = landscape.actors![0].parts.find(p => p.id === name)!.region;
      const tall = portrait.actors![0].parts.find(p => p.id === name)!.region;
      expect(current.clipDetails).toBe(true);
      expect(current.details).toEqual(tall.details);
      const lines = current.details!.filter(d => palette.has(d.color));
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length % 2).toBe(0);
      for (let i = 0; i < lines.length; i += 2) {
        const shadow = lines[i], highlight = lines[i + 1];
        const count = (shadow.path.match(/M/g) ?? []).length;
        expect(count).toBeGreaterThanOrEqual(7);
        expect((shadow.path.match(/ Q/g) ?? []).length).toBe(count);
        expect((highlight.path.match(/M/g) ?? []).length).toBe(count);
        expect((highlight.path.match(/ Q/g) ?? []).length).toBe(count);
        expect(shadow.width).toBeGreaterThan(highlight.width);
        expect(shadow.path + highlight.path).not.toMatch(/NaN|Infinity/);
        expect(shadow.startFrame).toBeLessThan(highlight.startFrame);
        expect(highlight.startFrame + highlight.durationFrames).toBeLessThan(310);
        const segment = /^M(-?\d+\.\d+) (-?\d+\.\d+) Q(-?\d+\.\d+) (-?\d+\.\d+) (-?\d+\.\d+) (-?\d+\.\d+)/;
        const darkFirst = shadow.path.match(segment)!.slice(1).map(Number);
        const lightFirst = highlight.path.match(segment)!.slice(1).map(Number);
        const t = .43, u = 1 - t;
        const x = u*u*darkFirst[0] + 2*u*t*darkFirst[2] + t*t*darkFirst[4];
        const y = u*u*darkFirst[1] + 2*u*t*darkFirst[3] + t*t*darkFirst[5];
        // The highlight's first point must sit on the shadow shaft,
        // not merely have the same number of SVG commands.
        expect(Math.abs(x - lightFirst[0])).toBeLessThan(.02);
        expect(Math.abs(y - lightFirst[1])).toBeLessThan(.02);
      }
      traced += lines.length;
    }
    expect(traced).toBe(20);
    expect(inspectPencilScene(landscape)).toEqual([]);
    expect(inspectPencilScene(portrait)).toEqual([]);
    const final = renderToStaticMarkup(<PencilScene scene={landscape} frame={350}/>);
    expect(final).toContain("data-km-pencil-details");
    expect(final).toContain("data-km-pencil-region=\"copperbird-breast\"");
  });

  it("keeps independently drawn four-toe feet opaque, grounded and posed with the perch", () => {
    for (const aspect of ["landscape", "portrait"] as const) {
      const scene = pencilWildlifeScene({ aspect });
      const actor = scene.actors![0];
      expect(inspectPencilScene(scene)).toEqual([]);
      for (const id of ["foot-near", "foot-far"]) {
        const foot = actor.parts.find(p => p.id === id)!;
        const region = foot.region;
        expect(region.clipDetails).toBe(true);
        expect(region.opaqueSupport).toBe(true);
        expect((region.path.match(/\bM/g) ?? []).length).toBe(5);
        expect((region.path.match(/\bZ/g) ?? []).length).toBe(5);
        expect(region.transform).toMatch(/^translate\(\d+ \d+\)$/);
        expect(region.bounds[2]).toBeGreaterThan(50);
        expect(region.details).toHaveLength(4);
        expect(region.details!.some(d => d.color === "#332E38" || d.color === "#3A3540"))
          .toBe(true);
        const at = (frame: number) => evaluatePencilActorRegions(actor, frame)
          .find(r => r.id === "copperbird-" + id)!.transform;
        expect(at(180)).toEqual(at(350));
        expect(at(350)).toContain(region.transform!);
      }
    }
    const original = pencilWildlifeScene({aspect:"landscape"});
    const finished = renderToStaticMarkup(<PencilScene scene={original} frame={350}/>);
    expect(finished).toContain('data-km-pencil-support="copperbird-foot-near"');
    expect(finished).toContain('data-km-pencil-support="copperbird-foot-far"');
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
