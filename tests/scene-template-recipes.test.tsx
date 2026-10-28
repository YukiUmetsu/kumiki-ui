import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { evaluateSceneTemplate, sceneTemplateAssets, validateSceneTemplate } from "../registry/video/scene-templates";
import type { SceneRecipeId, SceneTemplateSpec } from "../registry/video/scene-templates";
import { SceneTemplateView } from "../registry/video/scene-templates-react";
import { DEMO_SCENES, SCENE_IDS } from "../src/components/video/scene-template-fixtures";

function copy(id: SceneRecipeId): SceneTemplateSpec {
  return structuredClone(DEMO_SCENES[id]) as SceneTemplateSpec;
}
describe("ST1 semantic scene recipes", () => {
  it("covers exactly the 24 new recipes without duplicating ProcessJourney or FollowSubject", () => {
    expect(SCENE_IDS).toHaveLength(24);
    expect(new Set(SCENE_IDS).size).toBe(24);
    expect(SCENE_IDS).not.toContain("process-journey");
    expect(SCENE_IDS).not.toContain("follow-subject-through-sections");
  });
  for(const id of SCENE_IDS) {
    describe(id, () => {
      it("validates meaningful supplied semantic fields and stable IDs", () => {
        const spec=copy(id);
        expect(()=>validateSceneTemplate(spec)).not.toThrow();
        expect(spec.recipeId).toBe(id);
        expect(spec.durationFrames).toBe(120);
      });
      it("keeps deterministic frame states for shuffled seeks and exact boundaries", () => {
        const spec=copy(id);
        const first=evaluateSceneTemplate(spec,0);
        const mid=evaluateSceneTemplate(spec,61);
        for(const f of [119,0,90,25,33,61,5,119]) evaluateSceneTemplate(spec,f);
        expect(evaluateSceneTemplate(spec,61)).toEqual(mid);
        expect(first.phase).toBe("establish");
        expect(evaluateSceneTemplate(spec,25).phase).toBe("focus");
        expect(evaluateSceneTemplate(spec,55).phase).toBe("reveal");
        expect(evaluateSceneTemplate(spec,90).phase).toBe("resolve");
        expect(evaluateSceneTemplate(spec,119).frame).toBe(119);
        expect(evaluateSceneTemplate(spec,-30).frame).toBe(0);
        expect(evaluateSceneTemplate(spec,9000).frame).toBe(119);
        expect(()=>evaluateSceneTemplate(spec,1.5)).toThrow(/integer/);
      });
      it("renders an accessible visual at both 16:9 and 9:16 with reduced motion", () => {
        const spec=copy(id);
        const view=render(<SceneTemplateView spec={spec} frame={90} data-testid="scene" />);
        expect(view.getByTestId("scene").getAttribute("data-km-scene-recipe")).toBe(id);
        expect(view.getByTestId("scene").getAttribute("data-km-scene-phase")).toBe("resolve");
        expect(view.getByTestId("scene").getAttribute("data-km-frame")).toBe("90");
        spec.width=540;spec.height=960;
        view.rerender(<SceneTemplateView spec={spec} frame={119} reducedMotion />);
        expect(view.getByTestId("scene").style.aspectRatio).toBe("540 / 960");
        expect(evaluateSceneTemplate(spec,119,true).reducedMotion).toBe(true);
        view.unmount();
      });
      it("rejects absent or malformed content rather than inventing facts", () => {
        const invalid=copy(id) as unknown as {content:unknown};
        invalid.content=null;
        expect(()=>validateSceneTemplate(invalid as SceneTemplateSpec)).toThrow(/content/);
      });
      it("produces a deterministic manifest with explicit rights fields", () => {
        const assets=sceneTemplateAssets(copy(id));
        expect(assets).toEqual(sceneTemplateAssets(copy(id)));
        expect(new Set(assets.map(a=>a.id)).size).toBe(assets.length);
        expect(assets.every(a=>a.licenseRef==="original-generated-fixture")).toBe(true);
      });
    });
  }
  it("reveals a matched before/after image with a deterministic aligned wipe", () => {
    const spec=copy("before-after");
    const v=render(<SceneTemplateView spec={spec} frame={0}/>);
    const layer=()=>v.container.querySelector<HTMLElement>("[data-km-before-after-wipe]");
    expect(layer()?.getAttribute("data-km-wipe-percent")).toBe("0");
    v.rerender(<SceneTemplateView spec={spec} frame={72}/>);
    expect(Number(layer()?.dataset.kmWipePercent)).toBeGreaterThan(20);
    v.rerender(<SceneTemplateView spec={spec} frame={119}/>);
    expect(Number(layer()?.dataset.kmWipePercent)).toBe(100);
  });
  it("uses truthful positive and negative bars around the zero baseline", () => {
    const spec=copy("data-story");
    if(spec.recipeId!=="data-story")throw new Error("fixture error");
    spec.content.data[0].value=-12;
    spec.content.data[1].value=8;
    const v=render(<SceneTemplateView spec={spec} frame={119}/>);
    expect(v.container.querySelector("[data-km-zero-baseline]")).not.toBeNull();
    const neg=v.container.querySelector<HTMLElement>('[data-km-chart-bar="a"]');
    const pos=v.container.querySelector<HTMLElement>('[data-km-chart-bar="b"]');
    expect(Number.parseFloat(neg?.style.bottom??"")).toBeLessThan(Number.parseFloat(pos?.style.bottom??""));
  });
  it("maps elapsed timeline events to their actual temporal intervals", () => {
    const s=copy("timeline-journey");
    if(s.recipeId!=="timeline-journey")throw new Error("fixture error");
    s.content.spacing="elapsed";
    s.content.events[1].date="2001-01-01";
    const v=render(<SceneTemplateView spec={s} frame={119}/>);
    const a=Number(v.container.querySelector<HTMLElement>('[data-km-timeline-event="a"]')?.dataset.kmEventX);
    const b=Number(v.container.querySelector<HTMLElement>('[data-km-timeline-event="b"]')?.dataset.kmEventX);
    const c=Number(v.container.querySelector<HTMLElement>('[data-km-timeline-event="c"]')?.dataset.kmEventX);
    expect(b-a).toBeLessThan((c-b)/3);
  });
  it("accepts host rendering for an image/3D/character asset at the sampled frame", () => {
    const s=copy("character-discovery");
    const v=render(<SceneTemplateView spec={s} frame={70}
      renderAsset={(asset,frame)=><svg data-rig={asset.id} data-frame={frame.frame} viewBox="0 0 10 10" />} />);
    expect(v.container.querySelectorAll("svg[data-rig]")).toHaveLength(2);
    expect(v.container.querySelector<SVGElement>('[data-rig="character"]')?.getAttribute("data-frame")).toBe("70");
  });
  it("rejects invalid schema, duration, rational FPS and overlapping cues", () => {
    const s=copy("question-reveal");
    (s as unknown as {schemaVersion:number}).schemaVersion=2;
    expect(()=>validateSceneTemplate(s)).toThrow(/version/);
    s.schemaVersion=1;s.durationFrames=0;
    expect(()=>validateSceneTemplate(s)).toThrow(/duration/);
    s.durationFrames=120;s.fps={num:0,den:1};
    expect(()=>validateSceneTemplate(s)).toThrow(/FPS/);
    s.fps={num:30,den:1};s.cueFrames=[50,25,70];
    expect(()=>validateSceneTemplate(s)).toThrow(/cueFrames/);
  });
  it("rejects malformed focus coordinates and impossible ROI", () => {
    const s=copy("hidden-detail");
    if(s.recipeId!=="hidden-detail")throw new Error("wrong fixture");
    s.content.target={x:.9,y:.2,width:.4,height:.2};
    expect(()=>validateSceneTemplate(s)).toThrow(/focus region/);
  });
  it("requires actual source evidence rather than a generated citation", () => {
    const s=copy("evidence-reveal");
    if(s.recipeId!=="evidence-reveal")throw new Error("wrong fixture");
    s.content.source="";
    expect(()=>validateSceneTemplate(s)).toThrow(/source/);
  });
  it("rejects invalid scale quantities and data points", () => {
    const a=copy("scale-reveal");
    if(a.recipeId!=="scale-reveal")throw new Error("wrong fixture");
    a.content.reference.quantity=0;
    expect(()=>validateSceneTemplate(a)).toThrow(/scale/);
    const b=copy("data-story");
    if(b.recipeId!=="data-story")throw new Error("wrong fixture");
    b.content.data[0].value=NaN;
    expect(()=>validateSceneTemplate(b)).toThrow(/data point/);
  });
  it("rejects unlinked graph edges and mapping identity loss", () => {
    const a=copy("build-and-connect");
    if(a.recipeId!=="build-and-connect")throw new Error("wrong fixture");
    a.content.connections[0].to="missing";
    expect(()=>validateSceneTemplate(a)).toThrow(/connection/);
    const b=copy("transform-and-track");
    if(b.recipeId!=="transform-and-track")throw new Error("wrong fixture");
    b.content.mapping[0].from="unknown";
    expect(()=>validateSceneTemplate(b)).toThrow(/mapping/);
  });
  it("rejects incorrect chronology and invalid geographic coordinates", () => {
    const t=copy("time-evolution");
    if(t.recipeId!=="time-evolution")throw new Error("wrong fixture");
    t.content.milestones[1].date="2018-01-01";
    expect(()=>validateSceneTemplate(t)).toThrow(/chronological/);
    const g=copy("orbit-world");
    if(g.recipeId!=="orbit-world")throw new Error("wrong fixture");
    g.content.locations[0].latitude=100;
    expect(()=>validateSceneTemplate(g)).toThrow(/latitude/);
  });
  it("rejects unresolved claim detail and missing imagery", () => {
    const s=copy("character-discovery");
    if(s.recipeId!=="character-discovery")throw new Error("wrong fixture");
    s.content.subject.src="";
    expect(()=>validateSceneTemplate(s)).toThrow(/src/);
    const q=copy("question-reveal");
    if(q.recipeId!=="question-reveal")throw new Error("wrong fixture");
    q.content.answer="";
    expect(()=>validateSceneTemplate(q)).toThrow(/question and answer/);
  });
});
