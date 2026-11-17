import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {inspectRisoSeparation,serializeRisoSeparationMaster,
  grayscaleForRisoDensity,risoSeparationFilename}
  from "../registry/video/riso-separation-master";
import type {RisoSeparationLayout,RisoSeparationPlate}
  from "../registry/video/riso-separation-master";
import {riso68PaperProfile,riso68OriginalMasters,
  RisoMasterSeparationStudio} from "../src/video/riso-master-separation-studio";
import {risoExampleSpec} from "../src/video/riso-print-demo";
import type {RisoPrintSpec} from "../registry/video/print-plates";
import {riso66Source} from "../src/video/riso-contact-trap-studio";
import {createRisoBrushGeometry} from "../registry/video/riso-dry-brush";

const setup=(aspect:"landscape"|"portrait"="landscape",
  frame=160,seed=66,accentDensity=.78)=>{
  const spec=risoExampleSpec(aspect,seed),
    masters=riso68OriginalMasters(aspect,frame,seed,accentDensity),
    layout=riso68PaperProfile(aspect);
  return {spec,masters,layout};
};
describe("RISO68 physically isolated native grayscale spot masters",()=>{
  it("creates two distinct K-only source vector files with original paper-white cutouts",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const {spec,masters,layout}=setup(aspect);
      const report=inspectRisoSeparation(spec,masters,layout);
      expect(report.ready,report.issues.map(x=>x.code).join(",")).toBe(true);
      expect(report.plateIds).toEqual(["blue","red"]);
      expect(report.pathCount).toBe(8);
      expect(report.paperOpeningCount).toBeGreaterThan(200);
      const blue=serializeRisoSeparationMaster(spec,masters,layout,"blue");
      const red=serializeRisoSeparationMaster(spec,masters,layout,"red");
      expect(blue).not.toEqual(red);
      expect(blue).toContain('data-km-riso68-master="blue"');
      expect(red).toContain('data-km-riso68-master="red"');
      expect(blue).toContain('width="'+layout.sheetMm[0]+'mm"');
      expect(blue).toContain('height="'+layout.sheetMm[1]+'mm"');
      expect(blue.match(/data-km-riso68-source=/g)).toHaveLength(4);
      expect(red.match(/data-km-riso68-source=/g)).toHaveLength(4);
      expect(blue.match(/fill-rule="evenodd"/g)).toHaveLength(4);
      expect(red.match(/fill-rule="evenodd"/g)).toHaveLength(4);
      expect(blue).toContain(masters[0].shapes[0].outerPath);
      expect(blue).toContain(masters[0].shapes[0].dryPaths![0]);
      expect(red).toContain(masters[1].shapes[0].outerPath);
      expect(red).toContain(masters[1].shapes[0].dryPaths![0]);
      expect(blue).not.toContain(masters[1].shapes[0].outerPath);
      expect(red).not.toContain(masters[0].shapes[0].outerPath);
      expect(blue).not.toMatch(/<image|<text|<foreignObject|<script|feMorphology|feGaussianBlur|mix-blend|opacity=/);
      for(const svg of [blue,red]){
        const all=[...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)];
        expect(all.length).toBe(5);
        for(const [,hex] of all){
          expect(hex.slice(1,3)).toBe(hex.slice(3,5));
          expect(hex.slice(1,3)).toBe(hex.slice(5,7));
        }
      }
    }
  });
  it("uses exact grayscale K fractions instead of simulated ink opacity",()=>{
    expect(grayscaleForRisoDensity(1)).toBe("#000000");
    expect(grayscaleForRisoDensity(.5)).toBe("#808080");
    expect(grayscaleForRisoDensity(0)).toBe("#ffffff");
    expect(grayscaleForRisoDensity(.8)).toBe("#333333");
    const a=setup("landscape",160,66,.5);
    const svg=serializeRisoSeparationMaster(a.spec,a.masters,a.layout,"blue");
    expect(svg.match(/fill="#808080"/g)).toHaveLength(3);
    expect(svg.match(/fill="#000000"/g)).toHaveLength(1);
    for(const bad of [NaN,Infinity,-.01,1.01])
      expect(()=>grayscaleForRisoDensity(bad)).toThrow(RangeError);
  });
  it("honors explicit crop/registration policy with identical marks on independent sheets",()=>{
    const {spec,masters,layout}=setup();
    expect(inspectRisoSeparation(spec,masters,layout).marks).toHaveLength(0);
    const crop={...layout,marks:"crop" as const};
    const both={...layout,marks:"crop-and-register" as const};
    for(const [settings,count] of [[crop,8],[both,16]] as const){
      const p=inspectRisoSeparation(spec,masters,settings);
      expect(p.ready).toBe(true);
      expect(p.marks).toHaveLength(count);
      const blue=serializeRisoSeparationMaster(spec,masters,settings,"blue");
      const red=serializeRisoSeparationMaster(spec,masters,settings,"red");
      expect(blue.match(/data-km-riso68-mark=/g)).toHaveLength(count);
      expect(red.match(/data-km-riso68-mark=/g)).toHaveLength(count);
      const marks=(s:string)=>s.slice(s.indexOf('<g data-km-riso68-marks'));
      expect(marks(blue)).toBe(marks(red));
      expect(blue).not.toContain("#2362A0");
      expect(red).not.toContain("#DD593D");
    }
  });
  it("never bakes digital registration shifts or optical ink opacity into masters",()=>{
    const {spec,masters,layout}=setup();
    const first=serializeRisoSeparationMaster(spec,masters,layout,"red");
    const changed:RisoPrintSpec={...spec,plates:spec.plates.map((p,i)=>({
      ...p,opacity:i?.25:.8,registration:[-9,7] as const,
    }))};
    const second=serializeRisoSeparationMaster(changed,masters,layout,"red");
    expect(second).toBe(first);
  });
  it("preserves physical aspect without silent geometric distortion",()=>{
    const {spec,masters,layout}=setup();
    const invalid={...layout,trimMm:{...layout.trimMm,height:150}};
    const report=inspectRisoSeparation(spec,masters,invalid);
    expect(report.ready).toBe(false);
    expect(report.issues.map(x=>x.code)).toContain("aspect-distortion");
    expect(()=>serializeRisoSeparationMaster(spec,masters,invalid,"blue"))
      .toThrow(/refused unsafe master export/);
  });
  it("blocks physical bounds, nonprintable bleed and marks collisions",()=>{
    const {spec,masters,layout}=setup();
    expect(()=>inspectRisoSeparation(spec,masters,{
      ...layout,trimMm:{...layout.trimMm,x:-2},
    })).toThrow(RangeError);
    const crowded:RisoSeparationLayout={
      ...layout,trimMm:{...layout.trimMm,x:9},marks:"crop-and-register"};
    const blocked=inspectRisoSeparation(spec,masters,crowded);
    expect(blocked.ready).toBe(false);
    expect(blocked.issues.some(x=>x.code==="marks-not-printable")).toBe(true);
    expect(()=>serializeRisoSeparationMaster(spec,masters,crowded,"blue"))
      .toThrow(RangeError);
  });
  it("checks critical safe margins and rejects clipped delicate ink",()=>{
    const {spec,masters,layout}=setup();
    const stringent={...layout,safeMm:40};
    const audit=inspectRisoSeparation(spec,masters,stringent);
    expect(audit.ready).toBe(false);
    expect(audit.issues.some(x=>x.code==="critical-outside-safe")).toBe(true);
    const altered:readonly RisoSeparationPlate[]=masters.map((p,i)=>i?p:({
      ...p,shapes:[{...p.shapes[0],outerPath:"M-100 0 L200 0 L200 100 L-100 100 Z"},
        ...p.shapes.slice(1)],
    }));
    const far=inspectRisoSeparation(spec,altered,layout);
    expect(far.ready).toBe(false);
    expect(far.issues.some(x=>x.code==="artwork-outside-bleed")).toBe(true);
  });
  it("rejects path/XML injection and unsupported source values",()=>{
    const {spec,masters,layout}=setup();
    const altered=(path:string):readonly RisoSeparationPlate[]=>
      masters.map((p,i)=>i?p:({...p,shapes:[
        {...p.shapes[0],outerPath:path},...p.shapes.slice(1),
      ]}));
    for(const path of ['<script>alert(1)</script>',
      'M0 0 L50 0 L100 100','M0 0 L10 10 Z',
      'M0 0 L100 0 L100 100 L0 100 Z" onload="alert(1)']){
      const report=inspectRisoSeparation(spec,altered(path),layout);
      expect(report.ready).toBe(false);
      expect(report.issues.some(x=>x.code==="invalid-source-path")).toBe(true);
    }
    const unsafe=masters.map((p,i)=>i?p:({...p,shapes:[
      {...p.shapes[0],density:1.1},...p.shapes.slice(1),
    ]}));
    expect(inspectRisoSeparation(spec,unsafe,layout).ready).toBe(false);
    expect(()=>riso68OriginalMasters("landscape",0,66,-.1)).toThrow(RangeError);
  });
  it("preserves native negative spaces across absolute source frame rewinds",()=>{
    const a=setup("portrait",34);
    const initial=serializeRisoSeparationMaster(a.spec,a.masters,a.layout,"blue");
    setup("portrait",190);
    const back=setup("portrait",34);
    expect(serializeRisoSeparationMaster(back.spec,back.masters,back.layout,"blue"))
      .toBe(initial);
    const b=setup("portrait",190);
    expect(serializeRisoSeparationMaster(b.spec,b.masters,b.layout,"blue"))
      .not.toBe(initial);
    const g=createRisoBrushGeometry(riso66Source("portrait",34,66).blue);
    expect(a.masters[0].shapes[0].dryPaths).toEqual(g.dryPaths);
  });
  it("supports three press masters with exact source identity and isolation",()=>{
    const {spec,masters,layout}=setup();
    const three:RisoPrintSpec={...spec,plates:[
      ...spec.plates,{id:"green",color:"#2A8656",opacity:.8,
        dotCell:7,dotAngle:32,registration:[0,0]},
    ]};
    const all:readonly RisoSeparationPlate[]=[
      ...masters,{id:"green",shapes:[masters[0].shapes[2]]},
    ];
    const report=inspectRisoSeparation(three,all,layout);
    expect(report.ready).toBe(true);
    expect(report.plateIds).toEqual(["blue","red","green"]);
    const svg=serializeRisoSeparationMaster(three,all,layout,"green");
    expect(svg).toContain('data-km-riso68-master="green"');
    expect(svg.match(/data-km-riso68-source=/g)).toHaveLength(1);
    expect(svg).not.toContain('data-km-riso68-master="blue"');
    expect(risoSeparationFilename(three,"green")).toMatch(/green-2a8656-K.svg$/);
    expect(()=>serializeRisoSeparationMaster(three,all,layout,"purple"))
      .toThrow(RangeError);
    const wrong=inspectRisoSeparation(three,[all[1],all[0],all[2]],layout);
    expect(wrong.ready).toBe(false);
    expect(wrong.issues.map(i=>i.code)).toContain("plate-order");
  });
  it("SSR Storybook offers full native gray masters and source preflight",()=>{
    const s=renderToStaticMarkup(<RisoMasterSeparationStudio/>);
    expect(s).toContain('data-km-riso68-studio=""');
    expect(s).toContain('data-km-riso68-ready="true"');
    expect(s).toContain('data-km-riso68-count="2"');
    expect(s).toContain('data-km-riso68-master="blue"');
    expect(s).toContain('data-km-riso68-master="red"');
    expect(s).toContain('data-km-riso68-svg="blue"');
    expect(s).toContain('data-km-riso68-svg="red"');
    expect(s.match(/fill-rule="evenodd"/g)?.length).toBeGreaterThan(7);
    expect(s).not.toMatch(/<image|<foreignObject|feMorphology|feGaussianBlur/);
  });
});
