/** Film looks: how a film *feels*, as explicit, deterministic numbers. A look grades the picture, gives it the texture of a film stock
 * or a video format, sets the frame cadence, the camera's behaviour, the lens, the 3D lighting mood, the type and the sound mood.
 *
 * A film names a preset and optional mood words; each mood moves the preset's numbers in a known direction (brightness carries
 * pleasure and saturation carries arousal: Valdez & Mehrabian 1994), and `overrides` set any number directly. Style references
 * from a brief (a director, a film, a stock) are resolved by the writer into a preset plus overrides; no name is stored here.
 * Pure: no renderer, no DOM. `film-look-react.tsx` draws a resolved look. See docs/33-film-looks-and-style-anchors.md.
 */

export type LookStudio = "softbox" | "strip" | "rim" | "high-key" | "low-key" | "neon" | "golden-hour" | "blue-hour" | "overcast";
export type Rgb = readonly [number, number, number];

/** The colour grade, applied to the finished frame. */
export interface LookGrade {
  /** Stops of exposure, about -1 to 1. */
  exposure: number;
  /** Contrast around middle grey: 1 is unchanged, above 1 an S-curve, below 1 flatter. */
  contrast: number;
  /** 0 is black and white, 1 unchanged, above 1 more saturated. */
  saturation: number;
  /** -1 cool to 1 warm. */
  temperature: number;
  /** -1 green to 1 magenta. */
  tint: number;
  /** Lifted blacks, a matte toe: 0 to about 0.15. */
  blacks: number;
  /** Rolled-off whites, the shoulder: 1 is unchanged, 0.9 a soft print. */
  whites: number;
  /** Colour added in the shadows and in the highlights (split toning), about -0.08 to 0.08 per channel. */
  shadowTint: Rgb;
  highlightTint: Rgb;
  /** A channel mixer: each row makes one output channel from red, green and blue. For a black-and-white filter or a teal push. */
  mixer?: readonly [Rgb, Rgb, Rgb];
  /** Flat bands of colour, as cel paint: the number of levels per channel, 4 to 16. */
  posterize?: number;
}
/** The texture of a film stock or a video format. Every value is 0 when absent. */
export interface LookTexture {
  /** Grain strength, 0 to 1, and grain size in pixels at 1080p. */
  grain: number;
  grainSize: number;
  /** Black-and-white grain, as on monochrome stock. */
  grainMono: boolean;
  /** Halation: the coloured glow around highlights from light scattered in the emulsion. */
  halation: number;
  halationTint: string;
  /** A white glow around highlights. */
  bloom: number;
  /** The level above which highlights glow, 0.5 to 0.95. */
  glowThreshold: number;
  /** Glow radius as a share of the frame's short side. */
  glowRadius: number;
  /** Horizontal flare streaks from bright points, as an anamorphic lens draws them. */
  streaks: number;
  /** Gate weave: frame-to-frame drift in pixels at 1080p. About 1 for 1970s 35 mm, 4 or more for home 8 mm. */
  weave: number;
  /** Frame-to-frame exposure flicker, 0 to about 0.08. */
  flicker: number;
  /** Darkened corners, 0 to 1. */
  vignette: number;
  /** Warm light leaks drifting across the frame, 0 to 1. */
  leaks: number;
  /** Video: colour bleeding sideways from each edge, in pixels at 1080p. */
  chroma: number;
  /** Video: scan lines, 0 to 1. */
  scanlines: number;
  /** Video: tracking noise bands that roll through now and then, 0 to 1. */
  tracking: number;
  /** A slight overall softness, in pixels at 1080p. */
  softness: number;
  /** Shadows of window blinds across the frame, as hard-lit noir throws them, 0 to 1. */
  blinds: number;
  /** An aspect matte. It covers the frame edges, where titles sit, so keep titles inside it. */
  matte: "none" | "2.39" | "4:3";
  /** Ink lines drawn where colours meet, as a cel animator outlines a painted drawing, 0 to 1. */
  outline: number;
  /** Line boil: drawn edges wobble a little on every held drawing, as a redrawn animation's lines do, 0 to 1. For drawn scenes, not
   * photographs. (Doc 34, A7.) */
  boil: number;
}
/** How the picture moves. */
export interface LookMotion {
  /** `smooth`: every frame. `twos`: each drawing held two frames, as cel animation. `step`: each frame held `hold` frames, the
   * undercranked, step-printed stutter. */
  cadence: "smooth" | "twos" | "step";
  hold: number;
  /** `locked`: no movement. `drift`: the film's slow push. `float`: a slow, stabilised sway. `handheld`: a live operator. */
  camera: "locked" | "drift" | "float" | "handheld";
  /** Strength of the float or handheld movement, 0 to 1. */
  shake: number;
  /** A slow push-in after a scene's story turn, as a share of the frame (0.04 is 4%). */
  pushAtTurn: number;
}
export interface LookLens {
  /** Field of view for 3D shots: below 1 a longer lens (flatter, more compressed), above 1 a wider one. The subject keeps its size. */
  fovScale: number;
}
export interface LookType {
  /** CSS font stacks for display type and body type. */
  display?: string;
  body?: string;
  /** Title case and letter spacing. */
  titleCase: "none" | "uppercase";
  tracking: string;
}
export interface LookSound {
  /** Catalog tags a bed for this look should carry. */
  bedTags: readonly string[];
  /** Muffles beds that set no filter of their own, for lo-fi and period looks. */
  lowpassHz?: number;
}
export interface ResolvedLook {
  id: string;
  grade: LookGrade;
  texture: LookTexture;
  motion: LookMotion;
  lens: LookLens;
  /** The 3D studio's lighting for shots that do not set one. */
  studio: LookStudio;
  type: LookType;
  sound: LookSound;
}

