/**
 * Japanese text for learners: furigana markup, readings, morae and phones. Pure data, no DOM.
 *
 * Markup: `{袋|ふくろ}` shows 袋 under ふくろ. `{袋|ふくろ|bag}` also carries a gloss. `[は|わ]` shows は and says わ
 * (particles). A plain space is a word boundary: it is not shown, and a long vowel never runs across it.
 */
export interface RubyToken {
  /** What the reader sees. */
  text: string;
  /** Furigana over the text. */
  ruby?: string;
  /** Kana that is spoken, when it is not the ruby or the text itself. */
  say?: string;
  /** Meaning of this word. */
  gloss?: string;
  /** Word number in the line: tokens between two spaces share one. */
  word: number;
}

const KANJI = /[㐀-鿿豈-﫿々〆ヶ]/;
const KANA = /^[ぁ-ゖァ-ヺー・]+$/;
const PAUSE = /[。、！？!?…,.\s「」『』（）()〜～]/;

/** Read the markup. Plain text between marks is one token for each run of kana or of punctuation. */
export function parseRuby(source: string): RubyToken[] {
  const out: RubyToken[] = [];
  let word = 0, i = 0, plain = "";
  const flush = () => { for (const run of plain.match(/[。、！？!?…,.「」『』（）()〜～\u3000]+|[^。、！？!?…,.「」『』（）()〜～\u3000]+/g) ?? []) out.push({ text: run, word }); plain = ""; };
  while (i < source.length) {
    const c = source[i], close = c === "{" ? "}" : c === "[" ? "]" : "";
    if (close) {
      const end = source.indexOf(close, i);
      if (end < 0) throw new Error(`Ruby mark is not closed: ${source.slice(i)}`);
      const [text, a, b] = source.slice(i + 1, end).split("|");
      flush();
      out.push(c === "{" ? { text, ruby: a, ...(b ? { gloss: b } : {}), word } : { text, say: a, word });
      i = end + 1;
    } else if (c === " ") { flush(); word++; i++; } else { plain += c; i++; }
  }
  flush();
  return out;
}

/** The text without its marks. */
export const rubyPlain = (tokens: readonly RubyToken[]): string => tokens.map(t => t.text).join("");
/** The kana that a token says. */
export const tokenReading = (t: RubyToken): string => t.say ?? t.ruby ?? t.text;
/** The whole line in kana. */
export const rubyReading = (tokens: readonly RubyToken[]): string => tokens.map(tokenReading).join("");

/** What is wrong with a line for a learner: kanji without a reading, a reading that is not kana, text that cannot be said. */
export function inspectRuby(source: string): string[] {
  let tokens: RubyToken[];
  try { tokens = parseRuby(source); } catch (e) { return [e instanceof Error ? e.message : String(e)]; }
  const wrong: string[] = [];
  for (const t of tokens) {
    if (KANJI.test(t.text) && !t.ruby) wrong.push(`"${t.text}" has kanji and no furigana.`);
    if (t.ruby !== undefined && !KANA.test(t.ruby)) wrong.push(`The furigana of "${t.text}" is not kana: "${t.ruby}".`);
    if (t.say !== undefined && !KANA.test(t.say)) wrong.push(`The spoken form of "${t.text}" is not kana: "${t.say}".`);
    for (const ch of tokenReading(t)) if (!KANA.test(ch) && !PAUSE.test(ch) && !KANJI.test(ch)) wrong.push(`"${ch}" in "${t.text}" has no kana reading.`);
  }
  return wrong;
}

/** Katakana to hiragana; the long mark stays. */
export const toHiragana = (s: string): string => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

