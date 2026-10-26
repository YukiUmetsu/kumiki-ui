import { describe, expect, it } from "vitest";
import {
  advanceBranchingTime, answerBranchingCheckpoint, createBranchingState,
  endBranchingClip, rankForResults, resultSummary, validateBranchingStory,
} from "../registry/video/interactive-branching-model";
import type { BranchingStory } from "../registry/video/interactive-branching-model";

const story: BranchingStory = {
  id: "lesson", startClipId: "chapter", clips: [
    { id: "chapter", src: "/chapter.webm", title: "Investigation", checkpoints: [
      { id: "clue", time: 5, question: "What left the tracks?", choices: [
        { id: "fox", label: "Fox", correct: true, reactionClipId: "success" },
        { id: "bird", label: "Bird", correct: false, reactionClipId: "retry" },
      ] },
      { id: "trail", time: 15, question: "Where next?", choices: [
        { id: "lake", label: "Lake", correct: true, nextClipId: "lake" },
        { id: "home", label: "Home", correct: false },
      ] },
    ], nextClipId: "finale" },
    { id: "success", src: "/success.webm" }, { id: "retry", src: "/retry.webm" },
    { id: "lake", src: "/lake.webm", nextClipId: "finale" },
    { id: "finale", src: "/finale.webm" },
  ],
};

describe("interactive branching story model", () => {
  it("validates IDs, clip references, timestamps and answer shape", () => {
    expect(validateBranchingStory(story)).toEqual([]);
    expect(validateBranchingStory({ ...story, startClipId: "missing" }).some(e => e.includes("missing"))).toBe(true);
    expect(validateBranchingStory({ ...story, clips: [...story.clips, story.clips[0]] }).some(e => e.includes("Duplicate clip"))).toBe(true);
    const invalid: BranchingStory = { ...story, clips: [{ ...story.clips[0], checkpoints: [
      { id: "broken", time: Number.NaN, question: "?", choices: [
        { id: "one", label: "One", correct: true, reactionClipId: "missing" },
      ] },
    ] }, ...story.clips.slice(1)] };
    expect(validateBranchingStory(invalid).join(" ")).toMatch(/time|reaction|choices/i);
  });

  it("stops precisely on the first unanswered checkpoint even across a large seek", () => {
    const start = createBranchingState(story);
    const blocked = advanceBranchingTime(story, start, 99);
    expect(blocked).toMatchObject({ clipId: "chapter", position: 5, checkpointId: "clue" });
    expect(advanceBranchingTime(story, blocked, 40)).toEqual(blocked);
  });

  it("plays a reaction and resumes at the original time without scoring twice", () => {
    const checkpoint = advanceBranchingTime(story, createBranchingState(story), 6);
    const reacted = answerBranchingCheckpoint(story, checkpoint, "bird");
    expect(reacted).toMatchObject({ clipId: "retry", position: 0, checkpointId: null });
    expect(reacted.answers).toHaveLength(1);
    const resumed = endBranchingClip(story, reacted);
    expect(resumed).toMatchObject({ clipId: "chapter", position: 5, checkpointId: null });
    expect(advanceBranchingTime(story, resumed, 6).answers).toHaveLength(1);
    expect(answerBranchingCheckpoint(story, resumed, "bird")).toEqual(resumed);
    expect(advanceBranchingTime(story, resumed, 40)).toMatchObject({ position: 15, checkpointId: "trail" });
  });

  it("branches after a choice, then reaches the terminal clip", () => {
    const quiz = advanceBranchingTime(story, createBranchingState(story), 5);
    const reaction = answerBranchingCheckpoint(story, quiz, "fox");
    const resumed = endBranchingClip(story, reaction);
    const second = advanceBranchingTime(story, resumed, 20);
    const branch = answerBranchingCheckpoint(story, second, "lake");
    expect(branch).toMatchObject({ clipId: "lake", position: 0 });
    expect(endBranchingClip(story, branch).clipId).toBe("finale");
    expect(endBranchingClip(story, endBranchingClip(story, branch)).completed).toBe(true);
    expect(resultSummary(branch.answers)).toEqual({ answered: 2, correct: 2, accuracy: 1 });
  });

  it("resolves rank by thresholds without granting top rank for zero answers", () => {
    const ranks = [
      { id: "new", title: "New hunter", minAccuracy: 0, minCorrect: 0 },
      { id: "expert", title: "Detective", minAccuracy: 0.8, minCorrect: 2 },
    ];
    expect(rankForResults([], ranks)?.id).toBe("new");
    expect(rankForResults([{ checkpointId: "a", clipId: "a", choiceId: "a", correct: true }], ranks)?.id).toBe("new");
    expect(rankForResults([
      { checkpointId: "a", clipId: "a", choiceId: "a", correct: true },
      { checkpointId: "b", clipId: "a", choiceId: "b", correct: true },
    ], ranks)?.id).toBe("expert");
  });
});
