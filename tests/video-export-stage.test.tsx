import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoExportStage } from "../registry/video/video-export-stage";

const manifest = { schemaVersion: 1 as const, id: "book-fence", durationFrames: 900,
  width: 1280, height: 720, fps: { num: 30000, den: 1001 } };

afterEach(() => vi.unstubAllGlobals());

describe("book GPU capture fence", () => {
  it.each(["missing", "stale"])("waits for a %s canvas to draw the requested local frame", async initial => {
    let paints = 0;
    const { container } = render(<VideoExportStage manifest={manifest} frame={500} onSeek={() => {}}>
      <div data-km-book-frame="80">{initial === "stale" && <canvas data-km-book-canvas="" data-km-gl-frame="4" />}</div>
    </VideoExportStage>);
    const book = container.querySelector<HTMLElement>("[data-km-book-frame]")!;
    // The renderer finishes on paint 5, later than the exporter's two settling paints.
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queueMicrotask(() => {
        paints++;
        if (paints === 5) book.innerHTML = '<canvas width="1280" height="720" data-km-book-canvas="" data-km-gl-frame="80"></canvas>';
        callback(performance.now());
      });
      return paints;
    });
    await act(async () => { await window.__kmVideoExport!.seek(500); });
    expect(paints).toBeGreaterThanOrEqual(5);
    expect(book.querySelector("canvas")?.dataset.kmGlFrame).toBe("80");
  });

  it("accepts reverse and repeated seeks using local book frames", async () => {
    const { container } = render(<VideoExportStage manifest={manifest} frame={0} onSeek={frame => {
      container.querySelector<HTMLElement>("[data-km-video-capture]")!.dataset.frame = String(frame);
      container.querySelector<HTMLElement>("[data-km-book-frame]")!.dataset.kmBookFrame = String(frame % 100);
      container.querySelector<HTMLCanvasElement>("canvas")!.dataset.kmGlFrame = String(frame % 100);
    }}><div data-km-book-frame="0"><canvas data-km-book-canvas="" data-km-gl-frame="0" /></div></VideoExportStage>);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queueMicrotask(() => callback(performance.now())); return 1;
    });
    for (const frame of [580, 504, 580, 660, 504]) {
      await act(async () => { await window.__kmVideoExport!.seek(frame); });
      expect(container.querySelector("canvas")?.dataset.kmGlFrame).toBe(String(frame % 100));
    }
  });
});
