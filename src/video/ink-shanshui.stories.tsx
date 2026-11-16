import {useEffect,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {InkShanshuiFilm} from "./ink-shanshui-film";
import {InkShanshuiStage} from "../../registry/video/ink-shanshui-react";
import {DEFAULT_SHANSHUI,SHANSHUI_FRAMES,SHANSHUI_REFERENCE_NOTES} from "../../registry/video/ink-shanshui";
import type {ShanshuiControls,ShanshuiScene,InkRockSchool} from "../../registry/video/ink-shanshui";
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
      <label style={style.field}>Rock-brush reference school
        <select aria-label="Shanshui ink school"
          value={controls.inkSchool??"fuchun"}
          onChange={e=>change("inkSchool",e.target.value as InkRockSchool)}
          style={{height:38,background:"#fff8ed",color:"#31281e"}}>
          <option value="fuchun">Huang Gongwang · long hemp</option>
          <option value="early-spring">Guo Xi · curled cloud-head</option>
          <option value="travelers">Fan Kuan · raindrop cun</option>
          <option value="forest-grotto">Wang Meng · ox-hair dry brush</option>
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
      x:568,y:147,note:"Huang Gongwang, Dwelling in the Fuchun Mountains: inspect the softened, connected summit, 3 parent-rooted interlocking graded rock faces, 6 cap shelves, 9 attached erosion cuts and 3 cubic hill-back strokes with 40 hemp descendants; also verify the 5 ridge-rooted middle pines and 310 needles. The 4 original long-hemp fracture strokes now each travel three jointly rooted, turning brush sections attached to the same positive stone geometry, preserving 12 reloads and 8 side fibres. At native 960x540 compare broad interlocking rock anatomy, not counts. Reject round rubber stamps, flat triangles and pale wireframe cliffs"},
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


/** ArtCraft geology control study. All panels render real SVG layers at the
 * same absolute frame and camera. Each comparison changes exactly ONE axis:
 * a geometry-off negative control or a low ink-load material condition.
 * Museum images stay external and are never included in the video output.
 */
