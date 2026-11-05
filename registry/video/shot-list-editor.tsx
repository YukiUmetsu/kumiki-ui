import { forwardRef, useId, useState } from "react";
import type { HTMLAttributes, KeyboardEvent } from "react";
import { Button } from "../ui/button";

export interface ShotListItem {
  id: string;
  title: string;
  /** One of `kinds`. Kept even when it is unknown, so nothing is lost on load. */
  kind: string;
  /** What this shot makes clearer. */
  purpose: string;
  /** Read-only note, for example the resolved time or subjects. */
  detail?: string;
}
export interface ShotListKind { value: string; label: string }
export interface ShotListDiagnostic { shotId?: string; severity: "error" | "warning"; message: string }
export interface ShotListLabels {
  list: string;
  moveUp: string;
  moveDown: string;
  kind: string;
  purpose: string;
  empty: string;
  /** Announced after a move. `{title}` and `{position}` are replaced. */
  moved: string;
}
export const SHOT_LIST_LABELS: ShotListLabels = {
  list: "Shots", moveUp: "Move up", moveDown: "Move down", kind: "Shot type", purpose: "What this shot makes clearer",
  empty: "No shots yet.", moved: "{title} moved to position {position}.",
};

export interface ShotListEditorProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  shots: readonly ShotListItem[];
  kinds: readonly ShotListKind[];
  onChange: (shots: ShotListItem[]) => void;
  diagnostics?: readonly ShotListDiagnostic[];
  readOnly?: boolean;
  labels?: Partial<ShotListLabels>;
}

const moved = (shots: readonly ShotListItem[], from: number, to: number) => {
  const next = [...shots];
  const [shot] = next.splice(from, 1);
  next.splice(to, 0, shot);
  return next;
};

/** Reorder and edit a list of shots. It holds no timing and no renderer knowledge. */
export const ShotListEditor = forwardRef<HTMLDivElement, ShotListEditorProps>(function ShotListEditor(
  { shots, kinds, onChange, diagnostics = [], readOnly = false, labels, className, ...rest }, ref) {
  const text = { ...SHOT_LIST_LABELS, ...labels };
  const baseId = useId();
  const [announcement, setAnnouncement] = useState("");
  const move = (index: number, to: number) => {
    if (to < 0 || to >= shots.length) return;
    onChange(moved(shots, index, to));
    setAnnouncement(text.moved.replace("{title}", shots[index].title).replace("{position}", String(to + 1)));
  };
  const update = (index: number, change: Partial<ShotListItem>) =>
    onChange(shots.map((shot, at) => at === index ? { ...shot, ...change } : shot));
  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>, index: number) => {
    if (readOnly || !event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    move(index, index + (event.key === "ArrowUp" ? -1 : 1));
  };
  const general = diagnostics.filter(item => !item.shotId || !shots.some(shot => shot.id === item.shotId));
  return <div ref={ref} className={["flex flex-col gap-3", className].filter(Boolean).join(" ")} {...rest}>
    <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
    {general.map(item => <p key={item.message} className="text-sm text-status-danger">{item.message}</p>)}
    {shots.length === 0 && <p className="text-sm text-muted-foreground">{text.empty}</p>}
    <ol aria-label={text.list} className="flex flex-col gap-2">
      {shots.map((shot, index) => {
        const notes = diagnostics.filter(item => item.shotId === shot.id);
        const noteId = notes.length ? `${baseId}-${shot.id}-notes` : undefined;
        const known = kinds.some(kind => kind.value === shot.kind);
        return <li key={shot.id} onKeyDown={event => onKeyDown(event, index)}
          className="flex flex-col gap-2 rounded-control border border-border bg-surface-subtle p-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span aria-hidden="true" className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
            <h3 className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">{shot.title}</h3>
            {!readOnly && <div className="flex gap-1">
              <Button variant="subtle" size="sm" disabled={index === 0} onClick={() => move(index, index - 1)}
                aria-label={`${text.moveUp}: ${shot.title}`}>{text.moveUp}</Button>
              <Button variant="subtle" size="sm" disabled={index === shots.length - 1} onClick={() => move(index, index + 1)}
                aria-label={`${text.moveDown}: ${shot.title}`}>{text.moveDown}</Button>
            </div>}
          </div>
          {shot.detail && <p className="break-words text-sm text-muted-foreground">{shot.detail}</p>}
          <label className="flex flex-col gap-1 text-sm text-foreground">
            {text.kind}
            <select value={shot.kind} disabled={readOnly} onChange={event => update(index, { kind: event.target.value })}
              className="min-h-9 rounded-control border border-border bg-surface px-2 text-sm text-foreground">
              {!known && <option value={shot.kind}>{shot.kind}</option>}
              {kinds.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            {text.purpose}
            <textarea value={shot.purpose} readOnly={readOnly} rows={2} aria-describedby={noteId}
              aria-invalid={notes.some(item => item.severity === "error") || undefined}
              onChange={event => update(index, { purpose: event.target.value })}
              className="rounded-control border border-border bg-surface p-2 text-sm text-foreground" />
          </label>
          {notes.length > 0 && <ul id={noteId} className="flex flex-col gap-1">
            {notes.map(item => <li key={item.message}
              className={`text-sm ${item.severity === "error" ? "text-status-danger" : "text-status-warning"}`}>{item.message}</li>)}
          </ul>}
        </li>;
      })}
    </ol>
  </div>;
});
