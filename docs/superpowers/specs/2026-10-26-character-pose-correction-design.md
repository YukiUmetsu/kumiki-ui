# Character Joint & Pose Correction — Design

**Status:** approved direction (option B), incremental implementation. The authoring UI belongs to ContentGen; Kumiki owns the deterministic pose math, not an editor or a second clock.

## Interaction

- In **Rig** mode, drag a part to adjust its parent-relative rest X/Y; drag its **joint** handle to change the sprite-local pivot independently, including an animal's shoulder, hip, jaw or tail root. Keep the art visually stationary while moving the joint (even if rest rotation/scale are not identity). Do not assume a humanoid skeleton or proportions.
- In **Animate** mode, pause or scrub the canonical frame timeline; dragging a part inserts an additive per-part correction at that frame with neighboring ease-in/ease-out anchors. Repeated edits at the same frame replace the key, not create duplicate keys. Outside the chosen influence window, the former animation must remain unchanged.
- All edits are preview drafts until export; undo/reset are always available. The source ZIP and approved character revision are not silently rewritten. A revised manifest uses a new revision string.
- Canvas selection and handles must have an equivalent labeled part picker/numeric controls, visible keyboard focus, reduced-motion respect, and low-clutter layout.

## Runtime contract

- Correction tracks live on `CharacterInstance` as `corrections`, keyed by part ID, with `{frame, pose}` additive deltas. Integer nonnegative frames, finite transforms and bounded track sizes. They do not change the CharacterDefinition's action catalog or per-instance autonomy.
- `evaluateCharacter` samples corrections from the **absolute frame**, after action/expression/look/gaze calculations and before final safety limits. Easing is smoothstep between keys, without overshoot; seeks are order-independent.
- Authoring utilities in Kumiki take immutable inputs and return immutable outputs: move part, move pivot preserving art, and insert a correction with influence anchors. World-to-parent coordinate conversion respects transformed parents and rejects singular matrices.

## Explicit boundaries

- Initial drag manipulates part translation and sprite-local joint anchor, not IK or bone mesh deformation. A single-layer flat sprite cannot grow geometry behind its silhouette; alternate artwork is required for large turns.
- No server-side action render/export integration yet; exportable correction data may be previewed in the editor. Animation playback is explicitly marked preview until the project render bridge accepts correction tracks.
- Rendered screenshot and playback sign-off remain separate from unit tests.
