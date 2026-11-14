import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePencilActorRegions, evaluatePencilPose, inspectPencilActors } from "../registry/video/colored-pencil-actor";
import { inspectPencilScene } from "../registry/video/colored-pencil-scene";
import { PencilScene } from "../registry/video/colored-pencil-scene-react";
import { pencilCharacterScene } from "../src/video/colored-pencil-character-scenes";
import { compileFilm } from "../registry/video/film-document";
import { COLOR_PENCIL_CHARACTER_FILM } from "../src/video/colored-pencil-character-film";
import portableFilm from "../examples/film/colored-pencil-character.film.json";

describe("CP3 authored coloured-pencil ensemble", () => {
  it("validates independently constructed anatomy in both outputs", () => {
    for (const aspect of ["landscape", "portrait"] as const) {
      const scene = pencilCharacterScene(aspect);
      expect(inspectPencilScene(scene)).toEqual([]);
      expect(inspectPencilActors(scene.actors ?? [])).toEqual([]);
      expect(scene.actors).toHaveLength(2);
      const all = scene.actors!.flatMap(a => a.parts.map(p => a.id + "-" + p.id));
      expect(new Set(all).size).toBe(all.length);
      expect(all).toContain("fox-head");
      expect(all).toContain("bird-front-wing");
    }
  });

  it("is reproducible under out-of-order seeking with independent wing, eye and limb poses", () => {
    const [fox, bird] = pencilCharacterScene("landscape").actors!;
    const f200 = evaluatePencilActorRegions(fox, 200);
    const b200 = evaluatePencilActorRegions(bird, 200);
    evaluatePencilActorRegions(fox, 0);
    evaluatePencilActorRegions(fox, 320);
    evaluatePencilActorRegions(bird, 320);
    expect(evaluatePencilActorRegions(fox, 200)).toEqual(f200);
    expect(evaluatePencilActorRegions(bird, 200)).toEqual(b200);
    const foxArm = fox.parts.find(part => part.id === "arm")!;
    expect(evaluatePencilPose(foxArm.keys, 235).rotation).toBeCloseTo(-58);
    const birdWing = bird.parts.find(part => part.id === "front-wing")!;
    expect(evaluatePencilPose(birdWing.keys, 167).rotation).toBeCloseTo(28);
    expect(evaluatePencilActorRegions(fox, 0).find(part => part.id === "fox-eyes")!.transform)
      .not.toEqual(evaluatePencilActorRegions(fox, 232).find(part => part.id === "fox-eyes")!.transform);
  });

  it("renders genuine moving pencil regions and a complete reduced-motion pose", () => {
    const scene = pencilCharacterScene("portrait");
    const html = (frame: number, reduce = false) =>
      renderToStaticMarkup(<PencilScene scene={scene} frame={frame} reducedMotion={reduce}/>);
    expect(html(0)).toContain('data-km-pencil-region="fox-head"');
    expect(html(0)).toContain('data-km-pencil-region="bird-front-wing"');
    expect(html(0)).not.toBe(html(240));
    expect(html(240)).toBe(html(240));
    expect(html(0, true)).toContain('data-km-pencil-region="fox-eyes"');
    expect(html(0, true)).toBe(html(320, true));
  });

  it("compiles a complete portable actor performance in both film formats", () => {
    expect(portableFilm).toEqual(COLOR_PENCIL_CHARACTER_FILM);
    for (const outputId of ["landscape", "portrait"]) {
      const compiled = compileFilm(portableFilm, { outputId });
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;
      expect(compiled.film.durationFrames).toBe(320);
      expect(compiled.film.scenes).toHaveLength(3);
    }
  });

  it("rejects invalid parent order and nonmonotonic pose frames", () => {
    const scene = pencilCharacterScene("landscape");
    const actor = scene.actors![0];
    const first = actor.parts[0];
    expect(inspectPencilActors([{ ...actor, parts: [{ ...first, parent: "future" }] }]))
      .toContainEqual(expect.stringMatching(/parent/));
    expect(inspectPencilActors([{ ...actor, parts: [{
      ...first, keys: [first.keys[0], first.keys[0]],
    }] }])).toContainEqual(expect.stringMatching(/keys/));
  });
});
