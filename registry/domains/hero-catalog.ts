/** One discoverable catalog of every crafted hero asset across domains.
 *
 * Agents and tools (lab story, `npm run hero:capture`, docs) should look up
 * assets here instead of importing domain modules ad hoc. Each entry states
 * what the asset means, its real-world scale and its signature actions.
 */
import type { HeroAsset } from "../craft/hero-asset";
import type { SculptFinish } from "../craft/sculpt-finish";
import { FINANCE_HERO_BUILDERS } from "./finance-hero-3d";
import type { FinanceHeroOptions } from "./finance-hero-3d";
import { composeHeroScene, createStageSet } from "../craft/hero-stage-set";
import { createLaptop, createServerRack, createSmartphone } from "./technology-3d";
import { createPadlock, createSecurityShield } from "./privacy-3d";
import { createPresenter } from "./people-3d";

export type HeroDomain = "finance" | "technology" | "privacy" | "people" | "scene";

export interface HeroCatalogEntry {
  kind: string;
  domain: HeroDomain;
  title: string;
  /** What the asset communicates in an explainer. */
  meaning: string;
  /** Alternative finishes the builder accepts (first is the default). */
  finishes?: readonly SculptFinish[];
  create(options?: { id?: string; finish?: SculptFinish } & Record<string, unknown>): HeroAsset;
}

const finance = (kind: keyof typeof FINANCE_HERO_BUILDERS, title: string, meaning: string, finishes?: SculptFinish[]): HeroCatalogEntry => ({
  kind, domain: "finance", title, meaning, finishes,
  create: options => FINANCE_HERO_BUILDERS[kind]((options ?? {}) as FinanceHeroOptions),
});

const entries: HeroCatalogEntry[] = [
  finance("bull-market", "Bull", "Rising market, optimism, momentum.", ["aged-bronze", "natural", "polished-bronze", "gold"]),
  finance("bear-market", "Bear", "Falling market, pessimism, caution.", ["aged-bronze", "natural", "polished-bronze", "graphite"]),
  finance("cash-stack", "Cash stack", "Money, wealth, a payout."),
  finance("banknote", "Banknote", "A single unit of cash; currency in general."),
  finance("coins", "Coins", "Savings, small amounts, interest, chance."),
  finance("gold-bars", "Gold bars", "Reserves, safe-haven assets, store of value."),
  finance("money-bag", "Money bag", "Savings pot, a fund, accumulated wealth."),
  finance("credit-card", "Payment cards", "Card payments, credit, spending."),
  finance("bank", "Bank", "Financial institution, trust, deposits."),
];

entries.push(
  { kind: "laptop", domain: "technology", title: "Laptop", meaning: "Work, software, a user at a computer.", create: o => createLaptop({ id: o?.id }) },
  { kind: "smartphone", domain: "technology", title: "Smartphone", meaning: "Mobile apps, notifications, a person's device.", create: o => createSmartphone({ id: o?.id }) },
  { kind: "server-rack", domain: "technology", title: "Server rack", meaning: "Data center, the cloud, backend infrastructure.", create: o => createServerRack({ id: o?.id }) },
  { kind: "padlock", domain: "privacy", title: "Padlock and key", meaning: "Encryption, access control, locking data away.", create: o => createPadlock({ id: o?.id }) },
  { kind: "security-shield", domain: "privacy", title: "Security shield", meaning: "Protection, security software, a defended system.", create: o => createSecurityShield({ id: o?.id }) },
);

entries.push(
  { kind: "presenter", domain: "people", title: "Presenter", meaning: "A person explaining: greets, points, presents.", create: o => createPresenter({ id: o?.id }) },
  { kind: "presenter-with-phone", domain: "people", title: "Presenter with phone", meaning: "A customer using a phone: mobile payments, apps, alerts.",
    create: o => createPresenter({ id: o?.id, holding: createSmartphone({ id: "held-phone" }), skin: "tan", hairStyle: "long", jacket: "#3a3f2e", tie: "#c2a35a" }) },
);

// Composed scenes: crafted sets with assets at true relative scale.
const f = (kind: keyof typeof FINANCE_HERO_BUILDERS, options: FinanceHeroOptions = {}) => FINANCE_HERO_BUILDERS[kind](options);
entries.push(
  { kind: "scene-desk-payments", domain: "scene", title: "Desk: payments",
    meaning: "Everyday money on a desk: cards, cash and coins at real size.",
    create: () => composeHeroScene(createStageSet("desk"), [
      { id: "cards", asset: f("credit-card"), slot: "mat-center", yaw: -.1 },
      { id: "cash", asset: f("cash-stack", { bundles: 2 }), slot: "desk-right" },
      { id: "coins", asset: f("coins", { count: 6 }), slot: "desk-left" },
    ], { id: "scene-desk-payments" }) },
  { kind: "scene-street-bank", domain: "scene", title: "Street: bank and bull",
    meaning: "The institution and the market on one street, at real scale.",
    create: () => composeHeroScene(createStageSet("street"), [
      { id: "bank", asset: f("bank"), slot: "frontage", scale: .45 },
      { id: "bull", asset: f("bull-market", { plinth: true }), slot: "sidewalk-right", yaw: -.6, scale: .55 },
    ], { id: "scene-street-bank" }) },
  { kind: "scene-vault-reserves", domain: "scene", title: "Vault: reserves",
    meaning: "Stored wealth: gold, a money bag and banded cash in a deposit vault.",
    create: () => composeHeroScene(createStageSet("vault"), [
      { id: "gold", asset: f("gold-bars"), slot: "center", scale: 3.2 },
      { id: "bag", asset: f("money-bag", { coins: 5 }), slot: "left", scale: 2 },
      { id: "cash", asset: f("cash-stack", { bundles: 4 }), slot: "right", scale: 3.4 },
    ], { id: "scene-vault-reserves" }) },
);

/** Register additional domains (technology, privacy, people) at module load. */
export function registerHeroEntries(more: readonly HeroCatalogEntry[]) {
  for (const entry of more) {
    if (entries.some(e => e.kind === entry.kind)) throw new Error(`Duplicate hero catalog kind "${entry.kind}".`);
    entries.push(entry);
  }
}

export function heroCatalog(): readonly HeroCatalogEntry[] { return entries; }

export function heroCatalogEntry(kind: string): HeroCatalogEntry {
  const entry = entries.find(e => e.kind === kind);
  if (!entry) throw new Error(`Unknown hero asset "${kind}". Available: ${entries.map(e => e.kind).join(", ")}.`);
  return entry;
}
