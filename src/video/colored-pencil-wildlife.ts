import type { PencilAspect, PencilRegion, PencilTrace } from "../../registry/video/colored-pencil";
import type { PencilSceneSpec } from "../../registry/video/colored-pencil-scene";
import { createPencilMaterialRegion } from "../../registry/video/colored-pencil-materials";
import { createKingfisherActor, KINGFISHER_REBUILT_PARTS } from "./colored-pencil-character-rebuild";
import { flowBundles } from "./colored-pencil-living-studies";

/**
 * Completely rebuilt wildlife artwork — no legacy copper songbird geometry.
 * Study: Claire Milligan original bird work, Andrew Forkner kingfisher colour
 * buildup and Corinne Vuillemin on feather detail and eye structure.
 * A new side-view kingfisher is shared with the two-actor film so character
 * anatomy and pigment materials stay consistent across Storybook.
 */
export { KINGFISHER_REBUILT_PARTS };

const trace=(path:string,color:string,width=1,startFrame=193,
  opacity=.79):PencilTrace=>({path,color,width,startFrame,durationFrames:54,opacity});
const leaf=["#9BAE83","#597B71","#D7D0A4"] as const;
const wood=["#A58B73","#624D4C","#D4B99B"] as const;

function scenery(transform:string):PencilRegion[] {
  return [
    createPencilMaterialRegion({
      id:"perch-bark",surface:"wood",palette:wood,seed:1707,
      path:"M-9 215 C53 208 106 216 165 216 Q255 208 342 202 L419 199 L419 209 Q322 222 258 222 C175 235 94 226 -9 231 Z",
      bounds:[-12,193,434,43],direction:6,flow:9,startFrame:40,
      durationFrames:168,transform,
      details:[
        trace("M5 221 Q71 216 140 224 Q215 230 308 209 M188 222 Q274 219 410 204",
          "#574744",1.3,195),
        trace("M28 217 Q82 215 153 221 M263 218 Q332 213 402 206",
          "#D8C9AD",.83,211),
      ],
    }),
    createPencilMaterialRegion({
      id:"branch-twig",surface:"wood",palette:wood,seed:1733,
      path:"M260 215 Q304 184 342 145 Q362 123 386 116 L397 118 Q360 149 348 165 Q319 206 276 219 Z",
      bounds:[254,111,146,114],direction:-49,flow:14,startFrame:55,
      durationFrames:152,transform,
      details:[
        trace("M278 214 Q335 172 379 122 M316 187 Q342 155 354 147",
          "#DCC7AA",.8,208),
      ],
    }),
    createPencilMaterialRegion({
      id:"leaf-upper",surface:"leaf",palette:leaf,seed:1811,
      path:"M337 158 Q314 121 328 89 Q361 112 363 154 Q357 168 337 158 Z M356 156 Q363 116 400 105 Q391 142 367 161 Z",
      bounds:[309,85,96,82],direction:35,flow:30,startFrame:75,
      durationFrames:154,transform,
      details:[
        trace("M342 155 Q334 118 330 96 M362 154 Q377 124 395 109",
          "#416F61",.96,216),
        ...flowBundles([[330,116,348,152,328,144,8,8]],1921,"#CED3A4",.48,237),
      ],
    }),
    createPencilMaterialRegion({
      id:"leaf-lower",surface:"leaf",palette:leaf,seed:1837,
      path:"M294 197 Q273 178 276 149 Q308 164 316 193 Z M363 181 Q371 150 403 143 Q393 177 375 187 Z",
      bounds:[267,138,140,56],direction:-23,flow:26,startFrame:92,
      durationFrames:154,transform,
      details:[
        trace("M301 191 Q283 163 279 155 M369 181 Q388 152 398 148",
          "#3C6E60",.88,225),
      ],
    }),
  ];
}

export interface PencilWildlifeOptions {
  aspect:PencilAspect;
  paperTooth?:number;
  detail?:"study" | "full";
}

export function pencilWildlifeScene({
  aspect,paperTooth=.68,detail:detailMode="full",
}:PencilWildlifeOptions):PencilSceneSpec {
  if(aspect!=="landscape" && aspect!=="portrait")
    throw new RangeError("Invalid page aspect");
  if(!Number.isFinite(paperTooth) || paperTooth<0 || paperTooth>1)
    throw new RangeError("Paper tooth must be 0–1.");
  if(detailMode!=="study"&&detailMode!=="full")
    throw new RangeError("Invalid wildlife detail profile.");
  const portrait=aspect==="portrait";
  const transform=portrait?"translate(78 267) scale(1.72)":
    "translate(475 84) scale(1.65)";
  const original=createKingfisherActor();
  const wingTracts=flowBundles([
    [135,129,147,185,132,157,21,9],[152,130,166,164,162,148,20,8],
  ],2027,"#D5E9DF",.6,225);
  const crownTracts=flowBundles([
    [106,70,147,71,121,54,21,8],[106,88,147,95,120,76,20,7],
  ],2053,"#AFE3DB",.48,223);
  const actors=[{...original,transform,parts:original.parts.map(part=>{
    const added=part.id==="near-wing"?wingTracts:
      part.id==="head"?crownTracts:[];
    const details=[...(part.region.details??[]),...added];
    return {...part,region:{
      ...part.region,details:detailMode==="full"?
        details:details.filter((_,i)=>i%2===0),
    }};
  })}];
  const width=portrait?540:960,height=portrait?960:540;
  const left=portrait?42:46;
  const annotations:NonNullable<PencilSceneSpec["annotations"]>=[
    {id:"category",type:"text",text:"ARTCRAFT  /  ORIGINAL WILDLIFE",
      at:[left,portrait?75:65],color:"#607873",size:12,
      startFrame:0,durationFrames:12,font:"sans"},
    {id:"headline",type:"text",text:["THE BLUE","KINGFISHER"],
      at:[left,portrait?131:130],color:"#334B55",size:portrait?45:52,
      startFrame:0,durationFrames:18,font:"serif"},
    {id:"caption",type:"text",text:portrait?
      ["Crown, feathers, cobalt, copper.","A living pencil material study."]:
      ["Directional feather tracts, shaped beak,","layered wing and grounded toes."],
      at:[left,portrait?757:281],color:"#607772",size:portrait?16:16,
      startFrame:194,durationFrames:42,font:"serif"},
    {id:"footer",type:"text",text:"STUDY 04 / MATERIAL-NATIVE COLOUR PENCIL",
      at:[left,portrait?914:505],color:"#7B847B",size:12,
      startFrame:0,durationFrames:15,font:"sans"},
    {id:"underline",type:"stroke",path:portrait?
      "M42 232 H496":"M46 329 H397",color:"#B88D78",width:1.05,
      startFrame:30,durationFrames:50,space:"screen"},
  ];
  return {
    version:1,
    drawing:{version:1,width,height,seed:619,paper:"#FAF5EC",paperTooth,
      regions:scenery(transform)},
    actors,annotations,
    camera:{from:[0,0,1],to:portrait?[-5,-2,1.015]:[-7,-2,1.02],
      startFrame:270,durationFrames:150},
  };
}