export const LOOK_MOODS = ["melancholic", "bittersweet", "tense", "joyful", "serene", "nostalgic", "clinical", "urgent"] as const;
export type LookMood = typeof LOOK_MOODS[number];

interface Preset extends Omit<ResolvedLook, "id"> {
  title: string;
  /** What the look is, for a reader choosing one. */
  character: string;
  suits: readonly LookMood[];
  avoids: readonly LookMood[];
}

const NEUTRAL: LookGrade = { exposure: 0, contrast: 1, saturation: 1, temperature: 0, tint: 0, blacks: 0, whites: 1, shadowTint: [0, 0, 0], highlightTint: [0, 0, 0] };
const CLEAN: LookTexture = { boil: 0, grain: 0, grainSize: 1.4, grainMono: false, halation: 0, halationTint: "#ff8a3d", bloom: 0, glowThreshold: .86, glowRadius: .012, streaks: 0, weave: 0, flicker: 0,
  vignette: 0, leaks: 0, chroma: 0, scanlines: 0, tracking: 0, softness: 0, blinds: 0, matte: "none", outline: 0 };
const STILL: LookMotion = { cadence: "smooth", hold: 1, camera: "drift", shake: 0, pushAtTurn: 0 };
const TYPE: LookType = { titleCase: "none", tracking: "-0.01em" };
const preset = (p: { title: string; character: string; suits: readonly LookMood[]; avoids?: readonly LookMood[]; grade?: Partial<LookGrade>; texture?: Partial<LookTexture>; motion?: Partial<LookMotion>;
  lens?: Partial<LookLens>; studio?: LookStudio; type?: Partial<LookType>; sound?: Partial<LookSound> }): Preset => ({
  title: p.title, character: p.character, suits: p.suits, avoids: p.avoids ?? [], grade: { ...NEUTRAL, ...p.grade }, texture: { ...CLEAN, ...p.texture }, motion: { ...STILL, ...p.motion },
  lens: { fovScale: 1, ...p.lens }, studio: p.studio ?? "softbox", type: { ...TYPE, ...p.type }, sound: { bedTags: [], ...p.sound },
});

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif", GEOMETRIC = "'Avenir Next', 'Century Gothic', 'Futura', 'Trebuchet MS', sans-serif";
const MONO = "'SF Mono', Menlo, Consolas, 'Courier New', monospace";

