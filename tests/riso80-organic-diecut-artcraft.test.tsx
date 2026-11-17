import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import type {RisoPullWindow} from "../registry/video/riso-pull-tab";
import {
  evaluateRisoPullTab,risoPullWindowContour,risoPullWindowFibres,
} from "../registry/video/riso-pull-tab";
import {RisoPullTabTheatre} from "../registry/video/riso-pull-tab-react";
import {flattenRisoSvgPath} from "../registry/video/riso-path-geometry";
import {risoExampleSpec,risoExampleArtworks} from "../src/video/riso-print-demo";
import {risoSecondSheetArtworks} from "../src/video/riso-print-demo-alt";

const organic:RisoPullWindow = {
  id:"leaf-window",x:472,y:164,width:110,height:218,
  contour:"M 526 164 C 547 164 571 180 574 204 C 578 227 559 245 567 267 C 576 292 559 324 543 358 C 532 381 512 378 502 360 C 489 336 505 310 495 286 C 485 264 496 242 485 219 C 476 197 499 171 526 164 Z",
};
const polygon:RisoPullWindow = {
  id:"polygon-window",x:472,y:164,width:110,height:218,
  contour:"M 500 164 L 582 220 L 520 382 L 472 220 Z",
};
const landscapeWindows:readonly RisoPullWindow[]=[
  organic,
  {id:"wave-window",x:601,y:164,width:110,height:218,
    contour:"M 656 164 C 676 168 698 187 699 211 C 700 234 681 249 688 271 C 696 294 680 326 664 358 C 652 380 633 378 624 359 C 612 336 628 310 617 286 C 606 263 617 242 607 219 C 604 197 626 170 656 164 Z"},
  {id:"ripple-window",x:730,y:164,width:110,height:218,
    contour:"M 785 164 C 806 168 828 187 829 210 C 830 234 810 250 819 273 C 828 297 811 329 795 358 C 782 380 762 379 754 360 C 742 337 759 309 748 286 C 737 262 748 241 738 218 C 730 197 756 170 785 164 Z"},
];
const cover={spec:risoExampleSpec("landscape",23),artworks:risoExampleArtworks("landscape")};
const insert={spec:risoExampleSpec("landscape",38),artworks:risoSecondSheetArtworks("landscape")};
const args={width:960,height:540,windows:[organic],direction:"right" as const,
  travel:182.4,progress:.5,seed:80};

function distanceToSegment(p:readonly [number,number],a:readonly [number,number],b:readonly [number,number]){
  const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
  const t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0;
  return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);
}
function distanceToContour(p:readonly [number,number],points:readonly (readonly [number,number])[]){
  let best=Infinity;
  for(let i=0;i<points.length;i++)
    best=Math.min(best,distanceToSegment(p,points[i],points[(i+1)%points.length]));
  return best;
}
function fibreAnchors(paths:readonly string[]):readonly (readonly [number,number])[]{
  return paths.map(path=>{
    const m=/^M([-+\d.eE]+) ([-+\d.eE]+)/.exec(path);
    if(!m)throw new Error("Expected a deterministic SVG microfibril path.");
    return [Number(m[1]),Number(m[2])] as const;
  });
}

