import {useEffect,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {InkShanshuiFilm} from "./ink-shanshui-film";
import {InkShanshuiStage} from "../../registry/video/ink-shanshui-react";
import {DEFAULT_SHANSHUI,SHANSHUI_FRAMES,SHANSHUI_REFERENCE_NOTES} from "../../registry/video/ink-shanshui";
import type {ShanshuiControls,ShanshuiScene} from "../../registry/video/ink-shanshui";
import {VideoExportStage} from "../../registry/video/video-export-stage";
import {shanshuiFittedRoute} from "./ink-shanshui-full-body";
import {inkRouteAt} from "../../registry/video/ink-actor-director";
import type {VideoExportManifest} from "../../registry/video/video-export-stage";

/** Original code-drawn shanshui animated film study. The three reference images
 * are art-direction targets only; they are not uploaded or embedded in the code.
 */
const style={
  button:{font:"600 13px system-ui",border:"1px solid #ad9b7e",padding:"9px 14px",
    borderRadius:4,background:"#fbf3e3",color:"#332b23",cursor:"pointer"} as const,
  field:{display:"grid",gap:5,font:"600 12px/1.45 system-ui",color:"#514535"} as const,
};
function Gallery(){
  const [controls,setControls]=useState<ShanshuiControls>(DEFAULT_SHANSHUI);
  // Start inside the walking performance, after the first wash reveal.
  const [frame,setFrame]=useState(84);
  const [playing,setPlaying]=useState(false);
  const [playStart,setPlayStart]=useState(84);
  const [reduced,setReduced]=useState(false);
  const [scholar,setScholar]=useState(true);
  const [cloth,setCloth]=useState(.72);
  const change=<K extends keyof ShanshuiControls>(key:K,value:ShanshuiControls[K])=>
    setControls(prev=>({...prev,[key]:value}));
  useEffect(()=>{
    if(!playing||reduced)return;
    const start=performance.now(),initial=playStart;
    let id=0;
    const tick=(now:number)=>{
      // RAF timestamps are the *start* of a display frame and may precede
      // performance.now() sampled inside the effect. Clamp the first delta:
      // floor(-0.1) would otherwise yield frame -1 and crash Storybook.
      const elapsed=Math.max(0,now-start);
      const next=Math.min(SHANSHUI_FRAMES-1,
        Math.max(0,initial+Math.floor(elapsed*.03)));
      setFrame(next);
      if(next<SHANSHUI_FRAMES-1)id=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(id);
    // Gallery play is not a second film clock. Export samples the absolute frame.
  },[playing,reduced,playStart]);
  return <main style={{minHeight:"100vh",padding:22,background:"#e9e2d5",
    color:"#342d24",font:"14px/1.5 system-ui",display:"grid",gap:15,
    alignContent:"start",justifyItems:"start"}}>
    <header style={{maxWidth:990}}>
      <div style={{color:"#86664b",letterSpacing:2,font:"700 11px system-ui"}}>
        VIDEO PRODUCTION / FILM LOOKS / CHINESE INK LANDSCAPES
      </div>
      <h1 style={{font:"400 35px/1.1 Georgia,serif",margin:"9px 0"}}>
        Shanshui · A Living Ink Painting
      </h1>
      <p style={{margin:0,maxWidth:880,color:"#6f5c49"}}>
        Three original hand-painting-inspired landscapes built from reusable code:
        mist, layered mountain washes, cliffs, rock hatching, detailed pine and willow,
        bamboo, flowing water, pavilion, path, birds, and a separately articulated
        sepia scholar. No photographs or generated image backgrounds.
      </p>
    </header>
    <div style={{display:"flex",gap:13,flexWrap:"wrap",alignItems:"end"}}>
      <label style={style.field}>Composition
        <select aria-label="Shanshui composition" value={controls.scene}
          onChange={e=>{setPlaying(false);change("scene",e.target.value as ShanshuiScene);}}
          style={{height:38,background:"#fff8ed",color:"#31281e"}}>
          <option value="mountain-trail">Mountain trail · waterfall and pines</option>
          <option value="river-scholar">Riverside scholar · willow and bridge</option>
          <option value="misty-hermit">Misty hermit · old pine and bamboo</option>
        </select>
      </label>
      {(["detail","mist","ink","wind"] as const).map(key=>
        <label key={key} style={style.field}>
          {({detail:"Brush detail",mist:"Atmospheric mist",ink:"Ink density",
            wind:"Foliage breeze"} as const)[key]} · {Math.round(controls[key]*100)}%
          <input aria-label={"Shanshui "+key} type="range" min="0" max="1"
            step=".05" value={controls[key]} onChange={e=>change(key,Number(e.target.value))}/>
        </label>)}
      <label style={style.field}>Cloth movement · {Math.round(cloth*100)}%
        <input aria-label="Shanshui cloth" type="range" min="0" max="1" step=".05"
          value={cloth} onChange={e=>setCloth(Number(e.target.value))}/>
      </label>
      <label style={{...style.field,display:"flex",alignItems:"center",height:38}}>
        <input type="checkbox" checked={scholar} onChange={e=>setScholar(e.target.checked)}/>
        Show scholar
      </label>
      <label style={{...style.field,display:"flex",alignItems:"center",height:38}}>
        <input type="checkbox" checked={reduced}
          onChange={e=>{setPlaying(false);setReduced(e.target.checked)}}/>
        Reduced motion
      </label>
    </div>
    <div data-testid="shanshui-preview"
      style={{width:960,height:540,transformOrigin:"top left",
        background:"#f3e6cd",boxShadow:"0 16px 38px #51443223"}}>
      <InkShanshuiFilm frame={frame} controls={controls}
        reducedMotion={reduced} showScholar={scholar} clothAmount={cloth}/>
    </div>
    <div style={{display:"grid",gap:9,width:960,maxWidth:"100%"}}>
      <label style={{...style.field,width:"100%"}}>Frame {frame} / {SHANSHUI_FRAMES-1}
        <input aria-label="Shanshui frame" type="range" min="0" max={SHANSHUI_FRAMES-1} step="1"
          value={frame} onChange={e=>{setFrame(Number(e.target.value));setPlaying(false)}}
          style={{width:"100%"}}/>
      </label>
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <button type="button" disabled={reduced}
          title={reduced?"Turn off Reduced motion to play the film":undefined}
          style={{...style.button,opacity:reduced?.55:1,
            cursor:reduced?"not-allowed":"pointer"}} onClick={()=>{
          if(!playing){
            const start=frame>=SHANSHUI_FRAMES-1?0:frame;
            setPlayStart(start);
            if(start!==frame)setFrame(start);
          }
          setPlaying(v=>!v);
        }}>{playing?"Pause film":"Play film"}</button>
        {([["Paint reveal",16],["First steps",65],["Landscape complete",112],
          ["Quiet contemplation",185],["Bowing",274]] as const).map(([label,f])=>
          <button key={label} type="button" style={style.button}
            onClick={()=>{setPlaying(false);setFrame(f)}}>{label}</button>)}
      </div>
      <p style={{margin:0,fontSize:12,color:"#726050"}}>
        {SHANSHUI_REFERENCE_NOTES[controls.scene]}
        {" "}Scene geometry is authored in a consistent 960×540 paper coordinate system;
        seeking backward regenerates the same exact ink film state.
      </p>
    </div>
  </main>;
}
/** Three exact film frames, cropped onto the lower garment and planted
 * shoes. This comparison is a production QA view, not a second animation
 * engine or baked image. Everything here is the real InkShanshuiFilm. */
function GarmentMotion(){
  const [scene,setScene]=useState<ShanshuiScene>("river-scholar");
  const [start,setStart]=useState(60);
  const [cloth,setCloth]=useState(.72);
  const [detail,setDetail]=useState(.9);
  const controls={...DEFAULT_SHANSHUI,scene,detail};
  const route=shanshuiFittedRoute(scene);
  return <main data-testid="shanshui-garment-studio"
    style={{padding:24,background:"#e9e2d5",color:"#372e24",
      font:"14px/1.5 system-ui",display:"grid",gap:16,minHeight:"100vh",
      alignContent:"start"}}>
    <header>
      <h1 style={{font:"400 30px Georgia,serif",margin:"0 0 8px"}}>
        Walking robe · three exact gait phases
      </h1>
      <p style={{margin:0,maxWidth:860}}>
        Compare the real painted hem, shoe contact and overlapping garment
        silhouette at three frames, half a 26-frame stride apart.
        No static mockups or cropped reference-image textures.
      </p>
    </header>
    <div style={{display:"flex",gap:17,flexWrap:"wrap",alignItems:"end"}}>
      <label style={style.field}>Figure
        <select aria-label="Garment scene" value={scene}
          onChange={e=>setScene(e.target.value as ShanshuiScene)}
          style={{height:38,background:"#fff8ed"}}>
          <option value="river-scholar">Riverside reader</option>
          <option value="mountain-trail">Mountain traveler</option>
          <option value="misty-hermit">Misty hermit</option>
        </select>
      </label>
      <label style={{...style.field,minWidth:230}}>First frame · {start}
        <input aria-label="Garment first frame" type="range" min="0"
          max={SHANSHUI_FRAMES-27} value={start}
          onChange={e=>setStart(Number(e.target.value))}/>
      </label>
      <label style={{...style.field,minWidth:170}}>Gait cloth · {Math.round(cloth*100)}%
        <input aria-label="Garment cloth" type="range" min="0" max="1"
          step=".05" value={cloth}
          onChange={e=>setCloth(Number(e.target.value))}/>
      </label>
      <label style={{...style.field,minWidth:170}}>Brush detail · {Math.round(detail*100)}%
        <input aria-label="Garment detail" type="range" min=".2" max="1"
          step=".05" value={detail}
          onChange={e=>setDetail(Number(e.target.value))}/>
      </label>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"start"}}>
      {[0,13,26].map((offset,i)=>{
        const filmFrame=start+offset;
        const foot=inkRouteAt(route,filmFrame);
        const zoom=2.3;
        const dx=160-zoom*foot.x;
        const dy=162-zoom*(foot.y-65);
        return <section key={offset} data-gait-study-frame={filmFrame}
          style={{display:"grid",gap:8}}>
          <div style={{fontWeight:600,color:"#514436"}}>
            {["Plant / lift","Opposite stride","Next cycle"][i]} · frame {filmFrame}
          </div>
          <div style={{width:320,height:324,position:"relative",overflow:"hidden",
            background:"#f3e6cd",border:"1px solid #b6a489"}}>
            <div style={{position:"absolute",left:0,top:0,
              transformOrigin:"top left",
              transform:"translate("+dx+"px,"+dy+"px) scale("+zoom+")"}}>
              <InkShanshuiFilm frame={filmFrame} controls={controls}
                clothAmount={cloth}/>
            </div>
          </div>
        </section>;
      })}
    </div>
    <p style={{margin:0,maxWidth:970,fontSize:12,color:"#6f5c49"}}>
      All three frames are sampled from the same scene-specific rig and
      fixed paper coordinates. Compare the two independently moving,
      fully opaque hip-attached hem panels and the planted shoe tips.
    </p>
  </main>;
}

