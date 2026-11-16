import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy}
  from "../src/video/crayon-artcraft-cc0-face";
import {auditCrayonF1LashRootContinuity,
  CRAYON_F1_LASH_CLUSTER_COUNTS}
  from "../src/video/crayon-artcraft-f1-lash-clusters";

type Point=readonly [number,number];
type Fiber={tip:Point;root:Point};
const n="-?\\d+(?:\\.\\d+)?";
const cubic=new RegExp("M("+n+") ("+n+") C("+n+") ("+n+") ("+
  n+") ("+n+") ("+n+") ("+n+")","g");
function parseFibers(d:string):Fiber[]{
  const matches=[...d.matchAll(cubic)];
  if(matches.length!==(d.match(/M/g)??[]).length)
    throw new RangeError("Malformed native CRAYON1 cubic");
  return matches.map(m=>({
    tip:[Number(m[1]),Number(m[2])] as const,
    root:[Number(m[7]),Number(m[8])] as const,
  }));
}
const len=(f:Fiber)=>Math.hypot(
  f.tip[0]-f.root[0],f.tip[1]-f.root[1],
);
const studied={eyeContact:"source-sculpt" as const,
  lashFinish:"rooted-flow" as const,midfaceForm:"baseline" as const,
  jawNeckForm:"baseline" as const,browForm:"baseline" as const};

describe("ArtCraft F1 photographed rooted lash tip flow (unapproved)",()=>{
  it("preserves the original 47 source-rooted fibers, with shorter but nonuniform free tips",()=>{
    const control=crayonCc0FaceStudy({...studied,lashFinish:"rooted"});
    const next=crayonCc0FaceStudy(studied);
    const changed=new Set(["lash-contact-near","lash-contact-far"]);
    expect(next.elements.filter(e=>!changed.has(e.id)))
      .toEqual(control.elements.filter(e=>!changed.has(e.id)));
    expect(next.durationFrames).toBe(control.durationFrames);
    expect(next.seed).toBe(control.seed);
    expect(next.paper).toBe(control.paper);
    expect(next.paperTooth).toBe(control.paperTooth);
    expect(next.camera).toEqual(control.camera);
    for(const side of ["near","far"] as const){
      const name="lash-contact-"+side;
      const before=control.elements.find(e=>e.id===name);
      const after=next.elements.find(e=>e.id===name);
      if(before?.kind!=="contour"||after?.kind!=="contour")
        throw new Error("Missing source lash "+side);
      const prev=parseFibers(before.d),curr=parseFibers(after.d);
      expect(curr.length).toBe(CRAYON_F1_LASH_CLUSTER_COUNTS[side]);
      expect(curr.length).toBe(prev.length);
      const ratios=curr.map((f,i)=>{
        expect(f.root).toEqual(prev[i].root);
        expect(len(f)).toBeLessThan(len(prev[i])+.01);
        return len(f)/len(prev[i]);
      });
      expect(ratios.every(r=>r>0&&r<.94)).toBe(true);
      const lengths=curr.map(len);
      // A hand-authored irregular family: no evenly spaced stamps.
      expect(new Set(lengths.map(v=>v.toFixed(2))).size).toBeGreaterThan(8);
      expect(Math.max(...lengths)).toBeLessThan(side==="near"?7.2:6);
      expect(after).toMatchObject({
        kind:"contour",parentId:"face-outline",clipToParent:true,
        waxContact:"dry-wax",
      });
      expect(after.width).toBeLessThan(before.width);
      expect(after.waxPressure).toBeLessThan(before.waxPressure);
    }
    const audit=auditCrayonF1LashRootContinuity(next.elements);
    expect(audit.near.detached).toBe(0);
    expect(audit.far.detached).toBe(0);
    expect(inspectCrayonScene(next)).toEqual([]);
  });
  it("retains exact baseline and previous rooted negative controls",()=>{
    expect(crayonCc0FaceStudy({eyeContact:"baseline",lashFinish:"rooted-flow"}))
      .toEqual(crayonCc0FaceStudy({eyeContact:"baseline",lashFinish:"sparse"}));
    const original=crayonCc0FaceStudy({eyeContact:"source-sculpt",lashFinish:"rooted"});
    const again=crayonCc0FaceStudy({eyeContact:"source-sculpt",lashFinish:"rooted"});
    expect(again).toEqual(original);
    expect(crayonCc0FaceStudy({eyeContact:"source-sculpt",lashFinish:"rooted-flow"}))
      .not.toEqual(original);
    expect(()=>crayonCc0FaceStudy({lashFinish:"invalid" as "rooted-flow"}))
      .toThrow(RangeError);
  });
  it("renders source-grain dry wax rather than raster eyelashes",()=>{
    const svg=renderToStaticMarkup(<CrayonScene spec={crayonCc0FaceStudy(studied)}
      frame={299}/>);
    for(const id of ["lash-contact-near","lash-contact-far","tarsal-shelf-near",
      "tarsal-shelf-far","source-tarsal-burnish-near"]){
      expect(svg).toContain('data-km-crayon-element="'+id+'"');
    }
    expect(svg).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(svg).not.toContain("<image ");
  },20_000);
});
