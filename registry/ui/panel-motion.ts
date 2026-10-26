import type { CSSProperties } from "react";

export type PanelSide = "left" | "right" | "top" | "bottom";
export type PanelMotionPreset = "subtle" | "smooth" | "spring" | "snappy" | "none";

export interface PanelMotionSettings {
  /** Transition duration in milliseconds (0–1500). */
  durationMs?: number;
  /** Backdrop duration in milliseconds (0–1500). */
  backdropMs?: number;
  /** Enter/exit displacement as a percentage of the panel's size (0–100). */
  distance?: number;
  /** Backdrop opacity (0–1). */
  opacity?: number;
  /** CSS easing function; applied to gesture release and non-spring panel transitions. */
  easing?: string;
  /** CSS-sampled spring parameters; specify both to opt in. */
  stiffness?: number;
  damping?: number;
}

export type PanelMotion = PanelMotionPreset | PanelMotionSettings;

export interface ResolvedPanelMotion {
  durationMs: number;
  backdropMs: number;
  distance: number;
  opacity: number;
  easing: string;
  spring?: { stiffness: number; damping: number };
}

const DEFAULT: ResolvedPanelMotion = {
  durationMs: 300,
  backdropMs: 220,
  distance: 100,
  opacity: 0.42,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

const PRESETS: Record<PanelMotionPreset, ResolvedPanelMotion> = {
  smooth: DEFAULT,
  subtle: { ...DEFAULT, durationMs: 230, backdropMs: 180, distance: 45, opacity: 0.28 },
  snappy: { ...DEFAULT, durationMs: 185, backdropMs: 150, easing: "cubic-bezier(0.2, 0.85, 0.25, 1)" },
  spring: { ...DEFAULT, durationMs: 360, spring: { stiffness: 350, damping: 34 } },
  none: { ...DEFAULT, durationMs: 0, backdropMs: 0, distance: 0 },
};

function finiteRange(value: number | undefined, fallback: number, min: number, max: number) {
  return value != null && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/** Sample the damped oscillator into native CSS `linear()` easing; no JS animation loop. */
function springEasing({ stiffness, damping }: { stiffness: number; damping: number }, durationMs: number) {
  const frequency = Math.sqrt(stiffness);
  const ratio = damping / (2 * frequency);
  const steps = 20;
  const values = Array.from({ length: steps + 1 }, (_, index) => {
    const time = (durationMs / 1000) * index / steps;
    let remaining: number;
    if (ratio < 1) {
      const damped = frequency * Math.sqrt(1 - ratio * ratio);
      remaining = Math.exp(-ratio * frequency * time) * (Math.cos(damped * time) + ratio * frequency / damped * Math.sin(damped * time));
    } else if (Math.abs(ratio - 1) < 1e-6) {
      remaining = Math.exp(-frequency * time) * (1 + frequency * time);
    } else {
      const root = Math.sqrt(ratio * ratio - 1);
      const slow = -frequency * (ratio - root), fast = -frequency * (ratio + root);
      remaining = (-fast * Math.exp(slow * time) + slow * Math.exp(fast * time)) / (slow - fast);
    }
    return `${(index === steps ? 1 : 1 - remaining).toFixed(4)} ${(index * 100 / steps).toFixed(0)}%`;
  });
  return `linear(${values.join(", ")})`;
}

/** One motion contract for both edge overlays, with safe numerical bounds. */
export function resolvePanelMotion(motion: PanelMotion = "smooth", reducedMotion = false): ResolvedPanelMotion {
  const preset = typeof motion === "string" ? PRESETS[motion] ?? DEFAULT : DEFAULT;
  const resolved: ResolvedPanelMotion = typeof motion === "string"
    ? { ...preset, spring: preset.spring && { ...preset.spring } }
    : {
      durationMs: finiteRange(motion.durationMs, DEFAULT.durationMs, 0, 1500),
      backdropMs: finiteRange(motion.backdropMs, DEFAULT.backdropMs, 0, 1500),
      distance: finiteRange(motion.distance, DEFAULT.distance, 0, 100),
      opacity: finiteRange(motion.opacity, DEFAULT.opacity, 0, 1),
      easing: motion.easing?.trim() || DEFAULT.easing,
      ...(motion.stiffness != null && motion.damping != null &&
        Number.isFinite(motion.stiffness) && Number.isFinite(motion.damping) &&
        motion.stiffness > 0 && motion.damping > 0
        ? { spring: { stiffness: finiteRange(motion.stiffness, 350, 10, 2000), damping: finiteRange(motion.damping, 34, 1, 120) } } : {}),
    };

  if (!reducedMotion && resolved.spring && resolved.durationMs > 0 &&
    (typeof motion === "string" || motion.easing == null)) {
    resolved.easing = springEasing(resolved.spring, resolved.durationMs);
  }

  return reducedMotion
    ? { ...resolved, durationMs: 0, backdropMs: 0, distance: 0, spring: undefined }
    : resolved;
}

export type PanelCSSProperties = CSSProperties & {
  "--km-panel-duration": string;
  "--km-panel-backdrop-duration": string;
  "--km-panel-easing": string;
  "--km-panel-distance": string;
  "--km-panel-backdrop-opacity": number;
};

export function panelMotionStyle(config: ResolvedPanelMotion): PanelCSSProperties {
  return {
    "--km-panel-duration": `${config.durationMs}ms`,
    "--km-panel-backdrop-duration": `${config.backdropMs}ms`,
    "--km-panel-easing": config.easing,
    "--km-panel-distance": `${config.distance}%`,
    "--km-panel-backdrop-opacity": config.opacity,
  };
}
