import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonMarks} from "../registry/video/materials/crayon";
import {Paper,WaxRegion} from "../registry/video/materials/crayon-react";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonDemoScene} from "../src/video/crayon-scene-fixtures";

const bounds={x:0,y:0,width:360,height:180};
const common={seed:81,pressure:.8,spacing:10};
describe("CRAYON1 localized hand-coloring order",()=>{
  it("preserves exact physical artwork while changing drawing chronology",()=>{
    const scan=crayonMarks(bounds,{...common,strokeOrder:"scanline"});
    const hand=crayonMarks(bounds,{...common,strokeOrder:"patches"});
    const ids=(marks:typeof hand)=>marks.map(m=>m.index);
    expect(ids(scan).slice(0,5)).toEqual([0,1,2,3,4]);
    expect(ids(hand).slice(0,5)).toEqual([0,3,6,9,12]);
    expect(ids(hand).slice(5,10)).toEqual([13,10,7,4,1]);
    // Visit the nearby vertical patch before moving across the whole row.
    expect(ids(hand).slice(10,15)).toEqual([27,24,21,18,15]);
    expect(hand).toEqual(crayonMarks(bounds,{...common,strokeOrder:"patches"}));
    const byIndex=(marks:typeof hand)=>[...marks].sort((a,b)=>a.index-b.index);
    expect(byIndex(scan)).toEqual(byIndex(hand));
    expect(ids(hand)).not.toEqual(ids(scan));
  });
  it("accepts only strict authored stroke orders, with pinned frame seeks",()=>{
    expect(()=>crayonMarks(bounds,{...common,strokeOrder:"random" as "patches"}))
      .toThrow(/stroke order/);
    const render=(frame:number,strokeOrder:"scanline"|"patches")=>renderToStaticMarkup(<svg>
      <Paper width={250} height={220} seed={3} tooth="hand-paper" strength={.7}/>
      <WaxRegion d="M0 0H200V130H0Z" bounds={{x:0,y:0,width:200,height:130}}
        colors={["#db9267","#ab5b60","#f2bc86"]} tooth="hand-paper"
        seed={87} pressure={.83} frame={frame} first={0} last={120}
        reduced={false} coverage="opaque" strokeOrder={strokeOrder}/>
    </svg>);
    const hand=render(66,"patches");
    const scan=render(66,"scanline");
    expect(hand).toContain('data-km-crayon-stroke-order="patches"');
    expect(scan).toContain('data-km-crayon-stroke-order="scanline"');
    expect(hand).not.toEqual(scan);
    render(114,"patches");render(0,"patches");
    expect(render(66,"patches")).toBe(hand);
    expect(()=>render(50,"broken" as "patches")).toThrow(/stroke order/);
  });
  it("serializes the order in reusable scenes without modifying character identity",()=>{
    const base=crayonDemoScene("city","landscape");
    const wax=base.elements.find(n=>n.kind==="wax");
    if(!wax||wax.kind!=="wax")throw new Error("missing wax illustration");
    const patched={...base,elements:base.elements.map(n=>
      n.id===wax.id?{...wax,strokeOrder:"scanline" as const}:n)};
    expect(inspectCrayonScene(patched)).toEqual([]);
    const html=renderToStaticMarkup(<CrayonScene spec={patched} frame={174}/>);
    expect(html).toContain('data-km-crayon-stroke-order="scanline"');
    expect(inspectCrayonScene({...patched,elements:patched.elements.map(n=>
      n.id===wax.id?{...wax,strokeOrder:"bad"}:n)}).join(" ")).toContain(".strokeOrder");
  });
});
