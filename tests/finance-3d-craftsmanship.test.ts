import { describe, expect, it } from "vitest";
import { Mesh, MeshPhysicalMaterial } from "three";
import { createFinanceObjectScene3D } from "../registry/domains/finance-object-3d";
import {
  FINANCE_ASSET_REVIEWS, assertFinanceReviewLedger, financeAssetReview,
  financeAssetQualityTier, assertFinanceAssetsPhotoreal,
} from "../registry/domains/finance-object-review";
import { FINANCE_OBJECTS } from "../registry/domains/finance-object-model";

const components=(kind:typeof FINANCE_OBJECTS[number]["kind"])=>{
  // Legacy procedural models stay available with hero:false; hero kinds are covered below.
  const scene=createFinanceObjectScene3D({kind,id:"quality-"+kind},{hero:false});
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
  it("never presents an uncaptured 3D scene as certified photorealistic",()=>{
    expect(financeAssetQualityTier("atm")).toBe("reference-modeled");
    expect(financeAssetQualityTier("credit-card")).toBe("reference-modeled");
    expect(()=>assertFinanceAssetsPhotoreal(["atm","credit-card"])).toThrow(/not photoreal-reviewed/);
  });

  it("tracks every financial object, but does not falsely mark any as photoreal",()=>{
    expect(FINANCE_ASSET_REVIEWS).toHaveLength(FINANCE_OBJECTS.length);
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
    expect(()=>assertFinanceReviewLedger(fraudulent)).toThrow(/specific photographic source/);
    fraudulent[0]={...fraudulent[0],referencePages:["https://www.gettyimages.com/"],
      reviewedAt:"2026-10-19",reviewer:"Visual QA",comparisonReport:"reports/dummy-review.md",
      comparedViews:["front","quarter","side","detail"]};
    expect(()=>assertFinanceReviewLedger(fraudulent)).toThrow(/specific photographic source/);
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
  it.each([
    ["stock-workstation",["monitor-display-glass","candlestick-wick",
      "candlestick-real-body","individual-keycap","monitor-rear-vent"]],
    ["money-printing-press",["press-blanket-cylinder","roller-bearing-hub",
      "press-sheet-feeder","press-enclosure-vent","press-emergency-stop"]],
    ["money-bag",["sack-woven-wrinkled-body","braided-drawstring",
      "hanging-bag-drawcord","bag-neck-cord-collar"]],
    ["bank-check",["check-rag-paper-stock","check-security-background-line",
      "check-signature-line","check-VOID-watermark-segment"]],
    ["corporate-office",["corporate-glass-curtain-panel","corporate-spandrel",
      "revolving-door-leaf","corporate-rooftop-antenna"]],
    ["piggy-bank",["piggy-ceramic-glazed-body","piggy-molded-ceramic-ear",
      "piggy-functional-coin-slot","piggy-curled-ceramic-tail"]],
    ["storefront",["storefront-recessed-glazing","storefront-glass-entrance",
      "storefront-striped-awning-fabric","store-merchandise-box"]],
    ["calculator",["calculator-molded-polymer-shell","calculator-LCD-glass",
      "calculator-individual-rubber-keycap","calculator-rear-assembly-screw"]],
  ] as const)("builds high-detail %s physical subassemblies", (kind,names)=>{
    const {scene,parts,surfaces}=components(kind);
    for(const name of names)expect(parts,kind+": "+name).toContain(name);
    expect(surfaces.some(mat=>mat.roughnessMap!==null)).toBe(true);
    scene.dispose();
  });
  it("creates differentiated studio maquettes for bull and bear without claiming photorealism",()=>{
    const bull=components("bull-market"),bear=components("bear-market");
    expect(bull.parts).toContain("bull-curved-taper-horn");
    expect(bear.parts).toContain("bear-rounded-ears");
    expect(financeAssetReview("bull-market").status).toBe("revision-required");
    expect(financeAssetReview("bear-market").status).toBe("revision-required");
    bull.scene.dispose();bear.scene.dispose();
  });
  it("releases procedural fabric texture on scene disposal",()=>{
    const scene=createFinanceObjectScene3D({kind:"money-bag",id:"woven-bag"},{hero:false});
    let disposed=0;
    scene.root.traverse(node=>{
      if(!(node instanceof Mesh))return;
      const mat=node.material;
      if(mat instanceof MeshPhysicalMaterial&&mat.map)
        mat.map.addEventListener("dispose",()=>disposed++);
    });
    scene.dispose();
    expect(disposed).toBeGreaterThan(0);
  });
  it("distinguishes a bank vault from a household combination safe",()=>{
    const safe=components("safe"),vault=components("vault");
    expect(safe.parts).toContain("safe-combination-dial");
    expect(vault.parts).toContain("vault-radial-locking-bolt");
    expect(safe.parts).not.toContain("vault-radial-locking-bolt");
    safe.scene.dispose();vault.scene.dispose();
  });
});

describe("crafted hero assets behind the same finance object API",()=>{
  it.each([
    ["bank",["bank-inscribed-frieze","bank-dentil-course","bank-tympanum-medallion"]],
    ["debit-card",["card-primary-emv-contact-plate","card-primary-hologram"]],
    ["gold-bars",["gold-bar-1"]],
  ] as const)("renders %s as a hero asset with named parts and full disposal",(kind,parts)=>{
    const scene=createFinanceObjectScene3D({kind,id:"hero-"+kind});
    expect(scene.hero).toBeTruthy();
    for(const part of parts)expect(scene.hero!.parts.has(part),kind+": "+part).toBe(true);
    expect(scene.scene.environment).toBeTruthy();
    scene.dispose();
    expect(scene.scene.children.length).toBe(0);
  });
});
