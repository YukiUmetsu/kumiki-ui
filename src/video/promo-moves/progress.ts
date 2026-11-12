/** Every move from doc 34 (docs/34-promo-motion-and-sound-gaps.md) and how far along it is. The Progress story draws this table; update
 * an item's `status` and `story` in the same change that builds it. */

export type MoveStatus = "built" | "in-progress" | "planned";
export type MoveGroup = "Transitions" | "Animation and type" | "Sound";
export interface PromoMove {
  /** The item's code in doc 34. */
  id: string;
  name: string;
  group: MoveGroup;
  rank: "P0" | "P1" | "P2" | "P3";
  /** What it does, in one line. */
  what: string;
  status: MoveStatus;
  /** The Storybook story ID that shows it, once built. */
  story?: string;
  /** How it is used in a film file, once built. */
  usage?: string;
}

export const PROMO_MOVES: readonly PromoMove[] = [
  { id: "T1", name: "Dip to black, white or colour", group: "Transitions", rank: "P0", status: "built", story: "video-production-promo-moves--dip",
    what: "The picture goes down to a colour, holds (with an optional line), and comes up on the next scene. Films can fade in from black and out to it.",
    usage: '"transition": { "kind": "dip", "text": "Two hours west" } · "fade": { "in": 18, "out": 24 }' },
  { id: "T2", name: "Flash cut and flash burst", group: "Transitions", rank: "P1", status: "built", story: "video-production-promo-moves--flash-cut",
    what: "One to three white frames on a cut, or 2 to 8 inserts of 2 to 6 frames each, capped at three flashes a second.",
    usage: '"transition": { "kind": "flash" } · { "kind": "burst", "inserts": [{ "scene": "cave", "at": 60 }, …] }' },
  { id: "T3", name: "Shape wipe and iris", group: "Transitions", rank: "P1", status: "built", story: "video-production-promo-moves--shape-wipe",
    what: "The next scene opens through a growing circle, diamond, star, square or the brand mark, from a point that matters.",
    usage: '"transition": { "kind": "shape", "shape": "circle", "subject": "glow", "color": "#ffffff" }' },
  { id: "T9", name: "Split screen and panels", group: "Transitions", rank: "P1", status: "built", story: "video-production-promo-moves--panels",
    what: "Two to four scenes play at once in panels that open from the centre, each compiled at its panel's size; align lines their moments up in time.",
    usage: '{ "recipeId": "panels", "content": { "layout": "columns", "panels": [...], "align": { "frame": 80, "moments": ["item-3", "landed"] } } }' },
  { id: "T4", name: "Organic matte", group: "Transitions", rank: "P2", status: "built", story: "video-production-promo-moves--organic-matte",
    what: "The next scene spreads in like ink, a brush stroke or smoke, from seeded noise, with an optional stain on the edge.", usage: '"transition": { "kind": "matte", "texture": "ink", "subject": "glow", "color": "#08131f" }' },
  { id: "T6", name: "Stutter", group: "Transitions", rank: "P2", status: "built", story: "video-production-promo-moves--stutter",
    what: "A few frames repeat two to four times on a beat, then the scene carries on. Picture now; repeating its sounds comes with the sound work.", usage: '"stutter": { "at": 66, "frames": 6, "repeats": 3 }' },
  { id: "T7", name: "Polarity flip", group: "Transitions", rank: "P2", status: "built", story: "video-production-promo-moves--polarity-flip",
    what: "The same card cuts between light-on-dark and dark-on-light.", usage: '"content": { "card": "headline", …, "flips": [54, 62, 70, 78] }' },
  { id: "T5", name: "Dither dissolve", group: "Transitions", rank: "P3", status: "built", story: "video-production-promo-moves--organic-matte",
    what: "The picture changes through an ordered pattern of hard pixels.", usage: '"transition": { "kind": "dither", "cell": 0.008 }' },
  { id: "T8", name: "Lens gateway", group: "Transitions", rank: "P3", status: "built", story: "video-production-promo-moves--glass-lens",
    what: "A round glass lens enters and grows over the old scene, with the next scene behind its glass.", usage: '"transition": { "kind": "lens", "direction": "left" }' },
  { id: "A1", name: "Rapid word flash", group: "Animation and type", rank: "P1", status: "built", story: "video-production-promo-moves--rapid-word-flash",
    what: "One word at a time, alone in the frame, about six frames each, with held words for stress.", usage: '{ "card": "words", "text": "Your budget leaks…", "hold": ["leaks"] }' },
  { id: "A2", name: "Type wall", group: "Animation and type", rank: "P1", status: "built", story: "video-production-promo-moves--type-wall",
    what: "One word repeated in rows that fill the frame and slide past its edges.", usage: '{ "card": "wall", "word": "never", "rows": 7 }' },
  { id: "A3", name: "Type that acts out its word", group: "Animation and type", rank: "P2", status: "built", story: "video-production-promo-moves--type-reveals",
    what: "Letters of one line fly to their places in the next; letters it lacks shrink away and new ones grow in. (A word becoming an object's outline is not built.)", usage: '{ "card": "headline", "text": "re-engineered", "from": "the design has been", "reveal": "rebuild" }' },
  { id: "A4", name: "Variable font breathing", group: "Animation and type", rank: "P2", status: "built", story: "video-production-promo-moves--type-reveals",
    what: "Each word arrives thin and swells to heavy on a variable font's weight axis, without reflowing the line.", usage: '{ "card": "headline", "text": "…", "reveal": "weight" }' },
  { id: "A5", name: "Text scramble", group: "Animation and type", rank: "P2", status: "built", story: "video-production-promo-moves--type-reveals",
    what: "Letters cycle through random characters, then lock in from left to right.", usage: '{ "card": "headline", "text": "…", "reveal": "scramble" }' },
  { id: "A6", name: "Smears and squash", group: "Animation and type", rank: "P2", status: "built", story: "video-production-promo-moves--smears-and-squash",
    what: "Objects stretch when fast, trail fading copies on the fastest frames and squash when they land.", usage: '{ "recipeId": "object-story", "content": { "smear": true, … } }' },
  { id: "A9", name: "Several cursors", group: "Animation and type", rank: "P2", status: "built", story: "video-production-promo-moves--screen-demo-moves",
    what: "Named, coloured cursors work in a screen demo at the same time.", usage: '"guests": [{ "id": "ana", "label": "Ana", "color": "#e5484d", "steps": [{ "do": "click", "target": "check-plan", "at": 30 }] }]' },
  { id: "A10", name: "Prompt, working, result", group: "Animation and type", rank: "P2", status: "built", story: "video-production-promo-moves--screen-demo-moves",
    what: "A screen-demo step that shows a short working state over its target, then resolves the result from blurred to sharp.", usage: '{ "do": "generate", "target": "result", "set": { "palette": "glacier" } }' },
  { id: "A7", name: "Line boil", group: "Animation and type", rank: "P3", status: "built", story: "video-production-promo-moves--line-boil",
    what: "Drawn lines wobble a little on every held drawing, like redrawn animation.", usage: '"look": { "overrides": { "texture": { "boil": 0.6 } } }' },
  { id: "A8", name: "Glass lens", group: "Animation and type", rank: "P3", status: "built", story: "video-production-promo-moves--glass-lens",
    what: "A clear glass circle or pill glides over a scene, magnifying what is behind it and bending its edge harder.", usage: '"lens": { "shape": "pill", "path": [{ "at": 24, "x": 0.12, "y": 0.5 }, …] }' },
  { id: "A11", name: "Sound-driven motion", group: "Animation and type", rank: "P3", status: "built", story: "video-production-promo-moves--sound-drive",
    what: "A bed's measured loudness drives a scene's scale or a soft glow, frame by frame: a bump on every beat.", usage: '"drive": { "bed": "pulse", "property": "scale" }' },
  { id: "A12", name: "Focus pull", group: "Animation and type", rank: "P3", status: "built", story: "video-production-promo-moves--focus-pull",
    what: "On a photo card, focus racks between the photograph and the words.", usage: '"focus": [{ "at": 0, "on": "words" }, { "at": 80, "on": "photo" }]' },
  { id: "S1", name: "Air gap", group: "Sound", rank: "P0", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "Everything but narration falls to near-silence (−40 dB) for 0.15 to 1.1 s before a moment, then the hit lands.", usage: '"gaps": [{ "id": "breath", "before": "title/start", "frames": 15 }]' },
  { id: "S2", name: "Drop-out", group: "Sound", rank: "P0", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "A bed or scene sound stops dead at its end, in 15 ms, with no fade.", usage: '"beds": [{ …, "drop": true }]' },
  { id: "S3", name: "Swell and level arc", group: "Sound", rank: "P0", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "Bed gain points at moments, eased between, with a low-pass that opens as the bed swells.", usage: '"gain": [{ "at": 0, "db": -10, "open": 0.1 }, { "at": "reveal/start", "db": 2, "open": 1 }]' },
  { id: "S10", name: "Quieter default accents", group: "Sound", rank: "P0", status: "built",
    what: "Whooshes only on moves that travel (\"on\": \"moves\"); a warning when 70% of cuts get one. Existing films keep their sound.", usage: '"accents": { "kit": "…", "on": "moves" }' },
  { id: "S4", name: "Braam and layered hit", group: "Sound", rank: "P1", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "A low brass-like blast on a turn, and hits built from a click, a body and a sub drop on one moment.", usage: '"turnAccent": "braam" · cues "catalog:hit-transient" + "hit" + "catalog:sub-drop"' },
  { id: "S5", name: "Reverse swell into a cut", group: "Sound", rank: "P1", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "A reversed swell grows into the cut and stops on its frame.", usage: '"transition": { "kind": "cut", "accent": "suck" }' },
  { id: "S7", name: "Pulse bed and endless rise", group: "Sound", rank: "P1", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "A dark drone and a 90 bpm pulse as seamless beds, and a Shepard rise as a catalog cue.", usage: '"sound": "bed-drone-low" · "cues": [{ "sound": "catalog:rise-shepard", … }]' },
  { id: "S9", name: "Bed dips under hits", group: "Sound", rank: "P1", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "Beds and music dip a few decibels under each hit and accent, for a fraction of a second.", usage: '"master": { …, "hitDuckDb": 5 }' },
  { id: "S6", name: "Tape stop and rewind", group: "Sound", rank: "P2", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "The film's sound slows and drops in pitch into a speed-ramp hold and spins back up; a scene can run back to its start, picture and sound.", usage: '"holds": [{ …, "sound": "tape-stop" }] · "rewind": { "frames": 24 }' },
  { id: "S8", name: "Sonic logo", group: "Sound", rank: "P2", status: "built", story: "video-production-promo-moves--sound-moves",
    what: "On request, a few bell notes picked by the brand's seed and a struck touch of glass, wood or plastic play as the end card's mark lands, resolving home.", usage: '"brand": { …, "sonic": { "seed": 7, "material": "glass", "notes": 3 } }' },
];

