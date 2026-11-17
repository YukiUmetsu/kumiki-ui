import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createRiso72PaperAffine,riso72PaperMmToImagePixel,
  riso72ImagePixelToPaperMm,riso72SvgMatrix}
  from "../registry/video/riso-paper-photo-affine";
import {Riso72PaperPhotoComparator}
  from "../src/video/riso72-paper-photo-comparator";
import {risoPrintRegistrationTargets}
  from "../registry/video/riso-scan-proof";
import type {RisoProofPoint,RisoScanMeasurements}
  from "../registry/video/riso-scan-proof";
import {riso68OriginalMasters,riso68PaperProfile}
  from "../src/video/riso-master-separation-studio";
import {risoExampleSpec} from "../src/video/riso-print-demo";
import {serializeRisoSeparationMaster}
  from "../registry/video/riso-separation-master";

const sheet=[297,210] as const;
const imageSize=[6100,4700] as const;
const sheetToImage=([x,y]:RisoProofPoint):RisoProofPoint=>{
  const theta=13*Math.PI/180;
  return [720+13*(x*Math.cos(theta)-y*Math.sin(theta)),
    380+13*(x*Math.sin(theta)+y*Math.cos(theta))];
};
const corners=()=>{
  const points=([[0,0],[sheet[0],0],[sheet[0],sheet[1]],[0,sheet[1]]] as const);
  return (["top-left","top-right","bottom-right","bottom-left"] as const)
    .map((id,i)=>({id,scanPx:sheetToImage(points[i])}));
};
describe("RISO72 image-based native physical-paper source verification",()=>{
  it("rectifies a rotated scan using PAPER corners alone, without pixel or contour erasure",()=>{
    const proof=createRiso72PaperAffine({corners:corners()},sheet,imageSize);
    expect(proof.paperOnly).toBe(true);
    expect(proof.worstPaperCornerResidualMm).toBeLessThan(1e-8);
    const point:[number,number]=[91.827,107.3];
    const source=riso72PaperMmToImagePixel(proof,point);
    expect(riso72ImagePixelToPaperMm(proof,source)[0]).toBeCloseTo(point[0],8);
    expect(riso72ImagePixelToPaperMm(proof,source)[1]).toBeCloseTo(point[1],8);
    expect(source[0]).toBeCloseTo(sheetToImage(point)[0],8);
    expect(riso72SvgMatrix(proof.pixelToSheet)).toMatch(/^matrix\(/);
  });
  it("rejects non-affine photographic perspective, folded sheet and mirrored pixel orders",()=>{
    const base=corners();
    const skew=base.map((c,i)=>i===2?({
      ...c,scanPx:[c.scanPx[0]+30,c.scanPx[1]-40] as const}):c);
    expect(()=>createRiso72PaperAffine({corners:skew},sheet,imageSize))
      .toThrow(/non-affine/);
    const folded=base.map((c,i)=>({...c,scanPx:[base[0],base[3],base[2],base[1]][i].scanPx}));
    expect(()=>createRiso72PaperAffine({corners:folded},sheet,imageSize))
      .toThrow(/mirrored/);
    const flat=base.map((c,i)=>i===3?({...c,scanPx:base[0].scanPx}):c);
    expect(()=>createRiso72PaperAffine({corners:flat},sheet,imageSize))
      .toThrow(/degenerate/);
  });
  it("refuses absent/outside-image paper pixels, impossible image dimensions and unverifiable allowances",()=>{
    const c=corners();
    expect(()=>createRiso72PaperAffine({corners:c.slice(1)},sheet,imageSize))
      .toThrow(/four complete/);
    expect(()=>createRiso72PaperAffine({corners:c},sheet,[10,100]))
      .toThrow(/pixel size/);
    const outside=c.map((p,i)=>i===0?({...p,scanPx:[-1,2] as const}):p);
    expect(()=>createRiso72PaperAffine({corners:outside},sheet,imageSize))
      .toThrow(/in-image/);
    expect(()=>createRiso72PaperAffine({corners:c},sheet,imageSize,0))
      .toThrow(/allowance/);
  });
  it("ink drift cannot move the paper-derived camera, and both original spot source files remain identical",()=>{
    const spec=risoExampleSpec("landscape",66);
    const masters=riso68OriginalMasters("landscape",160,66);
    const layout=riso68PaperProfile("landscape",{marks:"crop-and-register"});
    const targets=risoPrintRegistrationTargets(spec,masters,layout);
    const scan:RisoScanMeasurements={kind:"physical-scan",
      corners:corners(),plates:spec.plates.map(p=>({
        plateId:p.id,marks:(["top","bottom","left","right"] as const).map(id=>({
          id,scanPx:sheetToImage([
            targets[id][0]+(p.id==="red"?1.3:0),
            targets[id][1]+(p.id==="red"?-.7:0),
          ]),
        })),
      }))};
    // Offset all ink pixels by an arbitrary large amount; the paper affine
    // must still only derive from original corner pixels.
    const inkMoved:RisoScanMeasurements={...scan,plates:scan.plates.map(p=>({
      ...p,marks:p.marks.map(m=>({...m,scanPx:[
        m.scanPx[0]+(p.plateId==="red"?12:0),
        m.scanPx[1]+(p.plateId==="red"?29:0),
      ] as const})),
    }))};
    const a=createRiso72PaperAffine(scan,layout.sheetMm,imageSize);
    const b=createRiso72PaperAffine(inkMoved,layout.sheetMm,imageSize);
    expect(b).toEqual(a);
    const before=spec.plates.map(p=>serializeRisoSeparationMaster(
      spec,masters,layout,p.id));
    createRiso72PaperAffine({corners:corners()},sheet,imageSize);
    expect(spec.plates.map(p=>serializeRisoSeparationMaster(
      spec,masters,layout,p.id))).toEqual(before);
  });
  it("SSR shows actual independent K-only native masters and correctly labelled photo proof",()=>{
    const spec=risoExampleSpec("landscape",66);
    const masters=riso68OriginalMasters("landscape",160,66);
    const layout=riso68PaperProfile("landscape",{marks:"crop-and-register"});
    const raw=Object.fromEntries(spec.plates.map(p=>[p.id,
      serializeRisoSeparationMaster(spec,masters,layout,p.id)]));
    const marks=risoPrintRegistrationTargets(spec,masters,layout);
    const scan: RisoScanMeasurements={kind:"physical-scan",
      corners:corners(),plates:spec.plates.map(p=>({
        plateId:p.id,marks:(["top","bottom","left","right"] as const).map(id=>({
          id,scanPx:sheetToImage(marks[id]),
        })),
      }))};
    const html=renderToStaticMarkup(<Riso72PaperPhotoComparator
      photo={{url:"blob:local-test",width:imageSize[0],height:imageSize[1]}}
      measurements={scan} sheetMm={sheet} originalMasters={raw}
      expectedMarksMm={marks}/>);
    expect(html).toContain('data-km-riso72-valid="true"');
    expect(html).toContain('data-km-riso72-mode="paired"');
    expect(html).toContain('data-km-riso72-original-master="blue"');
    expect(html).toContain('data-km-riso72-rectified-photo=""');
    expect(html.match(/data-km-riso72-offset=/g)).toHaveLength(8);
    expect(html.match(/data-km-riso68-source=/g)).toHaveLength(4);
    expect(html).toContain('fill-rule="evenodd"');
    expect(html).not.toMatch(/<canvas|<filter|<foreignObject|<script|feGaussianBlur/);
  });
});
