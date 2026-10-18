import { useCallback, useMemo, useRef, useState } from "react";
import { CinematicCameraDirector } from "../../registry/motion/cinematic-camera-react";
import { MotionDirector } from "../../registry/motion/motion-director-react";
import { StoryboardShots } from "../../registry/motion/storyboard-shots";
import { projectAssemblyAnnotations } from "../../registry/motion/exploded-view-three";
import type { CameraScene3D } from "../../registry/motion/camera-viewport-3d";
import { MotionScrubber, usePrefersReducedMotion } from "./react";
import { Button } from "../ui/button";
import { CAMERA_CHAPTERS, CAMERA_OUTPUTS, createCameraReference, createComputerScene } from "./cinematic-camera-scene";
import type { CameraAspect } from "./cinematic-camera-scene";
import type { CameraSequenceSpec } from "../../registry/motion/cinematic-camera-types";

export interface CinematicCameraDemoProps { initialFrame?: number; initialAspect?: CameraAspect; projection?: "perspective" | "orthographic"; reducedMotion?: boolean }
export function CinematicCameraDemo({ initialFrame = 80, initialAspect = "landscape", projection = "perspective", reducedMotion }: CinematicCameraDemoProps) {
  const [frame, setFrame] = useState(initialFrame), [aspect, setAspect] = useState(initialAspect);
  const [profile, setProfile] = useState<CameraSequenceSpec["profile"]>("technical"), [lighting, setLighting] = useState<"studio" | "warm">("studio");
  const systemReduced = usePrefersReducedMotion(), resolvedFrame = (reducedMotion ?? systemReduced) ? 899 : frame;
  const result = useMemo(() => createCameraReference(aspect, profile, projection), [aspect, profile, projection]);
  const annotations = useRef<SVGSVGElement>(null);
  const output = CAMERA_OUTPUTS[aspect];
  const createScene = useCallback((): CameraScene3D => {
    const runtime = createComputerScene(lighting);
    return { ...runtime, afterCameraRender({ camera, frame: current, width, height }) {
      const svg = annotations.current;
      if (!svg) return;
      const labels = projectAssemblyAnnotations(runtime.cpu, camera, { width, height }, { occlusion: "show-through", inset: width * .04, labelWidth: width * .17, labelHeight: 36, gap: 12 });
      for (const label of labels) {
        const group = svg.querySelector<SVGGElement>(`[data-part="${label.id}"]`);
        if (!group) continue;
        const visible = current >= 588 && current < 756 && label.state === "visible";
        group.style.display = visible ? "" : "none";
        group.querySelector("line")?.setAttribute("x1", String(label.anchor.x)); group.querySelector("line")?.setAttribute("y1", String(label.anchor.y));
        const end = label.side === "left" ? label.x + label.width : label.x;
        group.querySelector("line")?.setAttribute("x2", String(end)); group.querySelector("line")?.setAttribute("y2", String(label.y + 18));
        group.querySelector("text")?.setAttribute("x", String(label.side === "left" ? label.x : label.x + label.width));
        group.querySelector("text")?.setAttribute("y", String(label.y + 8));
        group.querySelector("text")?.setAttribute("text-anchor", label.side === "left" ? "start" : "end");
      }
    } };
  }, [lighting]);
  if (!result.ok) return <div role="alert" className="space-y-3 p-8"><h1 className="text-heading-md">Camera direction needs adjustment</h1>{result.diagnostics.map((d, i) => <p key={i}>{d.code}: {d.message} {d.frame}</p>)}</div>;
  const beatIndex = Math.min(4, Math.floor(resolvedFrame / 180)), beat = CAMERA_CHAPTERS[beatIndex], portrait = aspect === "portrait";
  return <main className="mx-auto flex max-w-7xl min-w-0 flex-col gap-5 p-4 text-foreground sm:p-8" data-cinematic-camera-demo="">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2"><p className="text-body-sm text-muted-foreground">CinematicCameraDirector / 30-second reference</p><h1 className="text-heading-lg font-medium tracking-tight">How a computer processes information</h1><p className="text-body text-muted-foreground">Five semantic shots. Eighteen moving signals. One MG1 frame clock.</p></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Camera output format">{(["landscape", "portrait", "square"] as const).map(value => <Button size="sm" key={value} variant={aspect === value ? "primary" : "outline"} aria-pressed={aspect === value} onClick={() => setAspect(value)}>{value === "landscape" ? "16:9" : value === "portrait" ? "9:16" : "1:1"}</Button>)}</div>
    </header>
    <MotionDirector director={result.director} frame={resolvedFrame} reducedMotion={false}>
      {state => <figure className="m-0 space-y-3">
        <CinematicCameraDirector plan={result.plan} frame={resolvedFrame} evaluation={state.evaluation} createScene={createScene} reducedMotion={false}
          ariaLabel={`${beat.title} ${beat.caption}`} style={{ maxWidth: portrait ? 460 : aspect === "square" ? 780 : undefined, margin: "auto", borderRadius: "var(--km-radius-surface, 12px)" }}
          overlay={<>
            <div style={{ position: "absolute", inset: "5% 5% auto", color: "#eef4ef", fontFamily: "'Geist Variable', sans-serif" }}>
              <p style={{ margin: 0, opacity: .75, fontSize: portrait ? "clamp(12px, 2vw, 16px)" : "clamp(12px, 1.3vw, 18px)", letterSpacing: ".12em", textTransform: "uppercase" }}>Inside the system / {String(beatIndex + 1).padStart(2, "0")}</p>
              <h2 style={{ margin: "10px 0 0", fontWeight: 450, lineHeight: 1.12, maxWidth: "85%", fontSize: portrait ? "clamp(24px, 3vw, 34px)" : "clamp(24px, 3.3vw, 46px)", letterSpacing: "-.035em" }}>{beat.title}</h2>
            </div>
            <svg ref={annotations} viewBox={`0 0 ${output.width} ${output.height}`} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              {[["socket", "Socket"], ["substrate", "Substrate"], ["core", "Silicon die"], ["lid", "Heat spreader"]].map(([id, label]) => <g key={id} data-part={id} style={{ display: "none" }}><line stroke="#9ebeb9" strokeWidth={1.5} opacity={.65} /><text fill="#eef4ef" fontFamily="'Geist Variable', sans-serif" fontSize={portrait ? 25 : 23}>{label}</text></g>)}
            </svg>
            <div style={{ position: "absolute", left: "5%", right: "5%", bottom: "5%", color: "#d5e2df", borderTop: "1px solid #456166", paddingTop: "2%" }}>
              <p style={{ margin: 0, maxWidth: "91%", fontSize: portrait ? "clamp(15px, 2vw, 20px)" : "clamp(14px, 1.6vw, 22px)", lineHeight: 1.5 }}>{beat.caption}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>{CAMERA_CHAPTERS.map((_, i) => <span key={i} style={{ width: 26, height: 3, background: i === beatIndex ? "#e6b872" : "#426068" }} />)}</div>
            </div>
          </>} />
        <figcaption className="text-body-sm text-muted-foreground">{beat.detail} {(reducedMotion ?? systemReduced) ? "Reduced motion: final composition shown." : ""}</figcaption>
      </figure>}
    </MotionDirector>
    <MotionScrubber timeline={result.plan.timeline} frame={resolvedFrame} onFrame={setFrame} label="Cinematic camera frame" />
    <StoryboardShots storyboard={result.plan.storyboard} frame={resolvedFrame} onFrameChange={setFrame} label="Cinematic camera shots" />
    <div className="flex flex-wrap items-center gap-4 text-body-sm">
      <label className="flex items-center gap-2">Motion profile<select aria-label="Camera motion profile" value={profile as string} onChange={event => setProfile(event.target.value as CameraSequenceSpec["profile"])} className="min-h-11 rounded-control border border-border bg-surface px-3">{["editorial", "technical", "cinematic", "expressive"].map(p => <option key={p}>{p}</option>)}</select></label>
      <Button size="sm" variant="outline" onClick={() => setLighting(lighting === "studio" ? "warm" : "studio")}>Lighting: {lighting}</Button>
      <output className="text-muted-foreground">Compiled in {Math.round(result.compilationMs)} ms · {result.plan.stats.targetSamples.toLocaleString()} target samples</output>
    </div>
    <details className="rounded-surface border border-border p-4 text-body-sm"><summary className="cursor-pointer">Direction, constraints and diagnostics ({result.diagnostics.length})</summary><p className="my-3 text-muted-foreground">Handoffs explicitly permit partial framing for 48 frames. Collision checks cover the declared board box. Visibility uses geometric sample rays; transparent and volumetric effects require a custom adapter.</p><pre className="max-h-72 overflow-auto whitespace-pre-wrap">{JSON.stringify(result.diagnostics, null, 2)}</pre></details>
  </main>;
}
