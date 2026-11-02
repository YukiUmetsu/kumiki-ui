import { useState } from "react";
import type { CSSProperties } from "react";
import {
  DEFAULT_CAMERA_LIGHTING_PRESET,
  serializeCameraLightingPreset,
  validateCameraLightingPreset,
  type CameraLightingPreset,
} from "./camera-lighting-preset";

/** The host declares what its imagery can actually do; baked photos cannot be relit. */
export interface CameraLightingInspectorCapabilities { physicalLights?: boolean }
export interface CameraLightingInspectorProps {
  value: CameraLightingPreset;
  onChange: (next: CameraLightingPreset) => void;
  onReset?: () => void;
  capabilities?: CameraLightingInspectorCapabilities;
  className?: string;
  style?: CSSProperties;
}

const textColor = "#dce7ee", muted = "#91a6b5", outline = "1px solid #30434e";
const button: CSSProperties = { background: "#192e39", color: textColor, padding: "8px 12px", border: outline,
  borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, minHeight: 34 };
const section: CSSProperties = { background: "#13242e", border: outline, borderRadius: 12, padding: 14 };
const caption: CSSProperties = { fontSize: 11, color: muted, lineHeight: 1.5, fontVariantNumeric: "tabular-nums" };
const input: CSSProperties = { width: "100%", accentColor: "#76d0be", cursor: "pointer" };
const select: CSSProperties = { width: "100%", border: outline, borderRadius: 8, background: "#0d1d27",
  color: textColor, font: "inherit", padding: "7px 8px" };

function RangeField({ name, value, min, max, step = 1, unit = "", disabled, onChange }: {
  name: string; value: number; min: number; max: number; step?: number; unit?: string;
  disabled?: boolean; onChange: (next: number) => void;
}) {
  return <label style={{ display: "grid", gap: 4, minWidth: 0 }}>
    <span style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: textColor }}>
      <span>{name}</span><output style={{ color: "#9ce7cf", fontVariantNumeric: "tabular-nums" }}>{Number(value.toFixed(2))}{unit}</output>
    </span>
    <input aria-label={name} type="range" value={value} min={min} max={max} step={step} disabled={disabled}
      onChange={event => onChange(Number(event.target.value))} style={input} />
  </label>;
}

