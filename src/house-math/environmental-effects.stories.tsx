import { useCallback, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroView } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createPartRig } from "../../registry/craft/part-rig";
import type { PartPoses, PartRig } from "../../registry/craft/part-rig";
import { createHouse3D } from "../../registry/domains/home-3d";
import { houseEffects } from "../../registry/domains/home-effects";
import type { HouseEffectPreset } from "../../registry/domains/home-effects";
import { HOUSE_PRESETS, facadePoint, resolveHouseLayout } from "../../registry/domains/home-model";
import { createHouseSection } from "../../registry/domains/home-section-2d";
import { HouseSection2D } from "../../registry/domains/home-section-2d-svg";
import { compileEffect, evaluateEffect } from "../../registry/visual/environmental-effects";
import { EnvironmentalEffectsSvg } from "../../registry/visual/environmental-effects-react";
import { createEnvironmentalEffectsThree } from "../../registry/visual/environmental-effects-three";
import type { EnvironmentalEffectsThree } from "../../registry/visual/environmental-effects-three";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

const SPEC = { ...HOUSE_PRESETS.cottage, interior: false };
const LAYOUT = resolveHouseLayout(SPEC);
const SPEC_IN = HOUSE_PRESETS.cottage;
const D = LAYOUT.dims, WIN = LAYOUT.facades.front.openings.find(o => o.kind === "window")!;
const winCenter = facadePoint(LAYOUT.facades.front.frame, (WIN.u0 + WIN.u1) / 2, WIN.v0 + (WIN.v1 - WIN.v0) * .3, 0);
const DOLLHOUSE = /^roof$|^solar\.|^chimney$/;

type DemoId = "storm" | "snowfall" | "attic-dust" | "window-condensation" | "roof-leak";
const DEMOS: Record<DemoId, { label: string; describe: string; view?: HeroView; hide?: RegExp; interior?: boolean; twoD?: boolean }> = {
  storm: { label: "Storm (3D)", describe: "Wind-driven rain over the site: fixed-budget streaks, seeded and wrapped inside the region.", view: { azimuth: 28, elevation: 12, zoom: 1.2 } },
  snowfall: { label: "Snowfall (3D)", describe: "Slow flakes with seeded drift. The same code path as rain, with a different motion law.", view: { azimuth: -30, elevation: 14, zoom: 1.15 } },
  "attic-dust": { label: "Attic dust (3D)", describe: "Dust hanging in the attic volume, shown with the roof lifted away; low, additive and slowly drifting.", view: { azimuth: 24, elevation: 34, zoom: 1.9, target: [0, D.eaveY + .8, 0] }, hide: DOLLHOUSE },
  "window-condensation": { label: "Window condensation (3D)", describe: "Droplets nucleate and grow on the lower glass, and the largest run down. The droplets sit on the actual glass plane of the window model.", view: { azimuth: 6, elevation: 2, zoom: 9, target: winCenter } },
  "roof-leak": { label: "Roof leak (2D section)", describe: "Drops form under the decking, fall onto the attic insulation, and a stain spreads on the ceiling below. The section cuts through the leak point.", twoD: true },
};

