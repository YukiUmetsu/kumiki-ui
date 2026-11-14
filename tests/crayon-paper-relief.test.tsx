import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {Paper,WaxRegion} from "../registry/video/materials/crayon-react";

const colors=["#d78764","#96617a","#ffd4a4"] as const;
const shape="M10 20Q25 0 60 15Q109 42 78 102Q55 123 13 98Z";
function scene(frame:number,pressure:number,strength:number,coverage:"opaque"|"open"="opaque",seed=19){
 return renderToStaticMarkup(<svg>
   <Paper width={192} height={144} tooth="physical-paper" seed={seed} strength={strength}/>
   <rect x="0" y="0" width="192" height="144" fill="#194c82"/>
   <WaxRegion d={shape} bounds={{x:3,y:0,width:118,height:130}}
     colors={colors} tooth="physical-paper" seed={47}
     frame={frame} first={0} last={140} reduced={false}
     pressure={pressure} spacing={6} coverage={coverage}/>
 </svg>);
}
describe("CRAYON1 pressure-aware paper relief",()=>{
 it("creates paper-anchored grain with deterministic seed and strength",()=>{
   const a=scene(140,.7,.84);
   const b=scene(140,.7,.84);
   expect(a).toBe(b);
   expect(a).toContain('data-km-crayon-paper-relief=""');
   const grain=a.match(/<pattern id="physical-paper-relief"[\\s\\S]+?<\\/pattern>/)?.[0];
   expect(grain).toContain("<path");
   expect(grain).not.toContain('<rect');
   expect(scene(140,.7,0)).not.toEqual(a);
   expect(scene(140,.7,.84,"opaque",20)).not.toEqual(a);
 });
 it("soft contact reveals more paper tooth while opaque characters block the scenery",()=>{
   const soft=scene(140,.28,.88),firm=scene(140,.95,.88);
   const contact=(text:string)=>Number(text.match(/data-km-crayon-paper-contact="([0-9.]+)"/)?.[1]);
   expect(contact(soft)).toBeGreaterThan(contact(firm));
   expect(soft).toContain('fill="url(#physical-paper-relief)"');
   expect(firm).toContain('fill="url(#physical-paper-relief)"');
   for(const html of [soft,firm]){
      const at=html.indexOf('data-km-crayon-underpaint="opaque"');
      expect(at).toBeGreaterThan(0);
      const tag=html.slice(html.lastIndexOf("<path",at),html.indexOf(">",at)+1);
      expect(tag).not.toContain("mask=");
      expect(tag).not.toContain("opacity=");
   }
 });
 it("preserves open backgrounds, animated draw-on and reversed frame-seek determinism",()=>{
   expect(scene(140,.28,.88,"open")).not.toContain('data-km-crayon-underpaint="opaque"');
   expect(scene(42,.66,.88)).not.toEqual(scene(140,.66,.88));
   const snap=scene(83,.66,.88);
   scene(11,.66,.88);
   scene(140,.66,.88);
   expect(scene(83,.66,.88)).toBe(snap);
 });
});
