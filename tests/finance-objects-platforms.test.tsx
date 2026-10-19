import { describe,expect,it } from "vitest";
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

describe("Finance/banking asset vocabulary",()=>{
  it("offers 61 semantic objects through 26 reusable families",()=>{
    expect(FINANCE_OBJECTS).toHaveLength(61);
    expect(new Set(FINANCE_OBJECTS.map(o=>o.kind)).size).toBe(61);
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
    expect(()=>resolveFinanceObject({kind:"credit-card",id:"card"}).title).toBe("Credit card");
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
      expect(scene.root.children.length).toBeGreaterThan(1);
      scene.updateFrame?.(0);expect(scene.root.visible).toBe(false);
      scene.updateFrame?.(10);expect(scene.root.scale.x).toBeCloseTo(.5);
      scene.updateFrame?.(21);expect(scene.root.visible).toBe(true);
      expect(scene.root.userData.semanticId).toBe("scene-"+descriptor.kind);
      scene.dispose();expect(scene.scene.children.length).toBe(0);
    });
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
