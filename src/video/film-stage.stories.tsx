import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import billingGap from "../../examples/film/billing-gap.film.json";
import whereWaterBegins from "../../examples/film/where-water-begins.film.json";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { ShaderFxLayer } from "../../registry/video/shader-fx-react";
import { createStoryTextMeasure } from "../../registry/video/object-story-react";
import { renderFilmObject } from "../film/film-art";

/** A story has no film server, so each `assets/...` path in a film file is rebased to the file Storybook serves. */
const assets = import.meta.glob("../../examples/film/assets/**/*.{jpg,svg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const rebase = (film: unknown) => JSON.parse(JSON.stringify(film).replace(/"(assets\/[^"]+\.(?:jpg|svg))"/g, (whole, path: string) => {
  const url = assets["../../examples/film/" + path];
  return url ? JSON.stringify(url) : whole;
}));
const FILMS = { "billing-gap": rebase(billingGap), "where-water-begins": rebase(whereWaterBegins) } as const;

function Player({ output, film: filmId = "billing-gap", start = 160 }: { output: "landscape" | "portrait"; film?: keyof typeof FILMS; start?: number }) {
  const [frame, setFrame] = useState(start);
  const compiled = useMemo(() => compileFilm(FILMS[filmId], { outputId: output, objectStory: { measure: createStoryTextMeasure() } }), [output, filmId]);
  if (!compiled.ok) return <pre>{compiled.diagnostics.map(item => `${item.path}: ${item.message}`).join("\n")}</pre>;
  const { film } = compiled, scale = film.width > film.height ? .5 : .36;
  // Each scene, with the shader effects it carries and any shader cut into it, so every effect is one click away.
  const chapters = film.scenes.flatMap(scene => {
    const cut = film.transitionFx[scene.id] && film.cut.transitions.find(item => item.toShotId === scene.id);
    return [
      ...(cut ? [{ id: `cut into ${scene.id}`, frame: Math.floor((cut.startFrame + cut.endFrame) / 2), effects: [`${film.transitionFx[scene.id].effect}`] }] : []),
      { id: scene.id, frame: scene.startFrame + Math.round((scene.endFrame - scene.startFrame) * .62), effects: scene.fx.map(fx => fx.effect) },
    ];
  });
  const hasFx = chapters.some(chapter => chapter.effects.length);
  return <div style={{ padding: 16, display: "grid", gap: 12, font: "16px/1.45 var(--km-font-body, system-ui)" }}>
    <label style={{ display: "flex", gap: 12, alignItems: "center", maxWidth: 960 }}>Frame {frame}
      <input type="range" min={0} max={film.durationFrames - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} style={{ flex: 1 }} /></label>
    {hasFx && <nav aria-label="Scenes" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {chapters.map(chapter => <button key={chapter.id} type="button" onClick={() => setFrame(chapter.frame)} style={{ font: "inherit", minHeight: 40, padding: "0 12px" }}>
        {chapter.id}{chapter.effects.length ? `: ${chapter.effects.join(", ")}` : ""}</button>)}
    </nav>}
    <div style={{ width: film.width * scale, height: film.height * scale, overflow: "hidden" }}>
      <FilmStage film={film} frame={frame} renderObject={renderFilmObject} renderFx={(spec, context) => <ShaderFxLayer spec={spec} {...context} />} reducedMotion={false} style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }} />
    </div>
  </div>;
}

const meta = { title: "Video production/Film Stage", id: "video-film-stage", component: Player, args: { output: "landscape" },
  argTypes: { output: { control: "inline-radio", options: ["landscape", "portrait"] }, film: { table: { disable: true } }, start: { table: { disable: true } } } } satisfies Meta<typeof Player>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ExampleFilm: Story = {};
/** One film file that uses all six shader effects inside real scenes, and a shader cut between two of them. */
export const ShaderEffectsInAFilm: Story = { args: { film: "where-water-begins", start: 60 } };
