import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {crayonWaxFiberContacts} from "../registry/video/materials/crayon";
import {WaxLine} from "../registry/video/materials/crayon-react";

const fiber="M0 0 C12 -1 3 58 20 70 M5 4 C10 17 15 42 18 65";
const parameters=[fiber,1.2,441,123,.78] as const;

describe("ArtCraft medium-native wax fiber contact",()=>{
  it("deposits a broken, physically attached filled contact path rather than a smooth hairline",()=>{
    const out=crayonWaxFiberContacts(...parameters);
    expect(out.segments).toBeGreaterThan(3);
    expect(out.body).toContain("Z");
    expect(out.pickup).toContain("Z");
    expect(out.body).toMatch(/M[0-9.-]+ [0-9.-]+ C/);
    expect(out.body).not.toContain("NaN");
    expect(out).toEqual(crayonWaxFiberContacts(...parameters));
    expect(out).not.toEqual(crayonWaxFiberContacts(fiber,1.2,442,123,.78));
  });
  it("respects paper, contact pressure and deterministic draw-in",()=>{
    const high=crayonWaxFiberContacts(...parameters);
    const low=crayonWaxFiberContacts(fiber,1.2,441,123,.3);
    expect(high.body).not.toBe(low.body);
    expect(crayonWaxFiberContacts(fiber,1.2,441,124,.78)).not.toEqual(high);
    const half=crayonWaxFiberContacts(fiber,1.2,441,123,.78,.5);
    expect(half.segments).toBeLessThan(high.segments);
    expect(crayonWaxFiberContacts(fiber,1.2,441,123,.78,0))
      .toMatchObject({body:"",pickup:"",segments:0});
  });
  it("deposits a broad visible wax side-nib, not pencil-width hairline",()=>{
    const mark=crayonWaxFiberContacts(
      "M0 0 C0 15 0 30 0 45",1,772,123,.82);
    const leftEdge=mark.body.match(/M(-?[0-9]+(?:[.][0-9]+)?) +[0-9.-]+ C/);
    expect(leftEdge).not.toBeNull();
    expect(Math.abs(Number(leftEdge?.[1]))).toBeGreaterThan(2);
  });
  it("rejects malformed paths and out of bounds materials",()=>{
    for(const d of ["M0 0 L10 10","M0 0 C4 3 8 4", "M0 0 C0 3 3 3 4 4<svg>"])
      expect(()=>crayonWaxFiberContacts(d,1,12,9,.6)).toThrow();
    expect(()=>crayonWaxFiberContacts(fiber,0,12,9,.6)).toThrow();
    expect(()=>crayonWaxFiberContacts(fiber,1.2,12,9,1.1)).toThrow();
    expect(()=>crayonWaxFiberContacts(fiber,1.2,12,9,.6,1.1)).toThrow();
  });
  it("keeps the classic line unchanged and opts into paper-raised wax contact",()=>{
    const base={d:fiber,color:"#553629",width:1.2,
      frame:90,first:1,last:80,reduced:false,seed:441,opacity:.7};
    const classic=renderToStaticMarkup(createElement(WaxLine,base));
    const wax=renderToStaticMarkup(createElement(WaxLine,{
      ...base,contact:"dry-wax",paperSeed:123,waxPressure:.78,
    }));
    expect(classic).toContain('data-km-crayon-line=""');
    expect(classic).not.toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(wax).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(wax).toContain('data-km-crayon-fiber-pickup=""');
    expect(wax).not.toContain('data-km-crayon-line=""');
    expect(wax).toBe(renderToStaticMarkup(createElement(WaxLine,{
      ...base,contact:"dry-wax",paperSeed:123,waxPressure:.78,
    })));
  });
});
