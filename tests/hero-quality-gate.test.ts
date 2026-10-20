import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import type { HeroAsset } from "../registry/craft/hero-asset";
import { inspectHeroAsset, inspectHeroApproval } from "../registry/craft/hero-quality-gate";
import type { HeroApprovalEvidence } from "../registry/craft/hero-quality-gate";
import { heroCatalog } from "../registry/domains/hero-catalog";
import approvals from "../docs/verification/hero-approvals.json";
import { createPadlock } from "../registry/domains/privacy-3d";

function assetFixture(): HeroAsset {
  const group=new Group();
  const mesh=new Mesh(new BoxGeometry(1,1,1),new MeshStandardMaterial({
    metalness:.25,roughness:.6,
  }));
  mesh.name="functional-part"; group.add(mesh);
  return { id:"sample",group,tier:"hero",metersPerUnit:.1,
    bounds:{min:[-1,-1,-1],max:[1,1,1]},parts:new Map([["functional-part",mesh]]),
    craft:{materials:["brushed metal"],details:["threaded panel"]},
    actions:[{id:"open",label:"Open",meaning:"Reveals the contents",
      durationFrames:30,loop:false}],pose:()=>{},
    dispose:()=>{mesh.geometry.dispose();(mesh.material as MeshStandardMaterial).dispose();},
  };
}
const HASH="a".repeat(64);
function reviewFixture(): HeroApprovalEvidence {
  return {kind:"sample",reviewer:"Test reviewer",reviewedAt:"2026-10-19",
    decision:"approved",notes:"Inspected material, build and proportion against specific photos.",
    referenceUrls:["https://example.org/reference/photo-of-sample"],
    sourceFiles:[{path:"registry/craft/hero-asset.ts",sha256:HASH}],
    captures:(["front","quarter","side","detail"] as const).map((view,index)=>({
      view,path:`docs/verification/assets/hero/${view}.png`,sha256:String(index+1).repeat(64),
      width:1280,height:720,
    })),
  };
}
describe("Zero-token 3D asset structure gate",()=>{
  it("accepts meaningful physical metadata and attached semantic parts",()=>{
    const a=assetFixture();
    const report=inspectHeroAsset(a);
    expect(report.ok).toBe(true);
    expect(report.meshCount).toBe(1);
    expect(report.namedPartCount).toBe(1);
    expect(report.materialCount).toBe(1);
    a.dispose();
  });
  it("catches nonfinite geometry transforms and unsupported material parameters",()=>{
    const a=assetFixture();
    a.group.children[0].position.x=Number.NaN;
    (a.group.children[0] as Mesh).material=new MeshStandardMaterial({roughness:1.8});
    const report=inspectHeroAsset(a);
    expect(report.ok).toBe(false);
    expect(report.issues.map(x=>x.code)).toContain("nonfinite-transform");
    expect(report.issues.map(x=>x.code)).toContain("roughness-range");
    a.dispose();
  });
  it("rejects detached named parts, bad physical scale, invalid bounds and actions without pose",()=>{
    const a=assetFixture();
    a.parts=new Map([["orphan",new Object3D()]]);
    a.metersPerUnit=0;
    a.bounds={min:[0,0,0],max:[0,1,1]};
    a.pose=undefined;
    const codes=inspectHeroAsset(a).issues.map(x=>x.code);
    expect(codes).toContain("part-attachment");
    expect(codes).toContain("physical-scale");
    expect(codes).toContain("bounds");
    expect(codes).toContain("missing-pose");
    a.dispose();
  });
  it("audits an actual domain asset without WebGL or browser rendering",()=>{
    const a=createPadlock({id:"real-padlock"});
    const report=inspectHeroAsset(a);
    expect(report.meshCount).toBeGreaterThan(0);
    expect(report.ok).toBe(true);
    a.dispose();
  });
});
describe("Human-photo review evidence: deterministic preflight",()=>{
  it("accepts an explicit complete four-view proof contract, not an image quality guess",()=>{
    expect(inspectHeroApproval(reviewFixture())).toEqual([]);
  });
  it("rejects missing evidence, duplicate views, forged source paths and generic reference home pages",()=>{
    const x=reviewFixture();
    const changed:HeroApprovalEvidence={
      ...x,referenceUrls:["https://example.org/"],sourceFiles:[
        {path:"../secrets.txt",sha256:HASH},
      ],captures:x.captures.slice(1),
    };
    const codes=inspectHeroApproval(changed).map(y=>y.code);
    expect(codes).toContain("review-references");
    expect(codes).toContain("review-source-hash");
    expect(codes).toContain("review-view-missing");
  });
  it("rejects a single screenshot reused across four claimed angles",()=>{
    const evidence=reviewFixture();
    const reused:HeroApprovalEvidence={...evidence,captures:evidence.captures.map(
      (frame,index)=>({...frame,sha256:index===0?frame.sha256:evidence.captures[0].sha256}),
    )};
    expect(inspectHeroApproval(reused).map(x=>x.code)).toContain("review-reused-image");
  });
  it("prevents silently promoting unknown or unapproved assets",()=>{
    const kinds=new Set(heroCatalog().map(e=>e.kind));
    expect(kinds.size).toBe(heroCatalog().length);
    expect(approvals.schemaVersion).toBe(1);
    const reviewed=new Set<string>();
    for(const record of approvals.approvals as HeroApprovalEvidence[]){
      expect(kinds.has(record.kind)).toBe(true);
      expect(reviewed.has(record.kind)).toBe(false);
      reviewed.add(record.kind);
      expect(inspectHeroApproval(record)).toEqual([]);
    }
    // Existing assets remain WIP until evidenced, reviewed and deliberately approved.
    expect(approvals.approvals).toHaveLength(0);
  });
});
