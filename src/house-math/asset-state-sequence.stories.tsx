import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import { createFinanceObjectHeroAsset } from "../../registry/domains/finance-object-3d";
import { createHouse3D } from "../../registry/domains/home-3d";
import { createHomeEquipment3D } from "../../registry/domains/home-equipment-3d";
import { HOUSE_PRESETS } from "../../registry/domains/home-model";
import type { HouseSpec } from "../../registry/domains/home-model";
import { compileAssetStateSequence, evaluateAssetStateSequence } from "../../registry/visual/asset-state-sequence";
import type { AssetStateSequenceSpec } from "../../registry/visual/asset-state-sequence";
import { createAssetStateAsset } from "../../registry/visual/asset-state-sequence-three";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

const house = (over: Partial<HouseSpec>): HouseSpec => ({ ...HOUSE_PRESETS.cottage, interior: false, ...over });

const SEQUENCES: Record<string, { label: string; describe: string; spec: AssetStateSequenceSpec; builds: Record<string, () => HeroAsset>; view: { azimuth: number; elevation: number; zoom: number } }> = {
  house: {
    label: "House: aging, storm, repair", describe: "Supplied condition builds of one house (new, aged, damaged, re-roofed) plus an evening pose. Builds change by wipe or crossfade; the evening lights interpolate a real action.",
    view: { azimuth: 24, elevation: 16, zoom: 1.35 },
    builds: {
      new: () => createHouse3D(house({ condition: "new" })),
      aged: () => createHouse3D(house({ condition: "aged" })),
      damaged: () => createHouse3D(house({ condition: "damaged" })),
      repaired: () => createHouse3D(house({ condition: "new", shingles: "architectural" })),
    },
    spec: { id: "house-life", initial: "new",
      states: [
        { id: "new", label: "New build", kind: "variant" }, { id: "aged", label: "15 years on", kind: "variant" },
        { id: "damaged", label: "After a storm", kind: "variant" }, { id: "repaired", label: "Re-roofed", kind: "variant" },
        { id: "evening", label: "Evening", kind: "pose", variant: "repaired", pose: { action: "lights-on", frame: 36 } },
      ],
      steps: [
        { state: "aged", at: 30, duration: 60, transition: "wipe", label: "15 years later", wipe: { axis: "x", direction: 1 } },
        { state: "damaged", at: 120, duration: 30, transition: "interpolate", label: "A storm tears off shingles", focus: "roof.shingles" },
        { state: "repaired", at: 190, duration: 70, transition: "wipe", label: "Roof replaced (architectural shingles)", focus: "roof", wipe: { axis: "y", direction: -1 } },
        { state: "evening", at: 290, duration: 40, label: "Evening: lights come on" },
      ] },
  },
  heater: {
    label: "Water heater replacement", describe: "A failed tank is replaced by a wall-hung tankless unit. Different equipment cannot morph, so the sequence uses a declared cut; the shared semantic part `unit` keeps its identity.",
    view: { azimuth: 26, elevation: 10, zoom: 1.1 },
    builds: { tank: () => createHomeEquipment3D({ kind: "tank-water-heater" }), tankless: () => createHomeEquipment3D({ kind: "tankless-water-heater" }) },
    spec: { id: "heater-swap", initial: "tank",
      states: [{ id: "tank", label: "Old tank heater", kind: "variant" }, { id: "tankless", label: "Tankless replacement", kind: "variant" }],
      steps: [
        { state: "tank", at: 20, duration: 40, transition: "hold", label: "The tank fails at year 12", focus: "unit" },
        { state: "tankless", at: 70, transition: "cut", label: "Replaced the same day", focus: "unit" },
      ] },
  },
  market: {
    label: "Market sculpture (non-home)", describe: "Same component, different subject: a bull sculpture becomes a bear. The author asked to interpolate; two different sculptures cannot morph, so it falls back to a crossfade and says so.",
    view: { azimuth: 20, elevation: 8, zoom: 1.2 },
    builds: { bull: () => createFinanceObjectHeroAsset({ kind: "bull-market", id: "seq-bull" })!, bear: () => createFinanceObjectHeroAsset({ kind: "bear-market", id: "seq-bear" })! },
    spec: { id: "market-turn", initial: "bull",
      states: [{ id: "bull", label: "Bull market", kind: "variant" }, { id: "bear", label: "Bear market", kind: "variant" }],
      steps: [{ state: "bear", at: 30, duration: 50, transition: "interpolate", label: "The market turns" }] },
  },
};

