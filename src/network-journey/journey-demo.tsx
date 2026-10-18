/** Story-owned interactive benchmark player. All motion/camera evaluation uses Kumiki's shared MG1 frame. */
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { CinematicCameraDirector } from "../../registry/motion/cinematic-camera-react";
import { MotionDirector } from "../../registry/motion/motion-director-react";
import { VisualTransformation } from "../../registry/motion/visual-transformation-react";
import { MotionScrubber, usePrefersReducedMotion } from "../../registry/motion/react";
import { createJourneyProduction } from "./journey-production";
import { createJourneyWorld } from "./journey-world";
import { JourneyConceptOverlay } from "./journey-concept-overlay";
import { JourneyDnsLesson } from "./journey-dns-lesson";
import { JourneyProtocolLesson } from "./journey-protocol-lesson";
import { JourneyPhoneCloseup } from "./journey-phone-closeup";
import { JOURNEY_STATIC_FRAMES, journeyStageLayers, journeyTransformationId } from "./journey-stage";
import { DEFAULT_JOURNEY, JOURNEY_CHAPTERS, JOURNEY_FRAMES, journeyChapterAt } from "./journey-content";
import type { JourneyAspect, JourneySettings } from "./journey-content";

type ChapterId = (typeof JOURNEY_CHAPTERS)[number]["id"];
type KnowledgeCheck = { question: string; answer: string; explanation: string };

const CHECKS: Record<ChapterId, KnowledgeCheck> = {
  send: {
    question: "Does Send connect directly to the other person's phone?",
    answer: "Not in this example.",
    explanation: "The app sends a request to a messaging service, which coordinates delivery.",
  },
  dns: {
    question: "Does DNS look up the recipient's phone?",
    answer: "No. It helps locate the messaging service.",
    explanation: "The service address may already be cached, or the connection may already be open.",
  },
  secure: {
    question: "Does TLS alone prevent the messaging service from reading messages?",
    answer: "No.",
    explanation: "TLS protects each transport connection. End-to-end encryption, when implemented, separately protects message content from the service.",
  },
  packets: {
    question: "Is every message always split into the same number of packets?",
    answer: "No.",
    explanation: "Application data, encrypted transport records, and network packets are different layers. These glowing pieces are illustrative.",
  },
  network: {
    question: "Does each router need to understand the message's contents?",
    answer: "No.",
    explanation: "Routers forward packets using network addressing and forwarding information; our path is not a live network trace.",
  },
  server: {
    question: "Do these three server layers represent physical hardware?",
    answer: "No.",
    explanation: "Receive, process, and deliver are a conceptual service model, not a literal internal server design.",
  },
  delivery: {
    question: "Does a delivered indicator prove the recipient read the message?",
    answer: "No.",
    explanation: "Acknowledgements, delivery indicators, offline queues, and read receipts depend on the application.",
  },
  overview: {
    question: "What connects the two phones in this example?",
    answer: "A messaging service and two network connections.",
    explanation: "DNS helps locate the service, encrypted transport carries data, routers forward packets, and the service coordinates delivery.",
  },
};

export interface NetworkJourneyDemoProps {
  initialChapter?: ChapterId;
  initialFrame?: number;
  initialAspect?: JourneyAspect;
  initialSettings?: Partial<JourneySettings>;
  initialDirectorView?: boolean;
  reducedMotion?: boolean;
}

