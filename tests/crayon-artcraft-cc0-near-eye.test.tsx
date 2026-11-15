import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonPaperTintedWaxBase} from "../registry/video/materials/crayon-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonDryNibPath,crayonMarks,crayonPaperHeight,crayonWaxContactClumps,crayonStrokeEndPickup,crayonStableNibStops} from "../registry/video/materials/crayon";
import {crayonCc0NearEyeStudy} from "../src/video/crayon-artcraft-cc0-near-eye";
import {crayonPaperContactSwatches} from "../src/video/crayon-artcraft-paper-contact-fixtures";
import faceMeta,{SourceMeasuredCc0Eye,SourceMeasuredCc0EyePortrait}
  from "../src/video/crayon-artcraft-adult-face.stories";
describe("Crayon pressure-and-paper contact material studies",()=>{
  it("builds fully opaque, paper-tinted wax base rather than a flat pigment slab",()=>{
    const paper="#f7ecd8",pigment="#c97455";
    const light=crayonPaperTintedWaxBase(pigment,paper,.2);
    const firm=crayonPaperTintedWaxBase(pigment,paper,.92);
    expect(light).toMatch(/^#[0-9a-f]{6}$/);
    expect(firm).toMatch(/^#[0-9a-f]{6}$/);
    expect(light).not.toBe(firm);
    const channel=(hex:string)=>parseInt(hex.slice(1,3),16);
    expect(channel(light)).toBeGreaterThan(channel(firm));
    expect(crayonPaperTintedWaxBase(pigment,paper,.2)).toBe(light);
    expect(()=>crayonPaperTintedWaxBase("orange",paper,.6)).toThrow();
    expect(()=>crayonPaperTintedWaxBase(pigment,paper,NaN)).toThrow();
    const render=renderToStaticMarkup(<CrayonScene
      spec={crayonPaperContactSwatches(.82)} frame={239}/>);
    expect(render).toContain('data-km-crayon-paper-base=');
    expect(render).toContain('data-km-crayon-underpaint="opaque"');
    const control=renderToStaticMarkup(<CrayonScene
      spec={crayonCc0NearEyeStudy("landscape",1,"smooth")} frame={299}/>);
    expect(control).not.toContain('data-km-crayon-paper-base=');
  });
  for(const pressure of [.2,.32,.72,1]){
    it("keeps all four material swatches solid at pressure "+pressure,()=>{
      const spec=crayonPaperContactSwatches(pressure,974);
      expect(inspectCrayonScene(spec)).toEqual([]);
      expect(spec.elements).toHaveLength(6);
      expect(new Set(spec.elements.map(n=>n.id)).size).toBe(6);
      expect(spec.elements.filter(n=>n.kind==="wax"&&n.deposition==="stroke-built"))
        .toHaveLength(5);
      for(const n of spec.elements){
        if(n.kind==="wax")expect(n.coverage).toBe("opaque");
      }
      const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={239}/>);
      expect(html).toContain('data-km-crayon-deposition="stroke-built"');
      expect(html).toContain('data-km-crayon-paper-relief=""');
      expect(html).toContain('data-km-crayon-underpaint="opaque"');
      expect(html).toBe(renderToStaticMarkup(<CrayonScene spec={spec} frame={239}/>));
    });
  }
  it("validates seed and pressure without changing material source identity",()=>{
    expect(()=>crayonPaperContactSwatches(0)).toThrow();
    expect(()=>crayonPaperContactSwatches(1.1)).toThrow();
    expect(()=>crayonPaperContactSwatches(.72,1.3)).toThrow();
    const a=crayonPaperContactSwatches(.72,974);
    const b=crayonPaperContactSwatches(.72,975);
    expect(a.elements).toEqual(b.elements);
    expect(a.seed).not.toBe(b.seed);
  });
});
describe("ArtCraft CC0 near-eye source-crop study (not art approval)",()=>{
  it("retains measured iris occlusion, a narrow orbital hollow and attached asymmetric lashes",()=>{
    const spec=crayonCc0NearEyeStudy("portrait",1,"stroke-built");
    const wax=(id:string)=>spec.elements.find(n=>n.id===id&&n.kind==="wax");
    const lash=spec.elements.find(n=>n.id==="upper-lashes");
    const iris=wax("eye-iris");
    const hollow=wax("lower-orbital-hollow");
    const lower=wax("lower-lid-flesh");
    expect(iris?.kind).toBe("wax");
    expect(hollow?.kind).toBe("wax");
    expect(lower?.kind).toBe("wax");
    if(iris?.kind!=="wax"||hollow?.kind!=="wax"||lower?.kind!=="wax")
      throw new Error("ArtCraft eye structure was removed");
    expect(iris.bounds.width).toBeLessThan(50);
    expect(iris.bounds.height).toBeLessThan(45);
    expect(hollow.bounds.height).toBeLessThan(50);
    expect(lower.bounds.height).toBeLessThan(42);
    expect(iris.parentId).toBe("eye-sclera");
    expect(iris.clipToParent).toBe(true);
    const lid=spec.elements.find(n=>n.id==="upper-lid-overhang");
    expect(lid?.kind).toBe("wax");
    expect(lid&&lid.timing.start).toBeGreaterThan(iris.timing.start);
    expect(lash?.kind).toBe("contour");
    if(lash?.kind!=="contour")throw new Error("Missing rooted eyelid fibers");
    expect((lash.d.match(/M/g)??[]).length).toBeGreaterThanOrEqual(15);
    expect(lash.parentId).toBe("eye-skin");
    expect(lash.clipToParent).toBe(true);
  });

  it("anchors wax buildup to stroke lift-off rather than scattering loose stickers",()=>{
    const marks=crayonMarks({x:0,y:0,width:166,height:65},
      {seed:392,pressure:.91,spacing:7,passes:2,strokeOrder:"patches"});
    const mark=marks.find(m=>crayonStrokeEndPickup(m,974)!=="");
    if(!mark)throw new Error("No raised-fiber stroke pickup in sampled marks");
    const path=crayonStrokeEndPickup(mark,974);
    expect(path).toContain("M");
    expect(path).toContain("Q");
    expect(path).toContain("Z");
    expect(path).toBe(crayonStrokeEndPickup(mark,974));
    expect(path).not.toBe(crayonStrokeEndPickup(mark,975));
    const oneArc={...mark,nibArcs:[mark.nibArcs[0]]};
    expect(crayonStrokeEndPickup(oneArc,974,.6)).toBe("");
    expect(crayonStrokeEndPickup(oneArc,974,.84)).toBe("");
    expect(crayonStrokeEndPickup(oneArc,974,1)).toBe(
      crayonStrokeEndPickup(oneArc,974,1));
    expect(()=>crayonStrokeEndPickup(mark,974,1.5)).toThrow();
    expect(()=>crayonStrokeEndPickup(mark,1.2)).toThrow();
  });
  it("accumulates colored wax clumps on shared raised paper under pressure",()=>{
    const bounds={x:15,y:-20,width:174,height:90};
    const low=crayonWaxContactClumps(bounds,18,974,.24,-8);
    const high=crayonWaxContactClumps(bounds,18,974,.92,-8);
    expect(low).toHaveLength(6);
    expect(high).toHaveLength(6);
    const total=(rows:typeof low)=>rows.reduce((sum,x)=>sum+x.count,0);
    expect(total(high)).toBeGreaterThan(total(low));
    expect(total(high)).toBeLessThan(1200);
    expect(high.map(x=>x.d)).toEqual(
      crayonWaxContactClumps(bounds,18,974,.92,-8).map(x=>x.d));
    expect(high.map(x=>x.d)).not.toEqual(
      crayonWaxContactClumps(bounds,18,975,.92,-8).map(x=>x.d));
    expect(high.filter(x=>x.count>0).every(x=>x.width>0&&x.d.includes("Q")))
      .toBe(true);
    expect(()=>crayonWaxContactClumps({...bounds,width:0},18,974,.92)).toThrow();
    expect(()=>crayonWaxContactClumps(bounds,18,974,.01)).toThrow();
  });
  it("samples deterministic, shared paper-height ridges across strokes",()=>{
    const height=crayonPaperHeight(27.2,-13.4,974);
    expect(height).toBe(crayonPaperHeight(27.2,-13.4,974));
    expect(height).toBeGreaterThanOrEqual(0);
    expect(height).toBeLessThanOrEqual(1);
    const samples=Array.from({length:32},(_,i)=>
      crayonPaperHeight(i*.67,13.3,974));
    expect(new Set(samples.map(x=>x.toFixed(4))).size).toBeGreaterThan(20);
    expect(crayonPaperHeight(27.2,-13.4,975)).not.toBe(height);
    // Paper pattern repeats every 176 units, including negative coordinates:
    // both wax-contact nibs and pigment masks must sample the same relief.
    expect(crayonPaperHeight(27.2+176,-13.4+176,974)).toBeCloseTo(height,10);
    expect(()=>crayonPaperHeight(Number.NaN,5,1)).toThrow();
    expect(()=>crayonPaperHeight(0,0,1.5)).toThrow();
    const mark=crayonMarks({x:0,y:0,width:72,height:42},
      {seed:448,pressure:.63,spacing:8,passes:1})[0];
    const a=crayonDryNibPath(mark,1,"hand",974);
    const b=crayonDryNibPath(mark,1,"hand",975);
    expect(a).not.toBe(b);
    expect(a).toBe(crayonDryNibPath(mark,1,"hand",974));
    expect(crayonDryNibPath(mark,1,"legacy",974))
      .toBe(crayonDryNibPath(mark,1,"legacy",975));
    expect(a.length).toBeLessThan(75000);
    expect(()=>crayonDryNibPath(mark,1,"hand",NaN)).toThrow();
  });
  it("locks previous fiber contacts while the wax nib advances over real paper",()=>{
    const lo=.05,hi=.92;
    const first=crayonStableNibStops(lo,hi,.4);
    const next=crayonStableNibStops(lo,hi,.56);
    const complete=crayonStableNibStops(lo,hi,1);
    // Every previously completed station survives a forward seek byte-for-byte;
    // the final sample is the temporary moving front, not a previous deposit.
    expect(first[first.length-1]).toBe(.4);
    expect(next[next.length-1]).toBe(.56);
    expect(next.slice(0,first.length-1)).toEqual(first.slice(0,-1));
    expect(complete.slice(0,next.length-1)).toEqual(next.slice(0,-1));
    expect(complete[complete.length-1]).toBe(hi);
    expect(crayonStableNibStops(lo,hi,0)).toEqual([]);
    expect(()=>crayonStableNibStops(1,.5,.2)).toThrow();
    expect(()=>crayonStableNibStops(lo,hi,NaN)).toThrow();
    expect(()=>crayonStableNibStops(lo,hi,1.2)).toThrow();
    // Partial and complete wax are deterministic, with no legacy regression.
    const source=crayonMarks({x:0,y:0,width:85,height:45},
      {seed:448,pressure:.9,spacing:8,passes:1})[0];
    const mark={...source,nibArcs:[source.nibArcs[0]]};
    const a=crayonDryNibPath(mark,.4,"hand",974);
    const b=crayonDryNibPath(mark,.56,"hand",974);
    expect(a).toBe(crayonDryNibPath(mark,.4,"hand",974));
    expect(b).not.toBe(a);
    expect(b).toBe(crayonDryNibPath(mark,.56,"hand",974));
    expect(crayonDryNibPath(mark,1,"legacy",974))
      .toBe(crayonDryNibPath(mark,1,"legacy",975));
  });

  it("models pressure-worn side-of-crayon contacts without changing legacy nibs",()=>{
    const mark=crayonMarks({x:0,y:0,width:85,height:45},
      {seed:448,pressure:.63,spacing:8,passes:1})[0];
    const old=crayonDryNibPath(mark);
    const oldExplicit=crayonDryNibPath(mark,1,"legacy");
    const hand=crayonDryNibPath(mark,1,"hand");
    expect(old).toBe(oldExplicit);
    expect(hand).not.toBe(old);
    expect((hand.match(/L/g)??[]).length).toBeGreaterThan((old.match(/L/g)??[]).length);
    expect(hand).toBe(crayonDryNibPath(mark,1,"hand"));
    expect(crayonDryNibPath(mark,.5,"hand")).not.toBe(hand);
    expect(crayonDryNibPath(mark,0,"hand")).toBe("");
    expect(()=>crayonDryNibPath(mark,1,"nope" as "hand")).toThrow();
  });

  for(const aspect of ["landscape","portrait"] as const){
    it("lays down colored wax contacts without airbrushing or transparency in "+aspect,()=>{
      const hand=crayonCc0NearEyeStudy(aspect,1,"stroke-built");
      const smooth=crayonCc0NearEyeStudy(aspect,1,"smooth");
      expect(inspectCrayonScene(hand)).toEqual([]);
      expect(inspectCrayonScene(smooth)).toEqual([]);
      const html=renderToStaticMarkup(<CrayonScene spec={hand} frame={299}/>);
      const old=renderToStaticMarkup(<CrayonScene spec={smooth} frame={299}/>);
      expect(html).toContain('data-km-crayon-deposition="stroke-built"');
      expect(html).toContain('data-km-crayon-cross-contact="second"');
      expect(html).toContain('data-km-crayon-dry-ribbons=""');
      expect(html).toContain('data-km-crayon-underpaint="opaque"');
      expect(html).toContain('data-km-crayon-undercoat-pits=""');
      expect(html).not.toContain('data-km-crayon-underpaint-gradient=""');
      expect(old).toContain('data-km-crayon-deposition="smooth"');
      expect(html).toContain('data-km-crayon-paper-contact="height"');
      expect(html).toContain('data-km-crayon-contact-clumps="wax"');
      expect(html).toContain('data-km-crayon-wax-pickup="stroke-end"');
      expect(old).not.toContain('data-km-crayon-wax-pickup="stroke-end"');
      expect(old).toContain('data-km-crayon-paper-contact="legacy"');
      expect(old).toContain('data-km-crayon-underpaint-gradient=""');
      expect(old).not.toContain('data-km-crayon-cross-contact=');
      const support=hand.elements.find(x=>x.id==="eye-skin");
      if(support?.kind!=="wax")throw new Error("Missing skin support");
      expect(support.coverage).toBe("opaque");
      expect(support.underpaintTooth).toBeGreaterThan(.4);
      expect(support.markStrength).toBeLessThan(.4);
      expect(support.spacing).toBeGreaterThan(11);
      const brow=hand.elements.find(x=>x.id==="brow-root");
      const socket=hand.elements.find(x=>x.id==="eye-socket-umbra");
      if(brow?.kind!=="wax"||socket?.kind!=="wax")
        throw new Error("Missing local pigment regions");
      expect(brow.markStrength).toBeGreaterThan((support.markStrength??0)*2);
      expect(socket.markStrength).toBeGreaterThan(support.markStrength??0);
      expect(brow.angle).not.toBe(support.angle);
      expect(html).toBe(renderToStaticMarkup(<CrayonScene spec={hand} frame={299}/>));
    });
    it("constructs topologically attached ocular pigment without transparency in "+aspect,()=>{
      const spec=crayonCc0NearEyeStudy(aspect);
      expect(inspectCrayonScene(spec)).toEqual([]);
      expect(spec.elements.length).toBeGreaterThan(18);
      expect(new Set(spec.elements.map(x=>x.id)).size).toBe(spec.elements.length);
      const nodes=new Map(spec.elements.map(x=>[x.id,x]));
      for(const part of ["eye-skin","eye-sclera","eye-iris","eye-pupil",
        "upper-lid-overhang"]){
        const n=nodes.get(part);
        if(n?.kind!=="wax")throw new Error("Missing sourced ocular mass "+part);
        expect(n.coverage).toBe("opaque");
        expect((n.d.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(3);
        expect(n.bounds.width).toBeGreaterThan(0);
      }

      // The root is never a rectangular 210x200 patch visible at 1×.
      const undercoat=nodes.get("eye-skin");
      if(undercoat?.kind!=="wax"||!undercoat.placement)
        throw new Error("Missing photo-crop undercoat");
      expect(undercoat.bounds.x).toBeLessThan(-100);
      expect(undercoat.bounds.width).toBeGreaterThan(440);
      const brow=nodes.get("brow-root");
      expect(brow).toMatchObject({kind:"wax",coverage:"open",
        clipToParent:true,parentId:"eye-skin"});
      const hairs=nodes.get("brow-rooted-fibres");
      if(hairs?.kind!=="contour")throw Error("Missing tangent-led eyebrow hairs");
      expect(hairs.parentId).toBe("brow-root");
      expect(hairs.clipToParent).toBe(true);
      expect((hairs.d.match(/Q/g)??[]).length).toBeGreaterThanOrEqual(91);
      // The source CC0 eye is hooded; its iris is off-axis and occluded.
      const iris=nodes.get("eye-iris"),sclera=nodes.get("eye-sclera");
      if(iris?.kind!=="wax"||sclera?.kind!=="wax")
        throw new Error("Missing photographed ocular volumes");
      expect(iris.clipToParent).toBe(true);
      expect(iris.bounds.x+iris.bounds.width/2)
        .toBeLessThan(sclera.bounds.x+sclera.bounds.width/2-7);
      const rootShadow=nodes.get("upper-lash-root-shadow");
      expect(rootShadow).toMatchObject({
        kind:"wax",parentId:"eye-skin",clipToParent:true,coverage:"open",
      });
      const irisOrder=spec.elements.findIndex(x=>x.id==="eye-iris");
      const lidOrder=spec.elements.findIndex(x=>x.id==="upper-lid-overhang");
      const shadowOrder=spec.elements.findIndex(x=>x.id==="upper-lash-root-shadow");
      expect(lidOrder).toBeGreaterThan(irisOrder);
      expect(shadowOrder).toBeGreaterThan(lidOrder);
      // Lower eyelid is a tonal volume OVER the opaque face, not a
      // pasted opaque pink ribbon. Same for the canthus contact shadow.
      for(const id of ["lower-lid-flesh","tear-duct"]){
        const n=nodes.get(id);
        expect(n).toMatchObject({kind:"wax",coverage:"open",clipToParent:true,
          parentId:"eye-skin"});
        if(n?.kind!=="wax")throw Error("Missing attached eye plane "+id);
        expect(n.blendRadius).toBeGreaterThan(1);
      }
      expect(nodes.get("eye-sclera")?.parentId).toBe("eye-skin");
      expect(nodes.get("eye-iris")?.parentId).toBe("eye-sclera");
      expect(nodes.get("eye-pupil")?.parentId).toBe("eye-iris");
      for(const name of ["upper-orbital-turn","eye-socket-umbra",
        "lower-orbital-hollow","upper-sclera-occlusion","lower-lid-groove"]){
        const n=nodes.get(name);
        expect(n).toMatchObject({kind:"wax",coverage:"open",clipToParent:true});
      }
      for(const name of ["upper-lashes","lower-lashes","lid-margin","brow-wax"]){
        const n=nodes.get(name);
        expect(n).toMatchObject({kind:"contour",clipToParent:true});
        if(n?.kind==="contour")expect((n.d.match(/M/g)??[]).length).toBeGreaterThan(1);
      }
      const final=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
      expect(final).toContain('data-km-crayon-underpaint="opaque"');
      expect(final).toContain('data-km-crayon-element="upper-lid-overhang"');
      expect(final).toContain('data-km-crayon-clipped-to="eye-sclera"');
      expect(final).not.toContain('data-km-crayon-lettering=');
    });
  }
  it("does not create a new Storybook folder or approve unverified source art",()=>{
    expect(faceMeta.tags).toContain("!dev");
    expect(faceMeta.title).toBe("Video production/Film Looks/Crayon/ArtCraft Adult Face Lab");
    expect(SourceMeasuredCc0Eye.args?.aspect).toBe("landscape");
    expect(SourceMeasuredCc0EyePortrait.args?.aspect).toBe("portrait");
    expect(()=>crayonCc0NearEyeStudy("portrait",0)).toThrow();
    expect(()=>crayonCc0NearEyeStudy("portrait",1.01)).toThrow();
    expect(()=>crayonCc0NearEyeStudy("portrait",1,"ink" as "smooth")).toThrow();
  });
});
