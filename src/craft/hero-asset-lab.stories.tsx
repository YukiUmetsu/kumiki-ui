import { useCallback, useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import { heroCatalog, heroCatalogEntry } from "../../registry/domains/hero-catalog";
import type { SculptFinish } from "../../registry/craft/sculpt-finish";

/** Every crafted hero asset, reproducible from the URL for capture and review:
 * ?kmHero=<kind>&kmFinish=natural&kmAz=30&kmEl=12&kmZoom=2&kmTarget=x,y,z&kmAction=<id>&kmActionFrame=24 */
const param = (name: string) => new URLSearchParams(window.location.search).get(name);
const num = (name: string, fallback: number) => { const v = Number(param(name)); return param(name) !== null && Number.isFinite(v) ? v : fallback; };

function HeroLab({ kind }: { kind: string }) {
  const selected = param("kmHero") ?? kind;
  const entry = heroCatalogEntry(selected);
  const finish = (param("kmFinish") as SculptFinish | null) ?? undefined;
  const target = param("kmTarget")?.split(",").map(Number) as [number, number, number] | undefined;
  const width = num("kmW", 1280), height = num("kmH", 720);
  const create = useCallback(() => entry.create({ id: "lab-" + entry.kind, finish }), [entry, finish]);
  const action = param("kmAction");
  const actions = useMemo(() => { const a = create(); const list = a.actions ?? []; a.dispose(); return list; }, [create]);
  return <main style={{ background: "#0d1014", minHeight: "100vh", padding: 16, color: "#e8edf2", fontFamily: "Geist, system-ui, sans-serif" }}>
    <div data-km-video-capture="" style={{ width: "min(100%, " + width + "px)", margin: "0 auto" }}>
      <HeroAssetViewer createAsset={create} width={width} height={height}
        azimuth={num("kmAz", 30)} elevation={num("kmEl", 12)} zoom={num("kmZoom", 1)}
        target={target && target.length === 3 && target.every(Number.isFinite) ? target : undefined}
        action={action} actionFrame={num("kmActionFrame", 0)} />
    </div>
    <p style={{ maxWidth: 1280, margin: "12px auto", fontSize: 14, color: "#aab6c2" }}>
      <strong style={{ color: "#e8edf2" }}>{entry.title}</strong> · {entry.domain} · {entry.meaning}
      {actions.length ? <> · actions: {actions.map(a => a.id).join(", ")}</> : null}
    </p>
  </main>;
}

const meta = { title: "Craft/Hero Asset Lab", component: HeroLab, parameters: { layout: "fullscreen" },
  argTypes: { kind: { control: "select", options: heroCatalog().map(e => e.kind) } } } satisfies Meta<typeof HeroLab>;
export default meta;
export const Lab: StoryObj<typeof meta> = { args: { kind: "bull-market" } };
