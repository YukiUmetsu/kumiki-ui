# FileFormat2D and FormatConversion2D — file sheets with format badges

**Status:** Implementing (automated render checks recorded in the [verification log](../verification/file-format-2d.md); human review pending)
**Catalog phase:** specialized
**Scope:** Two 2D illustrations built on the shared Domain Illustration Toolkit. `FileFormat2D` draws one file: a paper sheet, a kind glyph (video, image, audio, document, data) and a format badge. `FormatConversion2D` draws a file in one format, an arrow, and the same kind of file in another format. They exist to show a format change, not a measured file size or speed.

## Install and inspect
- Registry item: `file-format-2d` (`FileFormat2D`, `FormatConversion2D`, `normalizeFileFormat`, `FILE_KINDS`).
- Storybook: **Domains → File Formats**. Stories: *Kinds* (MOV, PNG, WAV, PDF, CSV), *Conversions* (MOV→MP4, HEIC→JPG, WAV→MP3, PNG→WEBP, PDF→TXT, CSV→XLSX), and *Dark theme*.

## Minimal usage
~~~tsx
<FileFormat2D format="mov" kind="video" title="clip.mov" theme="paper" width={240} height={200} />
<FormatConversion2D from={{ format: "HEIC", kind: "image" }} to={{ format: "JPG", kind: "image" }} theme="midnight" />
~~~

## Contract
- **Use / not use:** use for file-type explainers, format-change diagrams and blog or product illustrations. Do not use the drawings to state a file's real size, codec or metadata; they show a kind and a format name only.
- **Public API:**
  - `FileFormat2D`: `format` (1–5 letters or digits; uppercased), `kind` (`video`, `image`, `audio`, `document`, `data`), optional `title` (defaults to `<FORMAT> file`), plus the standard `DomainIllustration` props (`theme`, `tokens`, `frame`, `reducedMotion`, `showTitle`, `backdrop`, `parts`, `ref`, SVG props).
  - `FormatConversion2D`: `from` and `to` (`{ format, kind }`), optional `title` (defaults to `<FROM> → <TO>`), and the same frame props.
- **Validation:** an empty, too long or non-alphanumeric format throws with the rule and an example. An unknown kind throws, listing the valid kinds. Formats are never cut short.
- **Composition:** named parts (`sheet`, `label`) so a host can animate the sheet or the badge through the toolkit's pose API.
- **Semantics:** the illustration is `role="img"`, named by its title. The format text is part of the drawing and is not announced separately.
- **Keyboard/focus:** none.
- **Visual states:** the badge label switches between the theme ink and white, whichever has the higher contrast against the badge colour (computed from the theme token). The kind sets the tone: video accent, image accent2, audio positive, document deep, data ink.
- **Customization:** `theme` (`paper`, `midnight`) and `tokens`. The badge and glyph colours follow the tokens.
- **Dependencies:** `domain-illustration-2d` (shared primitives and `FitText`). No other packages.
- **Limits:**
  - The format badge is measured with `FitText`, so it is never truncated. Badges use a fixed 22-unit height in every drawing; text that cannot fit the badge width would step down in size, and the checks confirmed each format name fits on one line.
  - The glyph and badge are drawn in the 240×200 artboard. Conversion drawings scale the sheets down to fit two sheets and an arrow, so the text in them is smaller relative to the artboard.
  - The kinds are a fixed list of five. Adding a kind means extending the glyph switch and the tone map.
  - Format names are shown as text. The component makes no claim about codecs, compatibility or quality.

## Verification
See the [verification log](../verification/file-format-2d.md).