function StateSequenceDemo({ sequence: initial }: { sequence: string }) {
  const [key, setKey] = useState(initial);
  const seq = SEQUENCES[key];
  const plan = useMemo(() => compileAssetStateSequence(seq.spec), [seq]);
  const duration = plan.durationFrames + 30;
  const player = useFramePlayer(duration, { loop: true, autoplay: true });
  const create = useCallback(() => createAssetStateAsset({ id: seq.spec.id, plan, variants: Object.fromEntries(Object.entries(seq.builds).map(([id, make]) => [id, make()])) }), [seq, plan]);
  const frame = evaluateAssetStateSequence(plan, player.frame);
  const state = (id: string) => plan.states.get(id)?.label ?? id;
  return <Page kicker="House Math · States" title="AssetStateSequence"
    intro={<>Frame-addressed changes between an asset's <b>supplied</b> states. Poses of one build interpolate a real action; different builds use a wipe, crossfade or cut. An unsupported request falls back explicitly with a diagnostic, unknown states fail at compile time, and any frame seeks to the same result.</>}>
    <Row label="Sequence">{Object.entries(SEQUENCES).map(([k, v]) => <Button key={k} active={key === k} title={v.describe} onClick={() => { setKey(k); player.restart(); }}>{v.label}</Button>)}</Row>
    <p style={{ margin: 0, color: ink.sub }}>{seq.describe}</p>
    <Row label="Playback">
      <Button small active={player.playing} onClick={() => (player.playing ? player.pause() : player.resume())}>{player.playing ? "Pause" : "Play"}</Button>
      <div style={{ minWidth: 340, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={duration - 1} onChange={player.seek} /></div>
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 14, alignItems: "start" }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}` }}>
        <HeroAssetViewer key={key} createAsset={create} width={1280} height={760} {...seq.view} action="sequence" actionFrame={player.frame} ariaLabel={`${seq.label}: ${frame.label ?? state(frame.from)}`} />
        <div style={{ position: "absolute", left: 16, bottom: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(12,16,21,.78)", color: ink.text, fontSize: 15 }}>
          <b>{frame.to ? `${state(frame.from)} → ${state(frame.to)}` : state(frame.from)}</b>
          {frame.label ? <span style={{ color: ink.sub }}>{` · ${frame.label}`}</span> : null}
          {frame.to ? <span style={{ color: ink.dim, fontFamily: mono, fontSize: 12 }}>{`  ${frame.method} ${(frame.mix * 100).toFixed(0)}%`}</span> : null}
        </div>
      </div>
      <Panel title="Resolved steps">
        {plan.steps.map((s, i) => <div key={i} style={{ fontSize: 13, color: i === frame.stepIndex ? ink.text : ink.sub, borderLeft: `3px solid ${i === frame.stepIndex ? ink.accent : ink.line}`, paddingLeft: 8 }}>
          <div><b>{`${s.start}–${s.end}`}</b>{` ${state(s.from)} → ${state(s.to)}`}</div>
          <div style={{ fontFamily: mono, fontSize: 12 }}>{s.method}{s.requested ? ` (asked ${s.requested})` : ""}{s.focus ? ` · focus ${s.focus}` : ""}</div>
          {s.label ? <div style={{ color: ink.dim }}>{s.label}</div> : null}
        </div>)}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {plan.diagnostics.length ? plan.diagnostics.map((d, i) => <Chip key={i} tone={d.severity === "error" ? ink.warn : ink.dim}>{`${d.code}: ${d.message}`}</Chip>) : <Chip tone={ink.accent}>no fallbacks</Chip>}
        </div>
      </Panel>
    </div>
  </Page>;
}

const meta = {
  title: "Asset motion and states/Asset State Sequence", id: "house-math-asset-state-sequence", component: StateSequenceDemo, parameters: { layout: "fullscreen" },
  argTypes: { sequence: { control: "inline-radio", options: Object.keys(SEQUENCES) } },
} satisfies Meta<typeof StateSequenceDemo>;
export default meta;
export const States: StoryObj<typeof meta> = { args: { sequence: "house" } };
