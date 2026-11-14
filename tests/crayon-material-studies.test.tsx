import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {MaterialStudy} from "../src/video/crayon-material-studies.stories";

const common={
  frame:48,pressure:.9,paperTooth:.79,left:"opaque" as const,right:"opaque" as const,
  leftNib:"tapered" as const,rightNib:"tapered" as const,
  strokeOrder:"patches" as const,pressureSplit:false,compareStrokeOrder:false,
  leftLength:"long" as const,rightLength:"long" as const,
  underlay:"cobalt" as const,
};
describe("crayon craft A/B studies truthfully compare different mechanisms",()=>{
 it("paints historic scanline left and local hand patches right, not two identical modes",()=>{
   const html=renderToStaticMarkup(<MaterialStudy {...common} compareStrokeOrder/>);
   expect(html).toContain("SCANLINE REVEAL");
   expect(html).toContain("HAND-PAINTED PATCHES");
   const scan=html.indexOf('data-km-crayon-stroke-order="scanline"');
   const patches=html.indexOf('data-km-crayon-stroke-order="patches"');
   expect(scan).toBeGreaterThan(0);
   expect(patches).toBeGreaterThan(scan);
   const same=renderToStaticMarkup(<MaterialStudy {...common}/>);
   expect(same).not.toContain('data-km-crayon-stroke-order="scanline"');
   expect(same).not.toEqual(html);
 });
 it("does not show a finished nose before the wax portrait reaches the detail stage",()=>{
   const blank=renderToStaticMarkup(<MaterialStudy {...common} frame={0}/>);
   const mid=renderToStaticMarkup(<MaterialStudy {...common} frame={85}/>);
   const late=renderToStaticMarkup(<MaterialStudy {...common} frame={86}/>);
   expect(blank).not.toContain('data-km-crayon-optics-nose=""');
   expect(mid).not.toContain('data-km-crayon-optics-nose=""');
   expect(late.match(/data-km-crayon-optics-nose=""/g)).toHaveLength(2);
 });
 it("labels left/right wax length controls according to the actual choice",()=>{
   const html=renderToStaticMarkup(<MaterialStudy {...common}
     leftLength="long" rightLength="short"/>);
   expect(html).toContain("LONG WAX RUBBING");
   expect(html).toContain("SHORT WAX FLECKS");
   expect(html.indexOf("LONG WAX RUBBING")).toBeLessThan(html.indexOf("SHORT WAX FLECKS"));
 });
});