/** The library. Names describe the look; the references that informed each are in docs/33, not here. */
export const LOOK_PRESETS = {
  "studio-clean": preset({ title: "Studio clean", character: "Crisp and neutral, no texture: product films and explainers.", suits: ["clinical", "joyful", "serene"] }),
  "warm-35mm": preset({ title: "Warm 35 mm", character: "A colour negative print: soft toe, warm skin, fine grain, a gentle amber glow and a trace of gate weave.",
    suits: ["nostalgic", "bittersweet", "serene", "joyful"], avoids: ["clinical"],
    grade: { exposure: .05, contrast: 1.12, saturation: .95, temperature: .8, tint: .18, blacks: .05, whites: .93, shadowTint: [.015, .005, .015], highlightTint: [.07, .025, -.045] },
    texture: { grain: .42, grainSize: 1.5, halation: .55, glowThreshold: .85, bloom: .1, weave: 1.2, flicker: .02, vignette: .35 }, sound: { bedTags: ["warm", "room"] } }),
  "neon-longing": preset({ title: "Neon longing", character: "Saturated red, green and teal practicals in deep tinted shadows, a stuttering step-printed motion, handheld and a little wide.",
    suits: ["melancholic", "bittersweet", "urgent"], avoids: ["clinical", "serene"],
    grade: { contrast: 1.26, saturation: 1.5, temperature: -.15, tint: .12, blacks: .03, whites: .94, shadowTint: [-.05, .1, .08], highlightTint: [.11, -.03, .05] },
    texture: { grain: .4, grainSize: 1.8, halation: .75, halationTint: "#ff2a55", glowThreshold: .8, glowRadius: .02, streaks: .4, weave: .8, vignette: .45 },
    motion: { cadence: "step", hold: 3, camera: "handheld", shake: .55, pushAtTurn: .03 }, lens: { fovScale: 1.15 }, studio: "neon", sound: { bedTags: ["night", "city"] } }),
  "bleach-bypass": preset({ title: "Bleach bypass", character: "Silver kept in the print: desaturated, hard contrast, metallic highlights.",
    suits: ["tense", "urgent"], avoids: ["joyful", "serene"], grade: { exposure: -.05, contrast: 1.6, saturation: .3, temperature: -.12, whites: 1, shadowTint: [-.01, 0, .015] },
    texture: { grain: .32, grainSize: 1.5, bloom: .15, glowThreshold: .9, vignette: .4 }, motion: { camera: "handheld", shake: .25 }, studio: "low-key" }),
  "teal-amber": preset({ title: "Teal and amber", character: "Complementary teal shadows against warm skin and highlights: the contemporary feature grade.",
    suits: ["urgent", "joyful", "tense"], grade: { contrast: 1.2, saturation: 1.25, blacks: .02, shadowTint: [-.07, .035, .11], highlightTint: [.11, .045, -.08],
      mixer: [[1.06, -.04, -.02], [-.02, 1.02, 0], [-.04, .1, .94]] },
    texture: { grain: .15, halation: .2, glowThreshold: .86, vignette: .3 } }),
  "nordic-overcast": preset({ title: "Nordic overcast", character: "Cool and muted under soft grey light, long held frames.",
    suits: ["melancholic", "serene", "tense"], avoids: ["joyful"],
    grade: { exposure: -.15, contrast: .82, saturation: .4, temperature: -.65, tint: -.06, blacks: .09, whites: .9, shadowTint: [-.02, .02, .05], highlightTint: [-.01, 0, .02] },
    texture: { grain: .25, vignette: .3 }, motion: { camera: "locked" }, studio: "overcast", sound: { bedTags: ["wind", "cold"] } }),
  "pastel-tableau": preset({ title: "Pastel tableau", character: "A storybook palette of soft pinks and teals, flat frontal light, symmetrical locked frames, spaced capitals.",
    suits: ["joyful", "serene", "bittersweet"], avoids: ["tense", "urgent"],
    grade: { exposure: .32, contrast: .8, saturation: .7, temperature: .15, tint: .12, blacks: .2, whites: .97, shadowTint: [.07, 0, .06], highlightTint: [.03, .025, -.02] },
    texture: { grain: .1 }, motion: { camera: "locked" }, lens: { fovScale: 1.25 }, studio: "high-key", type: { display: GEOMETRIC, titleCase: "uppercase", tracking: "0.14em" } }),
  noir: preset({ title: "Noir", character: "Black and white under one hard source, slatted shadows, heavy grain and a flickering projector.",
    suits: ["tense", "melancholic"], avoids: ["joyful"],
    grade: { exposure: -.15, contrast: 1.45, saturation: 0, whites: .98, mixer: [[.45, .45, .1], [.45, .45, .1], [.45, .45, .1]] },
    texture: { grain: .5, grainSize: 1.8, grainMono: true, bloom: .2, glowThreshold: .88, vignette: .55, blinds: .12, flicker: .03, weave: 1 },
    studio: "low-key", type: { display: SERIF, titleCase: "uppercase", tracking: "0.08em" }, sound: { bedTags: ["rain", "night"] } }),
  "home-8mm": preset({ title: "Home 8 mm", character: "Small-gauge home film: heavy grain, strong weave and flicker, light leaks, faded warm colour, a few frames a second.",
    suits: ["nostalgic", "joyful", "bittersweet"], avoids: ["clinical"],
    grade: { exposure: .05, contrast: 1.08, saturation: .72, temperature: .65, blacks: .11, whites: .86, shadowTint: [.04, .015, -.03], highlightTint: [.03, .01, -.03] },
    texture: { grain: .8, grainSize: 2.6, halation: .45, halationTint: "#ff9a4a", glowThreshold: .82, weave: 4.5, flicker: .06, vignette: .65, leaks: .6 },
    motion: { cadence: "step", hold: 2, camera: "handheld", shake: .45 }, sound: { bedTags: ["room", "warm"], lowpassHz: 6000 } }),
  "analog-video": preset({ title: "Analog video", character: "Consumer tape: colour bleeding off edges, scan lines, tracking noise rolling through, soft and bright.",
    suits: ["nostalgic", "urgent"], avoids: ["clinical", "serene"],
    grade: { exposure: .3, contrast: .95, saturation: 1.5, temperature: .15, tint: -.2, blacks: .1, whites: .9, shadowTint: [-.01, .04, .03], highlightTint: [.03, .02, -.03] },
    texture: { grain: .2, bloom: .35, glowThreshold: .8, glowRadius: .01, chroma: 4.5, scanlines: .32, tracking: .5, softness: 1.6, vignette: .15 }, motion: { camera: "handheld", shake: .2 },
    type: { display: MONO, titleCase: "uppercase", tracking: "0.04em" }, sound: { bedTags: ["room"], lowpassHz: 9000 } }),
  "documentary-natural": preset({ title: "Documentary natural", character: "Observational: natural, gently warm skin and green foliage, soft contrast, a handheld presence.",
    suits: ["serene", "clinical", "melancholic"], grade: { exposure: .08, contrast: .9, saturation: .8, temperature: .2, tint: -.08, blacks: .05, whites: .92, shadowTint: [.005, .02, 0], highlightTint: [.025, .015, -.02] },
    texture: { grain: .25, vignette: .15 }, motion: { camera: "handheld", shake: .3 } }),
  "cel-animation": preset({ title: "Cel animation", character: "Hand-drawn television animation: flat painted colour in a few levels, inked outlines, saturated, drawn on twos.",
    suits: ["joyful", "urgent"], grade: { contrast: 1.15, saturation: 1.45, posterize: 10 }, texture: { outline: .7 }, motion: { cadence: "twos", camera: "locked" } }),
} as const satisfies Record<string, Preset>;
export type LookPresetId = keyof typeof LOOK_PRESETS;
export const LOOK_PRESET_IDS = Object.keys(LOOK_PRESETS) as LookPresetId[];

