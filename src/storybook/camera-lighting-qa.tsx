import { useEffect, useRef, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { CameraLightingInspector } from "../../registry/motion/camera-lighting-inspector";
import { CameraLightingPreviewContext } from "../../registry/motion/camera-lighting-preview";
import { DEFAULT_CAMERA_LIGHTING_PRESET } from "../../registry/motion/camera-lighting-preset";
import type { CameraLightingPreset } from "../../registry/motion/camera-lighting-preset";

/** No camera movement, new lights, or environment replacement until a QA control is edited. */
export const CAMERA_LIGHTING_QA_INITIAL: CameraLightingPreset = {
  ...DEFAULT_CAMERA_LIGHTING_PRESET,
  id: "storybook-camera-lighting-qa",
  mode: "preview-offset" as const,
  camera: { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, azimuthDeg: 0, elevationDeg: 0,
    heightOffset: 0, distanceFactor: 1, rollDeg: 0 },
  lighting: { ...DEFAULT_CAMERA_LIGHTING_PRESET.lighting, environment: "keep" as const,
    mode: "augment" as const, exposure: 1, lights: [] },
};

const button: CSSProperties = {
  border: "1px solid #638d99", background: "#0a202b", color: "#e6f4f7",
  padding: "9px 12px", borderRadius: 10, font: "600 12px Inter, system-ui, sans-serif",
  cursor: "pointer", boxShadow: "0 6px 22px rgba(0,0,0,.2)",
};

/**
 * Storybook-only QA chrome. Compatible 3D viewers opt in through the scoped
 * context; unrelated stories, published components, and export frames are untouched.
 */
export function CameraLightingQaFrame({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [compatible, setCompatible] = useState(false);
  const [physicalLights, setPhysicalLights] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<CameraLightingPreset>(CAMERA_LIGHTING_QA_INITIAL);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const detect = () => {
      const viewers = element.querySelectorAll("[data-km-hero-viewer], [data-km-camera-viewport-3d]");
      // Dedicated inspector examples already own their editable camera/light state.
      setCompatible(viewers.length > 0 && !element.querySelector("[data-km-camera-lighting-inspector]"));
      setPhysicalLights(!element.querySelector('[data-km-camera-viewport-3d][data-km-physical-lights="false"]'));
    };
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const active = compatible && enabled;
  return <CameraLightingPreviewContext.Provider value={active ? preset : null}>
    <div data-km-camera-lighting-qa-frame="">
      <div ref={root} data-km-camera-lighting-story="" style={{ display: "contents" }}>{children}</div>
      {compatible && <div data-km-camera-lighting-qa="" style={{ position: "fixed", right: 16, top: 66,
        zIndex: 1000, display: "grid", justifyItems: "end", gap: 8, maxWidth: "calc(100vw - 32px)" }}>
        {!active ? <button type="button" style={button} onClick={() => { setEnabled(true); setOpen(true); }}>
          Camera & lighting QA
        </button> : <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={button} onClick={() => setOpen(value => !value)}>{open ? "Hide controls" : "Edit camera & lights"}</button>
          <button type="button" style={button} onClick={() => { setEnabled(false); setOpen(false); }}>Disable QA</button>
        </div>}
        {active && open && <div role="region" aria-label="Storybook camera and lighting QA controls"
          style={{ width: "min(376px, calc(100vw - 32px))", maxHeight: "calc(100vh - 138px)",
            overflowY: "auto", overscrollBehavior: "contain", borderRadius: 16, boxShadow: "0 18px 56px rgba(0,0,0,.36)" }}>
          <CameraLightingInspector value={preset} onChange={setPreset} onReset={() => setPreset(CAMERA_LIGHTING_QA_INITIAL)}
            capabilities={{ physicalLights }} />
        </div>}
      </div>}
    </div>
  </CameraLightingPreviewContext.Provider>;
}
