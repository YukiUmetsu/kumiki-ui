import { describe,expect,it,vi,afterEach } from "vitest";
import { render,waitFor } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FINANCE_OBJECTS,financeObjectProgress,resolveFinanceObject } from "../registry/domains/finance-object-model";
import { FinanceObject2D } from "../registry/domains/finance-object-2d";
import { createFinanceObjectScene3D } from "../registry/domains/finance-object-3d";
import { createFinanceObjectCameraTimeline } from "../registry/domains/finance-object-3d-stage";
import {
  VIDEO_PLATFORM_PRESETS,videoPlatformPreset,createVideoPresetManifest,inspectVideoPreset,
} from "../registry/video/platform-presets";
import { validateVideoExportManifest } from "../registry/video/video-export-stage";
import { checkClipCapabilities,clipFrameAt,inspectClipFraming,resolveClipDraw,resolveClipFrame,validateClip } from "../registry/video/frame-clip";
import type { ClipPlacement,ClipSource } from "../registry/video/frame-clip";
import type { ClipFrameAdapter } from "../registry/video/frame-clip-adapters";
import { FrameAccurateClip } from "../registry/video/frame-accurate-clip";
import { inspectSeekParity } from "../registry/visual/explainer-principles";
import { ALIGNMENT_PARSERS,parseAlignment,textGridParser } from "../registry/video/alignment-formats";
import type { AudioAlignment } from "../registry/video/alignment-formats";
import { alignmentToCaptionTrack,audioCuesToDirectorNodes,audioMixFfmpegArgs,createAudioMixManifest,quantizeWords,resolveAudioCues } from "../registry/video/audio-visual-cue";
import type { AudioCueSheet } from "../registry/video/audio-visual-cue";
import { validateCaptionTrack } from "../registry/visual/caption-track";
import { compileMotionDirector } from "../registry/motion/motion-director";

