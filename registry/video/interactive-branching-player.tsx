import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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
}

const defaults: BranchingPlayerLabels = {
  play: "Play video", pause: "Pause video", mute: "Mute video", unmute: "Unmute video",
  seek: "Seek video", correct: "correct", accuracy: "accuracy", completed: "Lesson complete",
  loading: "Loading video", unavailable: "This video could not be loaded.",
  answerHint: "Choose one answer to continue the story.",
};

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
  const shouldPlay = useRef(autoPlay);
  const latestAutoPlay = useRef(autoPlay);
  latestAutoPlay.current = autoPlay;
  const id = useId();
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
  }, [state.clipId]);

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

  return <section className={["km-branch", className].filter(Boolean).join(" ")}
    data-km-interactive-branching-player="" data-theme={theme?.id ?? "custom"}
    data-phase={state.completed ? "complete" : checkpoint ? "question" : state.reactionReturn ? "reaction" : "playing"}
    style={{ ...variables, ...style }} aria-label={clip?.title ?? "Interactive video"}>
    <header className="km-branch__header">
      <div className="km-branch__identity">
        {viewer?.name && <span className="km-branch__name">{viewer.name}</span>}
        {viewer?.title && <span className="km-branch__subtitle">{viewer.title}</span>}
        {rank && <span className="km-branch__rank">{rank.badge && <span aria-hidden="true">✦ </span>}{rank.title}</span>}
      </div>
      <div className="km-branch__score" aria-live="polite">
        <strong>{results.correct} / {results.answered} {copy.correct}</strong>
        <span>{Math.round(results.accuracy * 100)}% {copy.accuracy}</span>
      </div>
    </header>

    {viewer?.badges?.length ? <div className="km-branch__badges" aria-label="Viewer badges">
      {viewer.badges.map(badge => <span className="km-branch__badge" key={badge}>{badge}</span>)}
    </div> : null}

    <div className="km-branch__stage">
      <div className="km-branch__ornament" aria-hidden="true">{theme?.ornament}{rank && theme?.rankOrnaments?.[rank.id]}</div>
      <div className="km-branch__corner km-branch__corner--a" aria-hidden="true" />
      <div className="km-branch__corner km-branch__corner--b" aria-hidden="true" />
      {!state.completed && clip && <video key={clip.id} ref={mediaRef} className="km-branch__video"
        aria-label={clip.title ?? clip.id} playsInline preload="metadata" poster={clip.poster} muted={muted}
        onLoadedMetadata={event => {
          const media = event.currentTarget;
          setDuration(Number.isFinite(media.duration) ? media.duration : 0);
          if (current.current.position) media.currentTime = current.current.position;
          if (shouldPlay.current && !current.current.checkpointId) startPlayback();
        }}
        onTimeUpdate={event => syncTime(event.currentTarget.currentTime)}
        onSeeking={event => syncTime(event.currentTarget.currentTime)}
        onEnded={end}
        onPlay={() => { if (current.current.checkpointId) mediaRef.current?.pause(); else setPlaying(true); }}
        onPause={() => setPlaying(false)}
        onError={() => setError(true)}>
        <source src={clip.src} />
        {clip.tracks?.map(track => <track key={`${track.srcLang}:${track.src}`} src={track.src}
          srcLang={track.srcLang} label={track.label} kind={track.kind ?? "subtitles"} default={track.default} />)}
      </video>}
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
          <h2>{copy.completed}</h2>
          <p>{results.correct} / {results.answered} {copy.correct} · {Math.round(results.accuracy * 100)}% {copy.accuracy}</p>
          {rank && <span className="km-branch__end-rank">{rank.title}</span>}
        </>}
      </div>}
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
    </div>

    {!state.completed && <footer className="km-branch__controls">
      <button type="button" ref={playRef} className="km-branch__play" onClick={togglePlayback} disabled={!!checkpoint || error}
        aria-label={playing ? copy.pause : copy.play}>{playing ? "❚❚" : "▶"}</button>
      <span className="km-branch__clock">{timeLabel(state.position)}</span>
      <input type="range" min="0" max={duration || 0} step="0.1"
        value={Math.min(state.position, duration || 0)} disabled={!duration || !!checkpoint || !!state.reactionReturn}
        onChange={event => {
          const requested = Number(event.currentTarget.value);
          syncTime(requested);
          if (mediaRef.current) mediaRef.current.currentTime = current.current.position;
        }} aria-label={copy.seek} className="km-branch__seek" />
      <span className="km-branch__clock">{timeLabel(duration)}</span>
      <button type="button" className="km-branch__mute" onClick={() => setMuted(value => !value)}
        aria-label={muted ? copy.unmute : copy.mute}>{muted ? "⌁" : "♫"}</button>
    </footer>}
  </section>;
}
