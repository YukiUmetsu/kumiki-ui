import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import latticeUrl from "../../assets/models/anatomy/human-body-lattice.bin?url";
import type { HumanBodyModel, HumanParams } from "../../registry/anatomy/anatomy-body";
import { HUMAN_PRESETS, createHumanBody, loadHumanBodyModel } from "../../registry/anatomy/anatomy-body";
import { measureHumanBody } from "../../registry/anatomy/anatomy-measure";
import { HAND_POSES, POSE_PRESETS, poseHumanBody } from "../../registry/anatomy/anatomy-pose";
import type { HumanPose } from "../../registry/anatomy/anatomy-pose";
import { HumanFigure } from "../../registry/anatomy/anatomy-react";
import type { HumanSurface } from "../../registry/anatomy/anatomy-react";
import { projectPoint, renderHumanFrame, renderMeshFrame, smoothPath } from "../../registry/anatomy/anatomy-view";
import { FACE_FEATURES, FACE_LANDMARKS, FACE_NORMS, IRIS_DIAMETER_MM, createFace, eyeCentres, faceFeatureLines, measureFace } from "../../registry/anatomy/anatomy-face";
import type { FaceMeasureKey, FaceParams } from "../../registry/anatomy/anatomy-face";
import { JOINTS, ROM_SOURCES } from "../../registry/anatomy/anatomy-pose";
import { AGE_CHANGES, ANSUR, CANON_CHECKS, DRAWING_RECIPE, MODEL_TABLES, SURFACE_FORMS, statureForAge } from "../../registry/anatomy/anatomy-reference";
import referenceData from "../../registry/anatomy/data/anatomy-references.json";
import { rasterizeHumanFrame } from "../../registry/anatomy/anatomy-view";
import type { HumanFrame } from "../../registry/anatomy/anatomy-view";
import { CURL_TYPES, HAIR_FACTS, HAIR_GROUPS, faceHair, growHair } from "../../registry/anatomy/anatomy-hair";
import type { HairParams } from "../../registry/anatomy/anatomy-hair";
import { EYE_NOTES, HAIR_COLOR_PRESETS, IRIS_COLORS, MONK_SKIN_TONES, MONK_SKIN_TONE_ATTRIBUTION, SKIN_SCATTERING, SKIN_ZONES, hairColorHex, skinMeanFreePath, skinRamp, skinZoneColor } from "../../registry/anatomy/anatomy-color";
import type { SkinZone } from "../../registry/anatomy/anatomy-color";
import { rgbToHex, skinShade } from "../../registry/anatomy/anatomy-color";

const referenceUrls = import.meta.glob("../../assets/photos/anatomy-references/*.jpg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
import type { HumanCamera } from "../../registry/anatomy/anatomy-view";
import { BeautyEvidence, FacePortrait, GoldenRatioTable } from "../../registry/anatomy/face-portrait-react";
import type { EyeColour, HairStyle, PortraitOptions } from "../../registry/anatomy/face-portrait";
import { FRINGES, HAIRSTYLES, findHairStyle } from "../../registry/anatomy/hair-groom";
import { EYE_EVIDENCE, EYE_SHAPES, IRIS_TYPES, findEyeShape, findIris } from "../../registry/anatomy/eye-detail";
import { SKIN_EVIDENCE } from "../../registry/anatomy/skin-texture";
import { SkinRegionsSheet } from "../../registry/anatomy/skin-texture-react";
import type { FringeKind, Parting } from "../../registry/anatomy/hair-groom";
import { EMOTIONS } from "../../registry/anatomy/expression-facs";

const page = { display: "grid", gap: 16, padding: 24, minHeight: "100vh", background: "#f3efe8", color: "#26211d", font: "15px/1.45 system-ui, sans-serif" } as const;
const panel = { display: "grid", gap: 10, alignContent: "start", minWidth: 260, maxWidth: 340 } as const;
const label = { display: "grid", gap: 4, font: "600 13px system-ui" } as const;
const button = { border: "1px solid #a39a8c", borderRadius: 7, background: "#ffffff", color: "#26211d", padding: "7px 11px", minHeight: 36, cursor: "pointer", font: "600 13px system-ui" } as const;
const active = { ...button, background: "#26211d", color: "#ffffff", border: "1px solid #26211d" } as const;
const row = { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" } as const;
const caption = { font: "600 13px system-ui", textAlign: "center", color: "#4a413a" } as const;

function useHumanModel() {
  const [model, setModel] = useState<HumanBodyModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let live = true; loadHumanBodyModel(latticeUrl).then(m => live && setModel(m), e => live && setError(String(e))); return () => { live = false; }; }, []);
  return { model, error };
}
function Loading({ error }: { error: string | null }) {
  return <div style={page} role="status" aria-live="polite">{error ? `Could not load the body model: ${error}` : "Loading the body model…"}</div>;
}

function Figure({ model, params, pose, camera, width, height, surface = "clay", contour = true, terminator, skeleton, landmarks, grid, pixelsPerMetre, floorY }: {
  model: HumanBodyModel; params: HumanParams; pose?: HumanPose; camera?: HumanCamera; width: number; height: number; surface?: HumanSurface; contour?: boolean;
  terminator?: boolean; skeleton?: boolean; landmarks?: boolean; grid?: boolean; pixelsPerMetre?: number; floorY?: number;
}) {
  const body = useMemo(() => createHumanBody(model, params), [model, params]);
  const posed = useMemo(() => poseHumanBody(body, pose ?? {}), [body, pose]);
  const frame = useMemo(() => renderHumanFrame(body, posed.points, camera, { width, height, pixelsPerMetre, floorY, padding: 20 }), [body, posed, camera, width, height, pixelsPerMetre, floorY]);
  const m = useMemo(() => (grid ? measureHumanBody(body) : null), [body, grid]);
  return <HumanFigure frame={frame} surface={surface} contour={contour} terminator={terminator} skeleton={skeleton} landmarks={landmarks}
    headGrid={m ? { stature: m.stature, headHeight: m.headHeight } : undefined} label="Human body reference figure" />;
}

function BodyLab() {
  const { model, error } = useHumanModel();
  const [params, setParams] = useState<HumanParams>({ sex: 0.5, age: 25, muscle: 0.5, weight: 0.5, height: 0.5 });
  const [yaw, setYaw] = useState(30);
  const [pitch, setPitch] = useState(0);
  const [surface, setSurface] = useState<HumanSurface>("clay");
  const [poseId, setPoseId] = useState("relaxed");
  const [show, setShow] = useState({ contour: true, terminator: false, skeleton: false, landmarks: false, grid: true });
  const body = useMemo(() => (model ? createHumanBody(model, params) : null), [model, params]);
  const m = useMemo(() => (body ? measureHumanBody(body) : null), [body]);
  if (!model || !body || !m) return <Loading error={error} />;
  const pose = POSE_PRESETS.find(p => p.id === poseId)!.pose;
  const slider = (key: keyof HumanParams, name: string, min: number, max: number, step: number, fmt: (v: number) => string) => (
    <label style={label}>{name}: {fmt(params[key] as number)}
      <input type="range" min={min} max={max} step={step} value={params[key] as number} onChange={e => setParams(p => ({ ...p, [key]: Number(e.target.value) }))} />
    </label>
  );
  const cm = (v: number) => `${(v * 100).toFixed(1)} cm`;
  return (
    <div style={{ ...page, gridTemplateColumns: "minmax(260px, 340px) 1fr" }}>
      <div style={panel}>
        <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Body lab</h2>
        {slider("sex", "Sex (female → male)", 0, 1, 0.05, v => v.toFixed(2))}
        {slider("age", "Age (years)", 1, 90, 1, v => `${v}`)}
        {slider("muscle", "Muscle", 0, 1, 0.05, v => v.toFixed(2))}
        {slider("weight", "Weight (soft tissue)", 0, 1, 0.05, v => v.toFixed(2))}
        {slider("height", "Height for age", 0, 1, 0.05, v => v.toFixed(2))}
        <label style={label}>View yaw: {yaw}°<input type="range" min={-180} max={180} step={5} value={yaw} onChange={e => setYaw(Number(e.target.value))} /></label>
        <label style={label}>View pitch: {pitch}°<input type="range" min={-40} max={40} step={5} value={pitch} onChange={e => setPitch(Number(e.target.value))} /></label>
        <div style={row}>{(["clay", "tonal", "silhouette", "none"] as const).map(s => <button key={s} type="button" style={surface === s ? active : button} aria-pressed={surface === s} onClick={() => setSurface(s)}>{s}</button>)}</div>
        <div style={row}>{(Object.keys(show) as (keyof typeof show)[]).map(k => <button key={k} type="button" style={show[k] ? active : button} aria-pressed={show[k]} onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))}>{k}</button>)}</div>
        <label style={label}>Pose<select value={poseId} onChange={e => setPoseId(e.target.value)} style={{ minHeight: 36 }}>{POSE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <dl style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "2px 12px", margin: 0, font: "13px/1.5 system-ui" }}>
          <dt>Stature</dt><dd style={{ margin: 0 }}>{cm(m.stature)}</dd>
          <dt>Heads tall</dt><dd style={{ margin: 0 }}>{m.headsTall.toFixed(2)}</dd>
          <dt>Crotch height</dt><dd style={{ margin: 0 }}>{cm(m.crotchHeight)} ({(m.crotchHeight / m.stature * 100).toFixed(1)}%)</dd>
          <dt>Shoulders (bony)</dt><dd style={{ margin: 0 }}>{cm(m.biacromialBreadth)}</dd>
          <dt>Hips</dt><dd style={{ margin: 0 }}>{cm(m.hipBreadth)}</dd>
          <dt>Chest / waist girth</dt><dd style={{ margin: 0 }}>{cm(m.chestCircumference)} / {cm(m.waistCircumference)}</dd>
          <dt>Est. mass · BMI</dt><dd style={{ margin: 0 }}>{m.massKg.toFixed(0)} kg · {m.bmi.toFixed(1)}</dd>
        </dl>
        <p style={{ margin: 0, font: "13px/1.45 system-ui", color: "#5a5048" }}>{POSE_PRESETS.find(p => p.id === poseId)!.note}</p>
      </div>
      <Figure model={model} params={params} pose={pose} camera={{ yaw, pitch }} width={640} height={900} surface={surface} {...show} />
    </div>
  );
}

