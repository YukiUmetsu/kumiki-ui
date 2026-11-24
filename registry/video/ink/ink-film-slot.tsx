import { useMemo } from "react";
import type { ReactNode } from "react";
import { inspectInkFilm } from "./ink-film";
import type { InkFilm } from "./ink-film";
import { InkFilmStage } from "./ink-film-react";
import { inkPainter } from "./ink-paint-pool";
import { INK_BOOK } from "./ink-subjects";

type SlotContent = { slot: string; label: string; props?: Readonly<Record<string, unknown>> };
type SlotContext = { frame: number; durationFrames: number; width: number; height: number; reducedMotion: boolean };

function Slot({ film, frame, width, height, still, label }: { film: InkFilm; frame: number; width: number; height: number; still: boolean; label: string }) {
  // a film given inline is a new object at every render: one that reads the same is the same film
  const text = JSON.stringify(film), kept = useMemo(() => JSON.parse(text) as InkFilm, [text]);
  return <InkFilmStage film={kept} book={INK_BOOK} painter={inkPainter} frame={frame} upright={height > width} pixels={width} still={still} aria-label={label} />;
}
/**
 * FilmStage slot for INK-FILM1: `ink-film` `{ film: InkFilm, offsetFrame? }`. The film's own size must have the shape of the output (its
 * `tall` size when the output is upright) and subjects are names of `INK_BOOK`. Returns undefined for any other slot, so hosts can chain renderers.
 */
export function renderInkSlot(content: SlotContent, context: SlotContext): ReactNode | undefined {
  if (content.slot !== "ink-film") return undefined;
  const { film, offsetFrame = 0 } = (content.props ?? {}) as { film?: InkFilm; offsetFrame?: unknown };
  if (!film || typeof film !== "object" || !Array.isArray(film.shots)) throw new RangeError("ink-film needs props.film, an InkFilm.");
  if (typeof offsetFrame !== "number" || !Number.isSafeInteger(offsetFrame) || offsetFrame < 0) throw new RangeError("ink-film offsetFrame must be a nonnegative integer.");
  const wrong = inspectInkFilm(film, INK_BOOK); if (wrong.length) throw new RangeError(`ink-film: ${wrong.join(" ")}`);
  const size = context.height > context.width ? film.tall : film.size;
  if (!size || Math.abs(size.width / size.height - context.width / context.height) > 0.01) throw new RangeError("ink-film: the film has no size with the shape of the output.");
  return <Slot film={film} frame={offsetFrame + context.frame} width={context.width} height={context.height} still={context.reducedMotion} label={content.label} />;
}
