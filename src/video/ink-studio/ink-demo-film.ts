import type { InkFilm, InkFilmLayer, InkFilmText } from "../../../registry/video/ink/ink-film";
import { inkFlock, inkHeightScene, inkRiverScene } from "../../../registry/video/ink/ink-scenes";

const BRUSH = "400 {px} 'Yuji Boku'", ink = (seed: number, text: string, size: number, o: object = {}) => ({ text, size, font: BRUSH, vertical: true, seed, dry: 0.5, ...o });
/** A line in bare paper: at the top of an upright film, where no app lays its buttons. */
const words = (text: string, at: readonly [number, number], from: number, to: number, o: Partial<InkFilmText> = {}): InkFilmText => ({ text, at, size: 50, width: 640, align: "left", from, to, tall: { at: [540, 180], align: "center", width: 900, size: 58 }, ...o });
const fall = (id: string, subject: string, props: object, count: number, velocity: readonly [number, number], o: { size?: readonly [number, number]; swing?: number; spin?: number; depth?: number } = {}): InkFilmLayer => {
  const swarm = { count, seed: count, velocity, vary: 0.4, swing: o.swing ?? 46, seconds: 4.4, spin: o.spin ?? 0.1, size: o.size ?? ([0.5, 0.95] as const) };
  return { id, subject, props: { ...props }, at: [0, 0], depth: o.depth ?? 1.2, swarm: { ...swarm, area: [-60, -80, 2040, 1240] }, tall: { swarm: { ...swarm, area: [-60, -80, 1200, 2080] } } };
};

