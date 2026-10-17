import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DirectionalLight, HemisphereLight, Scene } from "three";
import type { Group, PerspectiveCamera } from "three";
import { CameraViewport3D } from "./camera-viewport-3d";
import type { CameraViewport3DProps } from "./camera-viewport-3d";
import type { AssemblyPart3D } from "./exploded-view";
import { createExplodedAssembly, projectAssemblyAnnotations } from "./exploded-view-three";
import type { AssemblyAnnotation, AssemblyAnnotationOptions, AssemblyPartFactory } from "./exploded-view-three";
import type { MotionTimeline } from "./types";

export interface AssemblyEnvironment3D { scene: Scene; dispose: () => void }
export interface AssemblyAnnotationTheme { surface: string; ink: string; line: string; fontFamily: string; fontSize: number }
export interface ExplodedView3DProps extends Omit<CameraViewport3DProps, "timeline" | "createScene" | "overlay" | "sceneRevision"> {
  parts: readonly AssemblyPart3D[];
  timeline: MotionTimeline;
  cameraTimeline: MotionTimeline;
  createPart: AssemblyPartFactory;
  createEnvironment?: (assembly: Group) => AssemblyEnvironment3D;
  separationScale?: number;
  annotations?: boolean;
  annotationOptions?: AssemblyAnnotationOptions;
  annotationTheme?: Partial<AssemblyAnnotationTheme>;
  /** Render inside a group translated to the packed label's top-left corner. */
  renderAnnotation?: (annotation: AssemblyAnnotation) => ReactNode;
  overlay?: ReactNode;
}

function defaultEnvironment(): AssemblyEnvironment3D {
  const scene = new Scene();
  const key = new DirectionalLight(0xffffff, 3.5);
  key.position.set(5, 8, 6);
  const rim = new DirectionalLight(0xffffff, 2);
  rim.position.set(-5, 4, -3);
  scene.add(new HemisphereLight(0xffffff, 0x777777, 2), key, rim);
  return { scene, dispose() {} };
}

/** Reversible assembly animation with camera-projected, explicitly occluded annotations. */
export const ExplodedView3D = forwardRef<HTMLDivElement, ExplodedView3DProps>(function ExplodedView3D({
  parts, timeline, cameraTimeline, createPart, createEnvironment = defaultEnvironment,
  separationScale = 1, annotations = true, annotationOptions, annotationTheme, renderAnnotation, overlay,
  width, height, ...viewportProps
}, ref) {
  const [labels, setLabels] = useState<AssemblyAnnotation[]>([]);
  const current = useRef({ timeline, separationScale, annotations, annotationOptions });
  current.current = { timeline, separationScale, annotations, annotationOptions };
  if (timeline.durationFrames !== cameraTimeline.durationFrames || timeline.fps.num * cameraTimeline.fps.den !== cameraTimeline.fps.num * timeline.fps.den) {
    throw new Error("ExplodedView3D requires camera and assembly timelines with matching duration and rational FPS. Both must share one composition clock.");
  }
  const createScene = useCallback(() => {
    const assembly = createExplodedAssembly(parts, createPart);
    let environment: AssemblyEnvironment3D;
    try { environment = createEnvironment(assembly.root); }
    catch (cause) { assembly.dispose(); throw cause; }
    environment.scene.add(assembly.root);
    return {
      scene: environment.scene,
      updateFrame(frame: number) { assembly.update(current.current.timeline, frame, current.current.separationScale); },
      afterRender({ camera, width: outputWidth, height: outputHeight }: { camera: PerspectiveCamera; width: number; height: number }) {
        const next = current.current.annotations ? projectAssemblyAnnotations(assembly, camera, { width: outputWidth, height: outputHeight }, current.current.annotationOptions) : [];
        setLabels(next);
      },
      dispose() { try { assembly.dispose(); } finally { environment.dispose(); } },
    };
  }, [parts, createPart, createEnvironment]);
  const theme: AssemblyAnnotationTheme = {
    surface: "var(--km-surface-elevated, #ffffff)", ink: "var(--km-text-primary, #202936)",
    line: "var(--km-border-strong, #64748b)", fontFamily: "inherit", fontSize: 22, ...annotationTheme,
  };
  if (!Number.isFinite(theme.fontSize) || theme.fontSize <= 0) throw new Error("Assembly annotation fontSize must be finite and greater than zero.");
  const revision = useMemo(() => ({ timeline, separationScale, annotations, annotationOptions }), [timeline, separationScale, annotations, annotationOptions]);
  const visible = labels.filter((label) => label.state === "visible");
  return <CameraViewport3D {...viewportProps} ref={ref} timeline={cameraTimeline} createScene={createScene}
    width={width} height={height} sceneRevision={revision}
    overlay={<>
      {annotations ? <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
        data-km-assembly-annotations="" data-occluded-count={labels.filter((label) => label.state === "occluded").length}
        data-overflow-count={labels.filter((label) => label.state === "overflow").length}>
        {visible.map((label) => {
          const endpointX = label.side === "left" ? label.x + label.width : label.x;
          const endpointY = label.y + label.height / 2;
          const elbowX = endpointX + (label.side === "left" ? 18 : -18);
          return <g key={label.id} data-km-assembly-label={label.id}>
            <path d={`M ${label.anchor.x} ${label.anchor.y} L ${elbowX} ${endpointY} H ${endpointX}`} fill="none" stroke={theme.line} strokeWidth="1.5" />
            <circle cx={label.anchor.x} cy={label.anchor.y} r="3" fill={theme.ink} />
            <g transform={`translate(${label.x} ${label.y})`}>
              {renderAnnotation ? renderAnnotation(label) : <>
                <rect width={label.width} height={label.height} rx="8" fill={theme.surface} stroke={theme.line} />
                <foreignObject x="10" y="4" width={Math.max(1, label.width - 20)} height={Math.max(1, label.height - 8)}>
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflowWrap: "anywhere", textAlign: "center", fontFamily: theme.fontFamily, fontSize: theme.fontSize, lineHeight: 1.15, color: theme.ink }}>{label.label}</div>
                </foreignObject>
              </>}
            </g>
          </g>;
        })}
      </svg> : null}
      {overlay}
    </>} data-km-exploded-view-3d="" />;
});
