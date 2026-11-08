/** Pure, deterministic video-statistics analysis. No media decoding or accessibility certification. */

const STILL_CHANGE = 0.12; // FFmpeg YDIF (8-bit luma difference)
const STILL_SECONDS = 1;
const FLASH_LUMA_STEP = 0.1; // approximate whole-frame YAVG screening, NOT WCAG relative luminance
const FLASH_REVIEW_LIMIT = 3;
const BLACK_HIGH = 0.12; // 90th-percentile luma, normalized to [0, 1]
const WHITE_LOW = 0.90; // 10th-percentile luma, normalized to [0, 1]

const round = (value, digits = 2) => Number(value.toFixed(digits));

/** Extract scdet and signalstats data from FFmpeg's metadata=print output. */
export function parseVideoMetadata(output) {
  const frames = [];
  for (const line of output.split("\n")) {
    const head = /^frame:(\d+)\s+pts:\S+\s+pts_time:(\S+)/.exec(line);
    if (head) {
      frames.push({ time: Number(head[2]), luma: NaN, change: NaN, low: NaN, high: NaN, cut: false });
      continue;
    }
    const value = /^lavfi\.(signalstats\.(?:YAVG|YDIF|YLOW|YHIGH)|scd\.time)=(\S+)/.exec(line);
    const frame = frames.at(-1);
    if (!value || !frame) continue;
    const number = Number(value[2]);
    if (value[1] === "signalstats.YAVG") frame.luma = number / 255;
    else if (value[1] === "signalstats.YDIF") frame.change = number;
    else if (value[1] === "signalstats.YLOW") frame.low = number / 255;
    else if (value[1] === "signalstats.YHIGH") frame.high = number / 255;
    else frame.cut = true;
  }
  return frames;
}

function longestGap(frames, duration) {
  let previous = 0, longest = 0;
  for (const frame of frames) {
    longest = Math.max(longest, frame.time - previous);
    previous = frame.time;
  }
  return round(Math.max(longest, duration - previous));
}

function stillStretches(frames, duration) {
  const stretches = [];
  let start;
  for (let index = 1; index < frames.length; index++) {
    const frame = frames[index];
    const still = frame.change < STILL_CHANGE;
    if (still && start === undefined) start = frames[index - 1].time;
    if (!still && start !== undefined) {
      if (frame.time - start >= STILL_SECONDS) stretches.push({ start, seconds: frame.time - start });
      start = undefined;
    }
  }
  if (start !== undefined && duration - start >= STILL_SECONDS) stretches.push({ start, seconds: duration - start });
  return stretches;
}

/** Candidate whole-frame opposing brightness transitions; neither local nor red flashes are assessed. */
function flashCandidates(frames) {
  const transitions = [];
  let anchor = frames[0].luma;
  for (const frame of frames.slice(1)) {
    const step = frame.luma - anchor;
    if (Math.abs(step) >= FLASH_LUMA_STEP && Math.min(frame.luma, anchor) < 0.8) {
      transitions.push({ time: frame.time, direction: Math.sign(step) });
      anchor = frame.luma;
    } else if (Math.abs(step) >= FLASH_LUMA_STEP) {
      anchor = frame.luma;
    }
  }
  const flashes = [];
  let pending;
  for (const transition of transitions) {
    if (pending?.direction === -transition.direction && transition.time - pending.time <= 1) {
      flashes.push(transition.time);
      pending = undefined; // one opposing pair is one candidate, never double-count an edge
    } else pending = transition;
  }
  let left = 0, most = 0, at = 0;
  for (let right = 0; right < flashes.length; right++) {
    while (flashes[right] - flashes[left] >= 1) left++;
    const count = right - left + 1;
    if (count > most) { most = count; at = flashes[left]; }
  }
  return { count: flashes.length, mostInOneSecond: most, atSeconds: round(at), reviewRequired: most > FLASH_REVIEW_LIMIT,
    method: "whole-frame-mean-luma-screening", wcagConformance: "not-assessed" };
}

