import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import { compileFreeze, freezeAt } from "../registry/video/film-freeze";
import type { FilmFreezeSpec } from "../registry/video/film-freeze";
import { FreezeCard, freezeGrade } from "../registry/video/film-freeze-react";

const spec: FilmFreezeSpec = { at: 40, frames: 60, name: "Kevin", role: "Peacock" };

describe("freeze-frame intro", () => {
  it("holds one content frame for the freeze, then plays on later by the hold", () => {
    const { speed, output, freeze, problems } = compileFreeze(spec, 160, 30, () => undefined);
    expect(problems).toEqual([]);
    expect(speed!.map.slice(38, 43)).toEqual([38, 39, 40, 40, 40]);
    expect(speed!.map[99]).toBe(40);
    expect(speed!.map[100]).toBe(40);
    expect(speed!.map[101]).toBe(41);
    expect(output!(40)).toBe(40);
    expect(output!(70)).toBe(130);
    expect(freeze).toMatchObject({ start: 40, end: 100, name: "Kevin", side: "left", grade: "mono", flash: true });
  });

  it("snaps the grade in, slides the card in and out, and flashes once", () => {
    const { freeze } = compileFreeze(spec, 160, 30, () => undefined);
    expect(freezeAt(freeze!, 39)).toEqual({ held: false, grade: 0, enter: 0, leave: 0, flash: 0 });
    expect(freezeAt(freeze!, 40).flash).toBeGreaterThan(.5);
    expect(freezeAt(freeze!, 41).grade).toBe(1);
    expect(freezeAt(freeze!, 44).flash).toBe(0);
    expect(freezeAt(freeze!, 60).enter).toBe(1);
    expect(freezeAt(freeze!, 99).leave).toBeLessThan(.5);
    // Reduced motion keeps the grade and the card, without the flash or the slide.
    expect(freezeAt(freeze!, 40, true)).toEqual({ held: true, grade: 1, enter: 1, leave: 1, flash: 0 });
    expect(freezeGrade("mono", 1)).toContain("grayscale(1.000)");
    expect(freezeGrade("none", 1)).toBeUndefined();
  });

  it("checks the hold, the moment and the name", () => {
    const codes = (change: Partial<FilmFreezeSpec>, moment?: number) => compileFreeze({ ...spec, ...change }, 160, 30, () => moment).problems.map(item => item.code);
    expect(codes({ frames: 6 })).toContain("freeze-frames");
    expect(codes({ at: "landed" })).toContain("freeze-moment");
    expect(codes({ at: "landed" }, 30)).toEqual([]);
    expect(codes({ at: 120 })).toContain("freeze-at");
    expect(codes({ name: " " })).toContain("freeze-name");
    expect(codes({ frames: 20, role: "Peacock, regular, snack inspector, critic of crumbs" })).toContain("freeze-short");
  });

  it("draws the name, the role on its label, and the flash", () => {
    const { freeze } = compileFreeze(spec, 160, 30, () => undefined), state = freezeAt(freeze!, 41);
    const html = renderToStaticMarkup(<FreezeCard freeze={freeze!} enter={state.enter} leave={state.leave} flash={state.flash} accent="#ffcf3f" width={960} height={540} />);
    expect(html).toContain(">Kevin<");
    expect(html).toContain(">Peacock<");
    expect(html).toContain("data-km-film-freeze-flash");
    // Dark ink on the yellow label.
    expect(html).toContain("color:#14161a");
  });

  it("compiles the example: a freeze moment, one time map, and the hit as it stops", () => {
    const doc = JSON.parse(readFileSync("examples/film/freeze-intro.film.json", "utf8")) as FilmDocument;
    const kit = { sounds: { hit: { file: "hit.wav", peakSeconds: .01 } } }, result = compileFilm(doc, { accentKit: kit });
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    const scene = result.film.scenes[0];
    expect(scene.freeze).toMatchObject({ start: 42, end: 108, name: "Kevin" });
    expect(scene.cues.find(cue => cue.id === "freeze")?.frame).toBe(42);
    expect((result.film.audio!.sounds ?? []).filter(sound => sound.id.startsWith("freeze/kevin")).map(sound => sound.frame)).toEqual([42]);
    const stutter = compileFilm({ ...doc, scenes: doc.scenes.map(item => ({ ...item, stutter: { at: 10 } })) } as FilmDocument);
    expect(stutter.diagnostics.map(item => item.code)).toContain("freeze-time-map");
  });
});
