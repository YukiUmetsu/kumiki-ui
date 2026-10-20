/** Crafted hero-tier finance assets, addressable by semantic kind.
 *
 * Each builder returns a {@link HeroAsset}: named parts, authored bounds,
 * studio hints and resource ownership. Use with `HeroAssetViewer`, or add
 * `asset.group` to any Three.js scene (call `asset.dispose()` when done).
 */
import type { HeroAsset } from "../craft/hero-asset";
import type { SculptFinish } from "../craft/sculpt-finish";
import { createBearSculpture, createBullSculpture } from "./finance-sculpture-3d";
import { createBanknote, createCashStack, createCoinStack, createGoldBars } from "./finance-currency-3d";
import type { BanknoteDesign, CoinMetal } from "./finance-currency-3d";
import { createMoneyBag, createPaymentCards } from "./finance-personal-3d";
import { createClassicalBank } from "./finance-architecture-3d";
import type { CardDesign } from "./finance-personal-3d";

export interface FinanceHeroOptions {
  id?: string;
  /** Sculptures: cast finish. */
  finish?: SculptFinish;
  /** Sculptures: show the granite plinth. */
  plinth?: boolean;
  quality?: "hero" | "supporting";
  /** Notes and cash: original note design (denomination, palette, unit word). */
  design?: BanknoteDesign;
  /** Cash: banded bundles in the stack. */
  bundles?: number;
  /** Coins: metal and how many. */
  metal?: CoinMetal;
  count?: number;
  /** Cards: primary card design and optional second card (false = single). */
  card?: CardDesign;
  secondCard?: CardDesign | false;
  /** Money bag: stencilled symbol and spilled coins. */
  symbol?: string;
  coins?: number;
  /** Bank: carved frieze inscription. */
  inscription?: string;
}

export const FINANCE_HERO_BUILDERS = {
  "bull-market": (options: FinanceHeroOptions = {}) => createBullSculpture(options),
  "bear-market": (options: FinanceHeroOptions = {}) => createBearSculpture(options),
  "cash-stack": (options: FinanceHeroOptions = {}) => createCashStack(options),
  "banknote": (options: FinanceHeroOptions = {}) => createBanknote(options),
  "coins": (options: FinanceHeroOptions = {}) => createCoinStack(options),
  "gold-bars": (options: FinanceHeroOptions = {}) => createGoldBars(options),
  "money-bag": (options: FinanceHeroOptions = {}) => createMoneyBag({ id: options.id, symbol: options.symbol, coins: options.coins, coinMetal: options.metal }),
  "bank": (options: FinanceHeroOptions = {}) => createClassicalBank({ id: options.id, inscription: options.inscription }),
  "credit-card": (options: FinanceHeroOptions = {}) => createPaymentCards({ id: options.id, design: options.card, second: options.secondCard }),
} as const satisfies Record<string, (options?: FinanceHeroOptions) => HeroAsset>;

export type FinanceHeroKind = keyof typeof FINANCE_HERO_BUILDERS;
export const FINANCE_HERO_KINDS = Object.keys(FINANCE_HERO_BUILDERS) as FinanceHeroKind[];

export function isFinanceHeroKind(kind: string): kind is FinanceHeroKind {
  return Object.prototype.hasOwnProperty.call(FINANCE_HERO_BUILDERS, kind);
}

export function createFinanceHeroAsset(kind: FinanceHeroKind, options: FinanceHeroOptions = {}): HeroAsset {
  const build = FINANCE_HERO_BUILDERS[kind];
  if (!build) throw new Error("Unknown finance hero asset: " + kind);
  return build(options);
}

/**
 * Semantic finance object kinds that have a crafted hero asset, with the
 * builder options that express each variant. Kinds not listed keep their
 * standard procedural model.
 */
const OBJECT_TO_HERO: Record<string, { kind: FinanceHeroKind; options?: FinanceHeroOptions }> = {
  "bull-market": { kind: "bull-market" },
  "bear-market": { kind: "bear-market" },
  "cash-stack": { kind: "cash-stack" },
  "banknote": { kind: "banknote" },
  "dollar": { kind: "banknote", options: { design: { symbol: "$", unit: "Dollars" } } },
  "coin": { kind: "coins", options: { count: 3 } },
  "coins": { kind: "coins" },
  "interest": { kind: "coins", options: { count: 9 } },
  "gold-bars": { kind: "gold-bars" },
  "money-bag": { kind: "money-bag" },
  "credit-card": { kind: "credit-card" },
  "debit-card": { kind: "credit-card", options: { card: { palette: "emerald", tier: "Debit" }, secondCard: false } },
  "gift-card": { kind: "credit-card", options: { card: { palette: "rose-gold", tier: "Gift" }, secondCard: false } },
  "bank": { kind: "bank" },
  "bank-branch": { kind: "bank", options: { inscription: "Branch" } },
  "investment-bank": { kind: "bank", options: { inscription: "Investment" } },
};

export function financeHeroForObject(kind: string): { kind: FinanceHeroKind; options: FinanceHeroOptions } | null {
  const entry = Object.prototype.hasOwnProperty.call(OBJECT_TO_HERO, kind) ? OBJECT_TO_HERO[kind] : undefined;
  return entry ? { kind: entry.kind, options: { ...entry.options } } : null;
}