function GeologicalInkStudy(){
  const [compareSeeds,setCompareSeeds]=useState(false);
  const [frame,setFrame]=useState(145);
  const [seed,setSeed]=useState(71);
  const [detail,setDetail]=useState(1);
  const [ink,setInk]=useState(.9);
  const [mist,setMist]=useState(.35);
  const [centerX,setCenterX]=useState(549);
  const [centerY,setCenterY]=useState(147);
  const [zoom,setZoom]=useState(1.75);
  // Compare independent geometry under an identical camera and ink load.
  // Wrapping keeps the second seed in the documented [1,199] domain.
  const alternateSeed=(seed+15)%199+1;
  const studies=[
    {key:"no-structure",label:"0 · Structural negative control",
      note:"Geometry disabled, not a fake painted sample. This must lose the attached ridge folds, pima-cun fibres and pine detail.",
      level:0,load:ink,sampleSeed:seed},
    {key:"original",label:"1 · Current authored ink",
      note:"Inspect the new rounded multi-saddle ridge, three bone-rooted graded crag masses, six mass caps and nine attached erosion grooves and a new brush-clipped 33-stroke hemp field beneath three cubic hill backs, six tertiary caps and forty additional hemp strokes. Look for actual nested stone volume, source-like pressure and open paper; reject triangle outlines, duplicated scallops or strings.",
      level:detail,load:ink,sampleSeed:seed},
    {key:"dilute",label:"2 · Diluted ink comparison",
      note:"Identical scene, seed, frame, geometry and camera; only ink concentration changes. Verify the same attachments survive.",
      level:detail,load:ink*.42,sampleSeed:seed},
    ...(compareSeeds?[{key:"seed-variation",label:"3 · Alternate seeded construction",
      note:"The same ink, film frame, detail and camera as study 1; only the seeded geometric construction differs. Reject repeated rock silhouettes, identical dry-brush clumps or detached fibres.",
      level:detail,load:ink,sampleSeed:alternateSeed}]:[]),
  ];
  const sliders=[
    {label:"Geology frame",value:frame,min:0,max:SHANSHUI_FRAMES-1,
      step:1,onChange:setFrame},
    {label:"Geology seed",value:seed,min:1,max:199,
      step:1,onChange:setSeed},
    {label:"Geology detail",value:detail,min:0,max:1,
      step:.05,onChange:setDetail},
    {label:"Geology ink",value:ink,min:0,max:1,
      step:.05,onChange:setInk},
    {label:"Geology mist",value:mist,min:0,max:1,
      step:.05,onChange:setMist},
    {label:"Geology crop X",value:centerX,min:0,max:960,
      step:1,onChange:setCenterX},
    {label:"Geology crop Y",value:centerY,min:0,max:540,
      step:1,onChange:setCenterY},
    {label:"Geology zoom",value:zoom,min:1,max:3.5,
      step:.05,onChange:setZoom},
  ] as const;
  return <main data-testid="shanshui-geology-study"
    style={{minHeight:"100vh",padding:24,background:"#e9e2d5",
      color:"#352b21",font:"14px/1.5 system-ui",display:"grid",gap:18,
      alignContent:"start"}}>
    <header style={{maxWidth:960}}>
      <h1 style={{font:"400 32px/1.2 Georgia,serif",margin:"0 0 8px"}}>
        皴法 · Geological ink reconstruction
      </h1>
      <p style={{margin:"0 0 8px"}}>
        ArtCraft macro / meso / micro proof: three actual film crops with
        exactly aligned cameras. Compare the connected rolling landform
        against its missing-structure control and a dilute-ink material
        condition. Seek arbitrary frames without changing the source
        renderer or painting static thumbnails.
      </p>
      <p style={{margin:0,fontSize:12,color:"#6f5c49"}}>
        Source study: Huang Gongwang, <em>Dwelling in the Fuchun Mountains</em>,
        National Palace Museum, c. 1350 ·{" "}
        <a href="https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000975"
          target="_blank" rel="noreferrer">institutional full scroll</a>
        {" · "}
        <a href="https://smarthistory.org/huang-gongwang-dwelling-in-the-fuchun-mountains/"
          target="_blank" rel="noreferrer">hemp-fibre and alum-head brush analysis</a>.
        Reference imagery is not embedded. The original code study is
        style-guided, not a pixel copy.
      </p>
    </header>
    <div data-testid="shanshui-geology-presets"
      style={{display:"flex",gap:9,flexWrap:"wrap"}}>
      <button type="button" style={style.button}
        onClick={()=>{setCenterX(549);setCenterY(147);setZoom(1.75);}}>
        Full hill-back silhouette · macro
      </button>
      <button type="button" style={style.button}
        onClick={()=>{setCenterX(568);setCenterY(147);setZoom(2.4);}}>
        Hemp-fibre and alum-head · meso
      </button>
      <button type="button" style={style.button}
        onClick={()=>{setCenterX(577);setCenterY(163);setZoom(3.45);}}>
        Ink-pressure and paper reserve · micro
      </button>
    </div>
    <div data-testid="shanshui-geology-controls"
      style={{display:"flex",flexWrap:"wrap",gap:13,alignItems:"end"}}>
      {sliders.map(control=><label key={control.label}
        style={{...style.field,minWidth:160}}>
        {control.label} · {control.value}
        <input type="range" aria-label={control.label}
          min={control.min} max={control.max} step={control.step}
          value={control.value}
          onChange={event=>control.onChange(Number(event.target.value))}/>
      </label>)}
      <label style={{...style.field,display:"flex",flexDirection:"row",
        alignItems:"center",gap:8,minHeight:38}}>
        <input type="checkbox" aria-label="Compare alternate seed"
          checked={compareSeeds} onChange={event=>setCompareSeeds(event.target.checked)}/>
        Compare a second original construction · seed {alternateSeed}
      </label>
      <button type="button" style={style.button}
        onClick={()=>{setFrame(145);setSeed(71);setDetail(1);setInk(.9);
          setMist(.35);setCenterX(549);setCenterY(147);setZoom(1.75);
          setCompareSeeds(false);}}>
        Reset geology proof
      </button>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"start"}}>
      {studies.map(study=>{
        const controls:ShanshuiControls={...DEFAULT_SHANSHUI,
          scene:"mountain-trail",detail:study.level,ink:study.load,
          mist,wind:0,seed:study.sampleSeed};
        const tx=160-zoom*centerX,ty=128-zoom*centerY;
        return <section key={study.key}
          data-km-geology-condition={study.key}
          data-km-geology-frame={frame}
          data-km-geology-seed={study.sampleSeed}
          style={{display:"grid",gap:8,width:328,maxWidth:"100%"}}>
          <strong style={{fontSize:13}}>{study.label}</strong>
          <div data-km-geology-crop={study.key}
            style={{width:320,height:256,position:"relative",overflow:"hidden",
              background:"#f3e6cd",border:"1px solid #b8aa96"}}>
            <div style={{position:"absolute",left:0,top:0,
              transformOrigin:"top left",
              transform:"translate("+tx+"px,"+ty+"px) scale("+zoom+")"}}>
              <InkShanshuiStage frame={frame} controls={controls}/>
            </div>
          </div>
          <p style={{fontSize:12,color:"#6f5c49",margin:0}}>{study.note}</p>
        </section>;
      })}
    </div>
    <p style={{maxWidth:950,margin:0,fontSize:12,color:"#6f5c49"}}>
      Release gate remains visual: inspect the actual 960×540 mountain scene,
      enlarged shoulder, three source-defined fibre densities and the
      independently seeded comparison. Test success alone cannot approve the painting.
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
/**
 * ArtCraft source study, not a poster of AI-generated backgrounds:
 * four registered, simultaneously sampled native film stages with the same
 * camera/clock but school-specific mountain structure and brush grammar.
 * The NPM source images are external study links; no source pixels ship.
 */
