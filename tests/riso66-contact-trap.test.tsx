import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {createRisoBrushGeometry,risoBrushInkPath} from "../registry/video/riso-dry-brush";
import {createRisoContactTrap} from "../registry/video/riso-contact-trap";
import {RisoContactTrapStudio,riso66Source,Riso66Panel}
  from "../src/video/riso-contact-trap-studio";
import type {Riso66PanelProps} from "../src/video/riso-contact-trap-studio";

const build=(aspect:"landscape"|"portrait"="landscape",frame=160,seed=66)=>{
  const a=riso66Source(aspect,frame,seed);
  return {a,base:createRisoBrushGeometry(a.blue),
    neighbor:createRisoBrushGeometry(a.red)};
};
const trapped=(frame=160,aspect:"landscape"|"portrait"="landscape")=>{
  const {base,neighbor}=build(aspect,frame);
  return createRisoContactTrap(base,neighbor,{
    side:"positive",maximumGap:12,maximumExtension:12,overlap:1.2,
  });
};
const panel=(opts:Partial<Riso66PanelProps>={})=>
  renderToStaticMarkup(<Riso66Panel aspect="landscape" frame={160}
    seed={66} registered={[2,1.5]} enabled maximumGap={12}
    extension={12} overlap={1.2} grain={.61} master="both" zoom={3}
    id="after" {...opts}/>);

describe("RISO66 original native shared-edge physical stencil geometry",()=>{
  it("selects sustained parallel opposing material edges, never crossing/remote strokes",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const {base,neighbor}=build(aspect);
      const p=trapped(160,aspect);
      expect(p.contactRuns).toBeGreaterThan(0);
      expect(p.matchedStations).toBeGreaterThan(8);
      expect(p.expandedStations).toBeGreaterThan(4);
      expect(p.maxAppliedExtension).toBeGreaterThan(0);
      expect(p.maxAppliedExtension).toBeLessThanOrEqual(12);
      expect(p.geometry.outerPath).not.toBe(base.outerPath);
      const shifted={...neighbor,
        centerline:neighbor.centerline.map(pt=>({...pt,y:pt.y+180})),
        edgePositive:neighbor.edgePositive.map(pt=>({...pt,y:pt.y+180})),
        edgeNegative:neighbor.edgeNegative.map(pt=>({...pt,y:pt.y+180}))};
      const far=createRisoContactTrap(base,shifted,{
        side:"positive",maximumGap:12,maximumExtension:12,overlap:1.2});
      expect(far.contactRuns).toBe(0);
      expect(far.geometry).toBe(base);
    }
  });
  it("retains every native dry-fibre hole, source centreline, pressure sample and opposite edge",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const {base}=build(aspect);
      const p=trapped(160,aspect).geometry;
      expect(p.dryPaths).toBe(base.dryPaths);
      expect(p.widthProfile).toBe(base.widthProfile);
      expect(p.centerline).toBe(base.centerline);
      expect(p.edgeNegative).toBe(base.edgeNegative);
      expect(p.edgePositive).not.toBe(base.edgePositive);
      expect(p.count).toBe(base.count);
      const original=risoBrushInkPath(base),modified=risoBrushInkPath(p);
      expect(modified.endsWith(base.dryPaths.join(" "))).toBe(true);
      expect(modified.split(" Z ").length).toBe(original.split(" Z ").length);
      expect(new Set(p.dryPaths).size).toBe(base.dryPaths.length);
      expect(p.dryPaths.length).toBeGreaterThan(50);
      expect(modified).not.toMatch(/NaN|Infinity|<image|feGaussianBlur/);
    }
  });
  it("is explicitly opt-in, pressure ramped, deterministic and stateless at any source frame",()=>{
    const {base,neighbor}=build();
    const none=createRisoContactTrap(base,neighbor,{
      side:"positive",maximumGap:12,maximumExtension:0,overlap:0});
    expect(none.geometry).toBe(base);
    expect(risoBrushInkPath(none.geometry)).toBe(risoBrushInkPath(base));
    const a=trapped(18),b=trapped(18);
    expect(a.geometry.outerPath).toBe(b.geometry.outerPath);
    trapped(219);
    expect(trapped(18).geometry.outerPath).toBe(a.geometry.outerPath);
    expect(trapped(190).geometry.outerPath).not.toBe(a.geometry.outerPath);
    const modified=a.geometry.edgePositive;
    const raw=build("landscape",18).base.edgePositive;
    // Each valid connected contact run smoothly returns to original shape.
    expect(modified[0]).toEqual(raw[0]);
    expect(modified[modified.length-1]).toEqual(raw[raw.length-1]);
  });
  it("rejects malformed material and nonphysical extension budgets",()=>{
    const {base,neighbor}=build();
    for(const part of [{side:"other"},{maximumGap:NaN},{maximumGap:0},
      {maximumGap:13},{maximumExtension:-1},{maximumExtension:13},
      {overlap:Infinity},{overlap:4},{minimumRun:2},
      {minimumRun:17},{minimumRun:3.1}]){
      expect(()=>createRisoContactTrap(base,neighbor,{
        side:"positive",maximumGap:12,maximumExtension:12,overlap:1.2,
        ...part,
      } as Parameters<typeof createRisoContactTrap>[2])).toThrow(RangeError);
    }
    const corrupt={...neighbor,edgePositive:neighbor.edgePositive.slice(0,5)};
    expect(()=>createRisoContactTrap(base,corrupt,{
      side:"positive",maximumGap:12,maximumExtension:12,overlap:1.2}))
      .toThrow(RangeError);
    expect(()=>riso66Source("landscape",240,66)).toThrow(RangeError);
    expect(()=>riso66Source("landscape",0,-1)).toThrow(RangeError);
  });
  it("renders two complete ink masters and all original source holes in BOTH aspects",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const before=panel({aspect,id:"before",enabled:false,zoom:1});
      const after=panel({aspect,id:"after",enabled:true,zoom:3});
      expect(before).toContain('data-km-riso66-panel="before"');
      expect(after).toContain('data-km-riso66-panel="after"');
      expect(after).toContain('data-km-riso66-primary-source=""');
      expect(after).toContain('data-km-riso66-neighbor-source=""');
      expect(after).toContain('data-km-riso-plate="blue"');
      expect(after).toContain('data-km-riso-plate="red"');
      expect(after.match(/data-km-riso62-brush=""/g)).toHaveLength(7);
      expect(after.match(/fill-rule="evenodd"/g)).toHaveLength(8);
      expect(after).toContain('data-km-riso66-magnification="3"');
      expect(after).not.toMatch(/<image|<foreignObject|feGaussianBlur|feMorphology/);
      expect(before).not.toBe(after);
    }
    const story=renderToStaticMarkup(<RisoContactTrapStudio/>);
    expect(story).toContain('data-km-riso66-panel="before"');
    expect(story).toContain('data-km-riso66-panel="after"');
    expect(story).toContain('data-km-riso66-studio=""');
  });
  it("isolates physical inks and preserves underlying plate independent of trap",()=>{
    const before=panel({enabled:false,master:"blue"});
    const after=panel({enabled:true,master:"blue"});
    expect(before.match(/data-km-riso-plate="blue"/g)).toHaveLength(1);
    expect(after).not.toContain('data-km-riso-plate="red"');
    expect(after).toContain('data-km-riso66-primary-source=""');
    const red=panel({enabled:true,master:"red"});
    expect(red).toContain('data-km-riso-plate="red"');
    expect(red).not.toContain('data-km-riso66-primary-source=""');
    expect(red).toContain('data-km-riso66-neighbor-source=""');
  });
});
