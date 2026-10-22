/** Conveyor demo scene shared by the FreezeFrameFocus story, the Phase 2 hybrid short and
 * `scripts/generate-conveyor-footage.mjs` (which encodes it to a real WebM). The drawer is a
 * self-contained factory so the generator can serialize it into a browser page.
 * Geometry is authored in 960×540 design units; annotations are exact on every frame.
 */
import type { Rect } from "../../registry/motion/types";

export const CONVEYOR_DESIGN = { width: 960, height: 540, frames: 180, speed: 4, scanX: 640 } as const;
export const CONVEYOR_PARCELS = [
  { x0: -315, label: "R2 · S9" }, { x0: -55, label: "R4 · S1" }, { x0: 205, label: "R7 · S3", target: true }, { x0: 465, label: "R1 · S6" },
] as const;
const PARCEL_Y = 270;

/** Label region of the target parcel at a source frame, in design units. */
export function conveyorLabelRect(frame: number): Rect {
  const target = CONVEYOR_PARCELS.find(p => "target" in p)!;
  return { x: target.x0 + CONVEYOR_DESIGN.speed * frame + 30, y: PARCEL_Y + 28, width: 90, height: 44 };
}
export const CONVEYOR_SCAN_RECT: Rect = { x: CONVEYOR_DESIGN.scanX - 2, y: 210, width: 4, height: 220 };

/** Returns `(ctx, width, height, frame) => void`. Everything it needs is inside the function body. */
export function createConveyorDrawer() {
  return function drawConveyor(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) {
    const W = 960, H = 540, SPEED = 4, SCAN_X = 640, PARCEL_W = 150, PARCEL_H = 100, PARCEL_Y = 270;
    const PARCELS = [{ x0: -315, label: "R2 · S9" }, { x0: -55, label: "R4 · S1" }, { x0: 205, label: "R7 · S3" }, { x0: 465, label: "R1 · S6" }];
    ctx.save();
    ctx.scale(width / W, height / H);
    ctx.fillStyle = "#1c2230"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2b3346"; ctx.fillRect(0, 370, W, 60);
    ctx.fillStyle = "#3a4560";
    for (let x = -(frame * SPEED) % 40; x < W; x += 40) ctx.fillRect(x, 372, 20, 56);
    ctx.fillStyle = "#4b5875";
    ctx.fillRect(SCAN_X - 40, 200, 12, 230); ctx.fillRect(SCAN_X + 28, 200, 12, 230); ctx.fillRect(SCAN_X - 40, 196, 80, 14);
    for (const p of PARCELS) {
      const x = p.x0 + SPEED * frame;
      ctx.fillStyle = "#b9844e"; ctx.fillRect(x, PARCEL_Y, PARCEL_W, PARCEL_H);
      ctx.fillStyle = "#a07040"; ctx.fillRect(x, PARCEL_Y + 44, PARCEL_W, 10);
      ctx.fillStyle = "#f4f1ea"; ctx.fillRect(x + 30, PARCEL_Y + 28, 90, 44);
      ctx.fillStyle = "#111"; ctx.font = "600 17px system-ui, sans-serif"; ctx.textBaseline = "middle";
      ctx.fillText(p.label, x + 38, PARCEL_Y + 50);
    }
    ctx.fillStyle = "rgba(255, 70, 70, 0.85)"; ctx.fillRect(SCAN_X - 2, 210, 4, 220);
    ctx.restore();
  };
}
