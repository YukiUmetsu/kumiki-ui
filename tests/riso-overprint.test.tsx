import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RisoOverprintTransition, evaluateRisoOverprint } from "../registry/video/riso-overprint";
import { RisoPrint } from "../registry/video/print-plates-react";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import { risoExampleArtworks, risoExampleSpec } from "../src/video/riso-print-demo";
import { risoSecondSheetArtworks, risoSecondSheetImprintArt } from "../src/video/riso-print-demo-alt";
import { RISO_OVERPRINT_FILM, RISO_OVERPRINT_MOTIF, risoOverprintOrigin } from "../src/video/riso-print-film";
import portable from "../examples/film/riso-native-overprint.film.json";

const sheets = (aspect: "landscape" | "portrait") => ({
  outgoing: { spec: risoExampleSpec(aspect), artworks: risoExampleArtworks(aspect) },
  incoming: { spec: risoExampleSpec(aspect, 37), artworks: risoSecondSheetArtworks(aspect) },
});
const frame = (at: number, aspect: "landscape" | "portrait" = "landscape") => {
  const { outgoing, incoming } = sheets(aspect);
  return renderToStaticMarkup(<RisoOverprintTransition outgoing={outgoing} incoming={incoming}
    imprintPath={RISO_OVERPRINT_MOTIF} imprintOrigin={risoOverprintOrigin(aspect)}
    imprintPlateId="red" imprintArtwork={risoSecondSheetImprintArt(aspect)} frame={at} startFrame={0} durationFrames={179} />);
};

describe("Riso native overprint scene bridge", () => {
  it("holds exact endpoints and remains deterministic under nonsequential seeking", () => {
    const { outgoing, incoming } = sheets("landscape");
    const evalAt = (at: number, reduce = false) =>
      evaluateRisoOverprint(outgoing.spec, incoming.spec, "red", at, 0, 179, reduce);
    expect(evalAt(0)).toEqual({ progress: 0, stamp: 0, paperReveal: 0, inkOpacity: 0 });
    expect(evalAt(179)).toEqual({ progress: 1, stamp: 1, paperReveal: 1, inkOpacity: 0 });
    const midway = evalAt(90);
    expect(midway.stamp).toBeGreaterThan(0);
    expect(midway.inkOpacity).toBeGreaterThan(0);
    expect(midway.paperReveal).toBe(0);
    expect(evalAt(150).paperReveal).toBeGreaterThan(0);
    expect(evalAt(150).paperReveal).toBeLessThan(1);
    evalAt(179); evalAt(10); evalAt(40);
    expect(evalAt(90)).toEqual(midway);
    expect(evalAt(0, true)).toEqual(evalAt(179));
  });

  for (const aspect of ["landscape", "portrait"] as const) {
    it("renders original outgoing and incoming ink for " + aspect + " without text lost at endpoints", () => {
      const start = frame(0, aspect), middle = frame(90, aspect), end = frame(179, aspect);
      expect(start).toContain("data-km-riso-outgoing");
      expect(start).not.toContain("data-km-riso-incoming");
      expect(start).not.toContain("data-km-riso-imprint-ink");
      expect(start).toContain("HIDDEN");
      expect(middle).toContain("data-km-riso-imprint-ink");
      expect(middle).toContain("data-km-riso-outgoing");
      expect(middle).not.toContain("PRINT / 03");
      expect(middle).toContain("mix-blend-mode:multiply");
      expect(middle).toContain("data-km-riso-plate=\"red\"");
      const knockout = frame(150, aspect);
      expect(knockout).toContain("data-km-riso-incoming");
      expect(knockout).toContain("-paper)");
      // A pixel belongs to either sheet: the incoming page is clipped, never alpha-faded.
      expect(knockout).toContain('data-km-riso-outgoing=""');
      expect(knockout).not.toContain('data-km-riso-incoming="" opacity=');
      expect(end).not.toContain("data-km-riso-outgoing");
      expect(end).not.toContain("data-km-riso-imprint-ink");
      expect(end).toContain("data-km-riso-incoming");
      expect(end).toContain("FOLLOW");
    });
    it("uses the same five-shot existing film timeline for " + aspect, () => {
      const compiled = compileFilm(RISO_OVERPRINT_FILM, { outputId: aspect });
      expect(compiled.ok).toBe(true);
      if (compiled.ok) {
        expect(compiled.film.scenes.map(scene => scene.id)).toEqual([
          "first-blue-plate", "second-red-plate", "finished-overprint",
          "ink-overprint-bridge", "new-paper-hold",
        ]);
        expect(compiled.film.durationFrames).toBe(690);
      }
    });
  }

  it("rejects mismatched sheets, unknown plate, invalid motif and invalid frame", () => {
    const { outgoing, incoming } = sheets("landscape");
    expect(() => evaluateRisoOverprint(outgoing.spec, risoExampleSpec("portrait"), "red", 10, 0, 179)).toThrow(/sizes/);
    expect(() => evaluateRisoOverprint(outgoing.spec, { ...incoming.spec, paper: "#FFFFFF" }, "red", 10, 0, 179)).toThrow(/paper stock/);
    expect(() => evaluateRisoOverprint(outgoing.spec, incoming.spec, "missing", 10, 0, 179)).toThrow(/imprintPlateId/);
    expect(() => evaluateRisoOverprint(outgoing.spec, incoming.spec, "red", -1, 0, 179)).toThrow(RangeError);
    expect(() => renderToStaticMarkup(<RisoOverprintTransition outgoing={outgoing} incoming={incoming}
      imprintPath="invalid" imprintOrigin={[690, 270]} imprintPlateId="red" imprintArtwork={risoSecondSheetImprintArt("landscape")}
      frame={20} startFrame={0} durationFrames={179} />)).toThrow(/imprintPath/);
    expect(() => renderToStaticMarkup(<RisoOverprintTransition outgoing={outgoing} incoming={incoming}
      imprintPath={RISO_OVERPRINT_MOTIF} imprintOrigin={[690, 270]} imprintPlateId="red" imprintArtwork={risoSecondSheetImprintArt("landscape")}
      frame={20} startFrame={0} durationFrames={179} misregistration={2} />)).toThrow(/misregistration/);
  });

  it("supports transparent spot ink and rejects missing plate separation IDs", () => {
    const { incoming } = sheets("landscape");
    const html = renderToStaticMarkup(<RisoPrint spec={incoming.spec} artworks={incoming.artworks}
      frame={250} transparentPaper visiblePlateIds={["red"]} />);
    expect(html).toContain("data-km-riso-plate=\"red\"");
    expect(html).not.toContain("data-km-riso-plate=\"blue\"");
    expect(html).not.toContain('fill="#F2E9D6"');
    expect(() => renderToStaticMarkup(<RisoPrint spec={incoming.spec} artworks={incoming.artworks}
      frame={250} visiblePlateIds={["unknown"]} />)).toThrow(/visiblePlateIds/);
  });

  it("matches the portable JSON film and renders the new slot using production FilmStage bindings", async () => {
    expect(portable).toEqual(RISO_OVERPRINT_FILM);
    const compiled = compileFilm(portable, { outputId: "landscape" });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const renderSlot = await loadFilmSlots(compiled.film);
    const html = renderToStaticMarkup(<>{renderSlot(
      { slot: "riso-overprint", label: "Native overprint" },
      { frame: 90, fps: { num: 30, den: 1 }, durationFrames: 180,
        width: 960, height: 540, reducedMotion: false },
    )}</>);
    expect(html).toContain("data-km-riso-overprint");
    expect(html).toContain("data-km-riso-imprint-ink");
  });
});
