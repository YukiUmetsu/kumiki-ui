import { useId } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Paper, WaxLine, WaxRegion } from "../../registry/video/materials/crayon-react";

/** Original two-character optical study: same character and wax, different underpainting. */
interface MaterialStudyProps {
  frame:number; pressure:number; paperTooth:number; left:"open"|"opaque";
  right:"open"|"opaque"; underlay:"cobalt"|"coral";
}
const headD="M-94 20Q-113 -49 -67 -89L-78 -145Q-41 -143 -13 -120L23 -151Q66 -132 70 -92Q132 -71 111 24Q85 99 -2 105Q-85 101 -94 20Z";
const ink="#48576b";
function MaterialStudy({frame,pressure,paperTooth,left,right,underlay}:MaterialStudyProps){
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const tooth="crayon-optics-"+id;
  const base=underlay==="cobalt" ? "#365f9b" : "#b65a69";
  const contrast=underlay==="cobalt" ? "#df7e91" : "#4b8f9a";
  const character=(cx:number,coverage:"open"|"opaque",seed:number)=>(
    <g key={cx} transform={"translate("+cx+" 295)"} data-km-crayon-optics-actor={coverage}>
      <WaxRegion d={headD} bounds={{x:-120,y:-158,width:250,height:266}}
        colors={["#e4a271","#a76f72","#f7cf97"]}
        coverage={coverage} seed={seed} pressure={pressure} spacing={7}
        tooth={tooth} frame={frame} first={0} last={100} reduced={false}
        construction={{order:"outline-first",outlineFraction:.17,glaze:.19}} />
      <WaxLine d="M-62 -60Q-29 -79 -6 -58M29 -60Q50 -76 67 -54"
        color={ink} width={4} seed={seed+1} frame={frame}
        first={72} last={113} reduced={false}/>
      <WaxLine d="M-7 21Q26 38 58 11" color="#855b5b" width={4}
        seed={seed+2} frame={frame} first={86} last={113} reduced={false}/>
      <path d="M15 -13l9 5-10 8Z" fill="#664e58"/>
    </g>
  );
  return <div style={{padding:22,background:"#eee7d9",color:"#3d4b5e",fontFamily:"system-ui",maxWidth:1020}}>
    <h3 style={{fontFamily:"Georgia,serif",fontSize:24,margin:"0 0 8px"}}>Why finished crayon characters need opaque pigment</h3>
    <p style={{fontSize:14,maxWidth:770,margin:"0 0 14px"}}>
      The same creature is drawn over high-contrast stripes with two material settings.
      Open scumble suits the atmosphere; solid wax blocks the scenery without losing hand-laid stroke texture.
    </p>
    <svg data-km-crayon-optics="" viewBox="0 0 960 540" role="img"
      aria-label="Two crayon creature drawings on striped paper, comparing see-through and opaque wax underpainting"
      style={{width:"100%",display:"block",background:"#faf1da",border:"9px solid #fff8eb",boxSizing:"border-box"}}>
      <Paper width={960} height={540} seed={193} strength={paperTooth} tooth={tooth}/>
      <rect x="100" y="121" width="760" height="315" fill={base}/>
      {Array.from({length:14},(_,i)=><rect key={i}
        data-km-optics-background-stripe="" x={100+i*55} y={121} width={22} height={315} fill={contrast}/>)}
      {character(300,left,401)}
      {character(671,right,401)}
      <rect x="92" y="453" width="352" height="46" rx="5" fill="#fff4e3"/>
      <rect x="518" y="453" width="352" height="46" rx="5" fill="#fff4e3"/>
      <text x="268" y="483" fill="#46576b" fontFamily="Georgia,serif"
        fontWeight={700} fontSize={19} textAnchor="middle">{left==="open"?"OPEN SCRUMBLE":"OPAQUE WAX"}</text>
      <text x="694" y="483" fill="#46576b" fontFamily="Georgia,serif"
        fontWeight={700} fontSize={19} textAnchor="middle">{right==="open"?"OPEN SCRUMBLE":"OPAQUE WAX"}</text>
    </svg>
    <p style={{fontSize:12,color:"#67717b",margin:"12px 0 0"}}>
      The solid body is built from a fully occluding color layer and separately masked strokes. Frame scrubbing, tooth and pressure are deterministic.
    </p>
  </div>;
}
const meta={
  title:"Video production/Film Looks/Crayon/Material Studies",
  id:"video-crayon-material-studies",
  component:MaterialStudy,
  args:{frame:115,pressure:.84,paperTooth:.72,left:"open",right:"opaque",underlay:"cobalt"},
  argTypes:{
    frame:{control:{type:"range",min:0,max:120,step:1}},
    pressure:{control:{type:"range",min:.25,max:1,step:.05}},
    paperTooth:{control:{type:"range",min:0,max:1,step:.05}},
    left:{control:"inline-radio",options:["open","opaque"]},
    right:{control:"inline-radio",options:["open","opaque"]},
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