describe("Finance/banking asset vocabulary",()=>{
  it("offers 62 semantic objects through 26 reusable families",()=>{
    expect(FINANCE_OBJECTS).toHaveLength(62);
    expect(new Set(FINANCE_OBJECTS.map(o=>o.kind)).size).toBe(62);
    expect(new Set(FINANCE_OBJECTS.map(o=>o.archetype)).size).toBe(26);
    for(const kind of ["bank","bank-account","atm","loan","credit-card",
      "dollar","banknote","cash-stack","vault","insurance","mortgage",
      "payment-terminal","cash-register","tax-return","repayment",
      "stock-workstation","stock-chart","money-printing-press","money-bag","bank-check",
      "corporate-office","bull-market","bear-market","financial-dashboard","retail-store"]){
      expect(FINANCE_OBJECTS.some(o=>o.kind===kind)).toBe(true);
    }
  });
  it("requires stable identities and rejects malformed color/title",()=>{
    expect(()=>resolveFinanceObject({kind:"bank",id:"not valid"})).toThrow(/stable/);
    expect(()=>resolveFinanceObject({kind:"bank",id:"bank",accent:"red"})).toThrow(/hex/);
    expect(resolveFinanceObject({kind:"credit-card",id:"card"}).title).toBe("Credit card");
  });
  it("validates actual OHLC market-data constraints before rendering a trading terminal",()=>{
    const correct=[
      {open:10,high:12,low:9,close:11},{open:11,high:13,low:10,close:12},
      {open:12,high:14,low:10,close:11},{open:11,high:12,low:8,close:9},
      {open:9,high:11,low:9,close:10},
    ];
    expect(()=>resolveFinanceObject({kind:"stock-workstation",id:"terminal",
      marketCandles:correct})).not.toThrow();
    expect(()=>resolveFinanceObject({kind:"stock-chart",id:"bad",
      marketCandles:[...correct.slice(0,4),{open:10,high:8,low:9,close:10}]}))
      .toThrow(/Invalid stock candle/);
    expect(()=>resolveFinanceObject({kind:"piggy-bank",id:"bad",
      marketCandles:correct})).toThrow(/Only stock/);
    const scene=createFinanceObjectScene3D({kind:"stock-workstation",id:"data-driven",
      marketCandles:correct});
    const count={wick:0,body:0};
    scene.root.traverse(object=>{
      if(object.userData.partRole==="candlestick-wick")count.wick++;
      if(object.userData.partRole==="candlestick-real-body")count.body++;
    });
    expect(count).toEqual({wick:10,body:10});
    scene.dispose();
  });
  it("seeks purely from the absolute frame rather than animation state",()=>{
    expect(financeObjectProgress(0)).toBe(0);
    expect(financeObjectProgress(10)).toBeCloseTo(.5);
    expect(financeObjectProgress(20)).toBe(1);
    expect(financeObjectProgress(200)).toBe(1);
    expect(financeObjectProgress(10)).toBe(financeObjectProgress(10));
  });
  it.each(["credit-card","bank-account","atm","loan","banknote","bank","wallet","vault","piggy-bank"] as const)(
    "renders %s as accessible, editable semantic SVG",kind=>{
      const svg=renderToStaticMarkup(createElement(FinanceObject2D,{
        spec:{kind,id:"sample-"+kind},frame:40,
      }));
      expect(svg).toContain(`data-km-finance-object-2d="${kind}"`);
      expect(svg).toContain(`data-semantic-id="sample-${kind}"`);
      expect(svg).toContain('role="img"');
      expect(svg).not.toContain("0000 0000");
    });
  it.each([...new Set(FINANCE_OBJECTS.map(e=>e.archetype))])(
    "builds a proper 3D %s archetype with deterministic frames and owned resources",
    archetype=>{
      const descriptor=FINANCE_OBJECTS.find(e=>e.archetype===archetype)!;
      const scene=createFinanceObjectScene3D({kind:descriptor.kind,id:"scene-"+descriptor.kind});
      let meshes=0;scene.root.traverse(node=>{if((node as {isMesh?:boolean}).isMesh)meshes++;});
      expect(meshes).toBeGreaterThan(1);
      scene.updateFrame?.(0);expect(scene.root.visible).toBe(false);
      scene.updateFrame?.(10);expect(scene.root.scale.x).toBeCloseTo(.5);
      scene.updateFrame?.(21);expect(scene.root.visible).toBe(true);
      expect(scene.root.userData.semanticId).toBe("scene-"+descriptor.kind);
      scene.dispose();expect(scene.scene.children.length).toBe(0);
    },20000); // hero kinds sculpt real SDF meshes (~1–2 s each, slower under load)
  it("shares CC1 camera frames for finance object 3D export",()=>{
    const timeline=createFinanceObjectCameraTimeline(1080,1920,180,{num:30,den:1});
    expect(timeline.durationFrames).toBe(180);
    expect(timeline.fps).toEqual({num:30,den:1});
  });
});

