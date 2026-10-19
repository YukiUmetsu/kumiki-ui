import { describe, expect, it } from "vitest";
import { Mesh, MeshPhysicalMaterial } from "three";
import { createFinanceObjectScene3D } from "../registry/domains/finance-object-3d";
import {
  FINANCE_ASSET_REVIEWS, assertFinanceReviewLedger, financeAssetReview,
} from "../registry/domains/finance-object-review";
import { FINANCE_OBJECTS } from "../registry/domains/finance-object-model";

const components=(kind:typeof FINANCE_OBJECTS[number]["kind"])=>{
  const scene=createFinanceObjectScene3D({kind,id:"quality-"+kind});
  const parts:string[]=[];
  const surfaces:MeshPhysicalMaterial[]=[];
  scene.root.traverse(node=>{
    if(node.userData.partRole)parts.push(node.userData.partRole as string);
    if(node instanceof Mesh){
      const materials=Array.isArray(node.material)?node.material:[node.material];
      for(const m of materials) if(m instanceof MeshPhysicalMaterial)surfaces.push(m);
    }
  });
  return {scene,parts,surfaces};
};

describe("photographic reference and asset review governance",()=>{
  it("tracks every financial object, but does not falsely mark any as photoreal",()=>{
    expect(FINANCE_ASSET_REVIEWS).toHaveLength(50);
    expect(()=>assertFinanceReviewLedger()).not.toThrow();
    expect(FINANCE_ASSET_REVIEWS.every(r=>r.status!=="passed")).toBe(true);
  });
  it("requires real source references for first five crafted hero families",()=>{
    for(const kind of ["bank","credit-card","atm","cash-stack","vault"] as const){
      const review=financeAssetReview(kind);
      expect(review.referencePages.length).toBeGreaterThan(0);
      expect(review.views).toContain("detail");
      expect(review.status).toBe("needs-render-review");
    }
  });
  it("cannot certify a render without recorded source and completed manual review",()=>{
    const fraudulent=[...FINANCE_ASSET_REVIEWS];
    fraudulent[0]={...fraudulent[0],status:"passed"};
    expect(()=>assertFinanceReviewLedger(fraudulent)).toThrow(/photographic reference and dated review/);
  });
});

describe("high-detail physically based 3D finance hero assets",()=>{
  it.each([
    ["credit-card",["card-rounded-metal-core","card-finish","emv-contact-pad",
      "contactless-antenna-arc"]],
    ["atm",["atm-screen-recess","atm-display-glass","atm-physical-key",
      "atm-cash-exit","atm-card-slot","atm-receipt-slot"]],
    ["bank",["stone-foundation","curtain-wall-glass","window-mullion",
      "recessed-entrance","metal-roof-coping"]],
    ["cash-stack",["banknote-paper-sheet","banknote-face",
      "cash-bundle-band","banknote-security-band"]],
    ["vault",["vault-armored-steel-door","vault-radial-locking-bolt",
      "vault-exposed-hinge-knuckle","vault-spindle-spoke"]],
  ] as const)("includes physically meaningful %s details and studio-lit material relief",
    (kind,critical)=>{
      const {scene,parts,surfaces}=components(kind);
      for(const role of critical)
        expect(parts,kind+" missing "+role).toContain(role);
      expect(surfaces.length).toBeGreaterThan(8);
      expect(surfaces.some(s=>s.roughnessMap!==null)).toBe(true);
      expect(scene.scene.getObjectByName("kumiki-studio-studio")).toBeTruthy();
      expect(scene.root.children.some(o=>o.castShadow)).toBe(true);
      scene.updateFrame?.(10);
      expect(scene.root.visible).toBe(true);
      scene.dispose();
      expect(scene.scene.children.length).toBe(0);
    });
  it("distinguishes a bank vault from a household combination safe",()=>{
    const safe=components("safe"),vault=components("vault");
    expect(safe.parts).toContain("safe-combination-dial");
    expect(vault.parts).toContain("vault-radial-locking-bolt");
    expect(safe.parts).not.toContain("vault-radial-locking-bolt");
    safe.scene.dispose();vault.scene.dispose();
  });
});