function MasterInkSourceComparison(){
  const [fuchunZone,setFuchunZone]=useState<"all"|"upper"|"lower"|"stone">("all");
  const [frame,setFrame]=useState(145);
  const [seed,setSeed]=useState(71);
  const [detail,setDetail]=useState(1);
  const [mist,setMist]=useState(.35);
  const [ink,setInk]=useState(.9);
  const [zoom,setZoom]=useState(1.65);
  const [cropX,setCropX]=useState(549);
  const [cropY,setCropY]=useState(151);
  // Camera-only QA: all four specimen views keep the identical native 960x540
  // renderer. Film view reveals composition; crop view examines actual pigment.
  const [view,setView]=useState<"crop"|"film">("crop");
  const inspect=(scale:number,x:number,y:number)=>{
    setView("crop");setZoom(scale);setCropX(x);setCropY(y);
  };
  const refs=[
    {school:"fuchun",title:"Huang Gongwang · long hemp fibre",
      url:"https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000975",
      observation:"Rounded nested hills, uneven long hemp loaded at the head, bare paper between linked families. Do not confuse with raindrop marks.",
      target:"Six linked round/saddle rock volumes, 15 curved loaded parent banks and all 78 anatomically rooted short/mid/long child fibres. New five-mark bank phrases alternate upper and lower parent windows with real reserved paper, saturated short crown contacts, and more diluted long recess strokes; use the bank-isolation proof to detect parallel rain or too-clean peaks. Preserve four hero fractures and five distinct pines with 20 boughs, 119 wet bunches, 40 fan masses, 60 pads and 310 needles. This remains an unapproved original technique study, not a reconstruction."},
    {school:"early-spring",title:"Guo Xi · curled cloud-head",
      url:"https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000960",
      observation:"Reversing cloud-head rock rolls, layered ink ranges and open mist; crab-claw pine branching in the source.",
      target:"Hooking, lateral reversing brush centerlines, not vertical hemp rain."},
    {school:"travelers",title:"Fan Kuan · monumental raindrop",
      url:"https://www.npm.gov.tw/Exhibition-Content.aspx?l=2&sno=04006295",
      observation:"Short loaded raindrop texture embedded in monumental dark stone, deep foreground/midground/distance separation.",
      target:"Dense short droplets and shaded cliff planes; no generic smooth flat triangle."},
    {school:"forest-grotto",title:"Wang Meng · ox-tail dry brush",
      url:"https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000991",
      observation:"Dense twisted rocky surfaces, fine ox-tail texture, moss and layered washes balanced by a specific open passage.",
      target:"Multiple densely spaced curving, selectively dry ink fields, controlled gaps."},
  ] as const;
  // In the original 960×540 film, the middle peak is centered near 549×151.
  // We crop only using browser transforms; never paint a second test-only SVG.
  const width=420,height=308;
  // Preserve the complete native 16:9 film without cropping or distortion.
  const fitted=Math.min(width/960,height/540);
  const camera=view==="film"
    ?"translate("+((width-960*fitted)/2)+"px,"+
      ((height-540*fitted)/2)+"px) scale("+fitted+")"
    :"translate("+(width/2-zoom*cropX)+"px,"+
      (height/2-zoom*cropY)+"px) scale("+zoom+")";
  return <main data-testid="shanshui-master-ink-study"
    data-km-master-ink-inspection={fuchunZone}
    style={{padding:24,minHeight:"100vh",background:"#e9e2d5",
      color:"#352c23",font:"14px/1.5 system-ui",display:"grid",
      gap:16,alignContent:"start"}}>
    <header style={{maxWidth:1050}}>
      <h1 style={{font:"400 32px Georgia,serif",margin:"0 0 10px"}}>
        Four masters · native brushwork reference lab
      </h1>
      <p style={{margin:"0 0 10px",maxWidth:1040}}>
        Four independently constructed historical brush grammars painted
        by the SAME original film engine at one absolute frame. Each
        school has its own middle-mountain skeleton and parent-rooted
        geometric brushwork. Inspect structural rock mass first, then named
        calligraphic flow, then individual loaded/dry edge details.
        The masters' museum works are references, not traced image textures.
        Start with full-frame topology and voids, then inspect the same
        rendered mountain at macro, meso and micro scales.
      </p>
    </header>
    <style>{`
      [data-km-master-ink-inspection="upper"] [data-km-master-study="fuchun"]
      [data-km-master-stroke-source-zone="lower-bank"] { visibility:hidden; }
      [data-km-master-ink-inspection="lower"] [data-km-master-study="fuchun"]
      [data-km-master-stroke-source-zone="upper-bank"] { visibility:hidden; }
      [data-km-master-ink-inspection="stone"] [data-km-master-study="fuchun"]
      [data-km-master-stratum-field],
      [data-km-master-ink-inspection="stone"] [data-km-master-study="fuchun"]
      [data-km-master-brush-field],
      [data-km-master-ink-inspection="stone"] [data-km-master-study="fuchun"]
      [data-km-rock-hero-cliff],
      [data-km-master-ink-inspection="stone"] [data-km-master-study="fuchun"]
      [data-km-cliff-pine-grove] { visibility:hidden; }
    `}</style>
    <div role="group" aria-label="Fuchun paper-reserve inspection"
      data-testid="shanshui-master-zone-presets"
      style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center"}}>
      {([["all","All Fuchun hemp"],["upper","Upper-bank contacts only"],
        ["lower","Lower-bank contacts only"],
        ["stone","Stone volumes · brush hidden"]] as const).map(([zone,title])=>
        <button type="button" key={zone} style={style.button}
          aria-pressed={fuchunZone===zone} onClick={()=>setFuchunZone(zone)}>
          {title}
        </button>)}
      <span style={{maxWidth:500,fontSize:12,color:"#675745"}}>
        Storybook-only: isolate original seven-curve rock volumes and wet/dry
        undercuts from long-fibre marks without editing the source paths,
        the other schools, or the production film clock.
      </span>
    </div>
    <div data-testid="shanshui-master-controls"
      style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      {([
        ["Master frame",frame,setFrame,0,SHANSHUI_FRAMES-1,1],
        ["Master seed",seed,setSeed,1,199,1],
        ["Master detail",detail,setDetail,0,1,.05],
        ["Master mist",mist,setMist,0,1,.05],
        ["Master ink",ink,setInk,0,1,.05],
        ["Master zoom",zoom,setZoom,1,3.4,.05],
        ["Master crop X",cropX,setCropX,0,960,1],
        ["Master crop Y",cropY,setCropY,0,540,1],
      ] as const).map(([name,value,change,min,max,step])=>
        <label key={name} style={{...style.field,width:158}}>
          {name} · {value}
          <input aria-label={name} type="range" min={min} max={max}
            step={step} value={value}
            onChange={e=>change(Number(e.target.value))}/>
        </label>)}
      <button type="button" style={style.button}
        onClick={()=>{setFrame(145);setSeed(71);setDetail(1);setMist(.35);
          setInk(.9);setFuchunZone("all");inspect(1.65,549,151);}}>
        Reset all four studies
      </button>
    </div>
    <div data-testid="shanshui-master-camera-presets" role="group"
      aria-label="ArtCraft inspection camera presets"
      style={{display:"flex",flexWrap:"wrap",gap:9,alignItems:"center"}}>
      <button type="button" style={style.button} aria-pressed={view==="film"}
        onClick={()=>setView("film")}>Full film · 16:9</button>
      <button type="button" style={style.button}
        aria-pressed={view==="crop"&&zoom===1.65&&cropX===549&&cropY===151}
        onClick={()=>inspect(1.65,549,151)}>Summit · macro</button>
      <button type="button" style={style.button}
        aria-pressed={view==="crop"&&zoom===1.65&&cropX===628&&cropY===137}
        onClick={()=>inspect(1.65,628,137)}>Pine grove · full crowns</button>
      <button type="button" style={style.button}
        aria-pressed={view==="crop"&&zoom===2.4&&cropX===552&&cropY===177}
        onClick={()=>inspect(2.4,552,177)}>Rock strata · meso</button>
      <button type="button" style={style.button}
        aria-pressed={view==="crop"&&zoom===3.35&&cropX===553&&cropY===207}
        onClick={()=>inspect(3.35,553,207)}>Brush edge · micro</button>
      <span style={{font:"12px/1.45 system-ui",color:"#675745"}}>
        {view==="film"?"Uncropped 960×540 native frame · fitted to panel":
          "Actual scene-space crop · no raster scaling of a source image"}
      </span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(440px,1fr))",
      gap:18,alignItems:"start"}}>
      {refs.map(ref=>{
        const controls:ShanshuiControls={
          ...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:ref.school,seed,detail,mist,ink,
        };
        return <section key={ref.school} data-km-master-study={ref.school}
          style={{display:"grid",gap:8,maxWidth:460}}>
          <h2 style={{font:"500 19px Georgia,serif",margin:0}}>{ref.title}</h2>
          <div data-km-master-camera-view={view}
            style={{width,height,position:"relative",overflow:"hidden",
              border:"1px solid #9b8a74",background:"#f3e6cd"}}>
            <div style={{position:"absolute",left:0,top:0,
              transformOrigin:"top left",transform:camera}}>
              <InkShanshuiStage frame={frame} controls={controls}/>
            </div>
          </div>
          <p style={{margin:0,fontSize:12}}>{ref.observation}</p>
          <p style={{margin:0,fontSize:12,color:"#725e46"}}>
            <strong>Code inspection:</strong> {ref.target}
          </p>
          <a href={ref.url} target="_blank" rel="noreferrer"
            style={{fontSize:12,color:"#74573c"}}>
            Original artwork · museum reference
          </a>
        </section>;
      })}
    </div>
    <p style={{margin:0,fontSize:12,maxWidth:1050}}>
      ArtCraft review: five independent axes — connected structural roots,
      calligraphic vector flow, wet/dry ink weight, clustered rhythm with
      reserved paper, and edge-fibre texture. At full frame reject flat
      mountains, absent atmospheric depth and generic tree silhouettes;
      at micro scale reject repeated curves, floating cun marks and vector
      smoothness. These newly authored paintings are NOT artist-approved
      reconstructions of the museum works.
    </p>
  </main>;
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

export const FourMastersInkStudio:StoryObj<typeof MasterInkSourceComparison>={
  name:"Four masters · brushwork source comparisons",
  render:()=> <MasterInkSourceComparison/>,
};

export const GeologicalInkStudio:StoryObj<typeof GeologicalInkStudy>={
  name:"Geological ink · three-condition ArtCraft study",
  render:()=> <GeologicalInkStudy/>,
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