describe("Platform-specific social exports",()=>{
  it("defines 14 distinct, correctly oriented native canvases",()=>{
    expect(VIDEO_PLATFORM_PRESETS.length).toBe(14);
    expect(new Set(VIDEO_PLATFORM_PRESETS.map(p=>p.id)).size).toBe(14);
    expect(videoPlatformPreset("youtube")).toMatchObject({width:1920,height:1080});
    expect(videoPlatformPreset("youtube-shorts")).toMatchObject({width:1080,height:1920});
    expect(videoPlatformPreset("instagram-feed")).toMatchObject({width:1080,height:1350});
    expect(videoPlatformPreset("facebook-ads-reels")).toMatchObject({width:1080,height:1920});
    expect(videoPlatformPreset("tiktok-ads")).toMatchObject({minSeconds:5,maxSeconds:60});
    expect(videoPlatformPreset("social-square")).toMatchObject({width:1080,height:1080});
  });
  it("builds export geometry without stretching finished video",()=>{
    const manifest=createVideoPresetManifest("instagram-reels",{
      id:"intro",fps:{num:30,den:1},durationFrames:120,
    });
    expect(manifest).toMatchObject({
      width:1080,height:1920,preset:"instagram-reels",
    });
    expect(()=>validateVideoExportManifest(manifest)).not.toThrow();
    const broken={...manifest,width:1920,height:1080};
    expect(inspectVideoPreset(broken,"instagram-reels").map(i=>i.code))
      .toContain("preset-raster-mismatch");
    expect(()=>validateVideoExportManifest(broken)).toThrow(/Reels/);
  });
  it("enforces specific placement durations without constraining generic organic video",()=>{
    const short=createVideoPresetManifest("youtube-shorts",{
      id:"short",durationFrames:181*30,fps:{num:30,den:1},
    });
    expect(inspectVideoPreset(short,"youtube-shorts").map(x=>x.code))
      .toContain("preset-duration-too-long");
    const ad=createVideoPresetManifest("tiktok-ads",{
      id:"tiktok",durationFrames:120,fps:{num:30,den:1},
    });
    expect(inspectVideoPreset(ad,"tiktok-ads").map(x=>x.code))
      .toContain("preset-duration-too-short");
    const organic=createVideoPresetManifest("tiktok",{
      id:"organic",durationFrames:400*30,fps:{num:30,den:1},
    });
    expect(inspectVideoPreset(organic,"tiktok")).toEqual([]);
  });
});

