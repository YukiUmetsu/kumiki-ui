/** Renderer-independent hybrid branching video graph and deterministic playback state. */
export interface BranchingChoice {
  id: string;
  label: string;
  correct: boolean;
  /** Optional short reaction video, before returning or entering nextClipId. */
  reactionClipId?: string;
  /** Skip to this chapter after the reaction instead of resuming the question clip. */
  nextClipId?: string;
  description?: string;
}

export interface BranchingCheckpoint {
  id: string;
  /** Time in seconds in the parent clip. */
  time: number;
  question: string;
  choices: BranchingChoice[];
}

export interface BranchingClip {
  id: string;
  src: string;
  poster?: string;
  title?: string;
  nextClipId?: string;
  tracks?: Array<{ src: string; srcLang: string; label: string; kind?: "captions" | "subtitles"; default?: boolean }>;
  checkpoints?: BranchingCheckpoint[];
}

export interface BranchingStory {
  id: string;
  startClipId: string;
  clips: BranchingClip[];
}

export interface BranchingAnswer {
  clipId: string;
  checkpointId: string;
  choiceId: string;
  correct: boolean;
}

export interface BranchingReturn {
  clipId: string;
  time: number;
  nextClipId?: string;
}

export interface BranchingState {
  clipId: string;
  position: number;
  checkpointId: string | null;
  answers: BranchingAnswer[];
  reactionReturn: BranchingReturn | null;
  completed: boolean;
}

export interface BranchingRank {
  id: string;
  title: string;
  minAccuracy: number;
  minCorrect?: number;
  badge?: string;
}

const clipsById = (story: BranchingStory) => new Map(story.clips.map(clip => [clip.id, clip]));

/** Invalid authoring is reported before playback, rather than failing mid-lesson. */
export function validateBranchingStory(story: BranchingStory): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const clip of story.clips) {
    if (!clip.id.trim() || !clip.src.trim()) errors.push(`Clip ${clip.id || "(blank)"} needs an id and src`);
    if (ids.has(clip.id)) errors.push(`Duplicate clip id: ${clip.id}`);
    ids.add(clip.id);
    for (const track of clip.tracks ?? []) {
      if (!track.src.trim() || !track.srcLang.trim() || !track.label.trim()) errors.push(`Clip ${clip.id} has an incomplete subtitle track`);
    }
  }
  if (!ids.has(story.startClipId)) errors.push(`Start clip ${story.startClipId} is missing`);
  const checkpointIds = new Set<string>();
  const clipMap = clipsById(story);
  for (const clip of story.clips) {
    if (clip.nextClipId && !ids.has(clip.nextClipId)) errors.push(`Clip ${clip.id} next clip ${clip.nextClipId} is missing`);
    const times = new Set<number>();
    for (const checkpoint of clip.checkpoints ?? []) {
      if (!checkpoint.id.trim() || checkpointIds.has(checkpoint.id)) errors.push(`Duplicate or blank checkpoint id: ${checkpoint.id}`);
      checkpointIds.add(checkpoint.id);
      if (!Number.isFinite(checkpoint.time) || checkpoint.time < 0 || times.has(checkpoint.time)) errors.push(`Invalid or overlapping checkpoint time in ${clip.id}: ${checkpoint.id}`);
      times.add(checkpoint.time);
      if (!checkpoint.question.trim()) errors.push(`Checkpoint ${checkpoint.id} needs a question`);
      if (checkpoint.choices.length < 2) errors.push(`Checkpoint ${checkpoint.id} needs at least two choices`);
      const choiceIds = new Set<string>();
      for (const choice of checkpoint.choices) {
        if (!choice.id.trim() || !choice.label.trim() || choiceIds.has(choice.id)) errors.push(`Invalid or duplicate choice in ${checkpoint.id}: ${choice.id}`);
        if (typeof choice.correct !== "boolean") errors.push(`Choice ${choice.id} needs a correctness flag`);
        choiceIds.add(choice.id);
        if (choice.reactionClipId && !ids.has(choice.reactionClipId)) errors.push(`Choice ${choice.id} reaction clip ${choice.reactionClipId} is missing`);
        if (choice.nextClipId && !ids.has(choice.nextClipId)) errors.push(`Choice ${choice.id} next clip ${choice.nextClipId} is missing`);
        if (choice.reactionClipId && choice.reactionClipId === clip.id) errors.push(`Reaction for ${choice.id} cannot be its question clip`);
        if (choice.reactionClipId && clipMap.get(choice.reactionClipId)?.checkpoints?.length) errors.push(`Reaction ${choice.reactionClipId} cannot contain checkpoints`);
      }
      if (!checkpoint.choices.some(choice => choice.correct)) errors.push(`Checkpoint ${checkpoint.id} needs a correct choice`);
    }
  }
  return errors;
}

