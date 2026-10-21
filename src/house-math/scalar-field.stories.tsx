import { useCallback, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroView } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createHouse3D } from "../../registry/domains/home-3d";
import { houseSnowSurfaces } from "../../registry/domains/home-effects";
import { HouseFloorPlan2D } from "../../registry/domains/home-floor-plan-2d";
import { HOUSE_PRESETS, facadePoint, resolveHouseLayout } from "../../registry/domains/home-model";
import { evaluateScalarField, planScalarField } from "../../registry/visual/scalar-field";
import type { FieldGrid, ScalarFieldSpec } from "../../registry/visual/scalar-field";
import { ScalarFieldLegend, ScalarFieldSvg } from "../../registry/visual/scalar-field-react";
import { createScalarFieldThree } from "../../registry/visual/scalar-field-three";
import type { ScalarFieldThree } from "../../registry/visual/scalar-field-three";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

// Illustrative supplied grids for the story (not measurements and not simulations).
const SPEC = { ...HOUSE_PRESETS.cottage, interior: false };
const L = resolveHouseLayout(SPEC), D = L.dims, front = L.facades.front;
const LI = resolveHouseLayout(HOUSE_PRESETS.cottage); // with interior, for the plan
const grid = (rows: number, cols: number, f: (s: number, t: number) => number | null): FieldGrid => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => f(c / (cols - 1), r / (rows - 1))));

function wallSurvey(): ScalarFieldSpec {
  const len = front.length, h = D.eaveY, stud = .406;
  const inOpening = (u: number, v: number) => front.openings.some(o => u >= o.u0 && u <= o.u1 && v >= o.v0 && v <= o.v1);
  return {
    id: "wall-ir", label: "Exterior surface temperature", unit: "°C", source: "story fixture shaped like an infrared survey on a cold night (illustrative)", ramp: "thermal", domain: { mode: "fixed", range: [-2, 9] },
    surface: { origin: facadePoint(front.frame, len / 2, h / 2, .012), u: front.frame.uAxis, v: [0, 1, 0], size: [len, h] },
    keyframes: [{ frame: 0, grid: grid(22, 60, (s, t) => {
      const u = s * len, v = t * h;
      if (s > .9 && t < .3) return null; // behind shrubs: not scanned
      if (inOpening(u, v)) return 6.5 + Math.sin(u * 7) * .6;
      const studLine = Math.exp(-(((u % stud) - stud / 2) ** 2) / .0012);
      const plate = Math.exp(-((v - (h - .1)) ** 2) / .01) + Math.exp(-((v - D.floorY) ** 2) / .012);
      return .4 + studLine * 1.6 + plate * 2.2 + (s < .04 || s > .96 ? -.8 : 0);
    }) }],
  };
}
function roofMoisture(): ScalarFieldSpec {
  const sf = houseSnowSurfaces(L).roof[0], spot = (k: number) => (s: number, t: number) => {
    if (s > .72 && s < .86 && t < .2) return null; // around the chimney: not scanned
    const d2 = ((s - .33) / .18) ** 2 + ((t - .55) / .3) ** 2;
    return 11 + (k * 22) * Math.exp(-d2 * (2.2 - k));
  };
  return {
    id: "roof-mc", label: "Decking moisture content", unit: "% MC", source: "story fixture shaped like a pin-meter grid survey (illustrative)", ramp: "moisture", domain: { mode: "fixed", range: [8, 30] },
    surface: { ...sf, origin: [sf.origin[0], sf.origin[1] + .01, sf.origin[2]] }, contours: [19], bands: [{ above: 19, label: "sustained levels like this risk decay (per the source)" }],
    keyframes: [{ frame: 0, grid: grid(14, 30, spot(.25)), label: "first survey" }, { frame: 90, grid: grid(14, 30, spot(.7)), label: "after 6 weeks" }, { frame: 180, grid: grid(14, 30, spot(1.05)), label: "after a wet season" }],
  };
}
function roomTemps(): ScalarFieldSpec {
  const W = D.width / 2, DD = D.depth / 2, rooms = LI.interior!.rooms.filter(r => r.storey === 0);
  const setpoint: Record<string, number> = { kitchen: 22.2, living: 21.2, bedroom: 19.6, bath: 22.8, utility: 18.4, hall: 20.2, closet: 19 };
  return {
    id: "room-temp", label: "Air temperature at 1.1 m", unit: "°C", source: "story fixture shaped like a grid of logged sensors (illustrative)", ramp: "thermal", domain: { mode: "fixed", range: [16, 24] }, contours: [19, 20, 21, 22],
    surface: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], size: [W * 2, DD * 2] },
    keyframes: [{ frame: 0, grid: grid(30, 40, (s, t) => {
      const x = -W + s * W * 2, z = -DD + t * DD * 2, room = rooms.find(r => r.rects.some(q => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1));
      if (!room) return null;
      const edge = Math.min(W - Math.abs(x), DD - Math.abs(z));
      return (setpoint[room.kind] ?? 20.5) - Math.max(0, 1.2 - edge) * 1.6;
    }) }],
  };
}