/** Controlled inspector: edits portable JSON only, with no renderer or Storybook dependency. */
export function CameraLightingInspector({ value, onChange, onReset, capabilities, className, style }: CameraLightingInspectorProps) {
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const physicalLights = capabilities?.physicalLights !== false;
  const preservesAuthoredLens = value.mode === "preview-offset";
  const update = (next: CameraLightingPreset) => {
    try { onChange(validateCameraLightingPreset(next)); setMessage(null); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  };
  const setCamera = (patch: Partial<CameraLightingPreset["camera"]>) => update({ ...value, camera: { ...value.camera, ...patch } });
  const setLighting = (patch: Partial<CameraLightingPreset["lighting"]>) => update({ ...value, lighting: { ...value.lighting, ...patch } });
  const changeLight = (id: string, patch: Partial<CameraLightingPreset["lighting"]["lights"][number]>) => setLighting({
    lights: value.lighting.lights.map(light => light.id === id ? { ...light, ...patch } : light),
  });
  const addLight = () => {
    let n = 1;
    while (value.lighting.lights.some(light => light.id === `light-${n}`)) n++;
    setLighting({ lights: [...value.lighting.lights, {
      id: `light-${n}`, type: "point", enabled: true, position: [1, 2, 2], color: "#ffffff", intensity: 1, castShadow: false,
    }] });
  };
  const importJson = () => {
    try { update(validateCameraLightingPreset(JSON.parse(importText))); }
    catch (error) { setMessage(`Invalid preset JSON: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(serializeCameraLightingPreset(value));
      setMessage(null);
    } catch { setShowJson(true); setMessage("Clipboard unavailable. Select the JSON below to copy it."); }
  };
  const downloadJson = () => {
    const blob = new Blob([serializeCameraLightingPreset(value)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${value.id}.camera-lighting.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return <aside data-km-camera-lighting-inspector="" aria-label="Camera and lighting inspector" className={className}
    style={{ color: textColor, background: "#0a1821", border: outline, borderRadius: 16, padding: 16,
      fontFamily: "Inter, system-ui, sans-serif", width: "100%", boxSizing: "border-box", ...style }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 16 }}>
      <div>
        <div style={{ letterSpacing: ".13em", fontSize: 10, color: "#6dd9bd", fontWeight: 700, textTransform: "uppercase" }}>Kumiki · Studio rig</div>
        <h2 style={{ fontSize: 18, fontWeight: 650, margin: "5px 0" }}>Camera & lighting</h2>
        <p style={{ ...caption, margin: 0 }}>One preset, any compatible scene.</p>
      </div>
      <button type="button" style={button} onClick={() => { if (onReset) onReset(); else onChange(DEFAULT_CAMERA_LIGHTING_PRESET); setMessage(null); }}>
        Reset preset
      </button>
    </div>
    <div style={{ display: "grid", gap: 12 }}>
      <details open style={section}>
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Camera</summary>
        <div style={{ display: "grid", gap: 13 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Apply mode
            <select aria-label="Camera apply mode" value={value.mode} style={select} onChange={e => update({ ...value, mode: e.target.value as CameraLightingPreset["mode"] })}>
              <option value="replace-shot">Replace shot</option><option value="preview-offset">Offset authored animation</option>
            </select>
          </label>
          <p style={{ ...caption, margin: 0 }}>{value.mode === "preview-offset" ? "Offsets apply after every authored animation frame, without editing keyframes." : "Uses this preset's camera as the absolute shot pose."}</p>
          {preservesAuthoredLens && <p style={{ ...caption, margin: 0, color: "#9ce7cf" }}>
            Lens and target follow the authored shot in offset mode. Switch to Replace shot to edit them.
          </p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
            {([ ["Front", 0, 0], ["Left", -90, 0], ["Right", 90, 0], ["Top", 0, 85], ["Low", 0, -25], ["3/4", 28, 18] ] as const).map(([label, az, el]) =>
              <button type="button" key={label} style={{ ...button, padding: "7px 2px" }} onClick={() => setCamera({ azimuthDeg: az, elevationDeg: el })}>{label}</button>)}
          </div>
          <RangeField name="Camera zoom" value={(value.mode === "preview-offset" ? 1 : 3) / value.camera.distanceFactor}
            min={.25} max={4} step={.05} unit="×"
            onChange={zoom => setCamera({ distanceFactor: (value.mode === "preview-offset" ? 1 : 3) / zoom })} />
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Coordinate space
            <select aria-label="Camera coordinate space" value={value.camera.space} style={select} onChange={e => setCamera({ space: e.target.value as "world" | "subject-relative" })}>
              <option value="subject-relative">Relative to subject</option><option value="world">World units</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Look-at target
            <select aria-label="Camera look-at target" disabled={preservesAuthoredLens} value={value.camera.target === "subject:center" ? "center" : "custom"} style={select}
              onChange={e => setCamera({ target: e.target.value === "center" ? "subject:center" : [0, 0, 0] })}>
              <option value="center">Subject center</option><option value="custom">Custom position</option>
            </select>
          </label>
          {value.camera.target !== "subject:center" && !preservesAuthoredLens && <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {([0, 1, 2] as const).map(axis => <RangeField key={axis} name={`Camera target ${["X", "Y", "Z"][axis]}`}
              value={(value.camera.target as readonly [number, number, number])[axis]} min={-10} max={10} step={.1}
              onChange={n => setCamera({ target: (value.camera.target as readonly [number, number, number]).map((p, i) => axis === i ? n : p) as [number, number, number] })} />)}
          </div>}
          <RangeField name="Camera height" value={value.camera.heightOffset} min={-4} max={4} step={.05} unit=" r"
            onChange={heightOffset => setCamera({ heightOffset })} />
          <RangeField name="Camera yaw (left / right)" value={value.camera.azimuthDeg} min={-180} max={180} unit="°"
            onChange={azimuthDeg => setCamera({ azimuthDeg })} />
          <RangeField name="Camera pitch (top / bottom)" value={value.camera.elevationDeg} min={-85} max={85} unit="°"
            onChange={elevationDeg => setCamera({ elevationDeg })} />
          <RangeField name="Camera roll" value={value.camera.rollDeg} min={-180} max={180} unit="°"
            onChange={rollDeg => setCamera({ rollDeg })} />
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Projection
            <select value={value.camera.projection.kind} aria-label="Camera projection" disabled={preservesAuthoredLens} style={select} onChange={e => setCamera({
              projection: e.target.value === "orthographic" ? { kind: "orthographic", scale: 3 } : { kind: "perspective", fovDeg: 32 },
            })}>
              <option value="perspective">Perspective</option><option value="orthographic">Orthographic</option>
            </select>
          </label>
          {value.camera.projection.kind === "perspective"
            ? <RangeField name="Field of view" value={value.camera.projection.fovDeg} min={10} max={110} unit="°" disabled={preservesAuthoredLens}
              onChange={fovDeg => setCamera({ projection: { kind: "perspective", fovDeg } })} />
            : <RangeField name="Orthographic scale" value={value.camera.projection.scale} min={.25} max={12} step={.05} disabled={preservesAuthoredLens}
              onChange={scale => setCamera({ projection: { kind: "orthographic", scale } })} />}
        </div>
      </details>

      <details open style={section}>
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Lighting</summary>
        <div style={{ display: "grid", gap: 13 }}>
          <RangeField name="Brightness / exposure" value={value.lighting.exposure} min={.1} max={4} step={.05}
            onChange={exposure => setLighting({ exposure })} />
          {!physicalLights ? <p style={{ margin: 0, background: "#25333a", padding: 10, borderRadius: 8, ...caption }}>
            This is a baked image / 2.5D scene. Camera and exposure work, but physical lights cannot relight pixels in the photograph.
          </p> : null}
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Environment light
            <select value={value.lighting.environment} disabled={!physicalLights} style={select} aria-label="Environment light" onChange={e => setLighting({ environment: e.target.value as "keep" | "disable" })}>
              <option value="keep">Keep scene environment</option><option value="disable">Disable environment</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Studio light policy
            <select value={value.lighting.mode} disabled={!physicalLights} style={select} aria-label="Studio light policy" onChange={e => setLighting({ mode: e.target.value as "augment" | "replace-managed" })}>
              <option value="replace-managed">Replace declared studio lights</option><option value="augment">Add to studio lights</option>
            </select>
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={caption}>{value.lighting.lights.length} / 8 lights · max 2 shadows</span>
            <button type="button" style={button} disabled={!physicalLights || value.lighting.lights.length >= 8} onClick={addLight}>+ Add light</button>
          </div>
          {value.lighting.lights.map(light => <fieldset key={light.id} style={{ border: outline, borderRadius: 10, margin: 0, padding: 12, minWidth: 0, display: "grid", gap: 10, opacity: physicalLights ? 1 : .52 }}>
            <legend style={{ color: "#9ce7cf", fontSize: 12, padding: "0 5px" }}>{light.id}</legend>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 12 }}><input type="checkbox" checked={light.enabled} disabled={!physicalLights} onChange={e => changeLight(light.id, { enabled: e.target.checked })} /> Enabled</label>
              <button type="button" disabled={!physicalLights} style={button} aria-label={`Remove ${light.id}`} onClick={() => setLighting({ lights: value.lighting.lights.filter(item => item.id !== light.id) })}>Remove</button>
            </div>
            <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Light {light.id} type
              <select value={light.type} aria-label={`Light ${light.id} type`} disabled={!physicalLights} style={select}
                onChange={e => changeLight(light.id, { type: e.target.value as typeof light.type, castShadow: false })}>
                <option value="directional">Directional</option><option value="point">Point</option><option value="spot">Spot</option><option value="ambient">Ambient</option>
              </select>
            </label>
            <RangeField name={`Light ${light.id} intensity`} value={light.intensity} min={0} max={10} step={.1} disabled={!physicalLights}
              onChange={intensity => changeLight(light.id, { intensity })} />
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12 }}>Light {light.id} color
              <input aria-label={`Light ${light.id} color`} type="color" disabled={!physicalLights}
                value={light.color ?? "#ffffff"} onChange={e => changeLight(light.id, { color: e.target.value, temperatureK: undefined })} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {([0, 1, 2] as const).map((axis) => <RangeField key={axis} name={`Light ${light.id} ${["X", "Y", "Z"][axis]}`}
                value={light.position[axis]} min={-8} max={8} step={.1} disabled={!physicalLights || light.type === "ambient"}
                onChange={n => changeLight(light.id, { position: light.position.map((p, i) => i === axis ? n : p) as [number, number, number] })} />)}
            </div>
            <label style={{ fontSize: 12 }}><input type="checkbox" disabled={!physicalLights || light.type === "ambient"}
              checked={light.castShadow} onChange={e => changeLight(light.id, { castShadow: e.target.checked })} /> Cast shadow</label>
          </fieldset>)}
        </div>
      </details>

      <details open style={section}>
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Portable preset</summary>
        <p style={{ ...caption, margin: "0 0 12px" }}>Export versioned JSON. Import it into another story, application, or video job.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          <button type="button" style={button} onClick={copyJson}>Copy JSON</button>
          <button type="button" style={button} onClick={downloadJson}>Download JSON</button>
          <button type="button" style={button} onClick={() => setShowJson(v => !v)}>{showJson ? "Hide JSON" : "View JSON"}</button>
        </div>
        {showJson ? <textarea readOnly aria-label="Exported preset JSON" value={serializeCameraLightingPreset(value)} rows={8}
          style={{ ...select, boxSizing: "border-box", fontSize: 11 }} /> : null}
        <label style={{ display: "grid", gap: 6, fontSize: 12 }}>Import preset JSON
          <textarea aria-label="Import preset JSON" value={importText} onChange={e => setImportText(e.target.value)} rows={3}
            placeholder="Paste a camera-lighting.json preset…" style={{ ...select, boxSizing: "border-box", resize: "vertical", fontSize: 11 }} />
        </label>
        <button type="button" style={{ ...button, marginTop: 8 }} onClick={importJson}>Import JSON</button>
      </details>
      {message && <p role="alert" style={{ margin: 0, background: "#452e29", padding: 10, borderRadius: 8, color: "#ffd9ca", fontSize: 12 }}>{message}</p>}
    </div>
  </aside>;
}
