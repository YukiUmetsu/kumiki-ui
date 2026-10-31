import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CinematicTemplate } from "../registry/video/cinematic-templates-react";
import type { CinematicTemplateAssets } from "../registry/video/cinematic-templates-react";
import {
  CINEMATIC_REEL_FRAMES, CINEMATIC_TEMPLATES, reelAt, span, templateDefinition, templateFrame,
} from "../registry/video/cinematic-templates";

const assets: CinematicTemplateAssets = {
  nature: "/nature.webp", book: "/book.webp",
  glass: "/glass.webp", earth: "/earth.webp", walk: "/walk.webp",
  history: ["/h0.webp", "/h1.webp", "/h2.webp", "/h3.webp", "/h4.webp", "/h5.webp"],
};

describe("cinematic animation templates", () => {
  it("defines six different, positive-duration scenes at a common 30 fps", () => {
    expect(CINEMATIC_TEMPLATES.map(entry => entry.id)).toEqual([
      "nature-logo", "liquid-glass", "history-timeline", "epic-book", "fly-around-earth", "walk-on-earth",
    ]);
    expect(CINEMATIC_TEMPLATES).toHaveLength(6);
    expect(new Set(CINEMATIC_TEMPLATES.map(entry => entry.id)).size).toBe(6);
    expect(CINEMATIC_TEMPLATES.every(entry => entry.durationFrames >= 240 && Number.isInteger(entry.durationFrames))).toBe(true);
  });

  it("plays the reel at real speed with no skipped scene-end frames", () => {
    let offset = 0;
    for (const [index, scene] of CINEMATIC_TEMPLATES.entries()) {
      expect(reelAt(offset)).toMatchObject({ id: scene.id, sceneIndex: index, localFrame: 0 });
      expect(reelAt(offset + scene.durationFrames - 1)).toMatchObject({ id: scene.id, sceneIndex: index, localFrame: scene.durationFrames - 1 });
      offset += scene.durationFrames;
    }
    expect(offset).toBe(CINEMATIC_REEL_FRAMES);
    expect(CINEMATIC_REEL_FRAMES).toBe(2070);
    expect(reelAt(CINEMATIC_REEL_FRAMES + 100).reelFrame).toBe(CINEMATIC_REEL_FRAMES - 1);
  });

  it("clamps invalid direct seeks and samples time without playback history", () => {
    for (const scene of CINEMATIC_TEMPLATES) {
      const sample = [0, 37, 151, scene.durationFrames - 1];
      const forward = sample.map(frame => templateFrame(scene.id, frame));
      const reverse = [...sample].reverse().map(frame => templateFrame(scene.id, frame)).reverse();
      expect(forward).toEqual(reverse);
      expect(templateFrame(scene.id, -100)).toBe(0);
      expect(templateFrame(scene.id, 999999)).toBe(scene.durationFrames - 1);
      expect(templateFrame(scene.id, NaN)).toBe(0);
      expect(templateDefinition(scene.id)).toBe(scene);
    }
    expect(span(12, 10, 20)).toBeGreaterThan(0);
    expect(span(12, 10, 20)).toBeLessThan(1);
  });

  it("renders each complete composition with editable text and correct frame metadata", () => {
    for (const scene of CINEMATIC_TEMPLATES) {
      const render = (frame: number) => renderToStaticMarkup(<CinematicTemplate
        kind={scene.id} frame={frame} assets={assets} title="CUSTOM TITLE" subtitle="CUSTOM SUBTITLE" />);
      const html = render(Math.floor(scene.durationFrames * .8));
      expect(html).toContain(`data-template="${scene.id}"`);
      expect(html).toContain('data-km-cinematic-template=""');
      expect(html).toContain("CUSTOM TITLE");
      expect(render(12)).toBe(render(12));
    }
  });

  it("provides a deterministic still for reduced-motion users", () => {
    const regular = renderToStaticMarkup(<CinematicTemplate kind="nature-logo" frame={50} assets={assets} reducedMotion />);
    const atEnd = renderToStaticMarkup(<CinematicTemplate kind="nature-logo" frame={299} assets={assets} reducedMotion />);
    expect(regular).toBe(atEnd);
  });

  it("drives the epic book with the page-turn rig and reports its state honestly", () => {
    const html = (frame: number) => renderToStaticMarkup(<CinematicTemplate kind="epic-book" frame={frame} assets={assets} />);
    const opening = html(10);
    // The establishing plate opens; without a host renderer the shared 2.5D book stands in for the WebGL folio.
    expect(opening).toContain('src="/book.webp"');
    expect(opening).toContain('data-km-book-renderer="flat"');
    expect(opening).toContain('data-km-book-state="loading"');
    expect(opening).toContain('data-km-book-textures="pending"');
    expect(opening).toContain('data-km-book-spread="0"');
    // Mid-turn the leaf is in flight over the spread being left, and the plate has handed over.
    const turning = html(240);
    expect(turning).toContain('data-km-book-turn="0"');
    expect(turning).toContain('data-km-book-spread="0"');
    expect(turning).not.toContain('src="/book.webp"');
    // The turn lands at 268; the revealed spread is then held.
    const landed = html(300);
    expect(landed).toContain('data-km-book-spread="1"');
    expect(landed).toContain('data-km-book-turn="-1"');
  });

  it("supports a realistic foreground walker as a replaceable transparent asset", () => {
    const withWalker = renderToStaticMarkup(<CinematicTemplate kind="walk-on-earth" frame={180}
      assets={{ ...assets, walker: "/explorer-cutout.webp" }} />);
    const withoutWalker = renderToStaticMarkup(<CinematicTemplate kind="walk-on-earth" frame={180} assets={assets} />);
    expect(withWalker).toContain('src="/explorer-cutout.webp"');
    expect(withoutWalker).not.toContain('src="/explorer-cutout.webp"');
    expect(withoutWalker).toContain('viewBox="0 0 64 126"');
  });
});
