import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SceneTemplateView } from "../../../registry/video/scene-templates-react";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { DEMO_SCENES, semanticBeats } from "./scene-template-fixtures";
import { renderOriginalSceneCharacter } from "./scene-original-character";

function Preview({recipeId}:{recipeId:keyof typeof DEMO_SCENES}) {
  const fixture=DEMO_SCENES[recipeId];
  const lastFrame=fixture.durationFrames-1;
  const beats=semanticBeats(fixture);
  const [frame,setFrame]=useState(beats[3]);
  const [aspect,setAspect]=useState<"wide"|"portrait">("wide");
  const [reduced,setReduced]=useState(false);
  const spec=useMemo(() => ({...DEMO_SCENES[recipeId],
    width:aspect==="wide"?960:540,height:aspect==="wide"?540:960,
    reducedMotion:reduced}) as SceneTemplateSpec,[recipeId,aspect,reduced]);
  return <main className="min-h-screen bg-canvas px-6 py-8 text-foreground">
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <header><p className="text-xs uppercase tracking-widest text-muted-foreground">Scene recipes · ST1</p>
        <h1 className="font-serif text-heading">{recipeId.split("-").join(" ")}</h1>
        <p className="text-sm text-muted-foreground">Editable visual recipe with an absolute-frame timeline · illustrative assets only</p></header>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" aria-pressed={aspect==="wide"} onClick={()=>setAspect("wide")}
          className="rounded-control border border-border px-4 py-2 text-sm">16:9</button>
        <button type="button" aria-pressed={aspect==="portrait"} onClick={()=>setAspect("portrait")}
          className="rounded-control border border-border px-4 py-2 text-sm">9:16</button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>Reduced motion
        </label>
        <span className="text-sm text-muted-foreground">Frame {frame}/{lastFrame}</span>
      </div>
      <div className="mx-auto w-full" style={{maxWidth:aspect==="wide"?"1100px":"460px"}}>
        <SceneTemplateView spec={spec} frame={frame}
          renderAsset={recipeId==="character-discovery"?renderOriginalSceneCharacter:undefined} />
      </div>
      <label className="flex flex-col gap-2 text-sm">
        <span>Seek the scene · establish → focus → reveal → resolve</span>
        <input type="range" min={0} max={lastFrame} value={frame} onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <div className="flex flex-wrap gap-2">
        {beats.map(v=><button type="button" key={v} onClick={()=>setFrame(v)}
          className="rounded-control border border-border px-3 py-1 text-sm">Frame {v}</button>)}
      </div>
      <p className="text-sm text-muted-foreground">Generated SVG fixtures; Character Discovery uses Cove, an original articulated vector puppet, for consistent preview and video export without third-party sprite rights.</p>
    </div>
  </main>;
}
const meta={tags:["!dev","!autodocs","!test"],title:"Motion/Scene Templates",component:SceneTemplateView,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof SceneTemplateView>;
export default meta;
type Story=StoryObj<typeof meta>;
export const QuestionReveal: Story={
  args:{spec:DEMO_SCENES["question-reveal"],frame:90},
  render:()=> <Preview recipeId="question-reveal"/>,
};
export const HiddenDetail: Story={
  args:{spec:DEMO_SCENES["hidden-detail"],frame:90},
  render:()=> <Preview recipeId="hidden-detail"/>,
};
export const BeforeAfter: Story={
  args:{spec:DEMO_SCENES["before-after"],frame:90},
  render:()=> <Preview recipeId="before-after"/>,
};
export const SideBySide: Story={
  args:{spec:DEMO_SCENES["side-by-side"],frame:90},
  render:()=> <Preview recipeId="side-by-side"/>,
};
export const CauseEffect: Story={
  args:{spec:DEMO_SCENES["cause-effect"],frame:90},
  render:()=> <Preview recipeId="cause-effect"/>,
};
export const ScaleReveal: Story={
  args:{spec:DEMO_SCENES["scale-reveal"],frame:90},
  render:()=> <Preview recipeId="scale-reveal"/>,
};
export const ContextToDetail: Story={
  args:{spec:DEMO_SCENES["context-to-detail"],frame:90},
  render:()=> <Preview recipeId="context-to-detail"/>,
};
export const LayeredCutaway: Story={
  args:{spec:DEMO_SCENES["layered-cutaway"],frame:90},
  render:()=> <Preview recipeId="layered-cutaway"/>,
};
export const BuildAndConnect: Story={
  args:{spec:DEMO_SCENES["build-and-connect"],frame:90},
  render:()=> <Preview recipeId="build-and-connect"/>,
};
export const TransformAndTrack: Story={
  args:{spec:DEMO_SCENES["transform-and-track"],frame:90},
  render:()=> <Preview recipeId="transform-and-track"/>,
};
export const TimeEvolution: Story={
  args:{spec:DEMO_SCENES["time-evolution"],frame:90},
  render:()=> <Preview recipeId="time-evolution"/>,
};
export const DataStory: Story={
  args:{spec:DEMO_SCENES["data-story"],frame:90},
  render:()=> <Preview recipeId="data-story"/>,
};
export const ConsequenceChain: Story={
  args:{spec:DEMO_SCENES["consequence-chain"],frame:90},
  render:()=> <Preview recipeId="consequence-chain"/>,
};
export const DecisionBranch: Story={
  args:{spec:DEMO_SCENES["decision-branch"],frame:90},
  render:()=> <Preview recipeId="decision-branch"/>,
};
export const WorkedExample: Story={
  args:{spec:DEMO_SCENES["worked-example"],frame:90},
  render:()=> <Preview recipeId="worked-example"/>,
};
export const Demonstration: Story={
  args:{spec:DEMO_SCENES["demonstration"],frame:90},
  render:()=> <Preview recipeId="demonstration"/>,
};
export const GuidedInspection: Story={
  args:{spec:DEMO_SCENES["guided-inspection"],frame:90},
  render:()=> <Preview recipeId="guided-inspection"/>,
};
export const CharacterDiscovery: Story={
  args:{spec:DEMO_SCENES["character-discovery"],frame:90},
  render:()=> <Preview recipeId="character-discovery"/>,
};
export const EvidenceReveal: Story={
  args:{spec:DEMO_SCENES["evidence-reveal"],frame:90},
  render:()=> <Preview recipeId="evidence-reveal"/>,
};
export const EnvironmentReveal: Story={
  args:{spec:DEMO_SCENES["environment-reveal"],frame:90},
  render:()=> <Preview recipeId="environment-reveal"/>,
};
export const PageTurnStory: Story={
  args:{spec:DEMO_SCENES["page-turn-story"],frame:90},
  render:()=> <Preview recipeId="page-turn-story"/>,
};
export const OrbitWorld: Story={
  args:{spec:DEMO_SCENES["orbit-world"],frame:90},
  render:()=> <Preview recipeId="orbit-world"/>,
};
export const TimelineJourney: Story={
  args:{spec:DEMO_SCENES["timeline-journey"],frame:90},
  render:()=> <Preview recipeId="timeline-journey"/>,
};
export const GlassDataReveal: Story={
  args:{spec:DEMO_SCENES["glass-data-reveal"],frame:90},
  render:()=> <Preview recipeId="glass-data-reveal"/>,
};
