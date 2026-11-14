import type { Meta } from "@storybook/react-vite";
import { CrayonPlayground } from "./crayon-scene-playground";
import type { PlaygroundProps } from "./crayon-scene-playground";

/** Single typed defaults and control contract shared by the curated Crayon directors. */
export const crayonSceneDefaultArgs:PlaygroundProps = {subject:"water-cycle",aspect:"landscape",seed:54,paperTooth:.64,reducedMotion:false,startFrame:239,stride:1,stepLift:1,rig:"drawn",playbackRate:1.2,loop:false,drawOrder:"outline-first",outlineFraction:.31,waxGlaze:.17,wingPower:1,villageDetail:.85,followThrough:7,cast:"trio",dragonPalette:"teal",shot:"wide",redrawStrength:.68,exposureFrames:3,nibStyle:"tapered",strokeOrder:"patches",markLength:"long",editorialDetail:1,wildlifeDetail:1,wildlifeEarMotion:1,wildlifeCrop:"composition"};

export const crayonSceneArgTypes:NonNullable<Meta<typeof CrayonPlayground>["argTypes"]> = {
    subject:{control:"inline-radio",options:["water-cycle","city","numbers","performance","walk","draw-in","dragon-village","wildlife-portrait"]},
    aspect:{control:"inline-radio",options:["landscape","portrait"]},
    seed:{control:{type:"number",min:0,max:10000,step:1}},
    paperTooth:{control:{type:"range",min:0,max:1,step:.05}},
    nibStyle:{control:"inline-radio",options:["tapered","rounded"]},
    strokeOrder:{control:"inline-radio",options:["patches","scanline"]},
    markLength:{control:"inline-radio",options:["long","short"]},
    editorialDetail:{control:{type:"range",min:0,max:1,step:.1}},
    wildlifeDetail:{control:{type:"range",min:0,max:1,step:.1}},
    wildlifeEarMotion:{control:{type:"range",min:0,max:2,step:.1}},
    wildlifeCrop:{control:"inline-radio",options:["composition","eye","fur","muzzle","ear"]},
    stride:{control:{type:"range",min:.6,max:1.6,step:.1}},
    stepLift:{control:{type:"range",min:.6,max:1.8,step:.1}},
    rig:{control:"inline-radio",options:["drawn","ik"]},
    drawOrder:{control:"inline-radio",options:["outline-first","fill-first"]},
    outlineFraction:{control:{type:"range",min:.1,max:.75,step:.05}},
    waxGlaze:{control:{type:"range",min:0,max:.45,step:.03}},
    wingPower:{control:{type:"range",min:.5,max:1.6,step:.1}},
    villageDetail:{control:{type:"range",min:.25,max:1,step:.05}},
    followThrough:{control:{type:"range",min:0,max:18,step:1}},
    redrawStrength:{control:{type:"range",min:0,max:1,step:.05}},
    exposureFrames:{control:"inline-radio",options:[2,3,4,5,6]},
    cast:{control:"inline-radio",options:["duo","trio"]},
    dragonPalette:{control:"inline-radio",options:["teal","copper","plum"]},
    shot:{control:"inline-radio",options:["wide","dragon","architecture"]},
    playbackRate:{control:{type:"range",min:.25,max:2,step:.25}},
    loop:{control:"boolean"},
    reducedMotion:{control:"boolean"},
    startFrame:{control:{type:"range",min:0,max:449,step:1}},
  };


/** Keep Storybook's Controls panel focused on the actual subject being reviewed.
 * Unrelated rig/art controls are hidden, not removed from the reusable renderer.
 * All directors remain inside Video production / Film Looks / Crayon.
 */
export type CrayonDirector="scenes"|"wildlife"|"acting"|"walk"|"draw-in"|"dragon";
const crayonSharedControls:readonly (keyof PlaygroundProps)[]=[
  "aspect","seed","paperTooth","nibStyle","strokeOrder","markLength",
  "startFrame","playbackRate","loop","reducedMotion",
];
const crayonFocusedControls:Record<CrayonDirector,readonly (keyof PlaygroundProps)[]>={
  scenes:["subject"],
  wildlife:["wildlifeDetail","wildlifeEarMotion","wildlifeCrop"],
  acting:["editorialDetail"],
  walk:["rig","stride","stepLift"],
  "draw-in":["drawOrder","outlineFraction","waxGlaze"],
  dragon:["cast","dragonPalette","shot","wingPower","villageDetail",
    "followThrough","redrawStrength","exposureFrames"],
};
const crayonPlaybackKeys=new Set(["startFrame","playbackRate","loop","reducedMotion"]);
const crayonMaterialKeys=new Set(["seed","paperTooth","nibStyle","strokeOrder","markLength"]);

/** Preserve the underlying playable scene API while reducing irrelevant knobs. */
export function crayonDirectorArgTypes(director:CrayonDirector,finalFrame:number):
  NonNullable<Meta<typeof CrayonPlayground>["argTypes"]> {
  if(!Number.isSafeInteger(finalFrame)||finalFrame<1) {
    throw new RangeError("Crayon director needs a positive final frame");
  }
  const visible=new Set<string>([...crayonSharedControls,...crayonFocusedControls[director]]);
  return Object.fromEntries(Object.entries(crayonSceneArgTypes).map(([name,config])=>{
    if(!visible.has(name)) return [name,{control:false,table:{disable:true}}];
    const category=crayonPlaybackKeys.has(name)?"Playback":
      crayonMaterialKeys.has(name)?"Wax & Paper":
      name==="aspect"?"Canvas":"Subject & Acting";
    return [name,{
      ...config,
      ...(name==="startFrame"?{control:{type:"range",min:0,max:finalFrame,step:1}}:{}),
      table:{category},
    }];
  })) as NonNullable<Meta<typeof CrayonPlayground>["argTypes"]>;
}