function Population() {
  const { model, error } = useHumanModel();
  if (!model) return <Loading error={error} />;
  const ppm = 210, h = 1.95 * ppm + 30;
  return (
    <div style={page}>
      <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Population line-up — one scale, head-unit grid per figure</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {HUMAN_PRESETS.map(p => (
          <figure key={p.id} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 4 }}>
            <Figure model={model} params={p.params} pose={POSE_PRESETS[1].pose} camera={{ yaw: 20 }} width={150} height={h} pixelsPerMetre={ppm} floorY={h - 12} grid />
            <figcaption style={caption}>{p.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Turnaround() {
  const { model, error } = useHumanModel();
  const [sex, setSex] = useState(0);
  if (!model) return <Loading error={error} />;
  const ppm = 230, h = 1.9 * ppm + 30;
  return (
    <div style={page}>
      <div style={row}>
        <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Turnaround</h2>
        {[["Female", 0], ["Male", 1]].map(([n, v]) => <button key={n} type="button" style={sex === v ? active : button} aria-pressed={sex === v} onClick={() => setSex(v as number)}>{n}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map(y => (
          <figure key={y} style={{ margin: 0, display: "grid", justifyItems: "center" }}>
            <Figure model={model} params={{ sex, age: 25 }} pose={POSE_PRESETS[0].pose} camera={{ yaw: y }} width={170} height={h} pixelsPerMetre={ppm} floorY={h - 12} surface="tonal" terminator grid />
            <figcaption style={caption}>{y}°</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Poses() {
  const { model, error } = useHumanModel();
  const [sex, setSex] = useState(1);
  const [yaw, setYaw] = useState(35);
  if (!model) return <Loading error={error} />;
  return (
    <div style={page}>
      <div style={row}>
        <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Pose library — clamped to measured joint ranges</h2>
        {[["Female", 0], ["Male", 1]].map(([n, v]) => <button key={n} type="button" style={sex === v ? active : button} aria-pressed={sex === v} onClick={() => setSex(v as number)}>{n}</button>)}
        {[["Front", 0], ["Three-quarter", 35], ["Side", 90], ["Back", 180]].map(([n, v]) => <button key={n} type="button" style={yaw === v ? active : button} aria-pressed={yaw === v} onClick={() => setYaw(v as number)}>{n}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {POSE_PRESETS.map(p => (
          <figure key={p.id} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 4 }}>
            <Figure model={model} params={{ sex, age: 28 }} pose={p.pose} camera={{ yaw, pitch: 5 }} width={230} height={340} surface="clay" />
            <figcaption style={caption}>{p.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function PosesAt({ yaw }: { yaw: number }) {
  const { model, error } = useHumanModel();
  if (!model) return <Loading error={error} />;
  return (
    <div style={{ ...page, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
      {POSE_PRESETS.map(p => (
        <figure key={p.id} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 4 }}>
          <Figure model={model} params={{ sex: 1, age: 28 }} pose={p.pose} camera={{ yaw }} width={200} height={300} surface="clay" skeleton />
          <figcaption style={caption}>{p.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}


const FACE_KEYS: [FaceMeasureKey, string][] = [["enEn", "Eye spacing (en–en)"], ["exEn", "Eye width (ex–en)"], ["alAl", "Nose width (al–al)"], ["nSn", "Nose height (n–sn)"], ["snGn", "Lower face (sn–gn)"], ["chCh", "Mouth width (ch–ch)"], ["exEx", "Outer eye corners (ex–ex)"], ["zyZy", "Face width at zygion"]];

function FaceView({ params, yaw, pitch, size, guides = true, features = true, surface = "clay" }: { params: FaceParams; yaw: number; pitch: number; size: number; guides?: boolean; features?: boolean; surface?: HumanSurface }) {
  const face = useMemo(() => createFace(params), [params]);
  const frame = useMemo(() => renderMeshFrame(face.mesh, { yaw, pitch, target: [0, 0.0, 0.03] }, { width: size, height: size * 1.15, pixelsPerMetre: size * 4.6, centerOnTarget: true }), [face, yaw, pitch, size]);
  const lines = useMemo(() => (features ? faceFeatureLines(frame).filter(l => l.id !== "nose-bridge" && l.id !== "oval" && !l.id.startsWith("brow")) : []), [frame, features]);
  const hairStrokes = useMemo(() => (features ? faceHair(face.vertices, FACE_FEATURES).map(h => ({ kind: h.kind, pts: h.points.map(q => projectPoint(frame, [q[0] / 1000, q[1] / 1000, q[2] / 1000])), facing: frame.vertexFacing[FACE_LANDMARKS[h.side === "L" ? "brow-mid.L" : "brow-mid.R"]] > 0.08 })) : []), [face, frame, features]);
  const L = (k: keyof typeof FACE_LANDMARKS) => frame.landmarks[k];
  // irises on a 12 mm eyeball, clipped by the lid opening so the upper lid overlaps them as in life
  const eyes = useMemo(() => {
    const c = eyeCentres(face.vertices);
    return (["R", "L"] as const).map(side => {
      const e = c[side], ring = (r: number) => Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return projectPoint(frame, [(e[0] + Math.cos(a) * r) / 1000, (e[1] + Math.sin(a) * r) / 1000, (e[2] - 0.6) / 1000]); });
      const up = FACE_FEATURES[`eye-upper.${side}`].loop, lo = FACE_FEATURES[`eye-lower.${side}`].loop;
      const lid = [...up, ...[...lo].reverse()].map(i => [frame.screen[i * 3], frame.screen[i * 3 + 1]] as [number, number]);
      const facing = frame.vertexFacing[FACE_LANDMARKS[`palpebrale-superius.${side}`]] > 0.05;
      return { side, iris: ring(IRIS_DIAMETER_MM / 2), pupil: ring(1.9), lid, facing };
    });
  }, [face, frame]);
  const poly = (pts: readonly (readonly number[])[]) => pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("") + "Z";
  const clipBase = useMemo(() => `eye-${Math.random().toString(36).slice(2)}`, []);
  const hz = ["glabella", "sellion", "subnasale", "stomion", "menton"] as const;
  const vt = ["exocanthion.R", "endocanthion.R", "endocanthion.L", "exocanthion.L", "alare.R", "alare.L", "cheilion.R", "cheilion.L"] as const;
  return (
    <div style={{ position: "relative", width: size, height: size * 1.15 }}>
      <HumanFigure frame={frame} surface={surface} contour lineWidth={1.4} label="Face study" />
      <svg width={size} height={size * 1.15} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
        <defs>{eyes.map(e => <clipPath key={e.side} id={`${clipBase}-${e.side}`}><path d={poly(e.lid)} /></clipPath>)}</defs>
        {eyes.filter(e => e.facing).map(e => (
          <g key={e.side} clipPath={`url(#${clipBase}-${e.side})`}>
            <path d={poly(e.lid)} fill="#f1ece4" />
            <path d={poly(e.iris)} fill="#6d5a48" stroke="#2a211d" strokeWidth={0.8} />
            <path d={poly(e.pupil)} fill="#1b1512" />
            <path d={poly(e.lid)} fill="none" stroke="#2a211d" strokeWidth={4} opacity={0.18} />
          </g>
        ))}
        {hairStrokes.filter(h => h.facing).map((h, i) => <path key={`h${i}`} d={smoothPath(h.pts.map(q => [q[0], q[1]] as [number, number]))} fill="none" stroke={h.kind === "brow" ? "#3b2a1e" : "#1d1611"} strokeWidth={h.kind === "brow" ? Math.max(0.6, size / 520) : Math.max(0.5, size / 640)} strokeLinecap="round" opacity={h.kind === "brow" ? 0.75 : 0.9} />)}
        {lines.map((l, i) => <path key={i} d={smoothPath(l.points)} fill="none" stroke="#2a211d" strokeWidth={l.id.startsWith("brow") ? 2.4 : 1.3} strokeLinecap="round" opacity={0.9} />)}
        {guides && yaw === 0 && hz.map(k => <line key={k} x1={0} x2={size} y1={L(k)[1]} y2={L(k)[1]} stroke="#c2413a" strokeWidth={0.8} strokeDasharray="4 4" opacity={0.7} />)}
        {guides && yaw === 0 && vt.map(k => <line key={k} y1={0} y2={size * 1.15} x1={L(k)[0]} x2={L(k)[0]} stroke="#2f6f8f" strokeWidth={0.8} strokeDasharray="2 4" opacity={0.7} />)}
      </svg>
    </div>
  );
}

function FaceLab() {
  const [p, setP] = useState<FaceParams>({ norm: "north-american-white", sex: 0.5, eyeSpacing: 0, eyeWidth: 0, noseWidth: 0, noseLength: 0, lowerFace: 0, faceWidth: 1, mouthWidth: 1 });
  const [yaw, setYaw] = useState(0); const [pitch, setPitch] = useState(0);
  const m = useMemo(() => measureFace(createFace(p).vertices), [p]);
  const norm = FACE_NORMS[p.norm ?? "north-american-white"];
  const z = (key: keyof FaceParams, name: string, min = -2.5, max = 2.5, step = 0.1, unit = "SD") => (
    <label style={label}>{name}: {(p[key] as number).toFixed(unit === "SD" ? 1 : 2)} {unit}
      <input type="range" min={min} max={max} step={step} value={p[key] as number} onChange={e => setP(q => ({ ...q, [key]: Number(e.target.value) }))} /></label>
  );
  return (
    <div style={{ ...page, gridTemplateColumns: "minmax(260px, 340px) auto 1fr" }}>
      <div style={panel}>
        <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Face lab</h2>
        <label style={label}>Norm<select value={p.norm} onChange={e => setP(q => ({ ...q, norm: e.target.value as FaceParams["norm"] }))} style={{ minHeight: 36 }}>
          {Object.entries(FACE_NORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        {z("sex", "Sex (female → male)", 0, 1, 0.05, "")}
        {z("eyeSpacing", "Eye spacing")}{z("eyeWidth", "Eye width")}{z("noseWidth", "Nose width")}{z("noseLength", "Nose height")}{z("lowerFace", "Lower face height")}
        {z("faceWidth", "Face width ×", 0.88, 1.12, 0.01, "")}{z("mouthWidth", "Mouth width ×", 0.85, 1.15, 0.01, "")}
        <label style={label}>Yaw: {yaw}°<input type="range" min={-90} max={90} step={5} value={yaw} onChange={e => setYaw(Number(e.target.value))} /></label>
        <label style={label}>Pitch: {pitch}°<input type="range" min={-40} max={40} step={5} value={pitch} onChange={e => setPitch(Number(e.target.value))} /></label>
        <p style={{ margin: 0, font: "12px/1.45 system-ui", color: "#5a5048" }}>{norm.source}. Guides (front view): red = horizontal thirds (glabella, nasal root, nose base, mouth, chin); blue = eye corners, nose wings, mouth corners.</p>
      </div>
      <FaceView params={p} yaw={yaw} pitch={pitch} size={520} />
      <table style={{ alignSelf: "start", borderCollapse: "collapse", font: "13px/1.5 system-ui" }}>
        <caption style={{ textAlign: "left", font: "700 14px system-ui", paddingBottom: 6 }}>Measured on the study vs. {norm.label}</caption>
        <thead><tr>{["Measure", "Study mm", "Norm mean ± SD", "z"].map(h => <th key={h} style={{ textAlign: "left", padding: "3px 8px", borderBottom: "1px solid #b8ab9c" }}>{h}</th>)}</tr></thead>
        <tbody>{FACE_KEYS.map(([k, name]) => {
          const f = norm.female[k], mm = norm.male[k], s = p.sex ?? 0.5;
          const nmv = f && mm ? [f[0] + (mm[0] - f[0]) * s, f[1] + (mm[1] - f[1]) * s] : null;
          return <tr key={k}><td style={{ padding: "3px 8px" }}>{name}</td><td style={{ padding: "3px 8px" }}>{m[k].toFixed(1)}</td>
            <td style={{ padding: "3px 8px" }}>{nmv ? `${nmv[0].toFixed(1)} ± ${nmv[1].toFixed(1)}` : "— (no norm cited)"}</td>
            <td style={{ padding: "3px 8px" }}>{nmv ? ((m[k] - nmv[0]) / nmv[1]).toFixed(1) : ""}</td></tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function FaceAngles() {
  const yaws = [-90, -60, -30, 0, 30, 60, 90], pitches = [25, 0, -25];
  return (
    <div style={page}>
      <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Head angles — the same face from 21 views (tonal value study + feature lines)</h2>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${yaws.length}, 170px)`, gap: 6, overflowX: "auto" }}>
        {pitches.flatMap(pt => yaws.map(y => (
          <figure key={`${pt}/${y}`} style={{ margin: 0, display: "grid", justifyItems: "center" }}>
            <FaceView params={{ sex: 0.5 }} yaw={y} pitch={pt} size={170} guides={false} surface="tonal" />
            <figcaption style={caption}>yaw {y}° · pitch {pt}°</figcaption>
          </figure>
        )))}
      </div>
    </div>
  );
}

function RangeOfMotion() {
  const { model, error } = useHumanModel();
  const sided = JOINTS.filter(j => !j.id.startsWith("finger") && !j.id.startsWith("thumb") && j.id !== "jaw" && j.id !== "eyes");
  const [jointId, setJointId] = useState("shoulder");
  const def = JOINTS.find(j => j.id === jointId)!;
  const dofs = Object.keys(def.dofs) as (keyof typeof def.dofs)[];
  const [dof, setDof] = useState<string>("flex");
  const d = def.dofs[dof as keyof typeof def.dofs] ?? def.dofs[dofs[0]]!;
  const dk = def.dofs[dof as keyof typeof def.dofs] ? dof : dofs[0];
  if (!model) return <Loading error={error} />;
  const key = def.sided ? `${def.id}.L` : def.id;
  const yaw = dk === "abduct" ? 0 : dk === "twist" ? 30 : 90;
  return (
    <div style={page}>
      <div style={row}>
        <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Range of motion</h2>
        <label style={{ ...label, gridAutoFlow: "column", alignItems: "center" }}>Joint <select value={jointId} onChange={e => { setJointId(e.target.value); setDof("flex"); }} style={{ minHeight: 36 }}>{sided.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}</select></label>
        {dofs.map(k => <button key={k} type="button" style={dk === k ? active : button} aria-pressed={dk === k} onClick={() => setDof(k)}>{def.dofs[k]!.names[1]}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {[[d.min, d.names[0] + " limit"], [0, "neutral"], [(d.min + d.max) / 2, "mid-range"], [d.max, d.names[1] + " limit"]].map(([v, n]) => (
          <figure key={String(n)} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 4 }}>
            <Figure model={model} params={{ sex: 0.5, age: 30 }} pose={{ [key]: { [dk]: v as number } }} camera={{ yaw: def.sided ? yaw : yaw }} width={240} height={360} surface="clay" skeleton />
            <figcaption style={caption}>{String(n)}: {Math.round(v as number)}°</figcaption>
          </figure>
        ))}
      </div>
      <p style={{ margin: 0, font: "13px/1.5 system-ui", maxWidth: 900 }}><strong>Source {d.source}:</strong> {ROM_SOURCES[d.source]}</p>
    </div>
  );
}


/** Pen-and-ink painter built only from the frame: hatching clipped to the shadow side, contours on top. */
function InkHatch({ frame }: { frame: HumanFrame }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    cv.width = frame.width * 2; cv.height = frame.height * 2;
    const ctx = cv.getContext("2d")!; ctx.clearRect(0, 0, cv.width, cv.height);
    const mask = rasterizeHumanFrame(frame, "tonal", { light: [255, 255, 255], shadow: [0, 0, 0], eye: [255, 255, 255] }, 2);
    // shadow mask: dark values become opaque
    const m = new Uint8ClampedArray(mask.data.length);
    for (let i = 0; i < m.length; i += 4) { const v = mask.data[i]; m[i + 3] = mask.data[i + 3] && v < 150 ? (v < 60 ? 255 : 150) : 0; }
    const mc = document.createElement("canvas"); mc.width = cv.width; mc.height = cv.height; mc.getContext("2d")!.putImageData(new ImageData(m, cv.width, cv.height), 0, 0);
    ctx.strokeStyle = "#1f1a17"; ctx.lineWidth = 1.3;
    for (let x = -cv.height; x < cv.width; x += 7) { ctx.beginPath(); ctx.moveTo(x, cv.height); ctx.lineTo(x + cv.height * 0.9, 0); ctx.stroke(); }
    ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(mc, 0, 0); ctx.globalCompositeOperation = "source-over";
  }, [frame]);
  return (
    <div style={{ position: "relative", width: frame.width, height: frame.height, background: "#fbf8f2" }}>
      <canvas ref={ref} style={{ position: "absolute", inset: 0, width: frame.width, height: frame.height }} aria-hidden="true" />
      <HumanFigure frame={frame} surface="none" contour lineWidth={1.8} palette={{ ink: "#1f1a17" }} label="Pen and ink rendering" style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

function AnyStyle() {
  const { model, error } = useHumanModel();
  const body = useMemo(() => (model ? createHumanBody(model, { sex: 0.15, age: 30 }) : null), [model]);
  const frame = useMemo(() => {
    if (!body) return null;
    const posed = poseHumanBody(body, POSE_PRESETS.find(p => p.id === "contrapposto")!.pose);
    return renderHumanFrame(body, posed.points, { yaw: 28, pitch: 4, distance: 6 }, { width: 250, height: 420, padding: 14 });
  }, [body]);
  if (!body || !frame) return <Loading error={error} />;
  const m = measureHumanBody(body);
  const cells: [string, ReactNode][] = [
    ["Clay reference", <HumanFigure frame={frame} surface="clay" contour label="Clay reference" />],
    ["Value study (5 bands + terminator)", <HumanFigure frame={frame} surface="tonal" terminator contour={false} label="Value study" />],
    ["Cel / flat colour (2 values)", <HumanFigure frame={frame} surface="cel" lineWidth={2} palette={{ light: "#efc9a8", shadow: "#a8705a", ink: "#3a2018" }} label="Cel shading" />],
    ["Pen and ink (hatching from the frame)", <InkHatch frame={frame} />],
    ["Silhouette (notan)", <HumanFigure frame={frame} surface="silhouette" contour={false} palette={{ shadow: "#26211d" }} label="Silhouette" />],
    ["Construction (skeleton, landmarks, head grid)", <HumanFigure frame={frame} surface="none" contour skeleton landmarks headGrid={{ stature: m.stature, headHeight: m.headHeight }} lineWidth={1} label="Construction drawing" />],
  ];
  return (
    <div style={page}>
      <h2 style={{ margin: 0, font: "700 20px system-ui" }}>One frame, any style — painters read the same HumanFrame</h2>
      <p style={{ margin: 0, maxWidth: 880 }}>The frame fixes where the forms, contours, terminator and landmarks are (perspective camera at 6 m). A painter only decides the medium; pencil, collage, riso or paint packs consume the same data.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {cells.map(([name, node]) => <figure key={name} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 6 }}>{node}<figcaption style={caption}>{name}</figcaption></figure>)}
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #b8ab9c", font: "700 12px system-ui" } as const;
const td = { padding: "3px 8px", borderBottom: "1px solid #e2d9cd", font: "13px/1.45 system-ui", verticalAlign: "top" } as const;
const ANSUR_ROWS = ["stature", "acromialheight", "waistheightomphalion", "crotchheight", "kneeheightmidpatella", "biacromialbreadth", "bideltoidbreadth", "chestcircumference", "waistcircumference", "hipbreadth",
  "acromionradialelength", "radialestylionlength", "handlength", "footlength", "span", "headlength", "headbreadth", "bizygomaticbreadth", "mentonsellionlength", "interpupillarybreadth", "earlength"];

function Proportions() {
  const byAge = MODEL_TABLES.byAge as Record<"female" | "male", { age: number; stature: number; headsTall: number; eyeLineInHead: number; crotchRatio: number }[]>;
  return (
    <div style={{ ...page, maxWidth: 1180 }}>
      <h2 style={{ margin: 0, font: "700 22px system-ui" }}>Proportions and ranges</h2>
      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0, font: "700 17px system-ui" }}>Measured adults — ANSUR II (mm; p5 / p50 / p95; share of stature at p50)</h3>
        <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", minWidth: 760 }}>
          <thead><tr><th style={th}>Measure</th><th style={th}>Women</th><th style={th}>Men</th><th style={th}>Women ÷ stature</th><th style={th}>Men ÷ stature</th></tr></thead>
          <tbody>{ANSUR_ROWS.map(k => { const f = ANSUR.female.measurements[k], mm = ANSUR.male.measurements[k]; return (
            <tr key={k}><td style={td}><strong>{k}</strong><br /><span style={{ color: "#6a6058" }}>{f.description}</span></td>
              <td style={td}>{f.p5} / <strong>{f.p50}</strong> / {f.p95}</td><td style={td}>{mm.p5} / <strong>{mm.p50}</strong> / {mm.p95}</td>
              <td style={td}>{f.ratioToStature ? f.ratioToStature.p50.toFixed(3) : "—"}</td><td style={td}>{mm.ratioToStature ? mm.ratioToStature.p50.toFixed(3) : "—"}</td></tr>); })}</tbody>
        </table></div>
        <p style={{ margin: 0, font: "12px/1.45 system-ui", color: "#5a5048" }}>U.S. Army 2012 survey (women n = {ANSUR.female.n}, men n = {ANSUR.male.n}); fitter and younger than the general population.</p>
      </section>
      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0, font: "700 17px system-ui" }}>Growth and heads tall by age</h3>
        <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", minWidth: 760 }}>
          <thead><tr>{["Age", "CDC stature p5–p95 (girls)", "CDC stature p5–p95 (boys)", "Heads tall F / M (model)", "Eye line in head (model)", "Crotch ÷ stature (model)"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{byAge.female.filter(r => r.age <= 25 || r.age % 20 === 5).map((r, i) => { const mrow = byAge.male.find(x => x.age === r.age)!; const a = Math.min(20, r.age); return (
            <tr key={i}><td style={td}>{r.age}</td>
              <td style={td}>{Math.round(statureForAge("female", a, 0.05) / 10)}–{Math.round(statureForAge("female", a, 0.95) / 10)} cm</td>
              <td style={td}>{Math.round(statureForAge("male", a, 0.05) / 10)}–{Math.round(statureForAge("male", a, 0.95) / 10)} cm</td>
              <td style={td}>{r.headsTall.toFixed(2)} / {mrow.headsTall.toFixed(2)}</td><td style={td}>{r.eyeLineInHead.toFixed(2)} / {mrow.eyeLineInHead.toFixed(2)}</td><td style={td}>{r.crotchRatio.toFixed(3)} / {mrow.crotchRatio.toFixed(3)}</td></tr>); })}</tbody>
        </table></div>
      </section>
      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0, font: "700 17px system-ui" }}>Drawing canons tested against data</h3>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>{CANON_CHECKS.map(c => <li key={c.canon}><strong>{c.canon}</strong> — {c.finding} <span style={{ color: "#6a6058" }}>({c.grade}) {c.data}</span></li>)}</ul>
      </section>
      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0, font: "700 17px system-ui" }}>Surface forms that make a body read as real</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
          {SURFACE_FORMS.map(f => <div key={f.id} style={{ border: "1px solid #d8cdbf", borderRadius: 8, padding: 10, background: "#fbf8f3" }}>
            <strong>{f.id.replace(/-/g, " ")}</strong> <span style={{ color: "#6a6058" }}>· {f.region} · {f.kind}</span>
            <p style={{ margin: "4px 0 0", font: "13px/1.45 system-ui" }}>{f.where} <em>{f.shows}</em> {f.draw}</p></div>)}
        </div>
      </section>
      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0, font: "700 17px system-ui" }}>Age changes</h3>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>{AGE_CHANGES.map(a => <li key={a.age}><strong>{a.age}</strong> ({a.grade}) — {a.changes}</li>)}</ul>
      </section>
      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0, font: "700 17px system-ui" }}>Recipe: a realistic person in any style</h3>
        <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 6 }}>{DRAWING_RECIPE.map(r => <li key={r}>{r}</li>)}</ol>
      </section>
    </div>
  );
}

function ReferenceBoard() {
  const refs = referenceData.references;
  const [region, setRegion] = useState("all");
  const regions = ["all", ...Array.from(new Set(refs.map(r => r.region)))];
  return (
    <div style={page}>
      <div style={row}><h2 style={{ margin: 0, font: "700 20px system-ui" }}>Reference board — public-domain anatomy</h2>
        {regions.map(r => <button key={r} type="button" style={region === r ? active : button} aria-pressed={region === r} onClick={() => setRegion(r)}>{r}</button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {refs.filter(r => region === "all" || r.region === region).map(r => {
          const url = referenceUrls[`../../${r.file}`];
          return (
            <figure key={r.id} style={{ margin: 0, display: "grid", gap: 6, alignContent: "start", border: "1px solid #d8cdbf", borderRadius: 8, padding: 10, background: "#fbf8f3" }}>
              <img src={url} alt={r.title} loading="lazy" style={{ width: "100%", height: 260, objectFit: "contain", background: "#fff", borderRadius: 4 }} />
              <figcaption style={{ display: "grid", gap: 4, font: "13px/1.45 system-ui" }}>
                <strong>{r.title}</strong>
                <ul style={{ margin: 0, paddingLeft: 18 }}>{r.study.map(s => <li key={s}>{s}</li>)}</ul>
                <span style={{ color: "#6a6058" }}>{r.source.licence} · <a href={r.source.page} target="_blank" rel="noreferrer">Wikimedia Commons</a></span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}


type HairColorChoice = { eumelanin: number; pheomelanin: number; grey?: number };
function HeadWithHair({ model, params, hair, color, yaw, pitch = 4, size, surface = "clay", skin }: { model: HumanBodyModel; params: HumanParams; hair: HairParams; color: HairColorChoice; yaw: number; pitch?: number; size: number; surface?: HumanSurface; skin?: string }) {
  const body = useMemo(() => createHumanBody(model, params), [model, params]);
  const posed = useMemo(() => poseHumanBody(body, POSE_PRESETS[1].pose), [body]);
  const strands = useMemo(() => growHair(body, posed.points, hair), [body, posed, hair]);
  const frame = useMemo(() => {
    const p = posed.points, lm = body.model.header.landmarks;
    const v = lm.vertex, m = lm.menton;
    const top = p[v * 3 + 1] + 0.03, chin = p[m * 3 + 1];
    const drop = Math.min(0.42, Math.max(0.1, (hair.length ?? 0.12) * 0.8));
    const bottom = Math.min(chin - 0.06, top - 0.26 - drop * 0.6);
    const target: [number, number, number] = [0, (top + bottom) / 2, (p[v * 3 + 2] + p[m * 3 + 2]) / 2];
    return renderHumanFrame(body, posed.points, { yaw, pitch, target }, { width: size, height: size * 1.2, pixelsPerMetre: (size * 1.2) / (top - bottom + 0.04), centerOnTarget: true });
  }, [body, posed, yaw, pitch, size, hair.length]);
  return <HumanFigure frame={frame} surface={surface} hair={strands} hairColor={color} palette={skin ? { light: skin, shadow: rgbToHex(skinShade(skin, -0.35)) } : undefined} label="Head with grown hair" />;
}

function BodyHairLab() {
  const { model, error } = useHumanModel();
  const [hair, setHair] = useState<HairParams>({ length: 0.22, curl: 1, strands: 2200, parting: "left", flow: "natural", recession: 0, clump: 0.45, frizz: 0.15, seed: 1 });
  const [color, setColor] = useState<HairColorChoice>({ eumelanin: 1.3, pheomelanin: 0, grey: 0 });
  const [sex, setSex] = useState(0.2); const [yaw, setYaw] = useState(25);
  if (!model) return <Loading error={error} />;
  const num = (k: keyof HairParams, name: string, min: number, max: number, step: number, fmt = (v: number) => v.toFixed(2)) => (
    <label style={label}>{name}: {fmt(hair[k] as number)}<input type="range" min={min} max={max} step={step} value={hair[k] as number} onChange={e => setHair(h => ({ ...h, [k]: Number(e.target.value) }))} /></label>);
  return (
    <div style={{ ...page, gridTemplateColumns: "minmax(260px, 340px) 1fr" }}>
      <div style={panel}>
        <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Hair on the posable body</h2>
        <p style={{ ...muted, maxWidth: 300 }}>The quick drawing hair on the posable 3D body. The groomed, rendered hair (styles, bangs, up to 120,000 strands) is in the Hair lab.</p>
        {num("length", "Length (m)", 0.01, 0.6, 0.01)}
        <label style={label}>Curl type: {CURL_TYPES[(hair.curl ?? 1) - 1].label}<input type="range" min={1} max={8} step={1} value={hair.curl} onChange={e => setHair(h => ({ ...h, curl: Number(e.target.value) }))} /></label>
        {num("strands", "Strands drawn", 300, 5000, 100, v => String(v))}
        {num("clump", "Clumping", 0, 1, 0.05)}{num("frizz", "Frizz", 0, 1, 0.05)}{num("recession", "Hairline recession", 0, 1, 0.05)}
        <div style={row}>{(["none", "left", "center", "right"] as const).map(v => <button key={v} type="button" style={hair.parting === v ? active : button} aria-pressed={hair.parting === v} onClick={() => setHair(h => ({ ...h, parting: v }))}>part {v}</button>)}</div>
        <button type="button" style={hair.fringe ? active : button} aria-pressed={!!hair.fringe} onClick={() => setHair(h => ({ ...h, fringe: !h.fringe }))}>fringe (bangs)</button>
        <div style={row}>{(["natural", "down", "back", "forward"] as const).map(v => <button key={v} type="button" style={hair.flow === v ? active : button} aria-pressed={hair.flow === v} onClick={() => setHair(h => ({ ...h, flow: v }))}>{v}</button>)}</div>
        <label style={label}>Colour<select value={HAIR_COLOR_PRESETS.find(c => c.eumelanin === color.eumelanin && c.pheomelanin === color.pheomelanin)?.id ?? "brown"} onChange={e => { const c = HAIR_COLOR_PRESETS.find(x => x.id === e.target.value)!; setColor(q => ({ ...q, eumelanin: c.eumelanin, pheomelanin: c.pheomelanin })); }} style={{ minHeight: 36 }}>
          {HAIR_COLOR_PRESETS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label style={label}>Grey strands: {Math.round((color.grey ?? 0) * 100)}%<input type="range" min={0} max={1} step={0.05} value={color.grey ?? 0} onChange={e => setColor(q => ({ ...q, grey: Number(e.target.value) }))} /></label>
        <label style={label}>Sex (female → male): {sex.toFixed(2)}<input type="range" min={0} max={1} step={0.05} value={sex} onChange={e => setSex(Number(e.target.value))} /></label>
        <label style={label}>View yaw: {yaw}°<input type="range" min={-180} max={180} step={5} value={yaw} onChange={e => setYaw(Number(e.target.value))} /></label>
      </div>
      <HeadWithHair model={model} params={{ sex, age: 28 }} hair={hair} color={color} yaw={yaw} size={560} />
    </div>
  );
}

function HairTypes() {
  const { model, error } = useHumanModel();
  if (!model) return <Loading error={error} />;
  return (
    <div style={page}>
      <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Curl types I–VIII (same length before shrinkage), and hair colour from melanin</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {CURL_TYPES.map((c, i) => (
          <figure key={c.id} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 4 }}>
            <HeadWithHair model={model} params={{ sex: 0.3, age: 28 }} hair={{ length: 0.26, curl: c.id, strands: 1800, parting: "none", seed: 3 }} color={HAIR_COLOR_PRESETS[[0, 1, 2, 4, 9, 8, 1, 0][i]]} yaw={30} size={230} />
            <figcaption style={caption}>{c.label} · {HAIR_COLOR_PRESETS[[0, 1, 2, 4, 9, 8, 1, 0][i]].label}</figcaption>
          </figure>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
        {HAIR_COLOR_PRESETS.map(c => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 8, alignItems: "center", font: "13px/1.35 system-ui" }}>
            <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 6, background: `linear-gradient(160deg, ${hairColorHex(c.eumelanin * 0.55, c.pheomelanin * 0.55)}, ${hairColorHex(c.eumelanin, c.pheomelanin)} 55%, ${hairColorHex(c.eumelanin * 1.8, c.pheomelanin * 1.3)})` }} />
            <span><strong>{c.label}</strong><br />eu {c.eumelanin} · pheo {c.pheomelanin} ({c.grade})</span>
          </div>
        ))}
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4, font: "13px/1.5 system-ui", maxWidth: 1000 }}>
        {HAIR_FACTS.map(f => <li key={f.fact}>{f.fact} <span style={{ color: "#6a6058" }}>({f.grade})</span></li>)}
        {Object.entries(HAIR_GROUPS).map(([k, g]) => <li key={k}><strong>{k}</strong>: density {g.densityPerCm2[0]} ± {g.densityPerCm2[1]} /cm², growth {g.growthUmPerDay[0]} ± {g.growthUmPerDay[1]} µm/day, ≈ {g.equivalentDiameterUm} µm thick, ellipticity {g.ellipticity}. {g.shape} <span style={{ color: "#6a6058" }}>(M, secondary)</span></li>)}
      </ul>
    </div>
  );
}

function SkinAndColour() {
  const { model, error } = useHumanModel();
  const [tone, setTone] = useState(4);
  if (!model) return <Loading error={error} />;
  const t = MONK_SKIN_TONES[tone];
  const zones = Object.keys(SKIN_ZONES) as SkinZone[];
  const mfp = skinMeanFreePath(SKIN_SCATTERING.skin1);
  return (
    <div style={page}>
      <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Skin, hair and eye colour</h2>
      <div style={row}>
        {MONK_SKIN_TONES.map((m, i) => (
          <button key={m.id} type="button" onClick={() => setTone(i)} aria-pressed={tone === i} aria-label={`Monk tone ${i + 1}`}
            style={{ width: 56, height: 56, borderRadius: 8, border: tone === i ? "3px solid #26211d" : "1px solid #b8ab9c", background: m.hex, cursor: "pointer" }} />
        ))}
      </div>
      <p style={{ margin: 0, font: "13px/1.5 system-ui" }}><strong>Monk tone {tone + 1}</strong> {t.hex} · L* {t.lab[0].toFixed(1)} a* {t.lab[1].toFixed(1)} b* {t.lab[2].toFixed(1)} · ITA {t.ita.toFixed(1)}° ({t.category}). <span style={{ color: "#6a6058" }}>{MONK_SKIN_TONE_ATTRIBUTION}</span></p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, alignItems: "start" }}>
        <figure style={{ margin: 0, display: "grid", gap: 6 }}>
          <HeadWithHair model={model} params={{ sex: 0.3, age: 30 }} hair={{ length: 0.18, curl: tone > 6 ? 6 : 2, strands: 1600, parting: "right" }} color={tone > 5 ? { eumelanin: 8, pheomelanin: 0, grey: 0 } : { eumelanin: 1.3, pheomelanin: 0.1, grey: 0 }} yaw={25} size={260} skin={t.hex} />
          <figcaption style={caption}>Clay body in the chosen tone</figcaption>
        </figure>
        <div style={{ display: "grid", gap: 8 }}>
          <strong>Shade ramp (shadow → light) with subsurface red at the terminator</strong>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 46 }}>{skinRamp(t.hex, 9).map((c, i) => <span key={i} style={{ flex: 1, background: c }} />)}</div>
          <strong>Regional shifts</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
            {zones.map(z => <div key={z} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 6, alignItems: "center", font: "12px/1.35 system-ui" }}>
              <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 6, background: skinZoneColor(t.hex, z), border: "1px solid #0002" }} /><span><strong>{z}</strong> <span style={{ color: "#6a6058" }}>({SKIN_ZONES[z].grade})</span></span></div>)}
          </div>
        </div>
        <div style={{ display: "grid", gap: 8, font: "13px/1.5 system-ui" }}>
          <strong>Measured skin optics (Jensen et al. 2001)</strong>
          <span>skin1 diffuse reflectance R {SKIN_SCATTERING.skin1.diffuse.join(" / ")} · mean free path (mm) R {mfp[0].toFixed(2)} G {mfp[1].toFixed(2)} B {mfp[2].toFixed(2)} — red light travels furthest under the skin, so shadow edges, ears and nostrils glow red against back light.</span>
          <strong>Iris palette and eye notes</strong>
          <div style={row}>{IRIS_COLORS.map(c => <span key={c.id} title={c.label} aria-label={c.label} role="img" style={{ width: 38, height: 38, borderRadius: "50%", background: `radial-gradient(circle, #120c08 0 22%, ${c.inner} 24% 48%, ${c.outer} 70%, ${c.limbal} 92%)` }} />)}</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{EYE_NOTES.map(n => <li key={n}>{n}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

function Hands() {
  const { model, error } = useHumanModel();
  if (!model) return <Loading error={error} />;
  return (
    <div style={page}>
      <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Hand poses</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {Object.entries(HAND_POSES).map(([id, f]) => (
          <figure key={id} style={{ margin: 0, display: "grid", justifyItems: "center", gap: 4 }}>
            <HandFigure model={model} pose={{ ...f(), "shoulder.L": { flex: 60, abduct: 20 }, "elbow.L": { flex: 60 } }} />
            <figcaption style={caption}>{id}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
function HandFigure({ model, pose }: { model: HumanBodyModel; pose: HumanPose }) {
  const body = useMemo(() => createHumanBody(model, { sex: 0.5, age: 30 }), [model]);
  const posed = useMemo(() => poseHumanBody(body, pose), [body, pose]);
  const frame = useMemo(() => {
    const p = posed.points, j = body.bones.find(b => b.id === "metacarpal2.L")!;
    const t: [number, number, number] = [p[j.tail * 3], p[j.tail * 3 + 1], p[j.tail * 3 + 2]];
    return renderHumanFrame(body, posed.points, { yaw: 40, pitch: 10, target: t }, { width: 220, height: 220, pixelsPerMetre: 1100, centerOnTarget: true });
  }, [body, posed]);
  return <HumanFigure frame={frame} surface="clay" label="Hand pose reference" />;
}

const meta = { title: "Video production/Art Foundations/Human Anatomy", id: "video-human-anatomy", component: BodyLab, parameters: { layout: "fullscreen" } } satisfies Meta<typeof BodyLab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Lab: Story = { render: () => <BodyLab /> };
export const PopulationLineUp: Story = { name: "Population line-up", render: () => <Population /> };
export const TurnaroundSheet: Story = { name: "Turnaround", render: () => <Turnaround /> };
export const PoseLibrary: Story = { name: "Pose library", render: () => <Poses /> };
export const PoseLibraryFront: Story = { name: "Pose library (front QA)", render: () => <PosesAt yaw={0} /> };
export const PoseLibrarySide: Story = { name: "Pose library (side QA)", render: () => <PosesAt yaw={90} /> };
export const HandPoses: Story = { name: "Hand poses", render: () => <Hands /> };

const muted = { margin: 0, color: "#5b524b", font: "13px/1.45 system-ui, sans-serif" } as const;
const field = { minHeight: 34, padding: "5px 8px", borderRadius: 7, border: "1px solid #797776", background: "#fff", color: "inherit", font: "14px system-ui, sans-serif" } as const;
/** Faces built from the attractiveness research and rendered as portraits. */
function BeautifulFaces() {
  const people: { o: PortraitOptions; caption: string }[] = [
    { o: { sex: 0, skin: "#e6c0a4", hairStyle: "long", eyes: "brown" }, caption: "Woman, light skin, long hair" },
    { o: { sex: 1, skin: "#c99a7e", hairStyle: "short", eyes: "hazel" }, caption: "Man, medium skin, short hair" },
    { o: { sex: 0, skin: "#8d5a3b", hairStyle: "bob", eyes: "dark-brown", hair: { eumelanin: 7 } }, caption: "Woman, brown skin, bob" },
    { o: { sex: 1, skin: "#5e3a26", hairStyle: "short", eyes: "dark-brown", hair: { eumelanin: 8 } }, caption: "Man, dark skin" },
    { o: { sex: 0, skin: "#f1d3bd", hairStyle: "long", eyes: "blue", hair: { eumelanin: 0.5, pheomelanin: 0.35 } }, caption: "Woman, very light skin, fair hair" },
    { o: { sex: 1, skin: "#d7aa86", hairStyle: "short", eyes: "grey", hair: { eumelanin: 2.5 } }, caption: "Man, light skin" },
  ];
  return (
    <div style={{ ...page, gap: 20 }}>
      <p style={{ ...muted, maxWidth: 900 }}>Each face starts from measured population means (Farkas norms, ANSUR II face breadths and pupil distances), is made symmetric, gets above-average femininity (women) or a slight feminisation (men), measured attractive lip heights, an open eye at a measured palpebral height and a slight canthal tilt, and a hairline at Pallett's 36% ratio. Rendered with measured skin scattering (d'Eon & Luebke profile), a shadowed key light and occlusion, ray-traced eyes and strand-traced hair.</p>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
        {people.map((p, k) => <figure key={k} style={{ margin: 0, display: "grid", gap: 4 }}><FacePortrait options={{ ...p.o, width: 288, height: 360, seed: 5 + k }} label={p.caption} /><figcaption style={muted}>{p.caption}</figcaption></figure>)}
      </div>
      <h3 style={{ margin: 0 }}>The calibrated average (beauty 0) against the findings applied (beauty 1)</h3>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
        {[0, 1].flatMap(sex => [0, 1].map(beauty => <figure key={`${sex}-${beauty}`} style={{ margin: 0, display: "grid", gap: 4 }}><FacePortrait options={{ sex, beauty, skin: "#d8a98a", hairStyle: sex ? "short" : "bob", width: 288, height: 360 }} label={`${sex ? "Man" : "Woman"}, beauty ${beauty}`} /><figcaption style={muted}>{sex ? "Man" : "Woman"}, beauty {beauty}</figcaption></figure>))}
      </div>
      <h3 style={{ margin: 0 }}>The golden ratio face, checked</h3>
      <GoldenRatioTable face={{ sex: 0 }} />
      <h3 style={{ margin: 0 }}>What is applied, and where it comes from</h3>
      <BeautyEvidence />
    </div>
  );
}

const SKINS = ["#f1d3bd", "#e6c0a4", "#d8a98a", "#c99a7e", "#b3825f", "#8d5a3b", "#6d452f", "#4b2e20"];
const MEN_STYLES = new Set(["short-crop", "slicked-back", "buzz"]);

/** The hair foundation on the portrait head: every style, bang and part, with as many strands as you like. */
function HairLab() {
  const [o, setO] = useState<PortraitOptions>({ sex: 0, skin: "#e6c0a4", eyes: "brown", hairStyle: "shoulder-curtain", hairStrands: 40000, hairLength: 1, hair: { eumelanin: 1.3, pheomelanin: 0 }, hairGrey: 0, keyAzimuth: -22, keyElevation: 40, yaw: 0 });
  const [info, setInfo] = useState("");
  const set = (k: keyof PortraitOptions, v: unknown) => setO(prev => ({ ...prev, [k]: v }));
  const style = findHairStyle(o.hairStyle ?? "long-straight"), fringe = FRINGES.find(f => f.id === (o.fringe ?? style.fringe));
  const colour = HAIR_COLOR_PRESETS.find(c => c.eumelanin === o.hair?.eumelanin && c.pheomelanin === (o.hair?.pheomelanin ?? 0))?.id ?? "";
  const range = (k: keyof PortraitOptions, name: string, min: number, max: number, step: number, fmt = (v: number) => String(v), dflt = 0) => (
    <label key={k} style={label}>{name}: {fmt(Number(o[k] ?? dflt))}<input type="range" min={min} max={max} step={step} value={Number(o[k] ?? dflt)} onChange={e => set(k, Number(e.target.value))} /></label>);
  return (
    <div style={{ ...page, gridTemplateColumns: "minmax(250px, 330px) 1fr" }}>
      <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
        <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Hair lab</h2>
        <label style={label}>Style<select style={field} value={o.hairStyle} onChange={e => setO(prev => ({ ...prev, hairStyle: e.target.value, sex: MEN_STYLES.has(e.target.value) ? 1 : prev.sex, fringe: undefined, parting: undefined, hairCurl: undefined }))}>
          {HAIRSTYLES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}</select></label>
        <label style={label}>Bangs<select style={field} value={o.fringe ?? ""} onChange={e => set("fringe", (e.target.value || undefined) as FringeKind | undefined)}>
          <option value="">the style's ({style.fringe})</option><option value="none">none</option>{FRINGES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
        <label style={label}>Part<select style={field} value={o.parting ?? ""} onChange={e => set("parting", (e.target.value || undefined) as Parting | undefined)}>
          <option value="">the style's ({style.parting})</option>{(["none", "center", "left", "right"] as const).map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        {range("hairStrands", "Strands drawn", 5000, 120000, 5000, v => v.toLocaleString("en"), 40000)}
        {range("hairLength", "Length", 0.4, 1.6, 0.05, v => `${v.toFixed(2)}×`, 1)}
        <label style={label}>Curl<select style={field} value={o.hairCurl ?? ""} onChange={e => set("hairCurl", e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">the style's ({CURL_TYPES[style.curl - 1].label})</option>{CURL_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label style={label}>Colour<select style={field} value={colour} onChange={e => { const c = HAIR_COLOR_PRESETS.find(x => x.id === e.target.value); if (c) set("hair", { eumelanin: c.eumelanin, pheomelanin: c.pheomelanin }); }}>
          {colour ? null : <option value="">custom</option>}{HAIR_COLOR_PRESETS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        {range("hairGrey", "Grey strands", 0, 1, 0.05, v => `${Math.round(v * 100)}%`)}
        {range("sex", "Woman → man", 0, 1, 1)}
        <label style={label}>Skin<select style={field} value={o.skin} onChange={e => set("skin", e.target.value)}>{SKINS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        {range("yaw", "Head turn", -25, 25, 5, v => `${v}°`)}{range("keyAzimuth", "Key light from", -70, 70, 5, v => `${v}°`)}{range("keyElevation", "Key light height", 0, 70, 5, v => `${v}°`)}
      </div>
      <div style={{ display: "grid", gap: 8, alignContent: "start", maxWidth: 520 }}>
        <FacePortrait options={{ ...o, width: 416, height: 520 }} label={`Portrait with ${style.label} hair`} onRendered={p => setInfo(`${(p.hair?.groom.starts.length ?? 0).toLocaleString("en")} strands · groomed in ${Math.round(p.hair?.groom.ms ?? 0)} ms · rendered in ${Math.round(p.ms)} ms`)} />
        <p style={muted} aria-live="polite">{info || "Rendering…"}</p>
        <p style={muted}><b>{style.label}.</b> {style.note}</p>
        {fringe ? <p style={muted}><b>{fringe.label} bangs.</b> {fringe.note}</p> : null}
      </div>
    </div>
  );
}

/** Eyes in detail: every eye shape and iris, each eye's colour, the pupil, a close-up or the whole portrait. */
function EyeLab() {
  const [o, setO] = useState<PortraitOptions>({ sex: 0, skin: "#e6c0a4", eyes: "hazel", eyeShape: "almond", pupil: 4, framing: "eyes", keyAzimuth: -22, keyElevation: 40, yaw: 0, hairStrands: 12000 });
  const set = (k: keyof PortraitOptions, v: unknown) => setO(prev => ({ ...prev, [k]: v }));
  const shape = findEyeShape(typeof o.eyeShape === "string" ? o.eyeShape : "almond"), iris = findIris(o.eyes ?? "brown");
  const close = o.framing === "eyes";
  const range = (k: keyof PortraitOptions, name: string, min: number, max: number, step: number, fmt = (v: number) => String(v), dflt = 0) => (
    <label key={k} style={label}>{name}: {fmt(Number(o[k] ?? dflt))}<input type="range" min={min} max={max} step={step} value={Number(o[k] ?? dflt)} onChange={e => set(k, Number(e.target.value))} /></label>);
  return (
    <div style={{ ...page, gridTemplateColumns: "minmax(250px, 330px) 1fr" }}>
      <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
        <h2 style={{ margin: 0, font: "700 20px system-ui" }}>Eye lab</h2>
        <label style={label}>Eye shape<select style={field} value={shape.id} onChange={e => set("eyeShape", e.target.value)}>{EYE_SHAPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label style={label}>Iris<select style={field} value={iris.id} onChange={e => set("eyes", e.target.value)}>{IRIS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label style={label}>Right eye (heterochromia)<select style={field} value={o.eyesRight ?? ""} onChange={e => set("eyesRight", e.target.value || undefined)}><option value="">the same</option>{IRIS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        {range("pupil", "Pupil", 2, 7, 0.5, v => `${v} mm`, 4)}
        <label style={label}>Framing<select style={field} value={o.framing ?? "portrait"} onChange={e => set("framing", e.target.value)}><option value="eyes">eyes, close</option><option value="portrait">portrait</option></select></label>
        {range("sex", "Woman → man", 0, 1, 1)}
        <label style={label}>Skin<select style={field} value={o.skin} onChange={e => set("skin", e.target.value)}>{SKINS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        {range("yaw", "Head turn", -25, 25, 5, v => `${v}°`)}{range("keyAzimuth", "Key light from", -70, 70, 5, v => `${v}°`)}{range("keyElevation", "Key light height", 0, 70, 5, v => `${v}°`)}
      </div>
      <div style={{ display: "grid", gap: 8, alignContent: "start", maxWidth: close ? 760 : 520 }}>
        <FacePortrait options={{ ...o, width: close ? 720 : 416, height: close ? 310 : 520 }} label={`${shape.label} eyes, ${iris.label} iris`} />
        <p style={muted}><b>{shape.label}.</b> {shape.note} Opening {shape.height} mm, tilt {shape.tilt}°, crease {shape.crease ? `${shape.crease} mm` : "none"}{shape.epicanthal ? `, epicanthal fold ${shape.epicanthal}` : ""}{shape.hood ? `, hood ${shape.hood}` : ""} ({shape.grade}).</p>
        <p style={muted}><b>{iris.label}.</b> Pupillary zone {iris.pupillary}, ciliary zone {iris.ciliary}; {iris.source} ({iris.grade}).</p>
      </div>
    </div>
  );
}

/** Every eye shape, with what sets it. */
function EyeShapes() {
  return (
    <div style={{ ...page, gap: 16 }}>
      <p style={{ ...muted, maxWidth: 900 }}>Eye shapes measured on real people: the lid opening (height, width, canthal tilt), the upper-lid crease (its height, or none in a single lid), a hood, an epicanthal fold, depth and spacing. Reference photographs are on the Reference board (eyes).</p>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}>
        {EYE_SHAPES.map((t, k) => <figure key={t.id} style={{ margin: 0, display: "grid", gap: 4, alignContent: "start" }}>
          <FacePortrait options={{ sex: 0, skin: SKINS[[1, 1, 2, 2, 1, 0, 3, 2, 1, 4, 0][k]], eyes: ["brown", "blue", "green", "dark-brown", "dark-brown", "hazel", "amber", "grey", "light-blue", "light-brown", "grey-green"][k], eyeShape: t.id, framing: "eyes", hairStrands: 8000, width: 480, height: 206, seed: 3 + k }} label={`${t.label} eyes`} />
          <figcaption style={muted}><b>{t.label}</b> — {t.note}</figcaption></figure>)}
      </div>
      <ul style={{ ...muted, maxWidth: 900, paddingLeft: 18 }}>{EYE_EVIDENCE.filter(x => x.id !== "iris-zones" && x.id !== "iris-continuous").map(x => <li key={x.id}>{x.finding} ({x.url ? <a href={x.url}>{x.source}</a> : x.source}; {x.grade})</li>)}</ul>
    </div>
  );
}

/** Every iris colour, close up. */
function IrisColours() {
  return (
    <div style={{ ...page, gap: 16 }}>
      <p style={{ ...muted, maxWidth: 900 }}>Fourteen irises. Each has a pupillary zone and a ciliary zone in their own colours, measured zone by zone in public-domain or CC0 photographs where one was available, and the structure of a real iris: the collarette, radial fibres, crypts, contraction furrows, the dark limbal ring and the pupillary ruff.</p>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}>
        {IRIS_TYPES.map((t, k) => <figure key={t.id} style={{ margin: 0, display: "grid", gap: 4, alignContent: "start" }}>
          <FacePortrait options={{ sex: 0, skin: SKINS[[3, 2, 1, 2, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0][k]], eyes: t.id, eyeShape: "almond", framing: "eyes", hairStrands: 8000, width: 480, height: 206, seed: 5 + k }} label={`${t.label} iris`} />
          <figcaption style={muted}><b>{t.label}</b> — {t.source} ({t.grade})</figcaption></figure>)}
      </div>
      <ul style={{ ...muted, maxWidth: 900, paddingLeft: 18 }}>{EYE_EVIDENCE.filter(x => x.id === "iris-zones" || x.id === "iris-continuous").map(x => <li key={x.id}>{x.finding} ({x.source}; {x.grade})</li>)}</ul>
    </div>
  );
}

/** Skin is not smooth: its texture by body region and age, with what sets it. */
function SkinTexture() {
  return (
    <div style={{ ...page, gap: 18 }}>
      <p style={{ ...muted, maxWidth: 900 }}>The skin's surface by region, at macro scale under a raking light: a network of furrows (primary lines crossing into triangles and rhombi, finer secondary lines between them, each plateau a little domed), pores where follicles open, fine wrinkles and folds, papillary ridges on the palm and fingertips, and fine vellus hairs. With age the furrows grow fewer, wider and deeper and the folds stronger. Reference photographs: Reference board, skin.</p>
      <SkinRegionsSheet />
      <h3 style={{ margin: 0 }}>The same face at 25, 45, 65 and 80</h3>
      <p style={{ ...muted, maxWidth: 900 }}>Forehead lines, the lines between the brows, crow's feet, lines under the eyes, the nasolabial folds and marionette lines, neck lines and age spots come with age; the fine texture shows only as close as the camera can resolve it.</p>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
        {[25, 45, 65, 80].map((age, k) => <figure key={age} style={{ margin: 0, display: "grid", gap: 4 }}>
          <FacePortrait options={{ sex: k % 2, age, hairStyle: k % 2 ? "short-crop" : "bun", hairGrey: Math.max(0, (age - 40) / 40), skin: SKINS[[1, 3, 2, 1][k]], width: 288, height: 360, seed: 9 + k, hairStrands: 16000 }} label={`Portrait at ${age}`} />
          <figcaption style={muted}>{age} years</figcaption></figure>)}
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}>
        {[[28, 0], [70, 0], [30, 0.85]].map(([age, fr], k) => <figure key={k} style={{ margin: 0, display: "grid", gap: 4 }}>
          <FacePortrait options={{ sex: 0, age, freckles: fr, framing: "eyes", skin: fr ? "#f1d3bd" : SKINS[2], eyes: fr ? "green" : "brown", hair: fr ? { eumelanin: 0.25, pheomelanin: 1.6 } : undefined, hairStrands: 8000, width: 480, height: 206, seed: 3 + k }} label={`Eyes and skin at ${age}${fr ? " with freckles" : ""}`} />
          <figcaption style={muted}>{age} years{fr ? ", freckles" : ""}, close</figcaption></figure>)}
      </div>
      <ul style={{ ...muted, maxWidth: 900, paddingLeft: 18 }}>{SKIN_EVIDENCE.map(x => <li key={x.id}>{x.finding} ({x.url ? <a href={x.url}>{x.source}</a> : x.source}; {x.grade})</li>)}</ul>
    </div>
  );
}

/** Every hairstyle, groomed on the portrait head. */
function Hairstyles() {
  return (
    <div style={{ ...page, gap: 16 }}>
      <p style={{ ...muted, maxWidth: 900 }}>Each style is combed on the head, grown under gravity (lying on the head where the hair beneath holds it, hanging where it leaves the head), cut (a blunt line, layers, texture, or the bangs' own line) and filled out to tens of thousands of strands.</p>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))" }}>
        {HAIRSTYLES.map((st, k) => <figure key={st.id} style={{ margin: 0, display: "grid", gap: 4, alignContent: "start" }}>
          <FacePortrait options={{ sex: MEN_STYLES.has(st.id) ? 1 : 0, skin: SKINS[[1, 2, 0, 3, 1, 2, 1, 2, 6, 2, 1, 3, 2, 4, 3][k]], hairStyle: st.id, hairStrands: 30000, hair: st.id === "afro" ? { eumelanin: 7 } : undefined, width: 256, height: 320, seed: 3 + k }} label={`Portrait with ${st.label} hair`} />
          <figcaption style={muted}><b>{st.label}</b> — {st.note}</figcaption></figure>)}
      </div>
    </div>
  );
}

/** Every kind of bangs (fringe) on one cut. */
function Bangs() {
  return (
    <div style={{ ...page, gap: 16 }}>
      <p style={{ ...muted, maxWidth: 900 }}>Bangs are cut from a triangular section behind the front hairline: combed forward over the hairline, set and left to fall on the forehead, then cut on their own line (straight at the brows, halfway up the forehead, at the lashes, from the bridge of the nose to the cheekbones, or across from the brow to the cheekbone).</p>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))" }}>
        {(["none", ...FRINGES.map(f => f.id)] as FringeKind[]).map((f, k) => { const spec = FRINGES.find(x => x.id === f); return (
          <figure key={f} style={{ margin: 0, display: "grid", gap: 4, alignContent: "start" }}>
            <FacePortrait options={{ sex: 0, skin: SKINS[1], hairStyle: "lob", fringe: f, parting: f === "curtain" || f === "bottleneck" ? "center" : f === "side-swept" ? "left" : "none", hairStrands: 30000, width: 256, height: 320, seed: 11 + k }} label={`Lob with ${spec ? spec.label : "no"} bangs`} />
            <figcaption style={muted}><b>{spec ? spec.label : "No bangs"}</b>{spec ? ` — ${spec.note}` : " — the front swept off the face to either side of the part."}</figcaption></figure>); })}
      </div>
    </div>
  );
}
/** One portrait with every control. */
function PortraitLab() {
  const [o, setO] = useState<PortraitOptions>({ sex: 0, beauty: 1, skin: "#d8a98a", eyes: "brown", hairStyle: "long-straight", expression: "", intensity: 1, yaw: 0, keyAzimuth: -22, keyElevation: 40, age: 30, freckles: 0 });
  const set = (k: keyof PortraitOptions, v: unknown) => setO(prev => ({ ...prev, [k]: v }));
  const num = (k: keyof PortraitOptions, min: number, max: number, step: number) => <label key={k} style={label}>{k}: {String(o[k])}
    <input type="range" min={min} max={max} step={step} value={Number(o[k] ?? 0)} onChange={e => set(k, Number(e.target.value))} /></label>;
  return (
    <div style={{ ...page, gridTemplateColumns: "minmax(240px, 320px) 1fr" }}>
      <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
        {num("sex", 0, 1, 1)}{num("beauty", 0, 1, 0.25)}
        <label style={label}>Skin<select style={field} value={o.skin} onChange={e => set("skin", e.target.value)}>{SKINS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label style={label}>Eyes<select style={field} value={o.eyes} onChange={e => set("eyes", e.target.value as EyeColour)}>{IRIS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label style={label}>Eye shape<select style={field} value={typeof o.eyeShape === "string" ? o.eyeShape : ""} onChange={e => set("eyeShape", e.target.value || undefined)}><option value="">measured average</option>{EYE_SHAPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label style={label}>Hair<select style={field} value={o.hairStyle} onChange={e => set("hairStyle", e.target.value as HairStyle)}>{HAIRSTYLES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}</select></label>
        <label style={label}>Expression<select style={field} value={o.expression} onChange={e => set("expression", e.target.value)}><option value="">neutral</option>{EMOTIONS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        {num("age", 18, 85, 1)}{num("freckles", 0, 1, 0.1)}
        {num("intensity", 0, 1, 0.1)}{num("yaw", -25, 25, 5)}{num("keyAzimuth", -70, 70, 5)}{num("keyElevation", 0, 70, 5)}
      </div>
      <div style={{ maxWidth: 480 }}><FacePortrait options={{ ...o, expression: o.expression || undefined, width: 384, height: 480 }} label="Portrait" /></div>
    </div>
  );
}
export const FaceLabStory: Story = { name: "Face lab", render: () => <FaceLab /> };
export const BeautifulFacesStory: Story = { name: "Beautiful faces", render: () => <BeautifulFaces /> };
export const PortraitLabStory: Story = { name: "Portrait lab", render: () => <PortraitLab /> };
export const HeadAngles: Story = { name: "Head angles", render: () => <FaceAngles /> };
export const RangeOfMotionStory: Story = { name: "Range of motion", render: () => <RangeOfMotion /> };
export const AnyStyleStory: Story = { name: "Any style", render: () => <AnyStyle /> };
export const ProportionsStory: Story = { name: "Proportions and ranges", render: () => <Proportions /> };
export const ReferenceBoardStory: Story = { name: "Reference board", render: () => <ReferenceBoard /> };
export const HairLabStory: Story = { name: "Hair lab", render: () => <HairLab /> };
export const HairstylesStory: Story = { name: "Hairstyles", render: () => <Hairstyles /> };
export const EyeLabStory: Story = { name: "Eye lab", render: () => <EyeLab /> };
export const SkinTextureStory: Story = { name: "Skin texture by region", render: () => <SkinTexture /> };
export const EyeShapesStory: Story = { name: "Eye shapes", render: () => <EyeShapes /> };
export const IrisColoursStory: Story = { name: "Iris colours", render: () => <IrisColours /> };
export const BangsStory: Story = { name: "Bangs (fringes)", render: () => <Bangs /> };
export const BodyHairLabStory: Story = { name: "Hair on the posable body", render: () => <BodyHairLab /> };
export const HairTypesStory: Story = { name: "Hair types and colours", render: () => <HairTypes /> };
export const SkinColourStory: Story = { name: "Skin, hair and eye colour", render: () => <SkinAndColour /> };
