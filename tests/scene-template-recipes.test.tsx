import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { compileSceneTemplate, inspectSceneTemplate, evaluateSceneTemplate, sceneTemplateAssets, validateSceneTemplate } from "../registry/video/scene-templates";
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
        view.rerender(<SceneTemplateView spec={spec} frame={119} data-testid="scene" reducedMotion />);
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
  it("compiles a versioned cue schedule and retains asset provenance", () => {
    for (const recipe of SCENE_IDS) {
      const plan=compileSceneTemplate(copy(recipe));
      expect(plan.recipeId).toBe(recipe);
      expect(plan.schemaVersion).toBe(1);
      expect(plan.cueSchedule.map(cue=>cue.frame)).toEqual([25,55,90]);
      expect(plan.durationFrames).toBe(120);
      expect(plan.assets).toEqual(sceneTemplateAssets(copy(recipe)));
      expect(plan.diagnostics.filter(d=>d.severity==="error")).toEqual([]);
    }
  });
  it("reports absent asset rights and unsupported schema without guessing licenses", () => {
    const s=copy("question-reveal");
    if(s.recipeId!=="question-reveal")throw Error("fixture error");
    s.content.subject.licenseRef=undefined;
    expect(inspectSceneTemplate(s).some(d=>d.code==="unlicensed-asset")).toBe(true);
    (s as unknown as {schemaVersion:number}).schemaVersion=3;
    expect(inspectSceneTemplate(s)[0].code).toBe("invalid-recipe");
  });
  it("actually reveals the complete causal outcome at the resolve phase", () => {
    const spec=copy("cause-effect");
    const view=render(<SceneTemplateView spec={spec} frame={119}/>);
    expect(view.container.textContent).toContain("A measured change is observed");
    expect(view.container.textContent).toContain("The first stage reacts");
    expect(view.container.textContent).toContain("A second stage responds");
  });
  it("renders mappings by semantic ID, not by arbitrary source-array order", () => {
    const spec=copy("transform-and-track");
    if(spec.recipeId!=="transform-and-track")throw Error("wrong fixture");
    spec.content.destination.reverse();
    const view=render(<SceneTemplateView spec={spec} frame={119}/>);
    expect(view.container.textContent).toContain("Entity A moved");
    expect(view.container.textContent).toContain("Entity B moved");
    expect(view.container.querySelectorAll("[data-km-asset-id]")).toHaveLength(0);
  });
  it("reserves explicit caption and interface-safe insets in both outputs", () => {
    const s=copy("question-reveal");
    s.safeInsets={top:.12,right:.06,bottom:.18,left:.06};
    const v=render(<SceneTemplateView spec={s} frame={90}/>);
    expect((v.getByRole("group") as HTMLElement).style.padding).toBe("12% 6% 18% 6%");
    s.safeInsets.top=.5;
    expect(()=>validateSceneTemplate(s)).toThrow(/safeInsets/);
  });
  it("has deterministic physical-layer and page-turn sample states", () => {
    const cutaway=copy("layered-cutaway");
    const cut=render(<SceneTemplateView spec={cutaway} frame={119}/>);
    expect(cut.container.querySelectorAll("[data-km-cutaway-layer]")).toHaveLength(3);
    cut.unmount();
    const book=copy("page-turn-story");
    const view=render(<SceneTemplateView spec={book} frame={45}/>);
    const first=view.container.querySelector<HTMLElement>("[data-km-turning-page]");
    expect(first).not.toBeNull();
    expect(Number(first?.dataset.kmPageAngle)).toBeLessThan(0);
    view.rerender(<SceneTemplateView spec={book} frame={70}/>);
    expect(view.container.querySelector("[data-km-turning-page]")).toBeNull();
    view.rerender(<SceneTemplateView spec={book} frame={85} reducedMotion/>);
    expect(view.container.querySelector("[data-km-turning-page]")).toBeNull();
  });
  it("labels distinct authored branches and reveals conditional results", () => {
    const choice=copy("decision-branch");
    const view=render(<SceneTemplateView spec={choice} frame={119}/>);
    expect(view.container.querySelectorAll("[data-km-branch]")).toHaveLength(3);
    expect(view.container.textContent).toContain("Under condition A");
    expect(view.container.textContent).toContain("Result B");
  });
  it("follows authored character intent and resolves all inspection targets", () => {
    const character=copy("character-discovery");
    const v=render(<SceneTemplateView spec={character} frame={20}/>);
    expect(v.container.querySelector("[data-km-character-action=Exploring]")).not.toBeNull();
    v.rerender(<SceneTemplateView spec={character} frame={80}/>);
    expect(v.container.querySelector("[data-km-character-action=Reacting]")).not.toBeNull();
    v.unmount();
    const inspect=copy("guided-inspection");
    const q=render(<SceneTemplateView spec={inspect} frame={119}/>);
    const regions=q.container.querySelectorAll<HTMLElement>("[data-km-inspection-region]");
    expect(regions).toHaveLength(2);
    expect([...regions].every(region=>region.style.opacity==="1")).toBe(true);
  });
  it("exposes demonstrative action focus and spatial consequence nodes", () => {
    const demo=copy("demonstration");
    const v=render(<SceneTemplateView spec={demo} frame={90}/>);
    expect(v.container.querySelector("[data-km-demo-action]")).not.toBeNull();
    v.unmount();
    const chain=copy("consequence-chain");
    const q=render(<SceneTemplateView spec={chain} frame={119}/>);
    expect(q.container.querySelectorAll("[data-km-cascade-impact]")).toHaveLength(3);
    expect(q.container.querySelector("[data-km-cascade-outcome]")).not.toBeNull();
  });
  it("exposes author-controlled environment framing and meaningful light layers", () => {
    const spec=copy("environment-reveal");
    if(spec.recipeId!=="environment-reveal")throw Error("wrong fixture");
    const v=render(<SceneTemplateView spec={spec} frame={119}/>);
    const camera=v.container.querySelector<HTMLElement>("[data-km-environment-camera]");
    expect(Number(camera?.dataset.kmCameraZoom)).toBeCloseTo(1.25);
    expect(v.container.querySelector("[data-km-environment-focal]")).not.toBeNull();
    spec.content.camera!.from.zoom=5;
    expect(()=>validateSceneTemplate(spec)).toThrow(/camera path/);
  });
  it("supports configurable paper and glass treatment without sacrificing reduced-motion", () => {
    const book=copy("page-turn-story");
    const v=render(<SceneTemplateView spec={book} frame={90}/>);
    expect(v.container.querySelector<HTMLElement>("[data-km-book-spread]")?.style.background).toContain("rgb");
    v.unmount();
    const glass=copy("glass-data-reveal");
    if(glass.recipeId!=="glass-data-reveal")throw Error("wrong fixture");
    expect(()=>validateSceneTemplate(glass)).not.toThrow();
    glass.content.material!.blurPx=100;
    expect(()=>validateSceneTemplate(glass)).toThrow(/glass material/);
    glass.content.material!.blurPx=10;
    const normal=render(<SceneTemplateView spec={glass} frame={119}/>);
    expect(normal.container.querySelector("[data-km-scene-recipe=glass-data-reveal]")).not.toBeNull();
    normal.rerender(<SceneTemplateView spec={glass} frame={119} reducedMotion/>);
    expect(normal.container.textContent).toContain("A focused message");
  });
  it("validates camera orbit options and globe size independent of renderer", () => {
    const spec=copy("orbit-world");
    if(spec.recipeId!=="orbit-world")throw Error("wrong fixture");
    spec.content.camera={latitude:35,longitude:139,orbitDegrees:25};
    spec.content.globeRadiusPercent=70;
    expect(()=>validateSceneTemplate(spec)).not.toThrow();
    spec.content.globeRadiusPercent=130;
    expect(()=>validateSceneTemplate(spec)).toThrow(/globe radius/);
  });
  it("never makes a previously revealed semantic item disappear at phase boundaries", () => {
    for(const id of SCENE_IDS) {
      const spec=copy(id);
      let previous=0;
      for(let frame=0;frame<spec.durationFrames;frame++) {
        const result=evaluateSceneTemplate(spec,frame);
        expect(result.revealedItems).toBeGreaterThanOrEqual(previous);
        expect(result.revealedItems).toBeLessThanOrEqual(100);
        previous=result.revealedItems;
      }
    }
  });
  it("rejects duplicate source or destination entity mappings", () => {
    const spec=copy("transform-and-track");
    if(spec.recipeId!=="transform-and-track")throw Error("wrong fixture");
    spec.content.mapping.push({from:"a",to:"b-next"});
    expect(()=>validateSceneTemplate(spec)).toThrow(/one-to-one/);
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

  describe("Premium scene choreography contracts", () => {
    it("question hero and answer move on different frame-addressed cues", () => {
      const spec=copy("question-reveal");
      const view=render(<SceneTemplateView spec={spec} frame={0}/>);
      const hero=()=>view.container.querySelector<HTMLElement>('[data-km-motion="question-hero"]');
      expect(Number(hero()?.dataset.kmMotionProgress)).toBe(0);
      view.rerender(<SceneTemplateView spec={spec} frame={25}/>);
      expect(Number(hero()?.dataset.kmMotionProgress)).toBe(1);
      expect(view.container.querySelector('[data-km-motion="question-answer"]')).toBeNull();
      view.rerender(<SceneTemplateView spec={spec} frame={55}/>);
      const answer=()=>view.container.querySelector<HTMLElement>('[data-km-motion="question-answer"]');
      expect(Number(answer()?.dataset.kmMotionProgress)).toBe(0);
      view.rerender(<SceneTemplateView spec={spec} frame={78}/>);
      expect(Number(answer()?.dataset.kmMotionProgress)).toBe(1);
    });
    it("focused camera motion follows authored cue boundaries instead of assuming quarters", () => {
      const spec=copy("hidden-detail");
      spec.cueFrames=[10,30,60];
      const view=render(<SceneTemplateView spec={spec} frame={10}/>);
      const stage=()=>view.container.querySelector<HTMLElement>('[data-km-cinematic-media="hidden-detail-zoom"]');
      expect(Number(stage()?.dataset.kmCameraProgress)).toBe(0);
      expect(Number(stage()?.dataset.kmCameraZoom)).toBe(1);
      view.rerender(<SceneTemplateView spec={spec} frame={60}/>);
      expect(Number(stage()?.dataset.kmCameraProgress)).toBe(1);
      expect(Number(stage()?.dataset.kmCameraZoom)).toBeCloseTo(1.32);
    });
    it("graph edges are drawn as actual paths, not merely swapped visible cards", () => {
      const spec=copy("build-and-connect");
      const view=render(<SceneTemplateView spec={spec} frame={119}/>);
      const lines=[...view.container.querySelectorAll<SVGLineElement>('[data-km-animated-connection]')];
      expect(lines).toHaveLength(2);
      expect(lines.every(x=>x.getAttribute("stroke-dashoffset")==="0")).toBe(true);
      view.rerender(<SceneTemplateView spec={spec} frame={55}/>);
      expect(view.container.querySelectorAll("[data-km-animated-connection]")).toHaveLength(0);
    });
    it("mapped entities flip around their identity rather than popping to unrelated cards", () => {
      const spec=copy("transform-and-track");
      const view=render(<SceneTemplateView spec={spec} frame={55}/>);
      const first=()=>view.container.querySelector<HTMLElement>('[data-km-transform-identity="a"]');
      expect(Number(first()?.dataset.kmTransformAngle)).toBe(0);
      view.rerender(<SceneTemplateView spec={spec} frame={90}/>);
      expect(Number(first()?.dataset.kmTransformAngle)).toBe(180);
      expect(view.container.querySelectorAll('[data-km-transform-identity]')).toHaveLength(2);
    });
    it("demo cursor targets physically move to author-specified points and artwork states", () => {
      const spec=copy("demonstration");
      const view=render(<SceneTemplateView spec={spec} frame={26}/>);
      const focus=()=>view.container.querySelector<HTMLElement>("[data-km-demo-action]");
      const x=Number(focus()?.dataset.kmCursorX);
      expect(x).toBeCloseTo(58.5);
      view.rerender(<SceneTemplateView spec={spec} frame={119}/>);
      expect(view.container.querySelector('[data-km-asset-id="ui-saved"]')).not.toBeNull();
      expect(Number(focus()?.dataset.kmCursorX)).toBeCloseTo(71.5);
    });
    it("book curl has an actual changing geometric silhouette and staggered fold lighting", () => {
      const spec=copy("page-turn-story");
      const view=render(<SceneTemplateView spec={spec} frame={45}/>);
      const turn=()=>view.container.querySelector<HTMLElement>("[data-km-turning-page]");
      const early=Number(turn()?.dataset.kmPageCurl);
      expect(early).toBeGreaterThan(0);
      expect(turn()?.querySelectorAll("[data-km-paper-band]")).toHaveLength(12);
      expect(turn()?.children[0]).toHaveProperty("style");
      view.rerender(<SceneTemplateView spec={spec} frame={54}/>);
      expect(Number(turn()?.dataset.kmPageCurl)).toBeGreaterThan(early);
      const faces=[...turn()!.querySelectorAll<HTMLElement>('[style*="backface-visibility"]')];
      expect(faces).toHaveLength(2);
      expect(faces.every(x=>x.style.clipPath.startsWith("polygon("))).toBe(true);
      view.rerender(<SceneTemplateView spec={spec} frame={54} reducedMotion/>);
      expect(turn()).toBeNull();
    });
    it("book turn has a real back face and a curved-shadow front face", () => {
      const spec=copy("page-turn-story");
      const view=render(<SceneTemplateView spec={spec} frame={46}/>);
      const page=view.container.querySelector<HTMLElement>("[data-km-turning-page]");
      expect(page).not.toBeNull();
      expect(page?.querySelectorAll('[style*="backface-visibility"]')).toHaveLength(2);
    });
    it("allows a source-backed geographic globe without a decorative image or unnecessary asset rights", () => {
      const geographic=copy("orbit-world");
      if(geographic.recipeId!=="orbit-world")throw Error("wrong fixture");
      delete geographic.content.globe;
      expect(()=>validateSceneTemplate(geographic)).not.toThrow();
      expect(sceneTemplateAssets(geographic).map(x=>x.id)).not.toContain("sphere");
      const view=render(<SceneTemplateView spec={geographic} frame={30}/>);
      expect(view.container.querySelector("[data-km-geographic-globe]")).not.toBeNull();
      expect(view.container.querySelectorAll("[data-km-coastline]").length).toBeGreaterThan(15);
      const stylized=copy("orbit-world");
      if(stylized.recipeId!=="orbit-world")throw Error("wrong fixture");
      stylized.content.placement="stylized";
      delete stylized.content.globe;
      expect(()=>validateSceneTemplate(stylized)).toThrow(/globe/);
    });
    it("keeps destination markers, camera and route on the same rotating globe", () => {
      const spec=copy("orbit-world");
      const view=render(<SceneTemplateView spec={spec} frame={0}/>);
      const globe=()=>view.container.querySelector<HTMLElement>("[data-km-geographic-globe]");
      const lon0=Number(globe()?.dataset.kmGlobeCameraLon);
      const tokyo=view.container.querySelector('[data-km-world-location="tokyo"]');
      expect(tokyo).not.toBeNull();
      expect(view.container.querySelector("[data-km-geodesic-route]")).not.toBeNull();
      expect(view.container.querySelectorAll("[data-km-coastline]").length).toBeGreaterThan(15);
      const grid0=view.container.querySelector("svg path")?.getAttribute("d");
      view.rerender(<SceneTemplateView spec={spec} frame={119}/>);
      const lon1=Number(globe()?.dataset.kmGlobeCameraLon);
      const grid1=view.container.querySelector("svg path")?.getAttribute("d");
      expect(lon0).not.toBe(lon1);
      expect(grid0).not.toBe(grid1);
      expect(view.container.querySelector('[data-km-world-location="london"]')).not.toBeNull();
    });
    it("orbiting subject is driven by absolute frame instead of wall-clock CSS", () => {
      const spec=copy("orbit-world");
      const view=render(<SceneTemplateView spec={spec} frame={10}/>);
      const get=()=>view.container.querySelector<HTMLElement>("[data-km-orbiting-subject]");
      const x=get()?.style.left;
      view.rerender(<SceneTemplateView spec={spec} frame={70}/>);
      expect(get()?.style.left).not.toBe(x);
    });
    it("glass panes enter with timed translation and preserve reduced motion", () => {
      const spec=copy("glass-data-reveal");
      const view=render(<SceneTemplateView spec={spec} frame={60}/>);
      const pane=()=>view.container.querySelector<HTMLElement>('[data-km-motion="glass-pane-refract"]');
      expect(pane()).not.toBeNull();
      view.rerender(<SceneTemplateView spec={spec} frame={60} reducedMotion/>);
      expect(Number(pane()?.dataset.kmMotionProgress)).toBe(1);
    });
    it("QA fixtures use distinct source illustrations for UI, globe, evidence and machines", () => {
      const ui=copy("demonstration");
      const world=copy("orbit-world");
      const evidence=copy("evidence-reveal");
      const cutaway=copy("layered-cutaway");
      if(ui.recipeId!=="demonstration"||world.recipeId!=="orbit-world"||
        evidence.recipeId!=="evidence-reveal"||cutaway.recipeId!=="layered-cutaway")
          throw new Error("fixture IDs changed");
      const sources=[ui.content.setup.src,world.content.globe!.src,
        evidence.content.evidence.src,cutaway.content.object.src];
      expect(new Set(sources).size).toBe(4);
      expect(sources.every(src=>src.startsWith("data:image/svg+xml"))).toBe(true);
    });
  });

});