/** 水墨: six shots that use most of what the kit has. 1920 × 1080, or 1080 × 1920. */
export const INK_DEMO: InkFilm = {
  schemaVersion: 1, id: "ink-demo", title: "水墨: wind, river, plum and moon", fps: 30, paper: "#F8F1E3", size: { width: 1920, height: 1080 }, tall: { width: 1080, height: 1920 },
  shots: [
    {
      id: "title", seconds: 5.6, label: "Far ranges and a red sun come out of bare paper; the characters for water and ink are written down the page and sealed",
      camera: [{ at: 0, zoom: 1 }, { at: 5.6, zoom: 1.05, y: -10 }],
      layers: [
        { id: "sun", subject: "moon", props: { kind: "sun", radius: 112, tone: 0.9, seed: 4 }, at: [1390, 420], depth: 0.1, enter: { kind: "bloom", at: 0.1, seconds: 1.8 }, tall: { at: [770, 560] } },
        { id: "far", subject: "range", props: { seed: 12, layers: 3, tone: [0.1, 0.34], sharp: 0.6, pigment: "indigo", height: 560 }, at: [960, 770], scale: 1.24, depth: 0.3, enter: { kind: "develop", at: 0.1, seconds: 2.4 }, tall: { at: [540, 1330], scale: 1.15 } },
        { id: "cloud", subject: "mist", props: { seed: 5 }, at: [960, 980], scale: 1.25, depth: 0.7, enter: { kind: "mist", at: 0.5, seconds: 1.8 }, motion: [{ kind: "drift", by: [26, 0], back: 18 }], tall: { at: [540, 1640], scale: 1.1 } },
        { id: "name", subject: "lettering", props: ink(3, "水墨", 300), at: [560, 420], depth: 0.6, enter: { kind: "paint", at: 0.6, seconds: 2.5 }, tall: { at: [370, 640], scale: 1.05 } },
        { id: "seal", subject: "seal", props: { text: "山水", size: 104, font: BRUSH, seed: 2 }, at: [770, 640], depth: 0.6, enter: { kind: "develop", at: 3.2, seconds: 0.3 }, tall: { at: [585, 905] } },
      ],
    },
    {
      id: "height", seconds: 5, enter: { kind: "brush", seconds: 1.1 }, label: "A swordsman stands on a height before far mountains, a pine bough above, geese crossing the sky",
      camera: [{ at: 0, x: -24, zoom: 1.02 }, { at: 5, x: 26, zoom: 1.06 }],
      layers: [
        ...inkHeightScene({ seed: 5 }),
        ...inkFlock({ seed: 4, at: [1090, 430], tall: [610, 900], count: 7, scale: 0.28, gap: 78, open: 21, velocity: [-38, -6], depth: 0.3 }),
        { id: "bough", subject: "pine", props: { seed: 6, form: "branch", from: "right" }, at: [1540, 316], scale: 0.62, depth: 1.3, tall: { at: [760, 540], scale: 0.62 } },
      ],
      text: [words("The wind goes up the mountain.", [610, 190], 1.2, 4.8, { width: 460 })],
    },
    {
      id: "qingfeng", seconds: 5.6, enter: { kind: "mist", seconds: 1.1 }, label: "清風, a swordsman, paints himself stroke by stroke; the wind takes his hair and ribbons, and bamboo leaves",
      camera: [{ at: 0, zoom: 1.0 }, { at: 5.6, zoom: 1.05, x: 8 }],
      layers: [
        { id: "far", subject: "range", props: { seed: 21, layers: 2, tone: [0.08, 0.16], sharp: 0.7, pigment: "ink", edge: 0.3 }, at: [620, 560], scale: 1.0, depth: 0.2, enter: { kind: "develop", at: 0.1, seconds: 1.6 }, tall: { at: [540, 660], scale: 1 } },
        fall("leaves", "leaf", { kind: "bamboo", seed: 2 }, 16, [-210, 64], { spin: 0.16, size: [0.4, 0.8] }),
        { id: "figure", subject: "qingfeng", props: { name: false, mountain: false }, at: [1330, 800], scale: 0.94, enter: { kind: "paint", at: 0.3, seconds: 3.1 }, tall: { at: [540, 1220], scale: 1 } },
        { id: "name", subject: "lettering", props: ink(8, "清風", 130), at: [300, 330], depth: 0.6, enter: { kind: "paint", at: 1.6, seconds: 1.5 }, tall: { at: [930, 480] } },
        { id: "seal", subject: "seal", props: { text: "山", size: 60, font: BRUSH, seed: 3 }, at: [300, 520], depth: 0.6, enter: { kind: "develop", at: 3.3, seconds: 0.3 }, tall: { at: [930, 665] } },
      ],
      text: [words("He waits for it.", [240, 930], 1.4, 5.4)],
    },
    {
      id: "river", seconds: 5.4, enter: { kind: "blot", seconds: 1.2, from: [0.4, 0.75] }, label: "A moonlit river; a boat with a lantern comes down it past the reeds",
      camera: [{ at: 0, x: -20, zoom: 1.03 }, { at: 5.4, x: 30, zoom: 1.06 }],
      layers: [
        ...inkRiverScene({ seed: 2 }),
        { id: "reeds", subject: "reeds", props: { seed: 4, wind: 0.5, stems: 9 }, at: [1600, 800], scale: 0.86, depth: 1.5, tall: { at: [860, 1480], scale: 0.8 } },
      ],
      text: [words("A lamp comes down the river.", [190, 250], 1.3, 5.2)],
    },
    {
      id: "plum", seconds: 5.6, enter: { kind: "flood", seconds: 1.1 }, label: "墨梅 beside a branch of plum blossom; petals fall",
      camera: [{ at: 0, zoom: 1.0 }, { at: 5.6, zoom: 1.05, x: -10 }],
      layers: [
        { id: "branch", subject: "plum", props: { seed: 5, from: "right", habit: "across", flowers: 22 }, at: [1400, 420], scale: 0.86, depth: 0.7, enter: { kind: "paint", at: 0.5, seconds: 2.4 }, tall: { at: [690, 500], scale: 0.6 } },
        fall("petals", "petal", { kind: "plum", seed: 4 }, 26, [-58, 92], { size: [0.28, 0.62], spin: 0.08 }),
        { id: "figure", subject: "momei", props: { name: false, branch: false }, at: [520, 820], scale: 0.94, enter: { kind: "develop", at: 0.2, seconds: 1.8 }, tall: { at: [500, 1270], scale: 1 } },
      ],
      text: [words("Plum, before any leaf.", [1100, 880], 1.3, 5.4)],
    },
    {
      id: "moon", seconds: 6.4, enter: { kind: "mist", seconds: 1.2 }, label: "水月 before the full moon, looking back over her shoulder",
      camera: [{ at: 0, zoom: 1.06 }, { at: 6.4, zoom: 1.0 }],
      layers: [
        { id: "figure", subject: "shuiyue", props: { name: false }, at: [1290, 790], scale: 0.94, tall: { at: [560, 1230], scale: 1 } },
        { id: "name", subject: "lettering", props: ink(5, "水月", 190), at: [360, 400], depth: 0.6, enter: { kind: "paint", at: 1.4, seconds: 2 }, tall: { at: [170, 480], scale: 0.8 } },
        { id: "seal", subject: "seal", props: { text: "心", size: 76, font: BRUSH, seed: 6 }, at: [500, 640], depth: 0.6, enter: { kind: "develop", at: 3.5, seconds: 0.3 }, tall: { at: [170, 705] } },
      ],
      text: [words("She turns, once.", [250, 850], 2, 6.2)],
    },
  ],
};