/** Overrides set any number of a look directly, after its preset and moods. */
export interface LookOverrides {
  grade?: Partial<LookGrade>;
  texture?: Partial<LookTexture>;
  motion?: Partial<LookMotion>;
  lens?: Partial<LookLens>;
  studio?: LookStudio;
  type?: Partial<LookType>;
  sound?: Partial<LookSound>;
}
/** A look in a film document: a preset, mood words and overrides. A scene's look merges over the film's. */
export interface FilmLookSpec {
  /** @default "studio-clean" */
  preset?: LookPresetId;
  /** Mood words, each moving the preset in its own direction (see `LOOK_MOOD_EFFECTS`). */
  mood?: readonly LookMood[];
  overrides?: LookOverrides;
}

const add3 = (a: Rgb, b: Rgb): Rgb => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** What each mood does, on top of a preset. Brightness and saturation follow the colour-emotion research; light, camera and texture
 * follow cinematography practice. */
export const LOOK_MOOD_EFFECTS: Readonly<Record<LookMood, (look: ResolvedLook) => void>> = {
  melancholic: l => { l.grade.exposure -= .15; l.grade.saturation *= .75; l.grade.contrast *= .95; l.grade.temperature -= .2; l.grade.shadowTint = add3(l.grade.shadowTint, [0, .01, .03]); l.motion.pushAtTurn = Math.max(l.motion.pushAtTurn, .03); if (l.studio === "softbox") l.studio = "blue-hour"; },
  bittersweet: l => { l.grade.highlightTint = add3(l.grade.highlightTint, [.03, .015, -.01]); l.grade.shadowTint = add3(l.grade.shadowTint, [-.01, 0, .025]); l.grade.saturation *= .92; l.texture.halation += .1; },
  tense: l => { l.grade.contrast *= 1.15; l.grade.saturation *= .85; l.grade.exposure -= .1; l.texture.vignette += .15; if (l.motion.camera !== "locked") { l.motion.camera = "handheld"; l.motion.shake = Math.max(l.motion.shake, .35); } if (l.studio === "softbox") l.studio = "low-key"; },
  joyful: l => { l.grade.exposure += .15; l.grade.saturation *= 1.15; l.grade.temperature += .15; l.grade.contrast *= 1.03; },
  serene: l => { l.grade.exposure += .08; l.grade.saturation *= .85; l.grade.contrast *= .9; if (l.motion.camera === "handheld") { l.motion.camera = "float"; l.motion.shake *= .5; } },
  nostalgic: l => { l.grade.blacks += .05; l.grade.saturation *= .8; l.grade.temperature += .2; l.texture.halation += .15; l.texture.grain += .15; l.texture.weave += .8; },
  clinical: l => { l.grade.temperature -= .1; l.grade.saturation *= .8; l.grade.contrast *= 1.05; l.texture.grain = 0; l.texture.halation = 0; l.texture.leaks = 0; l.motion.camera = "locked"; l.motion.shake = 0; },
  urgent: l => { l.grade.saturation *= 1.1; l.grade.contrast *= 1.1; if (l.motion.camera !== "locked") { l.motion.camera = "handheld"; l.motion.shake = Math.max(l.motion.shake, .4); } l.motion.pushAtTurn = Math.max(l.motion.pushAtTurn, .04); },
};

