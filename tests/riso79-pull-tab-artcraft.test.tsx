import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {evaluateRisoPullTab,risoPullWindowFibres,risoPullProgress} from "../registry/video/riso-pull-tab";
import {RisoPullTabTheatre} from "../registry/video/riso-pull-tab-react";
import {RISO79_PULL_TAB_FILM} from "../src/video/riso79-pull-tab-film";
import {RisoPullTabFilmStudio} from "../src/video/riso79-pull-tab-studio";
import {risoExampleSpec,risoExampleArtworks} from "../src/video/riso-print-demo";
import {risoSecondSheetArtworks} from "../src/video/riso-print-demo-alt";
import {compileFilm} from "../registry/video/film-document";
const windows=[
{id:"a",x:472,y:164,width:110,height:218,radius:10},
{id:"b",x:601,y:164,width:110,height:218,radius:10},
{id:"c",x:730,y:164,width:110,height:218,radius:10},
] as const;
const cover={spec:risoExampleSpec("landscape",23),artworks:risoExampleArtworks("landscape")};
const insert={spec:risoExampleSpec("landscape",38),artworks:risoSecondSheetArtworks("landscape")};
const args={width:960,height:540,windows,direction:"right" as const,seed:79,travel:182.4,progress:.5};
const image=(progress:number,relief=.7)=>renderToStaticMarkup(
<RisoPullTabTheatre cover={cover} insert={insert} windows={windows} travel={182.4}
progress={progress} paperRelief={relief}
drumContact={{dryness:.22,feed:"top-to-bottom"}}/>);
describe("RISO79 original die-cut source prints and sliding paper",()=>{
it("retains both original separate two-ink print masters beneath three actual openings",()=>{
const html=image(.5);
expect(html.match(/data-km-riso-print=/g)).toHaveLength(2);
expect(html.match(/data-km-riso-plate="blue"/g)).toHaveLength(2);
expect(html.match(/data-km-riso-plate="red"/g)).toHaveLength(2);
expect(html.match(/data-km-riso79-cut-rim=/g)).toHaveLength(3);
expect(html.match(/data-km-riso79-cut-fibre=/g)).toHaveLength(264);
expect(html.match(/data-km-riso79-paper-cross-section=/g)).toHaveLength(3);
expect(html.match(/data-km-riso79-paper-wall=/g)).toHaveLength(3);
expect(html.match(/data-km-riso79-edge-bevel=/g)).toHaveLength(3);
expect(html.match(/data-km-riso79-cavity-occlusion=/g)).toHaveLength(3);
expect(html.match(/data-km-riso79-cut-face-highlight=/g)).toHaveLength(3);
expect(html).toContain('data-km-riso79-paper-depth-mm="0.32"');
expect(html).toContain('data-km-riso79-stationary-original-cover=""');
expect(html).toContain('data-km-riso79-printed-insert-window=""');
expect(html).toContain('data-km-riso79-fixed-ink-master=""');
expect(html).toContain("THE");expect(html).toContain("FOLLOW");
expect(html).not.toMatch(/feGaussianBlur|<canvas|<foreignObject/);
});
it("moves one entire original ink master without reprinting or moving the die-cut shape",()=>{
for(const direction of ["left","right","up","down"] as const){
const travel=(direction==="left"||direction==="right"?960:540)*.19;
const start=evaluateRisoPullTab({...args,direction,travel,progress:0});
const end=evaluateRisoPullTab({...args,direction,travel,progress:1});
expect(start.translation).toEqual([0,0]);
const expected=direction==="right"?[travel,0]:
direction==="left"?[-travel,0]:direction==="down"?[0,travel]:[0,-travel];
expect(end.translation[0]).toBeCloseTo(expected[0],4);
expect(end.translation[1]).toBeCloseTo(expected[1],4);
expect(end.windows.map(w=>w.path)).toEqual(start.windows.map(w=>w.path));
expect(end.windows.map(w=>w.fibres)).toEqual(start.windows.map(w=>w.fibres));
expect(end.fixedCoverRegistration).toBe(true);
expect(end.fixedInsertRegistration).toBe(true);
}
});
it("stock caliper and lamp direction change only the paper cross-section and shadow, never source ink or cut geometry",()=>{
const base=evaluateRisoPullTab({...args,progress:.5});
const thicker=evaluateRisoPullTab({...args,progress:.5,paperDepthMm:.82});
const relit=evaluateRisoPullTab({...args,progress:.5,lightDirection:[.8,-.6]});
expect(base.depthUnits).toBeCloseTo(.32*96/25.4,3);
expect(thicker.depthUnits).toBeGreaterThan(base.depthUnits);
expect(thicker.shadowOffset).not.toEqual(base.shadowOffset);
expect(relit.shadowOffset).not.toEqual(base.shadowOffset);
expect(thicker.windows.map(w=>w.path)).toEqual(base.windows.map(w=>w.path));
expect(relit.windows.map(w=>w.path)).toEqual(base.windows.map(w=>w.path));
expect(thicker.windows.map(w=>w.fibres)).toEqual(base.windows.map(w=>w.fibres));
expect(relit.translation).toEqual(base.translation);
});
it("owns 88 different deterministic individually curved physical cellulose cuts per opening",()=>{
for(const w of windows){
const fibres=risoPullWindowFibres(w,79);
expect(fibres).toHaveLength(88);
expect(new Set(fibres).size).toBe(88);
expect(fibres.every(d=>d.startsWith("M")&&d.includes(" Q"))).toBe(true);
expect(fibres).toEqual(risoPullWindowFibres(w,79));
expect(fibres).not.toEqual(risoPullWindowFibres(w,80));
}
const a=image(.2),b=image(.8);
const paths=(s:string)=>Array.from(s.matchAll(/data-km-riso79-cut-fibre="[^"]+" d="([^"]+)"/g),m=>m[1]);
expect(paths(a)).toEqual(paths(b));
expect(a).not.toEqual(b);
expect(image(.2)).toEqual(a);
});
it("zero added rim relief preserves both source prints but hides incision fibres",()=>{
const html=image(.4,0);
expect(html).not.toContain("data-km-riso79-cut-fibre=");
expect(html).not.toContain("data-km-riso79-inside-contact-shadow=");
expect(html).not.toContain("data-km-riso79-paper-wall=");
expect(html).not.toContain("data-km-riso79-cut-face-highlight=");
expect(html.match(/data-km-riso-print=/g)).toHaveLength(2);
});
it("rejects overlap, matching named openings, travel beyond stock and invalid film time",()=>{
expect(()=>evaluateRisoPullTab({...args,travel:999})).toThrow(/bounded travel/);
expect(()=>evaluateRisoPullTab({...args,progress:NaN})).toThrow(/progress/);
expect(()=>evaluateRisoPullTab({...args,paperDepthMm:1.21})).toThrow(/paper depth/);
expect(()=>evaluateRisoPullTab({...args,lightDirection:[0,0]})).toThrow(/light direction/);
expect(()=>evaluateRisoPullTab({...args,windows:[windows[0],windows[0]]})).toThrow(/unique/);
expect(()=>evaluateRisoPullTab({...args,windows:[windows[0],{...windows[1],x:490}]})).toThrow(/between cut edges/);
expect(()=>risoPullProgress(-1,0,140)).toThrow(/absolute/);
const wrong={...insert,spec:risoExampleSpec("portrait",38)};
expect(()=>renderToStaticMarkup(<RisoPullTabTheatre cover={cover} insert={wrong}
windows={windows} travel={150} progress={.5}/>)).toThrow(/same dimensions/);
});
it("uses true 24fps film slots for landscape and portrait; reduced motion finishes pull",()=>{
for(const outputId of ["landscape","portrait"] as const){
const c=compileFilm(RISO79_PULL_TAB_FILM,{outputId});
expect(c.ok).toBe(true);
if(c.ok){expect(c.film.durationFrames).toBe(240);expect(c.film.scenes).toHaveLength(3);}
}
expect(risoPullProgress(0,0,143)).toBe(0);
expect(risoPullProgress(143,0,143)).toBe(1);
expect(risoPullProgress(0,0,143,true)).toBe(1);
const html=renderToStaticMarkup(<RisoPullTabFilmStudio/>);
expect(html).toContain('data-km-riso79-studio=""');
expect(html).toContain('data-km-riso79-frame="110"');
expect(html).toContain('data-km-riso79-theatre=""');
});
});
