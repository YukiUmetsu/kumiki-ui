import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CompiledFilm, FilmDocument } from "../../registry/video/film-document";
import { compileExample, FilmCompare } from "./promo-moves/film-compare";
import { PROMO_MOVES } from "./promo-moves/progress";
import type { MoveGroup, MoveStatus } from "./promo-moves/progress";
import dipExample from "../../examples/film/dip.film.json";
import flashExample from "../../examples/film/flash.film.json";
import shapeExample from "../../examples/film/shape-wipe.film.json";
import panelsExample from "../../examples/film/panels.film.json";
import stutterExample from "../../examples/film/stutter.film.json";
import typeExample from "../../examples/film/type-moves.film.json";
import matteExample from "../../examples/film/matte.film.json";
import materialExample from "../../examples/film/material.film.json";
import materialShapesExample from "../../examples/film/material-shapes.film.json";
import materialGlassExample from "../../examples/film/material-glass.film.json";
import materialPaperExample from "../../examples/film/material-paper.film.json";
import materialLiquidExample from "../../examples/film/material-liquid.film.json";
import revealsExample from "../../examples/film/reveals.film.json";
import demoExample from "../../examples/film/demo-moves.film.json";
import { renderFilmScreen } from "../film/film-screens";
import { renderFilmObject } from "../film/film-art";
import smearExample from "../../examples/film/smear.film.json";
import textureExample from "../../examples/film/texture-moves.film.json";
import lensExample from "../../examples/film/lens.film.json";
import soundMoves from "../../assets/sound/lab/moves/moves.json";
import tapeExample from "../../examples/film/tape-rewind.film.json";
import driveExample from "../../examples/film/sound-drive.film.json";
import beatHitsExample from "../../examples/film/beat-hits.film.json";
import spinZoomExample from "../../examples/film/spin-zoom.film.json";
import chatExample from "../../examples/film/chat-story.film.json";
import subjectExample from "../../examples/film/subject.film.json";
import freezeExample from "../../examples/film/freeze-intro.film.json";
import slowmoExample from "../../examples/film/slowmo.film.json";
import trailExample from "../../examples/film/motion-trail.film.json";
import glitchExample from "../../examples/film/glitch.film.json";
import teacherTalk from "../../examples/film/assets/footage/teacher-talk.mp4?url";
import teacherCut from "../../examples/film/assets/footage/teacher-talk-jumpcut.mp4?url";
import teacherCutReport from "../../examples/film/assets/footage/teacher-talk-jumpcut.json";

const STATUS: Record<MoveStatus, { label: string; color: string }> = {
  built: { label: "Built", color: "#5bd6a0" }, "in-progress": { label: "In progress", color: "#ffc857" }, planned: { label: "Planned", color: "#6b7686" },
};
const GROUPS: readonly MoveGroup[] = ["Transitions", "Animation and type", "Sound"];

/** Every move from doc 34, what it does and how far along it is. A built move links to its story. Built in this order: transitions and
 * animation first, then sound. */
export const Progress: StoryObj = {
  render: function Progress() {
    const built = PROMO_MOVES.filter(item => item.status === "built").length;
    return <div style={{ padding: 24, background: "#0b0d10", color: "#e8ecf2", font: "14px/1.5 system-ui", minHeight: "100vh" }}>
      <h1 style={{ margin: "0 0 4px", font: "650 24px/1.2 system-ui" }}>Promo moves</h1>
      <p style={{ margin: "0 0 6px", color: "#9aa4b2", maxWidth: 820 }}>
        Transitions, animations and sounds that award, trailer and showcase films use and Kumiki lacked, from <code>docs/34-promo-motion-and-sound-gaps.md</code>.
        Each built move has a story here that plays it beside what Kumiki did before.
      </p>
      <p style={{ margin: "0 0 20px", font: "600 14px system-ui" }}>{built} of {PROMO_MOVES.length} built</p>
      <div role="progressbar" aria-label="Moves built" aria-valuemin={0} aria-valuemax={PROMO_MOVES.length} aria-valuenow={built}
        style={{ height: 8, maxWidth: 820, borderRadius: 4, background: "#1b222c", marginBottom: 28, overflow: "hidden" }}>
        <div style={{ width: `${built / PROMO_MOVES.length * 100}%`, height: "100%", background: STATUS.built.color }} />
      </div>
      {GROUPS.map(group => <section key={group} style={{ marginBottom: 28, maxWidth: 1100 }}>
        <h2 style={{ margin: "0 0 10px", font: "650 17px system-ui" }}>{group}</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left", color: "#9aa4b2", font: "600 12px system-ui" }}>
            {["", "Move", "Rank", "What it does", "Status"].map(head => <th key={head} style={{ padding: "6px 10px", borderBottom: "1px solid #232b36" }}>{head}</th>)}
          </tr></thead>
          <tbody>{PROMO_MOVES.filter(item => item.group === group).map(item => <tr key={item.id} style={{ verticalAlign: "top" }}>
            <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a2029", font: "600 12px ui-monospace, monospace", color: "#9aa4b2" }}>{item.id}</td>
            <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a2029", fontWeight: 600, minWidth: 180 }}>
              {item.story ? <a href={`/?path=/story/${item.story}`} target="_top" style={{ color: "#7cc6ff" }}>{item.name}</a> : item.name}
            </td>
            <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a2029", color: "#9aa4b2" }}>{item.rank}</td>
            <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a2029", color: "#c9ced6" }}>
              {item.what}
              {item.usage && <div style={{ marginTop: 4, font: "12px ui-monospace, monospace", color: "#8fa3b8" }}>{item.usage}</div>}
            </td>
            <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a2029", whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: STATUS[item.status].color, marginRight: 6 }} />{STATUS[item.status].label}
            </td>
          </tr>)}</tbody>
        </table>
      </section>)}
    </div>;
  },
};

const withTransition = (doc: FilmDocument, change: (transition: NonNullable<FilmDocument["scenes"][number]["transition"]>) => FilmDocument["scenes"][number]["transition"]) =>
  ({ ...doc, scenes: doc.scenes.map(scene => scene.transition ? { ...scene, transition: change(scene.transition) } : scene) }) as FilmDocument;
