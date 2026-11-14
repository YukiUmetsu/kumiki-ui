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
