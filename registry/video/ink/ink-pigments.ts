/**
 * INK-FILM1 pigments and papers: the colours of Chinese painting as spot inks for an ink sheet, and the grounds they are painted on.
 *
 * A pigment is named by what it is, so a subject can be repainted in another one: ink, indigo 花青, azurite 石青, malachite 石绿,
 * cinnabar 朱砂, rouge 胭脂, gamboge 藤黄, ochre 赭石, skin 赭石 let down with 藤黄, tan 赭黄 (a skin over white), white 粉.
 */
import type { InkRisoPlateSpec } from "../ink-riso-press";

export const INK_PIGMENTS = {
  ink: "#18171A", indigo: "#2C4E66", teal: "#2A6072", azurite: "#1F5A94", malachite: "#3E8268", cinnabar: "#D8412A", vermilion: "#F2492A",
  rouge: "#C23A55", peach: "#E58C86", gamboge: "#DDA43A", ochre: "#9C5E3A", skin: "#B7783F", tan: "#D9A15A", umber: "#5B4636", moss: "#66713C", white: "#FFFDF8",
} as const;
export type InkPigment = keyof typeof INK_PIGMENTS;
export const INK_PAPERS = {
  /** Sized white xuan, a little warm. */
  xuan: "#F8F1E3",
  /** New paper, nearly white. */
  snow: "#F7F6F1",
  /** Old silk, gone brown. */
  silk: "#DCC7A0",
  /** Paper dyed with tea. */
  tea: "#EBDCBF",
  /** Blue-grey, for night and rain. */
  dusk: "#CBD3D3",
} as const;
export type InkPaper = keyof typeof INK_PAPERS;
/** A named paper, or its colour. */
export const inkPaperColour = (paper: InkPaper | (string & {})): string => (INK_PAPERS as Record<string, string>)[paper] ?? paper;

const plate = (id: string, ink: string): InkRisoPlateSpec => ({ id, ink, screen: "grain", cell: 0.5, angle: 45, register: [0, 0], density: 1, mottle: 0.2, pinholes: 0.2 });
/** One plate per pigment, white first and the black last. A pigment may be renamed: `{ warm: "cinnabar" }` gives a plate "warm". */
export function inkPlates(pigments: readonly InkPigment[] | Readonly<Record<string, InkPigment>>): InkRisoPlateSpec[] {
  const list: [string, InkPigment][] = Array.isArray(pigments) ? (pigments as readonly InkPigment[]).map(p => [p, p]) : Object.entries(pigments as Record<string, InkPigment>);
  return list.map(([id, p]) => ({ ...plate(id, INK_PIGMENTS[p]), ...(p === "white" ? { opaque: true } : {}) }));
}
