/** Shape wipes: the next scene opens through a growing shape (an iris circle, a diamond, a star, or the brand's own mark), from a point
 * that matters in the outgoing scene: a face, a button, a logo.
 *
 * Practice (doc 34, T3): editing tools offer a shape wipe with a chosen shape, position and edge; brand idents grow the next shot out of
 * the logo. Kumiki's straight-edge `wipe` could not do either.
 *
 * The shape grows on a curve that starts slow and ends fast, and its last frame covers the frame's far corner from the origin, so no
 * sliver of the outgoing scene is left behind. A mark is a picture, so the stage cannot know when its outline covers the frame; over the
 * last third the rest of the incoming scene fades in around it.
 */

export type ShapeWipeShape = "circle" | "diamond" | "star" | "square" | "mark";
export interface FilmShapeWipeSpec {
  /** @default "circle" */
  shape?: ShapeWipeShape;
  /** A subject of the outgoing scene the shape grows from. @default the frame's centre */
  subject?: string;
  /** A thin line drawn on the shape's edge, in this colour, so it reads as designed rather than as a mask. */
  color?: string;
}
/** A shape wipe as the stage draws it, by incoming scene ID. `origin` is in pixels. */
export interface FilmShapeWipe { shape: ShapeWipeShape; origin: { x: number; y: number }; edge?: string; mark?: string }
export interface ShapeWipeProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

export const SHAPE_WIPE_FRAMES = 16;
const SHAPES: readonly ShapeWipeShape[] = ["circle", "diamond", "star", "square", "mark"];
const COLOR = /^#[0-9a-f]{6}$/i;
/** A five-pointed star's inner radius as a share of its outer radius. */
const STAR_INNER = .5;

/** Points of a shape of size 1 around the origin: radius 1 for the circle and star, half-diagonal 1 for the diamond, half-side 1 for the square. */
function outline(shape: Exclude<ShapeWipeShape, "circle" | "mark">): Array<[number, number]> {
  if (shape === "diamond") return [[0, -1], [1, 0], [0, 1], [-1, 0]];
  if (shape === "square") return [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  return Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? STAR_INNER : 1; return [r * Math.cos(a), r * Math.sin(a)] as [number, number]; });
}
/** The size at which the shape, grown from `origin`, covers the whole frame. */
export function coverSize(shape: ShapeWipeShape, origin: { x: number; y: number }, width: number, height: number): number {
  const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => [x - origin.x, y - origin.y]);
  if (shape === "diamond") return Math.max(...corners.map(([x, y]) => Math.abs(x) + Math.abs(y)));
  if (shape === "square") return Math.max(...corners.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
  const far = Math.max(...corners.map(([x, y]) => Math.hypot(x, y)));
  // A star covers a point only inside its inner circle, past the dents between its arms.
  return shape === "star" ? far / (STAR_INNER * Math.cos(Math.PI / 5)) : far;
}
/** Slow out of the origin, fast into the corners. */
const grow = (t: number) => { const v = Math.min(1, Math.max(0, t)); return v ** 1.7; };

/** The shape at `progress` (0 to 1): a CSS clip path for the incoming scene, an SVG path for its edge line, and, for a mark, the mask size
 * and how far the outgoing scene has faded. */
export function shapeWipeFrame(wipe: Pick<FilmShapeWipe, "shape" | "origin">, progress: number, width: number, height: number) {
  const size = coverSize(wipe.shape, wipe.origin, width, height) * grow(progress), { x, y } = wipe.origin;
  if (wipe.shape === "circle") return { clipPath: `circle(${size}px at ${x}px ${y}px)`, edge: `M ${x - size} ${y} a ${size} ${size} 0 1 0 ${2 * size} 0 a ${size} ${size} 0 1 0 ${-2 * size} 0`, outgoing: 1 };
  if (wipe.shape === "mark") {
    // The mark's picture is laid out as a square `side` pixels wide, centred on the origin.
    const side = Math.max(1, size * 2.2);
    const around = Math.min(1, Math.max(0, (progress - .66) / .34));
    return { maskSize: side, maskPosition: `${x - side / 2}px ${y - side / 2}px`, around: around * around * (3 - 2 * around), outgoing: 1 };
  }
  const points = outline(wipe.shape).map(([px, py]) => [x + px * size, y + py * size]);
  return { clipPath: `polygon(${points.map(([px, py]) => `${px.toFixed(1)}px ${py.toFixed(1)}px`).join(", ")})`, edge: `M ${points.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join(" L ")} Z`, outgoing: 1 };
}

/** Checks a shape wipe. `origin` is the centre of its subject in the outgoing scene, if it has one; `mark` is the brand's mark source. */
export function inspectShapeWipe(spec: FilmShapeWipeSpec, frames: number, rate: number, path: string, size: { width: number; height: number },
  origin: { x: number; y: number } | undefined | "unknown", mark?: string): { wipe?: FilmShapeWipe; problems: ShapeWipeProblem[] } {
  const problems: ShapeWipeProblem[] = [], say = (severity: ShapeWipeProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: path + at, message, hint });
  const shape = spec.shape ?? "circle";
  if (!SHAPES.includes(shape)) say("error", "shape-unknown", "/shape", `"${shape}" is not a shape.`, `Shapes: ${SHAPES.join(", ")}.`);
  if (shape === "mark" && !mark) say("error", "shape-mark", "/shape", "A mark wipe grows the brand's mark, and the film has no `brand.mark`.");
  if (spec.color !== undefined && !COLOR.test(spec.color)) say("error", "shape-color", "/color", "An edge colour is a #rrggbb colour.");
  if (origin === "unknown") say("error", "shape-subject", "/subject", `"${spec.subject}" is not a subject of the scene before.`, "Declare it in that scene's `subjects`, or leave `subject` out to grow from the centre.");
  if (problems.length) return { problems };
  if (frames < rate * .27 || frames > rate * 1) say("warning", "shape-timing", "/durationFrames", `A ${(frames / rate).toFixed(2)} s shape wipe ${frames < rate * .27 ? "pops open before the shape can be seen" : "opens so slowly the viewer studies the outgoing scene through it"}.`, "Open it over 8 to 30 frames.");
  return { wipe: { shape, origin: (origin as { x: number; y: number } | undefined) ?? { x: size.width / 2, y: size.height / 2 }, edge: spec.color, mark: shape === "mark" ? mark : undefined }, problems };
}
