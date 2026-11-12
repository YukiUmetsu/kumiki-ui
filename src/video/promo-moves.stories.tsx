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

const meta: Meta = { title: "Video production/Promo Moves", parameters: { layout: "fullscreen" } };
export default meta;
