/** Workers that paint the subjects of `INK_BOOK`. Pass `inkPainter` to `InkFilmStage` or `InkFilmPlayer`. */
import { createInkPainter } from "./ink-paint";
import { INK_BOOK, INK_PAGE_ONLY } from "./ink-subjects";

export const inkPainter = createInkPainter({ worker: () => new Worker(new URL("./ink-paint-worker.ts", import.meta.url), { type: "module" }), knows: name => name in INK_BOOK && !INK_PAGE_ONLY.has(name) });
