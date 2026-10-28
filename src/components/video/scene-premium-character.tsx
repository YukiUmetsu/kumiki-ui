/// <reference types="vite/client" />
/** Premium rig integration for the Storybook-only character-discovery preview.
 * Pip v1.6 artwork is user-supplied. Ownership and distribution rights must be
 * confirmed before exporting/releasing clips or bundling sprite files.
 */
import type { ReactNode } from "react";
import { CharacterPresenter } from "../../../registry/character/character-presenter-react";
import type { CharacterCue, CharacterInstance } from "../../../registry/character/definition";
import type { ImageAsset, SceneTemplateFrame } from "../../../registry/video/scene-templates";
import { pipAssetFiles, pipCharacter } from "../../character/fixtures/pip";

const PNGS=import.meta.glob("../../character/fixtures/pip-assets-v1-6/**/*.png",{
  eager:true,query:"?url",import:"default",
}) as Record<string,string>;
const assetUrls:Record<string,string>=Object.fromEntries(
  Object.entries(pipAssetFiles).flatMap(([uri,path])=>{
    const url=PNGS["../../character/fixtures/"+path];
    return url?[[uri,url]]:[];
  }),
);
const instance:CharacterInstance={
  instanceId:"scene-pip",characterId:"pip",revision:"r1",seed:27,
};
const cues:readonly CharacterCue[]=[
  {id:"pip-discovery-curious",instanceId:"scene-pip",kind:"expression",startFrame:0,name:"curious"},
  {id:"pip-discovery-question",instanceId:"scene-pip",kind:"action",startFrame:25,name:"question"},
  {id:"pip-discovery-speech",instanceId:"scene-pip",kind:"speech",startFrame:55,endFrame:83,precision:"approximate"},
  {id:"pip-discovery-point",instanceId:"scene-pip",kind:"action",startFrame:90,name:"point"},
];
export function renderCinematicSceneAsset(asset:ImageAsset,frame:SceneTemplateFrame):ReactNode {
  if(asset.id==="character"){
    return <CharacterPresenter definition={pipCharacter} instance={instance}
      assetUrls={assetUrls} cues={cues} frame={frame.frame}
      label="Pip exploring, raising one arm, speaking and pointing"
      reducedMotion={frame.reducedMotion} style={{width:"100%",height:"100%"}}/>;
  }
  return <img alt={asset.alt} src={asset.src} draggable={false}
    style={{width:"100%",height:"100%",display:"block",objectFit:"cover"}}/>;
}