describe("RISO80 authored organic die-cut contours",()=>{
  it("preserves one original clockwise Bézier silhouette and samples its complete perimeter",()=>{
    const first=evaluateRisoPullTab(args).windows[0];
    expect(first.path).toBe(organic.contour);
    expect(first.shape).toBe("organic-contour");
    expect(first.winding).toBe("clockwise");
    expect(first.fibres).toHaveLength(88);
    expect(new Set(first.fibres).size).toBe(88);
    expect(first.fibres).toEqual(risoPullWindowFibres(organic,80));
    expect(risoPullWindowContour(organic)).toBe(organic.contour);
    const contour=flattenRisoSvgPath(organic.contour!,.35)[0].points;
    const anchors=fibreAnchors(first.fibres);
    expect(Math.max(...anchors.map(p=>distanceToContour(p,contour)))).toBeLessThan(.8);
    expect(anchors.every(p=>p[0]>=organic.x&&p[0]<=organic.x+organic.width&&
      p[1]>=organic.y&&p[1]<=organic.y+organic.height)).toBe(true);
  });

  it("accepts an authored simple polygon as well as curved Bézier silhouettes",()=>{
    const result=evaluateRisoPullTab({...args,windows:[polygon]}).windows[0];
    expect(result.path).toBe(polygon.contour);
    expect(result.shape).toBe("organic-contour");
    expect(result.winding).toBe("clockwise");
    expect(result.fibres).toHaveLength(88);
    expect(new Set(result.fibres).size).toBe(88);
  });

  it("uses one fixed source contour and deterministic fibre placement at every seek",()=>{
    const start=evaluateRisoPullTab({...args,progress:0}).windows[0];
    const middle=evaluateRisoPullTab({...args,progress:.5}).windows[0];
    const end=evaluateRisoPullTab({...args,progress:1}).windows[0];
    expect(start.path).toBe(middle.path);
    expect(middle.path).toBe(end.path);
    expect(start.fibres).toEqual(middle.fibres);
    expect(middle.fibres).toEqual(end.fibres);
    expect(evaluateRisoPullTab({...args,seed:81}).windows[0].fibres)
      .not.toEqual(middle.fibres);
  });

  it("renders true organic SVG apertures and exposes validated winding without changing either ink master",()=>{
    const html=renderToStaticMarkup(<RisoPullTabTheatre
      cover={cover} insert={insert} windows={landscapeWindows}
      travel={182.4} progress={.5}/>);
    expect(html.match(/data-km-riso-print=/g)).toHaveLength(2);
    expect(html.match(/data-km-riso-plate="blue"/g)).toHaveLength(2);
    expect(html.match(/data-km-riso-plate="red"/g)).toHaveLength(2);
    expect(html.match(/data-km-riso80-organic-contour=/g)).toHaveLength(3);
    expect(html.match(/data-km-riso80-contour-winding="clockwise"/g)).toHaveLength(3);
    expect(html).toContain('data-km-riso80-organic-window-count="3"');
    expect(html.match(/data-km-riso79-cut-fibre=/g)).toHaveLength(264);
    expect(html).toContain('data-km-riso79-stationary-original-cover=""');
    expect(html).toContain('data-km-riso79-printed-insert-window=""');
  });

  it("rejects counter-clockwise winding, open paths, multiple subpaths and unsupported commands",()=>{
    const invalid=[
      {...organic,contour:"M 472 164 L 472 382 L 582 382 L 582 164 Z"},
      {...organic,contour:"M 526 164 C 547 164 571 180 574 204 C 578 227 559 245 567 267"},
      {...organic,contour:organic.contour+" M 500 200 L 510 200 L 510 210 Z"},
      {...organic,contour:organic.contour!.replace(" C "," A ")},
    ];
    for(const window of invalid)
      expect(()=>evaluateRisoPullTab({...args,windows:[window]})).toThrow();
  });

  it("rejects self-crossing and non-adjacent touching silhouettes",()=>{
    const crossing={...organic,contour:"M 500 164 L 582 220 L 520 382 L 472 220 L 582 164 Z"};
    const touching={...organic,contour:"M 500 164 L 582 220 L 520 382 L 472 220 L 582 220 Z"};
    expect(()=>evaluateRisoPullTab({...args,windows:[crossing]}))
      .toThrow(/simple non-self-intersecting/);
    expect(()=>evaluateRisoPullTab({...args,windows:[touching]}))
      .toThrow(/simple non-self-intersecting/);
  });

  it("rejects contours and Bézier handles outside the declared source window",()=>{
    const outside={...organic,contour:organic.contour!.replace("571 180","590 180")};
    expect(()=>evaluateRisoPullTab({...args,windows:[outside]}))
      .toThrow(/inside their declared source-paper bounds/);
  });

  it("accepts exponent-form numeric coordinates without treating e as an SVG command",()=>{
    const scientific={...polygon,contour:"M 5e2 164 L 582 164 L 582 382 L 500 382 Z"};
    expect(evaluateRisoPullTab({...args,windows:[scientific]}).windows[0].winding)
      .toBe("clockwise");
  });

  it("retains the rounded-rectangle default and rejects overlapping declared window bounds",()=>{
    const rounded=evaluateRisoPullTab({...args,windows:[
      {id:"rounded",x:472,y:164,width:110,height:218,radius:10},
    ]}).windows[0];
    expect(rounded.shape).toBe("rounded-rect");
    expect(rounded.winding).toBe("clockwise");
    expect(()=>evaluateRisoPullTab({...args,windows:[
      organic,{...organic,id:"overlap",x:500,y:170},
    ]})).toThrow(/seven source-paper units/);
  });
});