const ROWS: Record<string, string> = { "": "あいうえお", k: "かきくけこ", s: "さしすせそ", t: "たちつてと", n: "なにぬねの", h: "はひふへほ", m: "まみむめも", r: "らりるれろ", g: "がぎぐげご", z: "ざじずぜぞ", d: "だぢづでど", b: "ばびぶべぼ", p: "ぱぴぷぺぽ" };
const VOWELS = "aiueo";
const MORA: Record<string, string[]> = {};
for (const [c, row] of Object.entries(ROWS)) [...row].forEach((k, i) => { MORA[k] = c ? [c, VOWELS[i]] : [VOWELS[i]]; });
Object.assign(MORA, { し: ["sh", "i"], ち: ["ch", "i"], つ: ["ts", "u"], ふ: ["f", "u"], じ: ["j", "i"], ぢ: ["j", "i"], づ: ["z", "u"], や: ["y", "a"], ゆ: ["y", "u"], よ: ["y", "o"], わ: ["w", "a"], ゐ: ["i"], ゑ: ["e"], を: ["o"], ゔ: ["b", "u"], ん: ["N"], っ: ["q"], ぁ: ["a"], ぃ: ["i"], ぅ: ["u"], ぇ: ["e"], ぉ: ["o"] });
const GLIDE: Record<string, string> = { き: "ky", し: "sh", ち: "ch", に: "ny", ひ: "hy", み: "my", り: "ry", ぎ: "gy", じ: "j", ぢ: "j", び: "by", ぴ: "py", て: "ty", で: "dy", ふ: "f" };
const SMALL_Y: Record<string, string> = { ゃ: "a", ゅ: "u", ょ: "o" }, SMALL_V: Record<string, string> = { ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o" };
const FOREIGN: Record<string, string> = { う: "w", ゔ: "b", て: "t", で: "d", と: "t", ど: "d", つ: "ts" };

/** One mora: its kana and its phones (Julius names: `N` for ん, `q` for っ, `sp` for a pause). */
export interface Mora { kana: string; phones: readonly string[] }

/** Split kana into morae. Anything that is not kana is a pause. */
export function moraeOf(kana: string): Mora[] {
  const s = toHiragana(kana), out: Mora[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i], next = s[i + 1] ?? "";
    if (SMALL_Y[next] && GLIDE[c]) { out.push({ kana: c + next, phones: [GLIDE[c], SMALL_Y[next]] }); i++; continue; }
    if (SMALL_V[next] && MORA[c] && c !== "っ" && c !== "ん") {
      const con = FOREIGN[c] ?? (MORA[c].length > 1 ? MORA[c][0] : "");
      out.push({ kana: c + next, phones: con ? [con, SMALL_V[next]] : [SMALL_V[next]] }); i++; continue;
    }
    if (c === "ー") { out.push({ kana: c, phones: [":"] }); continue; }
    if (MORA[c]) { out.push({ kana: c, phones: MORA[c] }); continue; }
    if (!out.length || out[out.length - 1].phones[0] !== "sp") out.push({ kana: c, phones: ["sp"] });
  }
  return out;
}

export interface PhoneSpec {
  /** Phone name; a trailing `:` is a long vowel. */
  p: string;
  /** Token it belongs to (the first, for a long vowel). */
  token: number;
  /** Morae it lasts: 2 for a long vowel, 0.5 each for a consonant and its vowel. */
  morae: number;
}
const LONG: Record<string, string> = { aa: "a", ii: "i", uu: "u", ee: "e", ei: "e", oo: "o", ou: "o" };

/** The phones of a line, long vowels joined inside a word. */
export function phonesOf(tokens: readonly RubyToken[]): PhoneSpec[] {
  const out: (PhoneSpec & { word: number })[] = [];
  tokens.forEach((t, token) => {
    for (const m of moraeOf(tokenReading(t))) {
      const last = out[out.length - 1];
      if (m.phones[0] === ":") { if (last && /^[aiueo]/.test(last.p)) { last.p = `${last.p[0]}:`; last.morae += 1; } continue; }
      if (m.phones.length === 1 && last && last.word === t.word && /^[aiueo]$/.test(last.p) && LONG[last.p + m.phones[0]]) { last.p = `${LONG[last.p + m.phones[0]]}:`; last.morae += 1; continue; }
      if (m.phones[0] === "sp" && (!last || last.p === "sp")) continue;
      m.phones.forEach(p => out.push({ p, token, word: t.word, morae: m.phones.length > 1 ? 0.5 : 1 }));
    }
  });
  if (out[out.length - 1]?.p === "sp") out.pop();
  return out.map(({ p, token, morae }) => ({ p, token, morae }));
}