const firstJoin = (film: CompiledFilm) => film.cut.transitions[0].startFrame - 24;

/** An ice cave, then a waterfall two hours away. A dip goes down to black, holds a line ("Two hours west") and comes up on the waterfall;
 * a dissolve of the same length blends a cave wall into a cliff. The film also fades in from black and out to it. */
export const Dip: StoryObj = {
  render: function Dip() {
    const variants = useMemo(() => {
      const doc = dipExample as unknown as FilmDocument, dip = compileExample(doc), frames = dip.cut.transitions[0].endFrame - dip.cut.transitions[0].startFrame;
      return {
        dip: { label: "Dip to black, with a line", film: dip },
        plain: { label: "Dip to black, no line", film: compileExample(withTransition(doc, () => ({ kind: "dip" }))) },
        white: { label: "Dip to white", film: compileExample(withTransition(doc, () => ({ kind: "dip", color: "#ffffff", holdFrames: 4 }))) },
        brand: { label: "Dip to a brand colour", film: compileExample(withTransition(doc, transition => ({ ...transition, color: "#1d3b6e" }))) },
        dissolve: { label: "Dissolve, same length (before)", film: compileExample(withTransition(doc, () => ({ kind: "dissolve", durationFrames: frames }))) },
      };
    }, []);
    return <FilmCompare variants={variants} moment={firstJoin}>
      A dip says “time or place has jumped”; a dissolve says “these two belong together”. Watch the fade: it is worked out in linear light, so
      the cave's mid-tones fall evenly instead of going muddy. Reduced motion keeps the dip, because it is not motion. Scrub to the start
      and end to see the film fade in from black and out to it.
    </FilmCompare>;
  },
};

const flashDoc = flashExample as unknown as FilmDocument;
const sceneTransition = (doc: FilmDocument, id: string, transition: FilmDocument["scenes"][number]["transition"]) =>
  ({ ...doc, scenes: doc.scenes.map(scene => scene.id === id ? { ...scene, transition } : scene) }) as FilmDocument;
const startOf = (id: string, lead = 20) => (film: CompiledFilm) => (film.scenes.find(scene => scene.id === id)?.startFrame ?? 0) - lead;

/** A cut that lands on two frames of white, and the next picture burns back through it, over-exposed for a moment, like a camera flash.
 * The second join is a softer flash: one frame of pale blue. */
export const FlashCut: StoryObj = {
  render: function FlashCut() {
    const variants = useMemo(() => ({
      flash: { label: "Flash cuts", film: compileExample(flashDoc) },
      cut: { label: "Hard cuts (before)", film: compileExample(sceneTransition(sceneTransition(flashDoc, "cave", { kind: "cut" }), "lagoon", { kind: "cut" })) },
    }), []);
    return <FilmCompare variants={variants} moment={startOf("cave", 30)}>
      Use it on a peak: a drop in the music, the turn of a montage. Under reduced motion the flash becomes a plain cut. A film may flash at most
      three times in any second; <code>film:check</code> counts flash cuts and card flips and refuses more.
    </FilmCompare>;
  },
};

/** Four inserts of three frames each, between the lagoon and the waterfall: the cave, the lagoon, a waterfall photograph, the opening card.
 * The eye cannot name each one; it reads as a flicker of memory before the next place. */
export const FlashBurst: StoryObj = {
  render: function FlashBurst() {
    const variants = useMemo(() => ({
      burst: { label: "Burst of four inserts", film: compileExample(flashDoc) },
      cut: { label: "Hard cut (before)", film: compileExample(sceneTransition(flashDoc, "dynjandi", { kind: "cut" })) },
    }), []);
    return <FilmCompare variants={variants} moment={startOf("dynjandi", 30)}>
      Turn on quarter speed to see each insert. Inserts are stills of the film's own scenes (at a moment or a frame) or licensed pictures, 2 to
      6 frames each. Reduced motion holds the first insert. A burst's pictures change in light, so <code>film:review</code> measures them on the
      rendered frames against the three-flashes-a-second limit.
    </FilmCompare>;
  },
};

/** The opening card cuts from dark ground to light and back on the beat: a polarity flip. The words and layout stay; only ink and ground swap. */
export const PolarityFlip: StoryObj = {
  render: function PolarityFlip() {
    const variants = useMemo(() => {
      const still = { ...flashDoc, scenes: flashDoc.scenes.map(scene => scene.id === "hook" ? { ...scene, content: { ...scene.content, flips: undefined } } : scene) } as FilmDocument;
      return { flips: { label: "Four flips", film: compileExample(flashDoc) }, still: { label: "No flips (before)", film: compileExample(still) } };
    }, []);
    return <FilmCompare variants={variants} moment={() => 36}>
      Flips are hard cuts on whole frames, so they count as flashes: <code>"flips": [54, 62, 70, 78]</code> is two flashes in under a second,
      inside the limit, and ends on the ground it started on. Photographs never flip; only the card's ground and ink do.
    </FilmCompare>;
  },
};

const shapeDoc = shapeExample as unknown as FilmDocument;
/** Three joins, each through a growing shape: a circle opens from the glowing wall of the cave (with a thin white edge), a diamond from
 * the centre, and the brand's water-drop mark grows into the end card. */
export const ShapeWipe: StoryObj = {
  render: function ShapeWipe() {
    const variants = useMemo(() => {
      const each = (kind: "wipe" | "dissolve") => ({ ...shapeDoc, scenes: shapeDoc.scenes.map(scene => scene.transition ? { ...scene, transition: { kind, durationFrames: scene.transition.durationFrames } } : scene) }) as FilmDocument;
      return {
        shape: { label: "Iris, diamond and mark", film: compileExample(shapeDoc) },
        wipe: { label: "Straight wipes (before)", film: compileExample(each("wipe")) },
        dissolve: { label: "Dissolves (before)", film: compileExample(each("dissolve")) },
      };
    }, []);
    return <FilmCompare variants={variants} moment={startOf("lagoon", 24)}>
      The circle grows from the subject that matters (here the daylight in the ice), slow at first, then fast into the corners, and its last frame
      covers the far corner. The mark wipe uses the film's <code>brand.mark</code>; its picture's outline cannot be measured, so the rest of the
      end card fades in around the drop over the last third. Reduced motion keeps a dissolve.
    </FilmCompare>;
  },
};

