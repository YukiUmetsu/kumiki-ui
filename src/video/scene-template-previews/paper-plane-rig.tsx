import type { FollowSubjectRigProps } from "../../../registry/video/recipes/follow-subject-through-sections";

/**
 * Original paper-plane rig for the follow-subject demo (Kumiki original, no third-party art).
 * Drawn facing +x in a 200×100 box, seen from slightly above and to the side: the far wing
 * rises above the centre crease, the near wing falls below it, and the keel shows under the
 * near wing at the tail. `bank` rolls the wings, `speed` adds a trailing-edge flutter, and the
 * world's light tints every facet. All of it is a pure function of the evaluated state.
 */
export function paperPlaneGeometry(bank: number, flutter: number) {
  const N = [197, 52], R = [20, 50];
  const far = [14, 24 - 8 * bank + flutter * .6], near = [4, 76 + 10 * bank - flutter], keel = [30, 80 + 4 * bank];
  return { N, R, far, near, keel };
}
const lerp = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pts = (...p: number[][]) => p.map(q => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(" ");

export function PaperPlaneRig({ state, reducedMotion, accent = "#e8553f" }: FollowSubjectRigProps & { accent?: string }) {
  const settle = state.arrived;
  const flutter = reducedMotion ? 0 : Math.sin(state.frame * .95) * Math.min(1, state.speed * 2.2) * 1.4 * (1 - settle);
  const bank = state.bank * (1 - settle);
  const { N, R, far, near, keel } = paperPlaneGeometry(bank, flutter);
  // Facet light: the near wing turns to the viewer as it banks down.
  const nearTone = 0.9 + .1 * Math.max(-1, Math.min(1, bank));
  const stripe = (tip: number[]) => pts(lerp(R, N, .12), lerp(R, N, .22), lerp(tip, N, .22), lerp(tip, N, .12));
  const exposure = state.light.exposure;
  return <svg viewBox="0 0 200 100" width="100%" height="100%" style={{ display: "block", overflow: "visible", filter: `brightness(${exposure})` }} aria-hidden="true">
    <defs>
      <linearGradient id="km-plane-far" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset="1" stopColor="#dfe2e3"/></linearGradient>
      <linearGradient id="km-plane-near" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#c9cdd0"/><stop offset=".55" stopColor="#f4f5f3"/><stop offset="1" stopColor="#ffffff"/></linearGradient>
      <linearGradient id="km-plane-keel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9da3a8"/><stop offset="1" stopColor="#6f767c"/></linearGradient>
    </defs>
    <polygon points={pts(N, R, far)} fill="url(#km-plane-far)"/>
    <polygon points={stripe(far)} fill={accent} opacity=".92"/>
    <polygon points={pts(N, R, keel)} fill="url(#km-plane-keel)"/>
    <polygon points={pts(N, R, near)} fill="url(#km-plane-near)" style={{ filter: `brightness(${nearTone})` }}/>
    <polygon points={stripe(near)} fill={accent}/>
    {/* Occlusion along the crease, then the crease itself and the lit leading edges. */}
    <polyline points={pts(N, lerp(R, near, .08))} fill="none" stroke="#3b4247" strokeOpacity=".28" strokeWidth="3.2" strokeLinecap="round"/>
    <polyline points={pts(N, R)} fill="none" stroke="#868d92" strokeWidth="1.6" strokeLinecap="round"/>
    <polyline points={pts(far, N, near)} fill="none" stroke="#ffffff" strokeOpacity=".9" strokeWidth="1.4" strokeLinejoin="round"/>
    {/* The world's light colours the paper. */}
    <polygon points={pts(N, far, R, keel, near)} fill={state.light.color} style={{ mixBlendMode: "multiply" }} opacity=".42"/>
  </svg>;
}