/** A look's numbers: preset, then each mood in order, then overrides, then limits. */
export function resolveLook(spec: FilmLookSpec = {}): ResolvedLook {
  const id = spec.preset ?? "studio-clean", base = LOOK_PRESETS[id] ?? LOOK_PRESETS["studio-clean"];
  const look: ResolvedLook = { id, grade: { ...base.grade }, texture: { ...base.texture }, motion: { ...base.motion }, lens: { ...base.lens }, studio: base.studio, type: { ...base.type }, sound: { ...base.sound } };
  for (const mood of spec.mood ?? []) LOOK_MOOD_EFFECTS[mood]?.(look);
  const o = spec.overrides ?? {};
  Object.assign(look.grade, o.grade); Object.assign(look.texture, o.texture); Object.assign(look.motion, o.motion); Object.assign(look.lens, o.lens);
  Object.assign(look.type, o.type); Object.assign(look.sound, o.sound); if (o.studio) look.studio = o.studio;
  const g = look.grade, t = look.texture;
  g.exposure = clamp(g.exposure, -2, 2); g.contrast = clamp(g.contrast, .4, 2); g.saturation = clamp(g.saturation, 0, 2); g.temperature = clamp(g.temperature, -1, 1); g.tint = clamp(g.tint, -1, 1);
  g.blacks = clamp(g.blacks, 0, .3); g.whites = clamp(g.whites, .6, 1);
  for (const key of ["grain", "halation", "bloom", "streaks", "flicker", "vignette", "leaks", "scanlines", "tracking", "blinds", "outline"] as const) t[key] = clamp(t[key], 0, 1);
  t.flicker = Math.min(t.flicker, .12); look.motion.shake = clamp(look.motion.shake, 0, 1); look.motion.hold = Math.round(clamp(look.motion.hold, 1, 6)); look.lens.fovScale = clamp(look.lens.fovScale, .5, 1.6);
  return look;
}
/** A scene's look over the film's: the scene's preset wins, moods add, overrides merge section by section. */
export function mergeLookSpecs(film: FilmLookSpec | undefined, scene: FilmLookSpec | undefined): FilmLookSpec | undefined {
  if (!film && !scene) return undefined;
  const a = film?.overrides ?? {}, b = scene?.overrides ?? {};
  return { preset: scene?.preset ?? film?.preset, mood: [...film?.mood ?? [], ...scene?.mood ?? []],
    overrides: { grade: { ...a.grade, ...b.grade }, texture: { ...a.texture, ...b.texture }, motion: { ...a.motion, ...b.motion }, lens: { ...a.lens, ...b.lens },
      type: { ...a.type, ...b.type }, sound: { ...a.sound, ...b.sound }, studio: b.studio ?? a.studio } };
}

