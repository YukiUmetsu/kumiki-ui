import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createCanvasMeasurer } from "../../registry/media/text-layout";
import { HOUSE_PRESETS, resolveHouseLayout } from "../../registry/domains/home-model";
import type { HouseMedium, HousePresetName } from "../../registry/domains/home-model";
import { createHouseSection, houseSectionFlows, inspectHouseSection } from "../../registry/domains/home-section-2d";
import { HouseSection2D } from "../../registry/domains/home-section-2d-svg";
import type { HouseSectionTheme, SectionPose } from "../../registry/domains/home-section-2d-svg";
import { compileFlowPath, evaluateFlowPath } from "../../registry/visual/flow-path";
import type { FlowStyle } from "../../registry/visual/flow-path";
import { FlowPathSvg } from "../../registry/visual/flow-path-react";
import { compileSectionReveal, evaluateSectionReveal } from "../../registry/visual/section-reveal";
import { sectionRevealSvgOpacities } from "../../registry/visual/section-reveal-svg";
import { layoutCallouts } from "../../registry/visual/semantic-callouts";
import type { CalloutSpec } from "../../registry/visual/semantic-callouts";
import { SemanticCalloutOverlay } from "../../registry/visual/semantic-callouts-react";
import { Button, Chip, Page, Panel, Row, Slider, font, ink, useFramePlayer } from "./house-ui";

const TOTAL = 240;
const FLOWS: Record<string, { label: string; media: HouseMedium[] }> = {
  none: { label: "None", media: [] }, hvac: { label: "Air & refrigerant", media: ["supply-air", "return-air", "refrigerant"] },
  water: { label: "Water", media: ["cold-water", "hot-water"] }, rain: { label: "Rain", media: ["rain"] },
};
const CALLOUTS: CalloutSpec[] = [
  { id: "shingles", anchorId: "roof.front-plane", title: "Shingles", detail: "Over underlayment and OSB", priority: 4 },
  { id: "attic", anchorId: "attic.insulation.top", title: "Blown insulation", priority: 3 },
  { id: "gutter", anchorId: "roof.gutter", title: "K-style gutter", priority: 2 },
  { id: "footing", anchorId: "foundation.footing.toe", title: "Footing", detail: "Spreads the wall load", priority: 2 },
  { id: "wall", anchorId: "wall.front.face", title: "Wall layers", detail: "Siding · OSB · batts · drywall", priority: 3 },
];
type Motion = "none" | "roof-peel" | "door" | "ghost";

