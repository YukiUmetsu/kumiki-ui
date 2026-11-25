import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { asset, figureIds, provenanceOf } from "./art";
import { kitFilm } from "./kit-film";
import { armBench, lineUp, lookBench, standBench, walkBench } from "./story-benches";
import { RigOverlay, StoryBench, StoryPage, StoryStill } from "./story-page";

const meta: Meta = { title: "Video production/Japanese Retro Watercolor/Characters", id: "video-storybook-characters", parameters: { layout: "fullscreen" } };
export default meta;
const people = lineUp(), arms = armBench(), walk = walkBench(), faces = { ema: lookBench("ema", "happy"), riku: lookBench("riku", "laughing") }, bodies = { ema: standBench("ema"), riku: standBench("riku", ["front"]) };
/** Each figure is a painting, cut into layers. The painting is not redrawn. */
export const Views: StoryObj = { render: () => <StoryPage title="Views" about={provenanceOf("ema-three-quarter")}><StoryBench film={people} /></StoryPage> };
/** Bones and joints in red, places to hold things in blue. */
export const Joints: StoryObj = { name: "Joints and grips", render: () => <StoryPage title="Joints and grips" about="Bones and joints are red. The places that hold props are blue."><StoryStill film={people}>{f => <RigOverlay frame={f} film={people} />}</StoryStill></StoryPage> };
/** The arm is solved in depth: the elbow hangs down and back, the shoulder goes along, and a forearm that points at the viewer is drawn shorter. */
export const Arms: StoryObj = { name: "Shoulders and elbows", render: () => <StoryPage title="Shoulders and elbows" about="Near and far arms go through the same eleven places. Use the speed menu to slow them down."><StoryBench film={arms} /></StoryPage> };
export const ArmJoints: StoryObj = { name: "Shoulders and elbows, with the rig", render: () => <StoryPage title="Shoulders and elbows"><StoryBench film={arms}>{f => <RigOverlay frame={f} film={arms} names={false} />}</StoryBench></StoryPage> };
function Kit({ figure, rig }: { figure: string; rig: boolean }) {
  const film = useMemo(() => kitFilm(figure), [figure]);
  return <StoryPage title={film.title} about={provenanceOf(figure)} wide={false}><StoryBench key={figure} film={film}>{rig ? f => <RigOverlay frame={f} film={film} names={false} /> : undefined}</StoryBench></StoryPage>;
}
/** One figure of the cast: it stands, turns, shows each look, speaks, moves its arms, does each act, walks and sits. */
export const OneFigure: StoryObj<{ figure: string; rig: boolean }> = { name: "One figure, all it can do", args: { figure: "haruka-front", rig: false }, argTypes: { figure: { control: "select", options: figureIds() } }, render: a => <Kit {...a} /> };
/** Feet stay where they stand. */
export const Walk: StoryObj = { render: () => <StoryPage title="Walk"><StoryBench film={walk} /></StoryPage> };

const Beside = ({ label, sheet, children }: { label: string; sheet: string; children: ReactNode }) => <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "end", margin: "0 0 28px" }}>
  <figure style={{ margin: 0 }}><img src={asset(`reference/${sheet}.webp`)} alt={`${label}, part of the character sheet`} style={{ width: "100%", display: "block" }} /><figcaption style={{ padding: "6px 0", font: "500 15px/1.3 system-ui, sans-serif" }}>{label}: sheet</figcaption></figure>
  <figure style={{ margin: 0 }}>{children}<figcaption style={{ padding: "6px 0", font: "500 15px/1.3 system-ui, sans-serif" }}>{label}: film</figcaption></figure>
</section>;
/** The sheets are the reference: the same part of a sheet and of the film, side by side. */
export const Sheets: StoryObj = { name: "Beside the sheets", render: () => <StoryPage title="Beside the sheets" about="Left: a part of the character sheet. Right: the figure that the film uses.">
  <Beside label="Emma, face" sheet="ema-portrait"><StoryStill film={faces.ema} pixels={700} /></Beside>
  <Beside label="Emma, body" sheet="ema-turnaround"><StoryStill film={bodies.ema} pixels={900} /></Beside>
  <Beside label="Riku, face" sheet="riku-portrait"><StoryStill film={faces.riku} pixels={700} /></Beside>
  <Beside label="Riku, body" sheet="riku-turnaround"><StoryStill film={bodies.riku} pixels={900} /></Beside>
</StoryPage> };
