import {useEffect,useMemo,useState} from "react";
import type {ChangeEvent} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import type {FigureRegion} from "../../registry/character/figure-proportion-study";
import {compareFigureRatios,figureRatios,validateFigureReference} from
  "../../registry/character/figure-proportion-study";
import {SHANSHUI_TEACHER_MESHES,SHANSHUI_LEGACY_PUPPET_MESH} from
  "./ink-shanshui-teacher-mesh";
import type {ShanshuiScene} from "../../registry/video/ink-shanshui";
const views=[
  {id:"face" as const,label:"Face, hair and features",
    regions:["hair","skull","face","brow-screen-left","brow-screen-right",
      "eye-screen-left","eye-screen-right","nose","mouth","neck"] as FigureRegion[]},
  {id:"costume" as const,label:"Shoulders, arms and sleeves",
    regions:["torso","arm-screen-left","arm-screen-right","hand-screen-left",
      "hand-screen-right","sleeve-screen-left","sleeve-screen-right",
      "waist","hip","ornament","scroll"] as FigureRegion[]},
  {id:"legs" as const,label:"Robe, legs and feet",
    regions:["robe","leg-screen-left","leg-screen-right",
      "foot-screen-left","foot-screen-right"] as FigureRegion[]},
  {id:"all" as const,label:"Every visible component",
    regions:[] as FigureRegion[]},
];
type Group=(typeof views)[number]["id"];
const dark="#463626",accent="#a74b3c",muted="#74604b";
const inputStyle={background:"#fff8e8",color:dark,border:"1px solid #c8b38e",
  borderRadius:5,padding:"8px 10px"};