export interface LookProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
/** Names known, moods that fit the preset, mattes that hide titles, and stuttering cadence over interfaces. */
export function inspectLookSpec(spec: FilmLookSpec, context: { showsInterface?: boolean; showsPhotograph?: boolean } = {}): LookProblem[] {
  const problems: LookProblem[] = [];
  if (spec.preset && !LOOK_PRESETS[spec.preset]) problems.push({ severity: "error", code: "look-unknown", path: "/preset", message: `"${spec.preset}" is not a look.`, hint: `Looks: ${LOOK_PRESET_IDS.join(", ")}.` });
  (spec.mood ?? []).forEach((mood, i) => { if (!LOOK_MOODS.includes(mood)) problems.push({ severity: "error", code: "look-mood-unknown", path: `/mood/${i}`, message: `"${mood}" is not a mood.`, hint: `Moods: ${LOOK_MOODS.join(", ")}.` }); });
  const p = LOOK_PRESETS[spec.preset ?? "studio-clean"];
  if (p) for (const mood of spec.mood ?? []) if ((p.avoids as readonly string[]).includes(mood))
    problems.push({ severity: "warning", code: "look-mood-conflict", path: "/mood", message: `"${mood}" works against ${p.title}.`, hint: `${p.title} suits: ${p.suits.join(", ")}. Keep it if the contrast is the point.` });
  const look = resolveLook(spec);
  if (look.texture.matte !== "none") problems.push({ severity: "warning", code: "look-matte-text", path: "/overrides/texture/matte", message: `A ${look.texture.matte} matte covers the frame edges where titles and labels sit.`, hint: "Keep every title inside the matte, or drop it." });
  if (look.texture.boil > 0 && context.showsPhotograph) problems.push({ severity: "warning", code: "look-boil-on-photo", path: "/overrides/texture/boil", message: "Line boil makes a photograph or footage swim.", hint: "Boil drawn scenes: cards, draw-on, title sequences, object stories." });
  if (look.texture.boil < 0 || look.texture.boil > 1) problems.push({ severity: "error", code: "look-boil", path: "/overrides/texture/boil", message: "Boil runs from 0 to 1." });
  if (context.showsInterface && look.motion.cadence !== "smooth") problems.push({ severity: "warning", code: "look-cadence-on-ui", path: "/overrides/motion/cadence", message: "A held-frame cadence on an interface reads as broken playback.", hint: 'Set "cadence": "smooth" for this scene.' });
  return problems;
}

