/**
 * A PAPER1 diorama with MC1.3 physical layers: a torn cover opens on a cut-paper landscape, a banner unrolls, a door
 * swings on its paper hinge and the sun peels back. Every moving piece is a `sheet` on an ordinary paper layer.
 */
import { paperCut } from "../../registry/video/paper-director";
import type { PaperCraftSpec, PaperCutLayer } from "../../registry/video/paper-craft";
import type { PaperStockName } from "../../registry/motion/paper-sheet-stock";

const W = 1280;
const H = 720;

export function paperPhysicalSceneSpec(stock: PaperStockName = "cardstock"): PaperCraftSpec {
  const rect = (x: number, y: number, w: number, h: number) => paperCut.polygon([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  const layers: PaperCutLayer[] = [
    { id: "sky", path: rect(0, 0, W, H), color: "#cfe0dc", depth: 0, edgeIntensity: 0 },
    { id: "far-hills", path: paperCut.polygon([[0, 470], [180, 380], [360, 430], [560, 340], [760, 420], [980, 330], [1280, 410], [1280, 720], [0, 720]]), color: "#9fbfa4", depth: 3 },
    { id: "near-hills", path: paperCut.polygon([[0, 560], [240, 470], [520, 540], [800, 460], [1080, 530], [1280, 480], [1280, 720], [0, 720]]), color: "#5f8f6b", depth: 6 },
    { id: "house", path: paperCut.polygon([[760, 470], [900, 370], [1040, 470], [1040, 600], [760, 600]]), color: "#e9dcc6", depth: 8 },
    {
      id: "door", path: rect(870, 505, 60, 95), color: "#8d4b33", depth: 10,
      sheet: { stock, bends: [{ id: "hinge", kind: "fold", line: [[870, 505], [870, 600]], flap: [900, 550], angle: 0, radius: 1.5, gravity: 0, keys: [{ frame: 70, angle: 0 }, { frame: 120, angle: 115 }] }] },
    },
    {
      id: "sun", path: paperCut.ellipse(250, 180, 70, 70), color: "#f2b441", depth: 4,
      sheet: { stock, bends: [{ id: "peel", kind: "peel", line: [[320, 100], [320, 260]], flap: [360, 180], angle: 0, keys: [{ frame: 96, angle: 0, offset: 0 }, { frame: 140, angle: 110, offset: 60 }] }] },
    },
    {
      id: "banner", path: rect(420, 70, 440, 70), color: "#c2493a", depth: 12,
      sheet: { stock: "kraft", back: "#9a3a2e", bends: [{ id: "roll", kind: "roll", line: [[420, 70], [420, 140]], flap: [600, 105], angle: 1440, radius: 14, gravity: 0, keys: [{ frame: 40, offset: 0 }, { frame: 95, offset: -440, easing: "ease-out" }] }] },
    },
    {
      id: "cover", path: rect(0, 0, W, H), color: "#efe6d4", depth: 18, edgeIntensity: 0,
      sheet: {
        stock,
        tears: [{ id: "open", from: [652, -6], to: [628, 726], seed: 2, keys: [{ frame: 0, progress: 0 }, { frame: 34, progress: 1, easing: "ease-in" }] }],
        // Once torn through, each half swings open over its own outer edge like a door.
        bends: [
          { id: "right", kind: "fold", line: [[W - 1, 0], [W - 1, H]], flap: [W - 300, 360], piece: { tear: "open", at: [1000, 360] }, angle: 0, radius: 18, gravity: 0, keys: [{ frame: 30, angle: 0 }, { frame: 62, angle: 178 }] },
          { id: "left", kind: "fold", line: [[1, 0], [1, H]], flap: [300, 360], piece: { tear: "open", at: [300, 360] }, angle: 0, radius: 18, gravity: 0, keys: [{ frame: 34, angle: 0 }, { frame: 66, angle: 178 }] },
        ],
      },
    },
  ];
  return {
    version: 1, id: "physical-paper-diorama", style: "layered", width: W, height: H, fps: 30, durationFrames: 150, seed: 7,
    backing: "#d8cbb4", light: "#fff5df", startAssembled: true, layers,
  };
}
