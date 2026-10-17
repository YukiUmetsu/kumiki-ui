import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { Storyboard } from "./storyboard";
import { shotAt } from "./storyboard";

export interface StoryboardShotsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  storyboard: Storyboard;
  frame: number;
  onFrameChange: (frame: number) => void;
  label?: string;
}

/** Shared explanation and keyboard-operable shot navigation for any storyboard. */
export const StoryboardShots = forwardRef<HTMLDivElement, StoryboardShotsProps>(function StoryboardShots({
  storyboard, frame, onFrameChange, label = "Storyboard shots", className, ...props
}, ref) {
  const activeShot = shotAt(storyboard, frame);
  const seconds = (value: number) => (value * storyboard.fps.den / storyboard.fps.num).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return <div ref={ref} className={`flex min-w-0 flex-col gap-4 ${className ?? ""}`} data-km-storyboard-shots="" {...props}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-serif text-heading-sm font-normal">{activeShot?.claim ?? "Between shots"}</h2>
      <p className="max-w-prose text-body-sm text-muted-foreground">{activeShot?.visualObjective ?? "Select a shot to inspect its movement."}</p>
    </div>
    <nav aria-label={label} className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {storyboard.shots.map((shot) => <button key={shot.id} type="button"
        aria-current={activeShot?.id === shot.id ? "step" : undefined}
        onClick={() => onFrameChange(shot.startFrame)}
        className="min-w-0 rounded-control border border-border bg-surface p-4 text-left text-foreground transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=step]:border-primary aria-[current=step]:bg-subtle">
        <span className="block text-caption text-muted-foreground">{seconds(shot.startFrame)}–{seconds(shot.startFrame + shot.durationFrames)}s</span>
        <span className="mt-1 block text-body font-medium">{shot.claim}</span>
      </button>)}
    </nav>
  </div>;
});
