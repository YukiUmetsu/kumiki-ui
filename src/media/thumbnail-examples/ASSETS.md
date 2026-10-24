# House Math thumbnail example imagery

These six photographic raster source assets were generated specifically for the Kumiki-UI
House Math demos with **OpenAI image generation** in the project conversation
on 2026-10-23. The prompts requested distinct text-free subjects/backgrounds.
They were not
copied from another website, stock library, YouTube creator, or an identifiable
third-party photo. **They are not designated CC0 or public domain.**
Rights basis: [OpenAI Terms of Use (effective January 1, 2026)](https://openai.com/policies/terms-of-use/)
state that, as between OpenAI and the user, the user owns the Output to the
extent permitted by law. These outputs were commissioned specifically for the
repository's public examples by the repository owner. The output-assignment
term permits the owner to distribute their generated outputs, but it does
**not** guarantee copyright protection, uniqueness, non-infringement, or an
open license to third parties. The images are included as attributable
project demonstration assets; reuse outside the repository should be cleared
with the owner. No third-party trademark, logo, quoted figure, or text is intentionally
embedded in the generated pixels.

Only the examples under `src/media/thumbnail-editorial-fixtures.ts` reference
these images. Installing Kumiki's generic media registry entries does not
bundle any of these photos, an image-generation model, a network client, or a
provider key. Other consumers must supply and clear rights for their own
image inputs. `ImageAsset.attribution` explicitly records generated provenance.

| Source file | Purpose | Dimensions | SHA-256 |
|---|---|---|---|
| `house-subject.png` | Transparent suburban-house cutout | 1448×1086 | `dfcb8696df84a1446d73e758f3cee83c45de10199bb232c6c5b391f9cc1e2b37` |
| `house-background.png` | Dark architectural blueprint backdrop | 1672×941 | `f86fd324fbb24191f7cc09dfa87d65cbbeddfe5b6afc1c0cd47cd049d18a8b21` |
| `hvac-subject.png` | Transparent residential condenser cutout | 1312×1199 | `21d29fdca709131d5efb2435781f61d41abbbf1dd5e85bed8fa5b8e8cb671b38` |
| `hvac-background.png` | Copper-pipe house-wall backdrop | 1672×941 | `0dde3c695bf7b64cb488b9340055543461722ca43a1ffc296fb320ee761507bd` |
| `house-comparison.png` | Distinct transparent white-brick house | 1448×1086 | `8cc5759a921d0a4a2a2c19cdd2394aa5e3c67555cf94934b5efc4bfc8e0ca766` |
| `comparison-background.png` | Blue-storm versus golden-sunset backdrop | 1672×941 | `7183a43885a1cb4ef4c2d4e625ef120aa2964b263412ac6f71b200a19aa19fe6` |

The three **non-photographic** accents below were authored as minimal SVG paths
in this repository and mechanically rasterized to transparent PNG with
Inkscape. Their matching `.svg` files are the editable vector sources. PNGs
are used in the examples because some SVG rasterizers cannot render a nested
`data:image/svg+xml` inside an SVG `<image>` element.

| Transparent accent | Authored source | Dimensions | SHA-256 |
|---|---|---|---|
| `gold-swoosh.png` | `gold-swoosh.svg` | 360×48 | `3ec330c405b637c6a6a95439584e64b7a5b5704c60cf39dd09116c2747263616` |
| `orange-swoosh.png` | `orange-swoosh.svg` | 360×48 | `7ada1c053e593fb6d5b18d60f54b3998d99c5b6986939da908162c42310f5f55` |
| `comparison-divider.png` | `comparison-divider.svg` | 20×180 | `c763540e8d8881d53c61b2af2a4385644afc1542d4ed68ac721cd74fd638232c` |

The three consumer-facing compositions are **not** flattened copies of prior
generated reference thumbnails. Backgrounds, cutouts, headlines, and cues are
separate editable M0 layers; colors, words, source assets, and layout are
replaceable without regenerating a whole image. The SHA-256 hashes above are
the source-file fingerprints, not claims of training-set provenance.
