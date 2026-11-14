/**
 * COLLAGE1 typography: font roles and deterministic text measurement.
 *
 * Paper slips, highlighter sweeps and stamp frames are sized from these advance widths instead of a DOM
 * measurement, so server rendering, Storybook and film export draw identical chips on the first frame.
 * The tables are horizontal advances (em) for printable ASCII in the reference faces: Anton (OFL) for
 * headlines, Newsreader for body copy and Geist for labels, measured in Chromium at three weights. Another face can be supplied through
 * `fonts`; its widths then fall back to the role table, so give it generous `padding`.
 */

export type CollageFontRole = "headline" | "body" | "label";
export interface CollageFonts { headline?: string; body?: string; label?: string }

const CJK_SANS = '"Noto Sans JP", "Noto Sans CJK JP", "Hiragino Sans", "Yu Gothic", "PingFang SC", "Microsoft YaHei", sans-serif';
const CJK_SERIF = '"Noto Serif JP", "Noto Serif CJK JP", "Hiragino Mincho ProN", "Yu Mincho", "Songti SC", serif';

export const COLLAGE_FONT_STACKS: Readonly<Record<CollageFontRole, string>> = {
  headline: '"Anton", "Oswald", "Bebas Neue", Impact, "Arial Narrow", ' + CJK_SANS,
  body: '"Newsreader Variable", "Newsreader", Georgia, "Times New Roman", ' + CJK_SERIF,
  label: '"Geist Variable", "Geist", "Helvetica Neue", Arial, ' + CJK_SANS,
};

// Printable ASCII 32..126, advance in em, measured in Chromium (single-glyph advances) at weights 400/600/800.
// Advances are size-independent for these faces; other weights interpolate between the masters.
const ANTON = [.234, .229, .429, .546, .462, 1.057, .52, .214, .291, .291, .452, .355, .236, .311, .229, .405, .494, .331, .494, .494, .494, .494, .494, .494, .494, .494, .242, .245, .321, .311, .321, .492, .864, .485, .479, .474, .493, .412, .399, .485, .499, .227, .466, .472, .398, .746, .498, .486, .472, .494, .477, .462, .396, .474, .469, .712, .484, .446, .41, .318, .405, .318, .474, .365, .318, .483, .502, .491, .498, .488, .28, .504, .505, .243, .263, .491, .248, .758, .499, .497, .502, .498, .347, .475, .305, .499, .461, .696, .459, .461, .386, .34, .216, .34, .493];
const NEWSREADER: readonly (readonly number[])[] = [
  [.229, .27, .354, .567, .567, .781, .717, .199, .285, .285, .435, .512, .239, .354, .23, .401, .567, .567, .567, .567, .567, .567, .567, .567, .567, .567, .253, .269, .512, .512, .512, .441, .891, .711, .644, .705, .763, .64, .592, .751, .8, .339, .446, .73, .603, .979, .771, .777, .609, .777, .645, .555, .67, .768, .692, .967, .719, .684, .634, .329, .401, .33, .512, .41, .5, .46, .546, .437, .556, .462, .345, .496, .561, .28, .247, .541, .269, .832, .573, .526, .564, .545, .394, .384, .342, .537, .527, .743, .507, .524, .431, .322, .252, .322, .512],
  [.219, .284, .392, .611, .611, .838, .742, .211, .297, .297, .433, .512, .253, .362, .247, .405, .611, .611, .611, .611, .611, .611, .611, .611, .611, .611, .269, .278, .512, .512, .512, .483, .895, .756, .689, .716, .785, .67, .621, .77, .835, .371, .475, .773, .638, 1.024, .781, .79, .651, .789, .7, .586, .7, .784, .728, 1.028, .758, .723, .654, .328, .405, .329, .512, .411, .5, .49, .568, .461, .579, .482, .378, .519, .588, .304, .277, .579, .292, .868, .6, .542, .584, .567, .43, .412, .381, .571, .551, .782, .533, .553, .46, .323, .246, .323, .512],
  [.205, .304, .443, .671, .671, .916, .777, .229, .312, .313, .43, .512, .273, .373, .271, .411, .671, .671, .671, .671, .671, .671, .671, .671, .671, .671, .291, .291, .512, .512, .512, .541, .901, .818, .752, .732, .815, .713, .66, .796, .883, .416, .516, .832, .685, 1.085, .795, .807, .708, .807, .774, .63, .74, .806, .779, 1.112, .813, .776, .681, .328, .411, .328, .512, .412, .5, .532, .599, .495, .61, .509, .423, .552, .625, .336, .318, .632, .324, .916, .636, .563, .611, .598, .48, .449, .434, .619, .583, .836, .569, .593, .5, .324, .239, .324, .512],
];
const GEIST: readonly (readonly number[])[] = [
  [.25, .213, .346, .478, .629, .802, .62, .178, .274, .274, .43, .558, .201, .419, .201, .48, .663, .384, .619, .613, .615, .626, .593, .524, .604, .593, .297, .297, .544, .54, .544, .559, .906, .668, .68, .703, .694, .603, .59, .7, .713, .27, .597, .64, .58, .877, .743, .739, .65, .733, .672, .64, .552, .689, .667, .945, .606, .576, .544, .347, .455, .347, .426, .557, .248, .551, .595, .546, .595, .561, .395, .594, .581, .244, .26, .59, .267, .877, .581, .573, .595, .595, .379, .52, .392, .575, .536, .819, .585, .537, .537, .389, .264, .389, .523],
  [.236, .243, .376, .552, .656, .818, .677, .195, .306, .306, .425, .566, .225, .418, .225, .508, .683, .427, .642, .638, .643, .656, .615, .538, .644, .618, .306, .306, .548, .548, .548, .581, .944, .709, .695, .724, .708, .615, .6, .726, .719, .29, .617, .673, .586, .902, .748, .763, .665, .757, .689, .668, .584, .699, .709, .991, .66, .613, .577, .375, .485, .375, .45, .56, .268, .58, .621, .58, .621, .591, .43, .62, .601, .269, .308, .628, .298, .892, .601, .603, .621, .621, .41, .553, .427, .597, .585, .839, .628, .57, .568, .401, .284, .401, .523],
  [.221, .272, .405, .626, .683, .833, .735, .212, .339, .339, .419, .574, .248, .417, .248, .536, .703, .47, .665, .662, .67, .686, .638, .551, .684, .643, .315, .315, .552, .556, .552, .602, .981, .75, .71, .745, .723, .628, .609, .751, .724, .31, .637, .705, .592, .928, .753, .788, .679, .781, .706, .695, .615, .708, .751, 1.038, .715, .65, .61, .404, .516, .404, .473, .563, .288, .609, .647, .615, .647, .62, .464, .647, .621, .294, .355, .666, .328, .908, .621, .633, .647, .647, .44, .586, .463, .618, .633, .859, .671, .603, .598, .414, .304, .414, .523],
];
const TABLES: Record<CollageFontRole, readonly (readonly number[])[]> = { headline: [ANTON, ANTON, ANTON], body: NEWSREADER, label: GEIST };