describe("FrameAccurateClip timing and adapters",()=>{
  const out={num:30,den:1};
  const source:ClipSource={id:"src",width:480,height:270,frameCount:120,fps:{num:30,den:1},licenseRef:"in-house"};
  const at=(timing:ClipPlacement["timing"],frame:number,src=source)=>resolveClipFrame({id:"c",source:src,startFrame:10,durationFrames:120,timing},frame,out);
  afterEach(()=>vi.restoreAllMocks());

  it("maps output frames to source frames for rate, reverse, freeze, remap and trim",()=>{
    expect([at({},9).visible,at({},10).sourceFrame,at({},70).sourceFrame,at({},130).visible]).toEqual([false,0,60,false]);
    expect(at({rate:{num:1,den:2}},51).sourceFrame).toBe(20);
    expect(at({rate:2},40).sourceFrame).toBe(60);
    expect([at({rate:-1},10).sourceFrame,at({rate:-1},40).sourceFrame]).toEqual([119,89]);
    const freeze={freezes:[{atFrame:40,durationFrames:30,sourceFrame:45}]};
    expect([at(freeze,49).sourceFrame,at(freeze,50),at(freeze,79).sourceFrame,at(freeze,80).sourceFrame])
      .toEqual([39,expect.objectContaining({phase:"frozen",sourceFrame:45}),45,40]);
    expect(at({freezes:[{atFrame:20,durationFrames:5}]},32).sourceFrame).toBe(20);
    expect(at({remap:[{frame:0,sourceFrame:0},{frame:60,sourceFrame:20,easing:"ease-in-cubic"},{frame:119,sourceFrame:119,easing:"ease-in-out-cubic"}]},90).sourceFrame).toBe(35);
    expect(at({trimIn:30,trimOut:90},50).sourceFrame).toBe(70);
    expect(at({trimIn:30,trimOut:90},120)).toMatchObject({visible:true,phase:"held",sourceFrame:89});
    expect(at({trimIn:30,trimOut:90,end:"hide"},120)).toMatchObject({visible:false,phase:"exhausted"});
  });

  it("samples variable-frame-rate sources from timestamps and stays seek-deterministic",()=>{
    const vfr:ClipSource={...source,fps:undefined,frameCount:5,timestamps:[0,0.03,0.1,0.2,0.21]};
    expect([clipFrameAt(vfr,0.099),clipFrameAt(vfr,0.1),clipFrameAt(vfr,0.205),clipFrameAt(vfr,0.207,"nearest"),clipFrameAt(vfr,0.07,"nearest")]).toEqual([1,2,3,4,2]);
    expect(at({},13,vfr).sourceFrame).toBe(2);
    const placement:ClipPlacement={id:"c",source,startFrame:10,durationFrames:120,timing:{freezes:[{atFrame:40,durationFrames:30}],rate:{num:3,den:4}}};
    expect(inspectSeekParity(()=>f=>resolveClipFrame(placement,f,out),{durationFrames:140,sampleCount:60,seed:5}).ok).toBe(true);
  });

  it("validates sources, trims, freezes, remaps and exhaustion",()=>{
    const codes=(p:Partial<ClipPlacement>)=>validateClip({id:"c",source,startFrame:0,durationFrames:120,...p},out).map(d=>d.code);
    expect(codes({})).toEqual([]);
    expect(codes({durationFrames:130})).toContain("clip-source-exhausted");
    expect(codes({timing:{trimIn:80,trimOut:40}})).toContain("clip-trim-invalid");
    expect(codes({timing:{freezes:[{atFrame:10,durationFrames:20},{atFrame:20,durationFrames:5}]}})).toContain("clip-freeze-invalid");
    expect(codes({timing:{remap:[{frame:5,sourceFrame:0}]}})).toContain("clip-remap-invalid");
    expect(codes({timing:{rate:0}})).toContain("clip-rate-invalid");
    expect(codes({source:{...source,fps:undefined,timestamps:[0,0.1,0.05]}})).toContain("clip-timestamps-invalid");
  });

  it("frames each output independently and reports capability gaps",()=>{
    expect(resolveClipDraw(source,{width:640,height:360},{fit:"contain"})).toMatchObject({sx:0,sy:0,sw:480,sh:270,dw:640,dh:360});
    const cover=resolveClipDraw(source,{width:360,height:640},{fit:"cover",focus:{x:0,y:1}});
    expect(cover).toMatchObject({sx:0,sy:0,sh:270,dw:360,dh:640});
    expect(cover.sw).toBeCloseTo(151.875);
    const p:ClipPlacement={id:"c",source,startFrame:0,durationFrames:10};
    expect(inspectClipFraming(p,{width:360,height:640}).map(d=>d.code)).toEqual(["clip-upscaled"]);
    expect(inspectClipFraming(p,{width:100,height:100},{crop:{x:400,y:0,width:200,height:100}}).map(d=>d.code)).toEqual(["clip-crop-invalid"]);
    const caps=(exactFrames:boolean|"verified",alpha=true,vfr=true)=>({id:"a",capabilities:{exactFrames,alpha,vfr}});
    expect(checkClipCapabilities(p,caps(false),{requireExact:true}).map(d=>d.code)).toEqual(["clip-decoder-inexact"]);
    expect(checkClipCapabilities(p,caps("verified"),{requireExact:true})).toEqual([]);
    expect(checkClipCapabilities({...p,source:{...source,alpha:"straight",timestamps:Array.from({length:120},(_,i)=>i/30)}},caps(true,false,false)).map(d=>d.code))
      .toEqual(["clip-alpha-unsupported","clip-vfr-unsupported"]);
  });

  it("draws only the latest requested frame and treats unverified frames as errors when exact is required",async()=>{
    const drawn:number[]=[];
    vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue({clearRect(){},drawImage(){}} as unknown as CanvasRenderingContext2D);
    const adapter=(exact:boolean):ClipFrameAdapter=>({id:"fake",capabilities:{exactFrames:exact?true:"verified",alpha:true,vfr:true},
      load:(_s,index)=>new Promise(resolve=>setTimeout(()=>{drawn.push(index);resolve({image:document.createElement("canvas"),width:480,height:270,exact});},index===10?30:1))});
    const placement:ClipPlacement={id:"c",source,startFrame:0,durationFrames:120};
    const exact=adapter(true);
    const {container,rerender}=render(<FrameAccurateClip placement={placement} frame={10} fps={out} adapter={exact} width={320} height={180} description="Test footage"/>);
    rerender(<FrameAccurateClip placement={placement} frame={20} fps={out} adapter={exact} width={320} height={180} description="Test footage"/>);
    const root=container.querySelector("[data-km-frame-clip]")!;
    await waitFor(()=>expect(root.getAttribute("data-clip-status")).toBe("ready"));
    expect(root.getAttribute("data-source-frame")).toBe("20");
    await new Promise(r=>setTimeout(r,40));
    expect(root.getAttribute("data-source-frame")).toBe("20");
    rerender(<FrameAccurateClip placement={placement} frame={30} fps={out} adapter={adapter(false)} width={320} height={180} requireExact description="Test footage"/>);
    await waitFor(()=>expect(root.getAttribute("data-clip-status")).toBe("error"));
    expect(container.querySelector("[role=alert]")?.textContent).toMatch(/could not be verified/);
  });
});

