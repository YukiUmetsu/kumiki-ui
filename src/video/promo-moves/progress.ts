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
  { id: "T8", name: "Lens gateway", group: "Transitions", rank: "P3", status: "planned", what: "A glass or filter passes the lens and the next scene is behind it." },
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
  { id: "A8", name: "Glass lens", group: "Animation and type", rank: "P3", status: "planned", what: "A clear glass shape bends the picture behind it." },
  { id: "A11", name: "Sound-driven motion", group: "Animation and type", rank: "P3", status: "planned", what: "A sound's loudness drives scale, glow or position frame by frame." },
  { id: "A12", name: "Focus pull", group: "Animation and type", rank: "P3", status: "built", story: "video-production-promo-moves--focus-pull",
    what: "On a photo card, focus racks between the photograph and the words.", usage: '"focus": [{ "at": 0, "on": "words" }, { "at": 80, "on": "photo" }]' },
  { id: "S1", name: "Air gap", group: "Sound", rank: "P0", status: "planned", what: "All sound stops for 0.15 to 1.1 s before a big hit." },
  { id: "S2", name: "Drop-out", group: "Sound", rank: "P0", status: "planned", what: "The bed stops dead on a frame, with no fade." },
  { id: "S3", name: "Swell and level arc", group: "Sound", rank: "P0", status: "planned", what: "Beds rise and open over seconds; the film's level follows its acts." },
  { id: "S10", name: "Quieter default accents", group: "Sound", rank: "P0", status: "planned", what: "Whooshes only on moves that travel, not on every cut." },
  { id: "S4", name: "Braam and layered hit", group: "Sound", rank: "P1", status: "planned", what: "A low brass-like blast, and hits built from a click, a body and a sub drop." },
  { id: "S5", name: "Reverse swell into a cut", group: "Sound", rank: "P1", status: "planned", what: "A reversed tail grows into the cut and stops on its frame." },
  { id: "S7", name: "Pulse bed and endless rise", group: "Sound", rank: "P1", status: "planned", what: "A ticking or throbbing bed with a tempo, and a Shepard rise." },
  { id: "S9", name: "Bed dips under hits", group: "Sound", rank: "P1", status: "planned", what: "The bed dips a few decibels under each hit." },
  { id: "S6", name: "Tape stop and rewind", group: "Sound", rank: "P2", status: "planned", what: "Sound slows and drops in pitch with a picture hold; a rewind runs back." },
  { id: "S8", name: "Sonic logo", group: "Sound", rank: "P2", status: "planned", what: "A short owned sound for the end card, from the brand's seed." },
];
