import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createCanvasMeasurer } from "../../registry/media/text-layout";
import { createHouse3D, inspectHouse3D } from "../../registry/domains/home-3d";
import type { HouseAsset } from "../../registry/domains/home-3d";
import { HOUSE_PRESETS } from "../../registry/domains/home-model";
import type { InspectableAsset } from "../../registry/visual/inspectable-asset";
import { layoutCallouts } from "../../registry/visual/semantic-callouts";
import type { CalloutSpec, CalloutStatus } from "../../registry/visual/semantic-callouts";
import { SemanticCalloutOverlay } from "../../registry/visual/semantic-callouts-react";
import { createThreeCalloutProjector, heroViewCamera } from "../../registry/visual/semantic-callouts-three";
import { Button, Chip, Page, Panel, Row, font, ink, mono, useFramePlayer } from "./house-ui";

const TOTAL = 180;
const CALLOUTS: CalloutSpec[] = [
  { id: "ridge", anchorId: "roof.ridge", title: "Ridge cap", detail: "Overlapping caps shed water", priority: 3 },
  { id: "shingles", anchorId: "roof.front-plane", title: "Asphalt shingles", detail: "140 mm exposure per course", priority: 5 },
  { id: "gutter", anchorId: "roof.gutter", title: "K-style gutter", priority: 2 },
  { id: "chimney", anchorId: "chimney.flashing", title: "Step flashing", detail: "Seals the roof-to-brick joint", priority: 2 },
  { id: "door", partId: "opening.front-door.leaf", title: "Entry door", detail: "Leaf follows its hinge", priority: 4 },
  { id: "condenser", anchorId: "hvac.condenser.top", title: "Condenser fan", detail: "Moves heat outdoors", priority: 4 },
  { id: "foundation", anchorId: "foundation.edge", title: "CMU stem wall", priority: 1 },
  { id: "attic", anchorId: "attic.insulation.top", title: "Blown insulation", detail: "Inside the attic", priority: 1 },
].map((c, i) => ({ ...c, window: { startFrame: 6 + i * 9, endFrame: TOTAL } }));
const STATUS_TONE: Record<CalloutStatus, string> = { visible: "#6fd3a6", occluded: "#e7b15e", outside: "#7aa7e8", unplaceable: "#ee7480", inactive: "#7d8a98" };

