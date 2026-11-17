import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {createRisoBrushGeometry,risoBrushInkPath}
  from "../registry/video/riso-dry-brush";
import {createRisoContactTrap} from "../registry/video/riso-contact-trap";
import {auditRisoTrapTopology,createGuardedRisoContactTrap}
  from "../registry/video/riso-stencil-topology";
import {riso67DamagedCandidate,RisoTopologyGuardStudio}
  from "../src/video/riso-topology-guard-studio";
import {riso66Source,Riso66Panel} from "../src/video/riso-contact-trap-studio";

const build=(aspect:"landscape"|"portrait"="landscape",
  frame=160,seed=66)=>{
  const s=riso66Source(aspect,frame,seed);
  return {base:createRisoBrushGeometry(s.blue),
    neighbor:createRisoBrushGeometry(s.red)};
};
const options={side:"positive" as const,maximumGap:12,
  maximumExtension:6,overlap:.8};
const guard=(aspect:"landscape"|"portrait"="landscape",
  frame=160,seed=66)=>{
  const {base,neighbor}=build(aspect,frame,seed);
  return {base,neighbor,result:createGuardedRisoContactTrap(
    base,neighbor,options)};
};

describe("RISO67 native quadratic contour safety: retain original print, reject damage",()=>{
  it("audits true closed SVG contours and rejects NEW outer self-intersections",()=>{
    const {base}=build();
    const source={...base,outerPath:"M0 0 L100 0 L100 100 L0 100 Z",
      dryPaths:[]};
    const crossed={...source,
      outerPath:"M0 0 L100 100 L0 100 L100 0 L120 80 Z"};
    const a=auditRisoTrapTopology(source,crossed);
    expect(a.original.selfContacts).toBe(0);
    expect(a.candidate.selfContacts).toBeGreaterThan(0);
    expect(a.newSelfContacts).toBeGreaterThan(0);
    expect(a.noNewDefects).toBe(false);
  });
  it("detects introduced paper-hole boundary cuts on real vector geometry",()=>{
    const {base}=build();
    const original={...base,outerPath:"M0 0 L100 0 L100 100 L0 100 Z",
      dryPaths:["M40 40 L60 40 L60 60 L40 60 Z"]};
    const cut={...original,
      outerPath:"M0 0 L50 0 L50 100 L0 100 Z"};
    const p=auditRisoTrapTopology(original,cut,.2);
    expect(p.original.borderHoleContacts).toHaveLength(0);
    expect(p.candidate.borderHoleContacts).toEqual([0]);
    expect(p.newBorderHoleContacts).toEqual([0]);
    expect(p.noNewDefects).toBe(false);
    expect(p.sourceHolesUnchanged).toBe(true);
  });
  it("flags changed paper cutouts and invalid contour disappearance fail-closed",()=>{
    const {base}=build();
    const changed={...base,dryPaths:[...base.dryPaths.slice(1),"M40 40 L50 40 L50 50 Z"]};
    const p=auditRisoTrapTopology(base,changed);
    expect(p.sourceHolesUnchanged).toBe(false);
    expect(p.noNewDefects).toBe(false);
    const lost=auditRisoTrapTopology(base,{
      ...base,outerPath:"M0 0 L10 10 L20 20 Z",
    });
    expect(lost.newMissingContours).toBeGreaterThan(0);
    expect(lost.noNewDefects).toBe(false);
  });
  it("holds source dry-brush and negative-space topology unchanged under guarded traps",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const frame of [20,160,219]){
        const {base,result}=guard(aspect,frame);
        expect(result.topology.sourceHolesUnchanged).toBe(true);
        expect(result.topology.newMissingContours).toBe(0);
        expect(result.topology.newSelfContacts).toBe(0);
        expect(result.topology.newExcludedHoles).toHaveLength(0);
        expect(result.accepted).toBe(result.topology.noNewDefects);
        expect(result.geometry.dryPaths).toBe(base.dryPaths);
        expect(result.geometry.centerline).toBe(base.centerline);
        expect(result.geometry.widthProfile).toBe(base.widthProfile);
        expect(result.geometry.edgeNegative).toBe(base.edgeNegative);
        expect(risoBrushInkPath(result.geometry).endsWith(
          base.dryPaths.join(" "))).toBe(true);
        if(!result.accepted){
          expect(result.geometry).toBe(base);
          expect(result.maxAppliedExtension).toBe(0);
          expect(result.reason).toBe("new-topology-defect");
        }else{
          expect(result.maxAppliedExtension).toBeLessThanOrEqual(6);
        }
      }
    }
  },20000); // Native SVG contour sample/negative-space checks can exceed 5s under parallel CI.
  it("absolute frame seeks and replays preserve identical safety decisions",()=>{
    const first=guard("landscape",35);
    guard("landscape",190);
    const back=guard("landscape",35);
    expect(first.result.reason).toBe(back.result.reason);
    expect(first.result.topology).toEqual(back.result.topology);
    expect(first.result.geometry.outerPath).toBe(back.result.geometry.outerPath);
  },15000); // Preserves full real geometry proof even on busy GitHub runners.
  it("keeps a zero-extension request byte-identical and unmodified",()=>{
    const {base,neighbor}=build();
    const result=createGuardedRisoContactTrap(base,neighbor,{
      ...options,maximumExtension:0,
    });
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe("unchanged");
    expect(result.geometry).toBe(base);
    expect(result.geometry.outerPath).toBe(base.outerPath);
    expect(result.geometry.dryPaths).toBe(base.dryPaths);
    expect(result.topology.noNewDefects).toBe(true);
  });
  it("detects intentional native source-edge permutation without printing it",()=>{
    const {base}=build();
    const bad=riso67DamagedCandidate(base);
    expect(bad.outerPath).not.toBe(base.outerPath);
    expect(bad.dryPaths).toBe(base.dryPaths);
    const a=auditRisoTrapTopology(base,bad);
    expect(a.noNewDefects).toBe(false);
    expect(a.newSelfContacts).toBeGreaterThan(0);
  });
  it("fails on malformed sampling and unsafe source inputs",()=>{
    const {base,neighbor}=build();
    for(const sample of [NaN,Infinity,-.1,.09,1.51]){
      expect(()=>auditRisoTrapTopology(base,base,sample))
        .toThrow(RangeError);
      expect(()=>createGuardedRisoContactTrap(base,neighbor,options,sample))
        .toThrow(RangeError);
    }
    expect(()=>createGuardedRisoContactTrap(base,neighbor,{
      ...options,maximumExtension:50,
    })).toThrow(RangeError);
  });
  it("Storybook retains full original two-ink art at 1x/3x in both aspect ratios",()=>{
    const s=renderToStaticMarkup(<RisoTopologyGuardStudio/>);
    expect(s).toContain('data-km-riso67-studio=""');
    expect(s).toContain('data-km-riso67-audit="');
    expect(s).toContain('data-km-riso66-panel="before"');
    expect(s).toContain('data-km-riso66-panel="after"');
    expect(s).toContain('data-km-riso67-guard="');
    expect(s.match(/data-km-riso62-brush=""/g)).toHaveLength(14);
    expect(s).not.toMatch(/<image|<foreignObject|feMorphology|feGaussianBlur/);
    for(const aspect of ["landscape","portrait"] as const){
      const p=renderToStaticMarkup(<Riso66Panel aspect={aspect} frame={160}
        seed={66} registered={[2,1.5]} enabled maximumGap={12}
        extension={6} overlap={.8} grain={.61} master="both"
        zoom={3} id="after" topologyGuard/>);
      expect(p.match(/data-km-riso62-brush=""/g)).toHaveLength(7);
      expect(p).toContain('data-km-riso66-primary-source=""');
      expect(p).toContain('data-km-riso-plate="blue"');
      expect(p).toContain('data-km-riso-plate="red"');
      expect(p).toContain('data-km-riso67-paper-holes="');
    }
  });
  it("unmodified RISO66 source trap remains available; RISO67 is opt-in",()=>{
    const {base,neighbor}=build();
    const original=createRisoContactTrap(base,neighbor,options);
    const underGuard=createGuardedRisoContactTrap(base,neighbor,options);
    expect(underGuard.proposed.geometry.outerPath).toEqual(original.geometry.outerPath);
    expect(underGuard.geometry.outerPath).toEqual(
      underGuard.accepted?original.geometry.outerPath:base.outerPath);
    expect(original.geometry.dryPaths).toBe(base.dryPaths);
  });
});
