# Component: Infographic Templates

**Status:** Implementing — all seven catalogued families (five P0, two P1) are registered. The
installed-item evidence (tests, stories, screenshots, clean-install smoke) is **pending**.
**Catalog phase:** docs/12 §3 template catalog; part of the `infographic-system` slice (templates
have no separate registry item).
**Why shared:** A template is a **layout policy, not a skin**: it reads the semantic source, decides
which section plays which role, and hands the engine frames with page numbers attached. Keeping every
family on one policy surface — shared slot names, shared grids, shared section renderers — is what
lets the same source render as an editorial spread, a bento summary or a carousel panel without the
content code changing and without a second copy of the layout maths. Alternatives considered: a
template as a fixed pixel grid (rejected — breaks reflow across output profiles) and a template as a
separate codebase per family (rejected — docs/12 §3: variants are composition policies, not separate
codebases).

**Source:** [`registry/infographic/templates.ts`](../../registry/infographic/templates.ts), with
[`registry/infographic/grids.ts`](../../registry/infographic/grids.ts),
[`registry/infographic/requirements.ts`](../../registry/infographic/requirements.ts) and
[`registry/infographic/layout.ts`](../../registry/infographic/layout.ts) supplying the shared
machinery.

## Contract

- **Use / not use:** use to turn a validated `InfographicSource` into frames (which section sits where,
  on which page, in which semantic slot) before any renderer runs. Templates allocate space; they never
  draw marks, choose colours or sizes, or rewrite content. Do not expect a template to invent a
  section, hide evidence, or fit content by shrinking type below the legibility floor; excess content
  either continues on another page or is reported, never silently dropped.
- **Public API:** `TEMPLATE_INFO` (`Record<TemplateId, TemplateInfo>` — `id`, `label`, `description`,
  `prefers`, optional `requires`, `capacity`), `TEMPLATE_IDS` (catalog order), `scoreTemplate(template, context) → TemplateScore`
  (`{ template, score, feasible, violations }`, score 0–1), `selectTemplate(context, { candidates? }) → TemplateSelection`
  (`{ template, pages, score, candidates }`), `planTemplate(template, context) → TemplatePlan`
  (`{ template, pages, frames, header, unplaced, notes }`), and `frameFor(plan, sectionId, page?)`.
  Supporting types: `TemplateContext` (`{ style, canvas, safe, sections }` plus the optional
  presentation hints `columns`, `density`, `emphasis` and `orientation`), `TemplateFrame`
  (`{ sectionId, frame, page, slot, importance }`), `TemplateViolation`, `TemplateInfo`,
  `TemplatePlan`.
- **Shared machinery — how the families avoid duplicating layout:** every family is registered once in
  `TEMPLATE_INFO` and built by a builder that only emits `TemplateFrame`s. They reuse, unchanged:
  `headerBand`/`HEADER_OF` for the page-1 title band; `editorialGrid` and `bentoGrid` from `grids.ts`
  for cell and tile placement; `splitRows` and `splitColumns` from `primitives.ts` for weighted row
  and column bands (the content-aware sizing in `requirements.ts` belongs to the renderers, not the
  templates); and the engine's single dispatch table `SECTION_RENDERERS` in `layout.ts`, which renders
  each frame's section through the same `blocks.ts`, `visualizers.ts` and `chart.ts` code whichever
  template chose the frame. A new family therefore adds slot allocation and scoring heuristics — not a new grid, a
  new block, a new visualizer or a new chart engine. This is the docs/12 §3 rule: parameterize an
  existing family before adding one.
- **Selection semantics:** `scoreTemplate` starts at `0.4` and applies per-family heuristics; a hard
  requirement that is unmet sets `feasible: false` and returns a low score with a named violation.
  `selectTemplate` ranks candidates feasible-first, then by score descending, breaking ties on
  `TEMPLATE_IDS` catalog order, so selection is reproducible; it returns all candidates best-first so
  a UI can explain the ranking. `planTemplate` chunks content by the family's `capacity` when the
  output profile paginates, otherwise keeps one page and pushes the excess into `unplaced`.
  `buildInfographic` converts each unplaced id into a `section-unplaced` error and each candidate
  violation into a warning (`template-capacity`, `template-few-metrics`, `template-few-sections`,
  `template-requires-process`, `template-requires-chart`, `template-requires-layers`). Slots are
  semantic names (`lead`, `focal`, `supporting-N`, `tile-<column>:<row>`, `entry-N`, `question`,
  `evidence-N`, `takeaway`, `note-before-N`, `note-after-N`, `cover`, `concept-N`, `recap`,
  `context-above-N`, `context-below-N`) precisely so a reflow stays auditable — the same content keeps
  landing in the same slot.
