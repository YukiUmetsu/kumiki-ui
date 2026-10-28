import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from "react";
import {
  advanceBranchingTime, answerBranchingCheckpoint, createBranchingState,
  endBranchingClip, rankForResults, resultSummary, validateBranchingStory,
} from "./interactive-branching-model";
import type {
  BranchingAnswer, BranchingRank, BranchingState, BranchingStory,
} from "./interactive-branching-model";
import "./interactive-branching-player.css";

export interface BranchingViewer {
  name?: string;
  title?: string;
  badges?: string[];
}

export interface BranchingTheme {
  id?: string;
  /** Defaults inherit from Kumiki semantic tokens. */
  colors?: { accent?: string; background?: string; foreground?: string; border?: string; glow?: string };
  /** Decoration around the frame; non-interactive by default. */
  ornament?: ReactNode;
  /** For example, a flower wreath or telescope for the viewer's current rank. */
  rankOrnaments?: Record<string, ReactNode>;
  /** A physical frame around the video window, such as stone, marble or wood. */
  frame?: BranchingFrame;
}

/** Stage-pixel geometry measured after layout; frame art is drawn for the real size. */
export interface BranchingFrameGeometry {
  width: number;
  height: number;
  /** The video window inside the frame. */
  window: { x: number; y: number; width: number; height: number };
  /** Stable, URL-safe prefix for SVG definition IDs. */
  id: string;
}

export interface BranchingFrame {
  id: string;
  /** Frame thickness as fractions of the stage width, like CSS percentage padding. */
  insets: { top: number; right: number; bottom: number; left: number };
  /**
   * How far front art may reach into the video window, as a fraction of the
   * stage width. Question and completion text is padded clear of this band.
   */
  intrusion?: number;
  /** Corner radius of the video window in pixels. */
  windowRadius?: number;
  /** Art behind the video window: walls, mouldings, columns. */
  renderBack?: (geometry: BranchingFrameGeometry) => ReactNode;
  /** Art in front of the video: vines, blossoms, recess shadows. Always pointer-inert. */
  renderFront?: (geometry: BranchingFrameGeometry) => ReactNode;
}

export type BranchingActorAction = "idle" | "walk" | "think" | "point" | "celebrate" | "talk";
export interface BranchingActor {
  id: string;
  name: string;
  role?: "student" | "teacher" | string;
  side?: "left" | "right";
  cues?: Array<{ clipId: string; time: number; action: BranchingActorAction }>;
}

export interface BranchingPlayerLabels {
  play: string;
  pause: string;
  mute: string;
  unmute: string;
  seek: string;
  correct: string;
  accuracy: string;
  completed: string;
  loading: string;
  unavailable: string;
  answerHint: string;
  volume: string;
  speed: string;
  normalSpeed: string;
  captionsOn: string;
  captionsOff: string;
  fullscreen: string;
  exitFullscreen: string;
}

const defaults: BranchingPlayerLabels = {
  play: "Play video", pause: "Pause video", mute: "Mute video", unmute: "Unmute video",
  seek: "Seek video", correct: "correct", accuracy: "accuracy", completed: "Lesson complete",
  loading: "Loading video", unavailable: "This video could not be loaded.",
  answerHint: "Choose one answer to continue the story.",
  volume: "Volume", speed: "Playback speed", normalSpeed: "Normal",
  captionsOn: "Show captions", captionsOff: "Hide captions",
  fullscreen: "Full screen", exitFullscreen: "Exit full screen",
};

const SPEEDS = [.5, .75, 1, 1.25, 1.5, 2];
/** Controls stay up this long after the last pointer movement while playing. */
const HUD_IDLE_MS = 2600;

