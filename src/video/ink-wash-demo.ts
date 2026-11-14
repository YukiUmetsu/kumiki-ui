import { INK_TONES } from "../../registry/video/ink-wash";
import type { InkPoint, InkStroke, InkWashSpec } from "../../registry/video/ink-wash";

export type InkSubject = "landscape" | "bamboo";
export type InkAspect = "landscape" | "portrait";
type Point = readonly [number, number, number];
type Builder = (id: string, pts: readonly Point[], width: number, tone: number, water: number,
  start: number, duration?: number, accent?: boolean) => void;

/**
 * Original neutral illustrations: the centerlines below are semantic ink brush marks,
 * not traced photographs or borrowed reference-video artwork.
 */
function createSubject(subject: InkSubject, aspect: InkAspect): InkStroke[] {
  const portrait = aspect === "portrait";
  const w = portrait ? 540 : 960, h = portrait ? 960 : 540;
  const unit = Math.min(w, h);
  // Local art plane sits below the exhibition heading, with a full intentional paper margin.
  const region = portrait
    ? { x: 45, y: 280, width: 455, height: 560 }
    : { x: 75, y: 155, width: 805, height: 330 };
  const strokes: InkStroke[] = [];
  const add: Builder = (id, pts, width, tone, water, start, duration = 18, accent = false) => {
    strokes.push({
      id, points: pts.map(([x, y, pressure]): InkPoint => ({
        x: region.x + x * region.width, y: region.y + y * region.height, pressure,
      })),
      width: width * unit / 540, tone, water, load: .88,
      startFrame: start, drawFrames: duration, spreadFrames: 28, dryFrames: 44, accent,
    });
  };
  const arc = (cx: number, cy: number, rx: number, ry: number, from = 0, to = Math.PI * 2): Point[] =>
    Array.from({ length: 17 }, (_, i) => {
      const t = from + (to - from) * i / 16;
      return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, .45] as const;
    });

  if (subject === "landscape") {
    // Distant layered mountains (淡墨). The quiet white between them is part of the picture.
    add("far-peak-a", [[-.05,.63,.08],[.08,.48,.34],[.19,.30,.56],[.30,.45,.36],[.40,.47,.12]], 29, INK_TONES.whisper, .92, 18, 34);
    add("far-peak-b", [[.27,.56,.12],[.41,.43,.26],[.55,.27,.55],[.66,.44,.34],[.78,.53,.13]], 38, INK_TONES.pale, .96, 42, 35);
    add("far-peak-c", [[.59,.58,.14],[.74,.40,.42],[.90,.32,.60],[1.06,.51,.10]], 30, INK_TONES.whisper, 1, 62, 33);
    add("distant-ridge", [[-.03,.71,.09],[.18,.60,.36],[.39,.67,.30],[.63,.60,.34],[.84,.65,.22],[1.04,.62,.08]], 27, INK_TONES.whisper, .95, 78, 34);
    // Foreground rocky crest is stronger, with a broad side-brush and internal dry cracks.
    add("near-crest", [[-.05,.87,.11],[.09,.78,.72],[.21,.68,.98],[.29,.74,.60],[.37,.70,.32]], 47, INK_TONES.dark, .29, 99, 34);
    add("crest-shadow", [[-.07,.93,.16],[.09,.87,.51],[.18,.84,.72],[.31,.78,.28]], 31, INK_TONES.middle, .71, 114, 25);
    add("granite-grain", [[.09,.81,.24],[.15,.78,.88],[.19,.79,.09]], 7, INK_TONES.black, .15, 130, 12);
    add("granite-edge", [[.19,.71,.2],[.23,.64,.92],[.30,.67,.17]], 9, INK_TONES.black, .19, 135, 11);
    // A single pine climbs from rock, changes pressure and forks, then catches fine needles.
    add("pine-trunk", [[.20,.79,.91],[.22,.67,.80],[.235,.57,.55],[.27,.48,.78],[.265,.40,.22]], 20, INK_TONES.black, .22, 145, 36);
    add("pine-branch-right", [[.244,.57,.84],[.33,.52,.58],[.42,.49,.19]], 12, INK_TONES.dark, .27, 164, 22);
    add("pine-branch-left", [[.244,.62,.82],[.16,.55,.47],[.12,.48,.14]], 8, INK_TONES.dark, .2, 170, 19);
    add("pine-high-branch", [[.27,.47,.85],[.32,.40,.34],[.38,.38,.09]], 7, INK_TONES.black, .26, 176, 17);
    const clumps: Array<[number, number, number]> = [[.37,.48,.06],[.16,.51,.052],[.36,.39,.046],[.26,.43,.048]];
    clumps.forEach(([x,y,r], a) => {
      for (let j = 0; j < 12; j++) {
        const theta = j * 2.4 + a;
        const dx = Math.cos(theta) * r, dy = Math.sin(theta) * r * .38;
        add("pine-needle-" + a + "-" + j, [[x - dx, y - dy,.05],[x + dx*.25,y+dy*.22,.77],[x+dx,y+dy,.03]],
          3.7, j%3===0 ? INK_TONES.middle : INK_TONES.black, .16, 190 + a*7 + j%4*2, 7);
      }
    });
    // Horizontal broken strokes suggest a river without tracing every ripple.
    for (let i = 0; i < 11; i++) {
      const y = .78 + (i % 6) * .033;
      const x = .37 + (i * 13 % 23) / 100;
      add("river-" + i, [[x,y,.07],[x + .11,y-.014,.25],[x + .23,y+.005,.08]],
        2.1 + i % 3, INK_TONES.pale, .22, 205 + i * 3, 13);
    }
    add("seal-ring", arc(.81,.22,.047,portrait?.029:.07), 6, INK_TONES.dark, .25, 240, 26, true);
  } else {
    add("mist-hill-left", [[-.05,.78,.1],[.10,.64,.42],[.25,.67,.32],[.45,.62,.1]], 41, INK_TONES.whisper, .94, 18, 30);
    add("mist-hill-right", [[.49,.70,.11],[.66,.58,.27],[.86,.64,.37],[1.04,.55,.05]], 37, INK_TONES.pale, .91, 34, 29);
    const stemX = [.23,.34,.45,.56,.67];
    stemX.forEach((x, i) => {
      const lean = (i - 2) * .013;
      add("culm-" + i, [[x,.94,.57],[x+lean*.3,.74,.73],[x+lean*.7,.48,.63],[x+lean,.21,.24]],
        9 + i%2*2, INK_TONES.dark, .24, 65 + i*12, 36);
      for (let n=0;n<5;n++) {
        const y = .77 - n*.13, xp = x+lean*(.94-y)/.73;
        add("node-" + i + "-" + n, [[xp-.013,y,.5],[xp,y+.005,.94],[xp+.014,y-.005,.34]],
          3.5, INK_TONES.black, .12, 112+i*10+n*5, 8);
      }
    });
    // Each leaf is an individual tapering stroke radiating from the joint.
    for (let i = 0; i < 5; i++) for (let n = 0; n < 5; n++) for (let side of [-1,1]) {
      const x = stemX[i] + (i - 2)*.012*(.22+n*.13), y = .73 - n*.125;
      const spread = side * (.065 + (n%3)*.019);
      add("leaf-" + i + "-" + n + "-" + (side<0?"l":"r"),
        [[x,y,.12],[x+spread*.63,y-.038-n*.003,.98],[x+spread*1.15,y-.096,.02]],
        12 + n%3*2, n%2===0?INK_TONES.black:INK_TONES.dark, .19,
        126 + i*12 + n*9 + (side===1?3:0), 11);
    }
    add("bamboo-ground", [[.03,.96,.1],[.26,.95,.34],[.51,.94,.47],[.79,.96,.25],[1.02,.94,.07]],
      14, INK_TONES.pale, .80, 231, 24);
    add("seal-ring", arc(.79,.29,.054,.04), 6, INK_TONES.dark, .23, 248, 25, true);
  }
  return strokes;
}

export function inkExampleSpec(subject: InkSubject, aspect: InkAspect, seed = 47): InkWashSpec {
  return {
    version: 1, width: aspect === "portrait" ? 540 : 960, height: aspect === "portrait" ? 960 : 540,
    paper: "#F4F0E5", ink: "#222621", accent: "#AA453D", seed,
    absorption: .69, grain: .6,
    strokes: createSubject(subject, aspect),
  };
}

/** Reserved caption space. No text is painted into the actual pigment geometry. */
export const INK_READING_ZONE = {
  landscape: { x: 65, y: 30, width: 790, height: 114 },
  portrait: { x: 45, y: 58, width: 450, height: 200 },
} as const;
