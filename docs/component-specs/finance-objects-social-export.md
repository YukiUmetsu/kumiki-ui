# Finance and Business Object Kit (FO1) + Social Export Profiles (VE2)

**Purpose:** give educational video authors editable and reusable **objects**, not just financial charts. Share semantic identity and absolute-frame animation between 2D SVG and true Three.js 3D. Extend the existing FB1 charts and VE1 video export without introducing a new motion engine.

## Component catalog

The 61 supported IDs are grouped into **26 reusable geometry families**, not 61 individually maintained duplicate renderers. The full list is in `FINANCE_OBJECTS` and the searchable Storybook gallery `Domains/Finance Objects/All Objects`.

| Family | Available variants |
| --- | --- |
| Institution | `bank`, `bank-branch`, `investment-bank` |
| Accounts | `bank-account`, `checking-account`, `savings-account` |
| Cards | `credit-card`, `debit-card`, `gift-card` |
| Terminals | `atm`, `payment-terminal`, `cash-register` |
| Documents | `loan`, `loan-agreement`, `contract`, `invoice`, `receipt`, `tax-return`, `insurance-policy` |
| Cash & coins | `dollar`, `banknote`, `cash-stack`, `coin`, `coins`, `interest` |
| Storage | `wallet`, `piggy-bank`, `safe`, `vault` |
| Real estate | `house`, `mortgage` |
| Business | `storefront`, `business`, `briefcase` |
| Markets | `investment`, `stock`, `growth`, `profit`, `loss` |
| Calculations | `calculator`, `budget` |
| Risk | `insurance`, `risk` |
| Transfers | `transfer`, `transaction`, `currency-exchange` |
| Partnerships | `handshake`, `partnership` |
| Scheduling | `repayment`, `payday` |
| Realistic trading hardware | `stock-workstation`, `stock-chart`, `financial-dashboard` |
| Industrial machinery | `money-printing-press` |
| Cash objects | `money-bag`, `bank-check` |
| Business architecture | `corporate-office`, `corporate`, `retail-store` |
| Market sentiment | `bull-market`, `bear-market` |

All variants have a stable `id`, descriptive `kind`, optional title/accent and state. Their 3D assets are procedural geometry with physically based materials and named `userData.semanticId` nodes. **No external imagery, logos, invented card numbers, realistic statements or account credentials** are produced. A semantic object is an explainer visual, not a bank UI mockup or usable ATM emulator.

```tsx
import { FinanceObject2D } from "./components/domains/finance-object-2d";
import { FinanceObject3D } from "./components/domains/finance-object-3d-stage";
const card={id:"customer-card",kind:"credit-card" as const,accent:"#66DACA"};
<FinanceObject2D spec={card} frame={42} startFrame={10} revealFrames={24}/>
<FinanceObject3D spec={card} frame={42} startFrame={10}
  revealFrames={24} durationFrames={180} width={1080} height={1920}/>;
```

**Install independent packs:** `domain-finance-object-model`, `domain-finance-objects-2d`, `domain-finance-objects-3d`. A 2D-only consumer installs neither Three.js nor the 3D camera director. Each object can be used in a composition, not just the provided gallery. Set `frame` using the existing absolute-frame player; no internal clocks. Camera/scene resources are owned by the 3D viewer and disposed when the scene is replaced.

The first collection intentionally uses 26 geometry families. Similar concepts may reuse silhouette/mesh structure; it does not claim 61 distinct bespoke models, cinematic human characters, bank-specific branding or high-resolution photogrammetry. Those can become separate themed asset packs when actually needed.

## Social platform video profiles

Use **native layout sizes**, not cropping a 16:9 scene to 9:16. The versioned source of truth is `registry/video/platform-presets.json`, shared by the TypeScript preview and Node exporter. Profile dimensions are **Kumiki recommended production targets** rather than hard platform acceptance rules.

