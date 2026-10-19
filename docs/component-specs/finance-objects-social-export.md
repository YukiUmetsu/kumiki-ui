# Finance and Business Object Kit (FO1) + Social Export Profiles (VE2)

**Purpose:** give educational video authors editable and reusable **objects**, not just financial charts. Share semantic identity and absolute-frame animation between 2D SVG and true Three.js 3D. Extend the existing FB1 charts and VE1 video export without introducing a new motion engine.

## Component catalog

The 50 supported IDs are grouped into **19 reusable geometry families**, not 50 individually maintained duplicate renderers. The full list is in `FINANCE_OBJECTS` and the searchable Storybook gallery `Domains/Finance Objects/All Objects`.

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

The first collection intentionally uses 19 geometry families. Similar concepts may reuse silhouette/mesh structure; it does not claim 50 distinct bespoke models, cinematic human characters, bank-specific branding or high-resolution photogrammetry. Those can become separate themed asset packs when actually needed.

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
