# ShortHookDirector — opening strategies compiled into MotionDirector data

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0 slice 3 of [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0); it completes Phase 1 together with ShortSafeFrame and CaptionPerformer.
**Scope:** Turns an opening strategy plus subject IDs, a claim, a payoff shot, a duration and optional beat alignment into an **ordinary MotionDirector group** and a hook plan. It adds no renderer, clock or scene format; the caller embeds the group in its film and renders it through its own MotionDirector adapter. It checks what code can know:
- the payoff exists later and resolves the same claim;
- the opening subject is visible at frame 0 in the compiled timeline;
- the opening subject is framed in every output.

It cannot judge whether a hook is compelling or true.

## Reuse and the gap it fills
- **Reused:**
  - **Timeline:** `compileMotionDirector` / `evaluateMotionDirector` (MG1 timeline, schedule, event cues, provenance).
  - **Recipes:** `MotionRecipe` (each node records `short-hook` v1 with strategy, claim, payoff and duration); `sceneContinuityRecipe` (VT1) for transformations that supply scenes.
  - **Checks:** `inspectSafeFrame` for frame-0 framing; `PrincipledProduction` and `MotionPurpose` from `explainer-principles`.
- **The gap:** before this item, MotionDirector had generic recipes but no hook-level contract tying an opening to a claim, a later payoff and frame-0 visibility.

## Install and inspect
- Registry item: `short-hook-director` (`short-hook-director.ts`). It depends on `motion-director`, `explainer-principles` and `short-safe-frame`.
- Storybook: **Visual → Short Hook Director**.
  - **15-second explainer:** the Phase 1 demonstration, a vertical film (hook 0–90, mechanism 90–300, payoff 300–450) for three topics: technology (routing), finance (compound interest) and physical logistics (route consolidation). It has three interchangeable openings (action-first, impact-statistic, evidence-question).
    - Each opening runs through ShortSafeFrame (reserved UI) and CaptionPerformer (phrase captions, authored timing).
    - The panel shows the beat plan, the payoff link, seek parity over 48 random frames, and the full `inspectExplainerPrinciples` report.
    - Facts are labelled illustrative unless sourced.
  - **Strategy reference:** all five strategies on abstract subjects, scrubbable, showing the opacity, scale, offset, emphasis and progress channels per beat.

## Minimal usage
~~~ts
const hook = compileShortHook({
  id: "hook", fps: { num: 30, den: 1 }, durationFrames: 90,
  claimId: "next-hop", payoffId: "payoff", subjectIds: ["packet", "server"],
  roles: { strategy: "action-first", actor: "packet", focus: "server" },
  align: { focus: 48 }, // optional, e.g. from narration alignment
}, { production, outputs: [{ profile, layout: frameZeroBounds }] });
if (!hook.ok) throw new Error(hook.diagnostics.map(d => d.message).join("\n"));

const film = compileMotionDirector({ ...direction, children: [hook.node, bodyContinuingFrom(hook.plan.endState)] });
const manifest = { ...rest, ...hook.plan.principles }; // opening + hook for inspectExplainerPrinciples
~~~

## Contract
- **Strategies (`roles.strategy`):**

  | Strategy | Opening subject (visible at frame 0) | Beats and purposes |
  | --- | --- | --- |
  | `action-first` | `actor`, already underway (`startProgress`, default 0.3) | open (attract-attention) → focus (direct-focus) on optional `focus` → question |
  | `unexpected-reveal` | `familiar`; `reveal` rises in. Requires `surprise` text | open → reveal (reveal-evidence) → question |
  | `impact-statistic` | `metric` at full value (optional `countUpFrames`) | open → context (illustrate-scale): a separate `context` subject appears → question |
  | `transformation` | `before`; becomes `after` via VT1 scenes or a crossfade with `progress` | open → transform (compare-alternatives) → question |
  | `evidence-question` | `evidence`; `focus` is emphasised | open → focus (reveal-evidence) → question |

  - The beats default to proportions of the duration. `align` overrides beat starts in hook-local frames. The open beat is always frame 0, and each beat needs at least 4 frames.
  - An optional `questionId` element fades in on the question beat. Each beat also emits an MD1 `event` cue `hook:<role>` for captions and audio.
- **Channels:** these form the adapter contract.
  - `opacity` 0..1.
  - `scale` (1 = rest) and `offset` (vec2, output px) are marked decorative, so `profile.intensity` may soften them.
  - `emphasis` 0..1.
  - `progress` 0..1, for an action, a count-up or a transformation the adapter plays.
- **Plan:** `beats`, `principles` (`opening` and `hook` for `inspectExplainerPrinciples`), and `endState`. `endState` holds every channel value at the last hook frame, so the following choreography can start from it. MotionDirector rejects a jump (`director-discontinuous-channel`).
- **Diagnostics:**
  - Errors:
    - `hook-invalid` (under 30 frames, missing claim or payoff);
    - `hook-role-not-subject`, `hook-surprise-missing`;
    - `hook-fact-unsourced`, `hook-fact-unit-missing`, `hook-statistic-without-context`;
    - `hook-align-invalid`;
    - payoff anchor: `hook-claim-unknown`, `hook-shot-missing`, `hook-shot-length`, `hook-payoff-missing`, `hook-payoff-before-hook`, `hook-payoff-unrelated` (the payoff shot's `outcomeIds` lacks the claim);
    - frame 0: `hook-opening-invisible` (evaluated on the compiled timeline), `hook-opening-unframed` (per output, through ShortSafeFrame);
    - plus any MotionDirector compile diagnostics.
  - Warnings: `hook-payoff-unverified` (no production passed), `hook-payoff-purpose`, `hook-action-not-underway`.
- **Limits:**
  - The checks are structural. Whether the surprise is accurate, the number meaningful or the payoff satisfying stays an authoring and review responsibility; retention data belongs to the production app.
  - Framing is checked at frame 0 only. Later hook frames need CC1 or ShortSafeFrame samples.
  - Beat alignment takes frames, not narration IDs; an AudioVisualCue bridge is still proposed.
  - The 3D or VT1 transformation path depends on supplied scenes. Without them, the transformation is a crossfade.

## Verification (2026-10-22)
- `npx vitest run tests/visual-production.test.ts`: four hook cases.
  - **Reuse:** all five strategies × finance, technology and physical-object topics compile with no errors. Frame-0 opacity is 1 on the compiled timeline, recipe provenance is recorded, and seek parity holds.
  - **Payoff anchor:** every payoff error above is produced.
  - **Content checks:** unsourced facts, missing context, missing surprise, undeclared roles and invalid alignment are rejected; aligned beats emit event cues at the aligned frames.
  - **Framing and continuity:** frame-0 framing fails outside the safe area; a body continuing from `endState` compiles, and a jump is rejected.
- Rendered in Storybook at 1100 px and reviewed by the agent: the three topics with all three openings, the payoff frame and the strategy reference.
  - Seek parity held on every film, captions were `ready` and there were no console errors.
  - The principles report shows only the honest warnings: portrait only (`aspect-missing`) and `visual-review-pending`.
  - Fixed after review:
    - a finance caption needed three lines against a two-line budget (CaptionPerformer refused it, so I shortened the caption and surfaced caption diagnostics in the panel);
    - subjects ended exactly on the action column edge;
    - one hook caption was longer than the 3-second hook could hold;
    - the reference cards were too tall.
- **Human visual review:** pending. The demo uses authored caption timing and illustrative figures, and no audio.