const isWide = (code: number) =>
  (code >= 0x1100 && code <= 0x115f) || (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) ||
  (code >= 0xf900 && code <= 0xfaff) || (code >= 0xfe30 && code <= 0xfe4f) || (code >= 0xff00 && code <= 0xff60) || (code >= 0xffe0 && code <= 0xffe6);

export interface MeasureOptions { role: CollageFontRole; size: number; weight?: number; letterSpacing?: number; uppercase?: boolean }

/** Advance width of one line in pixels. Wide (CJK) glyphs count as one em; unknown Latin glyphs as .58 em. */
export function measureText(text: string, options: MeasureOptions): number {
  const masters = TABLES[options.role];
  const source = options.uppercase ? text.toUpperCase() : text;
  // Variable faces widen as they get heavier: interpolate between the 400, 600 and 800 masters.
  const w = Math.min(800, Math.max(400, options.weight ?? 400)), lo = w <= 600 ? 0 : 1, t = (w - (lo ? 600 : 400)) / 200;
  const advance = (i: number) => masters[lo][i] + (masters[lo + 1][i] - masters[lo][i]) * t;
  let em = 0, count = 0;
  for (const ch of source) {
    const code = ch.codePointAt(0)!;
    count++;
    if (code >= 32 && code <= 126) em += advance(code - 32);
    else if (isWide(code)) em += 1;
    else em += advance(33) * 1.05;
  }
  return em * options.size + Math.max(0, count - 1) * (options.letterSpacing ?? 0);
}

/** Greedy word wrap to a pixel width; CJK runs may break between any two characters. */
export function wrapText(text: string, maxWidth: number, options: MeasureOptions): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const tokens = paragraph.match(/[⺀-꓏가-힣豈-﫿＀-｠]|[^\s⺀-꓏가-힣豈-﫿＀-｠]+|\s+/g) ?? [""];
    let line = "";
    for (const token of tokens) {
      const candidate = line + token;
      if (line.trim() && measureText(candidate.trimEnd(), options) > maxWidth) { lines.push(line.trimEnd()); line = token.trimStart(); }
      else line = candidate;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export function fontStack(role: CollageFontRole, fonts?: CollageFonts): string {
  return fonts?.[role] ?? COLLAGE_FONT_STACKS[role];
}