const panelsDoc = panelsExample as unknown as FilmDocument;
/** Three places in three panels at once, then a list beside a waterfall, lined up so the waterfall's words land as the list's last point
 * comes in. Compare it with the same scenes played one after another. */
export const Panels: StoryObj = {
  render: function Panels() {
    const variants = useMemo(() => {
      // Before: each panel as its own scene, one after another.
      const sequence = { ...panelsDoc, scenes: panelsDoc.scenes.flatMap(scene => {
        if (scene.recipeId !== "panels") return [scene];
        // Each panel keeps its own length, so a list still has time for its points; the sequence runs longer than the panels.
        return scene.content.panels.map((panel, i) => ({ ...panel, id: `${scene.id}-${i}`, durationFrames: Math.min(panel.durationFrames, scene.durationFrames) }));
      }) } as FilmDocument;
      return {
        panels: { label: "Panels", film: compileExample(panelsDoc) },
        vertical: { label: "Panels, vertical output", film: compileExample(panelsDoc, "vertical") },
        sequence: { label: "One after another (before)", film: compileExample(sequence) },
      };
    }, []);
    return <FilmCompare variants={variants} moment={startOf("forms", 12)}>
      Each panel is an ordinary scene compiled at its panel's size, so a card reflows for a tall, narrow box instead of being squeezed. The split
      opens from the centre line outward. In the second scene <code>align</code> lines the panels up in time: the waterfall's words land on the
      frame the list's third point starts to come in (a list item's moment is the start of its entrance; a headline's is when it has landed). In a vertical output, columns stack.
    </FilmCompare>;
  },
};

const stutterDoc = stutterExample as unknown as FilmDocument;
/** A cut-paper title sequence whose falling water stutters: six frames play four times, then the title follows. */
export const Stutter: StoryObj = {
  render: function Stutter() {
    const variants = useMemo(() => {
      const plain = { ...stutterDoc, scenes: stutterDoc.scenes.map(scene => scene.stutter ? { ...scene, stutter: undefined, durationFrames: scene.durationFrames - (scene.stutter.frames ?? 4) * (scene.stutter.repeats ?? 2) } : scene) } as FilmDocument;
      return { stutter: { label: "Stutter on the falling water", film: compileExample(stutterDoc) }, plain: { label: "No stutter (before)", film: compileExample(plain) } };
    }, []);
    return <FilmCompare variants={variants} moment={() => 50}>
      The scene runs 18 frames longer than its content and every later moment moves with it, so sounds and captions tied to moments stay in
      step. Under reduced motion the content plays once, evenly slowed to the scene's length. A stutter on a screen recording is warned about:
      it reads as broken playback.
    </FilmCompare>;
  },
};

const typeDoc = typeExample as unknown as FilmDocument;
const withContent = (doc: FilmDocument, id: string, content: object) => ({ ...doc, scenes: doc.scenes.map(scene => scene.id === id ? { ...scene, content: { ...scene.content, ...content } } : scene) }) as FilmDocument;
/** One word at a time, alone in the frame, about six frames each; "leaks" holds a second in the brand colour. Compare the same line
 * as a headline, and in Japanese. */
