/** INTERIOR1's render jobs (`piece`: one furniture piece on the studio cove; `room`: a painted room), run by `furn-paint-worker.ts`. */
import type { RenderOutput, RenderRunners } from "./foundation-render";
import { paintArchScene } from "./arch-paint";
import type { PaintOptions } from "./arch-paint";
import { pieceScene, roomScene } from "./furn-library";

export interface PieceJob extends PaintOptions { piece: string }
export interface RoomJob extends PaintOptions { room: string }
const out = (r: ReturnType<typeof paintArchScene>): RenderOutput => ({ width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: r.meta });

export const FURN_RUNNERS: RenderRunners = {
  piece: ((o: PieceJob): RenderOutput => out(paintArchScene(pieceScene(o.piece), o))) as never,
  room: ((o: RoomJob): RenderOutput => out(paintArchScene(roomScene(o.room), o))) as never,
};
