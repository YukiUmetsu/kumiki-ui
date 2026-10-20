/** Tiny, curated descriptions of source-backed finance hero assets.
 * The deterministic catalog check enforces parity with hero-catalog.ts;
 * do not import Three.js merely to run the catalog.
 */
import type { RawHero } from "./catalog-core";
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
