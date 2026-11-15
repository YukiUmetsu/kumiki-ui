import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonDryNibPath,crayonMarks,crayonPaperHeight} from "../registry/video/materials/crayon";
import {crayonCc0NearEyeStudy} from "../src/video/crayon-artcraft-cc0-near-eye";
import {crayonPaperContactSwatches} from "../src/video/crayon-artcraft-paper-contact-fixtures";
import faceMeta,{SourceMeasuredCc0Eye,SourceMeasuredCc0EyePortrait}
  from "../src/video/crayon-artcraft-adult-face.stories";
describe("Crayon pressure-and-paper contact material studies",()=>{
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
