/**
 * Four-shot original PAPER-D1 studio proof.
 * References guide paper construction, not source silhouettes or characters.
 * Reuses verified botanical, landscape, architecture and device paper stock.
 */
import { paperScenerySpec } from "../../registry/video/paper-scenery-kit";
import { paperBotanicalSpec } from "../../registry/video/paper-botanical-kit";
import { paperObjectSpec } from "../../registry/video/paper-object-kit";
import type { PaperStyle, PaperCraftSpec, PaperCutLayer, PaperPoseKey } from "../../registry/video/paper-craft";
import type { PaperDirectorFilm, PaperDirectorAspect, PaperDirectorTransition } from "../../registry/video/paper-director";

const pose=(intensity:number):readonly PaperPoseKey[]=>[
  {frame:0,x:-14*intensity,y:5*intensity,angle:0,ease:"smooth"},
  {frame:120,x:3*intensity,y:-4*intensity,angle:0,ease:"smooth"},
  {frame:239,x:13*intensity,y:-7*intensity,angle:0},
];
const camera=(width:number,intensity:number,sign:number)=>[
  {frame:0,x:0,y:0,zoom:1,ease:"smooth" as const},
  {frame:145,x:sign*width*.022*intensity,y:-6*intensity,zoom:1+.042*intensity,ease:"smooth" as const},
  {frame:239,x:sign*width*.028*intensity,y:-8*intensity,zoom:1+.063*intensity,ease:"smooth" as const},
];
function animate(spec:PaperCraftSpec,kind:"woodland"|"botanical"|"houses"|"camera",intensity:number):PaperCraftSpec {
  const layers=spec.layers.map((layer:PaperCutLayer):PaperCutLayer=>{
    // All moth components must share one translation; independent wing
    // flutter remains on its existing real hinge. No floating disconnected art.
    if (kind==="botanical" && layer.id==="moth-abdomen") return {
      ...layer, pivot:layer.pivot ?? [spec.width/2,spec.height/2],
      poseKeys:[
        {frame:0,x:-14*intensity,y:5*intensity,angle:-2*intensity,ease:"smooth"},
        {frame:120,x:3*intensity,y:-4*intensity,angle:1.5*intensity,ease:"smooth"},
        {frame:239,x:13*intensity,y:-7*intensity,angle:-.6*intensity},
      ],
    };
    // Existing moth cutouts sit in the same world sheet. Inherit their
    // single root pose while preserving independent wing flap hinge tracks.
    if (kind==="botanical" && layer.id.startsWith("moth-")) return {
      ...layer, parentId:"moth-abdomen",
      pivot:layer.pivot ?? [spec.width/2,spec.height/2],
    };
    if (kind==="woodland" && layer.id==="woodland-stream-surface-highlights")
      return {...layer,poseKeys:pose(.4*intensity)};
    if (kind==="houses" && layer.id==="canal-water-highlight")
      return {...layer,poseKeys:pose(.55*intensity)};
    return layer;
  });
  // Editorial cut to a finished stage: keep paper pose keys and camera
  // choreography, but never cut to a blank progressive-assembly frame.
  return {...spec,startAssembled:true,layers,cameraKeys:camera(spec.width,intensity,
    kind==="woodland"||kind==="camera"?-1:1)};
}
/** A reusable director film: four material subjects, four edits, two orientations. */
export function paperDirectorDemo(
  medium:PaperStyle="layered",seed=37,motionIntensity=.7,curtains=true,
  transitionStyle:"curtain"|"page-turn"="curtain",
):PaperDirectorFilm {
  if (!Number.isSafeInteger(seed))throw new RangeError("Director demo seed must be safe integer");
  if (!Number.isFinite(motionIntensity)||motionIntensity<0||motionIntensity>1)
    throw new RangeError("Director demo motion intensity must be finite 0–1");
  if(typeof curtains!=="boolean")throw new RangeError("Director paper curtains must be boolean");
  if(transitionStyle!=="curtain"&&transitionStyle!=="page-turn")
    throw new RangeError("Director requires a known paper transition style");
  const specs=(kind:"woodland"|"botanical"|"houses"|"camera")=>{
    const per=(aspect:PaperDirectorAspect):PaperCraftSpec=>{
      const base=kind==="woodland"
        ? paperScenerySpec(medium,aspect,{scenery:"woodland",palette:"sage",detail:1,seed,breeze:.32,relief:.9})
        : kind==="botanical"
        ? paperBotanicalSpec(medium,aspect,{palette:"rainforest",detail:1,colorLayers:1,seed})
        : paperObjectSpec(medium,aspect,{object:kind==="houses"?"canal-houses":"camera",
          palette:kind==="houses"?"pastel":"heritage",detail:1,motion:.6,relief:1,seed});
      return animate(base,kind,motionIntensity);
    };
    return {landscape:per("landscape"),portrait:per("portrait")};
  };
  const edit=(color:string,direction:"left-to-right"|"right-to-left"):PaperDirectorTransition|undefined=>
    curtains?{kind:transitionStyle==="page-turn"?"paper-page-turn":"paper-curtain",
      durationFrames:24,color,direction}:undefined;
  return {version:1,id:"material-paper-tour",shots:[
    {id:"woodland-light",scenes:specs("woodland"),transitionOut:edit("#E8CEAA","left-to-right")},
    {id:"botanical-wing",scenes:specs("botanical"),transitionOut:edit("#A5C7AE","right-to-left")},
    {id:"city-layering",scenes:specs("houses"),transitionOut:edit("#F1D0BB","left-to-right")},
    {id:"constructed-device",scenes:specs("camera")},
  ]};
}
