/** Small browser-only source adapter. Imports no Three.js, renderer or story code.
 * Registry items and typed vocabularies remain the source of truth.
 */
import registry from "../../registry.json";
import reviews from "../../docs/verification/hero-approvals.json";
import { FINANCE_OBJECTS } from "../../registry/domains/finance-object-model";
import { BUSINESS_OBJECTS } from "../../registry/domains/business-object-model";
import { TECHNOLOGY_OBJECTS } from "../../registry/domains/technology-object-model";
import { buildCatalog } from "./catalog-core";
import { CATALOG_DOCS, previewsForKinds } from "./catalog-metadata";
import type { RawHero } from "./catalog-core";

/** Curated *descriptions*, checked against live hero-catalog.ts by
 * catalog:check. Never construct real Three.js scenes merely to index them.
 */
export const CATALOG_HERO_SUMMARIES:readonly RawHero[]=[
  {kind:"bull-market",title:"Bull",meaning:"Rising market, optimism, momentum.",domain:"finance"},
  {kind:"bear-market",title:"Bear",meaning:"Falling market, pessimism, caution.",domain:"finance"},
  {kind:"cash-stack",title:"Cash stack",meaning:"Money, wealth, a payout.",domain:"finance"},
  {kind:"banknote",title:"Banknote",meaning:"A single unit of cash; currency in general.",domain:"finance"},
  {kind:"coins",title:"Coins",meaning:"Savings, small amounts, interest, chance.",domain:"finance"},
  {kind:"gold-bars",title:"Gold bars",meaning:"Reserves, safe-haven assets, store of value.",domain:"finance"},
  {kind:"money-bag",title:"Money bag",meaning:"Savings pot, a fund, accumulated wealth.",domain:"finance"},
  {kind:"credit-card",title:"Payment cards",meaning:"Card payments, credit, spending.",domain:"finance"},
  {kind:"bank",title:"Bank",meaning:"Financial institution, trust, deposits.",domain:"finance"},
];
export const componentCatalog=buildCatalog({
  items:registry.items,
  vocabularies:{
    finance:FINANCE_OBJECTS,business:BUSINESS_OBJECTS,technology:TECHNOLOGY_OBJECTS,
  },
  heroes:CATALOG_HERO_SUMMARIES,
  approvedHeroKinds:reviews.approvals.map(entry=>entry.kind),
  previews:previewsForKinds(FINANCE_OBJECTS,BUSINESS_OBJECTS,
    TECHNOLOGY_OBJECTS,CATALOG_HERO_SUMMARIES),
  docs:CATALOG_DOCS,
});
