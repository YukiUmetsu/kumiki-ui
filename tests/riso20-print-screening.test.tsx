import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createRisoScreenGeometry, type RisoScreenOptions } from "../registry/video/riso-screening";
import { RisoPrint } from "../registry/video/print-plates-react";
import { risoExampleArtworks, risoExampleSpec } from "../src/video/riso-print-demo";

const options: RisoScreenOptions = {
  cell: 9, mode: "am", density: Math.PI * .32 * .32, dotGain: 0, seed: 23, plateIndex: 0,
};

describe("RISO20: physical plate screening", () => {
  it("preserves legacy AM dot size at default settings and nominal area scaling", () => {
    const original = createRisoScreenGeometry(options);
    expect(original.tileSize).toBe(9);
    expect(original.dots).toHaveLength(1);
    expect(original.dots[0].r).toBeCloseTo(9 * .32, 10);
    const quarter = createRisoScreenGeometry({ ...options, density: .25 });
    const half = createRisoScreenGeometry({ ...options, density: .5 });
    expect(half.dots[0].r).toBeGreaterThan(quarter.dots[0].r);
    expect(Math.PI * Math.pow(quarter.dots[0].r / 9, 2)).toBeCloseTo(.25, 10);
    expect(createRisoScreenGeometry({ ...options, density: 0 }).dots).toEqual([]);
    expect(createRisoScreenGeometry({ ...options, density: 1 }).dots[0].r).toBeLessThanOrEqual(9 * .6);
  });

  it("disperses distinct FM ink sites with stable nested tone and physical spread", () => {
    const base = { ...options, mode: "fm" as const, density: .25 };
    const lower = createRisoScreenGeometry(base);
    const higher = createRisoScreenGeometry({ ...base, density: .75 });
    const spread = createRisoScreenGeometry({ ...base, dotGain: 1 });
    expect(lower.tileSize).toBe(72);
    expect(lower.dots).toHaveLength(16);
    expect(higher.dots).toHaveLength(48);
    expect(higher.dots.slice(0, 16)).toEqual(lower.dots);
    expect(lower.dots.every(dot => dot.x >= 0 && dot.x <= 72 && dot.y >= 0 && dot.y <= 72)).toBe(true);
    expect(new Set(lower.dots.map(dot => `${dot.x.toFixed(6)},${dot.y.toFixed(6)}`)).size).toBe(16);
    expect(spread.dots.map(({ x, y }) => [x, y])).toEqual(lower.dots.map(({ x, y }) => [x, y]));
    expect(spread.dots[0].r).toBeGreaterThan(lower.dots[0].r);
    expect(createRisoScreenGeometry(base)).toEqual(lower);
    expect(createRisoScreenGeometry({ ...base, seed: base.seed + 1 })).not.toEqual(lower);
    expect(createRisoScreenGeometry({ ...base, plateIndex: 1 })).not.toEqual(lower);
  });

  it("rejects invalid print materials instead of silently substituting a style", () => {
    for (const patch of [
      { dotGain: -0.1 }, { dotGain: Number.NaN }, { density: Infinity },
      { density: -0.01 }, { density: 1.01 }, { mode: "rgb" },
      { seed: -1 }, { plateIndex: -1 }, { cell: 0 },
    ]) {
      expect(() => createRisoScreenGeometry({ ...options, ...patch } as RisoScreenOptions)).toThrow(RangeError);
    }
  });

  it.each(["landscape", "portrait"] as const)("renders independently colored and separated FM plates on %s with no material filter", aspect => {
    const spec = risoExampleSpec(aspect), artwork = risoExampleArtworks(aspect);
    const svg = renderToStaticMarkup(<RisoPrint spec={spec} frame={240} artworks={artwork}
      screenMode="fm" screenDensity={.5} dotGain={.35} paperGrain={.6} />);
    expect(svg).toContain('data-km-riso-screen-mode="fm"');
    expect(svg).toContain('data-km-riso-screen-density="0.5"');
    expect(svg).toContain('data-km-riso-dot-gain="0.35"');
    expect(svg).toContain('data-km-riso-plate="blue"');
    expect(svg).toContain('data-km-riso-plate="red"');
    expect(svg).toContain('mix-blend-mode:multiply');
    const screenTiles = svg.match(/<pattern[^>]+>.*?<\/pattern>/g) ?? [];
    expect(screenTiles).toHaveLength(2);
    expect((screenTiles[0].match(/<circle /g) ?? [])).toHaveLength(32);
    expect((screenTiles[1].match(/<circle /g) ?? [])).toHaveLength(32);
    expect(svg).toContain('maskUnits="userSpaceOnUse"');
    expect(svg).not.toContain("feGaussianBlur");
    const defaultMarkup = renderToStaticMarkup(<RisoPrint spec={spec} frame={240} artworks={artwork}/>);
    expect(defaultMarkup).toContain('data-km-riso-screen-mode="am"');
    expect((defaultMarkup.match(/<pattern/g) ?? [])).toHaveLength(2);
  });

  it("rejects invalid public screen controls on a real plate without breaking legal output", () => {
    const spec = risoExampleSpec("landscape"), artworks = risoExampleArtworks("landscape");
    for (const props of [{ screenDensity: NaN }, { dotGain: 1.01 }, { screenMode: "rgb" }]) {
      expect(() => renderToStaticMarkup(<RisoPrint spec={spec} frame={240} artworks={artworks}
        {...props as React.ComponentProps<typeof RisoPrint>} />)).toThrow(RangeError);
    }
    expect(renderToStaticMarkup(<RisoPrint spec={spec} frame={240} artworks={artworks}
      screenMode="fm" screenDensity={0} dotGain={1}/>)).toContain('data-km-riso-screen-density="0"');
  });
});
