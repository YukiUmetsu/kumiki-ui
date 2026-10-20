# Unified component catalog (UC1)

**Purpose:** One lightweight, source-grounded discovery interface for developers and AI agents. Search **actual installable registry packs**, individual semantic domain objects and the existing curated finance 3D hero assets without executing renderers, using embeddings or inventing install commands.

## Where to search

| Interface | What it returns |
| --- | --- |
| Showcase app `#/catalog` | Responsive browsable search; domain / renderer / level filters, registry dependency inspector, source and docs links, verified Storybook previews |
| Storybook **Discover → Unified Component Catalog → Browse** | The same searchable gallery in existing Storybook |
| `npm run catalog:find -- --query="ATM"` | Concise developer-readable results |
| `npm run catalog:find -- --query="cash machine" --type=object --renderer=three --format=json` | Deterministic, machine-readable results |
| `npm run catalog:find -- --id=object:finance:credit-card:2d --format=json` | Exact one-item retrieval without name ambiguity |
| `npm run catalog:find -- --all --format=json` | Entire machine-readable catalog (stdout; pipe to a JSON file if desired) |
| `npm run catalog:check` | Drift check: registry, named vocabulary, curated hero definitions, linked docs and actual Storybook exports |

The catalog provides each item's `id`, `type`, `name`, `domain`, `renderer`, `title`, `description`, `registryItem`, `files`, `installOrder`, `dependencies`, `keywords`, optional `storyId`/`storyParams` and `docs`, and an **evidence-based** `review` status. IDs are stable namespaced identifiers: `pack:button`, `object:finance:atm:3d`, `hero:bull-market`.

`registryItem` means a real item from `registry.json`. `installOrder` is dependency-first closure of its sibling registry dependencies; this is an install plan, **not** a fabricated `npx shadcn add` URL. Use a pinned, published registry URL when installing in external projects. Components are source-distributed and can be customized after installation.

## Authoritative data and lightweight code

- **Pack records:** `registry.json`; no second handwritten inventory.
- **Domain objects:** the existing `FINANCE_OBJECTS`, `BUSINESS_OBJECTS` and `TECHNOLOGY_OBJECTS` typed vocabularies. Every finance object has 2D and 3D search variants; business/technology objects have 2D variants. Do not present nonexistent per-object 3D installs.
- **Heroes:** curated descriptions in `src/catalog/catalog-hero-summaries.ts`, automatically checked for exact kind/title/meaning parity with finance heroes in `registry/domains/hero-catalog.ts`. Other domain hero scenes are not offered as **installable** standalone entries until they have a registered source pack.
- **Human links:** the small `catalog-metadata.ts` map. CI verifies its Storybook IDs and document paths. A preview is **omitted**, not guessed, when no valid story is mapped.
- **Review status:** 3D results say `not-reviewed` unless explicitly listed in `docs/verification/hero-approvals.json`. A model's presence in the catalog is not a photorealism claim.
- **Search:** `catalog-core.ts` performs deterministic exact/partial token matching and curated synonyms (including “cash machine”→ATM, “cheque”→bank check). No vector database, LLM, remote API, fuzzy screenshot matching or telemetry.
- **Agent CLI:** Node 24 + the existing dev dependency TypeScript parses literals from domain contracts and Storybook files **without evaluating their UI code**. It shares `buildCatalog` and `searchCatalog` with the browser.

For discoverable terms, add a small, meaningful synonym to `EXTRA_SYNONYMS` in `catalog-core.ts`. Do **not** duplicate registry definitions or introduce industry-specific logic in source-distributed packages. Do not mark a preview for a nonexisting story. To add a domain, extend the typed vocabulary plus the catalog's explicit mapping, validate its pack and preview, then run `npm run catalog:check`.

## Agent workflow

1. Search by **meaning**: `npm run catalog:find -- --query="money transfer" --format=json`.
2. Prefer the smallest installable pack compatible with the desired renderer. Prefer 2D SVG when a full 3D engine adds no educational value.
3. Inspect `files`, `installOrder`, `dependencies` and `docs`. Read component source for exact props and public API: **the search index is not an API schema**.
4. Open the verified Storybook preview if available. Confirm 3D `review` status before relying on close-up visual realism.
5. Compose using existing semantic/frame contracts. Avoid recreating an equivalent component under a new name.
6. After implementing new components, changing domain kinds, or moving stories, run `npm run catalog:check` and the existing TypeScript, unit, registry and clean-consumer installation suites.

## Not in scope yet

No new drag-and-drop editing application, RAG/embedding service, MCP server, cloud search infrastructure, thumbnail generation, vector/image similarity, LLM evaluation or duplicated component library. No automatic publishing or installing source into user projects from a browser.

**Completion proof:** deterministic parity check in GitHub Actions, tests for human and machine discovery, no renderer package imported into the catalog browser bundle, and all claims reflect existing registry data. This system improves **discovery**, not 3D craftsmanship by itself.
