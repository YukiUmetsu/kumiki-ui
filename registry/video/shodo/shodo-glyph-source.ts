/**
 * SHO1 glyph source: any Japanese character, written the same way everywhere.
 *
 * Bundled original glyphs come first. Any other kanji or kana is read from KanjiVG
 * (stroke order and centrelines), pinned to one release and loaded at run time: the data
 * is never bundled. KanjiVG is © Ulrich Apel, CC BY-SA 3.0; a film that uses it must
 * credit KanjiVG (http://kanjivg.tagaini.net) and keep the share-alike terms. Every
 * loaded glyph keeps `source: "kanjivg"` so hosts can show the credit.
 *
 * `shodoKaishoForm` then applies the teacher-measured layout rules (結構法, `shodoStructure`)
 * and brush habits (右上がり, weight by length, 懸針, 右払い feet, kana curves).
 */
import { SHODO_GLYPHS, kanjiVgFileName, parseKanjiVgSvg, shodoKaishoForm } from "./shodo-glyphs";
import type { ShodoFormOptions, ShodoGlyph } from "./shodo-glyphs";

export const SHODO_KANJIVG_RELEASE = "r20260714";
// Raw GitHub at the release tag: CORS-enabled and not limited by CDN package size.
export const SHODO_KANJIVG_BASE = `https://raw.githubusercontent.com/KanjiVG/kanjivg/${SHODO_KANJIVG_RELEASE}/kanji/`;
export const SHODO_KANJIVG_CREDIT = `Stroke data: KanjiVG ${SHODO_KANJIVG_RELEASE} © Ulrich Apel, CC BY-SA 3.0 (kanjivg.tagaini.net)`;

export interface ShodoGlyphLoadOptions extends ShodoFormOptions {
  /** Folder or server holding KanjiVG `kanji/*.svg` files; defaults to the pinned release on GitHub. */
  baseUrl?: string;
  /** Use the bundled original glyph when one exists. Default true. */
  preferBundled?: boolean;
  fetcher?: (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
}

const cache = new Map<string, Promise<ShodoGlyph>>();

/** Load one character's glyph. Rejects with a clear message when no stroke data exists. */
export function loadShodoGlyph(char: string, options: ShodoGlyphLoadOptions = {}): Promise<ShodoGlyph> {
  const c = [...char][0];
  if (!c || !c.trim()) return Promise.reject(new RangeError("A non-space character is required."));
  if (options.preferBundled !== false && SHODO_GLYPHS[c]) return Promise.resolve(SHODO_GLYPHS[c]);
  const base = options.baseUrl ?? SHODO_KANJIVG_BASE;
  // Every form option changes the result, so all of them are part of the cache key.
  const key = [base, c, options.rise, options.sweep, options.main, JSON.stringify(options.structure ?? null)].join("|");
  const hit = cache.get(key);
  if (hit) return hit;
  const fetcher = options.fetcher ?? ((url: string) => fetch(url));
  const job = fetcher(base + kanjiVgFileName(c)).then(async res => {
    if (!res.ok) throw new RangeError(`No stroke data for ${c} (KanjiVG ${res.status}).`);
    return shodoKaishoForm(parseKanjiVgSvg(await res.text(), c), options);
  });
  job.catch(() => cache.delete(key));
  cache.set(key, job);
  return job;
}

/** Load every character of a text, in order (spaces skipped). */
export function loadShodoText(text: string, options: ShodoGlyphLoadOptions = {}): Promise<ShodoGlyph[]> {
  return Promise.all([...text].filter(c => c.trim()).map(c => loadShodoGlyph(c, options)));
}
