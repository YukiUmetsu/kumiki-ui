import { useId } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Paper, WaxLine, WaxRegion } from "../../registry/video/materials/crayon-react";
import type {CrayonNibStyle} from "../../registry/video/materials/crayon";

/** Original two-character optical study: same character and wax, different underpainting. */
interface MaterialStudyProps {
  frame:number; pressure:number; paperTooth:number; left:"open"|"opaque";
  right:"open"|"opaque"; underlay:"cobalt"|"coral";
  leftNib:CrayonNibStyle; rightNib:CrayonNibStyle;
  strokeOrder:"scanline"|"patches";
  pressureSplit:boolean;
  /** A/B comparison: left uses historic scanline, right uses local hand strokes. */
  compareStrokeOrder:boolean;
  sgraffitoComparison?:boolean;
  leftLength:"long"|"short";rightLength:"long"|"short";
}
const headD="M-94 20Q-113 -49 -67 -89L-78 -145Q-41 -143 -13 -120L23 -151Q66 -132 70 -92Q132 -71 111 24Q85 99 -2 105Q-85 101 -94 20Z";
const ink="#48576b";
export function MaterialStudy({frame,pressure,paperTooth,left,right,underlay,leftNib,rightNib,
  strokeOrder,pressureSplit,compareStrokeOrder,sgraffitoComparison,leftLength,rightLength}:MaterialStudyProps){
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const tooth="crayon-optics-"+id;
  const base=underlay==="cobalt" ? "#365f9b" : "#b65a69";
  const contrast=underlay==="cobalt" ? "#df7e91" : "#4b8f9a";
  const studyTitle=sgraffitoComparison ? "Subtractive sgraffito / carved wax layers" :
    compareStrokeOrder ? "Hand-painted patches versus scanline reveal" :
    pressureSplit ? "Pressure against real paper tooth" :
    leftLength!==rightLength ? "Long wax rubbing versus short wax flecks" :
    "Why finished crayon characters need opaque pigment";
  const studyCaption=sgraffitoComparison ?
    "A sharp stylus removes the upper pigment to expose an opaque warm wax layer. No bright ink is painted over the surface." :
    compareStrokeOrder ?
    "The same wax marks, seed, pressure and paper. Only the painting order differs." :
    pressureSplit ? "Light contact catches the ridges; firm contact fills more of the paper." :
    leftLength!==rightLength ? "Long gestural rubbing reduces isolated digital flecks, keeping the page grain." :
    "Open scumble suits the atmosphere; solid wax blocks scenery without losing hand-laid texture.";
  const character=(cx:number,coverage:"open"|"opaque",seed:number,nibStyle:CrayonNibStyle,markLength:"long"|"short")=>(
    <g key={cx} transform={"translate("+cx+" 295)"} data-km-crayon-optics-actor={coverage}>
      <WaxRegion d={headD} bounds={{x:-120,y:-158,width:250,height:266}}
        colors={["#e4a271","#a76f72","#f7cf97"]}
        coverage={coverage} nibStyle={nibStyle}
        strokeOrder={compareStrokeOrder?(cx<500?"scanline":"patches"):strokeOrder}
        markLength={markLength} seed={seed}
        sgraffito={sgraffitoComparison&&cx>500?{
          d:"M-67 -27Q-35 -4 5 16M-54 -49Q-4 -13 43 -2"+
            "M-44 0Q4 43 61 11M-75 -1Q-30 25 16 36",
          width:2.35,first:102,last:115}:undefined}
        pressure={pressureSplit?(cx<500?pressure*.43:Math.min(1,pressure*1.16)):pressure} spacing={7}
        tooth={tooth} frame={frame} first={0} last={100} reduced={false}
        construction={{order:"outline-first",outlineFraction:.17,glaze:.19}} />
      <WaxLine d="M-62 -60Q-29 -79 -6 -58M29 -60Q50 -76 67 -54"
        color={ink} width={4} seed={seed+1} frame={frame}
        first={72} last={113} reduced={false}/>
      <WaxLine d="M-7 21Q26 38 58 11" color="#855b5b" width={4}
        seed={seed+2} frame={frame} first={86} last={113} reduced={false}/>
      {frame>=86 && <g data-km-crayon-optics-nose=""
        data-km-crayon-optics-nose-phase={frame>=108?"finished":"drawing"}>
        <WaxRegion d="M15 -13L24 -8L14 0Z"
          bounds={{x:10,y:-16,width:18,height:20}}
          colors={["#664e58","#5b4651","#90716c"]}
          coverage="opaque" nibStyle="tapered" markLength="short"
          strokeOrder="patches" outlineOpacity={.24}
          seed={seed+3} pressure={.94} spacing={4.3}
          tooth={tooth} frame={frame} first={86} last={108}
          reduced={false}/>
      </g>}
    </g>
  );
  return <div style={{padding:22,background:"#eee7d9",color:"#3d4b5e",fontFamily:"system-ui",maxWidth:1020}}>
    <h3 style={{fontFamily:"Georgia,serif",fontSize:24,margin:"0 0 8px"}}>{studyTitle}</h3>
    <p style={{fontSize:14,maxWidth:770,margin:"0 0 14px"}}>
      {studyCaption}
    </p>
    <svg data-km-crayon-optics="" viewBox="0 0 960 540" role="img"
      aria-label={studyTitle+" on identical original wax creature drawings"}
      style={{width:"100%",display:"block",background:"#faf1da",border:"9px solid #fff8eb",boxSizing:"border-box"}}>
      <Paper width={960} height={540} seed={193} strength={paperTooth} tooth={tooth}/>
      <rect x="100" y="121" width="760" height="315" fill={base}/>
      {Array.from({length:14},(_,i)=><rect key={i}
        data-km-optics-background-stripe="" x={100+i*55} y={121} width={22} height={315} fill={contrast}/>)}
      {character(300,left,401,leftNib,leftLength)}
      {character(671,right,401,rightNib,rightLength)}
      <rect x="92" y="453" width="352" height="46" rx="5" fill="#fff4e3"/>
      <rect x="518" y="453" width="352" height="46" rx="5" fill="#fff4e3"/>
      <text x="268" y="483" fill="#46576b" fontFamily="Georgia,serif"
        fontWeight={700} fontSize={19} textAnchor="middle">{sgraffitoComparison?"INTACT TOP WAX":compareStrokeOrder?"SCANLINE REVEAL":pressureSplit?"SOFT WAX · TOOTH":leftLength!==rightLength?(leftLength==="short"?"SHORT WAX FLECKS":"LONG WAX RUBBING"):left==="open"?"OPEN SCRUMBLE":leftNib==="rounded"?"OPAQUE · ROUND":leftNib==="dry"?"OPAQUE · DRY WAX":"OPAQUE · TAPERED"}</text>
      <text x="694" y="483" fill="#46576b" fontFamily="Georgia,serif"
        fontWeight={700} fontSize={19} textAnchor="middle">{sgraffitoComparison?"CARVED / BURIED COLOR":compareStrokeOrder?"HAND-PAINTED PATCHES":pressureSplit?"FIRM WAX · TOOTH":leftLength!==rightLength?(rightLength==="short"?"SHORT WAX FLECKS":"LONG WAX RUBBING"):right==="open"?"OPEN SCRUMBLE":rightNib==="rounded"?"OPAQUE · ROUND":rightNib==="dry"?"OPAQUE · DRY WAX":"OPAQUE · TAPERED"}</text>
    </svg>
    <p style={{fontSize:12,color:"#67717b",margin:"12px 0 0"}}>
      The solid body is built from a fully occluding color layer and separately masked strokes. Frame scrubbing, tooth and pressure are deterministic.
    </p>
  </div>;
}
const meta={
  title:"Video production/Film Looks/Crayon/Materials/Wax & Pigment",
  id:"video-crayon-material-studies",
  // Keep the historical schematic animal heads for A/B regression only; do
  // not present this primitive study as premium character artwork.
  tags:["!dev"],
  component:MaterialStudy,
  args:{frame:115,pressure:.84,paperTooth:.72,left:"open",right:"opaque",
    leftNib:"rounded",rightNib:"tapered",strokeOrder:"patches",
    pressureSplit:false,compareStrokeOrder:false,sgraffitoComparison:false,
    leftLength:"long",rightLength:"long",underlay:"cobalt"},
  argTypes:{
    frame:{control:{type:"range",min:0,max:120,step:1}},
    pressure:{control:{type:"range",min:.25,max:1,step:.05}},
    paperTooth:{control:{type:"range",min:0,max:1,step:.05}},
    left:{control:"inline-radio",options:["open","opaque"]},
    right:{control:"inline-radio",options:["open","opaque"]},
    leftNib:{control:"inline-radio",options:["rounded","tapered","dry"]},
    rightNib:{control:"inline-radio",options:["rounded","tapered","dry"]},
    strokeOrder:{control:"inline-radio",options:["patches","scanline"]},
    pressureSplit:{control:"boolean"},
    compareStrokeOrder:{control:"boolean"},
    sgraffitoComparison:{control:"boolean"},
    leftLength:{control:"inline-radio",options:["long","short"]},
    rightLength:{control:"inline-radio",options:["long","short"]},
    underlay:{control:"inline-radio",options:["cobalt","coral"]},
  },
} satisfies Meta<typeof MaterialStudy>;
export default meta;
type Story=StoryObj<typeof meta>;
export const LayerCoverageComparison:Story={};
export const LayerCoverageCoral:Story={args:{underlay:"coral"}};
export const SolidPigmentOnBoth:Story={args:{left:"opaque",right:"opaque"}};