function EffectsDemo({ demo: initial }: { demo: DemoId }) {
  const [id, setId] = useState<DemoId>(initial);
  const [reduced, setReduced] = useState(false);
  const demo = DEMOS[id];
  const plans = useMemo(() => houseEffects(LAYOUT, id as HouseEffectPreset, { start: 0 }).map(compileEffect), [id]);
  const duration = 360;
  const player = useFramePlayer(duration, { loop: true, autoplay: true });
  const effects = useRef<EnvironmentalEffectsThree | null>(null);
  const rig = useRef<PartRig | null>(null);
  const hidden = useRef<PartPoses>({});
  const create = useCallback(() => createHouse3D(demo.interior ? SPEC_IN : SPEC), [demo]);
  const onAsset = useCallback((a: HeroAsset) => {
    effects.current?.dispose();
    effects.current = createEnvironmentalEffectsThree(plans);
    a.group.add(effects.current.group);
    rig.current?.dispose();
    rig.current = demo.hide ? createPartRig(a.parts) : null;
    hidden.current = demo.hide ? Object.fromEntries([...a.parts.keys()].filter(k => demo.hide!.test(k)).map(k => [k, { visible: false }])) : {};
  }, [plans, demo]);
  const onPose = useCallback((a: HeroAsset, s: HeroActionState) => {
    const base = () => { a.pose?.({ id: null, frame: 0 }); effects.current?.update(s.frame, { reducedMotion: reduced }); };
    if (rig.current) rig.current.apply(hidden.current, base); else base();
  }, [reduced]);
  const frames = plans.map(p => evaluateEffect(p, player.frame, { reducedMotion: reduced }));
  const leakX = -D.width / 2 * .35;
  const section = useMemo(() => createHouseSection(LAYOUT, { cutX: leakX }), [leakX]);
  const W2 = 1280, H2 = Math.round(W2 * section.height / section.width), k = W2 / section.width;
  const diagnostics = plans.flatMap(p => p.diagnostics.filter(d => d.code !== "illustrative"));
  return <Page kicker="House Math · Effects" title="EnvironmentalEffects"
    intro={<>Seeded, bounded illustrative effects: rain, snow, dust, drips, condensation and stains, placed in regions and surfaces taken from the asset. Each particle is a closed-form function of seed, index and frame, so seeking is exact and memory is fixed. Every effect is labeled illustrative, and reduced motion freezes moving particles while keeping lasting results such as stains.</>}>
    <Row label="Effect">{(Object.keys(DEMOS) as DemoId[]).map(k2 => <Button key={k2} active={id === k2} title={DEMOS[k2].describe} onClick={() => { setId(k2); player.restart(); }}>{DEMOS[k2].label}</Button>)}</Row>
    <p style={{ margin: 0, color: ink.sub }}>{demo.describe}</p>
    <Row label="Playback">
      <Button small active={player.playing} onClick={() => (player.playing ? player.pause() : player.resume())}>{player.playing ? "Pause" : "Play"}</Button>
      <Button small active={reduced} onClick={() => setReduced(r => !r)}>Reduced motion</Button>
      <div style={{ minWidth: 340, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={duration - 1} onChange={player.seek} /></div>
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 14, alignItems: "start" }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}` }}>
        {demo.twoD
          ? <div style={{ position: "relative", width: "100%", aspectRatio: `${W2} / ${H2}` }}>
            <HouseSection2D section={section} theme="paper" style={{ position: "absolute", inset: 0 }} />
            <svg viewBox={`0 0 ${W2} ${H2}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
              <EnvironmentalEffectsSvg frames={frames} unitScale={k} project={p => { const q = section.project([p[0], p[1], p[2]]); return [q[0] * k, q[1] * k] as const; }} />
            </svg>
          </div>
          : <HeroAssetViewer key={id} createAsset={create} width={1280} height={760} {...demo.view} action="effects" actionFrame={player.frame} onAsset={onAsset} onPose={onPose} ariaLabel={`${demo.label}, illustrative`} />}
        <div style={{ position: "absolute", left: 14, bottom: 12, padding: "6px 10px", borderRadius: 8, background: "rgba(12,16,21,.78)", color: ink.text, fontSize: 13 }}>{frames.map(f => f.caption).join(" · ")}{reduced ? " · reduced motion" : ""}</div>
      </div>
      <Panel title="Effect plan">
        <div style={{ fontFamily: mono, fontSize: 12, color: ink.sub, lineHeight: 1.6 }}>
          {frames.map(f => <div key={f.id}>{`${f.id}: ${f.kind} · ${f.count} particles · opacity ${f.opacity.toFixed(2)}${f.stain ? ` · stain r=${f.stain.radius.toFixed(2)} m` : ""}${f.staticPose ? " · static" : ""}`}</div>)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Chip tone={ink.accent}>illustrative — not measured rates</Chip>{diagnostics.map((d, i) => <Chip key={i} tone={ink.warn}>{`${d.code}: ${d.message}`}</Chip>)}</div>
      </Panel>
    </div>
  </Page>;
}

const meta = {
  title: "House Math/Environmental Effects", component: EffectsDemo, parameters: { layout: "fullscreen" },
  argTypes: { demo: { control: "inline-radio", options: Object.keys(DEMOS) } },
} satisfies Meta<typeof EffectsDemo>;
export default meta;
export const Effects: StoryObj<typeof meta> = { args: { demo: "storm" } };
