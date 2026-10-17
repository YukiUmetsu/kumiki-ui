/**
 * Kumiki motion primitives — public barrel (docs/08 MG1).
 *
 * Renderer-neutral, typed, deterministic 2D motion. No runtime dependency:
 * every module here is pure TypeScript, so an ordinary UI/2D install never
 * pulls a 3D renderer, an exporter or a playback engine (docs/08 §1.6).
 *
 * Ownership (docs/07): this barrel is the `motion` primitive surface —
 * timelines/easing/springs/stagger/paths/trim/morph/masks/shared-element/
 * presets/kinetic-text/storyboard. Rendering adapters and the wire document
 * live in docs/11; nothing here reaches into `src/`.
 */

export * from "./types";
export * from "./constants";
export * from "./diagnostics";
export * from "./matrix";
export * from "./easing";
export * from "./springs";
export * from "./interpolate";
export * from "./stagger";
export * from "./timeline";
export * from "./serialize";
export * from "./validate";
export * from "./paths";
export * from "./trim";
export * from "./morph";
export * from "./masks";
export * from "./shared-element";
export * from "./presets";
export * from "./kinetic-text";
export * from "./storyboard";
export * from "./camera";