/** Material-first ArtCraft inspection: original frame-pure renderer, four
 * deliberately named crops and one shared art-direction control set. Use
 * nearby browser screenshot evidence rather than calling abstract metrics
 * a substitute for the appearance of actual brushwork. */
function BrushworkDetail(){
  const [detail,setDetail]=useState(1);
  const [ink,setInk]=useState(.86);
  const [mist,setMist]=useState(.41);
  const [wind,setWind]=useState(.24);
  const [frame,setFrame]=useState(145);
  const [seed,setSeed]=useState(71);
  const crops:readonly {
    label:string;scene:ShanshuiScene;x:number;y:number;note:string;
  }[]=[
    {label:"松針 · Old-pine needle clusters",scene:"mountain-trail",
      x:95,y:161,note:"Eight deliberately crooked two-elbow old-pine branches, exact rooted child forks and narrow directional needle bundles; examine negative space"},
    {label:"皴法 · Geological texture",scene:"mountain-trail",
      x:568,y:147,note:"Huang Gongwang, Dwelling in the Fuchun Mountains: examine the new peak-connected mountain shoulders, faded wet-fold shadows and dry child fibres against the older ridge-rooted hemp texture. Reject detached rain streaks, dark angular triangles, evenly spaced hatching or completely flattened distant planes"},
    {label:"柳 · Hanging willow foliage",scene:"river-scholar",
      x:196,y:174,note:"Compare Mei Qing: 39 differently swept pressure-tapered silk strands, five bare paper reserves and asymmetrical angled leaves"},
    {label:"竹葉 · Bamboo leaf canopy",scene:"misty-hermit",
      x:884,y:263,note:"Compare Wu Zhen's NPM bamboo album: selected major twig ends now carry a seven-gesture dark/dilute spray with attached branch roots, competing stroke lengths, directional pressure, open paper windows and true dry-bristle reserve. Inspect the actual 960×540 silhouette: reject generic radial stars, uniformly dark leaf blobs or detached tips"},
    {label:"竹節 · Bamboo nodes and branches",scene:"misty-hermit",
      x:875,y:365,note:"Compare Zheng Xie: three fanned culms with unequal joint intervals, selective rooted shoots and intentional bare joints, narrow pressure collars, dark and dilute ink. Verify attachment at high and low detail"},
  ];
  const cropScale=2.15;
  return <main data-testid="shanshui-brushwork-studio"
    style={{minHeight:"100vh",padding:24,background:"#e9e2d5",
      color:"#352b21",font:"14px/1.5 system-ui",display:"grid",
      gap:18,alignContent:"start"}}>
    <header>
      <h1 style={{font:"400 33px Georgia,serif",margin:"0 0 8px"}}>
        Shanshui · ink craftsmanship inspection
      </h1>
      <p style={{margin:0,maxWidth:900,color:"#6f5c49"}}>
        Five 2.15× views from the actual procedural 960×540 film renderer.
        Compare connected botanical and geological roots, asymmetric
        press-drag-lift, crest-born ink shadow folds, dried fibre breakages,
        mixed ink concentration, and reserved paper channels. These are
        original renderer crops, not reproduced museum artwork.
      </p>
    </header>
    <div data-testid="shanshui-brush-material-presets"
      style={{display:"flex",flexWrap:"wrap",gap:10}}>
      <button type="button" style={style.button}
        onClick={()=>{setDetail(1);setInk(1);setWind(0);setSeed(71);}}>
        Wet loaded brush · still
      </button>
      <button type="button" style={style.button}
        onClick={()=>{setDetail(.85);setInk(.5);setWind(.5);setSeed(87);}}>
        Dry lifted brush · breeze
      </button>
      <button type="button" style={style.button}
        onClick={()=>{setDetail(.3);setInk(.75);setWind(0);setSeed(71);}}>
        Sparse geometry baseline
      </button>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:13,alignItems:"end"}}>
      {([
        ["Brushwork detail",detail,setDetail],
        ["Brushwork ink",ink,setInk],
        ["Brushwork mist",mist,setMist],
        ["Brushwork wind",wind,setWind],
      ] as const).map(([label,value,setValue])=>
        <label key={label} style={{...style.field,minWidth:172}}>
          {label} · {Math.round(value*100)}%
          <input aria-label={label} type="range" min="0" max="1" step=".05"
            value={value} onChange={e=>setValue(Number(e.target.value))}/>
        </label>)}
      <label style={{...style.field,minWidth:172}}>
        Source seed · {seed}
        <input aria-label="Brushwork seed" type="range" min="1" max="199"
          step="1" value={seed} onChange={e=>setSeed(Number(e.target.value))}/>
      </label>
      <label style={{...style.field,minWidth:172}}>
        Film frame · {frame}
        <input aria-label="Brushwork frame" type="range" min="0"
          max={SHANSHUI_FRAMES-1} step="1" value={frame}
          onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"start"}}>
      {crops.map(crop=>{
        const controls:ShanshuiControls={
          ...DEFAULT_SHANSHUI,scene:crop.scene,detail,ink,mist,wind,seed,
        };
        const tx=160-cropScale*crop.x,ty=128-cropScale*crop.y;
        return <section key={crop.label} data-km-brush-study-card={crop.label}
          style={{display:"grid",gap:8,width:328,maxWidth:"100%"}}>
          <div style={{font:"600 13px system-ui"}}>{crop.label}</div>
          <div style={{width:320,height:256,position:"relative",
            overflow:"hidden",background:"#f3e6cd",
            border:"1px solid #b8aa96"}}>
            <div style={{position:"absolute",left:0,top:0,
              transformOrigin:"top left",
              transform:"translate("+tx+"px,"+ty+"px) scale("+cropScale+")"}}>
              <InkShanshuiStage frame={frame} controls={controls}/>
            </div>
          </div>
          <p style={{fontSize:12,margin:0,color:"#6f5c49"}}>{crop.note}</p>
        </section>;
      })}
    </div>
    <p style={{margin:0,maxWidth:940,fontSize:12,color:"#6f5c49"}}>
      ArtCraft review mode: style-guided, not pixel-matched. Native image
      appearance, branch connectivity, pressure variation and optical
      spacing all require visual evaluation at film resolution.
    </p>
  </main>;
}