export const RapidWordFlash: StoryObj = {
  render: function RapidWordFlash() {
    const variants = useMemo(() => ({
      words: { label: "Word flash", film: compileExample(typeDoc) },
      japanese: { label: "Word flash, Japanese", film: compileExample(withContent(typeDoc, "flash", { text: "予算は毎週、少しずつ漏れている。", hold: ["漏れている"] })) },
      vertical: { label: "Word flash, vertical output", film: compileExample(typeDoc, "vertical") },
      headline: { label: "Headline (before)", film: compileExample({ ...typeDoc, scenes: typeDoc.scenes.map(scene => scene.id === "flash" ? { ...scene, durationFrames: 120, content: { card: "headline", text: "Your budget leaks a little every single week", emphasis: "leaks" } } : scene) } as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 0}>
      Words cut on and off with a small settle, no fade: a fade would eat the fifth of a second each word is on screen. The pace is about 300
      words a minute, at the edge of reading speed; <code>film:check</code> refuses words under four frames and warns over 330 a minute, or when
      no word is held. Japanese splits into words, with short particles joined to the word before. Reduced motion shows the whole line.
    </FilmCompare>;
  },
};

/** One word repeated in seven rows that slide past the frame's edges, alternate rows opposite ways, the middle row in the brand colour. */
export const TypeWall: StoryObj = {
  render: function TypeWall() {
    const variants = useMemo(() => ({
      wall: { label: "Type wall, light ground", film: compileExample(typeDoc) },
      dark: { label: "Type wall, dark ground, 5 rows", film: compileExample(withContent(typeDoc, "wall", { ground: "dark", rows: 5, speed: .08 })) },
      vertical: { label: "Type wall, vertical output", film: compileExample(typeDoc, "vertical") },
      headline: { label: "Centred word (before)", film: compileExample({ ...typeDoc, scenes: typeDoc.scenes.map(scene => scene.id === "wall" ? { ...scene, content: { card: "headline", text: "Never", ground: "light" } } : scene) } as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={startOf("wall", 6)}>
      A wall is a texture made of one word, not a sentence: screen readers hear the word once, and the text audit treats the rows as artwork.
      Each row carries enough copies for its whole slide, so nothing is measured and any frame renders the same. Reduced motion stands it still.
    </FilmCompare>;
  },
};

const matteDoc = matteExample as unknown as FilmDocument;
const everyTransition = (doc: FilmDocument, kind: "dissolve" | "wipe") => ({ ...doc, scenes: doc.scenes.map(scene => scene.transition ? { ...scene, transition: { kind, durationFrames: scene.transition.durationFrames } } : scene) }) as FilmDocument;
/** Ink spreads from the daylight in the cave into the lagoon, with a dark stain on its edge; a brush stroke drags the waterfall in; smoke
 * drifts into the next; the closing card dithers in, cell by cell. */
export const OrganicMatte: StoryObj = {
  render: function OrganicMatte() {
    const variants = useMemo(() => ({
      matte: { label: "Ink, brush, smoke and dither", film: compileExample(matteDoc) },
      seed: { label: "Same, ink seed 7", film: compileExample({ ...matteDoc, scenes: matteDoc.scenes.map(scene => scene.id === "lagoon" ? { ...scene, transition: { ...scene.transition, subject: undefined, seed: 7 } } : scene) } as FilmDocument) },
      dissolve: { label: "Dissolves (before)", film: compileExample(everyTransition(matteDoc, "dissolve")) },
    }), []);
    return <FilmCompare variants={variants} moment={startOf("lagoon", 16)}>
      The mattes are generated from seeded noise, not stock files: a seed gives the same matte every time, and another seed a different one.
      Ink starts from a named subject (or two seeded points) and spreads in tendrils; a brush sweeps left to right with streaked bristles;
      smoke has no origin and a soft edge. The dither repeats an 8×8 ordered pattern at the cell size, so its cells stay hard. Reduced motion
      keeps a dissolve.
    </FilmCompare>;
  },
};

/** MC1.4: the same four scenes, with transitions driven by materials. Ink bleeds out of the daylight in the cave into the
 * lagoon; the lagoon burns away to the waterfall; paint runs down over the falls; breath frosts the glass and clears on the
 * close. The other films: reeded glass passes and a pane shatters; a page peels back, tears, and folds like a letter; a drop ripples
 * water and wax drains. One film keeps shapes: a circle burns open from the daylight, a diamond bleeds open, a star burns,
 * a circle of frost clears. */
export const MaterialTransitions: StoryObj = {
  render: function MaterialTransitions() {
    const variants = useMemo(() => ({
      material: { label: "Bleed, burn, paint, frost", film: compileExample(materialExample as unknown as FilmDocument) },
      glass: { label: "Glass: refract, shatter", film: compileExample(materialGlassExample as unknown as FilmDocument) },
      paper: { label: "Paper: peel, tear, fold", film: compileExample(materialPaperExample as unknown as FilmDocument) },
      liquid: { label: "Liquid: ripple, melt", film: compileExample(materialLiquidExample as unknown as FilmDocument) },
      shapes: { label: "Shapes opened through materials", film: compileExample(materialShapesExample as unknown as FilmDocument) },
      mattes: { label: "Noise mattes (before)", film: compileExample(matteDoc) },
    }), []);
    return <FilmCompare variants={variants} moment={startOf("lagoon", 18)}>
      Each material moves by its physics. Ink soaks along the paper's fibres and slows as it spreads (√t), with pigment
      gathering at the wet edge; burning paper advances at a steady speed through uneven paper, scorching ahead, glowing,
      then crumbling to char; paint runs down in fingers of one spacing whose tips speed ahead; breath frosts the glass
      with droplets that grow, the scenes change behind the frost, and it clears. A shape keeps its outline while the
      material roughens its edge. Reeded glass bends the view through each flute by Snell's law and breaks the cut into
      strips; a struck pane cracks radially and in rings, then its shards fall at the real rate of gravity. A page curls
      back around a growing cylinder with the print showing through its back, tears along a rough path with a white
      core, or folds in half and in half again in perspective and is tossed away. A drop's rings travel at capillary–gravity wave speeds; wax drains like a film on a wall, thinning from the
      top. Reduced motion keeps a dissolve.
    </FilmCompare>;
  },
};

const revealsDoc = revealsExample as unknown as FilmDocument;
const slamAll = (doc: FilmDocument) => ({ ...doc, scenes: doc.scenes.map(scene => scene.recipeId === "card" ? { ...scene, content: { ...scene.content, reveal: undefined, from: undefined } } : scene) }) as FilmDocument;
/** Three headline reveals: letters that scramble and lock in, words that swell from thin to heavy, and a line whose letters fly apart and
 * rebuild into another word. */
export const TypeReveals: StoryObj = {
  render: function TypeReveals() {
    const variants = useMemo(() => ({
      reveals: { label: "Scramble, weight, rebuild", film: compileExample(revealsDoc) },
      vertical: { label: "Same, vertical output", film: compileExample(revealsDoc, "vertical") },
      japanese: { label: "Weight swell, Japanese", film: compileExample(withContent(revealsDoc, "weight", { text: "重さに耐える設計", emphasis: "設計" })) },
      slam: { label: "Slam, the card's own entrance (before)", film: compileExample(slamAll(revealsDoc)) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 0}>
      Each reveal lays out the finished line first and draws its moving letters over it, so the line never reflows while it arrives. Scrambled
      letters come from a hash of the frame, so any frame renders the same. The weight swell needs a variable font: the look's display font, or
      Geist Variable. The rebuild measures where the browser put each letter of both lines, so it fits any font and wrap. Reduced motion shows
      the finished line.
    </FilmCompare>;
  },
};

const demoDoc = demoExample as unknown as FilmDocument;
/** Two screen-demo moves: three named cursors ticking off tasks at the same time, then a prompt typed, a short working state, and the
 * result resolving out of a blur. */
export const ScreenDemoMoves: StoryObj = {
  render: function ScreenDemoMoves() {
    const variants = useMemo(() => {
      const before = { ...demoDoc, scenes: demoDoc.scenes.map(scene => scene.recipeId !== "screen-demo" ? scene : { ...scene, content: { ...scene.content, guests: undefined, cursor: undefined,
        steps: scene.content.steps.map(step => step.do === "generate" ? { do: "show", target: step.target, set: step.set, callout: step.callout } : step) } }) } as FilmDocument;
      return { moves: { label: "Several cursors, then generate", film: compileExample(demoDoc) }, before: { label: "One cursor, result appears at once (before)", film: compileExample(before) } };
    }, []);
    return <FilmCompare variants={variants} moment={() => 0} stage={{ renderScreen: renderFilmScreen }}>
      Guest cursors travel and click the way the main cursor does (Fitts' law timing, a minimum-jerk path), each with a name tag in its colour;
      their clicks change the screen too, and the camera follows the main cursor. A generate step shows a short working state (a light sweeps
      the target), then its result resolves from blurred to sharp. The palette is computed by the screen from the typed word: real output.
    </FilmCompare>;
  },
};

const smearDoc = smearExample as unknown as FilmDocument;
/** A coin drops out of a wallet and hops into savings: it stretches along its path when it is fast, trails fading copies on its fastest
 * frames and squashes when it lands. */
export const SmearsAndSquash: StoryObj = {
  render: function SmearsAndSquash() {
    const variants = useMemo(() => ({
      smear: { label: "Smears and squash", film: compileExample(smearDoc) },
      rigid: { label: "Rigid shapes (before)", film: compileExample(withContent(smearDoc, "save", { smear: false })) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 56} stage={{ renderObject: renderFilmObject }}>
      Turn on quarter speed. Stretch keeps the shape's area and is capped, so a fast move never turns into a streak; copies appear only above a
      speed threshold; the squash is a damped bounce from the frame the object stops. Each frame reads the object's centre on the frames around
      it, so any frame renders the same. Word objects stay as they are, and reduced motion turns it off.
    </FilmCompare>;
  },
};

const textureDoc = textureExample as unknown as FilmDocument;
/** The cut-paper title sequence with line boil: its edges wobble a little on every held drawing, as redrawn animation's do. */
export const LineBoil: StoryObj = {
  render: function LineBoil() {
    const variants = useMemo(() => {
      const strength = (boil: number) => ({ ...textureDoc, scenes: textureDoc.scenes.map(scene => scene.id === "titles" ? { ...scene, look: { preset: "cel-animation", overrides: { texture: { boil } } } } : scene) }) as FilmDocument;
      return { boil: { label: "Boil 0.6", film: compileExample(textureDoc) }, strong: { label: "Boil 1", film: compileExample(strength(1)) }, still: { label: "No boil (before)", film: compileExample(strength(0)) } };
    }, []);
    return <FilmCompare variants={variants} moment={() => 120}>
      Scrub one frame at a time: the edges shift on each held drawing (every second frame), never between them, so it reads as drawn, not as
      noise. It is a look texture: <code>"look": {"{"} "overrides": {"{"} "texture": {"{"} "boil": 0.6 {"}"} {"}"} {"}"}</code>. A photograph or footage is warned about, because
      boil makes it swim. Reduced motion turns it off.
    </FilmCompare>;
  },
};

/** A photo card whose words are in focus over a soft waterfall; then focus racks to the waterfall and the words go soft. */
export const FocusPull: StoryObj = {
  render: function FocusPull() {
    const variants = useMemo(() => ({
      focus: { label: "Focus pull", film: compileExample(textureDoc) },
      plain: { label: "All sharp (before)", film: compileExample(withContent(textureDoc, "rack", { focus: undefined })) },
    }), []);
    return <FilmCompare variants={variants} moment={startOf("rack", -60)}>
      A rack moves the viewer's eye without a cut. Soft words are not meant to be read, so the text audit skips them; reduced motion keeps the
      words in focus.
    </FilmCompare>;
  },
};

const lensDoc = lensExample as unknown as FilmDocument;
/** A clear glass pill glides across a headline, magnifying the letters under it and bending them harder at its edge; then a round lens
 * enters from the left and grows into the next scene, a waterfall, with another lens drifting over it. */
export const GlassLens: StoryObj = {
  render: function GlassLens() {
    const variants = useMemo(() => {
      const plain = { ...lensDoc, scenes: lensDoc.scenes.map(scene => ({ ...scene, lens: undefined, ...scene.transition ? { transition: { kind: "dissolve", durationFrames: scene.transition.durationFrames } } : {} })) } as FilmDocument;
      return { lens: { label: "Glass lens and lens gateway", film: compileExample(lensDoc) }, vertical: { label: "Same, vertical output", film: compileExample(lensDoc, "vertical") }, plain: { label: "No lens, dissolve (before)", film: compileExample(plain) } };
    }, []);
    return <FilmCompare variants={variants} moment={() => 20}>
      The lens is drawn from copies of the scene: one inside it, magnified about its centre, and one in a ring at its edge, magnified more,
      clipped to the lens shape, under a bright rim and a soft shadow. It materializes by bending light more and more rather than fading in,
      as Liquid Glass does. Copies are a second render of the scene, so a lens cannot sit over a WebGL scene. Reduced motion holds the lens
      still and turns the gateway into a dissolve.
    </FilmCompare>;
  },
};

const tapeDoc = tapeExample as unknown as FilmDocument;
/** The picture side of a rewind: the list card runs back to its start over its last 24 frames, slow at first, then fast. Its sound is on
 * the Sound Moves page; the tape stop there slows the sound into the title's held frame. */
export const Rewind: StoryObj = {
  render: function Rewind() {
    const variants = useMemo(() => ({
      rewind: { label: "Rewind", film: compileExample(tapeDoc) },
      plain: { label: "No rewind (before)", film: compileExample({ ...tapeDoc, scenes: tapeDoc.scenes.map(scene => scene.rewind ? { ...scene, rewind: undefined, durationFrames: scene.durationFrames - scene.rewind.frames } : scene) } as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={startOf("again", 50)}>
      A rewind is a time map like a speed ramp, so the scene's content plays to its end and runs back exactly. It should mean "let's go back": a
      warning asks the scene after it to say why (<code>"story": {"{"} "link": "but" {"}"}</code>). Reduced motion holds the last frame instead.
    </FilmCompare>;
  },
};

const soundUrls = import.meta.glob("../../assets/sound/lab/moves/*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
type SoundPair = { id: string; title: string; what: string; marks: { at: number; label: string }[]; versions: Record<"after" | "before", { file: string; levels: number[] }> };
/** The level of both versions over time, 50 ms a point, with the moments that matter marked. */
function LevelChart({ pair }: { pair: SoundPair }) {
  const W = 760, H = 150, top = -6, bottom = -66, seconds = Math.max(pair.versions.after.levels.length, pair.versions.before.levels.length) / 20;
  const x = (t: number) => t / seconds * W, y = (db: number) => (Math.min(top, Math.max(bottom, db)) - top) / (bottom - top) * H;
  const line = (levels: number[]) => levels.map((db, i) => `${i ? "L" : "M"}${x(i / 20).toFixed(1)} ${y(db).toFixed(1)}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`${pair.title}: level over time, after and before`} style={{ width: "100%", maxWidth: W, background: "#101722", borderRadius: 8 }}>
    {[-12, -24, -36, -48, -60].map(db => <g key={db}><line x1={0} x2={W} y1={y(db)} y2={y(db)} stroke="#1f2a38" /><text x={4} y={y(db) - 3} fill="#5d6b7c" fontSize={10}>{db} dB</text></g>)}
    {pair.marks.map(mark => <g key={mark.label}><line x1={x(mark.at)} x2={x(mark.at)} y1={0} y2={H} stroke="#ffc857" strokeDasharray="3 3" /><text x={x(mark.at) + 4} y={H + 13} fill="#ffc857" fontSize={11}>{mark.label}</text></g>)}
    <path d={line(pair.versions.before.levels)} fill="none" stroke="#6b7686" strokeWidth={1.4} />
    <path d={line(pair.versions.after.levels)} fill="none" stroke="#7cc6ff" strokeWidth={1.8} />
  </svg>;
}
/** The sound moves, heard through Kumiki's own mixer: each as a short mix, beside the same film without it, with both levels drawn. An agent
 * cannot hear, so these are for you to listen to; the charts show what was measured. */
const driveDoc = driveExample as unknown as FilmDocument;
/** A 90 bpm pulse moves the picture: the headline grows a little on each beat and settles, then a light rises from the photograph's middle
 * on each beat. Played with the film's own mix. */
export const SoundDrive: StoryObj = {
  render: function SoundDrive() {
    const variants = useMemo(() => ({
      drive: { label: "Driven by the pulse", film: compileExample(driveDoc) },
      still: { label: "Still (before)", film: compileExample({ ...driveDoc, scenes: driveDoc.scenes.map(scene => ({ ...scene, drive: undefined })) } as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 0} audio={soundUrls["../../assets/sound/lab/moves/sound-drive-after.m4a"]}>
      Press Play with your sound on: the picture follows the pulse it hears. The levels come from <code>npm run sound:levels</code>, measured
      ahead of time, so every frame renders the same. A loud moment rises at once and settles over about six frames. Reduced motion keeps
      the scene still.
    </FilmCompare>;
  },
};

const beatHitsDoc = beatHitsExample as unknown as FilmDocument;
/** A 110 bpm drum loop (a recorded CC0 take) and four photo cards cut on its bars, each with its own pattern of hits: a punch on every beat;
 * a punch and zoom blur on the kick with a shake on the snare; a punch and RGB split with a vertical shake; a landing with a flash every
 * bar. Played with the film's own mix. */
export const BeatHits: StoryObj = {
  render: function BeatHits() {
    const variants = useMemo(() => ({
      hits: { label: "Hits on the beat", film: compileExample(beatHitsDoc) },
      still: { label: "No hits (before)", film: compileExample({ ...beatHitsDoc, scenes: beatHitsDoc.scenes.map(scene => ({ ...scene, hits: undefined })) } as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 0} audio={soundUrls["../../assets/sound/lab/moves/beat-hits.m4a"]}>
      Press Play with your sound on: every hit lands on a beat of the loop, from the bed's declared tempo (<code>"bpm": 110</code>), so the
      picture is cut to the music frame by frame. A punch snaps the frame to about 108 % and settles in 0.2 s; a shake swings four or five
      times, each smaller; the split and the blur last a few frames. Use Quarter speed to see each swing. Reduced motion holds the picture
      still. The loop is <a href="https://freesound.org/people/blakengouda/sounds/573948/" style={{ color: "#7cc6ff" }}>Hip-Hop Drum Loop -
      110bpm</a> by blakengouda (CC0).
    </FilmCompare>;
  },
};

const spinZoomDoc = spinZoomExample as unknown as FilmDocument;
/** Three photo cards on the 110 bpm drum loop, joined by a spin (clockwise, 180°) and a zoom-blur cut, each cutting on a kick at its
 * fastest, most blurred frame; beside it, the same film with hard cuts. */
export const SpinAndZoomBlur: StoryObj = {
  render: function SpinAndZoomBlur() {
    const variants = useMemo(() => ({
      moves: { label: "Spin, then zoom blur", film: compileExample(spinZoomDoc) },
      cuts: { label: "Hard cuts (before)", film: compileExample({ ...spinZoomDoc, scenes: spinZoomDoc.scenes.map(scene => scene.transition ? { ...scene, transition: { kind: "cut" } } : scene) } as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={film => film.cut.transitions[0].startFrame - 12} audio={soundUrls["../../assets/sound/lab/moves/spin-zoom.m4a"]}>
      Each move hides its cut inside itself: the picture turns (or pushes in) faster and faster and cuts at the fastest point, where the
      blur is strongest, and the next scene finishes the move. The spin blurs along circles about the centre and is enlarged just enough
      to keep the frame covered at each angle; the zoom blurs along rays. Both cuts land on a kick. Use Quarter speed to see the frames;
      Reduced motion plays a dissolve.
    </FilmCompare>;
  },
};

const chatDoc = chatExample as unknown as FilmDocument;
/** A vertical text story: a two-person thread on a dark ground, then a group chat on light paper, each message landing with a soft sound
 * over a low drum loop. */
export const ChatStory: StoryObj = {
  render: function ChatStory() {
    const variants = useMemo(() => ({ chat: { label: "Chat story", film: compileExample(chatDoc) } }), []);
    return <FilmCompare variants={variants} moment={() => 0} audio={soundUrls["../../assets/sound/lab/moves/chat-story.m4a"]}>
      The first message is on screen at once, as the hook; each next one lands once the last has had time to be read, the other side's
      after typing dots that become the message. The thread fills from the bottom and older messages scroll away at the top, each bubble
      growing its own height so nothing jumps. "Me" sits on the right in the brand colour; a group shows each sender's name and initial.
      Styling is neutral, not any messaging app's. Reduced motion drops the growth and the bouncing dots.
    </FilmCompare>;
  },
};

const subjectDoc = subjectExample as unknown as FilmDocument;
/** Real footage with its subject cut out by `npm run video:matte` (a CC0 clip from Wikimedia Commons): a giant word behind a peacock, then
 * the peacock outlined over a new ground. Beside it, the same footage without the subject. */
export const SubjectCutout: StoryObj = {
  render: function SubjectCutout() {
    const variants = useMemo(() => ({
      subject: { label: "Subject cut out", film: compileExample(subjectDoc) },
      plain: { label: "Plain footage (before)", film: compileExample({ ...subjectDoc, scenes: subjectDoc.scenes.map(scene => ({ ...scene, content: { ...scene.content as object, subject: undefined } })) } as unknown as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 0}>
      The cutout is the peacock itself, found in every frame by a segmentation model (IS-Net, Apache-2.0), edge-snapped
      with the guided filter, steadied over time only where the picture is still, and with the grass taken out of its feathers' edges. The
      word stands behind the bird; the outline grows from the solid part of the cutout's own alpha. The haze under its legs is the model
      reading the deck between them as part of the bird. Clip: <a href="https://commons.wikimedia.org/wiki/File:Peacock_walking_and_eating.webm" style={{ color: "#7cc6ff" }}>Peacock walking and eating</a> by
      Mx. Granger, CC0. The cutout uses VP9 with alpha, which Chromium and Firefox play; Safari shows the plain footage.
    </FilmCompare>;
  },
};

const freezeDoc = freezeExample as unknown as FilmDocument;
/** A freeze-frame character intro on real footage: the peacock stops mid-step, the deck and grass drain to grey while the bird keeps its
 * colour, its name and role slam in with a hit, then it walks on. Beside it, the same footage without the freeze. */
export const FreezeFrameIntro: StoryObj = {
  render: function FreezeFrameIntro() {
    const variants = useMemo(() => ({
      freeze: { label: "Freeze-frame intro", film: compileExample(freezeDoc) },
      plain: { label: "No freeze (before)", film: compileExample({ ...freezeDoc, scenes: freezeDoc.scenes.map(scene => ({ ...scene, freeze: undefined, durationFrames: 120 })) } as unknown as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 30} audio={soundUrls["../../assets/sound/lab/moves/freeze-intro.m4a"]}>
      The picture holds one frame for 2.2 s: one short flash as it stops, the background greyed while the bird keeps its colour (its cutout,
      from <code>npm run video:matte</code>, with a thin light edge), and the name card sliding in over a soft shade that keeps the white
      name readable on the deck. Then colour returns and the footage plays on. Reduced motion keeps the grade and the card and drops the
      flash and the slide.
    </FilmCompare>;
  },
};

const slowmoDoc = slowmoExample as unknown as FilmDocument;
/** One second of footage slowed four times: with new in-between frames from `npm run video:slowmo` (motion-compensated interpolation),
 * against the same second played at a quarter speed, which shows each real frame four times. */
export const SmoothSlowMotion: StoryObj = {
  render: function SmoothSlowMotion() {
    const variants = useMemo(() => ({
      smooth: { label: "Interpolated (4×)", film: compileExample(slowmoDoc) },
      repeated: { label: "Repeated frames (before)", film: compileExample({ ...slowmoDoc, scenes: slowmoDoc.scenes.map(scene => ({ ...scene, content: { ...scene.content as object,
        video: { id: "peacock-walk", src: "assets/footage/peacock-walk.mp4", width: 960, height: 540, fps: 30, frameCount: 120, licenseRef: "commons-peacock-walking-cc0" }, from: 30, rate: .25 } })) } as unknown as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 0}>
      Switch between the two at Quarter speed: repeated frames step every fourth frame; the interpolated clip moves on every frame. Its
      check rebuilt dropped frames of this clip at 0.952 SSIM against the real ones, where repeating frames scores 0.933. Interpolation
      guesses: fast or tangled motion (wings, water, crowds) shows warped seams, which the check warns about before you use it.
    </FilmCompare>;
  },
};

const trailDoc = trailExample as unknown as FilmDocument;
/** Motion trails on an 1894 dance film (CC0): fading copies of the cut-out dancer every two frames; the same trail washed in magenta; and a
 * whole-frame echo, which needs no cutout. Beside it, the same footage plain. */
export const MotionTrail: StoryObj = {
  render: function MotionTrail() {
    const variants = useMemo(() => ({
      trail: { label: "Trails and echo", film: compileExample(trailDoc) },
      plain: { label: "Plain footage (before)", film: compileExample({ ...trailDoc, scenes: trailDoc.scenes.map(scene => ({ ...scene, content: { ...scene.content as object, subject: undefined, echo: undefined } })) } as unknown as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={() => 0}>
      A trail is the subject's own cutout from earlier frames: six copies two frames apart, each 0.72 as strong as the last, under the live
      dancer; tinted, the copies are washed toward one colour. The echo instead lays earlier frames of the whole picture over the current
      one, so anything that moves, the camera included, leaves a ghost. Film: <a href="https://commons.wikimedia.org/wiki/File:Annabelle_butterfly_dance_1894.ogv" style={{ color: "#7cc6ff" }}>Annabelle
      Butterfly Dance</a> (W. K. L. Dickson, 1894), CC0.
    </FilmCompare>;
  },
};

const glitchDoc = glitchExample as unknown as FilmDocument;
/** Glitch cuts on the 110 bpm drum loop, centred on kicks: the frame breaks into bands that jump sideways and tear into red and blue while
 * the next scene takes over band by band. The last scene is a real datamosh made by `npm run video:datamosh`. Beside it, hard cuts. */
export const GlitchAndDatamosh: StoryObj = {
  render: function GlitchAndDatamosh() {
    const variants = useMemo(() => ({
      glitch: { label: "Glitch cuts", film: compileExample(glitchDoc) },
      cuts: { label: "Hard cuts (before)", film: compileExample({ ...glitchDoc, scenes: glitchDoc.scenes.map(scene => scene.transition ? { ...scene, transition: { kind: "cut" } } : scene) } as FilmDocument) },
    }), []);
    return <FilmCompare variants={variants} moment={film => film.cut.transitions[0].startFrame - 10} audio={soundUrls["../../assets/sound/lab/moves/glitch.m4a"]}>
      The bands hold for two frames and then change; the tear peaks in the middle of the cut, and every band is the next scene by its end.
      Under reduced motion each cut is a dissolve. The last scene is not drawn by the film: it is a real datamosh between two CC0 clips,
      the 1894 dancer's picture moved by the peacock's motion vectors until the next keyframe brings the peacock back clean.
    </FilmCompare>;
  },
};

/** The source timeline of a jump cut: kept stretches as bars (pushed-in ones in blue), the pauses taken out as gaps. */
function JumpCutStrip({ segments, seconds, width = 960 }: { segments: ReadonlyArray<{ start: number; end: number; punch: boolean }>; seconds: number; width?: number }) {
  const x = (t: number) => t / seconds * width;
  return <svg width={width} height={58} role="img" aria-label={`${segments.length} kept stretches of ${seconds} seconds; ${segments.filter(s => s.punch).length} pushed in`} style={{ maxWidth: "100%" }}>
    <rect x={0} y={14} width={width} height={22} rx={4} fill="#2a1d24" />
    {segments.map((segment, k) => <rect key={k} x={x(segment.start)} y={14} width={x(segment.end) - x(segment.start)} height={22} rx={3} fill={segment.punch ? "#7cc6ff" : "#8592a3"} />)}
    {Array.from({ length: Math.floor(seconds / 2) + 1 }, (_, k) => <text key={k} x={x(k * 2)} y={52} fill="#6b7686" fontSize={10} textAnchor="middle">{k * 2}s</text>)}
    <text x={0} y={10} fill="#9aa4b2" fontSize={11}>grey: kept, as shot · blue: kept, pushed in · dark: pause taken out</text>
  </svg>;
}
/** A real talking head (CC0) cut by `npm run video:jumpcut`: the pauses taken out and every other long stretch pushed in, so each cut
 * reads as a tighter angle. The original and the cut play side by side, with their sound. */
export const JumpCuts: StoryObj = {
  render: function JumpCuts() {
    const segments = teacherCutReport.segments, kept = segments.reduce((sum, s) => sum + s.end - s.start, 0);
    const video = { width: "100%", borderRadius: 8, background: "#000", display: "block" } as const;
    return <div style={{ display: "grid", gap: 14, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <figure style={{ margin: 0, flex: "1 1 360px", maxWidth: 480 }}>
          <video src={teacherTalk} controls preload="metadata" playsInline aria-label="Original: a teacher speaks to camera for 22 seconds, with his pauses" style={video} />
          <figcaption style={{ marginTop: 6, color: "#9aa4b2" }}>Original · 22.0 s</figcaption>
        </figure>
        <figure style={{ margin: 0, flex: "1 1 360px", maxWidth: 480 }}>
          <video src={teacherCut} controls preload="metadata" playsInline aria-label="Jump cut: the same talk with the pauses removed and every other stretch pushed in" style={video} />
          <figcaption style={{ marginTop: 6, color: "#9aa4b2" }}>Jump cut · {kept.toFixed(1)} s, {(22 - kept).toFixed(1)} s of pauses out, {segments.length - 1} cuts</figcaption>
        </figure>
      </div>
      <JumpCutStrip segments={segments} seconds={22} />
      <p style={{ margin: 0, maxWidth: 960, color: "#9aa4b2", font: "13px/1.55 system-ui" }}>
        FFmpeg's silencedetect finds the pauses (below −35 dB for 0.3 s or more); each kept stretch keeps 0.08 s of breath at both ends and a
        10 ms fade, so no word is clipped and no cut clicks. Every other long stretch is pushed in 1.12 times about the face; a short one
        (a single word) keeps the framing before it. <code>--srt</code> retimes a subtitle file to the cut. This demo has no transcript, so
        it plays without captions. Clip: <a href="https://commons.wikimedia.org/wiki/File:Interview_with_a_Teacher_-_Glen_Caruso.webm" style={{ color: "#7cc6ff" }}>Interview
        with a Teacher - Glen Caruso</a> by Chase Bohannon and Glen Caruso, CC0.
      </p>
    </div>;
  },
};

export const SoundMoves: StoryObj = {
  render: function SoundMoves() {
    return <div style={{ padding: 24, background: "#0b0d10", color: "#e8ecf2", font: "14px/1.5 system-ui", minHeight: "100vh", display: "grid", gap: 24, alignContent: "start" }}>
      <div><h1 style={{ margin: "0 0 4px", font: "650 22px system-ui" }}>Sound moves</h1>
        <p style={{ margin: 0, color: "#9aa4b2", maxWidth: 760 }}>Each clip is a film's mix made by <code>film:render --audio-only</code>; <code>npm run sound:moves</code> remakes them. Blue is the
          move, grey the same film without it. Use headphones: the levels are measured, but whether it sounds right is your call.</p></div>
      {(soundMoves as SoundPair[]).map(pair => <section key={pair.id} style={{ display: "grid", gap: 10, maxWidth: 800 }}>
        <h2 style={{ margin: 0, font: "650 16px system-ui" }}>{pair.title}</h2>
        <p style={{ margin: 0, color: "#9aa4b2" }}>{pair.what}</p>
        <LevelChart pair={pair} />
        {(["after", "before"] as const).map(version => <label key={version} style={{ display: "grid", gap: 4, color: version === "after" ? "#7cc6ff" : "#9aa4b2" }}>
          {version === "after" ? "With the move" : "Without it (before)"}
          <audio controls preload="none" src={soundUrls[`../../assets/sound/lab/moves/${pair.versions[version].file}`]} style={{ width: "100%" }} />
        </label>)}
      </section>)}
    </div>;
  },
};

const meta: Meta = { title: "Video production/Promo Moves", parameters: { layout: "fullscreen" } };
export default meta;
