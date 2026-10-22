# Waveform and ClipTimeline2D — trimming a clip, shown

**Status:** Implementing (automated render checks recorded in the [verification log](../verification/audio-timeline-2d.md); human review pending)
**Catalog phase:** specialized
**Scope:** Two SVG components for showing a trim on an audio or video clip. `Waveform2D` draws caller-supplied peaks, with an optional kept selection and playhead. `ClipTimeline2D` draws the clip's length on a ruler, with trim handles, dimmed removed regions and in/out labels. They show an edit; they do not decode, play or cut any media.

## Install and inspect
- Registry item: `audio-timeline-2d` (`Waveform2D`, `illustrativePeaks`, `ClipTimeline2D`, `formatTimecode`, `rulerStep`, `trimLabelLayout`).
- Storybook: **Visual → Waveform** (plain, played, selection, dark, narrow), **Visual → Audio Trim Timeline** (trimmed clip, full clip, edge cases, dark, narrow). A trimmed clip with waveform and timeline stacked, a full clip with the playhead, two edge-case trims, a dark theme and a narrow column.

## Minimal usage
~~~tsx
<Waveform2D peaks={peaks} width={640} height={80} ariaLabel="Waveform of the example clip"
  progress={0.33} selection={{ start: 2 / 12, end: 8 / 12 }} />
<ClipTimeline2D duration={12} trimStart={2} trimEnd={8} playhead={4} width={640} height={120} />
~~~

## Contract
- **Use / not use:** use for editor explainers, trim tutorials and product illustrations. Do not use the peaks as measured loudness; `illustrativePeaks` makes deterministic example data only. Do not claim processing speed or file size from these drawings.
- **Waveform public API:** `peaks` (at least two values, each 0–1), `width`, `height`, `progress` (0–1), `selection` (`{ start, end }` fractions, end after start), `ariaLabel` (required), `colors`, and SVG props.
- **Timeline public API:** `duration` (positive seconds), `trimStart` (default 0), `trimEnd` (default the duration), `playhead` (within the clip), `width`, `height` (default 120), `ariaLabel` (defaults to a trim description), `colors`, and SVG props.
- **Validation:** out-of-range peaks, progress or selection; a non-positive width or duration; a trim that is not ordered inside the clip; and a playhead outside the clip all throw with the rule. Times are never clamped silently.
- **Alignment:** both components use the same 14-unit horizontal inset, so they line up when stacked at the same width.
- **Ruler:** the step is chosen from the available width, with at most eight labels and about 60 units per label. Labels are `mm:ss.s`; there is no hours field, so very long clips show larger minute counts.
- **Trim labels:** placed outside their handles when there is room, and moved inside when there is not, so In and Out never overlap.
- **Semantics:** both are `role="img"`. The timeline's default name states the kept range; the waveform needs an explicit name.
- **Keyboard/focus:** none. The components are static; any editing controls belong to the host.
- **Customization:** `colors` for each component, with CSS variable fallbacks.
- **Dependencies:** none.
- **Limits:**
  - The waveform draws every peak as a bar; very large peak arrays are not downsampled.
  - Peak values are the caller's responsibility; the component does not analyse audio.
  - The dimmed regions use a translucent overlay and are as legible as the track colour allows.
  - Labels are placed with an estimated text width; the checks confirmed no overlap at the widths shown, not at every font.

## Verification
See the [verification log](../verification/audio-timeline-2d.md).