- **The seven families:** all seven families below are registered in `TEMPLATE_INFO`/`TEMPLATE_IDS`
  and selectable through `selectTemplate`; five are P0 (docs/12 §3) and two are P1.

### `editorial-overview` (P0)

- **Purpose:** a claim, one hero visual and two to six supporting blocks on an asymmetric grid with
  evidence notes.
- **Required / optional:** no hard requirement. `prefers` `chart`, `diagram`, `process`, `timeline`,
  `hierarchy`. Capacity **6**; beyond that the profile paginates or the extras are unplaced.
- **Slots:** page-1 header band (20% of the safe height); `lead` = the first section (26% of the
  remaining height); `focal` = the first visual section, pinned into the `editorialGrid` focal cell
  (columns `[2, 2, 3]`, rows `[1, 1]`, gap `spacing[3]`); `supporting-N` = the remaining sections
  poured into the non-focal cells in reading order.
- **Shares:** `editorialGrid`, `headerBand`, and the shared section renderers.

### `bento-summary` (P0)

- **Purpose:** one primary insight plus grouped secondary metrics and illustrations, packed by
  salience.
- **Required / optional:** no hard requirement. `prefers` `statistic`, `chart`. Capacity **6**. The
  scoring nudges toward at least two metric-bearing sections and four or more sections, warning
  otherwise.
- **Slots:** header band (18%); `lead` = first section (22% of the remaining height); the rest become
  `bentoGrid` tiles (4 columns). A chart tile claims a `{ columns: 2, rows: 2 }` span; tile aspect is
  `1.7` for statistics, `1.35` for charts, `1.5` otherwise; placement priority is `max(0, 10 − index)`
  so the earlier tiles get first refusal on space. Slot names are `focal` for a hero placement and
  `tile-<column>:<row>` otherwise.
- **Shares:** `bentoGrid`, `headerBand`, shared renderers.

### `process-journey` (P0)

- **Purpose:** a dominant ordered process with optional branches, plus supporting context blocks.
- **Required / optional:** **requires at least one process section with two or more steps** — the
  scorer returns `feasible: false` with `template-requires-process` otherwise. `prefers` `process`,
  `chart`, `diagram`. Capacity **5**.
- **Slots:** header band (18%); surrounding sections are split into `context-above-N` (the upper half)
  and `context-below-N` (the lower half); the process itself takes the `focal` slot, weighted `3.2`
  against `1` for each context row in `splitRows`, so the sequence is never interrupted by a
  paragraph.
- **Shares:** `splitRows`, `headerBand`, and the process/timeline/hierarchy visualizers.

### `data-story` (P0)

- **Purpose:** a question, its source data as a chart, annotations on the marks and a takeaway.
- **Required / optional:** **requires exactly one chart section** — `feasible: false` with
  `template-requires-chart` when there are zero or more than one. `prefers` `chart`, `statistic`,
  `comparison`. Capacity **4**.
- **Slots:** header band (16%); `question` = the first non-chart text section; `focal` = the single
  chart, weighted `3.4` so it is the largest region and annotations can attach to its marks;
  `evidence-N` = the middle sections; `takeaway` = the last remaining section, weighted `1.2`.
- **Shares:** `splitRows`, `headerBand`, and the shared chart grammar in `chart.ts`.

### `educational-carousel` (P0)

- **Purpose:** cover, then concept and evidence panels, then a recap — one idea per panel across
  pages.
- **Required / optional:** no hard requirement. `prefers` `text`, `chart`, `diagram`, `quote`.
  Capacity **2** sections per middle panel (this family is special-cased in `planTemplate` rather than
  run through the generic chunker).
- **Slots:** page 1 is a cover — a 50% header band reserves room for the title/thesis and the first
  section takes the `cover` slot; each subsequent middle page holds up to two sections as
  `concept-N`; when there are more than two sections the last one becomes a `recap` page. Total pages
  equal the middle pages plus two. Non-paginating profiles keep all middle sections on one page.
- **Shares:** `splitRows` (concept panels), `headerBand`, shared renderers.

### `visual-cheat-sheet` (P1)

- **Purpose:** dense, short entries poured into importance-weighted columns under a deliberately
  quiet header, built for scanning.
- **Required / optional:** no hard requirement, but the scorer rewards six or more sections
  (`+0.28`) or three or more (`+0.14`), warns `template-few-sections` below three, and adds
  `min(0.24, denseCount × 0.06)` where the "dense" kinds are `text`, `statistic` and `comparison`.
  `prefers` `text`, `statistic`, `comparison`. Capacity **8**; exceeding it warns
  `template-capacity`.
