import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import exampleFilm from "../../examples/film/billing-gap.film.json";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { createStoryTextMeasure } from "../../registry/video/object-story-react";
import { renderFilmObject } from "../film/film-art";
import receiptDesk from "../../examples/film/assets/receipt-desk.svg?url";

/** The example file with its asset path rebased, since a story has no film server. */
const input = JSON.parse(JSON.stringify(exampleFilm).replace("assets/receipt-desk.svg", receiptDesk));

function Player({ output }: { output: "landscape" | "portrait" }) {
  const [frame, setFrame] = useState(160);
  const compiled = useMemo(() => compileFilm(input, { outputId: output, objectStory: { measure: createStoryTextMeasure() } }), [output]);
  if (!compiled.ok) return <pre>{compiled.diagnostics.map(item => `${item.path}: ${item.message}`).join("\n")}</pre>;
  const { film } = compiled, scale = film.width > film.height ? .5 : .36;
  return <div style={{ padding: 16 }}>
    <label style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>Frame {frame}
      <input type="range" min={0} max={film.durationFrames - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} style={{ flex: 1 }} /></label>
    <div style={{ width: film.width * scale, height: film.height * scale, overflow: "hidden" }}>
      <FilmStage film={film} frame={frame} renderObject={renderFilmObject} reducedMotion={false} style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }} />
    </div>
  </div>;
}

const meta = { title: "Video production/Film Stage", id: "video-film-stage", component: Player, args: { output: "landscape" },
  argTypes: { output: { control: "inline-radio", options: ["landscape", "portrait"] } } } satisfies Meta<typeof Player>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ExampleFilm: Story = {};
