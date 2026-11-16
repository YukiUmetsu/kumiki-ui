import {describe,it,expect} from "vitest";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO31_GEOMETRY,riso31PhalanxSourcePath,riso31Inspect}
  from "../src/video/riso31-finger-phalanges";
import {riso52FoldedTerminalContact,riso52ProjectNailContour,
 RISO52_FOLDED_TERMINALS} from "../src/video/riso52-folded-terminal-source";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {RISO55_FOLDBACK_SOURCE,riso55FoldbackContour,riso55FoldbackPoint}
  from "../src/video/riso55-foldback-pulp-source";

const actors=[
  {spec:COURIER,actor:"courier",active:"right",inactive:"left"},
  {spec:PAPER_ARTIST,actor:"paper-artist",active:"left",inactive:"right"},
] as const;
const digits=["middle","ring","pinky"] as const;
const segments=["distal-phalanx","nail"] as const;

const extent=(d:string)=>{
  const paths=flattenRisoSvgPath(d,.12),points=paths.flatMap(p=>p.points);
  const ys=points.map(p=>p[1]),xs=points.map(p=>p[0]);
  return {minY:Math.min(...ys),maxY:Math.max(...ys),
    minX:Math.min(...xs),maxX:Math.max(...xs),paths};
};
describe("RISO55 ArtCraft: 3/4 distal pulp folds BACK into the palm",()=>{
  it("projects the visible fingertip towards the palm while preserving true DIP attachment and original RED/BLUE topology",()=>{
    for(const {actor} of actors){
      for(const digit of digits){
        const theta=RISO55_FOLDBACK_SOURCE.projectionDegrees[actor][digit];
        expect(theta).toBeGreaterThan(90);
        expect(theta).toBeLessThan(130);
        const [x0,y0]=riso55FoldbackPoint(0,-2,actor,digit);
        expect([x0,y0]).toEqual([0,-2]);
        const [x1,y1]=riso55FoldbackPoint(0,3,actor,digit);
        expect(y1).toBeLessThan(0);
        if(actor==="courier")expect(x1).toBeGreaterThan(2.3);
        else expect(x1).toBeLessThan(-2.3);
        expect(()=>riso55FoldbackContour("M0 0 <foreignObject>",actor,digit)).toThrow();
        expect(()=>riso55FoldbackPoint(NaN,2,actor,digit)).toThrow();
      }
    }
    expect(RISO55_FOLDBACK_SOURCE.affectedOriginalPartsPerActor).toBe(6);
  });
  it("keeps original source geometry untouched at f0, then redraws six living 3/4 DIP source paths per actor by f160",()=>{
    for(const {spec,actor,active,inactive} of actors){
      expect(inspectRisoCharacter(spec,["red","blue"])).toEqual([]);
      for(const digit of digits){
        const geometry=RISO31_GEOMETRY[digit];
        const ratio=RISO52_FOLDED_TERMINALS[actor][digit];
        const forward=riso31PhalanxSourcePath(digit,"distal",geometry.distal*ratio,geometry.width*.85);
        const folded=riso55FoldbackContour(forward,actor,digit);
        expect(extent(folded).maxY).toBeLessThan(extent(forward).maxY-1.2);
        const shape=extent(folded).paths;
        expect(shape).toHaveLength(1);
        expect(shape[0].closed).toBe(true);
        expect(Math.abs(risoContourSignedArea(shape[0].points))).toBeGreaterThan(2);
        for(const stage of segments){
          const id=active+"-glove-"+digit+"-"+stage;
          const part=spec.parts.find(p=>p.id===id)!;
          const intact=spec.parts.find(p=>p.id===inactive+"-glove-"+digit+"-"+stage)!;
          expect(part.pathKeys?.[0].d).toBe(part.d);
          expect(part.pathKeys?.[2].d).toBe(riso52FoldedTerminalContact(part,actor));
          expect(part.pathKeys?.map(k=>k.frame)).toEqual([0,146,160,180,205,239]);
          expect(intact.pathKeys).toBeUndefined();
          const frame0=evaluateRisoCharacter(spec,0).parts.find(p=>p.id===id)!;
          const at148=evaluateRisoCharacter(spec,148).parts.find(p=>p.id===id)!;
          const at160=evaluateRisoCharacter(spec,160).parts.find(p=>p.id===id)!;
          expect(frame0.d).toBe(part.d);
          expect(at148.d).not.toBe(part.d);
          expect(at160.d).not.toBe(part.d);
          expect((at160.d.match(/C/g)??[]).length).toBe((part.d.match(/C/g)??[]).length);
          expect((at160.d.match(/Q/g)??[]).length).toBe((part.d.match(/Q/g)??[]).length);
          expect(at160.plate).toBe(stage==="nail"?"blue":"red");
        }
        const nail=spec.parts.find(p=>p.id===active+"-glove-"+digit+"-nail")!;
        const projected=riso52ProjectNailContour(nail.d,ratio);
        expect(nail.pathKeys?.[2].d).toBe(riso55FoldbackContour(projected,actor,digit));
        const pose=evaluateRisoCharacter(spec,160);
        expect(pose.parts.find(p=>p.id===active+"-glove-"+digit+"-nail")?.transform)
          .toBe(pose.parts.find(p=>p.id===active+"-glove-"+digit+"-distal-phalanx")?.transform);
      }
    }
  });
  it("keeps 12 source RED finger bones, physically registered BLUE nail and original negative web over every 2-cel frame",()=>{
    for(const {spec,active} of actors){
      for(let frame=0;frame<240;frame+=2){
        // RISO31/33/36/54 already run all 120 cels in dedicated suites.
        // Evaluate ONCE rather than 4 times per cel for this independent
        // source-body test; still inspect every original moving ink.
        const parts=evaluateRisoCharacter(spec,frame).parts;
        const reds=parts.filter(p=>p.plate==="red"&&p.paint==="solid"&&
          new RegExp("^"+active+"-glove-(index|middle|ring|pinky)(?:-middle-phalanx|-distal-phalanx)?$").test(p.id));
        expect(reds).toHaveLength(12);
        expect(parts.filter(p=>p.id.startsWith(active+"-glove-web-reserve-"))).toHaveLength(2);
        for(const digit of digits){
          const red=parts.find(p=>p.id===active+"-glove-"+digit+"-distal-phalanx")!;
          const blue=parts.find(p=>p.id===active+"-glove-"+digit+"-nail")!;
          expect(red.plate).toBe("red");
          expect(blue.plate).toBe("blue");
          expect(red.transform).toBe(blue.transform);
        }
      }
      // Real ANAT1 axis separation across every cel is already protected
      // by RISO54: this source edition additionally checks all material
      // contracts at key release and contact stations.
      for(const frame of [144,154,156,160,166,178,186,202,239]){
        const bones=riso31Inspect(spec,frame,active);
        expect(bones).toHaveLength(4);
        expect(bones.every(b=>b.exactRedSource)).toBe(true);
        expect(inspectRiso36RedFingerSilhouettes(spec,frame,active).sourcePartCount).toBe(12);
        const space=inspectRiso33HandFan(spec,frame,active);
        expect(space.minimumAxisGap).toBeGreaterThan(3);
        expect(space.intersectingAxisPairs).toEqual([]);
      }
      for(const frame of [160,166])for(const aspect of ["landscape","portrait"] as const){
        const film=evaluateRisoHumanEnsemble(frame,aspect);
        const paper=inspectRiso44PrintedIndexContact(spec,frame,active,
          spec.id==="courier"?film.first:film.second,film.sheet);
        expect(paper.redIndexAreaTouchesPaper).toBe(true);
        expect(paper.thumbUnderPaper).toBe(true);
      }
    }
  },20000);
});