/** The same look without motion, for reduced motion: no shake, push, weave, flicker or held frames. The grade and grain stay. */
export function stillLook(look: ResolvedLook): ResolvedLook {
  return { ...look, motion: { ...look.motion, cadence: "smooth", camera: look.motion.camera === "drift" ? "drift" : "locked", shake: 0, pushAtTurn: 0 }, texture: { ...look.texture, weave: 0, flicker: 0, tracking: 0, boil: 0 } };
}

/** A look as a point in a feature space where a step of 1 is about one clearly visible change (a black-and-white print, a heavy
 * grain, a strong warm cast). Two presets nearer than `LOOK_MIN_DISTANCE` are too alike to offer as different looks. */
export function lookFeatures(look: ResolvedLook): number[] {
  const g = look.grade, t = look.texture, tint = (c: Rgb) => c.map(v => v * 5);
  return [g.exposure, (g.contrast - 1) * 1.5, (g.saturation - 1) * 1.2, g.temperature * .8, g.tint * .8, g.blacks * 3, (1 - g.whites) * 3, ...tint(g.shadowTint), ...tint(g.highlightTint),
    t.grain, t.halation * .8, t.weave / 5, t.scanlines, t.chroma / 4, t.outline, g.posterize ? 1 : 0, t.blinds, t.leaks * .6, look.motion.cadence === "smooth" ? 0 : .5];
}
export const LOOK_MIN_DISTANCE = .5;
/** The closest pairs of presets in the feature space, nearest first. */
export function lookDistances(): Array<{ a: LookPresetId; b: LookPresetId; distance: number }> {
  const points = LOOK_PRESET_IDS.map(id => ({ id, f: lookFeatures(resolveLook({ preset: id })) })), out: Array<{ a: LookPresetId; b: LookPresetId; distance: number }> = [];
  points.forEach((p, i) => points.slice(i + 1).forEach(q => out.push({ a: p.id, b: q.id, distance: Math.hypot(...p.f.map((v, k) => v - q.f[k])) })));
  return out.sort((x, y) => x.distance - y.distance);
}

// ------------------------------------------------------------------ per frame

