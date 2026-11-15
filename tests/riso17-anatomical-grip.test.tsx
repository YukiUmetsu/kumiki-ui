import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {RisoCharacterInk,RisoCharacterKnockout} from "../registry/video/riso-character-react";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,RisoHumanEnsembleStudio} from "../src/video/riso-human-ensemble";

const fingers=(side:"left"|"right")=>[
  side+"-glove-index",side+"-glove-middle",side+"-glove-ring",side+"-glove-thumb",
  side+"-finger-joint-lines",side+"-glove-detail",side+"-glove-thumb-fold",
];

describe("RISO17 source-driven anatomical grip occlusion",()=>{
  it("isolates the actual posed four finger silhouettes from the original rig, not an ellipse sticker",()=>{
    const ids=fingers("right");
    const full=renderToStaticMarkup(createElement(RisoCharacterKnockout,{
      spec:COURIER,frame:160
    }));
    const contact=renderToStaticMarkup(createElement(RisoCharacterKnockout,{
      spec:COURIER,frame:160,...{onlyPartIds:ids}
    }));
    expect(full).toContain('data-km-riso-knockout-part="coat"');
    expect(contact).toContain('data-km-riso-knockout-part="right-glove-thumb"');
    expect(contact).toContain('data-km-riso-knockout-part="right-glove-index"');
    expect(contact).not.toContain('data-km-riso-knockout-part="coat"');
    expect(contact).not.toContain('data-km-riso-knockout-part="face"');
    expect((contact.match(/data-km-riso-knockout-part=/g)||[]).length).toBe(ids.length);
    expect(contact).toBe(renderToStaticMarkup(createElement(RisoCharacterKnockout,{
      spec:COURIER,frame:160,...{onlyPartIds:ids}
    })));
  });

  it("draws actual fine blue knuckle lines and red finger solids as separate opaque masters",()=>{
    for(const [spec,side] of [[COURIER,"right"],[PAPER_ARTIST,"left"]] as const){
      const ids=fingers(side);
      for(const [plateId,expected,excluded] of [
        ["red",side+"-glove-thumb",side+"-finger-joint-lines"],
        ["blue",side+"-finger-joint-lines",side+"-glove-thumb"],
      ] as const){
        const art=renderToStaticMarkup(createElement(RisoCharacterInk,{
          spec,frame:160,plateId,paint:{solid:"#22619b",dots:"url(#screen)"},
          ...{onlyPartIds:ids},
        }));
        expect(art).toContain('data-km-riso-part="'+expected+'"');
        expect(art).not.toContain('data-km-riso-part="'+excluded+'"');
        expect(art).not.toContain('data-km-riso-part="coat"');
        expect(art).not.toContain('opacity="0.');
      }
    }
  });

  it("rejects missing, duplicate and invalid per-character part selections",()=>{
    for(const ids of [["missing-part"],["right-glove-thumb","right-glove-thumb"],[]]){
      expect(()=>renderToStaticMarkup(createElement(RisoCharacterKnockout,{
        spec:COURIER,frame:160,...{onlyPartIds:ids},
      }))).toThrow(RangeError);
      expect(()=>renderToStaticMarkup(createElement(RisoCharacterInk,{
        spec:COURIER,frame:160,plateId:"red",paint:{solid:"#123",dots:"url(#dots)"},
        ...{onlyPartIds:ids},
      }))).toThrow(RangeError);
    }
  });

  it("orders existing full humans, actual opaque sheet, then finger and thumb prints",()=>{
    const html=renderToStaticMarkup(createElement(RisoHumanEnsembleStudio));
    // Previous RISO17 two-front-grip pose is still the default Storybook frame,
    // even though the new RISO18 scene subsequently transfers ownership.
    expect(html).toContain('data-km-riso-handoff-phase="shared"');
    expect(html).toContain('data-km-riso-handoff-owner="both"');
    const index=(layer:string)=>html.indexOf('data-km-riso-paper-knockout="'+layer+'"');
    expect(index("courier")).toBeGreaterThan(-1);
    expect(index("paper-artist")).toBeGreaterThan(index("courier"));
    expect(index("shared-letter")).toBeGreaterThan(index("paper-artist"));
    expect(index("courier-grip")).toBeGreaterThan(index("shared-letter"));
    expect(index("artist-grip")).toBeGreaterThan(index("courier-grip"));
    expect(html).toContain('data-km-riso-foreground-layer="courier-grip"');
    expect(html).toContain('data-km-riso-foreground-layer="artist-grip"');
    expect(html).toContain('data-km-riso-human-ensemble-sheet=');
    // A physical cutout contains only the four filled finger pads.
    // Blue knuckle lines are printed in ink, never white paper masks.
    for(const name of ["courier-grip","artist-grip"]){
      const layer=html.match(new RegExp('<g data-km-riso-grip-occlusion="'+name+'">([\\s\\S]*?)<\\/g>'))?.[1]??"";
      expect((layer.match(/data-km-riso-knockout-part=/g)||[]).length).toBe(4);
      expect(layer).not.toContain("finger-joint-lines");
      expect(layer).not.toContain("glove-detail");
    }
  });
});