function HomeKit2D({ preset: initial }: { preset: HousePresetName }) {
  const [preset, setPreset] = useState<HousePresetName>(initial);
  const [theme, setTheme] = useState<HouseSectionTheme>("paper");
  const [cut, setCut] = useState(0);
  const [flow, setFlow] = useState("rain");
  const [style, setStyle] = useState<FlowStyle>("particles");
  const [motion, setMotion] = useState<Motion>("none");
  const [labels, setLabels] = useState(true);
  const player = useFramePlayer(TOTAL, { loop: true, autoplay: true });
  const frame = player.frame;
  const layout = useMemo(() => resolveHouseLayout(HOUSE_PRESETS[preset]), [preset]);
  const section = useMemo(() => createHouseSection(layout, { cutX: Math.max(-layout.dims.width / 2 + .3, Math.min(layout.dims.width / 2 - .3, cut)) }), [layout, cut]);
  const inspect = useMemo(() => inspectHouseSection(section), [section]);
  const flowPlans = useMemo(() => houseSectionFlows(section, { media: FLOWS[flow].media, style }).map(f => ({ f, plan: compileFlowPath({ ...f.spec, jitter: style === "particles" ? { amount: .02, seed: 3 } : undefined }) })), [section, flow, style]);
  const ghostPlan = useMemo(() => motion !== "ghost" ? null : compileSectionReveal({ id: "ghost-2d", mode: "ghost", targets: inspect.parts.filter(p => /^(hvac|plumbing)/.test(p.id)).map(p => p.id).filter(id => inspect.parts.some(p => p.id === id)), reveal: { startFrame: 10, endFrame: 50 }, ghostOpacity: .22 }, inspect), [motion, inspect]);

  // Part motion in section units (meters, y down) — a pure function of the frame.
  const poses = useMemo(() => {
    const out: Record<string, SectionPose | undefined> = {};
    const k = (a: number, b: number) => { const t = Math.max(0, Math.min(1, (frame % 150 - a) / (b - a))); return t * t * (3 - 2 * t); };
    if (motion === "roof-peel") ["roof.shingles", "roof.ridge-cap", "roof.underlayment", "roof.decking"].forEach((id, i) => { out[id] = { translate: [0, -k(10 + i * 14, 50 + i * 14) * (1.3 + (3 - i) * .45)] }; });
    if (motion === "door") {
      const door = layout.openings.find(o => o.kind === "door" && o.facade === "front");
      // A door leaf seen in section swings toward the viewer: show it as a scale toward the hinge side.
      if (door) out[`${door.id}.leaf`] = { opacity: 1 - .85 * k(10, 60) };
    }
    if (ghostPlan) {
      const svg = sectionRevealSvgOpacities(evaluateSectionReveal(ghostPlan, frame % 150), inspect);
      for (const [id, o] of svg.opacity) if (o !== undefined && o < .999) out[id] = { opacity: o };
    }
    return out;
  }, [motion, frame, layout, ghostPlan, inspect]);

  const pxW = 1280, scale = pxW / section.width, pxH = Math.round(section.height * scale);
  const measure = useMemo(() => createCanvasMeasurer({}), []);
  const callouts = useMemo(() => labels ? layoutCallouts({
    asset: inspect, callouts: CALLOUTS.filter(c => inspect.anchors.some(a => a.id === c.anchorId)), frame: 0, viewport: { width: pxW, height: pxH },
    project: p => ({ x: p[0] * scale, y: p[1] * scale, inView: true }),
    protectedParts: ["roof.shingles", "wall.front.siding"].filter(id => inspect.parts.some(p => p.id === id)) as string[],
    typography: { titleFont: `600 19px ${font}`, titleSizePx: 19, maxWidthPx: 270, measure }, safeInset: 12,
  }) : null, [labels, inspect, pxH, scale, measure]);
  const flows = flowPlans.map(({ f, plan }) => ({ f, frame: evaluateFlowPath(plan, frame) }));

  return <Page kicker="House Math · Home kit 2D" title="Cross-section from the same layout"
    intro={<>The SVG section is generated from the identical <code>HouseLayout</code> as the 3D build: same part IDs, anchors and service routes.
      FlowPath, SectionReveal and callouts work on it unchanged. Thin layers are drawn at least 25 mm thick for legibility (stated exaggeration).</>}>
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: `1px solid ${ink.line}` }}>
      <HouseSection2D section={section} theme={theme} poses={poses} title={`${preset} cross-section at x = ${section.cutX.toFixed(1)} m`}
        overlay={flows.map(({ f, frame: ff }) => <FlowPathSvg key={f.spec.id} frame={ff} color={f.color} width={f.medium.endsWith("air") ? .07 : .045} size={f.medium.endsWith("air") ? .2 : .14} trackOpacity={.25} />)} />
      {callouts ? <SemanticCalloutOverlay layout={callouts} width={pxW} height={pxH} /> : null}
    </div>
    <Panel>
      <Row label="House">{(Object.keys(HOUSE_PRESETS) as HousePresetName[]).map(k => <Button key={k} active={preset === k} onClick={() => setPreset(k)}>{k}</Button>)}</Row>
      <Row label="Theme"><Button active={theme === "paper"} onClick={() => setTheme("paper")}>Paper</Button><Button active={theme === "midnight"} onClick={() => setTheme("midnight")}>Midnight</Button></Row>
      <Row label="Flow">{Object.entries(FLOWS).map(([k, v]) => <Button key={k} active={flow === k} onClick={() => setFlow(k)}>{v.label}</Button>)}
        <span style={{ width: 10 }} />{(["arrows", "streaks", "particles", "pulse"] as const).map(k => <Button key={k} small active={style === k} onClick={() => setStyle(k)}>{k}</Button>)}</Row>
      <Row label="Motion">{([["none", "Rest"], ["roof-peel", "Roof layers lift"], ["door", "Door opens"], ["ghost", "Ghost to systems"]] as const).map(([k, v]) => <Button key={k} active={motion === k} onClick={() => setMotion(k)}>{v}</Button>)}</Row>
      <Row label="Labels"><Button active={labels} onClick={() => setLabels(true)}>Callouts</Button><Button active={!labels} onClick={() => setLabels(false)}>Off</Button></Row>
      <Row label="Frame">
        <Button onClick={() => player.playing ? player.pause() : player.resume()}>{player.playing ? "Pause" : "Play"}</Button>
        <input type="range" aria-label="Frame" min={0} max={TOTAL - 1} value={frame} onChange={e => player.seek(Number(e.target.value))} style={{ flex: 1, minWidth: 200 }} />
      </Row>
      <Slider label="Cut at x" value={cut} min={-layout.dims.width / 2 + .3} max={layout.dims.width / 2 - .3} step={.1} onChange={setCut} format={v => `${v.toFixed(1)} m`} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip>{`${section.parts.length} drawn parts`}</Chip><Chip>{`${inspect.anchors.length} anchors`}</Chip><Chip>{`${flows.length} flows`}</Chip>
        {callouts ? <Chip tone={ink.accent}>{`${callouts.callouts.filter(c => c.status === "visible").length} callouts placed`}</Chip> : null}
        <Chip>{`frame ${frame}`}</Chip>
      </div>
    </Panel>
  </Page>;
}

const meta = {
  title: "Home/Home Kit 2D", id: "house-math-home-kit-2d", component: HomeKit2D, parameters: { layout: "fullscreen" },
  argTypes: { preset: { control: "select", options: Object.keys(HOUSE_PRESETS) } },
} satisfies Meta<typeof HomeKit2D>;
export default meta;
export const Section: StoryObj<typeof meta> = { args: { preset: "cottage" } };
