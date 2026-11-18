/**
 * Demo moves for the physical paper lab (MC1.3): one postcard-sized sheet and seven moves keyed over a
 * 150-frame timeline. Kept apart from the lab so scripts and tests can evaluate them without the page.
 */
import type { PaperBend, PaperTear } from "../../registry/motion/paper-sheet";

export const FPS = 30;
export const DURATION = 150;
export const PX_PER_MM = 4;
/** A postcard: 130 × 90 mm. */
export const SHEET = { x: 380, y: 180, w: 520, h: 360 };
export const TABLE_EDGE = 820;

export type PaperMove = "fold" | "dog-ear" | "peel" | "roll" | "tear" | "drape" | "accordion";

export const MOVES: { id: PaperMove; label: string; note: string }[] = [
  { id: "fold", label: "Fold", note: "A scored crease folds the right half over. The crease radius comes from the stock." },
  { id: "dog-ear", label: "Dog-ear", note: "A corner folds across a diagonal crease. The back shows the stock's back colour." },
  { id: "peel", label: "Peel", note: "The sheet peels from its left edge. The front radius is √(D / 2Γ) for stiffness D and adhesion Γ, and the free part sags by its weight." },
  { id: "roll", label: "Roll", note: "The right edge rolls up into a spiral that tightens by one thickness each turn." },
  { id: "tear", label: "Tear", note: "A tear runs down the sheet. The right side lifts behind the tip. The left edge shows the white fibre bevel and loose fibres." },
  { id: "drape", label: "Drape", note: "The sheet slides over a table edge and hangs by its own weight. Tissue falls, card stays out." },
  { id: "accordion", label: "Accordion", note: "Four parallel creases, alternating valley and mountain, each carried on the flap before it." },
];

/** Bends and tears of one move, keyed over the lab's timeline. */
export function paperMoveSpec(move: PaperMove, radius: number): { bends: PaperBend[]; tears: PaperTear[]; support: number | null } {
  const { x, y, w, h } = SHEET;
  const r = radius > 0 ? radius : undefined;
  switch (move) {
    case "fold":
      return {
        support: 0,
        tears: [],
        bends: [{ id: "crease", kind: "fold", line: [[x + w / 2, y], [x + w / 2, y + h]], flap: [x + w, y + h / 2], angle: 0, radius: r, keys: [{ frame: 12, angle: 0 }, { frame: 104, angle: 178 }] }],
      };
    case "dog-ear":
      return {
        support: 0,
        tears: [],
        bends: [{ id: "corner", kind: "fold", line: [[x + w - 190, y], [x + w, y + 190]], flap: [x + w, y], angle: 0, radius: r, keys: [{ frame: 12, angle: 0 }, { frame: 96, angle: 168 }] }],
      };
    case "peel":
      return {
        support: 0,
        tears: [],
        bends: [{
          id: "peel", kind: "peel", line: [[x, y], [x, y + h]], flap: [x - 40, y + h / 2], angle: 0, radius: r,
          keys: [{ frame: 10, angle: 0, offset: 0 }, { frame: 30, angle: 105, offset: 60, easing: "ease-out" }, { frame: 140, angle: 135, offset: w * 0.7, easing: "ease-in-out" }],
        }],
      };
    case "roll":
      return {
        support: 0,
        tears: [],
        bends: [{
          id: "roll", kind: "roll", line: [[x + w, y], [x + w, y + h]], flap: [x + w + 40, y + h / 2], angle: 1440, radius: r ?? 24, gravity: 0,
          keys: [{ frame: 10, offset: 0 }, { frame: 136, offset: w * 0.78 }],
        }],
      };
    case "tear":
      return {
        support: 0,
        tears: [{ id: "rip", from: [x + w / 2 + 6, y - 4], to: [x + w / 2 - 18, y + h + 6], seed: 3, keys: [{ frame: 14, progress: 0 }, { frame: 118, progress: 1, easing: "ease-in" }] }],
        bends: [{ id: "lift", kind: "fold", follow: "rip", piece: { tear: "rip", at: [x + w * 0.8, y + h / 2] }, angle: 0, radius: r ?? 70, keys: [{ frame: 14, angle: 0 }, { frame: 70, angle: 22 }, { frame: 140, angle: 64 }] }],
      };
    case "drape":
      return {
        support: null,
        tears: [],
        bends: [{ id: "edge", kind: "bend", line: [[TABLE_EDGE, y], [TABLE_EDGE, y + h]], flap: [TABLE_EDGE + 40, y + h / 2], angle: 0, keys: [{ frame: 10, offset: 0 }, { frame: 140, offset: w * 0.62 }] }],
      };
    case "accordion": {
      const step = w / 5;
      const keys = (sign: number) => [{ frame: 10, angle: 0 }, { frame: 110, angle: sign * 150 }];
      return {
        support: 0,
        tears: [],
        bends: [1, 2, 3, 4].map((k) => ({
          id: "pleat" + k, kind: "fold" as const, line: [[x + step * k, y], [x + step * k, y + h]] as [[number, number], [number, number]],
          flap: [x + w + 10, y + h / 2] as [number, number], angle: 0, radius: r ?? 2.5, gravity: 0, parent: k > 1 ? "pleat" + (k - 1) : undefined,
          keys: keys(k === 1 ? 0.5 : k % 2 ? 1 : -1),
        })),
      };
    }
  }
}

/** The drape slides the sheet: the table edge stays put while the paper moves over it. */
export function slideOf(move: PaperMove, frame: number): number {
  if (move !== "drape") return 0;
  const t = Math.min(1, Math.max(0, (frame - 10) / 130));
  const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  return e * SHEET.w * 0.62;
}