| Export ID | Example placement | Authored canvas | Notes |
| --- | --- | --- | --- |
| `youtube` | YouTube long-form | 1920×1080 (16:9) | Standard horizontal production |
| `youtube-shorts` | YouTube Shorts | 1080×1920 (9:16) | Up to 180 s for Shorts |
| `instagram-reels` | Instagram Reels | 1080×1920 (9:16) | Compose within UI overlays |
| `instagram-feed` | Instagram portrait feed | 1080×1350 (4:5) | Our portrait authoring recipe |
| `instagram-story` | Instagram Stories | 1080×1920 (9:16) | Vertical |
| `tiktok` | TikTok video | 1080×1920 (9:16) | Organic, no arbitrary duration cap |
| `tiktok-ads` | TikTok non-Spark in-feed ad | 1080×1920 (9:16) | Placement-specific 5–60 s, audio important |
| `facebook-reels` | Facebook Reels | 1080×1920 (9:16) | Safe UI overlay regions |
| `facebook-feed` | Facebook portrait feed | 1080×1350 (4:5) | Our portrait authoring recipe |
| `facebook-ads-feed` | Meta feed video ad | 1080×1350 (4:5) | Verify selected Ads Manager placement |
| `facebook-ads-reels` | Meta Reels ads | 1080×1920 (9:16) | Use audio and legible safe zones |
| `linkedin-video` | LinkedIn horizontal | 1920×1080 (16:9) | Educational/work video |
| `linkedin-square` | LinkedIn square | 1080×1080 (1:1) | Feed-friendly |
| `social-square` | Generic square | 1080×1080 (1:1) | Generic cross-platform recipe |

**Author-time example:**

```ts
import {
  createVideoPresetManifest,inspectVideoPreset,videoPlatformPreset,
} from "./components/video/platform-presets";
const manifest=createVideoPresetManifest("youtube-shorts",{
  id:"banking-101",fps:{num:30,den:1},durationFrames:900,
});
const safeRect=videoPlatformPreset("youtube-shorts").safeInset;
const issues=inspectVideoPreset(manifest,"youtube-shorts");
```

`safeInset` values are **heuristics**, not guaranteed official UI-exclusion rectangles. Platform controls change by device, ad type, and application release. Content should be reviewed for actual placements. The exporter checks dimensions/duration and **fails clearly** when the rendered scene does not match; it does not stretch/crop. The scene can adapt by reading `kmPreset` from the preview URL. Storybook's finance/chart stories already implement this, and the toolbar lets you change the output size and copy the exact export command.

### One-command MP4 export

```bash
npm ci
npx playwright install chromium
# macOS: brew install ffmpeg
npm run video:export -- --list-presets

# Reflow and export the exact story at the requested dimensions:
npm run video:export -- --story=domains-finance-objects--credit-card-3-d --preset=youtube-shorts
npm run video:export -- --story=domains-finance-objects--bank-3-d --preset=tiktok
npm run video:export -- --story=domains-finance-objects--atm-2-d --preset=instagram-reels
npm run video:export -- --story=domains-finance-objects--loan-2-d --preset=facebook-ads-feed --audio=voice.wav
```

The exporter starts/reuses local Storybook, requests a platform-specific scene, checks that its `VideoExportStage` manifest declares the **correct preset, aspect ratio and native canvas dimensions**, seeks all frames deterministically and encodes H.264 + AAC (if audio is provided). `--startFrame`, `--frames` and `--output` remain available. These exports are local files; **uploading/publishing to social networks is not implemented**.

Platform information references:
- YouTube standard: https://support.google.com/youtube/answer/1722171
- Shorts up to 3 min: https://support.google.com/youtube/answer/15424877
- Meta Reels: https://www.facebook.com/business/ads/facebook-instagram-reels-ads
- TikTok non-Spark reservation ads: https://ads.tiktok.com/resources/help/article/tiktok-reservation-in-feed-ads-reach-frequency?lang=en-0

