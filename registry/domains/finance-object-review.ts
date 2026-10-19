/** Reference-first realism ledger. This module reports evidence of inspection,
 * not automatically determined similarity, image classification or quality.
 * No reference photos are bundled or redistributed.
 */
import { FINANCE_OBJECTS } from "./finance-object-model";
import type { FinanceObjectKind } from "./finance-object-model";
export type FinanceReviewStatus="needs-reference"|"needs-render-review"|"passed"|"revision-required";
export type FinanceReviewView="front"|"quarter"|"side"|"detail";
export interface FinanceAssetReview {
  kind:FinanceObjectKind;
  referencePages:readonly string[];
  expectedDetails:readonly string[];
  views:readonly FinanceReviewView[];
  status:FinanceReviewStatus;
  /** No passed status without a dated human review of real captured renders. */
  reviewedAt?:string;
  /** List of actually compared camera views, not merely planned views. */
  comparedViews?:readonly FinanceReviewView[];
  /** Human reviewer and comparison report path / reference to their evidence. */
  reviewer?:string;
  comparisonReport?:string;
  notes:string;
}
const referenceByFamily: Partial<Record<string,{
  referencePages:readonly string[];expectedDetails:readonly string[];
}>>={
  institution:{
    referencePages:["https://vitruvius.pro/"],
    expectedDetails:["credible glass-to-stone ratio","recessed entrance and mullions",
      "continuous facade seams","sensible wall/window depth","architectural light falloff"],
  },
  card:{
    referencePages:["https://magazine.d-money.jp/creditcard/eposcard-platinum-card/"],
    expectedDetails:["ISO card proportions","thin, radiused perimeter",
      "isolated metallic chip pads","fine surface micro-roughness",
      "plausible reflection without fake card credentials"],
  },
  terminal:{
    referencePages:["https://www.newstalk.com/podcasts/highlights-from-the-pat-kenny-show/aib-to-close-70-atms-at-branches-around-ireland"],
    expectedDetails:["recessed screen and side keys","correct card/cash/receipt placement",
      "physical keypad keycaps","powder-coated shell and screen glass",
      "contact shadow and believable enclosure depth"],
  },
  cash:{
    referencePages:["https://www.gettyimages.com/"],
    expectedDetails:["many thin paper edges rather than thick blocks",
      "security band and printed motif","natural paper grain",
      "realistic bill-stack thickness","no copied official anti-counterfeit artwork"],
  },
  vault:{
    referencePages:["https://www.lastingsafe.com/post/buying-a-vault-door"],
    expectedDetails:["heavy circular disk and steel surface",
      "concentric locking rings","radial bolts and central spindle",
      "hinges and meaningful mechanical layering",
      "material-driven highlight breakup"],
  },
  workstation:{
    referencePages:["https://www.vedomosti.ru/finance/articles/2015/08/12/604447-lavri-professionalnih-treiderov-ne-dayut-spat-menedzheram"],
    expectedDetails:["dual display physical depth and stands","separate laminated glass and bezel",
      "OHLC chart bodies/wicks grounded in validated data","individual keyboard caps",
      "realistic VESA/cable routing and material finish"],
  },
  press:{
    referencePages:["https://www.komori-currency.com/security_presses.html",
      "https://www.bep.gov/currency/how-money-is-made"],
    expectedDetails:["industrial scale and sequential printing units","precision multi-color rollers and bearing journals",
      "sheet feeder and delivery flow","safe access guards, vents and controls",
      "sheet-fed offset press rather than a banknote counting device"],
  },
  bag:{
    referencePages:["https://www.gettyimages.com/"],
    expectedDetails:["woven burlap texture with plausible UV scale",
      "soft sagging cloth and compression folds","real cord loops and neck fastening",
      "uneven bagged-cash silhouette","naturalistic studio highlights"],
  },
  check:{
    referencePages:["https://www.gettyimages.com/"],
    expectedDetails:["thin paper substrate and microprint guides","field alignment and realistic margins",
      "correct voided demonstration treatment","no account/routing data",
      "subtle paper roughness"],
  },
  corporate:{
    referencePages:["https://racer.design/work/project-four-5k7d4-ylgyd-bgr32-5rklj-8tc9p"],
    expectedDetails:["continuous curtain-wall spandrels","modular glazing proportions",
      "recessed podium entrances and doors","realistic lobby glass and roof plant",
      "material distinction between glass, aluminum and stone"],
  },
  piggy:{
    referencePages:["https://www.gettyimages.com/"],
    expectedDetails:["single unified glazed-ceramic body","rounded eyes and functional coin slot",
      "curved ear shells and believable hooves","organic leg attachments",
      "realistic ceramic reflections"],
  },
  store:{
    referencePages:["https://racer.design/work/project-four-5k7d4-ylgyd-bgr32-5rklj-8tc9p"],
    expectedDetails:["recessed storefront glass and handles","individual awning folds and structural supports",
      "interior shelf silhouettes","realistic cladding and ground contacts"],
  },
  calculator:{
    referencePages:["https://www.casio.com/us/basic-calculators/"],
    expectedDetails:["individually raised rubber keys","display glass and readable LCD cells",
      "plastic molding seams and screw heads","accurate keyboard rows and spacing"],
  },
  bull:{
    referencePages:["https://www.cnstatue.com/stock-market-bronze-bull-and-bear-statue.html"],
    expectedDetails:["anatomically credible legs, hooves, horns and shoulder muscles",
      "professional sculpted topology rather than intersecting spheres",
      "bronze patina and roughness breakup","realistic weight distribution"],
  },
  bear:{
    referencePages:["https://www.cnstatue.com/stock-market-bronze-bull-and-bear-statue.html"],
    expectedDetails:["anatomically correct bear muzzle/ears/claws",
      "sculpted hide/fur texture and coherent limbs",
      "bronze patina and believable grounded stance"],
  },
};
const detailedKinds=new Set<FinanceObjectKind>([
 "bank","bank-branch","investment-bank",
 "credit-card","debit-card","gift-card",
 "atm","payment-terminal","cash-register",
 "dollar","banknote","cash-stack",
 "safe","vault",
 "stock-workstation","stock-chart","financial-dashboard",
 "money-printing-press","money-bag","bank-check","corporate-office","corporate",
]);
export const FINANCE_ASSET_REVIEWS:readonly FinanceAssetReview[]=
  FINANCE_OBJECTS.map(({kind,archetype})=>{
    const reference=referenceByFamily[archetype];
    return {
      kind,referencePages:reference?.referencePages??[],
      expectedDetails:reference?.expectedDetails??[
        "document physical dimensions","source manufacturing materials",
        "photographic silhouette match","mechanical attachment details",
      ],
      views:["front","quarter","side","detail"],
      status:(archetype==="bull"||archetype==="bear")?"revision-required":
        reference&&detailedKinds.has(kind)?"needs-render-review":"needs-reference",
      notes:reference
        ? "Photographic references selected. Render-to-reference evaluation is still required."
        : "Find a representative real-world photograph; no photoreal claim until reviewed.",
    };
  });
