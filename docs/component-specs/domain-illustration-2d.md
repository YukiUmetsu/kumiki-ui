# Domain Illustration Toolkit (2D) + Finance, Business and Technology Packs

**Purpose:** one dependency-free SVG illustration system for semantic domain objects, so finance, business and technology drawings read as one family and new domains compose primitives rather than copy drawings. Each kind is recognisably distinct; each kind maps to a shared archetype.

## Packs

| Registry item | Contents |
| --- | --- |
| `domain-object-model` | `resolveDomainObject` (kind/ID/title/accent/state validation with a descriptive unknown-kind error), `domainRevealProgress` |
| `domain-illustration-2d` | Tokens, primitives, assemblies, icons, `FitText`, `DomainIllustration` frame |
| `domain-finance-objects-2d` | `FinanceObject2D`: 61 kinds, 26 archetypes (vocabulary in `domain-finance-object-model`) |
| `domain-business-object-model` / `domain-business-objects-2d` | `BusinessObject2D`: 17 kinds, 12 archetypes |
| `domain-technology-object-model` / `domain-technology-objects-2d` | `TechnologyObject2D`: 18 kinds, 15 archetypes |

**Business vocabulary decision:** money-centred business objects (`storefront`, `business`, `retail-store`, `briefcase`, `handshake`, `partnership`, `corporate-office`, `corporate`) stay in the finance vocabulary, because the 3D pack and existing consumers depend on those IDs. The separate business pack covers organisation, planning, process and logistics: `org-chart`, `team`, `meeting`, `presentation`, `kpi-dashboard`, `target`, `milestone`, `deadline`, `workflow`, `checklist`, `idea`, `megaphone`, `global-market`, `delivery-truck`, `shipping-box`, `warehouse`, `factory`.

**Technology kinds:** `server-rack`, `router`, `database`, `storage-disk`, `cloud`, `api`, `laptop`, `mobile-phone`, `cpu`, `ai-model`, `padlock`, `security-key`, `code-terminal`, `container`, `user-identity`, `settings`, `bug`, `git-branch`. No vendor logos, product names, real hostnames, keys or code.

## Public API (all three renderers)

```tsx
<TechnologyObject2D spec={{ id: "primary-db", kind: "database", title?, accent?, state? }}
  frame={42} startFrame={10} revealFrames={24} reducedMotion="auto"
  theme="midnight" tokens={{ accent: "#B5651D" }} showTitle backdrop
  className="…" width={240} height={200} ref={svgRef} />
```

- Forwards SVG props and `ref`; `role="img"` named by an internal `<title>` (`aria-label`/`aria-labelledby` override it). Non-idle `state` is appended to the accessible name and shown as a non-text frame inside the art region.
- `theme`: `midnight` | `paper`; `tokens`: partial `IllustrationTokens` (`canvas`, `text`, `surface`, `deep`, `ink`, `accent`, `accent2`, `positive`, `negative`, `glass`, `highlight`, `shadow`, six-digit hex). Highlight and shade planes are derived from the tokens, so every override stays lit consistently.
- `reducedMotion`: `"auto"` follows `prefers-reduced-motion`; when reduced, the completed state appears at `startFrame` without scale/fade.
- `FinanceObject2D` adds `currencySymbol` (default `$`, 1–3 characters; the `dollar` kind always shows `$`) and `secondaryCurrencySymbol` (default `€`, used by `currency-exchange`).

## Construction rules

240×200 artboard. Art stays in a protected region (y 10–160) and the title in a separate band (y 164–198), so they never overlap. Light comes from the top-left: material gradients run light → base → shade, a bevel rim catches the top edge, and soft contact shadows sit under each object. Keylines use `STROKE` (2 / 1.6 / 1.1) and corners use `RADIUS` (2 / 3.5 / 6 / 10 / 16). Gradient IDs come from `useId`, so any number of instances can share a document or an exported SVG.

Primitives: `Box`, `Shape`, `Orb`, `Shadow`, `Stroke`, `Pipe`, `TextRows` (placeholder bars, never fake data), `Sheet`, `Screen`, `Coin`, `CoinStack`, `Cylinder`, `IsoCube`, `Keys`, `Badge`, `Person`, `Scribble`, `Icon`, plus `gearPath` and `arc`. Assemblies: `Arrow`, `Monitor`, `CalendarBase`.

**`FitText`:** measured SVG text that walks a ladder (1 → 2 → 3 lines, then smaller sizes, floor 11) after the font loads. It uses Japanese-aware breaks: it never splits Latin words or katakana words and never starts a line with closing punctuation. When text still can't fit, it sets `data-km-text-overflow` rather than clipping. `useFitTextGroup` keeps sibling labels at one size. `MetricVisual2D` uses `FitText` for category, value and retention labels; it also draws round axis ticks and proportional funnel flow bands, and moves a value label below its point when the plot top leaves no room.

## Evidence (2026-10-19)

Storybook: `Domains/Finance Objects/All Objects`, `Domains/Business Objects/All Objects`, `Domains/Technology Objects/All Objects`. Each shows every kind in both themes, plus long English, Japanese, custom-token, active/complete-state and 96 px cases. `Domains/Finance & Business/Label Stress 2D` covers the charts. A Playwright review script measured rendered `getBBox` geometry for every illustration (art vs title band, state frame vs title, viewBox containment, overflow flags) and every chart label (pairwise overlap, footer rule): 0 violations across 228 illustrations and 5 charts. Screenshots of both themes were reviewed by eye and the defects found were fixed. **Limits:** the illustrations are flat-shaded icons, not photoreal art. Chart labels can still overflow (and are flagged) when one word is wider than its slot, e.g. 8 marks under about 820 px.
