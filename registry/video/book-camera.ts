/** Camera shared by the standalone physical hero and serialized Everyday film.
 *
 * The bound volume almost doubles in width when the front board opens. A
 * fixed-distance portrait lens either clips that spread or makes the initial
 * closed cover insignificant. Match the pullback to the real hinge beat and
 * track the center of the *visible* book, not the full desk set.
 */
import { smooth } from "../craft/hero-action";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function evaluateBookCamera(frame: number, durationFrames: number, width: number, height: number) {
  if (![frame, durationFrames, width, height].every(Number.isFinite) ||
      durationFrames <= 0 || width <= 0 || height <= 0)
    throw new Error("Book camera requires finite frame, duration and positive dimensions.");

  const openFrames = Math.max(1, Math.min(55, Math.floor(durationFrames * .38)));
  const opened = smooth(clamp(frame / openFrames));
  const portrait = height > width;
  const target = [.6905 - 2.1645 * opened, .20, 3.135] as const;
  const axis = portrait ? [.15, 2, 1] : [.35, 1.3, 1];
  // The desk is context, not the hero. A closer lens makes actual leather
  // grain and engraved plate work visible at delivery resolution; retain the
  // hinge-synchronized pullback so the finished spread never clips.
  const distance = portrait ? 21.6 + 11.8 * opened : 14.8 + 4.8 * opened;
  const norm = Math.hypot(...axis);
  return {
    position: axis.map((v, i) => target[i] + v / norm * distance) as [number, number, number],
    target, fov: portrait ? 38 : 36,
  };
}
