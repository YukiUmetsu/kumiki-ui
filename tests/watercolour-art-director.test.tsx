import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { compileFilm } from "../registry/video/film-document";
import { inspectWetPaper } from "../registry/video/watercolour-wet-paper";
import { WatercolourIllustration, inspectWatercolourArtwork, watercolourArtPoseAt } from "../registry/video/watercolour-illustration";
import type { WatercolourArtPart } from "../registry/video/watercolour-illustration";
import { watercolorWetlandSpec, HERON_ANCHORS } from "../src/video/watercolour-art-director-demo";
import { WATERCOLOUR_ART_DIRECTOR_FILM } from "../src/video/watercolour-art-director-film";
import { loadFilmSlots } from "../src/film/film-slots";
import fixture from "../examples/film/watercolour-art-director.film.json";

describe("WC9 ArtCraft-inspired reusable watercolour illustration scene", () => {
  for (const output of ["landscape", "portrait"] as const) {
    it("provides a valid rooted watercolor figure in " + output, () => {
      const spec = watercolorWetlandSpec(output);
      expect(spec.width).toBe(output === "landscape" ? 960 : 540);
      expect(spec.height).toBe(output === "landscape" ? 540 : 960);
      expect(inspectWatercolourArtwork(spec)).toEqual([]);
      expect(spec.wetPaper && inspectWetPaper(spec.wetPaper)).toEqual([]);
      const markup = renderToStaticMarkup(<WatercolourIllustration
        spec={spec} frame={265}/>);
      for (const part of ["great-blue-heron", "neck-and-head", "head-beak", "folded-wing",
        "near-leg", "iris", "pupil", "primary-feather-0", "toe-knuckles"])
        expect(markup).toContain('data-km-watercolour-part="' + part + '"');
      expect(markup).toContain('data-km-watercolour-technique="wash"');
      expect(markup).toContain('data-km-watercolour-technique="drybrush"');
      expect(markup).toContain('data-km-watercolour-technique="line"');
      expect(markup).toContain('data-km-wet-pigment-field=""');
      expect(markup).not.toContain("NaN");
      expect(markup).not.toContain("Infinity");
      // At 960×540, physically sampled paper cells legitimately yield a ~440 KB SVG.
      // Keep a meaningful production budget without rejecting the actual bounded grid.
      expect(markup.length).toBeLessThan(650000);
      expect(HERON_ANCHORS.crown.x).toBeLessThan(HERON_ANCHORS.shoulder.x);
    });
  }

  it("animates source geometry from absolute frames, preserving grounded pivots", () => {
    const spec = watercolorWetlandSpec("landscape");
    const root = spec.parts[0];
    expect(root.kind).toBe("group");
    if (root.kind !== "group") return;
    const scene = root.children.find(x => x.id === "heron-placement");
    expect(scene?.kind).toBe("group");
    if (scene?.kind !== "group") return;
    const heron = scene.children[0];
    expect(heron.kind).toBe("group");
    if (heron.kind !== "group") return;
    const wing = heron.children.find(x => x.id === "folded-wing");
    expect(wing).toBeDefined();
    if (!wing) return;
    const first = watercolourArtPoseAt(wing, 135);
    const other = watercolourArtPoseAt(wing, 255);
    expect(first.rotation).not.toBe(other.rotation);
    expect(watercolourArtPoseAt(wing, 135)).toEqual(first);
    expect(watercolourArtPoseAt(wing, 200)).toEqual(watercolourArtPoseAt(wing, 200));
    const neutral = watercolourArtPoseAt(wing, 0, true);
    expect(neutral.rotation).toBe(-1);
    expect(wing.pivot).toEqual(HERON_ANCHORS.wing);
    expect(renderToStaticMarkup(<WatercolourIllustration spec={spec} frame={200}/>))
      .not.toEqual(renderToStaticMarkup(<WatercolourIllustration spec={spec} frame={265}/>));
  });

  it("rejects unsafe SVG, bad keyframes, duplicate IDs and invalid paper geometry", () => {
    const spec = watercolorWetlandSpec("landscape");
    const broken: WatercolourArtPart = { kind:"path", id:"duplicate",
      path: "<script>alert(1)</script>", technique:"wash",
      fill:"#002244" };
    expect(inspectWatercolourArtwork({...spec,parts:[broken]})).toContain("/parts/0/path");
    const same: WatercolourArtPart = { kind:"path", id:"duplicate",
      path:"M0 0 L10 10 Z", technique:"wash", fill:"#223344" };
    expect(inspectWatercolourArtwork({...spec,parts:[same,same]}))
      .toContain("/parts/1");
    expect(inspectWatercolourArtwork({...spec,
      wetPaper:{...spec.wetPaper!,width:540}})).toContain("/wetPaper/artboard");
    const bad: WatercolourArtPart = {kind:"group",id:"bad", children:[same],
      keys:[{frame:20,x:0,y:0,rotation:0,scale:1,opacity:1},
        {frame:10,x:0,y:0,rotation:0,scale:1,opacity:1}]};
    expect(inspectWatercolourArtwork({...spec,parts:[bad]}))
      .toContain("/parts/0/keys/1");
    expect(() => watercolourArtPoseAt(bad,-1)).toThrow(RangeError);
  });

  it("ships identical native film fixture and frame-addressable production slot", async () => {
    expect(fixture).toEqual(WATERCOLOUR_ART_DIRECTOR_FILM);
    for (const outputId of ["landscape", "portrait"] as const) {
      const compiled = compileFilm(fixture,{outputId});
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;
      expect(compiled.film.durationFrames).toBe(360);
      const render = await loadFilmSlots(compiled.film);
      const context = {frame:265, fps:{num:30,den:1},durationFrames:360,
        width:compiled.film.width,height:compiled.film.height,reducedMotion:false};
      const art = renderToStaticMarkup(<>{render({
        slot:"watercolour-illustration",label:"heron",props:{seed:83},
      },context)}</>);
      expect(art).toContain('data-km-watercolour-illustration=""');
      expect(art).toContain('data-km-watercolour-part="great-blue-heron"');
      expect(() => render({slot:"watercolour-illustration",label:"bad",props:{seed:-1}},context))
        .toThrow(RangeError);
    }
  });
});
