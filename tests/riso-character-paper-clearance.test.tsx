import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {RisoCharacterInk} from "../registry/video/riso-character-react";
import {COURIER,PAPER_BIRD} from "../src/video/riso-character-demo";

const paint={solid:"#2362A0",dots:"url(#riso-test-halftone)"};

describe("Risograph local paper clearance for layered actors",()=>{
  it("Courier's paper face clears all earlier body/hand/strap inks before facial details",()=>{
    const ids=COURIER.parts.map(part=>part.id);
    const face=ids.indexOf("face");
    expect(face).toBeGreaterThan(ids.indexOf("right-glove"));
    expect(face).toBeGreaterThan(ids.indexOf("satchel-strap"));
    expect(face).toBeGreaterThan(ids.indexOf("coat"));
    expect(face).toBeLessThan(ids.indexOf("face-outline"));
    expect(COURIER.parts[face].knockoutOnly).toBe(true);
    for(const plateId of ["blue","red"]){
      const html=renderToStaticMarkup(React.createElement(RisoCharacterInk,{
        spec:COURIER,frame:157,plateId,paint,
      }));
      expect(html).toContain('data-km-riso-paper-clearance="face"');
      expect(html).toContain("<mask");
      expect(html).toContain('fill="black"');
      expect(html).toContain('fill="white"');
      expect(html).toContain('mask="url(#');
      expect(html).toContain('data-km-riso-ink-segment="0"');
      expect(html).not.toContain('data-km-riso-part="face"');
      expect(html).toContain('data-km-riso-part="mouth"');
    }
  });

  it("mask and print output are absolute-frame deterministic",()=>{
    const markup=(frame:number)=>renderToStaticMarkup(React.createElement(RisoCharacterInk,{
      spec:COURIER,frame,plateId:"blue",paint,
    }));
    const original=markup(160);
    const other=markup(198);
    expect(original).not.toEqual(other);
    expect(markup(160)).toEqual(original);
    expect(markup(198)).toEqual(other);
  });

  it("actors without authored paper cutouts are unaffected",()=>{
    for(const plateId of ["blue","red"]){
      const html=renderToStaticMarkup(React.createElement(RisoCharacterInk,{
        spec:PAPER_BIRD,frame:84,plateId,paint,
      }));
      expect(html).not.toContain("<mask");
      expect(html).not.toContain('data-km-riso-paper-clearance');
      expect(html).toContain('data-km-riso-character="paper-bird"');
    }
  });
});
