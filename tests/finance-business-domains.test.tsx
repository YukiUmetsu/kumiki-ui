import { describe,expect,it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BUSINESS_CONVERSION_FUNNEL,BUSINESS_REVENUE_TREND,
  FINANCE_PORTFOLIO_TREND,FINANCE_REVENUE_BRIDGE,
  formatMetric,metricRevealProgress,resolveMetricVisual,
} from "../registry/domains/metric-model";
import type { MetricVisualSpec } from "../registry/domains/metric-model";
import { MetricVisual2D } from "../registry/domains/metric-visual-2d";
import { createMetricScene3D } from "../registry/domains/metric-visual-3d";
import { createMetricCameraTimeline } from "../registry/domains/metric-visual-3d-stage";
import { VideoExportStage,validateVideoExportManifest } from "../registry/video/video-export-stage";

describe("finance/business semantic truth",()=>{
  it("computes waterfall closing totals without interpreting deltas as independent totals",()=>{
    const chart=resolveMetricVisual(FINANCE_REVENUE_BRIDGE);
    expect(chart.marks.map(m=>[m.from,m.to])).toEqual([
      [0,125000],[125000,159000],[159000,177000],
      [177000,166000],[166000,162000],[0,162000],
    ]);
    expect(chart.marks[3].tone).toBe("negative");
    expect(chart.summary).toContain("$162,000");
    expect(chart.domain[0]).toBe(0);
  });
  it("treats missing observations as gaps and discloses nonzero axes",()=>{
    const trend=resolveMetricVisual({...FINANCE_PORTFOLIO_TREND,points:[
      {id:"a",label:"A",value:10},{id:"b",label:"B",value:null},
      {id:"c",label:"C",value:12},
    ]});
    expect(trend.marks[1].value).toBeNull();
    expect(trend.scaleDisclosure).toMatch(/does not start at zero/);
    expect(trend.domain[0]).toBeGreaterThan(0);
  });
  it("rejects invented funnel growth, invalid domains, duplicate IDs and nonfinite amounts",()=>{
    expect(()=>resolveMetricVisual({...BUSINESS_CONVERSION_FUNNEL,
      stages:[{id:"a",label:"Visits",value:4},{id:"b",label:"Sales",value:5}],
    })).toThrow(/nonincreasing/);
    expect(()=>resolveMetricVisual({...FINANCE_PORTFOLIO_TREND,
      scale:{zero:true,domain:[100,120]},
    })).toThrow(/scale domain/);
    expect(()=>resolveMetricVisual({...FINANCE_REVENUE_BRIDGE,
      changes:[{id:"opening",label:"Collision",delta:3}],
    })).toThrow(/unique/);
    expect(()=>resolveMetricVisual({...BUSINESS_REVENUE_TREND,
      points:[{id:"a",label:"A",value:NaN},{id:"b",label:"B",value:2}],
    })).toThrow(/finite/);
    expect(()=>resolveMetricVisual({...FINANCE_REVENUE_BRIDGE,
      changes:[{id:"bad",label:"Invalid",delta:Infinity}],
    })).toThrow(/finite/);
  });
  it("stays deterministic at arbitrary seeks with a single clock",()=>{
    const reveal={startFrame:5,framesPerMark:20};
    expect(metricRevealProgress(2,25,reveal)).toBe(0);
    expect(metricRevealProgress(2,55,reveal)).toBe(.5);
    expect(metricRevealProgress(2,65,reveal)).toBe(1);
    expect(metricRevealProgress(2,55,reveal)).toBe(metricRevealProgress(2,55,reveal));
  });
  it("formats currency and percentage without mutating source values",()=>{
    expect(formatMetric(125000,{kind:"currency",currency:"USD",maximumFractionDigits:0})).toBe("$125,000");
    expect(formatMetric(12.345,{kind:"percent",maximumFractionDigits:1})).toBe("12.3%");
  });
});
describe("same source, two honest renderers",()=>{
  const cases:MetricVisualSpec[]=[
    FINANCE_REVENUE_BRIDGE,FINANCE_PORTFOLIO_TREND,
    BUSINESS_CONVERSION_FUNNEL,BUSINESS_REVENUE_TREND,
  ];
  it.each(cases.map(spec=>[spec.kind+" "+spec.id,spec] as const))(
    "%s resolves into readable 2D SVG and tagged 3D geometry",
    (_name,spec)=>{
      const resolved=resolveMetricVisual(spec);
      const svg=renderToStaticMarkup(createElement(MetricVisual2D,{
        spec,frame:179,reveal:{startFrame:8,framesPerMark:22},
      }));
      expect(svg).toContain('role="img"');
      expect(svg).toContain(resolved.title);
      expect(svg).toContain("data-semantic-id="+JSON.stringify(spec.id));
      const stage=createMetricScene3D(spec,{reveal:{startFrame:8,framesPerMark:22}});
      expect(stage.model.summary).toBe(resolved.summary);
      expect(stage.scene.children.length).toBeGreaterThan(4);
      expect(()=>stage.updateFrame?.(0)).not.toThrow();
      expect(()=>stage.updateFrame?.(179)).not.toThrow();
      const marks: Array<{userData:Record<string,unknown>}>=[];
      stage.scene.traverse(obj=>{
        if(obj.userData.role==="metric-column"||obj.userData.role==="value")marks.push(obj);
      });
      expect(marks).toHaveLength(resolved.marks.filter(m=>m.value!==null).length);
      stage.dispose();
    });
  it("has a deterministic CC1 3D framing timeline for video export",()=>{
    const timeline=createMetricCameraTimeline(1280,720,180,{num:30,den:1});
    expect(timeline.durationFrames).toBe(180);
    expect(timeline.fps).toEqual({num:30,den:1});
  });
});
describe("generic video capture protocol",()=>{
  const manifest={schemaVersion:1 as const,id:"video",durationFrames:180,
    width:1280,height:720,fps:{num:30,den:1}};
  it("validates frame/raster settings and emits a fixed capture surface",()=>{
    expect(()=>validateVideoExportManifest(manifest)).not.toThrow();
    expect(()=>validateVideoExportManifest({...manifest,width:1279})).toThrow(/even/);
    const html=renderToStaticMarkup(createElement(VideoExportStage,{
      manifest,frame:15,onSeek:()=>{},children:createElement("span",null,"frame"),
    }));
    expect(html).toContain('data-km-video-capture=""');
    expect(html).toContain('data-frame="15"');
    expect(html).toContain('data-output-width="1280"');
  });
});
