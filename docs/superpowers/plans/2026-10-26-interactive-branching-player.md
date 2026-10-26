# Interactive branching player implementation plan

1. Verify existing catalog and playback primitives; choose native video plus a
   pure state model. Do not depend on Character2D PR #41.
2. Add failing model tests for checkpoint ordering, seek gating, one-time score,
   reaction return, branching, completion, rank and invalid story references.
3. Implement and typecheck the model until focused tests pass.
4. Add failing accessible player tests for timed pause, quiz choice, reaction,
   resumed playback, personal data, theming, actor slots and localization.
5. Build the reusable React player, styled frame and quiet motion treatment.
6. Add Storybook forest/theater demos, consumer docs, registry and catalog links.
7. Run focused and full verification, skeptical review, fix findings, then
   publish a GitHub PR containing all recovery work. Keep unverified browser QA
   clearly described in the PR if it cannot be completed.
