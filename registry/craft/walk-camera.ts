/** First-person walk camera for exploring any 3D scene (React hook, DOM input only).
 *
 * WASD / arrow keys move, Shift runs, Q/E turn, drag (mouse or touch) looks
 * around. Optional `blocked(from, to)` gives collision and `floorAt(x, z)`
 * the walking surface; the hook outputs a plain `{ position, target }` pose
 * (e.g. for `HeroAssetViewer`'s `camera` prop). Movement integrates real time
 * for interactive use only — record poses or use a planned tour for
 * deterministic video.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface WalkPose { x: number; z: number; yaw: number; pitch: number; /** Eye height above the floor. */ eye: number }
export interface WalkCameraOptions {
  enabled: boolean;
  initial: WalkPose;
  /** Element that receives drag-to-look. */
  surface: RefObject<HTMLElement | null>;
  speed?: number;
  /** Return true to stop a step from `from` to `to` (x, z). */
  blocked?: (from: readonly [number, number], to: readonly [number, number]) => boolean;
  /** Walking surface height at (x, z). */
  floorAt?: (x: number, z: number) => number;
}

export function useWalkCamera({ enabled, initial, surface, speed = 1.4, blocked, floorAt }: WalkCameraOptions) {
  const [pose, setPose] = useState<WalkPose>(initial);
  const keys = useRef(new Set<string>());
  const live = useRef(pose); live.current = pose;
  const deps = useRef({ blocked, floorAt, speed }); deps.current = { blocked, floorAt, speed };
  const teleport = useCallback((p: Partial<WalkPose>) => setPose(cur => ({ ...cur, ...p })), []);

  useEffect(() => {
    if (!enabled) return;
    const pressed = keys.current;
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) { pressed.add(k); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => pressed.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const k = pressed;
      if (k.size) {
        const p = live.current, run = k.has("shift") ? 2.2 : 1, v = deps.current.speed * run * dt;
        const turn = (k.has("q") || k.has("arrowleft") ? 1 : 0) - (k.has("e") || k.has("arrowright") ? 1 : 0);
        const fwd = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
        const strafe = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
        const yaw = p.yaw + turn * 1.6 * dt;
        // yaw 0 looks toward −Z (into the house from the front door).
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        let x = p.x + (fx * fwd + rx * strafe) * v, z = p.z + (fz * fwd + rz * strafe) * v;
        if (deps.current.blocked?.([p.x, p.z], [x, z])) {
          // Slide along whichever axis is still free.
          if (!deps.current.blocked([p.x, p.z], [x, p.z])) z = p.z;
          else if (!deps.current.blocked([p.x, p.z], [p.x, z])) x = p.x;
          else { x = p.x; z = p.z; }
        }
        setPose({ ...p, x, z, yaw });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const el = surface.current;
    let drag: { x: number; y: number } | null = null;
    const pd = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; el?.setPointerCapture(e.pointerId); };
    const pm = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
      setPose(p => ({ ...p, yaw: p.yaw - dx * .005, pitch: Math.max(-1.2, Math.min(1.2, p.pitch - dy * .005)) }));
    };
    const pu = () => { drag = null; };
    el?.addEventListener("pointerdown", pd); el?.addEventListener("pointermove", pm); el?.addEventListener("pointerup", pu);
    return () => {
      cancelAnimationFrame(raf); pressed.clear();
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      el?.removeEventListener("pointerdown", pd); el?.removeEventListener("pointermove", pm); el?.removeEventListener("pointerup", pu);
    };
  }, [enabled, surface]);

  const y = (floorAt ?? (() => 0))(pose.x, pose.z) + pose.eye;
  const camera = {
    position: [pose.x, y, pose.z] as const,
    target: [pose.x - Math.sin(pose.yaw) * Math.cos(pose.pitch), y + Math.sin(pose.pitch), pose.z - Math.cos(pose.yaw) * Math.cos(pose.pitch)] as const,
  };
  return { pose, camera, teleport };
}