/** What the component catalog needs to find each move: the pack that holds it, the jobs it does, the words people search with, and when not
 * to use it. `catalogPromoMoves` (src/catalog/catalog-effects.ts) joins it to the table above, so search and the Progress story agree. */
export interface PromoMoveSearch { registryItem: string; jobs: readonly string[]; keywords: readonly string[]; avoid: string }
export const PROMO_MOVE_SEARCH: Readonly<Record<string, PromoMoveSearch>> = {
  T1: { registryItem: "film-document", jobs: ["change place or time", "open or close a film"], keywords: ["dip to black", "dip to white", "fade to black", "fade in", "fade out", "colour dip", "transition", "time jump"], avoid: "Under about 4 frames a fade reads as a flash; do not cover the next scene's title with the dip." },
  T2: { registryItem: "film-document", jobs: ["punch a cut", "show many pictures fast"], keywords: ["flash cut", "white flash", "flash frame", "burst", "strobe", "montage", "photo flash", "transition"], avoid: "More than three flashes a second is refused for photosensitive viewers." },
  T3: { registryItem: "film-document", jobs: ["reveal from a point", "brand a transition"], keywords: ["shape wipe", "iris", "iris wipe", "circle wipe", "star wipe", "logo wipe", "mask transition", "transition"], avoid: "Open from a point that matters, not the middle by habit." },
  T9: { registryItem: "film-document", jobs: ["compare side by side", "show things happening at once"], keywords: ["split screen", "panels", "multi screen", "grid", "side by side", "before and after", "simultaneous"], avoid: "More than four panels and nothing can be read." },
  T4: { registryItem: "film-document", jobs: ["soft organic transition", "handmade feel"], keywords: ["ink transition", "brush stroke", "smoke transition", "organic matte", "luma matte", "paint reveal", "transition"], avoid: "Keep the stain colour quiet; a loud edge pulls the eye from the incoming scene." },
  T6: { registryItem: "film-document", jobs: ["stress a moment on the beat"], keywords: ["stutter", "repeat frames", "glitch repeat", "loop frames", "beat repeat", "echo cut"], avoid: "Two to four repeats; more feels broken." },
  T7: { registryItem: "film-cards", jobs: ["energy on a type card"], keywords: ["polarity flip", "invert", "light dark flip", "colour flip", "negative", "type card"], avoid: "Flips count as flashes: at most three a second." },
  T5: { registryItem: "film-document", jobs: ["retro or digital transition"], keywords: ["dither", "pixel dissolve", "bayer", "retro transition", "8-bit", "digital dissolve", "transition"], avoid: "It reads as digital; it fights a soft, natural look." },
  T8: { registryItem: "film-document", jobs: ["move into a new world"], keywords: ["lens transition", "lens gateway", "glass transition", "portal", "magnify into", "liquid glass", "transition"], avoid: "Not over WebGL scenes: it copies the scene it covers." },
  A1: { registryItem: "film-cards", jobs: ["hook in the first seconds", "say a line with force"], keywords: ["rapid word flash", "word by word", "kinetic typography", "fast words", "one word at a time", "rsvp", "text animation"], avoid: "Hold the words that matter; flash only filler words fast." },
  A2: { registryItem: "film-cards", jobs: ["make one word fill the frame"], keywords: ["type wall", "repeated word", "word pattern", "scrolling text rows", "marquee", "kinetic typography", "text animation"], avoid: "One short word; a phrase turns into texture nobody reads." },
  A3: { registryItem: "film-cards", jobs: ["turn one idea into another"], keywords: ["text morph", "word morph", "letters rearrange", "rebuild word", "anagram", "kinetic typography", "text animation"], avoid: "The two lines should share letters, or nothing visibly travels." },
  A4: { registryItem: "film-cards", jobs: ["give a line weight as it lands"], keywords: ["variable font", "font weight animation", "weight swell", "breathing type", "bold in", "text animation"], avoid: "Needs a variable font with a weight axis." },
  A5: { registryItem: "film-cards", jobs: ["show computing or decoding"], keywords: ["text scramble", "decode", "random letters", "hacker text", "glitch text", "typewriter", "text animation"], avoid: "Not for CJK lines: they fall back to a slam." },
  A6: { registryItem: "object-story", jobs: ["make fast motion feel physical"], keywords: ["smear", "squash and stretch", "motion smear", "cartoon physics", "bounce", "ghost frames", "landing"], avoid: "Too much breaks the flow; amounts are bounded." },
  A9: { registryItem: "screen-demo", jobs: ["show collaboration in a product"], keywords: ["multiple cursors", "multiplayer", "collaboration", "guest cursor", "named cursor", "live editing", "product demo"], avoid: "Two or three guests; more and the viewer cannot follow anyone." },
  A10: { registryItem: "screen-demo", jobs: ["show an AI or generate step"], keywords: ["prompt", "generating", "ai result", "loading to result", "blur to sharp", "working state", "product demo"], avoid: "Keep the working state short and truthful." },
  A7: { registryItem: "film-look", jobs: ["hand-drawn feel"], keywords: ["line boil", "wiggle lines", "hand drawn", "redrawn animation", "jitter outline", "sketch look"], avoid: "Subtle only; strong boil makes text hard to read." },
  A8: { registryItem: "film-document", jobs: ["point at a detail"], keywords: ["glass lens", "magnifier", "magnifying glass", "liquid glass", "refraction", "zoom lens", "spotlight detail"], avoid: "Not over WebGL scenes; keep magnify at or below 1.6." },
  A11: { registryItem: "film-document", jobs: ["cut the picture to the sound"], keywords: ["audio reactive", "sound reactive", "beat bump", "pulse on beat", "music visualizer", "loudness", "glow on beat"], avoid: "Water and wind beds are too busy; use a pulse bed." },
  A12: { registryItem: "film-cards", jobs: ["move attention between picture and words"], keywords: ["focus pull", "rack focus", "depth of field", "blur focus", "photo card", "defocus"], avoid: "One or two pulls a card." },
  S1: { registryItem: "film-document", jobs: ["make a hit land harder"], keywords: ["air gap", "silence before hit", "pause", "breath", "drop to silence", "sound design", "audio"], avoid: "Under 0.15 s it clicks, over 1.1 s the film seems stopped; one per act." },
  S2: { registryItem: "film-document", jobs: ["end a sound with impact"], keywords: ["drop out", "hard stop", "sound cut", "stop dead", "sound design", "audio"], avoid: "Use it on a cut, or it sounds like an error." },
  S3: { registryItem: "film-document", jobs: ["build tension", "shape a film's energy"], keywords: ["swell", "level arc", "automation", "volume ramp", "low pass sweep", "build", "sound design", "audio"], avoid: "Let the arc open on the turn, not everywhere." },
  S10: { registryItem: "film-document", jobs: ["keep transitions from sounding like a template"], keywords: ["whoosh", "transition sound", "accents", "sound on cuts", "sound design", "audio"], avoid: "A whoosh on every cut sounds like a template." },
  S4: { registryItem: "film-document", jobs: ["mark a reveal", "trailer moment"], keywords: ["braam", "trailer hit", "impact", "layered hit", "sub drop", "boom", "sound design", "audio"], avoid: "One braam a film; layered hits on real moments only." },
  S5: { registryItem: "film-document", jobs: ["pull into a cut"], keywords: ["reverse swell", "reverse cymbal", "suck", "riser into cut", "reverse whoosh", "sound design", "audio"], avoid: "One or two a film." },
  S7: { registryItem: "film-document", jobs: ["music-like bed without a licensed track"], keywords: ["drone", "pulse", "tempo bed", "90 bpm", "shepard tone", "endless rise", "riser", "tension bed", "sound design", "audio"], avoid: "A Shepard rise needs a payoff when it stops." },
  S9: { registryItem: "film-document", jobs: ["let hits punch through"], keywords: ["ducking", "sidechain", "duck under hits", "bed dip", "mix", "sound design", "audio"], avoid: "Small amounts; heavy ducking pumps." },
  S6: { registryItem: "film-document", jobs: ["freeze or go back in time"], keywords: ["tape stop", "rewind", "slow down sound", "pitch down", "reverse playback", "time warp", "sound design", "audio"], avoid: "A rewind should mean going back; say why in the next scene." },
  S8: { registryItem: "film-document", jobs: ["brand recognition at the end"], keywords: ["sonic logo", "audio logo", "sound logo", "jingle", "mnemonic", "end card sound", "brand sound", "sound design", "audio"], avoid: "On request only; keep one seed per brand." },
};
