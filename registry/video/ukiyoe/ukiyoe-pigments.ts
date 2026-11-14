/**
 * UKIYO1 pigments: named colour roles modelled on the Edo-period printer's palette (water-borne, matte,
 * slightly translucent) and seasonal / time-of-day presets. Scenes refer to roles (`"bero"`, `"beni"`) so a
 * preset or a host theme can recolour a whole film without touching a node.
 */
import { isHex, lightness } from "./ukiyoe-core";

export type UkiyoeRole =
  | "paper" | "sumi" | "usuzumi" | "ai" | "bero" | "sora" | "asagi" | "kusa" | "matsu" | "ki" | "kincha"
  | "beni" | "shu" | "tan" | "sakura" | "murasaki" | "cha" | "kogecha" | "gofun" | "hada" | "kin" | "yoru";
export const UKIYOE_ROLES: readonly UkiyoeRole[] = [
  "paper", "sumi", "usuzumi", "ai", "bero", "sora", "asagi", "kusa", "matsu", "ki", "kincha",
  "beni", "shu", "tan", "sakura", "murasaki", "cha", "kogecha", "gofun", "hada", "kin", "yoru",
];

/** What each role is for, for UIs and docs. */
export const ROLE_NOTES: Readonly<Record<UkiyoeRole, string>> = {
  paper: "Washi ground", sumi: "Key-block black", usuzumi: "Diluted grey", ai: "Indigo", bero: "Prussian blue",
  sora: "Pale sky blue", asagi: "Blue-green", kusa: "Grass green", matsu: "Pine green", ki: "Yellow",
  kincha: "Golden brown", beni: "Safflower red", shu: "Vermilion", tan: "Red lead orange", sakura: "Blossom pink",
  murasaki: "Purple", cha: "Tea brown", kogecha: "Dark brown", gofun: "Shell white", hada: "Skin", kin: "Gold cloud",
  yoru: "Night sky",
};

export type UkiyoePalette = Readonly<Record<UkiyoeRole, string>>;

const EDO: UkiyoePalette = {
  paper: "#efe3c8", sumi: "#24211e", usuzumi: "#7d786d", ai: "#2f4f72", bero: "#1d3d6e", sora: "#9fbccb",
  asagi: "#5f9a99", kusa: "#7d9752", matsu: "#2e5b3e", ki: "#e3b84f", kincha: "#b98d45", beni: "#c64a62",
  shu: "#c9472f", tan: "#d8743f", sakura: "#efc3c0", murasaki: "#6b4c78", cha: "#80583a", kogecha: "#4a3427",
  gofun: "#f7f1e3", hada: "#f2dcc4", kin: "#d9b866", yoru: "#232a3a",
};

export type UkiyoePresetName = "edo" | "twilight" | "night" | "snow" | "spring" | "autumn" | "aizuri";
export const UKIYOE_PRESETS: readonly UkiyoePresetName[] = ["edo", "twilight", "night", "snow", "spring", "autumn", "aizuri"];

/** Preset overrides. Night lowers the paper and lifts gold; aizuri is the blue-only print style. */
const PRESETS: Readonly<Record<UkiyoePresetName, Partial<Record<UkiyoeRole, string>>>> = {
  edo: {},
  twilight: { paper: "#ecdcc0", sora: "#b6c3c9", ki: "#e7b25a", beni: "#cc5a5a", kin: "#e2b46a" },
  night: { paper: "#ddd0b4", sora: "#55708a", bero: "#1a2f55", yoru: "#1d2433", kin: "#e8c36e", hada: "#e8d2b8" },
  snow: { paper: "#f1ebdf", sora: "#b9c6cc", usuzumi: "#8a8a86", kusa: "#879a78", matsu: "#3a5b4b" },
  spring: { paper: "#f1e6cc", sakura: "#f3c1c4", kusa: "#90a85c", sora: "#a9c5d0", beni: "#cf5370" },
  autumn: { paper: "#eedfbf", kusa: "#a79a4e", matsu: "#3d553a", beni: "#b8452f", ki: "#dfa53e", tan: "#cd5e2e" },
  aizuri: {
    sora: "#a9bfd0", asagi: "#7d9fb8", kusa: "#5f7f9e", matsu: "#2d4a6c", ki: "#c9d6df", kincha: "#8ea4b8", beni: "#5574a0",
    shu: "#3e5f8f", tan: "#6e8bb0", sakura: "#cfdbe6", murasaki: "#3b4f78", cha: "#4b6280", kogecha: "#26364f", hada: "#e7ecef", kin: "#b8c8d6",
  },
};

export function palette(preset: UkiyoePresetName = "edo", roles: Readonly<Record<string, string>> = {}): Record<string, string> {
  return { ...EDO, ...PRESETS[preset], ...roles };
}

/** A role name or literal `#rrggbb`. Unknown names are a validation error, never a silent fallback. */
export type UkiyoePaint = string;
export function resolvePaint(paint: UkiyoePaint, pal: Readonly<Record<string, string>>): string {
  if (isHex(paint)) return paint;
  const v = pal[paint];
  if (!v) throw new RangeError(`UKIYO1 unknown paint "${paint}"`);
  return v;
}
export const isPaint = (paint: unknown, pal: Readonly<Record<string, string>>) =>
  typeof paint === "string" && (isHex(paint) || isHex(pal[paint]));

/** Bokashi: a graded wipe of pigment on the block. `stops` are [offset 0..1, paint, opacity?]. */
export interface UkiyoeGradient {
  type: "linear" | "radial";
  /** Linear direction in degrees (90 = top → bottom). */
  angle?: number;
  /** Radial centre in the block's bounds 0..1. */
  center?: readonly [number, number];
  radius?: number;
  stops: readonly (readonly [number, UkiyoePaint] | readonly [number, UkiyoePaint, number])[];
}
export type UkiyoeFill = UkiyoePaint | UkiyoeGradient;

/** Representative lightness of a fill, used to put impressions in printing order (light first). */
export function fillLightness(fill: UkiyoeFill, pal: Readonly<Record<string, string>>): number {
  if (typeof fill === "string") return lightness(resolvePaint(fill, pal));
  let sum = 0, w = 0;
  for (const s of fill.stops) { const o = s[2] ?? 1; sum += lightness(resolvePaint(s[1], pal)) * o; w += o; }
  return w ? sum / w : 1;
}