function Export({scene}:{scene:ShanshuiScene}){
  const [frame,setFrame]=useState(0);
  const manifest:VideoExportManifest={
    schemaVersion:1,id:"shanshui-"+scene,
    width:960,height:540,fps:{num:30,den:1},durationFrames:SHANSHUI_FRAMES,
  };
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <InkShanshuiFilm frame={frame} controls={{...DEFAULT_SHANSHUI,scene}}/>
  </VideoExportStage>;
}
const meta={title:"Video production/Film Looks/Chinese Ink/Shanshui Film Gallery",
  id:"video-ink-shanshui",component:Gallery,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof Gallery>;
export default meta;
export const GalleryStudio:StoryObj<typeof meta>={
  name:"Original landscape paintings · interactive gallery",
};
export const BrushworkDetailStudio:StoryObj<typeof BrushworkDetail>={
  name:"Brushwork close-ups · ArtCraft inspection",
  render:()=> <BrushworkDetail/>,
};

export const GarmentMotionStudio:StoryObj<typeof GarmentMotion>={
  name:"Garment motion · three gait phases",
  render:()=> <GarmentMotion/>,
};

export const MountainTrailExport:StoryObj<typeof Export>={
  name:"Mountain trail · production MP4 (16:9)",
  render:()=> <Export scene="mountain-trail"/>,
};
export const RiverScholarExport:StoryObj<typeof Export>={
  name:"Riverside scholar · production MP4 (16:9)",
  render:()=> <Export scene="river-scholar"/>,
};
export const MistyHermitExport:StoryObj<typeof Export>={
  name:"Misty hermit · production MP4 (16:9)",
  render:()=> <Export scene="misty-hermit"/>,
};
