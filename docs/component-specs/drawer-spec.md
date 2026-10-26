# Drawer — Swipeable and snappable edge panel

**Status:** Implemented; DOM/unit and registry fixture verification passed. Touch-device QA pending. **Registry:** `drawer`. **Storybook:** `Overlays and notifications / Drawer`.

Use Drawer for gesture-based navigation, mobile actions, progressive bottom panels, or any panel that must follow the finger. It uses Base UI Drawer 1.9 for gesture state, snap points, focus management and accessible semantics. For a conventional desktop editor without swipe handling, use [Sheet](sheet-spec.md).

## Installation and example

Registry files: `drawer.tsx`, `panel-motion.ts`, `panel-parts.tsx`. Requires `@base-ui/react` and `motion`.

```tsx
import { Drawer } from "./components/ui/drawer";

<Drawer.Root side="bottom" motion="smooth" snapPoints={[0.35, 0.7, 1]} defaultSnapPoint={0.35}>
  <Drawer.Trigger>Open media library</Drawer.Trigger>
  <Drawer.Content size="lg">
    <Drawer.Header><Drawer.Title>Media library</Drawer.Title><Drawer.Close /></Drawer.Header>
    <Drawer.Body>
      <input data-base-ui-swipe-ignore="" aria-label="Search media" />
    </Drawer.Body>
    <Drawer.Footer><Drawer.Close>Done</Drawer.Close></Drawer.Footer>
  </Drawer.Content>
</Drawer.Root>
```

## API and customization

- `Drawer.Root`: `open?`, `defaultOpen?`, `onOpenChange?(open, eventDetails)`, `modal?` (true), `side?` (`bottom` default; `top|left|right`), `motion?` (`smooth` default). Also forwards Base UI's `snapPoints`, `snapPoint`, `defaultSnapPoint`, `onSnapPointChange`, `snapToSequentialPoints`, `disablePointerDismissal`, `onOpenChangeComplete`, `actionsRef` and detached trigger configuration.
- `Drawer.Trigger`, `Drawer.SwipeArea`, `Drawer.Indent`, `Drawer.IndentBackground`: existing Base UI primitives are surfaced, not reimplemented. Swipe dismissal maps bottom→down, top→up, left→left, right→right.
- `Drawer.Content`: a compound portal/backdrop/viewport/popup/content surface; supports `size`, `width`, `height`, `showBackdrop` (defaults to the modal setting), `backdropClassName`, `showHandle` (on for vertical panels), `className`, `style` and Popup options. Non-modal backdrops do not intercept interaction, even when explicitly enabled.
- `Drawer.Header`, `.Title`, `.Description`, `.Body`, `.Footer`, `.Close`: tokenized compound parts. Title gives the dialog an accessible name. Body owns scrolling; Footer stays visible. Close defaults to a labelled × when no children are supplied.
- `data-base-ui-swipe-ignore` on a descendant prevents swipe dismissal. Use `="x"` or `="y"` for axis-specific scroll/drag interactions as documented by Base UI.
- Appearance uses Kumiki semantic surface, text, border, radius and focus colors. Customize classes and style per part. Root and Content motion use the same preset/config contract as Sheet, including CSS-sampled stiffness/damping springs, backdrop fade and reduced-motion behavior.

## Motion and touch behavior

Entrance/exit animates the CSS `translate` property; dragging/snapping uses Base UI's separate `--drawer-swipe-movement-x/y` and `--drawer-snap-point-offset` transform variables. Keeping them separate prevents entrance effects from fighting finger tracking. `data-swiping` suppresses transitions while dragging; snap release transitions follow the selected easing/duration. Backdrop opacity follows swipe progress; opacity and motion are configurable per instance.

Base UI's gestures and snap points govern where the panel rests, not arbitrary app-authored drag code. Keep interactive and long-scroll content in `Drawer.Body`; use swipe-ignore attributes where another control owns gestures. `prefers-reduced-motion` removes spatial travel and transition duration but retains state changes and access to controls.

## Limits and QA

- Snap-point units are Base UI's API: 0–1 viewport fractions, numbers greater than 1 in pixels, or pixel/rem strings. Size presets should be chosen consistently with the requested snap points.
- CSS `linear()` spring sampling works in current evergreen browsers; unsupported browsers fall back to their native CSS behavior, not a JavaScript physics simulation.
- Automated DOM/unit tests cover accessibility, sides, focus, state and styling contracts. Real-device touch/drag/swipe, snap interruption, screen-reader testing and visual QA are separately required for release qualification.
