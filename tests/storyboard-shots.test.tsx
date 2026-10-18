/**
 * `storyboard-shots` — shared active-shot explanation and keyboard-operable
 * shot navigation for a frame-addressed storyboard.
 *
 * The component is a pure function of `frame`: it marks exactly one shot as
 * `aria-current="step"`, reports a neutral explanation between shots, calls back
 * with the clicked shot's start frame and formats ranges from the board's
 * rational fps.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { createStoryboard } from "../registry/motion/storyboard";
import type { Storyboard, StoryboardShot } from "../registry/motion/storyboard";
import { StoryboardShots } from "../registry/motion/storyboard-shots";

function shot(id: string, startFrame: number, durationFrames: number, claim: string): StoryboardShot {
  return {
    id,
    sceneRef: "scene",
    startFrame,
    durationFrames,
    claim,
    visualObjective: `Objective for ${claim}`,
    focusTarget: "focus",
    onScreenLabels: [claim],
    staticFallback: `Still for ${claim}`,
  };
}

function board(): Storyboard {
  return createStoryboard({
    id: "shots",
    title: "Shots",
    fps: { num: 30, den: 1 },
    durationFrames: 90,
    shots: [
      shot("a", 0, 30, "First claim"),
      shot("b", 30, 30, "Second claim"),
      shot("c", 60, 30, "Third claim"),
    ],
  });
}

describe("StoryboardShots", () => {
  it("renders one labelled button per shot and marks the active shot", () => {
    const { container } = render(<StoryboardShots storyboard={board()} frame={0} onFrameChange={() => {}} />);
    const nav = screen.getByRole("navigation", { name: "Storyboard shots" });
    expect(within(nav).getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "First claim" })).toBeInTheDocument();
    const active = container.querySelector("[aria-current='step']");
    expect(active).toHaveTextContent("First claim");
    expect(active).toHaveTextContent("0–1s");
  });

  it("calls back with the clicked shot's start frame", () => {
    const onFrameChange = vi.fn();
    render(<StoryboardShots storyboard={board()} frame={0} onFrameChange={onFrameChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Second claim/ }));
    expect(onFrameChange).toHaveBeenCalledTimes(1);
    expect(onFrameChange).toHaveBeenCalledWith(30);
  });

  it("explains the gap between shots instead of highlighting one", () => {
    const { container } = render(<StoryboardShots storyboard={board()} frame={95} onFrameChange={() => {}} />);
    expect(screen.getByRole("heading", { name: "Between shots" })).toBeInTheDocument();
    expect(container.querySelector("[aria-current='step']")).toBeNull();
  });

  it("honours a custom navigation label", () => {
    render(<StoryboardShots storyboard={board()} frame={60} onFrameChange={() => {}} label="Reveal beats" />);
    expect(screen.getByRole("navigation", { name: "Reveal beats" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Third claim" })).toBeInTheDocument();
  });

  it("formats shot ranges in seconds from the rational fps", () => {
    const { container } = render(<StoryboardShots storyboard={board()} frame={30} onFrameChange={() => {}} />);
    const active = container.querySelector("[aria-current='step']");
    // 30 frames at 30/1 fps is 1s; a 30-frame shot ends at 2s.
    expect(active).toHaveTextContent("1–2s");
  });
});
