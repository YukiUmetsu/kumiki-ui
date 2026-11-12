import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CompiledFilm, FilmDocument } from "../../registry/video/film-document";
import { compileExample, FilmCompare } from "./promo-moves/film-compare";
import { PROMO_MOVES } from "./promo-moves/progress";
import type { MoveGroup, MoveStatus } from "./promo-moves/progress";
import dipExample from "../../examples/film/dip.film.json";

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

const meta: Meta = { title: "Video production/Promo Moves", parameters: { layout: "fullscreen" } };
export default meta;