describe("AudioVisualCue alignment, links and bridges",()=>{
  const W:[string,number,number][]=[["A",0.2,0.3],["router",0.3,0.68],["reads",0.68,0.98],["it.",1.0,1.2]];
  const opts={id:"n",language:"en"};
  const fps={num:30,den:1};
  const expectWords=(a:AudioAlignment)=>expect(a.words.map(w=>[w.text,w.start,w.end])).toEqual(W);

  it("normalizes every built-in format to the same words, keeping untimed text in place",()=>{
    expectWords(parseAlignment({segments:[{start:0.2,end:1.2,text:"A router reads it.",words:W.map(([word,start,end])=>({word,start,end,score:0.9}))}]},ALIGNMENT_PARSERS.whisperx,opts).alignment);
    expectWords(parseAlignment(JSON.stringify({words:W.map(([word,start,end])=>({word:" "+word,start,end}))}),ALIGNMENT_PARSERS.whisper,opts).alignment);
    expectWords(parseAlignment({timebase:{unit:"ms"},words:W.map(([text,s,e])=>({text,start:s*1000,end:e*1000}))},ALIGNMENT_PARSERS.neutral,opts).alignment);
    expectWords(parseAlignment({timebase:{unit:"samples",sampleRate:48000},words:W.map(([text,s,e])=>({text,start:s*48000,end:e*48000}))},ALIGNMENT_PARSERS.neutral,opts).alignment);
    const grid=`item [1]:\n class = "IntervalTier"\n name = "words"\n`+W.map(([w,s,e])=>` intervals [1]:\n xmin = ${s}\n xmax = ${e}\n text = "${w}"\n`).join("")+` intervals [9]:\n xmin = 1.2\n xmax = 1.5\n text = ""\n`;
    expectWords(parseAlignment(grid,textGridParser("words"),opts).alignment);
    const chars:string[]=[],st:number[]=[],en:number[]=[];
    W.forEach(([w,s,e],i)=>{[...w].forEach((c,j)=>{chars.push(c);st.push(s+(e-s)*j/w.length);en.push(s+(e-s)*(j+1)/w.length);});if(i<W.length-1){chars.push(" ");st.push(e);en.push(e);}});
    const fromChars=parseAlignment({alignment:{characters:chars,character_start_times_seconds:st,character_end_times_seconds:en}},ALIGNMENT_PARSERS.characterTimings,opts).alignment;
    expect(fromChars.words.map(w=>w.text)).toEqual(W.map(w=>w[0]));
    expect(fromChars.words.map(w=>w.end)).toEqual(W.map(w=>w[2]));
    const gentle=parseAlignment({words:[{case:"success",word:"A",start:0.2,end:0.3},{case:"not-found-in-audio",word:"tiny"},{case:"success",word:"router",start:0.3,end:0.68}]},ALIGNMENT_PARSERS.gentle,opts);
    expect(gentle.alignment.unaligned).toEqual([{text:"tiny",reason:"Gentle: not-found-in-audio",afterWord:0}]);
    expect(gentle.diagnostics.map(d=>d.code)).toEqual(["alignment-unaligned"]);
    const srt=parseAlignment("1\n00:00:00,200 --> 00:00:01,200\nA router reads it.\n",ALIGNMENT_PARSERS.srt,opts).alignment;
    expect(srt.segments).toEqual([{text:"A router reads it.",start:0.2,end:1.2}]);
    expect(parseAlignment({words:[{text:"b",start:1,end:0.5}]},ALIGNMENT_PARSERS.neutral,opts).diagnostics.map(d=>d.code)).toContain("alignment-time-invalid");
  });

  it("quantizes words into non-overlapping frames and builds valid caption tracks",()=>{
    const frames=quantizeWords([{start:0.3,end:0.68},{start:0.68,end:0.98},{start:0.99,end:1.0}],{startFrame:10},fps);
    expect(frames.map(f=>[f.startFrame,f.endFrame])).toEqual([[19,30],[30,39],[39,40]]);
    const alignment=parseAlignment({words:W.map(([text,start,end])=>({text,start,end}))},ALIGNMENT_PARSERS.neutral,opts).alignment;
    const track=alignmentToCaptionTrack(alignment,{fps,laneStartFrame:15});
    expect(track.cues.map(c=>c.text)).toEqual(["A router reads it."]);
    expect(validateCaptionTrack(track).filter(d=>d.severity==="error")).toEqual([]);
    const withGap:AudioAlignment={...alignment,unaligned:[{text:"carefully",reason:"x",afterWord:2}]};
    const gap=alignmentToCaptionTrack(withGap,{fps});
    expect(gap.cues[0]).toMatchObject({text:"A router reads carefully it."});
    expect(gap.cues[0].words).toBeUndefined();
    expect(alignmentToCaptionTrack({...alignment,language:"ja",words:[{text:"ルーターは",start:0,end:0.5},{text:"読みます。",start:0.5,end:1}]},{fps}).cues[0].text).toBe("ルーターは読みます。");
  });

  const sheet=(links:AudioCueSheet["links"]):AudioCueSheet=>({id:"s",fps,durationFrames:120,
    lanes:[{id:"voice",kind:"narration",startFrame:15,alignmentId:"n",assetRef:"voice.wav",required:true},
      {id:"music",kind:"music",startFrame:0,assetRef:"music.wav",beatGrid:{bpm:120,beatsPerBar:4,count:8}},{id:"sfx",kind:"sfx",startFrame:0}],
    sounds:[{id:"ding",laneId:"sfx",frame:60,assetRef:"ding.wav",gainDb:-3}],links});
  const alignment=()=>parseAlignment({words:W.map(([text,start,end],i)=>({text,start,end,confidence:i===2?0.3:0.95})),segments:[{text:"A router reads it.",start:0.2,end:1.2}]},ALIGNMENT_PARSERS.neutral,opts).alignment;

  it("resolves links to words, segments, beats and sounds with tolerance, strictness and visual-only mode",()=>{
    const links:AudioCueSheet["links"]=[
      {id:"l1",visualEventId:"router-in",anchor:{kind:"word",laneId:"voice",text:"Router"}},
      {id:"l2",visualEventId:"read",anchor:{kind:"word",laneId:"voice",index:2},offsetFrames:-3},
      {id:"l3",visualEventId:"bar-2",anchor:{kind:"beat",laneId:"music",beat:4}},
      {id:"l4",visualEventId:"hit",anchor:{kind:"sound",eventId:"ding"},toleranceFrames:0,strict:true},
      {id:"l5",visualEventId:"router-in",anchor:{kind:"word",laneId:"voice",text:"missing"}},
      {id:"l6",visualEventId:"end",anchor:{kind:"segment",laneId:"voice",index:0,edge:"end"}},
    ];
    const events=[{id:"router-in",frame:24},{id:"read",frame:28},{id:"bar-2",frame:60},{id:"hit",frame:62},{id:"end",frame:51}];
    const r=resolveAudioCues(sheet(links),{alignments:[alignment()],visualEvents:events});
    expect(r.links.map(l=>[l.id,l.status,l.deltaFrames])).toEqual([["l1","aligned",0],["l2","early",-4],["l3","aligned",0],["l4","late",2],["l5","missing",undefined],["l6","aligned",0]]);
    const codes=r.diagnostics.map(d=>`${d.severity}:${d.code}`);
    expect(codes).toEqual(expect.arrayContaining(["warning:audio-link-early","error:audio-link-late","error:audio-anchor-missing","warning:audio-anchor-low-confidence"]));
    expect(r.beats.filter(b=>b.beatInBar===0).map(b=>b.frame)).toEqual([0,60]);
    const visual=resolveAudioCues(sheet(links),{visualEvents:events,mode:"visual-only"});
    expect(visual.mode).toBe("visual-only");
    expect(visual.links.every(l=>l.status==="visual-only")).toBe(true);
    expect(visual.diagnostics.map(d=>`${d.severity}:${d.code}`)).toEqual(["warning:audio-alignment-missing"]);
    expect(resolveAudioCues(sheet(links),{visualEvents:events,mode:"audio"}).diagnostics.map(d=>`${d.severity}:${d.code}`)).toContain("error:audio-alignment-missing");
    expect(inspectSeekParity(()=>()=>resolveAudioCues(sheet(links),{alignments:[alignment()],visualEvents:events}),{durationFrames:5}).ok).toBe(true);
  });

  it("bridges to MotionDirector cues and an FFmpeg mix of film length",()=>{
    const s=sheet([]),r=resolveAudioCues(s,{alignments:[alignment()]});
    const nodes=audioCuesToDirectorNodes(r,s,{language:"en"});
    expect(nodes.map(n=>n.payload.kind)).toEqual(["narration","speech-marker","speech-marker","speech-marker","speech-marker","sound-effect",...Array(8).fill("music-beat")]);
    const film=compileMotionDirector({schemaVersion:1,id:"f",title:"f",fps,durationFrames:120,targets:["x"],children:[
      {kind:"animation",id:"x",track:{id:"x",targetId:"x",property:"opacity",valueType:"opacity",keyframes:[{frame:0,value:0},{frame:119,value:1}]}},...nodes]});
    expect(film.ok).toBe(true);
    expect(resolveAudioCues(sheet([{id:"l",visualEventId:"audio/voice/word-1",anchor:{kind:"word",laneId:"voice",index:1}}]),{alignments:[alignment()],visualEvents:film.ok?film.director:undefined}).links[0].status).toBe("aligned");
    const manifest=createAudioMixManifest(s);
    expect(manifest).toEqual({durationSeconds:4,inputs:[
      {id:"voice",kind:"narration",assetRef:"voice.wav",startSeconds:0.5,gainDb:0},{id:"music",kind:"music",assetRef:"music.wav",startSeconds:0,gainDb:0},
      {id:"ding",kind:"sound",assetRef:"ding.wav",startSeconds:2,gainDb:-3}]});
    const args=audioMixFfmpegArgs(manifest,"mix.wav");
    expect(args.join(" ")).toContain("[0:a]adelay=500:all=1,volume=0dB[a0];[1:a]adelay=0:all=1,volume=0dB[a1];[2:a]adelay=2000:all=1,volume=-3dB[a2];[a0][a1][a2]amix=inputs=3:normalize=0:duration=longest,apad=whole_dur=4.000[mix]");
    expect(args.slice(-5)).toEqual(["-t","4.000","-ar","48000","mix.wav"]);
  });
});
