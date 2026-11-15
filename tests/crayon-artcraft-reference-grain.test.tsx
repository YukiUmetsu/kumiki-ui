import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonAdultFaceStudy} from "../src/video/crayon-artcraft-adult-face-fixtures";

const fields=[
  "near-orbital-plane-hatching","far-orbital-plane-hatching",
  "near-tear-trough-wax","far-tear-trough-wax",
  "philtrum-form-hatching","lower-lip-volume-hatching",
  "chin-turning-hatching",
];

describe("Crayon reference-led orbital and mouth wax hatching",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("keeps all marks attached to opaque face anatomy in "+aspect,()=>{
      const spec=crayonAdultFaceStudy(aspect,{detail:1});
      expect(inspectCrayonScene(spec)).toEqual([]);
      expect(spec.elements.find(n=>n.id==="adult-face")).toMatchObject({
        kind:"wax",coverage:"opaque",
      });
      for(const id of fields){
        const n=spec.elements.find(n=>n.id===id);
        expect(n,id).toMatchObject({
          kind:"contour",parentId:"adult-face",clipToParent:true,
        });
        if(n?.kind!=="contour")throw Error("No hatching: "+id);
        expect(n.d.length).toBeGreaterThan(20);
        expect(n.width).toBeLessThan(1);
      }
      // The generator accepts DEGREES. Reject former near-zero input
      // (0.12 degrees) which produced almost horizontal philtrum marks.
      const phi=spec.elements.find(n=>n.id==="philtrum-form-hatching");
      const orbital=spec.elements.find(n=>n.id==="near-orbital-plane-hatching");
      if(phi?.kind!=="contour"||orbital?.kind!=="contour")throw Error("Missing angle evidence");
      const firstDirection=(d:string)=>{
        const coords=d.match(/^M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Q-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/);
        if(!coords)throw Error("Unexpected authored Q stroke format");
        return {dx:Number(coords[3])-Number(coords[1]),dy:Number(coords[4])-Number(coords[2])};
      };
      const vertical=firstDirection(phi.d);
      expect(Math.abs(vertical.dy)).toBeGreaterThan(2*Math.abs(vertical.dx));
      const diagonal=firstDirection(orbital.d);
      expect(Math.abs(diagonal.dy)).toBeGreaterThan(.15*Math.abs(diagonal.dx));
      const rendered=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
      for(const id of fields)expect(rendered).toContain('data-km-crayon-element="'+id+'"');
      expect(renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>)).toBe(rendered);
    });
    it("honors zero-detail without disconnected decorative marks in "+aspect,()=>{
      const minimal=crayonAdultFaceStudy(aspect,{detail:0});
      expect(inspectCrayonScene(minimal)).toEqual([]);
      for(const id of fields)expect(minimal.elements.some(n=>n.id===id)).toBe(false);
    });
  }
});