function SourcePanel({scene,group,image}:{scene:ShanshuiScene;group:Group;image?:string}){
  const m=SHANSHUI_TEACHER_MESHES[scene];
  const active=views.find(v=>v.id===group)!;
  const visible=(region:string)=>group==="all"||active.regions.includes(region as FigureRegion);
  const space=group==="face"?m.regions.skull??m.figure:m.fullSilhouette;
  const padding=group==="face"?38:28;
  const window={
    x:space.x-padding,y:space.y-padding,
    width:space.width+2*padding,height:space.height+2*padding,
  };
  return <div style={{display:"grid",gap:8}}>
    <div style={{font:"600 13px system-ui"}}>Teacher reference · {m.source.name}</div>
    <svg data-testid="shanshui-teacher-mesh" role="img"
      aria-label={"Measured image-space proportion mesh: "+m.pose}
      viewBox={[window.x,window.y,window.width,window.height].join(" ")}
      style={{display:"block",maxWidth:650,width:"100%",height:490,
        background:"#f6ead5",border:"1px solid #d6c5aa",borderRadius:5}}>
      {image&&<image href={image} width={m.source.width} height={m.source.height}
        x={0} y={0} preserveAspectRatio="none"/>}
      {!image&&<text x={space.x+space.width/2} y={space.y-14}
        fill={muted} textAnchor="middle" fontSize={group==="face"?8:12}>
        Original image not packaged · select local file to overlay
      </text>}
      <rect data-km-teacher-figure="" x={m.figure.x} y={m.figure.y}
        width={m.figure.width} height={m.figure.height}
        fill="none" stroke={accent} strokeWidth={group==="face"?.8:1.5}
        strokeDasharray="5 4" opacity=".75"/>
      {Object.entries(m.regions).filter(([id])=>visible(id)).map(([id,b])=>
        <g key={id} data-km-teacher-region={id}>
          <rect x={b.x} y={b.y} width={b.width} height={b.height}
            fill={id==="face"||id==="skull"?"#da6f2c":"#47918a"}
            fillOpacity={image?.05:.08} stroke={id==="face"||id==="skull"?
              "#b04e27":"#346e6d"} strokeWidth={group==="face"?.8:1.4}
            strokeDasharray={id.includes("sleeve")?"4 3":"none"}/>
        </g>)}
      {Object.entries(m.landmarks).filter(([name])=>{
        if(group==="all")return true;
        const key=(name.startsWith("eye")||name.startsWith("brow")||
          name.startsWith("nose")||name.startsWith("mouth")||
          name.startsWith("head")||name==="chin"||name.startsWith("hair")||
          name.startsWith("bun")||name.startsWith("face")||
          name.startsWith("neck"))?"face":
          (name.startsWith("foot")||name.startsWith("robe")||
           name.startsWith("knee")||name.startsWith("ankle"))?"legs":"costume";
        return group===key;
      }).map(([id,p])=>
        <g key={id} data-km-teacher-point={id}>
          <circle cx={p.point.x} cy={p.point.y}
            r={group==="face"?1.25:2.4}
            fill={p.confidence==="clear"?"#18634c":"#b25135"} />
          <title>{id} · {p.confidence} ±{p.tolerancePx} px</title>
        </g>)}
    </svg>
    <div style={{fontSize:12,color:muted}}>
      Image coordinates · confidence and occlusion preserved · no hidden knees invented
    </div>
  </div>;
}
function StudentPanel({scene}:{scene:ShanshuiScene}){
  const m=SHANSHUI_LEGACY_PUPPET_MESH;
  const compare=compareFigureRatios(SHANSHUI_TEACHER_MESHES[scene],m,.13);
  const review=compare.filter(row=>row.status==="review-required");
  const skipped=compare.filter(row=>row.status==="unobservable");
  return <div style={{minWidth:350,flex:"1 1 420px",display:"grid",gap:9}}>
    <h2 style={{margin:0,font:"500 23px Georgia,serif"}}>
      Teacher vs legacy actor
    </h2>
    <p style={{fontSize:12,color:muted,margin:0}}>
      Both panels represent projected artwork measurements. Different poses
      and camera perspectives affect these ratios; flagged values request
      an artist review, not automatic rig corrections.
    </p>
    <div style={{display:"flex",gap:10,font:"600 12px system-ui",color:muted}}>
      <span>{review.length} ratios need review</span>
      <span>{skipped.length} cannot be measured</span>
    </div>
    <table data-testid="shanshui-proportion-table"
      style={{borderCollapse:"collapse",width:"100%",font:"12px/1.6 system-ui"}}>
      <thead><tr style={{borderBottom:"2px solid #bc9e76",textAlign:"left"}}>
        <th>Projected ratio</th><th>Teacher</th><th>Old rig</th><th>Diff.</th>
      </tr></thead>
      <tbody>{compare.map(row=>
        <tr key={row.id} data-km-proportion-status={row.status}
          style={{borderBottom:"1px solid #d7c6ae",color:row.status==="review-required"?
            "#8b4130":dark}}>
          <td>{row.label}</td>
          <td>{row.teacher===null?"Hidden":row.teacher.toFixed(3)}</td>
          <td>{row.student===null?"Unknown":row.student.toFixed(3)}</td>
          <td>{row.relativeError===null?"—":
            Math.round(row.relativeError*100)+"%"}</td>
        </tr>)}</tbody>
    </table>
    <p style={{fontSize:12,color:muted,margin:0}}>
      *Difference is relative projected-ratio error, not a face-recognition score.
      Hidden leg joints and concealed hands are explicitly unobservable.
    </p>
  </div>;
}
function FigureInspector(){
  const [scene,setScene]=useState<ShanshuiScene>("river-scholar");
  const [group,setGroup]=useState<Group>("all");
  const [image,setImage]=useState<string|undefined>();
  const [error,setError]=useState<string|undefined>();
  const m=SHANSHUI_TEACHER_MESHES[scene];
  useEffect(()=>()=>{if(image)URL.revokeObjectURL(image)},[image]);
  const issues=useMemo(()=>validateFigureReference(m),[m]);
  const choose=(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];if(!file)return;
    if(!file.type.startsWith("image/")){
      setError("Select a supported local image file.");return;
    }
    // Never sends user artwork to a server. Browser blob URL is local to the tab.
    const blob=URL.createObjectURL(file);
    setError(undefined);setImage(blob);
  };
  const onScene=(event:ChangeEvent<HTMLSelectElement>)=>{
    setImage(undefined);setScene(event.target.value as ShanshuiScene);
  };
  return <main style={{minHeight:"100vh",padding:22,background:"#efe6d5",
    color:dark,font:"14px/1.5 system-ui",display:"grid",gap:20,
    alignContent:"start"}}>
    <header style={{maxWidth:920}}>
      <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",
        color:"#926544"}}>Video Production / Film Looks / Chinese Ink</div>
      <h1 style={{font:"400 31px Georgia,serif",margin:"8px 0"}}>
        Scholar proportion laboratory
      </h1>
      <p style={{margin:0,color:muted}}>
        The three uploaded teacher paintings describe <strong>three different
        characters</strong>. Original-resolution measurements cover eyes, brows,
        nose, mouth, hair, arms, sleeve masses, robe and visible feet. No
        invented hidden leg or joint positions.
      </p>
    </header>
    <div style={{display:"flex",flexWrap:"wrap",gap:14,alignItems:"end"}}>
      <label style={{display:"grid",gap:5}}>Teacher figure
        <select aria-label="Teacher figure" style={inputStyle} value={scene}
          onChange={onScene}>
          <option value="misty-hermit">Old bearded hermit</option>
          <option value="river-scholar">Young scroll reader</option>
          <option value="mountain-trail">Young contemplative walker</option>
        </select>
      </label>
      <label style={{display:"grid",gap:5}}>Study region
        <select aria-label="Teacher region" value={group} style={inputStyle}
          onChange={e=>setGroup(e.target.value as Group)}>
          {views.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:5}}>Optional image (stays local)
        <input aria-label="Load matching teacher image" type="file" accept="image/*"
          onChange={choose} style={{fontSize:12,maxWidth:250}}/>
      </label>
    </div>
    {error&&<div role="alert" style={{color:"#a93427"}}>{error}</div>}
    <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"start"}}>
      <div style={{flex:"1 1 410px",minWidth:330}}>
        <SourcePanel scene={scene} group={group} image={image}/>
      </div>
      <StudentPanel scene={scene}/>
    </div>
    <section style={{maxWidth:950}}>
      <h2 style={{font:"500 21px Georgia,serif",margin:"0 0 8px"}}>
        Design-specific observations
      </h2>
      <ul style={{margin:"0 0 14px",paddingLeft:24}}>
        {m.notes.map((note,i)=><li key={i}>{note}</li>)}
      </ul>
      <div style={{fontSize:12,color:muted}}>
        {Object.keys(m.landmarks).length} visible landmark estimates ·
        {" "}{Object.keys(m.occluded).length} explicitly unobservable parts ·
        {" "}{figureRatios(m).filter(x=>x.support!=="unobservable").length}
        {" "}projected proportion ratios ·
        {" "}{issues.length?issues.join("; "):"Reference mesh valid"}
      </div>
    </section>
  </main>;
}
const meta={title:"Video production/Film Looks/Chinese Ink/Scholar Proportion Study",
  id:"video-ink-scholar-proportions",
  component:FigureInspector,parameters:{layout:"fullscreen"}} satisfies Meta<typeof FigureInspector>;
export default meta;
export const ThreeTeacherFigureStudies:StoryObj<typeof meta>={
  name:"Three teacher-image meshes · face, garment and anatomy",
};
