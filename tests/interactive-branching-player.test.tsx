import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveBranchingPlayer } from "../registry/video/interactive-branching-player";
import type { BranchingStory } from "../registry/video/interactive-branching-model";

const story: BranchingStory = { id: "demo", startClipId: "chapter", clips: [
  { id: "chapter", src: "/video.webm", title: "Forest clues", checkpoints: [
    { id: "q1", time: 4, question: "Which tree is evergreen?", choices: [
      { id: "pine", label: "Pine", correct: true, reactionClipId: "good" },
      { id: "oak", label: "Oak", correct: false, reactionClipId: "try" },
    ] },
  ], nextClipId: "end" },
  { id: "good", src: "/good.webm" }, { id: "try", src: "/try.webm" },
  { id: "end", src: "/end.webm" },
] };

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

describe("InteractiveBranchingPlayer", () => {
  it("stops at checkpoints, focuses the question and prevents seeking past an answer", async () => {
    const { container } = render(<InteractiveBranchingPlayer story={story} />);
    const video = container.querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 7 });
    fireEvent.timeUpdate(video);
    expect(video.currentTime).toBe(4);
    expect(video.pause).toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Which tree is evergreen?" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Which tree is evergreen?")).toHaveFocus());
    video.currentTime = 25;
    fireEvent.seeking(video);
    expect(video.currentTime).toBe(4);
  });

  it("scores once, switches to reaction, then returns to the chapter", async () => {
    const onAnswer = vi.fn();
    const { container } = render(<InteractiveBranchingPlayer story={story} onAnswer={onAnswer} />);
    const video = container.querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 6 });
    fireEvent.timeUpdate(video);
    await userEvent.click(screen.getByRole("button", { name: "Pine" }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Play video" })).toHaveFocus());
    expect(screen.getByText("1 / 1 correct")).toBeInTheDocument();
    const reaction = container.querySelector("video") as HTMLVideoElement;
    expect(reaction.querySelector("source")?.getAttribute("src")).toBe("/good.webm");
    fireEvent.ended(reaction);
    const returned = container.querySelector("video") as HTMLVideoElement;
    fireEvent.loadedMetadata(returned);
    expect(returned.currentTime).toBe(4);
    returned.currentTime = 6;
    fireEvent.timeUpdate(returned);
    expect(screen.queryByRole("group", { name: "Which tree is evergreen?" })).toBeNull();
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it("accepts personalized rank, locale, theme and animated-character rendering slots", () => {
    render(<InteractiveBranchingPlayer story={story}
      viewer={{ name: "Yuki", title: "Explorer", badges: ["First clue"] }}
      ranks={[{ id: "novice", title: "New mystery hunter", minAccuracy: 0, badge: "Seed" }]}
      labels={{ play: "再生", pause: "一時停止", correct: "正解" }}
      theme={{ id: "forest", colors: { accent: "#79ac63" }, ornament: <span>Tree branches</span> }}
      actors={[{ id: "teacher", name: "Pip", role: "teacher", side: "left", cues: [{ clipId: "chapter", time: 0, action: "point" }] }]}
      renderActor={({ actor, action }) => <span>{actor.name}: {action}</span>} />);
    expect(screen.getByText("Yuki")).toBeInTheDocument();
    expect(screen.getByText("Explorer")).toBeInTheDocument();
    expect(screen.getByText("New mystery hunter")).toBeInTheDocument();
    expect(screen.getByText("First clue")).toBeInTheDocument();
    expect(screen.getByText("Tree branches")).toBeInTheDocument();
    expect(screen.getByText("Pip: point")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
    expect(document.querySelector('[data-km-interactive-branching-player][data-theme="forest"]')).toBeInTheDocument();
  });

  it("announces completion and supports a custom finish scene", () => {
    const onComplete = vi.fn();
    render(<InteractiveBranchingPlayer story={{ id: "end", startClipId: "solo", clips: [{ id: "solo", src: "/solo.webm" }] }}
      onComplete={onComplete} renderCompletion={({ results }) => <p>Collected {results.answered} clues</p>} />);
    const video = screen.getByLabelText("solo");
    fireEvent.ended(video);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Collected 0 clues")).toBeInTheDocument();
  });

  it("renders per-clip subtitles and handles unsupported authoring without crashing", () => {
    const withCaptions: BranchingStory = { id: "subtitles", startClipId: "only", clips: [{
      id: "only", src: "/only.webm", tracks: [{ src: "/ja.vtt", srcLang: "ja", label: "日本語", default: true }],
    }] };
    const { container, rerender } = render(<InteractiveBranchingPlayer story={withCaptions} />);
    expect(container.querySelector('track[src="/ja.vtt"]')).toHaveAttribute("srclang", "ja");
    rerender(<InteractiveBranchingPlayer story={{ ...withCaptions, startClipId: "missing" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Start clip missing is missing");
  });

  it("advances after a checkpoint answered on the last video frame", async () => {
    const endingStory: BranchingStory = { id: "last-frame", startClipId: "intro", clips: [
      { id: "intro", src: "/intro.webm", checkpoints: [{ id: "last", time: 2, question: "Continue?", choices: [
        { id: "yes", label: "Yes", correct: true }, { id: "no", label: "No", correct: false },
      ] }], nextClipId: "outro" },
      { id: "outro", src: "/outro.webm" },
    ] };
    const { container } = render(<InteractiveBranchingPlayer story={endingStory} />);
    const video = container.querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 2 });
    Object.defineProperty(video, "ended", { configurable: true, value: true });
    fireEvent.timeUpdate(video);
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(container.querySelector('video source')?.getAttribute("src")).toBe("/outro.webm");
  });
});
