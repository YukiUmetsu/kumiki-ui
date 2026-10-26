# Sheet — Edge-aligned secondary work panel

**Status:** Implemented; DOM/unit and registry fixture verification passed. Browser-device motion QA pending. **Registry:** `sheet`. **Storybook:** `Overlays and notifications / Sheet`.

The Sheet extends Base UI Dialog rather than pretending to be a gesture drawer. Use it for properties, settings, filters and other contextual work that should remain close to the page. For touch dragging and snap points, use [Drawer](drawer-spec.md). For a centered confirmation, use existing `Dialog`.

## Installation and example

Registry files: `sheet.tsx`, `panel-motion.ts`, `panel-parts.tsx` in the consumer's `components/ui/`. Requires `@base-ui/react` and `motion` (already used by Kumiki).

```tsx
import { Sheet } from "./components/ui/sheet";

<Sheet.Root side="right" motion="spring" modal>
  <Sheet.Trigger>Edit appearance</Sheet.Trigger>
  <Sheet.Content size="md" resizable minSize={280} maxSize={900}>
    <Sheet.Header>
      <div><Sheet.Title>Appearance</Sheet.Title><Sheet.Description>Selected element</Sheet.Description></div>
      <Sheet.Close />
    </Sheet.Header>
    <Sheet.Body>Editable fields go here.</Sheet.Body>
    <Sheet.Footer><Sheet.Close>Done</Sheet.Close></Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
```

## API and styling

- `Sheet.Root`: `open?`, `defaultOpen?`, `onOpenChange?(open, eventDetails)`, `modal?` (true), `side?` (`right|left|top|bottom`), `motion?` (`smooth` default). Other Base UI Dialog root props are forwarded, including dismissal and focus controls. No app-specific persistence or routing.
- `Sheet.Trigger`: Base UI's ref-forwarding trigger; use `render={<YourButton />}` when the button forwards props/ref.
- `Sheet.Content`: `size?` (`sm|md|lg`, default `md`), `width?`, `height?`, `showBackdrop?` (defaults to the modal setting), `backdropClassName?`, `resizable?`, `minSize?`, `maxSize?`, `onSizeChange?(pixels)`, `className?`, `style?`, plus Base UI popup props. Non-modal backdrops are non-intercepting even when explicitly enabled.
- `Sheet.Header`, `.Body`, `.Footer`: shared ref-forwarding div wrappers with native props and `className`; Body is the scroll region and Footer stays outside the scroll region.
- `Sheet.Title`, `.Description`, `.Close`: styled, ref-forwarding Base UI dialog parts; Title names the dialog and Description adds an accessible description. Close renders a labelled × button unless children are supplied. Consumers must provide a visible Title or another accessible label on Content.
- CSS hooks: `data-km-sheet`, `data-side`, `data-km-sheet-backdrop`, `data-km-sheet-resize`, `data-km-panel-header|body|footer`. Semantic colors: surface-elevated, border, foreground, muted-foreground, overlay, focus ring. Standard content padding 20px; 16px header/footer rhythm.
- Resize handle: vertical for left/right, horizontal for top/bottom; keyboard arrow keys change 16px, Home/End clamp to extrema, pointer drag uses capture, and `aria-valuenow/min/max` communicates extent. Size stays within viewport bounds; the consumer can persist `onSizeChange` values if needed.

## Configurable motion

Presets: `subtle` (230ms/45% travel), `smooth` (300ms/100% travel), `spring` (360ms/350 stiffness/34 damping), `snappy` (185ms), `none`. A custom object accepts `durationMs`, `backdropMs`, `distance` (0–100% panel size), `opacity` (0–1), `easing` (CSS easing), `stiffness` and `damping` together. The spring is sampled into a CSS `linear()` easing so no JS animation loop or new dependency is required. Consumer CSS can override the `--km-panel-*` variables. Invalid numerical values clamp to safe bounds.

The direction is positional (right opens from right and closes to right). Base UI controls Escape/outside press, focus management, inert surroundings, scroll lock and nesting. `modal={false}` leaves the page usable behind the panel. `prefers-reduced-motion` removes travel and durations; `motion="none"` always disables the transition.

## Limits and QA

- Resize is a simple sheet extent, not a general-purpose split pane. No drag docking, breakpoints or automatic persistence.
- The `maxSize` is also limited by available viewport space; consumer CSS `width`/`height` can override presets. A content body requires `.Body` for the default independent scrolling contract.
- Automated DOM/unit tests cover labels, dismissal, focus restoration, controlled/uncontrolled state, direction and resize keyboard behavior; pointer gesture, actual animation and screen-reader device testing must be noted separately when not performed.
