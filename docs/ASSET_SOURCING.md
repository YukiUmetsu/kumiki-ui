# Kumiki-UI — External Asset Sourcing Policy

> **Applies to:** All coding and content-generation agents, reusable Kumiki-UI components, sample scenes, animation templates, and production videos.
> **Goal:** Deliver premium visual quality faster without creating licensing or redistribution risks.
> **Media directory reviewed:** 2026-10-28. Recheck the specific asset's terms at acquisition time; older 3D entries retain their original review dates.

## Agent directive

**Look for suitable existing 3D assets before modeling complex objects or characters from scratch.** Reuse a high-quality asset when it saves meaningful time, improves fidelity, or avoids redundant work. Good reuse is encouraged—not required if a simple procedural shape, existing Kumiki primitive, or original asset is better.

A site being free, having a free-download button, or allowing commercial use does **not** automatically mean its files may be included in Kumiki-UI's distributed source, npm package, templates, or example downloads. Verify the **specific asset** and **intended distribution**.

**Never silently use unlicensed, non-commercial, editorial-only, or unverifiable assets.** If a suitable asset has unclear terms, choose another, create an original replacement, or flag the blocker.

## Preferred sources (start here)

| Source | Good for | License/use rule | Can bundle raw assets in distributable Kumiki-UI? |
| --- | --- | --- | --- |
| [Poly Haven](https://polyhaven.com/models) | Photorealistic objects, environments, HDRIs | Site assets CC0 | **Yes**; preserve provenance |
| [ambientCG](https://ambientcg.com/) | PBR materials, textures, HDRIs, some models | Site assets CC0 | **Yes**; preserve provenance |
| [Kenney](https://kenney.nl/assets) | Consistent low-poly objects, stylized characters | Check **each pack**; CC0 packs are preferred | **Yes for verified CC0 packs** |
| [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) | **Realistic people**: 115 rigged adults, children and profession outfits; 326+ shared clips (idle, walk, talk); facial bones and viseme/FACS blendshapes | MIT (repository `LICENSE.md`) | **Yes**; ship the MIT notice beside the files and record the source revision |
| [MakeHuman / MPFB2](https://static.makehumancommunity.org/mpfb/faq/can_i_sell_models.html) | Custom realistic bodies generated in Blender | Core assets (base mesh, targets, skins) CC0; third-party skins/clothes keep their own licenses | **Yes** when only CC0 core assets are used; needs Blender to author |
| [Sketchfab](https://sketchfab.com/features/free-3d-models) | Detailed people, vehicles, architecture, niche objects | License varies **per model**; CC BY requires attribution; avoid NC/editorial | Only if the **specific license** permits redistribution and obligations are met |
| [Poly Pizza](https://poly.pizza/) | Lightweight low-poly props and characters | License varies **per model** (Creative Commons); obey site access terms | Only if the **specific license** permits redistribution and obligations are met |
| [Quaternius](https://quaternius.com/) | Characters, animals, buildings, ready-made game-style animation | QAL v1.0 (updated 2026-08-28) allows free commercial projects; **no extraction, repackaging or redistribution, free or paid**. Older downloads may carry earlier terms; verify per release | **No** for raw/modified models in an asset library or template |
| [Mixamo](https://www.mixamo.com/) | Humanoid rigs, walk cycles, gestures and animations | Free commercial projects; **do not redistribute raw characters/animations as assets** | **No** for reusable raw model/animation packages |
| [Fab](https://www.fab.com/) | Specialized realistic/stylized models | License varies **per listing**; Standard permits commercial projects but bans standalone redistribution; CC BY needs attribution | **Only** when the selected listing's license authorizes distribution in this form |

Source terms: [Poly Haven](https://polyhaven.com/license) · [ambientCG](https://docs.ambientcg.com/license/) · [Kenney example pack](https://kenney.nl/assets/mini-skate) · [Quaternius](https://quaternius.com/license.html) · [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) · [Adobe redistribution guidance](https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400) · [Fab EULA](https://www.fab.com/eula) · [Poly Pizza terms](https://poly.pizza/docs/tos) · [Sketchfab download guidelines](https://sketchfab.com/developers/download-api/guidelines).

These are *starting points*, not blanket approvals of every model found on them. The creator's rights, asset page, applicable license version, and website usage terms still matter.

## Photography, footage and audio

Use these sources for the shot grammars in [premium scene animation](24-premium-scene-animation.md). The classification concerns the named license, not every item or possible output. Free finished-video use does not automatically authorize shipping the source media in a component or template.

| Source | Best fit | Rights and distribution |
| --- | --- | --- |
| [Pexels](https://www.pexels.com/) | Photography and footage for establishing shots, detail and demonstrations | **Free with restrictions**; [license](https://www.pexels.com/license/) permits commercial use without credit; [terms](https://www.pexels.com/terms-of-service/) prohibit standalone distribution. Do not bundle raw Pexels-licensed files without specific clearance; some items are separately marked CC0. |
| [Pixabay](https://pixabay.com/) | Images, video, music and effects | **Free with restrictions**; [license](https://pixabay.com/service/license-summary/) permits free use without credit but prohibits standalone distribution. Verify the item and applicable license; music can produce [Content ID claims](https://pixabay.com/service/faq/). Do not bundle raw Content License files. |
| [Unsplash](https://unsplash.com/) | Editorial photography and detailed stills | **Free with restrictions**; [terms](https://unsplash.com/terms) allow commercial use without attribution but restrict compiling a competing service. Confirm template and raw-file distribution for the intended output before bundling. |
| [Mixkit](https://mixkit.co/) | Footage, music and sound effects | **Free with restrictions**; [licenses vary by media type and video item](https://mixkit.co/license/). Music permits specified online commercial uses but excludes games, broadcast and physical media under its [music license](https://mixkit.co/license/modal/musicFree/). Verify redistribution before bundling. |
| [Freesound](https://freesound.org/) | Field recordings and sound effects | **Per-item license**: CC0, CC BY or CC BY-NC; check the sound page and avoid NC for commercial use. CC0 is preferred for distributable fixtures; verify provenance and other rights. [FAQ](https://freesound.org/help/faq/). |
| [Wikimedia Commons](https://commons.wikimedia.org/) | Historical images, recordings and footage | **Per-item license**; inspect the file page, source, attribution and applicable restrictions. See [reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/licenses/en). |
| [Openverse](https://openverse.org/) | Search across image and audio collections | **Per-item license**; discovery index, not a license grant. Verify the original source and its terms before acquisition. [About](https://openverse.org/about). |
| [Coverr](https://coverr.co/) | Stock footage and music for establishing shots and atmosphere | **Free with restrictions**; its [license](https://coverr.co/license/) permits commercial projects without attribution, but prohibits redistribution of videos and use in competing services, including certain theme and app builders. Do not bundle raw footage; check terms for music separately. |
| [NASA Image and Video Library](https://images.nasa.gov/) | Earth, space, missions and archival imagery | **Free with restrictions**; NASA content is generally not subject to US copyright, but [NASA's guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) protect identifiers and require attention to third-party content, identifiable people and implied endorsement. Verify each item's provenance and intended use. |
| [Free Music Archive](https://freemusicarchive.org/) | Music for documentary, atmospheric and editorial sequences | **Per-track license**; [license guide](https://freemusicarchive.org/License_Guide) includes CC0 and Creative Commons options. Avoid NC for commercial work and ND for music synchronized to video; comply with attribution and any share-alike terms. |
| [ZapSplat](https://www.zapsplat.com/) | Production sound effects and music | **Free with restrictions**; its [standard license](https://www.zapsplat.com/license-type/standard-license/) requires Basic users to credit ZapSplat and limits free downloads to MP3. Some items use other licenses; check each item and raw redistribution rights. |

### Editing references and motion inspiration

These sources can inform pacing, shot composition and typography. An editor template is not automatically a reusable React component or permission to distribute its source, media, fonts or plugins.

| Source | Use and rights |
| --- | --- |
| [Mixkit video templates](https://mixkit.co/free-video-templates/) | **Free with restrictions**; free commercial templates for Premiere Pro, After Effects, Final Cut Pro and DaVinci Resolve. Check the item format, editor version, dependencies and [template license](https://mixkit.co/license/) before use or distribution. |
| [Motionographer](https://motionographer.com/) | **Inspiration only**; professional motion design and visual storytelling. Do not extract or republish showcased work without separate permission. |
| [Art of the Title](https://www.artofthetitle.com/) | **Inspiration only**; title sequences and editorial typography. Study technique; the featured films and graphics are not licensed by the directory for reuse. |
| [STASH](https://www.stashmedia.tv/) | **Inspiration only**; animation and VFX references; archive access may require payment. Verify separate rights before using any featured work. |

### First-shot research: `question-reveal`

These candidates are references for a machine-led premise, not a matched shot sequence or a verified finished scene. Review the actual media, crop, action continuity and sound at playback speed before selection. No files have been acquired or approved for inclusion.

| Candidate | Fit and verified status |
| --- | --- |
| [CNC machine close-up](https://www.pexels.com/photo/close-up-photo-of-metal-tool-10406128/) — Daniel Smyth | Free still, 4349 × 4000; useful for detail framing. **Free with restrictions** under Pexels terms; raw redistribution is not cleared. |
| [Industrial machinery at work](https://www.pexels.com/video/industrial-machinery-at-work-in-a-factory-30183217/) — Nova lv | Free working-machine footage; candidate for an observable action, subject to editorial review. **Free with restrictions** under Pexels terms; raw redistribution is not cleared. |
| [Manufacturing](https://www.pexels.com/video/manufacturing-852341/) — Distill | Milling-machine footage; the item page marks it **CC0**, with no attribution required. Check source authenticity and third-party rights before bundling. |
| [Organic Machine](https://freesound.org/people/mitchelk/sounds/136873/) — mitchelk | 4.3-second stereo WAV, **CC0**, no attribution required; experimental mechanical cue, not a verified match until heard against the edit. Check provenance before bundling. |

The still and footage are independent sources: do not imply they show the same machine or a real before/after event. Find matched material or author the relationship explicitly.

## Clearance rules by deliverable

**A. Reusable library / public repository / distributed npm package / downloadable scene template**
- Default to self-created assets and verified **CC0** assets.
- **CC BY** may be included only if redistribution and modification are permitted, the exact version and author are recorded, required credit/license/change notices ship with the asset, and no conflicting restrictions are imposed. Keep third-party assets under their own licenses; do **not** represent them as Kumiki-UI-owned or automatically MIT-licensed.
- Avoid CC BY-SA by default due to share-alike obligations; seek explicit review before use. Avoid ND when modifications are required.
- **Never** bundle Mixamo, Quaternius QAL, Fab Standard, or similarly non-redistributable raw assets as reusable content. Renaming, converting to GLB, retopologizing, or modifying them does not bypass the restriction.

**B. Finished media (rendered video, image, thumbnail)**
- Use CC0, properly attributed CC BY, or a commercially usable project license (e.g., applicable Quaternius QAL, Mixamo, Fab Standard) when its exact terms permit this output.
- A rendered video does not normally expose source GLB/FBX files. Do not also ship a downloadable source scene containing restricted assets without separate permission.
- Record any required attribution for video descriptions or associated credits.

**C. Finished application/game**
- Commercial-use project licenses may permit incorporation into a completed application, subject to their conditions. This **does not** imply permission to package models as an extractable asset collection, SDK, asset marketplace item, or library. Review the exact distribution and extraction restrictions.

## License decision checklist (do this before importing)

1. **Identify:** Exact model/pack URL, original author, and legitimate host (not a reupload of unclear origin).
2. **Verify:** Actual asset license, version, acquisition date, and any creator-specific conditions—not merely a site's homepage claim.
3. **Commercial clearance:** Monetized educational videos, ads, client work, and paid software must all be allowed for the intended use.
4. **Distribution clearance:** Will users receive a raw or easily extractable `.glb`, `.gltf`, `.fbx`, texture, rig, animation, or template? If yes, confirm **redistribution**, not just commercial end-product use.
5. **Attribution:** Provide author/title/URL, license link, modifications, and any retained notices where required. Generate appropriate credits for both the package and video output.
6. **Other rights:** Check trademarks, recognizable people, branded products, and third-party intellectual property independently of the download license.
7. **Tool/site access:** Respect logins, API conditions, rate limits, robots policies, and no-scraping terms. Do not hotlink assets without permission. Do not use bots to download from a site that forbids it.
8. **Record:** Add the source to the asset manifest **before** committing or publishing. If the license cannot be verified, **do not import** it.

**License shorthand**
- **Preferred:** CC0; original in-house assets.
- **Acceptable with compliance:** CC BY (credit and notices); other express licenses for the **specific** output.
- **Escalate / avoid by default in distributable assets:** CC BY-SA, CC BY-ND, custom licenses with ambiguities.
- **Reject for commercial outputs:** CC BY-NC, CC BY-NC-SA, CC BY-NC-ND, editorial-only, personal-use-only, unknown/no license.

## Visual and runtime acceptance criteria

An external asset must *also* be useful for the production:
- Matches the requested art direction, material realism, proportions, and level of detail; avoid inconsistent mixed-asset aesthetics.
- Prefer **GLB/glTF** for Three.js. Convert FBX/OBJ/BLEND offline when needed and legally permitted; preserve UVs, textures, skeleton, morph targets, and animation clips.
- Normalize scale, orientation, pivot, material response, texture color space, and lighting integration. Preserve realistic anatomy and usable rigs for character animation.
- Optimize geometry, texture resolution, draw calls, and file size for the target video/render pipeline; keep sufficient close-up detail. Use mesh/texture compression only if the renderer supports it.
- Validate that the asset loads and renders in the actual Kumiki-UI scene; a preview thumbnail or file extension is not sufficient verification.
- Integrate through a reusable loader, metadata, transforms, named animation hooks, and timeline controls—not a bespoke hard-coded scene when general reuse is practical.

## Required provenance record

Add an entry to `assets/THIRD_PARTY_ASSETS.json` for every external asset used or bundled. Use this schema (adjust paths and values to the real model):

```json
[
  {
    "id": "living-room-chair-01",
    "assetPath": "assets/models/chair.glb",
    "name": "Example Chair",
    "creator": "Example Creator",
    "sourceUrl": "https://polyhaven.com/a/REPLACE_WITH_REAL_ID",
    "license": "CC0-1.0",
    "licenseUrl": "https://polyhaven.com/license",
    "acquiredOn": "2026-10-21",
    "modifications": ["converted to GLB", "normalized scale"],
    "intendedUse": "library-distribution",
    "redistributionVerified": true,
    "attributionRequired": false
  }
]
```

The example record above is **illustrative, not an approved asset**. Use genuine source URLs, licenses, and facts; never invent evidence. For project-only restricted assets, keep source files out of distributable packages (and public source repos if they expose prohibited raw redistribution), and record them in a **private production asset manifest** instead. If the manifest does not yet exist, create it for real additions. Store attribution and license notices alongside distributable assets; video credits can be generated from the manifest.

## People and characters

Prefer **Rocketbox** for realistic people (distributable under MIT), MakeHuman/MPFB2 CC0 core assets for custom bodies, and verified CC0 Kenney packs for stylized figures. Never use Mixamo or Quaternius characters in distributable content (see the table above).

- Convert with `node scripts/people/rocketbox-to-glb.mjs <avatarDir> <config.json> <out.glb>`: PBR materials, 1024 textures, metres, and clips retargeted by bone name. No new dependencies. Example configs: `scripts/people/female-adult-01.json`, `scripts/people/construction-male-04.json`.
- Register each new person in `registry/domains/people-model.ts` (`PEOPLE_3D`), add a story export in `src/domains/people-3d.stories.tsx`, and add search synonyms in `src/catalog/catalog-core.ts`; `npm run catalog:check` verifies all three. Load with `loadPerson3D(kind)` (see [People 3D](component-specs/people-3d.md)). For other rigged models, call `loadGltfHero(url, { restPose: { action: "idle" }, license })` directly so the figure rests in a natural stance, not its T/A bind pose.
- Use the base mesh by default. The `_facial` variants add 175 blendshapes, which glTF stores as full-vertex morph targets (roughly 100 MB). Include only a selected subset when lip-sync is actually needed.
- Give every person the same action ids: `idle`, `talk`, `walk`, `wave`, `look-around`, `think`, `crouch`. Mark walks `"inPlace": true`. The converter reports metres per cycle, and scenes move the figure at that speed so the feet don't slide.
- Check faces at the 1024 texture size. Fine-mesh visors (for example `Construction_Male_01`) average out into an opaque screen, so prefer an avatar with an open face.
- Avoid profession outfits with real-world insignia (police, fire and similar) unless the scene needs them and they carry no real organization's marks.
- Review: `npm run hero:capture -- --asset=<kind> --story=domains-people-3d--<kind> --views=quarter,front,side,close` (add `--action=walk --frames=0,9,18,27` for clips). Storybook: **Domains/People 3D** has action buttons, play/pause and a frame scrubber.

## Agent workflow

1. Search existing Kumiki-UI primitives and the project's approved asset catalog.
2. If a complex asset is missing, search preferred external libraries; compare **fit, quality, cost, license, file size, and integration work**.
3. Select the most maintainable option: procedural code for simple geometry; third-party art for expensive modeling/rigging; custom art where external assets cannot match the look.
4. Run the license checklist. If acquisition isn't possible with available tools, supply the exact candidate URL and license status rather than pretending the file is present.
5. Import, optimize, validate visually/technically, and register provenance.
6. In the completion report, include a compact line: **asset source · license · intended output · attribution · redistribution status**.

## Required agent behavior

**Do:** proactively reuse eligible assets when they materially improve speed or quality; prefer CC0 for a reusable library; distinguish *using an asset in a video* from *shipping its source*; preserve licensing records; implement polished, composable animations.

**Don't:** spend hours procedurally recreating a detailed asset that already exists legally and fits the scene; assume “free” means unrestricted; fetch assets by scraping prohibited sites; silently add license-restricted binaries to packages; assert a license was verified without inspecting the actual source.