**Future extensions:** reusable bank-transfer/loan-repayment *scenes* based on these objects; richer financial instruments (amortization, APR vs APY, credit utilization, business P&L) must include true underlying math, not decorative values; responsive typography/protected overlays; live quality-selecting export launcher for non-technical users. Avoid overpromising platform compliance or one-click publication.

## 3D craftsmanship and photographic evidence (FO2)

**Do not interpret the word "crafted" as "photorealistic".** The collection
now contains 61 objects and 26 geometry families. Individual families have
different levels of geometric completion. **None has received a signed-off
render-to-photograph match**. Bull/bear remain anatomical maquettes that
require professional sculpted replacement to meet a photoreal goal.

The following real-world references drive the first detailed pass:

| Asset | Reference | What the 3D constructor actually implements |
| --- | --- | --- |
| Stock workstation | [Trading terminals](https://www.vedomosti.ru/finance/articles/2015/08/12/604447-lavri-professionalnih-treiderov-ne-dayut-spat-menedzheram) | Dual monitor housing/vents/VESA, keyboard, cables, physically separated display glass, **validated OHLC candlesticks** |
| Currency press | [Komori security presses](https://www.komori-currency.com/security_presses.html), [BEP manufacturing](https://www.bep.gov/currency/how-money-is-made) | Multiple guarded presses, cylinders with bearings, sheet feeder/delivery, conveyor and registration controls |
| Money bag | [Cloth bag photograph](https://www.gettyimages.com/) | Volumetric cloth with seeded woven texture, neck compression, rope loops, folds, hanging drawstrings |
| Check | [Void check photograph](https://www.gettyimages.com/) | Paper-thin document, geometric background printing, payment-field guides, clearly void demonstration; **no valid banking credentials** |
| Corporate architecture | [Real commercial building](https://racer.design/work/project-four-5k7d4-ylgyd-bgr32-5rklj-8tc9p) | Curtain-wall glazing, spandrels, mullions, mechanical roof, multi-layer podium |
| Bank, card, ATM, vault | See [review ledger](../../registry/domains/finance-object-review.ts) | Physically separated machine parts, polished metal/ceramic and instrument details |
| Piggy bank, calculator, store | [Casio basic calculators](https://www.casio.com/us/basic-calculators/), bank/retail architectural photos | Ceramic snout/eyes/ears/coin slot, plastic keys and LCD segments, glazing/awning/retail fixtures |
| Bull / bear | Market-sentiment statue references | **Stylized procedural maquettes only**; still need sculpted animal topology and photographic texture work |

The shared `craft/material-kit` provides deterministic machined/molded
micro-roughness; `craft/studio-kit` provides studio-key, fill, rim,
contact shadows. The new bag has a procedural UV weave map that is disposed
with the scene. No external third-party model, HDR, paid texture or watermark
is bundled.

**Required manual evidence for any future "photoreal" status:**
inspect a locally rendered **front, three-quarter, side and detail**
image against real photographs at matching camera angles; note dimensions,
contact shadows, normal/bump-map scale, reflectance, materials, fasteners,
seams and anatomical accuracy. The audit ledger forbids `passed` status
without real reference URLs, all compared views, named human reviewer,
dated review and stored comparison report. Structural unit tests **cannot**
certify perceptual similarity.

```bash
npm run storybook
npm run finance:3d:audit -- --kind=stock-workstation
npm run finance:3d:audit -- --limit=5
npm run finance:3d:audit -- --output=dist/finance-3d-review
# Inspect each asset's 4 screenshots and open its source-reference links:
open dist/finance-3d-review/index.html
```

The review command captures actual WebGL canvases through an opt-in local
Playwright browser, creates a photo-reference checklist/gallery, and
**never auto-awards a quality score**. It is separate from screenshot-free,
low-token deterministic CI. All render capture still requires the author's
local Chromium/WebGL2 environment; it has not been executed in the GitHub
connector environment. Current procedural models can look convincing at a
distance but do not yet substitute for professionally sculpted, UV-unwrapped,
physically photographed/scanned 3D assets where close-up realism is required.