/** Only isolated solid-frame reversals. Black title cards and intentional flash frames are also candidates. */
function dropouts(frames) {
  const candidates = [];
  for (let index = 1; index < frames.length - 1; index++) {
    const previous = frames[index - 1], frame = frames[index], next = frames[index + 1];
    const kind = frame.high <= BLACK_HIGH ? "near-black" : frame.low >= WHITE_LOW ? "near-white" : null;
    if (!kind) continue;
    if (Math.abs(previous.luma - next.luma) <= 0.05 && Math.abs(previous.luma - frame.luma) >= 0.2 &&
        Math.abs(next.luma - frame.luma) >= 0.2) candidates.push({ seconds: round(frame.time), kind });
  }
  return candidates;
}

/** Analyze decoded frame summaries. All findings are review leads, never visual/artistic approval. */
export function analyzeVideoFrames(frames, { file, width, height, fps, truncated = false } = {}) {
  if (!Number.isFinite(fps) || fps <= 0 || !Number.isFinite(width) || width <= 0 ||
      !Number.isFinite(height) || height <= 0) throw Error("Video dimensions and frame rate must be positive finite numbers");
  if (!frames.length || frames.some((frame, index) => !Number.isFinite(frame.time) || !Number.isFinite(frame.luma) ||
      !Number.isFinite(frame.change) || !Number.isFinite(frame.low) || !Number.isFinite(frame.high) ||
      frame.low > frame.high || frame.time < 0 || (index && frame.time <= frames[index - 1].time))) {
    throw Error("Incomplete, invalid or unordered FFmpeg frame statistics");
  }
  const duration = frames.at(-1).time + 1 / fps;
  const cuts = frames.filter(frame => frame.cut).map(frame => frame.time).filter(time => time > 0 && time < duration);
  const edges = [0, ...cuts, duration];
  const shots = edges.slice(1).map((end, index) => end - edges[index]).sort((a, b) => a - b);
  const stretches = stillStretches(frames, duration);
  const changes = frames.map(frame => frame.change).sort((a, b) => a - b);
  const typical = changes[Math.floor(changes.length / 2)];
  const reach = Math.max(1, Math.round(fps / 4)), level = Math.max(1.5, typical * 3);
  const events = frames.filter((frame, index) => frame.change >= level &&
    frames.slice(Math.max(0, index - reach), index + reach + 1).every(other => other.change <= frame.change));
  const firstChange = frames.find((frame, index) => index > 0 && (frame.cut || frame.change >= 1.5));
  const stillDuration = stretches.reduce((sum, item) => sum + item.seconds, 0);
  return {
    schemaVersion: 2, file, width, height, fps: round(fps, 3), seconds: round(duration),
    scope: { scannedSeconds: round(duration), truncated, status: "advisory", accessibility: "not-certified" },
    cuts: { count: cuts.length, perMinute: round(cuts.length / duration * 60, 1), times: cuts.map(time => round(time)) },
    shots: { medianSeconds: round(shots.length % 2 ? shots[Math.floor(shots.length / 2)] :
      (shots[shots.length / 2 - 1] + shots[shots.length / 2]) / 2),
    shortestSeconds: round(shots[0]), longestSeconds: round(shots.at(-1)) },
    events: { count: events.length, perTenSeconds: round(events.length / duration * 10, 1), longestGapSeconds: longestGap(events, duration) },
    firstChangeSeconds: firstChange ? round(firstChange.time) : null,
    still: { share: round(stillDuration / duration), longestSeconds: stretches.length ? round(Math.max(...stretches.map(item => item.seconds))) : 0,
      stretches: stretches.map(item => ({ start: round(item.start), seconds: round(item.seconds) })) },
    flashes: flashCandidates(frames),
    dropoutCandidates: dropouts(frames),
    limitations: ["Whole-frame averages can miss local or saturated-red flashes.",
      "Luma statistics cannot establish WCAG flashing conformance or visual quality.",
      "Stillness, cuts and single-frame dropouts are heuristic review candidates, not defects by themselves."],
  };
}
