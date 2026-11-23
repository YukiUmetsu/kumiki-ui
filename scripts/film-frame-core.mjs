/** Resolve a requested film frame without a browser. Handles transition frames conservatively. */
export function selectFilmFrame(film, requestedFrame) {
  if (!Number.isSafeInteger(requestedFrame) || requestedFrame < 0 || requestedFrame >= film.durationFrames)
    throw RangeError(`Frame must be an integer from 0 to ${film.durationFrames - 1}`);
  const transition = film.cut?.transitions?.find(item => item.kind !== "cut" &&
    requestedFrame >= item.startFrame && requestedFrame < item.endFrame);
  const scene = film.scenes.find(item => requestedFrame >= item.startFrame && requestedFrame < item.endFrame);
  if (!scene) throw Error(`No compiled scene contains film frame ${requestedFrame}`);
  return { frame: requestedFrame, sceneId: transition?.toShotId ?? scene.id,
    transition: Boolean(transition), opening: !transition && requestedFrame === scene.startFrame };
}

/** One line for each problem, with every frame it happens in, so a reviewer does not need to open report.json. */
export function problemLines(frames, limit = 20) {
  const groups = new Map();
  for (const { frame, sceneId, problems } of frames) for (const problem of problems) {
    const text = problem.text.length > 90 ? problem.text.slice(0, 89) + "…" : problem.text;
    const what = text + (problem.other ? ` / ${problem.other.slice(0, 60)}` : "");
    const key = [problem.severity, problem.code, sceneId, what].join("|");
    const group = groups.get(key) ?? { severity: problem.severity, line: `[${problem.code}] "${sceneId}": ${what}`, frames: [] };
    if (group.frames.at(-1) !== frame) group.frames.push(frame);
    groups.set(key, group);
  }
  const sorted = [...groups.values()].sort((a, b) => (a.severity === "error" ? 0 : 1) - (b.severity === "error" ? 0 : 1) || b.frames.length - a.frames.length);
  const lines = sorted.slice(0, limit).map(({ severity, line, frames: at }) =>
    `${severity.toUpperCase()} ${line} — f${at.slice(0, 6).join(", f")}${at.length > 6 ? ` and ${at.length - 6} more` : ""}`);
  return sorted.length > limit ? [...lines, `${sorted.length - limit} more kinds of problem in the report.`] : lines;
}
