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
  it("offers 50 unique named objects without 50 duplicate rendering engines",()=>{
    expect(FINANCE_OBJECTS).toHaveLength(50);
    expect(new Set(FINANCE_OBJECTS.map(o=>o.kind)).size).toBe(50);
    expect(new Set(FINANCE_OBJECTS.map(o=>o.archetype)).size).toBe(19);
    for(const kind of ["bank","bank-account","atm","loan","credit-card",
      "dollar","banknote","cash-stack","vault","insurance","mortgage",
      "payment-terminal","cash-register","tax-return","repayment"]){
      expect(FINANCE_OBJECTS.some(o=>o.kind===kind)).toBe(true);
    }
  });
  it("requires stable identities and rejects malformed color/title",()=>{
    expect(()=>resolveFinanceObject({kind:"bank",id:"not valid"})).toThrow(/stable/);
    expect(()=>resolveFinanceObject({kind:"bank",id:"bank",accent:"red"})).toThrow(/hex/);
    expect(()=>resolveFinanceObject({kind:"credit-card",id:"card"}).title).toBe("Credit card");
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