/** A smooth value in about -1..1 from a seed and a time in seconds: three slow sines at unrelated rates. */
function wander(seed: number, seconds: number, rate: number) {
  const r = (k: number) => Math.abs(Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1;
  return (Math.sin(seconds * rate * (1 + r(1)) * 2 * Math.PI + r(2) * 6.28) * .5 + Math.sin(seconds * rate * (2.3 + r(3)) * 2 * Math.PI + r(4) * 6.28) * .3
    + Math.sin(seconds * rate * (4.7 + r(5)) * 2 * Math.PI + r(6) * 6.28) * .2);
}
/** A value in 0..1 for one frame, the same for the same seed and frame. */
export const frameHash = (seed: number, frame: number) => Math.abs(Math.sin(seed * 91.7 + frame * 12.9898) * 43758.5453) % 1;

/** The frame a scene shows under the look's cadence: held for two frames on twos, for `hold` frames when step printed. */
export function cadenceFrame(look: ResolvedLook, frame: number): number {
  const n = look.motion.cadence === "twos" ? 2 : look.motion.cadence === "step" ? look.motion.hold : 1;
  return n > 1 ? frame - (((frame % n) + n) % n) : frame;
}
export interface LookFrame {
  /** The picture's movement, as shares of the frame size and degrees. */
  camera: { x: number; y: number; rotate: number; scale: number };
  /** Gate weave in pixels at 1080p. */
  weave: { x: number; y: number };
  /** Exposure gain from flicker. */
  gain: number;
  /** Grain tile and offset, so grain changes every frame. */
  grain: { tile: number; x: number; y: number };
  /** Light-leak phase, 0..1, and a rolling tracking band (top and height as shares of the frame, or none). */
  leak: number;
  band?: { top: number; height: number };
}
/** Everything that changes frame to frame, from the frame alone, so any frame renders the same in any order. `turnFrame` is the
 * scene's story turn, where the look may push in. */
export function lookFrame(look: ResolvedLook, frame: number, fps: number, seed: number, turnFrame?: number): LookFrame {
  const s = frame / (fps > 0 ? fps : 30), m = look.motion, held = cadenceFrame(look, frame) / (fps > 0 ? fps : 30);
  let x = 0, y = 0, rotate = 0;
  if (m.camera === "handheld") { x = wander(seed, held, .9) * .006 * m.shake; y = wander(seed + 1, held, 1.1) * .005 * m.shake; rotate = wander(seed + 2, held, .7) * .35 * m.shake; }
  else if (m.camera === "float") { x = wander(seed, held, .18) * .01 * m.shake; y = wander(seed + 1, held, .14) * .007 * m.shake; rotate = wander(seed + 2, held, .12) * .15 * m.shake; }
  const push = turnFrame === undefined || frame < turnFrame ? 0 : m.pushAtTurn * (1 - (1 - Math.min(1, (frame - turnFrame) / ((fps > 0 ? fps : 30) * 1.6))) ** 3);
  const moving = m.camera === "handheld" || m.camera === "float";
  const t = look.texture, w = t.weave;
  const weave = { x: w ? (frameHash(seed + 3, frame) - .5) * w * .6 + wander(seed + 4, s, .3) * w * .4 : 0, y: w ? (frameHash(seed + 5, frame) - .5) * w : 0 };
  const gain = 1 + (t.flicker ? (frameHash(seed + 6, frame) - .5) * 2 * t.flicker : 0);
  const rolling = t.tracking > 0 && Math.floor(s / 3.2) % 2 === 1 && (s % 3.2) < .45;
  return { camera: { x, y, rotate, scale: 1 + push + (moving ? .02 + .02 * m.shake : 0) + (w ? .006 : 0) }, weave, gain,
    grain: { tile: frame % 6, x: Math.floor(frameHash(seed + 7, frame) * 512), y: Math.floor(frameHash(seed + 8, frame) * 512) },
    leak: (s * .07 + frameHash(seed + 9, 1)) % 1, band: rolling ? { top: ((s % 3.2) / .45) * 1.1 - .1, height: .06 + .04 * t.tracking } : undefined };
}

// ------------------------------------------------------------------ the grade as filter values

const luma: Rgb = [.2126, .7152, .0722];
/** The grade's colour matrix (4 by 5, row-major, for `feColorMatrix`): exposure and flicker, white balance, the channel mixer and
 * saturation about luminance. */
export function gradeMatrix(g: LookGrade, gain = 1): number[] {
  const e = 2 ** (g.exposure * .5) * gain;
  const wb: Rgb = [1 + .09 * g.temperature, 1 - .015 * Math.abs(g.temperature) - .07 * g.tint, 1 - .11 * g.temperature];
  const mix = g.mixer ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const s = g.saturation, sat = (r: number, c: number) => (r === c ? s : 0) + (1 - s) * luma[c];
  const out: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let v = 0;
      for (let k = 0; k < 3; k++) v += sat(r, k) * mix[k][c];
      out.push(v * wb[c] * e);
    }
    out.push(0, 0);
  }
  out.push(0, 0, 0, 1, 0);
  return out;
}
/** One channel's tone curve as `feFuncX` table values: contrast as a normalised S-curve, then the toe and shoulder, then the split
 * tone for that channel. */
export function gradeCurve(g: LookGrade, channel: 0 | 1 | 2, samples = 33): number[] {
  const k = g.contrast > 1 ? (g.contrast - 1) * 9 : 0;
  const sig = (x: number) => 1 / (1 + Math.exp(-k * (x - .5)));
  return Array.from({ length: samples }, (_, i) => {
    const x = i / (samples - 1);
    let y = k > .001 ? (sig(x) - sig(0)) / (sig(1) - sig(0)) : .5 + (x - .5) * g.contrast;
    y = g.blacks + (g.whites - g.blacks) * clamp(y, 0, 1);
    y += g.shadowTint[channel] * (1 - x) ** 2 + g.highlightTint[channel] * x ** 2;
    return Math.round(clamp(y, 0, 1) * 10000) / 10000;
  });
}
