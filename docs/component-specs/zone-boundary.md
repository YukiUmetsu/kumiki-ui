# ZoneBoundary — labelled zones for where data stays or leaves

**Status:** Implementing (visual and automated checks recorded in the [verification log](../verification/zone-boundary.md); human review pending)
**Catalog phase:** specialized
**Scope:** A dashed, labelled outline for an SVG diagram overlay. Each zone marks a region the data stays inside (a device, a browser tab) or a region that belongs to someone else (a converter's server). It is a single overlay component; it does not route packets, lay out nodes or decide what a zone means.

## Install and inspect
- Registry item: `zone-boundary` (`ZoneBoundary`, `zoneLabelBox`).
- Storybook: **Visual → Zone Boundary** (two zones, dark theme, and a label wider than its zone, flagged) and **Visual → Local vs Upload Flow** (the boundary in a data-flow composition). Two DiagramStage panels with the same packet timing: a file converted in the browser and saved locally (every packet stays in the zone), and a file uploaded to a converter (packets cross from the device zone into the server zone and return). Includes a light and a dark theme and an animation scrubber.

## Minimal usage
~~~tsx
<DiagramStage graph={graph} timeline={timeline} frame={frame} width={1200} height={340} packets={packets}
  ariaLabel="…" renderNode={renderNode}
  overlay={<ZoneBoundary zones={[
    { id: "device", label: "Your device", rect: { x: 30, y: 40, width: 270, height: 270 } },
    { id: "server", label: "Converter's server", rect: { x: 870, y: 40, width: 300, height: 270 }, tone: "outside" },
  ]} />} />
~~~

## Contract
- **Use / not use:** use to show a trust or locality boundary on a diagram. Do not use it as a security control or to imply what a system does with data; the outline is a claim the author makes.
- **Public API:** `zones` (`{ id, label, rect, tone? }`, rectangles in the host's output coordinates), `fontSize` (default 20), `fontFamily`, `colors` (`inside`, `outside`, `labelFill`, `labelInk`; CSS variables with literal fallbacks), and every SVG `g` attribute plus children-free forwarding.
- **Composition:** designed for DiagramStage's `overlay` slot, which is in output coordinates. Any SVG host with the same coordinate system works.
- **Semantics:** the component is decorative. The host diagram's `ariaLabel` and description must state the boundary in words, because the outline carries no accessible name.
- **Keyboard/focus:** none.
- **Visual states:** `inside` (green by default) and `outside` (orange by default). Light and dark are handled by the colour tokens.
- **Customization:** `colors` and `fontSize`; zone geometry is authored by the host.
- **Dependencies:** none beyond React.
- **Limits:**
  - The label width is estimated in `em` (wide glyphs about one em, Latin about 0.56 em). Real rendered width can differ by a few pixels; the story's bounding-box checks cover the shipped fonts only.
  - A label wider than its zone is still drawn in full and marked `data-km-zone-overflow`. It is never truncated. The host should widen the zone or shorten the label.
  - Zone labels are placed in the zone's top-left band. Hosts must keep nodes out of that band; the component does not move nodes.
  - Dashed outlines do not hide what is under them; crossing packets are visible across boundaries by design.

## Verification
See the [verification log](../verification/zone-boundary.md).