export function createBranchingState(story: BranchingStory): BranchingState {
  return { clipId: story.startClipId, position: 0, checkpointId: null, answers: [], reactionReturn: null, completed: false };
}

function unansweredCheckpoint(story: BranchingStory, state: BranchingState, position: number) {
  const checkpoints = clipsById(story).get(state.clipId)?.checkpoints ?? [];
  return [...checkpoints].sort((a, b) => a.time - b.time).find(checkpoint =>
    checkpoint.time <= position && !state.answers.some(answer => answer.checkpointId === checkpoint.id));
}

/** Handles both playback progress and seeking, including jumps across multiple quizzes. */
export function advanceBranchingTime(story: BranchingStory, state: BranchingState, nextTime: number): BranchingState {
  if (state.completed || state.checkpointId || !Number.isFinite(nextTime)) return state;
  const position = Math.max(0, nextTime);
  if (state.reactionReturn) return { ...state, position };
  const checkpoint = unansweredCheckpoint(story, state, position);
  return checkpoint
    ? { ...state, position: checkpoint.time, checkpointId: checkpoint.id }
    : { ...state, position };
}

/** Ignores duplicate answers, including after returning from a reaction clip. */
export function answerBranchingCheckpoint(story: BranchingStory, state: BranchingState, choiceId: string): BranchingState {
  if (!state.checkpointId || state.completed || state.reactionReturn) return state;
  const checkpoint = clipsById(story).get(state.clipId)?.checkpoints?.find(item => item.id === state.checkpointId);
  const choice = checkpoint?.choices.find(item => item.id === choiceId);
  if (!choice || !checkpoint || state.answers.some(answer => answer.checkpointId === checkpoint.id)) return state;
  const answers = [...state.answers, { clipId: state.clipId, checkpointId: checkpoint.id, choiceId: choice.id, correct: choice.correct }];
  if (choice.reactionClipId) {
    return { ...state, clipId: choice.reactionClipId, position: 0, checkpointId: null, answers,
      reactionReturn: { clipId: state.clipId, time: checkpoint.time, nextClipId: choice.nextClipId } };
  }
  if (choice.nextClipId) return { ...state, clipId: choice.nextClipId, position: 0, checkpointId: null, answers };
  return { ...state, checkpointId: null, answers };
}

export function endBranchingClip(story: BranchingStory, state: BranchingState): BranchingState {
  if (state.completed || state.checkpointId) return state;
  if (state.reactionReturn) {
    const { clipId, time, nextClipId } = state.reactionReturn;
    return { ...state, clipId: nextClipId ?? clipId, position: nextClipId ? 0 : time, reactionReturn: null };
  }
  // If an authored quiz at the end of the clip was not delivered by timeupdate,
  // show it before moving to another chapter.
  const checkpoint = unansweredCheckpoint(story, state, Number.POSITIVE_INFINITY);
  if (checkpoint) return { ...state, position: checkpoint.time, checkpointId: checkpoint.id };
  const next = clipsById(story).get(state.clipId)?.nextClipId;
  return next
    ? { ...state, clipId: next, position: 0 }
    : { ...state, completed: true };
}

export function resultSummary(answers: readonly BranchingAnswer[]) {
  const correct = answers.filter(answer => answer.correct).length;
  return { answered: answers.length, correct, accuracy: answers.length ? correct / answers.length : 0 };
}

export function rankForResults(answers: readonly BranchingAnswer[], ranks: readonly BranchingRank[]): BranchingRank | undefined {
  const stats = resultSummary(answers);
  const qualified = [...ranks].sort((a, b) => a.minAccuracy - b.minAccuracy || (a.minCorrect ?? 0) - (b.minCorrect ?? 0))
    .filter(rank => stats.accuracy >= rank.minAccuracy && stats.correct >= (rank.minCorrect ?? 0));
  return qualified[qualified.length - 1] ?? ranks[0];
}
