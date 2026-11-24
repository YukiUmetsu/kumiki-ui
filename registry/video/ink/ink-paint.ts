/**
 * INK-FILM1 painting off the main thread. A film names its subjects, so a worker that knows the same book can paint its cels: the page stays
 * quick and a film is ready several times sooner. A subject given as an object, or one the workers do not know, is painted on the page.
 *
 *   worker file    serveInkCels(self, book)
 *   page           createInkPainter({ worker: () => new Worker(new URL("./my-ink-worker.ts", import.meta.url), { type: "module" }), knows: name => name in book })
 */
import { paintInkCel } from "./ink-cel";
import type { InkCel, InkSubject } from "./ink-cel";
import type { InkBook, InkCelOrder } from "./ink-film";

/** Paints a cel of a film. */
export type InkCelPainter = (order: InkCelOrder) => Promise<InkCel | null>;
interface Job { id: number; subject: string; props: Readonly<Record<string, unknown>>; part: string; pose: string; scale: number }
interface Reply { id: number; cel: InkCel | null; error?: string }
interface Scope { onmessage: ((e: MessageEvent) => void) | null; postMessage(message: unknown, transfer: Transferable[]): void }

/** The worker's side. */
export function serveInkCels(scope: Scope, book: InkBook): void {
  const made = new Map<string, InkSubject>();
  scope.onmessage = e => {
    const j = e.data as Job;
    try {
      const key = `${j.subject}|${JSON.stringify(j.props)}`; let s = made.get(key); if (!s) { s = book[j.subject](j.props); made.set(key, s); if (made.size > 60) made.delete(made.keys().next().value as string); }
      const part = s.parts.find(p => p.id === j.part); if (!part) throw new Error(`"${j.subject}" has no part "${j.part}".`);
      const cel = paintInkCel(s, part, j.scale, j.pose);
      scope.postMessage({ id: j.id, cel } satisfies Reply, cel ? [cel.pixels.buffer as ArrayBuffer, cel.when.buffer as ArrayBuffer] : []);
    } catch (err) { scope.postMessage({ id: j.id, cel: null, error: err instanceof Error ? err.message : String(err) } satisfies Reply, []); }
  };
}
export interface InkPainterOptions {
  worker: () => Worker;
  /** Whether the workers can paint a subject of this name. */
  knows: (subject: string) => boolean;
  /** Workers at most (default: all cores but two, 6 at most). */
  hands?: number;
}
/** The page's side: workers are made when first needed and kept. */
export function createInkPainter(o: InkPainterOptions): InkCelPainter {
  const idle: Worker[] = [], waiting: (() => void)[] = [], jobs = new Map<number, (r: Reply) => void>();
  let all = 0, next = 1, broken = typeof Worker === "undefined";
  const most = () => Math.max(1, Math.min(6, o.hands ?? (typeof navigator === "undefined" ? 2 : (navigator.hardwareConcurrency || 4) - 2)));
  const hand = async (): Promise<Worker | null> => {
    for (;;) {
      if (broken) return null;
      const w = idle.pop(); if (w) return w;
      if (all < most()) {
        try {
          const made = o.worker(); all++;
          made.onmessage = e => { const r = e.data as Reply; idle.push(made); const done = jobs.get(r.id); jobs.delete(r.id); done?.(r); waiting.shift()?.(); };
          // a worker that cannot start (blocked, or not bundled) leaves everything to the page
          made.onerror = () => { broken = true; for (const [id, done] of jobs) done({ id, cel: null, error: "worker" }); jobs.clear(); waiting.splice(0).forEach(f => f()); };
          return made;
        } catch { broken = true; return null; }
      }
      await new Promise<void>(f => waiting.push(f));
    }
  };
  const here = async (q: InkCelOrder) => { await new Promise<void>(f => setTimeout(f, 0)); return paintInkCel(q.subject, q.part, q.scale, q.pose); };
  return async q => {
    const name = q.layer.subject; if (typeof name !== "string" || !o.knows(name)) return here(q);
    const w = await hand(); if (!w) return here(q);
    const id = next++, r = await new Promise<Reply>(done => { jobs.set(id, done); w.postMessage({ id, subject: name, props: q.layer.props ?? {}, part: q.part.id, pose: q.pose, scale: q.scale } satisfies Job); });
    if (!r.error) return r.cel;
    if (r.error === "worker") return here(q);
    throw new Error(r.error);
  };
}