const ICONS = {
  play: "M8 5.6v12.8a.9.9 0 0 0 1.37.77l10.2-6.4a.9.9 0 0 0 0-1.54L9.37 4.83A.9.9 0 0 0 8 5.6Z",
  pause: "M7 5h3.2v14H7zM13.8 5H17v14h-3.2z",
  volumeHigh: "M4 9.2h3.6L12 5v14l-4.4-4.2H4zM15.2 8.6a5 5 0 0 1 0 6.8M17.6 6.2a8.4 8.4 0 0 1 0 11.6",
  volumeLow: "M4 9.2h3.6L12 5v14l-4.4-4.2H4zM15.2 8.6a5 5 0 0 1 0 6.8",
  volumeMuted: "M4 9.2h3.6L12 5v14l-4.4-4.2H4zM15.5 9.5l5 5m0-5-5 5",
  enterFullscreen: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  exitFullscreen: "M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5",
  captions: "M3.5 6.5h17v11h-17zM10.4 10.4a2.2 2.2 0 1 0 0 3.2M16.4 10.4a2.2 2.2 0 1 0 0 3.2",
};
type IconName = keyof typeof ICONS;
function Icon({ name }: { name: IconName }) {
  const filled = name === "play" || name === "pause";
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    <path d={ICONS[name]} fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export interface InteractiveBranchingPlayerProps {
  story: BranchingStory;
  viewer?: BranchingViewer;
  ranks?: BranchingRank[];
  theme?: BranchingTheme;
  labels?: Partial<BranchingPlayerLabels>;
  actors?: BranchingActor[];
  renderActor?: (context: { actor: BranchingActor; action: BranchingActorAction; state: BranchingState }) => ReactNode;
  renderCompletion?: (context: { results: ReturnType<typeof resultSummary>; rank?: BranchingRank; state: BranchingState }) => ReactNode;
  autoPlay?: boolean;
  onStateChange?: (state: BranchingState) => void;
  onAnswer?: (answer: BranchingAnswer, state: BranchingState) => void;
  onComplete?: (state: BranchingState) => void;
  className?: string;
  style?: CSSProperties;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useFrameGeometry(enabled: boolean, stageRef: RefObject<HTMLDivElement>, windowRef: RefObject<HTMLDivElement>, id: string) {
  const [geometry, setGeometry] = useState<BranchingFrameGeometry | null>(null);
  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current;
    if (!enabled || !stage) { setGeometry(null); return; }
    const measure = () => {
      const media = windowRef.current;
      if (!media || !stage.clientWidth) return;
      const next = { width: stage.clientWidth, height: stage.clientHeight, id,
        window: { x: media.offsetLeft, y: media.offsetTop, width: media.offsetWidth, height: media.offsetHeight } };
      setGeometry(previous => previous && previous.width === next.width && previous.height === next.height
        && previous.window.x === next.window.x && previous.window.y === next.window.y
        && previous.window.width === next.window.width && previous.window.height === next.window.height ? previous : next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [enabled, id]);
  return geometry;
}

/** Keyboard focus pins the controls open; a mouse click on a button does not. */
const focusVisible = (element: Element) => {
  try { return element.matches(":focus-visible"); } catch { return true; }
};

const timeLabel = (time: number): string => {
  if (!Number.isFinite(time)) return "0:00";
  const seconds = Math.max(0, Math.floor(time));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export function InteractiveBranchingPlayer({
  story, viewer, ranks = [], theme, labels, actors = [], renderActor, renderCompletion,
  autoPlay = false, onStateChange, onAnswer, onComplete, className, style,
}: InteractiveBranchingPlayerProps) {
  const problems = useMemo(() => validateBranchingStory(story), [story]);
  const [state, setState] = useState(() => createBranchingState(story));
  const current = useRef(state);
  const mediaRef = useRef<HTMLVideoElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const wasQuestion = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [captions, setCaptions] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Overlay chrome: awake after pointer activity, kept up while focused or paused.
  const [hudAwake, setHudAwake] = useState(true);
  const [hudFocused, setHudFocused] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const sectionRef = useRef<HTMLElement>(null);
  const shouldPlay = useRef(autoPlay);
  const latestAutoPlay = useRef(autoPlay);
  latestAutoPlay.current = autoPlay;
  const id = useId();
  const frame = theme?.frame;
  const stageRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const frameGeometry = useFrameGeometry(!!frame && !problems.length, stageRef, windowRef, `km${id.replace(/[^a-zA-Z0-9]/g, "")}`);
  const copy = { ...defaults, ...labels };
  const clip = story.clips.find(item => item.id === state.clipId);
  const checkpoint = clip?.checkpoints?.find(item => item.id === state.checkpointId);
  const results = resultSummary(state.answers);
  const rank = rankForResults(state.answers, ranks);
  const colors = theme?.colors;
  const variables = {
    "--km-branch-accent": colors?.accent,
    "--km-branch-bg": colors?.background,
    "--km-branch-ink": colors?.foreground,
    "--km-branch-border": colors?.border,
    "--km-branch-glow": colors?.glow,
  } as CSSProperties;
  const frameStyle = frame ? {
    "--km-frame-top": `${frame.insets.top * 100}%`,
    "--km-frame-right": `${frame.insets.right * 100}%`,
    "--km-frame-bottom": `${frame.insets.bottom * 100}%`,
    "--km-frame-left": `${frame.insets.left * 100}%`,
    "--km-frame-radius": `${frame.windowRadius ?? 2}px`,
    "--km-frame-intrusion": `${Math.ceil((frame.intrusion ?? 0) * (frameGeometry?.width ?? 0))}px`,
  } as CSSProperties : undefined;

  // The ref is updated before rendering so duplicate timeupdate/seeking events
  // cannot score twice or act on an outdated checkpoint.
  const commit = (next: BranchingState) => {
    if (next === current.current) return;
    current.current = next;
    setState(next);
    onStateChange?.(next);
    if (next.completed) onComplete?.(next);
  };

  useEffect(() => {
    const next = createBranchingState(story);
    current.current = next;
    setState(next);
    setDuration(0);
    setError(false);
    shouldPlay.current = latestAutoPlay.current;
  }, [story]);

  useEffect(() => {
    if (!state.checkpointId) return;
    mediaRef.current?.pause();
    setPlaying(false);
    questionRef.current?.focus();
  }, [state.checkpointId]);

  useEffect(() => {
    if (state.checkpointId) wasQuestion.current = true;
    else if (wasQuestion.current) {
      wasQuestion.current = false;
      playRef.current?.focus();
    }
  }, [state.checkpointId]);

  useEffect(() => {
    setError(false);
    setDuration(0);
    setPlaying(false);
    setBuffering(false);
  }, [state.clipId]);

  // A new <video> is mounted per clip, so viewer preferences are re-applied to it.
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.volume = volume;
    media.defaultPlaybackRate = rate;
    media.playbackRate = rate;
    for (const track of Array.from(media.textTracks ?? [])) track.mode = captions ? "showing" : "hidden";
  }, [volume, rate, captions, state.clipId, state.completed]);

  useEffect(() => {
    const sync = () => setFullscreen(!!sectionRef.current && document.fullscreenElement === sectionRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  if (problems.length) {
    return <div className={className} role="alert" data-km-interactive-branching-error="">
      Invalid branching story: {problems.join("; ")}
    </div>;
  }

  const syncTime = (time: number) => {
    const before = current.current;
    const next = advanceBranchingTime(story, before, time);
    commit(next);
    if (next.checkpointId) {
      const media = mediaRef.current;
      if (media) {
        media.pause();
        if (Math.abs(media.currentTime - next.position) > 0.01) media.currentTime = next.position;
      }
      shouldPlay.current = false;
    }
  };

  const startPlayback = () => {
    const media = mediaRef.current;
    if (!media || current.current.checkpointId || current.current.completed) return;
    shouldPlay.current = true;
    void media.play().catch(() => { shouldPlay.current = false; setPlaying(false); });
  };

  const togglePlayback = () => {
    if (playing) {
      shouldPlay.current = false;
      mediaRef.current?.pause();
      setPlaying(false);
    } else startPlayback();
  };

  const wake = () => {
    setHudAwake(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHudAwake(false), HUD_IDLE_MS);
  };

  const seekTo = (time: number) => {
    if (!duration || current.current.checkpointId || current.current.reactionReturn) return;
    syncTime(Math.min(duration, Math.max(0, time)));
    if (mediaRef.current) mediaRef.current.currentTime = current.current.position;
  };

  const toggleFullscreen = () => {
    const section = sectionRef.current;
    if (!section) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void section.requestFullscreen?.()?.catch(() => {});
  };

  // YouTube-style shortcuts while focus is inside the player, never inside
  // form fields or the question, where keys belong to the focused control.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const key = event.key.toLowerCase();
    const range = target instanceof HTMLInputElement && target.type === "range";
    if (event.altKey || event.ctrlKey || event.metaKey || target.closest(".km-branch__question")) return;
    if (target.closest("select, textarea") || (target.closest("input") && !range)) return;
    // The volume slider keeps its native arrow keys; the timeline jumps 5 s like other players.
    if (range && key.startsWith("arrow") && !target.classList.contains("km-branch__seek")) return;
    if (key === " " && target.closest("button")) return;
    if (key === "k" || key === " ") togglePlayback();
    else if (key === "m") setMuted(value => !value);
    else if (key === "f" && fullscreenSupported) toggleFullscreen();
    else if (key === "c" && clip?.tracks?.length) setCaptions(value => !value);
    else if (key === "arrowleft" || key === "j") seekTo(state.position - (key === "j" ? 10 : 5));
    else if (key === "arrowright" || key === "l") seekTo(state.position + (key === "l" ? 10 : 5));
    else return;
    event.preventDefault();
    wake();
  };

  const answer = (choiceId: string) => {
    const before = current.current;
    const next = answerBranchingCheckpoint(story, before, choiceId);
    if (next === before) return;
    shouldPlay.current = true;
    commit(next);
    onAnswer?.(next.answers[next.answers.length - 1], next);
    if (next.clipId === before.clipId) {
      // A checkpoint may be authored at the last displayed frame. Once the
      // answer clears the overlay, a media element at its end will not emit a
      // second `ended` event merely because play() was called again.
      if (mediaRef.current?.ended) {
        const following = endBranchingClip(story, next);
        shouldPlay.current = !following.completed && !following.checkpointId;
        commit(following);
      } else startPlayback();
    }
  };

  const end = () => {
    const before = current.current;
    const next = endBranchingClip(story, before);
    if (next === before) return;
    shouldPlay.current = !next.completed && !next.checkpointId;
    commit(next);
    if (next.clipId === before.clipId && !next.checkpointId && !next.completed) startPlayback();
  };

  const activeActorAction = (actor: BranchingActor): BranchingActorAction => {
    const cues = [...(actor.cues ?? [])].filter(cue => cue.clipId === state.clipId && cue.time <= state.position)
      .sort((a, b) => a.time - b.time);
    return cues[cues.length - 1]?.action ?? "idle";
  };

  const volumeIcon: IconName = muted || volume === 0 ? "volumeMuted" : volume < .5 ? "volumeLow" : "volumeHigh";
  const hasCaptions = !!clip?.tracks?.length;
  const fullscreenSupported = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const seekLocked = !duration || !!checkpoint || !!state.reactionReturn;
  const hudVisible = !checkpoint && !state.completed && (!playing || hudAwake || hudFocused);
  const progress = duration ? Math.min(1, state.position / duration) : 0;
  const markers = duration ? clip?.checkpoints?.map(item => ({ id: item.id, at: Math.min(1, item.time / duration),
    answered: state.answers.some(answer => answer.clipId === clip.id && answer.checkpointId === item.id) })) ?? [] : [];

  return <section ref={sectionRef} className={["km-branch", className].filter(Boolean).join(" ")}
    data-km-interactive-branching-player="" data-theme={theme?.id ?? "custom"}
    data-phase={state.completed ? "complete" : checkpoint ? "question" : state.reactionReturn ? "reaction" : "playing"}
    data-framed={frame ? "" : undefined} data-fullscreen={fullscreen ? "" : undefined} onKeyDown={onKeyDown}
    style={{ ...variables, ...(frameGeometry ? { "--km-stage-aspect": frameGeometry.width / frameGeometry.height } : {}), ...style } as CSSProperties}
    aria-label={clip?.title ?? "Interactive video"}>
    <div ref={stageRef} className="km-branch__stage" data-framed={frame ? "" : undefined}
      data-frame={frame?.id} style={frameStyle}>
      {frame && frameGeometry && <div className="km-branch__frame km-branch__frame--back" aria-hidden="true">
        {frame.renderBack?.(frameGeometry)}
      </div>}
      <div ref={windowRef} className="km-branch__window" data-hud={hudVisible ? "visible" : "hidden"}
        onPointerMove={event => { if (event.pointerType === "mouse") wake(); }}
        onPointerLeave={() => { if (playing) { clearTimeout(hideTimer.current); setHudAwake(false); } }}
        onFocus={event => setHudFocused(focusVisible(event.target))}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHudFocused(false); }}>
        <div className="km-branch__ornament" aria-hidden="true">{theme?.ornament}{rank && theme?.rankOrnaments?.[rank.id]}</div>
        <div className="km-branch__corner km-branch__corner--a" aria-hidden="true" />
        <div className="km-branch__corner km-branch__corner--b" aria-hidden="true" />
        {!state.completed && clip && <video key={clip.id} ref={mediaRef} className="km-branch__video"
          aria-label={clip.title ?? clip.id} playsInline preload="metadata" poster={clip.poster} muted={muted}
          onLoadedMetadata={event => {
            const media = event.currentTarget;
            setDuration(Number.isFinite(media.duration) ? media.duration : 0);
            media.volume = volume;
            media.playbackRate = rate;
            if (current.current.position) media.currentTime = current.current.position;
            if (shouldPlay.current && !current.current.checkpointId) startPlayback();
          }}
          onClick={event => {
            // Mouse clicks toggle playback; a tap first reveals the controls, as on mobile players.
            if ((event.nativeEvent as PointerEvent).pointerType === "touch" && !hudVisible) wake();
            else { togglePlayback(); wake(); }
          }}
          onTimeUpdate={event => syncTime(event.currentTarget.currentTime)}
          onSeeking={event => syncTime(event.currentTarget.currentTime)}
          onEnded={end}
          onPlay={() => { if (current.current.checkpointId) mediaRef.current?.pause(); else { setPlaying(true); wake(); } }}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onError={() => setError(true)}>
          <source src={clip.src} />
          {clip.tracks?.map(track => <track key={`${track.srcLang}:${track.src}`} src={track.src}
            srcLang={track.srcLang} label={track.label} kind={track.kind ?? "subtitles"} default={track.default} />)}
        </video>}
        {!!actors.length && !state.completed && <div className="km-branch__actors" aria-label="Story characters">
          {actors.map(actor => {
            const action = activeActorAction(actor);
            return <div className="km-branch__actor" key={actor.id} data-action={action} data-side={actor.side ?? "left"}>
              {renderActor ? renderActor({ actor, action, state }) : <span className="km-branch__actor-default" title={actor.name}>
                <span aria-hidden="true">◉</span><span>{actor.name}</span>
              </span>}
            </div>;
          })}
        </div>}
        {buffering && playing && !checkpoint && <div className="km-branch__buffering" role="status" aria-label={copy.loading} />}
        {!playing && !checkpoint && !state.completed && !error && <button type="button" tabIndex={-1} aria-hidden="true"
          className="km-branch__big-play" onClick={() => { startPlayback(); wake(); }}><Icon name="play" /></button>}

        {!state.completed && <div className="km-branch__hud km-branch__hud--top">
          <div className="km-branch__identity">
            {viewer?.name && <span className="km-branch__name">{viewer.name}</span>}
            {viewer?.title && <span className="km-branch__subtitle">{viewer.title}</span>}
            {rank && <span className="km-branch__rank">{rank.badge && <span aria-hidden="true">✦ </span>}{rank.title}</span>}
            {viewer?.badges?.length ? <span className="km-branch__badges" aria-label="Viewer badges">
              {viewer.badges.map(badge => <span className="km-branch__badge" key={badge}>{badge}</span>)}
            </span> : null}
          </div>
          <div className="km-branch__score" aria-live="polite">
            <strong>{results.correct} / {results.answered} {copy.correct}</strong>
            <span>{Math.round(results.accuracy * 100)}% {copy.accuracy}</span>
          </div>
        </div>}

        {!state.completed && <div className="km-branch__hud km-branch__hud--bottom">
          <div className="km-branch__timeline" style={{ "--km-progress": progress } as CSSProperties}>
            <input type="range" min="0" max={duration || 0} step="0.1"
              value={Math.min(state.position, duration || 0)} disabled={seekLocked}
              onChange={event => seekTo(Number(event.currentTarget.value))}
              aria-label={copy.seek} aria-valuetext={`${timeLabel(state.position)} / ${timeLabel(duration)}`} className="km-branch__seek" />
            {markers.map(marker => <span key={marker.id} aria-hidden="true" className="km-branch__marker"
              data-answered={marker.answered ? "" : undefined} style={{ left: `calc(var(--km-thumb) / 2 + (100% - var(--km-thumb)) * ${marker.at})` }} />)}
          </div>
          <div className="km-branch__controls">
            <button type="button" ref={playRef} className="km-branch__button km-branch__play" onClick={togglePlayback} disabled={!!checkpoint || error}
              aria-label={playing ? copy.pause : copy.play}><Icon name={playing ? "pause" : "play"} /></button>
            <div className="km-branch__volume">
              <button type="button" className="km-branch__button km-branch__mute" onClick={() => setMuted(value => !value)}
                aria-label={muted ? copy.unmute : copy.mute}><Icon name={volumeIcon} /></button>
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} aria-label={copy.volume}
                aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`} className="km-branch__volume-range"
                style={{ "--km-progress": muted ? 0 : volume } as CSSProperties}
                onChange={event => { const next = Number(event.currentTarget.value); setVolume(next); setMuted(next === 0); }} />
            </div>
            <span className="km-branch__clock"><span>{timeLabel(state.position)}</span><span className="km-branch__clock-total"><span aria-hidden="true"> / </span>{timeLabel(duration)}</span></span>
            {clip?.title && <span className="km-branch__chapter">{clip.title}</span>}
            <span className="km-branch__spacer" />
            <label className="km-branch__speed">
              <span className="km-branch__sr">{copy.speed}</span>
              <select value={rate} onChange={event => setRate(Number(event.currentTarget.value))}>
                {SPEEDS.map(speed => <option key={speed} value={speed}>{speed === 1 ? copy.normalSpeed : `${speed}×`}</option>)}
              </select>
              <span aria-hidden="true" className="km-branch__speed-face">{rate === 1 ? "1×" : `${rate}×`}</span>
            </label>
            {hasCaptions && <button type="button" className="km-branch__button km-branch__cc" aria-pressed={captions}
              onClick={() => setCaptions(value => !value)} aria-label={captions ? copy.captionsOff : copy.captionsOn}><Icon name="captions" /></button>}
            {fullscreenSupported && <button type="button" className="km-branch__button" onClick={toggleFullscreen}
              aria-label={fullscreen ? copy.exitFullscreen : copy.fullscreen}><Icon name={fullscreen ? "exitFullscreen" : "enterFullscreen"} /></button>}
          </div>
        </div>}

        {error && <p className="km-branch__error" role="alert">{copy.unavailable}</p>}
        {checkpoint && <div className="km-branch__question" aria-labelledby={`${id}-question`}>
          <div className="km-branch__question-inner" role="group" aria-labelledby={`${id}-question`}>
            <span className="km-branch__eyebrow">INTERACTIVE MOMENT</span>
            <h2 id={`${id}-question`} ref={questionRef} tabIndex={-1}>{checkpoint.question}</h2>
            <p>{copy.answerHint}</p>
            <div className="km-branch__choices">
              {checkpoint.choices.map((choice, index) => <button key={choice.id} type="button"
                className="km-branch__choice" onClick={() => answer(choice.id)}>
                <span aria-hidden="true" className="km-branch__choice-index">{String(index + 1).padStart(2, "0")}</span>
                <span>{choice.label}</span>
                <span aria-hidden="true">↗</span>
              </button>)}
            </div>
          </div>
        </div>}
        {state.completed && <div className="km-branch__completed" role="status">
          {renderCompletion?.({ results, rank, state }) ?? <>
            <span aria-hidden="true" className="km-branch__completion-mark">✦</span>
            {viewer?.name && <span className="km-branch__eyebrow">{viewer.name}</span>}
            <h2>{copy.completed}</h2>
            <p>{results.correct} / {results.answered} {copy.correct} · {Math.round(results.accuracy * 100)}% {copy.accuracy}</p>
            {rank && <span className="km-branch__end-rank">{rank.title}</span>}
          </>}
        </div>}
      </div>
      {frame && frameGeometry && <div className="km-branch__frame km-branch__frame--front" aria-hidden="true">
        {frame.renderFront?.(frameGeometry)}
      </div>}
    </div>
  </section>;
}