export function financeAssetReview(kind:FinanceObjectKind):FinanceAssetReview{
  const review=FINANCE_ASSET_REVIEWS.find(item=>item.kind===kind);
  if(!review)throw new Error("Unknown finance asset review target: "+kind);
  return review;
}
export function assertFinanceReviewLedger(reviews:readonly FinanceAssetReview[]=
  FINANCE_ASSET_REVIEWS):void {
  const kinds=new Set(FINANCE_OBJECTS.map(entry=>entry.kind));
  if(reviews.length!==kinds.size)
    throw new Error("Photo review ledger must cover every finance object.");
  const seen=new Set<string>();
  for(const review of reviews) {
    if(!kinds.has(review.kind)||seen.has(review.kind))
      throw new Error("Photo review ledger contains unknown or duplicate asset kinds.");
    seen.add(review.kind);
    if(review.status==="passed"&&(!review.reviewedAt||!review.referencePages.length||
       !review.reviewer?.trim()||!review.comparisonReport?.trim()||
       !review.views.every(view=>review.comparedViews?.includes(view))))
      throw new Error("A photoreal asset cannot pass without photographic reference and dated review, named reviewer, comparison report and all planned camera views.");
    if(review.views.length<3||!review.expectedDetails.length)
      throw new Error("Every asset must define multi-view quality criteria.");
  }
}