- **Slots:** header band (12% of the safe height — intentionally quiet so the entries dominate); the
  rest becomes a multi-column `editorialGrid`. Column count is `clamp(floor(columns ?? 3), 1, 4)`;
  column widths are importance-weighted unless `emphasis` is `"even"` (each section adds
  `importanceWeight − 1` to its column, falling back to even when no column gained). Rows equal
  `ceil(sections ÷ columns)`, and each section takes the next non-focal cell as `entry-N`.
- **Configuration:** `TemplateContext.columns` (1–4, default 3), `TemplateContext.emphasis`
  (`"even"` default here) and `TemplateContext.density` (`"dense"` packs with `spacing[1]`).
- **Shares:** `editorialGrid` — the same multi-column engine as `editorial-overview` — plus
  `densityGap` and the shared planner for pagination/overflow, rather than a bespoke grid.

### `layered-architecture` (P1)

- **Purpose:** a focal layered diagram or hierarchy that dominates a stack of supporting notes and
  annotations.
- **Required / optional:** **requires at least one diagram or hierarchy section** — the scorer
  returns `feasible: false` with `template-requires-layers` otherwise. `prefers` `diagram`,
  `hierarchy`, `text`. Capacity **5** (exceeding it warns `template-capacity`). The score adds
  `+0.32`, plus `min(0.2, layerCount × 0.05)`, and `+0.1` when a text or quote section is present.
- **Slots:** header band (16%); the **first** diagram section (else the first hierarchy) takes the
  `focal` band; the remaining sections split into `note-before-N` (the upper half) and `note-after-N`
  (the lower half). The focal band weight grows with the measured layer count
  (`2 + min(2, max(1, layers) × 0.4)`, or `1.4` when `emphasis` is `"even"`) so a deep stack is given
  the room it needs. With `orientation: "horizontal"` the same weights split columns and the notes
  read left/right.
- **Configuration:** `TemplateContext.orientation` (`"vertical"` default, or `"horizontal"`),
  `TemplateContext.emphasis` (`"focal"` default here) and `TemplateContext.density`.
- **Shares:** `splitRows`/`splitColumns` for the bands and the visualizers' own geometry
  (`diagramLayers`, `hierarchyLayout`) to count layers, so the template and the renderer agree on
  depth instead of adding a second relationship engine.

- **Keyboard / focus:** not applicable — a data module with no interactive surface.
- **Visual states:** not applicable — a template decides composition; the renderers decide appearance.
- **Customization:** the caller can author a template explicitly via
  `buildInfographic(source, { template })` or shortlist candidates via
  `selectTemplate(context, { candidates })`; `presentation` is owned by the art direction
  (`infographic-system`), so a template never carries colours, fonts or marketing copy.
- **Dependencies:** no external runtime dependency — `templates.ts` imports only sibling modules
  (`./art-direction`, `./grids`, `./primitives`, `./types`).
- **Limits:** all seven families are registered and selectable; `TemplateId` (in `types.ts`) and
  `SOURCE_TEMPLATES` (in `validate.ts`) list the same seven ids and must be kept in sync. The
  presentation hints `columns`, `density`, `emphasis` and `orientation` are forwarded by
  `BuildInfographicOptions` and `chooseTemplate`, so a consumer can steer these families from the
  engine; each family applies its own default when a hint is omitted. `capacity` is a fixed
  sections-per-page count, so it interacts with, but does not replace, the content-aware estimate in
  `requirements.ts`; neither is a shrink-to-fit loop.

## Acceptance evidence

- [ ] **Behavior tests executed; commands/results recorded** — **Acceptance evidence: pending.**
  No golden-frame or selection-ranking test (`planTemplate`/`selectTemplate` determinism, per-family
  slots, pagination vs `unplaced`) has been recorded.
- [ ] **axe-core output and manual a11y checks recorded** — **not applicable** to this module
  (data-only); text-recoverability of the visualizers is a separate, unverified claim.
- [ ] **Storybook states complete, including realistic and CJK/long content** — **not run.** No
  template gallery story exists.
- [ ] **Screenshots reviewed across the seven families and the output profiles** — **not run.**
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run.**
- [ ] **Test registry install into fresh fixture passed** — **not run**; templates ship inside the
  `infographic-system` item, whose isolated-consumer `tsc` result is not yet recorded.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — no external
  package is used; bundle impact **not measured**.
- [ ] **Blockers resolved; known limitations named honestly** — the `TemplateId`/`SOURCE_TEMPLATES`
  sync requirement is named above; no blocking issue was found while writing this spec.

**Links to evidence:** `../../registry/infographic/templates.ts` (implementation),
`../../registry/infographic/grids.ts` and `../../registry/infographic/requirements.ts` (shared
machinery), `../../docs/12-infographic-system.md` §3 (catalog). Dedicated tests, stories and
screenshots are **pending**.
