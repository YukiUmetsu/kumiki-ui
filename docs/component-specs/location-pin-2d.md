# LocationPin2D — location tags on photos and listings

**Status:** Implementing (automated render checks recorded in the [verification log](../verification/location-pin-2d.md); human review pending)
**Catalog phase:** specialized
**Scope:** A 2D drawing of a location tag in three states: an exact pin (`tagged`), a shared approximate area with no pin (`approximate`), and no location data (`stripped`). It shows what a file or listing reveals, not what a device recorded or how precise a reading is.

## Install and inspect
- Registry item: `location-pin-2d` (`LocationPin2D`, `formatCoordinates`, `LOCATION_STATES`).
- Storybook: **Domains → Location Pin**. Three states side by side, in light and dark themes, with illustrative coordinates in open ocean.

## Minimal usage
~~~tsx
<LocationPin2D state="tagged" lat={12.3456} lon={65.4321} theme="paper" width={240} height={200} />
<LocationPin2D state="approximate" lat={12.3456} lon={65.4321} />
<LocationPin2D state="stripped" />
~~~

## Contract
- **Use / not use:** use in privacy explainers about photo metadata, listing photos and shared locations. Do not use it to show a real place: the street grid is abstract and the caller supplies any coordinates. Do not present the approximate area as an accuracy measurement; its size is fixed in the drawing and is not computed from anything.
- **Public API:** `state` (default `tagged`), `lat` and `lon` (both or neither; shown as text only in `tagged` and `approximate`), `title` (defaults by state), plus the standard `DomainIllustration` props (`theme`, `tokens`, `frame`, `reducedMotion`, `showTitle`, `backdrop`, `parts`, `ref`, SVG props).
- **Validation:** an unknown state throws with the valid list. Latitude outside −90…90, longitude outside −180…180, non-finite values, or a lone coordinate throw with the rule. Coordinates are formatted to four decimals.
- **Composition:** named parts (`pin`, and the shared toolkit parts) so a host can animate the pin through the toolkit's pose API.
- **Semantics:** the illustration is `role="img"`, named by its title (default by state). The coordinate text is part of the drawing and is not announced separately; supply `title` to name the location in words when that matters.
- **Keyboard/focus:** none.
- **Visual states:** `tagged` (pin with a shadow and a caption), `approximate` (translucent dashed area, caption, no pin), `stripped` (dashed ring with a slash and the caption "No location tag").
- **Customization:** `theme` (`paper`, `midnight`) and `tokens`. The caption pill follows the surface token; caption text uses the ink token so it reads in both themes.
- **Dependencies:** `domain-illustration-2d`.
- **Limits:**
  - The street grid is generic and fixed at four columns by three rows. It does not show roads, water, terrain or any real geography.
  - The approximate area's radius is a fixed artboard value. It is illustrative, not a measured or privacy-guaranteed radius.
  - Caption text is measured with `FitText` and must fit its 22-unit pill; the checks confirmed each caption fits on one line.
  - In the dark theme the stripped state's dashed ring is low-contrast against the grid. It is legible but dim; a future token for the neutral outline would fix it.

## Verification
See the [verification log](../verification/location-pin-2d.md).
