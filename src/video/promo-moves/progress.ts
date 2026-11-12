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
  { id: "A11", name: "Sound-driven motion", group: "Animation and type", rank: "P3", status: "planned", what: "A sound's loudness drives scale, glow or position frame by frame." },
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
