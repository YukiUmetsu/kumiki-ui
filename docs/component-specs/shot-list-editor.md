# Shot List Editor

**Registry item:** `shot-list-editor`
**Source:** `registry/video/shot-list-editor.tsx`

Reorder shots and edit each shot's type and purpose. The host owns saving, timing and rendering. The component owns no clock and knows nothing about a renderer.

```tsx
<ShotListEditor shots={shots} kinds={[{ value: "establish", label: "Establish" }]} onChange={setShots}
  diagnostics={[{ shotId: "reveal", severity: "error", message: "The subject leaves the frame." }]} />
```

- **Keyboard:** Tab through controls. Alt+Up and Alt+Down move the focused shot. Moves are announced in a live region.
- **Errors:** a diagnostic with a known `shotId` shows under that shot and links to its field. Others show at the top.
- **Languages:** pass `labels`. Long and Japanese titles wrap.
- **Read only:** move controls leave, and fields do not change.
- **Unknown kinds:** a saved kind that is no longer in `kinds` stays selected, so loading never changes data.

**Evidence:** `tests/shot-list-editor.test.tsx`, Storybook **Video production / Shot List Editor**.