// Inspect actual deposition around the mid-fill frame before the fully opaque finish.
export const StrokePathUnderpainting:Story={
  args:{left:"opaque",right:"opaque",frame:82,pressure:.92,paperTooth:.74,underlay:"coral"},
};

// Identical opaque silhouette and seed: only the physical nib-contact path changes.
export const NibContactComparison:Story={
  args:{frame:115,left:"opaque",right:"opaque",leftNib:"rounded",rightNib:"tapered",
    pressure:.93,paperTooth:.84,underlay:"cobalt"},
};

/** Same wax marks; only the movement/order of colored hand strokes changes. */
export const LocalColoringVsScanline:Story={
  args:{frame:44,left:"opaque",right:"opaque",leftNib:"tapered",rightNib:"tapered",
    strokeOrder:"patches",compareStrokeOrder:true,pressure:.87,paperTooth:.78},
};

// Identical original drawing/underlay/seed, different wax contact pressure.
// Finished subjects remain opaque despite stronger tooth disruption.
export const PressureAgainstPaperTooth:Story={
  args:{left:"opaque",right:"opaque",frame:115,
    leftNib:"tapered",rightNib:"tapered",strokeOrder:"patches",
    pressure:.92,pressureSplit:true,paperTooth:.94,underlay:"cobalt"},
};

/** Same character and seed, long coherent rubbed gesture versus older flecks. */
export const LongWaxRubbingVsFlecks:Story={
  args:{left:"opaque",right:"opaque",frame:115,pressureSplit:false,
    leftNib:"tapered",rightNib:"tapered",leftLength:"short",rightLength:"long",
    strokeOrder:"patches",pressure:.9,paperTooth:.86},
};

/** Actual top-layer wax removal, not a painted-on pale digital imitation. */
export const SgraffitoCarvedWaxVsIntact:Story={
  args:{left:"opaque",right:"opaque",frame:117,sgraffitoComparison:true,
    leftNib:"tapered",rightNib:"tapered",strokeOrder:"patches",
    leftLength:"long",rightLength:"long",paperTooth:.83,pressure:.9},
};

/** Exact same source geometry and seed, only the dry-contact material differs. */
export const DryWaxNibContactComparison:Story={
  args:{frame:115,left:"opaque",right:"opaque",leftNib:"tapered",rightNib:"dry",
    pressure:.8,paperTooth:.86,underlay:"coral"},
};
