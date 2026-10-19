import { useCallback } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import { createFinanceHeroAsset, FINANCE_HERO_KINDS } from "../../registry/domains/finance-hero-3d";
import type { FinanceHeroKind, FinanceHeroOptions } from "../../registry/domains/finance-hero-3d";
import type { SculptFinish } from "../../registry/craft/sculpt-finish";

/** URL overrides make every inspection view reproducible for capture scripts:
 * ?kmHero=bull-market&kmAz=30&kmEl=12&kmZoom=2.4&kmTarget=1.6,1.1,0&kmFinish=gold */
function param(name: string) { return new URLSearchParams(window.location.search).get(name); }
function num(name: string, fallback: number) { const v = Number(param(name)); return param(name) !== null && Number.isFinite(v) ? v : fallback; }

interface LabArgs { kind: FinanceHeroKind; azimuth: number; elevation: number; zoom: number; finish?: SculptFinish }

function HeroLab({ kind, azimuth, elevation, zoom, finish }: LabArgs) {
  const requested = param("kmHero");
  const selected = (FINANCE_HERO_KINDS as string[]).includes(requested ?? "") ? requested as FinanceHeroKind : kind;
  const chosenFinish = (param("kmFinish") as SculptFinish | null) ?? finish;
  const target = param("kmTarget")?.split(",").map(Number) as [number, number, number] | undefined;
  const width = num("kmW", 1280), height = num("kmH", 720);
  const create = useCallback(() => {
    const options: FinanceHeroOptions = { id: "lab-" + selected, finish: chosenFinish };
    return createFinanceHeroAsset(selected, options);
  }, [selected, chosenFinish]);
  return <main style={{ background: "#0d1014", minHeight: "100vh", display: "grid", placeItems: "center" }}>
    <div data-km-video-capture="" style={{ width: "min(100%, " + width + "px)" }}>
      <HeroAssetViewer createAsset={create} width={width} height={height}
        azimuth={num("kmAz", azimuth)} elevation={num("kmEl", elevation)} zoom={num("kmZoom", zoom)}
        target={target && target.length === 3 && target.every(Number.isFinite) ? target : undefined}
        action={param("kmAction")} actionFrame={num("kmActionFrame", 0)} />
    </div>
  </main>;
}

const meta = { title: "Domains/Finance Hero Assets", component: HeroLab,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof HeroLab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const BullMarket: Story = { args: { kind: "bull-market", azimuth: 32, elevation: 10, zoom: 1 } };
export const BearMarket: Story = { args: { kind: "bear-market", azimuth: 32, elevation: 10, zoom: 1 } };
export const BullNatural: Story = { args: { kind: "bull-market", azimuth: 32, elevation: 10, zoom: 1, finish: "natural" } };
export const BearNatural: Story = { args: { kind: "bear-market", azimuth: 32, elevation: 10, zoom: 1, finish: "natural" } };
export const CashStack: Story = { args: { kind: "cash-stack", azimuth: 28, elevation: 24, zoom: 1 } };
export const Banknote: Story = { args: { kind: "banknote", azimuth: 10, elevation: 40, zoom: 1 } };
export const Coins: Story = { args: { kind: "coins", azimuth: 24, elevation: 18, zoom: 1 } };
export const GoldBars: Story = { args: { kind: "gold-bars", azimuth: 30, elevation: 20, zoom: 1 } };
export const MoneyBag: Story = { args: { kind: "money-bag", azimuth: 22, elevation: 12, zoom: 1 } };
export const CreditCard: Story = { args: { kind: "credit-card", azimuth: 8, elevation: 42, zoom: 1 } };
export const Bank: Story = { args: { kind: "bank", azimuth: 28, elevation: 10, zoom: 1 } };
