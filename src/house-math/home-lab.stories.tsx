import { useCallback, useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroRenderOptions } from "../../registry/craft/hero-render";
import { createHouse3D } from "../../registry/domains/home-3d";
import { HOUSE_PRESETS } from "../../registry/domains/home-model";
import type { HouseCondition, HousePresetName, HouseSpec } from "../../registry/domains/home-model";

/** Reproducible capture harness for the home kit, driven by URL parameters:
 * ?kmPreset=cottage&kmAz=30&kmEl=12&kmZoom=2&kmTarget=x,y,z&kmAction=roof-peel&kmActionFrame=60
 * &kmHide=roof.shingles,wall.front&kmCondition=aged&kmW=1280&kmH=720&kmStudio={"backdropEnabled":false} */
const param = (name: string) => new URLSearchParams(window.location.search).get(name);
const num = (name: string, fallback: number) => { const v = Number(param(name)); return param(name) !== null && Number.isFinite(v) ? v : fallback; };

function HomeLab({ preset }: { preset: HousePresetName }) {
  const selected = (param("kmPreset") as HousePresetName | null) ?? preset;
  const condition = (param("kmCondition") as HouseCondition | null) ?? undefined;
  const hide = useMemo(() => (param("kmHide") ?? "").split(",").filter(Boolean), []);
  const target = param("kmTarget")?.split(",").map(Number) as [number, number, number] | undefined;
  const width = num("kmW", 1280), height = num("kmH", 720);
  const create = useCallback(() => {
    const spec: HouseSpec = { ...HOUSE_PRESETS[selected], ...(condition ? { condition } : {}) };
    const asset = createHouse3D(spec);
    for (const id of hide) { const part = asset.parts.get(id); if (part) part.visible = false; }
    return asset;
  }, [selected, condition, hide]);
  return <main style={{ background: "#0d1014", minHeight: "100vh", padding: 16, color: "#e8edf2", fontFamily: "Geist, system-ui, sans-serif" }}>
    <div data-km-video-capture="" style={{ width: "min(100%, " + width + "px)", margin: "0 auto" }}>
      <HeroAssetViewer createAsset={create} width={width} height={height}
        azimuth={num("kmAz", 32)} elevation={num("kmEl", 14)} zoom={num("kmZoom", 1)}
        target={target && target.length === 3 && target.every(Number.isFinite) ? target : undefined}
        action={param("kmAction")} actionFrame={num("kmActionFrame", 0)}
        studio={param("kmStudio") ? JSON.parse(param("kmStudio")!) : undefined}
        render={param("kmRender") ? JSON.parse(param("kmRender")!) as HeroRenderOptions : undefined} />
    </div>
  </main>;
}

const meta = {
  title: "Home/Home Lab", id: "house-math-lab", component: HomeLab, parameters: { layout: "fullscreen" },
  argTypes: { preset: { control: "select", options: Object.keys(HOUSE_PRESETS) } },
} satisfies Meta<typeof HomeLab>;
export default meta;
export const Lab: StoryObj<typeof meta> = { args: { preset: "cottage" } };