type DemoId = "wall" | "roof" | "plan";
const DEMOS: Record<DemoId, { label: string; describe: string; spec: () => ScalarFieldSpec; view?: HeroView }> = {
  wall: { label: "Wall thermal survey (3D)", describe: "A supplied exterior-temperature grid on the front wall: studs and plates show as warmer lines (heat leaking through framing), openings are warmest, and an unscanned patch is hatched.", spec: wallSurvey, view: { azimuth: 0, elevation: 4, zoom: 1.5, target: [0, D.eaveY / 2, D.depth / 2] } },
  roof: { label: "Roof moisture over time (3D)", describe: "Supplied moisture readings on the roof decking at three surveys. The wet area grows on a fixed scale, so colors compare across time; a 19% contour marks the band the source calls risky.", spec: roofMoisture, view: { azimuth: 20, elevation: 40, zoom: 1.5 } },
  plan: { label: "Room temperatures (2D plan)", describe: "Gridded sensor readings over the floor plan with 1 °C contours. Switch to a dynamic scale to see why colors then stop being comparable.", spec: roomTemps },
};

function FieldDemo({ demo: initial }: { demo: DemoId }) {
  const [id, setId] = useState<DemoId>(initial);
  const [dynamic, setDynamic] = useState(false);
  const demo = DEMOS[id];
  const plan = useMemo(() => { const s = demo.spec(); return planScalarField(dynamic ? { ...s, domain: { mode: "dynamic" } } : s); }, [demo, dynamic]);
  const duration = Math.max(60, ...plan.spec.keyframes.map(k => k.frame)) + 40;
  const player = useFramePlayer(duration, { loop: true, autoplay: true });
  const fx = useRef<ScalarFieldThree | null>(null);
  const create = useCallback(() => createHouse3D(SPEC), []);
  const onAsset = useCallback((a: HeroAsset) => { fx.current?.dispose(); fx.current = createScalarFieldThree(plan); a.group.add(fx.current.group); }, [plan]);
  const onPose = useCallback((a: HeroAsset, s: HeroActionState) => { a.pose?.({ id: null, frame: 0 }); fx.current?.update(s.frame); }, []);
  const f = evaluateScalarField(plan, player.frame);
  const pad = .6, W = D.width / 2, DD = D.depth / 2;
  return <Page kicker="House Math · Fields" title="ScalarFieldOverlay"
    intro={<>Supplied scalar fields (temperature, moisture, pressure) as calibrated color, contours and threshold bands, on 3D surfaces or 2D plans. Kumiki never simulates the physics. Units, source and scale policy are always shown, missing data is hatched rather than zero, clipped values are disclosed, and fields can change over time between keyframes.</>}>
    <Row label="Field">{(Object.keys(DEMOS) as DemoId[]).map(k => <Button key={k} active={id === k} title={DEMOS[k].describe} onClick={() => { setId(k); player.restart(); }}>{DEMOS[k].label}</Button>)}</Row>
    <p style={{ margin: 0, color: ink.sub }}>{demo.describe}</p>
    <Row label="Scale">
      <Button small active={player.playing} onClick={() => (player.playing ? player.pause() : player.resume())}>{player.playing ? "Pause" : "Play"}</Button>
      <Button small active={!dynamic} onClick={() => setDynamic(false)}>fixed</Button>
      <Button small active={dynamic} onClick={() => setDynamic(true)}>dynamic</Button>
      <div style={{ minWidth: 320, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={duration - 1} onChange={player.seek} /></div>
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14, alignItems: "start" }}>
      <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}`, position: "relative" }}>
        {id === "plan"
          ? <div style={{ position: "relative" }}>
            <HouseFloorPlan2D layout={LI} storey={0} furniture labels />
            <svg viewBox={`${-W - pad} ${-DD - pad} ${W * 2 + pad * 2} ${DD * 2 + pad * 2}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "multiply" }} aria-hidden>
              <ScalarFieldSvg plan={plan} frame={player.frame} project={p => [p[0], p[2]] as const} contourWidth={.035} hatchSize={.2} opacity={.72} />
            </svg>
          </div>
          : <HeroAssetViewer key={`${id}-${dynamic}`} createAsset={create} width={1280} height={760} {...demo.view} action="field" actionFrame={player.frame} onAsset={onAsset} onPose={onPose} ariaLabel={`${plan.spec.label} overlay`} />}
      </div>
      <Panel title="Legend">
        <div style={{ color: ink.text }}><ScalarFieldLegend plan={plan} frame={player.frame} frameData={f} /></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{plan.diagnostics.map((d, i) => <Chip key={i} tone={d.severity === "error" ? ink.warn : ink.dim}>{`${d.code}: ${d.message}`}</Chip>)}</div>
        <div style={{ fontFamily: mono, fontSize: 12, color: ink.sub }}>{`domain ${f.domain.map(v => v.toFixed(1)).join("–")} · missing ${f.missing} · clipped ${(f.clipped.above * 100).toFixed(1)}% above`}</div>
      </Panel>
    </div>
  </Page>;
}

const meta = {
  title: "House Math/Scalar Field Overlay", component: FieldDemo, parameters: { layout: "fullscreen" },
  argTypes: { demo: { control: "inline-radio", options: Object.keys(DEMOS) } },
} satisfies Meta<typeof FieldDemo>;
export default meta;
export const Fields: StoryObj<typeof meta> = { args: { demo: "wall" } };