function CalloutsDemo() {
  const [portrait, setPortrait] = useState(false);
  const [depth, setDepth] = useState(true);
  const [impossible, setImpossible] = useState(false);
  const [asset, setAsset] = useState<HouseAsset | null>(null);
  const [inspect, setInspect] = useState<InspectableAsset | null>(null);
  const player = useFramePlayer(TOTAL, { loop: true });
  const frame = player.frame;
  const W = portrait ? 720 : 1280, H = portrait ? 1280 : 720;
  const view = { azimuth: 6 + frame * .36, elevation: portrait ? 18 : 13, zoom: portrait ? 1.35 : 1.05 };
  const action = { id: "door-open" as const, frame: Math.max(0, frame - 70) };
  const create = useCallback(() => createHouse3D({ ...HOUSE_PRESETS.cottage }), []);
  const onAsset = useCallback((a: HeroAsset) => {
    setAsset(a as HouseAsset);
    setInspect(inspectHouse3D(a as HouseAsset, f => a.pose?.({ id: "door-open", frame: Math.max(0, f - 70) })));
  }, []);
  const onPose = useCallback((a: HeroAsset, s: HeroActionState) => a.pose?.(s), []);
  const measure = useMemo(() => createCanvasMeasurer({}), []);
  const caption = { x: 0, y: H * .84, width: W, height: H * .16 };

  const layout = useMemo(() => {
    if (!asset || !inspect) return null;
    const camera = heroViewCamera(asset, view, W, H);
    const projector = createThreeCalloutProjector({ camera, viewport: { width: W, height: H }, root: asset.group, parts: asset.parts });
    const viewport = impossible ? { width: W, height: H } : { width: W, height: H };
    const callouts = impossible ? CALLOUTS.map(c => ({ ...c, title: c.title + " — a deliberately long explanatory label that cannot fit beside its part", detail: undefined })) : CALLOUTS;
    return layoutCallouts({
      asset: inspect, callouts, frame, viewport,
      project: projector.project, occluded: depth ? projector.occluded : undefined,
      protectedRegions: impossible ? [caption, { x: 0, y: 0, width: W, height: H * .3 }] : [caption], protectedParts: ["hvac.condenser"],
      typography: { titleFont: `600 ${portrait ? 26 : 21}px ${font}`, titleSizePx: portrait ? 26 : 21, maxWidthPx: impossible ? W * .55 : portrait ? 380 : 300, measure, maxTitleLines: 2 },
      safeInset: 18,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view derives from frame/portrait.
  }, [asset, inspect, frame, portrait, depth, impossible, measure]);
  const counts = layout?.callouts.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {} as Partial<Record<CalloutStatus, number>>);

  return <Page kicker="House Math · V03" title="SemanticCalloutLayer — labels that follow physical parts"
    intro={<>Anchors come from <code>InspectableAsset</code> at each absolute frame and are projected through the same camera the viewer renders.
      Labels are measured with real fonts, avoid the caption band and the protected condenser, keep their side while their anchor stays on the same half,
      and report <em>occluded</em>, <em>outside</em> or <em>unplaceable</em> honestly instead of clipping.</>}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 330px", gap: 14 }}>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <div style={{ position: "relative", background: ink.panel, border: `1px solid ${ink.line}`, borderRadius: 14, overflow: "hidden", width: "100%", maxWidth: portrait ? 470 : undefined, justifySelf: portrait ? "center" : "stretch" }}>
          <HeroAssetViewer key={String(portrait)} createAsset={create} width={W} height={H} {...view} action={action.id} actionFrame={action.frame}
            onAsset={onAsset} onPose={onPose} ariaLabel="Cottage with semantic callouts" />
          {layout ? <SemanticCalloutOverlay layout={layout} width={W} height={H} /> : null}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "16%", display: "grid", placeItems: "center", background: "linear-gradient(transparent, rgba(8,12,16,.55))", pointerEvents: "none" }}>
            <span style={{ color: "#fff", font: `600 ${portrait ? 15 : 17}px ${font}`, textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>Protected caption band — callouts never cover it</span>
          </div>
        </div>
        <Panel>
          <Row label="Frame">
            <Button onClick={() => player.playing ? player.pause() : player.resume()}>{player.playing ? "Pause" : "Play"}</Button>
            <input type="range" aria-label="Frame" min={0} max={TOTAL - 1} value={frame} onChange={e => player.seek(Number(e.target.value))} style={{ flex: 1, minWidth: 200 }} />
            <span style={{ fontVariantNumeric: "tabular-nums", color: ink.sub, fontSize: 13, minWidth: 64 }}>{frame} / {TOTAL - 1}</span>
          </Row>
          <Row label="Framing"><Button active={!portrait} onClick={() => setPortrait(false)}>16:9</Button><Button active={portrait} onClick={() => setPortrait(true)}>9:16</Button></Row>
          <Row label="Occlusion"><Button active={depth} onClick={() => setDepth(true)}>Depth test</Button><Button active={!depth} onClick={() => setDepth(false)}>Unknown</Button></Row>
          <Row label="Stress"><Button active={!impossible} onClick={() => setImpossible(false)}>Normal</Button><Button active={impossible} onClick={() => setImpossible(true)}>Impossible layout</Button></Row>
        </Panel>
      </div>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <Panel title="Status per callout">
          {counts ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(Object.keys(STATUS_TONE) as CalloutStatus[]).filter(s => counts[s]).map(s => <Chip key={s} tone={STATUS_TONE[s]}>{`${s} ${counts[s]}`}</Chip>)}</div> : <p role="status" style={{ margin: 0, color: ink.dim }}>Building…</p>}
          <div style={{ display: "grid", gap: 4 }}>
            {layout?.callouts.map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
              <span style={{ fontFamily: mono, color: ink.sub }}>{c.id}</span>
              <span style={{ color: STATUS_TONE[c.status] }}>{c.status}{c.side ? ` · ${c.side}` : ""}</span>
            </div>)}
          </div>
        </Panel>
        <Panel title={`Diagnostics · ${layout?.diagnostics.length ?? 0}`}>
          {layout?.diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: ink.sub, lineHeight: 1.5 }}>
            {layout.diagnostics.slice(0, 8).map((d, i) => <li key={i}><code style={{ color: ink.warn }}>{d.code}</code> — {d.message}</li>)}
          </ul> : <p style={{ margin: 0, fontSize: 13, color: ink.dim }}>None at this frame.</p>}
        </Panel>
      </div>
    </div>
  </Page>;
}

const meta = { title: "Annotation and measurement/Semantic Callouts", id: "house-math-semantic-callouts", component: CalloutsDemo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof CalloutsDemo>;
export default meta;
export const FollowParts: StoryObj<typeof meta> = {};
