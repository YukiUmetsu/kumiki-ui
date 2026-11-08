/** Example screen demos: a small task list built from Kumiki UI components, driven live, and the same flow from screenshots of it.
 * Anonymous, generic content. The live screen is a pure function of the demo's state: every change and entrance is read from
 * `state` and `since`, never from timers, so any frame renders the same.
 */
import type { CSSProperties } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/field-input";
import type { ScreenDemoContent, ScreenRect } from "./screen-demo";
import type { ScreenUiContext } from "./screen-demo-react";

const TASKS = [
  { id: "feedback", title: "Reply to the design feedback", tag: "Today" },
  { id: "retro", title: "Book the team retro", tag: "Today" },
  { id: "plan", title: "Plan next week", tag: "Fri" },
  { id: "drive", title: "Tidy the shared drive", tag: "Later" },
] as const;
const NAV = [["Inbox", 5], ["Today", 2], ["Upcoming", 3], ["Done", 12]] as const;
/** Entrance from frames since a change: a short rise and fade, done in 8 frames. */
const enter = (since: number | undefined): CSSProperties => {
  const t = since === undefined ? 1 : Math.min(1, since / 8), e = 1 - (1 - t) ** 3;
  return { opacity: e, transform: `translateY(${(1 - e) * 8}px)` };
};

/** The example task list, 1280 × 800. State keys: `composer`, `title`, `added`, `toast`, `done-<task>`. */
export function TasksScreen({ state, since, caret }: ScreenUiContext) {
  const title = String(state.title ?? ""), open = Boolean(state.composer), added = Boolean(state.added);
  const rows = [...added ? [{ id: "new", title: String(state.addedTitle ?? "New task"), tag: "New" }] : [], ...TASKS];
  return <div className="flex h-[800px] w-[1280px] bg-surface font-sans text-foreground">
    <aside className="flex w-[232px] shrink-0 flex-col gap-1 border-r border-border-subtle bg-surface-subtle p-5">
      <div className="mb-6 flex items-center gap-3 px-2">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">T</span>
        <span className="text-base font-semibold">Tasks</span>
      </div>
      {NAV.map(([label, count], i) => <div key={label} className={`flex h-10 items-center justify-between rounded-lg px-3 text-sm ${i === 0 ? "bg-surface font-semibold shadow-sm" : "text-muted-foreground"}`}>
        <span>{label}</span><span className="text-xs tabular-nums text-muted-foreground">{label === "Inbox" ? count + (added ? 1 : 0) : count}</span>
      </div>)}
    </aside>
    <main className="relative flex-1 px-12 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div><h1 className="text-[28px] font-semibold tracking-tight">Inbox</h1><p className="mt-1 text-sm text-muted-foreground">{TASKS.length + (added ? 1 : 0) - (state["done-retro"] ? 1 : 0)} open tasks</p></div>
        <Button data-km-demo-target="new-task" size="md">New task</Button>
      </header>
      <div className="mb-3 h-14">
        {open ? <div className="flex h-14 items-center gap-3 rounded-xl border border-border-strong bg-surface px-3 shadow-sm" style={enter(since.composer)}>
          <div className="relative flex-1" data-km-demo-target="title">
            <Input readOnly value={title} placeholder="Task name" aria-label="Task name" className="h-10 w-full px-3 text-sm" />
            {caret === "title" && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
              <span className="invisible whitespace-pre">{title}</span><span className="h-5 w-[1.5px] bg-foreground" />
            </div>}
          </div>
          <Button data-km-demo-target="add" size="md">Add</Button>
          <Button variant="outline" size="md">Cancel</Button>
        </div> : <div className="flex h-14 items-center rounded-xl border border-dashed border-border-subtle px-4 text-sm text-muted-foreground">Add a task…</div>}
      </div>
      <ul className="divide-y divide-border-subtle">
        {rows.map(task => {
          const done = Boolean(state[`done-${task.id}`]);
          return <li key={task.id} data-km-demo-target={`row-${task.id}`} className="flex h-14 items-center gap-4 px-3" style={task.id === "new" ? enter(since.added) : undefined}>
            <span data-km-demo-target={`check-${task.id}`} className="grid size-6 place-items-center"><Checkbox checked={done} aria-label={task.title} /></span>
            <span className={`flex-1 text-[15px] ${done ? "text-muted-foreground line-through" : ""}`}>{task.title}</span>
            <Badge variant={task.tag === "New" ? "info" : "neutral"} size="sm">{task.tag}</Badge>
          </li>;
        })}
      </ul>
      {Boolean(state.toast) && <div data-km-demo-target="toast" className="absolute bottom-8 right-12 flex items-center gap-3 rounded-xl bg-foreground px-5 py-3.5 text-sm font-medium text-surface shadow-lg" style={enter(since.toast)}>
        <span aria-hidden="true">✓</span>Task added
      </div>}
    </main>
  </div>;
}

/** Where the example's targets sit, measured from `TasksScreen` with `measureScreenTargets` (the review re-measures them). */
export const TASKS_TARGETS: Record<string, ScreenRect> = {
  "new-task": { x: 1137, y: 50, width: 95, height: 40 },
  title: { x: 293, y: 141, width: 762, height: 40 },
  add: { x: 1067, y: 141, width: 60, height: 40 },
  "row-new": { x: 280, y: 201, width: 952, height: 56 },
  "check-retro": { x: 292, y: 328, width: 24, height: 24 },
  toast: { x: 1092, y: 721, width: 140, height: 47 },
};
const FLOW = { title: "Send the quarterly summary" };

/** The flow on live UI: open the composer, type a task, add it, then finish another. */
export const TASKS_LIVE_DEMO: ScreenDemoContent = {
  label: "A task list. The cursor opens a new task, types its name, adds it to the top of the inbox, then ticks off another task.",
  screen: { width: 1280, height: 800 }, chrome: "browser", url: "tasks.example.com/inbox",
  source: { kind: "ui", ui: "tasks", state: { composer: false, title: "", added: false, toast: false } },
  targets: TASKS_TARGETS,
  steps: [
    { do: "click", target: "new-task", set: { composer: true } },
    { do: "type", target: "title", text: FLOW.title, click: false },
    { do: "click", target: "add", id: "add", set: { composer: false, title: "", added: true, addedTitle: FLOW.title, toast: true } },
    { do: "show", target: "row-new", callout: "New tasks land on top" },
    { do: "click", target: "check-retro", id: "finish", set: { "done-retro": true }, callout: "Done in one click" },
  ],
};

/** The same flow from four screenshots of `TasksScreen` (2× captures), with the typing drawn over the field. */
export function tasksImageDemo(images: { start: string; composer: string; added: string; done: string }): ScreenDemoContent {
  const shot = (id: string, src: string) => ({ id, image: { id: `tasks-${id}`, src, alt: "", width: 2560, height: 1600, licenseRef: "kumiki-ui:own-work" } });
  return {
    ...TASKS_LIVE_DEMO,
    label: "Screenshots of a task list. The cursor opens a new task, types its name, adds it, then ticks off another task.",
    source: { kind: "images", states: [shot("start", images.start), shot("composer", images.composer), shot("added", images.added), shot("done", images.done)] },
    steps: [
      { do: "click", target: "new-task", show: "composer" },
      { do: "type", target: "title", text: FLOW.title, click: false, style: { fontSize: 14, color: "#242424" } },
      { do: "click", target: "add", id: "add", show: "added" },
      { do: "show", target: "row-new", callout: "New tasks land on top" },
      { do: "click", target: "check-retro", id: "finish", show: "done", callout: "Done in one click" },
    ],
  };
}
