import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cutout, estimateForeground, inspectMatteOptions, refineMatte } from "../registry/video/subject-matte";
import type { MatteState } from "../registry/video/subject-matte";
import { inspectSubject, trailCopies } from "../registry/video/film-subject";
import type { FilmFootageSubject } from "../registry/video/film-subject";
import { FootageScene } from "../registry/video/footage-react";
import type { FilmFootageContent } from "../registry/video/film-document";

/** A frame: a red square subject on a green ground, its edge one pixel of red-green mix. */
function scene(width = 40, height = 30, left = 10) {
  const data = new Uint8ClampedArray(width * height * 4), mask = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const k = y * width + x, inside = x >= left && x < left + 12 && y >= 8 && y < 22, edge = (x === left - 1 || x === left + 12) && y >= 8 && y < 22, a = inside ? 1 : edge ? .5 : 0;
    data.set([Math.round(255 * a), Math.round(200 * (1 - a)), 0, 255], 4 * k);
    mask[k] = a;
  }
  return { frame: { width, height, data }, mask };
}

describe("subject matte", () => {
  it("cleans the levels and keeps the subject solid and the ground empty", () => {
    const { frame, mask } = scene(), noisy = mask.map(v => v === 0 ? .05 : v === 1 ? .97 : v), out = refineMatte(noisy, frame, {}, { edgeRadius: 0 });
    expect(out[15 * 40 + 15]).toBe(1);
    expect(out[2 * 40 + 2]).toBe(0);
  });

  it("steadies a still picture over time and follows a moving one without a trail", () => {
    const still = scene(), state: MatteState = {};
    refineMatte(still.mask, still.frame, state, { edgeRadius: 0, clean: 0 });
    // The same picture, its mask flickering off for a frame: the matte keeps half of the last one.
    const flicker = refineMatte(new Float32Array(still.mask.length), still.frame, state, { edgeRadius: 0, clean: 0, smoothing: .5 });
    expect(flicker[15 * 40 + 15]).toBeCloseTo(.5, 3);
    // The subject moves eight pixels: where the picture changed, the old matte is dropped.
    const moved = scene(40, 30, 18), fresh: MatteState = {};
    refineMatte(still.mask, still.frame, fresh, { edgeRadius: 0, clean: 0 });
    const out = refineMatte(moved.mask, moved.frame, fresh, { edgeRadius: 0, clean: 0, smoothing: .9 });
    expect(out[15 * 40 + 11]).toBeLessThan(.02);
    expect(out[15 * 40 + 25]).toBeGreaterThan(.98);
  });

  it("takes the ground's colour out of soft edges", () => {
    const { frame, mask } = scene(), fg = estimateForeground(frame, mask), edge = 15 * 40 + 9;
    // The edge pixel is half red, half green in the picture; its estimated foreground is the subject's red, with little green.
    expect(fg[0][edge]).toBeGreaterThan(.8);
    expect(fg[1][edge]).toBeLessThan(.2);
    const rgba = cutout(frame, mask);
    expect(rgba[4 * edge + 3]).toBe(128);
    expect(rgba[4 * (15 * 40 + 15)]).toBe(255);
    expect(inspectMatteOptions({ smoothing: 2 })).toHaveLength(1);
  });

  it("checks a subject against its footage", () => {
    const video = { width: 960, height: 540, fps: 30, frameCount: 120 }, cut = { id: "c", src: "c.webm", width: 960, height: 540, fps: 30, frameCount: 120, licenseRef: "x" };
    const codes = (subject: Partial<FilmFootageSubject>, title = true) => inspectSubject({ cutout: cut, ...subject } as FilmFootageSubject, video, title, "").map(item => item.code);
    expect(codes({})).toEqual([]);
    expect(codes({ cutout: { ...cut, width: 640, height: 640 } })).toContain("subject-shape");
    expect(codes({ cutout: { ...cut, fps: 25 } })).toContain("subject-rate");
    expect(codes({ cutout: { ...cut, src: "c.mp4" } })).toContain("subject-webm");
    expect(codes({ behind: true }, false)).toContain("subject-behind-no-title");
    expect(codes({ outline: { width: .2 } })).toContain("subject-outline");
    expect(codes({ background: { blur: 1 } })).toContain("subject-background");
    expect(codes({ clones: [{ delay: 0 }] })).toContain("subject-clones");
    expect(codes({ clones: [{ delay: 30 }], background: { color: "#000000" } })).toContain("subject-clones-background");
    expect(codes({ trail: { copies: 20 } })).toContain("subject-trail");
    expect(codes({ trail: { tint: "pink" } })).toContain("subject-trail");
  });

  it("spaces a trail's copies and fades them with age, oldest first", () => {
    expect(trailCopies({ copies: 3, spacing: 2, fade: .5 })).toEqual([{ delay: 6, opacity: .125 }, { delay: 4, opacity: .25 }, { delay: 2, opacity: .5 }]);
    expect(trailCopies({})).toHaveLength(6);
  });

  it("draws a trail under the subject, and a whole-frame echo over the footage without a cutout", () => {
    const video = { id: "v", src: "v.mp4", width: 960, height: 540, fps: 30, frameCount: 120 }, fps = { num: 30, den: 1 };
    const trail = renderToStaticMarkup(<FootageScene content={{ video, label: "A dancer", subject: { cutout: { id: "cut", src: "cut.webm", width: 960, height: 540, fps: 30, frameCount: 120 }, trail: { copies: 3, tint: "#ff3d9a" } } }}
      frame={40} fps={fps} durationFrames={120} width={960} height={540} />);
    expect(trail.indexOf('data-km-footage-layer="trail-6"')).toBeLessThan(trail.indexOf('data-km-footage-layer="trail-2"'));
    expect(trail.indexOf('data-km-footage-layer="trail-2"')).toBeLessThan(trail.indexOf('data-km-footage-layer="subject"'));
    expect(trail).toContain("feFlood");
    const echo = renderToStaticMarkup(<FootageScene content={{ video, label: "A dancer", echo: { copies: 2, spacing: 3 } }} frame={40} fps={fps} durationFrames={120} width={960} height={540} />);
    expect(echo.indexOf('data-km-footage-layer="footage"')).toBeLessThan(echo.indexOf('data-km-footage-layer="echo-6"'));
    expect(echo).toContain('data-km-footage-layer="echo-3"');
  });

  it("layers the footage, the words behind, then the subject; clones under the subject", () => {
    const content: FilmFootageContent = { video: { id: "v", src: "v.mp4", width: 960, height: 540, fps: 30, frameCount: 120 }, label: "A bird", title: { text: "STRUT", at: 0, size: "giant", place: "top" },
      subject: { cutout: { id: "cut", src: "cut.webm", width: 960, height: 540, fps: 30, frameCount: 120 }, behind: true, outline: { color: "#ffffff" }, clones: [{ delay: 30 }] } };
    const html = renderToStaticMarkup(<FootageScene content={content} frame={40} fps={{ num: 30, den: 1 }} durationFrames={120} width={960} height={540} />);
    const words = html.indexOf("STRUT"), clone = html.indexOf('data-km-footage-layer="clone-30"'), subject = html.indexOf('data-km-footage-layer="subject"'), footage = html.indexOf('data-km-footage-layer="footage"');
    expect(footage).toBeGreaterThanOrEqual(0);
    expect(footage).toBeLessThan(words);
    expect(words).toBeLessThan(clone);
    expect(clone).toBeLessThan(subject);
    expect(html).toContain("feMorphology");
  });
});