function ExplainedControl({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-2 text-body-sm text-foreground">
    <span className="text-muted-foreground">{label}</span>{children}
  </label>;
}

const SELECT_STYLE = "min-h-11 w-full rounded-control border border-border bg-surface px-3 text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export function NetworkJourneyDemo({
  initialChapter = "send",
  initialFrame,
  initialAspect = "landscape",
  initialSettings,
  initialDirectorView = false,
  reducedMotion,
}: NetworkJourneyDemoProps) {
  const [aspect, setAspect] = useState<JourneyAspect>(initialAspect);
  const [settings, setSettings] = useState<JourneySettings>(() => ({ ...DEFAULT_JOURNEY, ...initialSettings }));
  const [frame, setFrame] = useState(() => initialFrame ?? JOURNEY_CHAPTERS.find(ch => ch.id === initialChapter)?.start ?? 0);
  const [directorView, setDirectorView] = useState(initialDirectorView);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [protocolLayer, setProtocolLayer] = useState<number | null>(null);
  const systemReduced = usePrefersReducedMotion();
  const reduce = reducedMotion ?? systemReduced;

  // Compilation samples thousands of camera/subject frames. Never do it on a scrub tick.
  const compiled = useMemo(() => {
    try {
      return { ok: true as const, value: createJourneyProduction(aspect, settings) };
    } catch (cause) {
      return { ok: false as const, error: cause instanceof Error ? cause.message : String(cause) };
    }
  }, [aspect, settings]);

  const selectedChapter = journeyChapterAt(Math.max(0, Math.min(JOURNEY_FRAMES - 1, frame)));
  // A reduced-motion lesson displays its own resolved chapter, not an unrelated final film frame.
  const displayFrame = reduce ? JOURNEY_STATIC_FRAMES[selectedChapter.id] : Math.max(0, Math.min(JOURNEY_FRAMES - 1, frame));
  const current = journeyChapterAt(displayFrame);
  const quiz = CHECKS[current.id];
  // A brief layered dissolve bridges renderers without creating a new clock.
  const layers = journeyStageLayers(displayFrame);

  const update = (patch: Partial<JourneySettings>) => setSettings(before => ({ ...before, ...patch }));
  const jump = (nextFrame: number) => { setFrame(nextFrame); setAnswerVisible(false); };
  const selectChapter = (id: ChapterId) => jump(JOURNEY_CHAPTERS.find(ch => ch.id === id)!.start);

  // useCallback stays above early returns to preserve hook ordering when compilation fails.
  const createScene = useCallback(() => {
    if (!compiled.ok) throw new Error(compiled.error);
    // Director View adds paths/bounds to the SAME authored shot plan and MG1 clock.
    const world = createJourneyWorld(compiled.value.motion.timeline, settings, directorView ? compiled.value.camera : undefined);
    return { scene: world.scene, updateFrame: world.updateFrame, dispose: world.dispose };
  }, [compiled, settings, directorView]);

  if (!compiled.ok) return <main className="mx-auto max-w-4xl space-y-4 p-6" data-network-journey-error="">
    <h1 className="text-heading-lg">A Message's Journey</h1>
    <div role="alert" className="rounded-surface border border-border bg-surface p-5">
      <h2 className="text-heading-sm">The scene could not be compiled</h2>
      <p className="mt-2 whitespace-pre-wrap break-words text-body-sm">{compiled.error}</p>
      <p className="mt-3 text-body-sm text-muted-foreground">The director rejects invalid camera or choreography constraints rather than displaying an unverified shot.</p>
    </div>
  </main>;

  const film = compiled.value;
  const size = film.graphics;
  const visibleGraphic = film.director.transformations.find(transition =>
    displayFrame >= transition.startFrame && displayFrame < transition.endFrame
  );
  const activeCues = film.director.cues.filter(cue =>
    displayFrame >= cue.frame && displayFrame < cue.frame + Math.max(1, cue.durationFrames)
  );
  const activeShot = film.camera.shots.find(shot => displayFrame >= shot.startFrame && displayFrame < shot.endFrame);
  const modeHint = current.id === "delivery" && !settings.recipientOnline
    ? "Offline scenario: the service retains the message for later delivery; the recipient has not received or read it."
    : settings.cachedDns && current.id === "dns"
    ? "Cache scenario: an app may reuse a previous answer or an existing connection; the resolver shown is an explanatory location, not a new measured request."
    : current.id === "secure" && settings.protection === "end-to-end"
      ? "End-to-end scenario: an extra content-encryption boundary is illustrated. TLS still protects each transport leg."
      : current.id === "network"
        ? "Router highlighting selects a teaching subject. It does not calculate a real forwarding route."
        : current.id === "delivery"
          ? "Latency changes authored timing only. Receipt and online/offline behavior are application-specific."
          : "";

  return <main className="mx-auto flex max-w-7xl min-w-0 flex-col gap-6 p-4 text-foreground sm:p-8" data-network-journey="">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl space-y-2">
        <p className="text-body-sm text-muted-foreground">Kumiki explainer benchmark · 90 seconds · eight chapters</p>
        <h1 className="font-serif text-heading-lg font-normal">What happens when you press Send?</h1>
        <p className="text-body text-muted-foreground">Follow one illustrated message from your phone, through a messaging service, to its recipient. An educational model, not a live network trace.</p>
      </div>
      <div role="group" aria-label="Output aspect ratio" className="flex flex-wrap gap-2">
        {(["landscape", "portrait"] as const).map(value =>
          <Button key={value} type="button" size="sm" variant={aspect === value ? "primary" : "outline"}
            aria-pressed={aspect === value} onClick={() => setAspect(value)}>
            {value === "landscape" ? "16:9" : "9:16"}
          </Button>
        )}
        <Button type="button" size="sm" variant={directorView ? "primary" : "outline"} aria-pressed={directorView}
          onClick={() => setDirectorView(value => !value)}>Director View</Button>
      </div>
    </header>

    <nav aria-label="Journey chapters" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {JOURNEY_CHAPTERS.map((ch, index) => <button key={ch.id} type="button"
        aria-current={current.id === ch.id ? "step" : undefined}
        onClick={() => selectChapter(ch.id)}
        className="min-w-0 rounded-control border border-border bg-surface p-3 text-left transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-ring aria-[current=step]:border-primary aria-[current=step]:bg-subtle">
        <span className="block text-caption text-muted-foreground">{String(index + 1).padStart(2, "0")} · {(ch.start / 30).toFixed(0)}–{(ch.end / 30).toFixed(0)}s</span>
        <span className="mt-1 block text-body-sm font-medium">{ch.title}</span>
      </button>)}
    </nav>

    <MotionDirector director={film.director} frame={displayFrame} reducedMotion={false}>
      {state => <figure className="m-0 space-y-3">
        <div data-journey-composition="" className="relative w-full overflow-hidden rounded-surface"
          style={{ aspectRatio: aspect === "portrait" ? "9/16" : "16/9",
            maxWidth: aspect === "portrait" ? 500 : undefined, marginInline: "auto",
            background: "#18333b", isolation: "isolate" }}>
          {layers.filter(layer => layer.opacity > .001).map(layer => {
            const transitionId = journeyTransformationId(layer.kind);
            const transformation = transitionId ? film.director.transformations.find(t => t.id === transitionId) : undefined;
            const sample = layer.frame;
            return <div key={layer.id} data-journey-stage={layer.kind}
              data-journey-segment={layer.id}
              data-journey-outgoing={layer.outgoing ? "true" : "false"}
              aria-hidden={layer.outgoing}
              style={{ position: "absolute", inset: 0, opacity: layer.opacity,
                pointerEvents: "none", willChange: "opacity" }}>
              {layer.kind === "phone" ? <JourneyPhoneCloseup frame={sample} portrait={aspect === "portrait"} /> :
               layer.kind === "dns" ? <JourneyDnsLesson frame={sample} aspect={aspect} settings={settings} /> :
               layer.kind === "protocol" ? <JourneyProtocolLesson frame={sample} aspect={aspect}
                 highlightLayer={protocolLayer ?? undefined} /> :
               transformation ? (
                 <div data-network-vt={transformation.id} className="absolute inset-0"
                   style={{ background: "linear-gradient(130deg,#0e2630,#183b43)" }}>
                   <VisualTransformation transformation={transformation.compiled} frame={sample}
                     evaluation={sample === displayFrame ? state.evaluation : undefined}
                     reducedMotion={false} width={size.width} height={size.height}
                     label="Identity-preserving transformation between network representations"
                     style={{ width: "100%", height: "100%" }} />
                 </div>
               ) : layer.kind === "world" ? (
                 <CinematicCameraDirector plan={film.camera} frame={sample}
                   evaluation={sample === displayFrame ? state.evaluation : undefined}
                   createScene={createScene} reducedMotion={false}
                   ariaLabel={current.headline + ". " + current.caption}
                   style={{ width: "100%", height: "100%" }}
                   overlay={!layer.outgoing && <JourneyConceptOverlay chapter={current.id} frame={sample}
                     aspect={aspect} settings={settings} camera={film.camera} />} />
               ) : null}
            </div>;
          })}
        </div>
        <figcaption className="text-body-sm leading-relaxed text-muted-foreground"
          style={{ overflowWrap: "anywhere" }}>
          <strong className="font-semibold text-foreground">{current.title}.</strong> {current.explanation}
          {reduce ? " Reduced motion: a static chapter composition is shown." : ""}
        </figcaption>
      </figure>}
    </MotionDirector>

    <MotionScrubber timeline={film.director.timeline} frame={frame} onFrame={next => { setFrame(next); setAnswerVisible(false); }} label="Message journey timeline" />

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
      <section aria-labelledby="journey-lesson-heading" className="min-w-0 space-y-4 rounded-surface border border-border bg-surface p-5">
        <p className="text-caption uppercase tracking-wider text-muted-foreground">Understand the system · Chapter {JOURNEY_CHAPTERS.indexOf(current) + 1}</p>
        <h2 id="journey-lesson-heading" className="font-serif text-heading-md font-normal">{current.title}</h2>
        <p className="text-body">{current.explanation}</p>
        {modeHint ? <p className="rounded-control bg-subtle p-3 text-body-sm">{modeHint}</p> : null}
        <div className="border-t border-border pt-4">
          <p className="text-body-sm font-medium">Predict</p>
          <p className="mt-2 text-body">{quiz.question}</p>
          <Button type="button" size="sm" variant="outline" className="mt-3"
            aria-expanded={answerVisible} onClick={() => setAnswerVisible(visible => !visible)}>
            {answerVisible ? "Hide explanation" : "Reveal answer"}
          </Button>
          {answerVisible ? <div role="status" className="mt-3 space-y-2 rounded-control bg-subtle p-4">
            <p className="font-medium">{quiz.answer}</p>
            <p className="text-body-sm">{quiz.explanation}</p>
          </div> : null}
        </div>
      </section>

      <section aria-labelledby="journey-investigate-heading" className="min-w-0 space-y-4 rounded-surface border border-border bg-surface p-5">
        <h2 id="journey-investigate-heading" className="font-serif text-heading-sm font-normal">Investigate the explanation</h2>
        <p className="text-body-sm text-muted-foreground">These controls change an illustrative authored scenario, not a real network simulation.</p>
        {current.id === "packets" ? <ExplainedControl label="Explore OSI layers">
          <select className={SELECT_STYLE} value={protocolLayer ?? ""}
            onChange={event => setProtocolLayer(event.target.value === "" ? null : Number(event.target.value))}>
            <option value="">Follow the seven-layer explanation</option>
            {["7 · Application", "6 · Presentation", "5 · Session", "4 · Transport", "3 · Network", "2 · Data link", "1 · Physical"].map((layer, index) =>
              <option key={layer} value={7 - index}>{layer}</option>)}
          </select>
        </ExplainedControl> : null}
        <ExplainedControl label="Messaging service hostname">
          <input className={SELECT_STYLE} value={settings.domain} maxLength={90}
            onChange={event => update({ domain: event.target.value })} aria-label="Illustrative service hostname" />
        </ExplainedControl>
        <label className="flex items-start gap-3 text-body-sm">
          <input type="checkbox" checked={settings.cachedDns} className="mt-1"
            onChange={event => update({ cachedDns: event.target.checked })} />
          <span>DNS answer already cached <span className="text-muted-foreground">(conceptual shortcut)</span></span>
        </label>
        <ExplainedControl label="Message-content protection">
          <select className={SELECT_STYLE} value={settings.protection}
            onChange={event => update({ protection: event.target.value as JourneySettings["protection"] })}>
            <option value="tls">Transport security (TLS)</option>
            <option value="end-to-end">TLS + illustrated end-to-end protection</option>
          </select>
        </ExplainedControl>
        <ExplainedControl label={"Illustrative network delay: " + settings.latencyMs + " ms"}>
          <input type="range" min={40} max={600} step={20} value={settings.latencyMs}
            onChange={event => update({ latencyMs: Number(event.target.value) })}
            aria-label="Illustrative network delay" className="w-full" />
        </ExplainedControl>
        <label className="flex items-start gap-3 text-body-sm">
          <input type="checkbox" checked={settings.recipientOnline} className="mt-1"
            onChange={event => update({ recipientOnline: event.target.checked })} />
          <span>Recipient online <span className="text-muted-foreground">(when offline, the service retains the message)</span></span>
        </label>
        <ExplainedControl label="Router to highlight">
          <select className={SELECT_STYLE} value={settings.selectedRouter}
            onChange={event => update({ selectedRouter: event.target.value })}>
            {["gateway", "router-a", "router-b", "router-c", "router-d", "router-e", "resolver"].map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </ExplainedControl>
      </section>
    </div>

    {directorView ? <section aria-label="Director diagnostics" className="space-y-3 rounded-surface border border-border bg-surface p-5">
      <h2 className="font-serif text-heading-sm font-normal">Director View · frame {displayFrame}</h2>
      <p className="text-body-sm text-muted-foreground">Camera paths and semantic bounds are drawn in the same Three.js scene. This view does not alter the authored camera trajectory.</p>
      <dl className="grid gap-3 text-body-sm sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Active camera shot</dt><dd>{activeShot?.id ?? "None"}</dd></div>
        <div><dt className="text-muted-foreground">Active cue data</dt><dd>{activeCues.length} cue(s)</dd></div>
        <div><dt className="text-muted-foreground">Compilation</dt><dd>{Math.round(film.compilationMs)} ms</dd></div>
      </dl>
      <details><summary className="cursor-pointer">Compiled tracks, cues, camera diagnostics</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-caption">
          {JSON.stringify({
            cameraShot: activeShot,
            chapter: current.id,
            activeGroups: film.director.schedule.filter(node => displayFrame >= node.startFrame && displayFrame < node.endFrame).map(node => node.id).slice(0, 30),
            cues: activeCues.map(cue => ({ id: cue.id, kind: cue.payload.kind, frame: cue.frame })),
            transformation: visibleGraphic?.id,
            cameraStats: film.camera.stats,
            diagnostics: film.diagnostics,
          }, null, 2)}
        </pre>
      </details>
    </section> : null}
  </main>;
}
