import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SceneTemplateView } from "../../../registry/video/scene-templates-react";
import { sceneTemplateAssets } from "../../../registry/video/scene-templates";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";
import { DEMO_SCENES } from "./scene-template-fixtures";
import { renderOriginalSceneCharacter } from "./scene-original-character";

function Capture({recipeId}:{recipeId:keyof typeof DEMO_SCENES}) {
  const [frame,setFrame]=useState(0);
  const spec=DEMO_SCENES[recipeId] as SceneTemplateSpec;
  const manifest=useMemo(():VideoExportManifest=>({
    schemaVersion:1,id:"scene-"+recipeId,
    width:spec.width,height:spec.height,fps:spec.fps,durationFrames:spec.durationFrames,
    assets:sceneTemplateAssets(spec).map(asset=>({
      id:asset.id,kind:"image" as const,url:asset.src,licenseRef:asset.licenseRef,
    })),
  }),[recipeId]);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <SceneTemplateView spec={spec} frame={frame} style={{height:"100%"}}
      renderAsset={recipeId==="character-discovery"?renderOriginalSceneCharacter:undefined}/>
  </VideoExportStage>;
}

const meta={tags:["!dev","!autodocs","!test"],title:"Motion/Scene Template Capture",component:SceneTemplateView,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof SceneTemplateView>;
export default meta;
type Story=StoryObj<typeof meta>;
export const QuestionReveal:Story={
  args:{spec:DEMO_SCENES["question-reveal"],frame:0},
  render:()=> <Capture recipeId="question-reveal"/>,
};
export const HiddenDetail:Story={
  args:{spec:DEMO_SCENES["hidden-detail"],frame:0},
  render:()=> <Capture recipeId="hidden-detail"/>,
};
export const BeforeAfter:Story={
  args:{spec:DEMO_SCENES["before-after"],frame:0},
  render:()=> <Capture recipeId="before-after"/>,
};
export const SideBySide:Story={
  args:{spec:DEMO_SCENES["side-by-side"],frame:0},
  render:()=> <Capture recipeId="side-by-side"/>,
};
export const CauseEffect:Story={
  args:{spec:DEMO_SCENES["cause-effect"],frame:0},
  render:()=> <Capture recipeId="cause-effect"/>,
};
export const ScaleReveal:Story={
  args:{spec:DEMO_SCENES["scale-reveal"],frame:0},
  render:()=> <Capture recipeId="scale-reveal"/>,
};
export const ContextToDetail:Story={
  args:{spec:DEMO_SCENES["context-to-detail"],frame:0},
  render:()=> <Capture recipeId="context-to-detail"/>,
};
export const LayeredCutaway:Story={
  args:{spec:DEMO_SCENES["layered-cutaway"],frame:0},
  render:()=> <Capture recipeId="layered-cutaway"/>,
};
export const BuildAndConnect:Story={
  args:{spec:DEMO_SCENES["build-and-connect"],frame:0},
  render:()=> <Capture recipeId="build-and-connect"/>,
};
export const TransformAndTrack:Story={
  args:{spec:DEMO_SCENES["transform-and-track"],frame:0},
  render:()=> <Capture recipeId="transform-and-track"/>,
};
export const TimeEvolution:Story={
  args:{spec:DEMO_SCENES["time-evolution"],frame:0},
  render:()=> <Capture recipeId="time-evolution"/>,
};
export const DataStory:Story={
  args:{spec:DEMO_SCENES["data-story"],frame:0},
  render:()=> <Capture recipeId="data-story"/>,
};
export const ConsequenceChain:Story={
  args:{spec:DEMO_SCENES["consequence-chain"],frame:0},
  render:()=> <Capture recipeId="consequence-chain"/>,
};
export const DecisionBranch:Story={
  args:{spec:DEMO_SCENES["decision-branch"],frame:0},
  render:()=> <Capture recipeId="decision-branch"/>,
};
export const WorkedExample:Story={
  args:{spec:DEMO_SCENES["worked-example"],frame:0},
  render:()=> <Capture recipeId="worked-example"/>,
};
export const Demonstration:Story={
  args:{spec:DEMO_SCENES["demonstration"],frame:0},
  render:()=> <Capture recipeId="demonstration"/>,
};
export const GuidedInspection:Story={
  args:{spec:DEMO_SCENES["guided-inspection"],frame:0},
  render:()=> <Capture recipeId="guided-inspection"/>,
};
export const CharacterDiscovery:Story={
  args:{spec:DEMO_SCENES["character-discovery"],frame:0},
  render:()=> <Capture recipeId="character-discovery"/>,
};
export const EvidenceReveal:Story={
  args:{spec:DEMO_SCENES["evidence-reveal"],frame:0},
  render:()=> <Capture recipeId="evidence-reveal"/>,
};
export const EnvironmentReveal:Story={
  args:{spec:DEMO_SCENES["environment-reveal"],frame:0},
  render:()=> <Capture recipeId="environment-reveal"/>,
};
export const PageTurnStory:Story={
  args:{spec:DEMO_SCENES["page-turn-story"],frame:0},
  render:()=> <Capture recipeId="page-turn-story"/>,
};
export const OrbitWorld:Story={
  args:{spec:DEMO_SCENES["orbit-world"],frame:0},
  render:()=> <Capture recipeId="orbit-world"/>,
};
export const TimelineJourney:Story={
  args:{spec:DEMO_SCENES["timeline-journey"],frame:0},
  render:()=> <Capture recipeId="timeline-journey"/>,
};
export const GlassDataReveal:Story={
  args:{spec:DEMO_SCENES["glass-data-reveal"],frame:0},
  render:()=> <Capture recipeId="glass-data-reveal"/>,
};
