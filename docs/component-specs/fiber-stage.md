# FiberStage — React Three Fiber, frame by frame

**Scope:** A React Three Fiber canvas for video. It renders exactly one picture for each `frame`, so a scene written with R3F scrubs, seeks and exports frame for frame like the rest of the library.

## Install and inspect
- Registry item: `fiber-stage` (`FiberStage`, `useStageFrame`, `CameraMove`). It needs `@react-three/fiber` 9, which needs React 19.
- Particles inside it: `environmental-effects-fiber` (`EnvironmentalEffectsFiber`). See [Environmental Effects](environmental-effects.md).
- Storybook: **Video production → Particles**. `Fiber Stage Authoring` is the smallest example.

## Minimal usage
~~~tsx
function Spin() {
  const { frame } = useStageFrame(), mesh = useRef<Mesh>(null);
  useLayoutEffect(() => { mesh.current?.rotation.set(0, frame * 0.03, 0); }, [frame]);
  return <mesh ref={mesh}><boxGeometry /><meshStandardMaterial /></mesh>;
}
<FiberStage frame={frame} fps={{ num: 30, den: 1 }} background="#0b1620" label="A turning box"><Spin /></FiberStage>
~~~

## Contracts
- **No loop of its own.** The canvas uses `frameloop="never"`. A driver after the children calls `advance()` once per frame, after every child's layout effect has applied that frame, so the picture never lags a frame behind.
- **Time is an input.** `useStageFrame()` gives `{ frame, fps, seconds }`. The R3F clock is set to the frame's time, so `useFrame` callbacks that read `state.clock.elapsedTime` follow the host too. Do not use delta time, timers or `Math.random()` at render: those depend on how fast the machine runs.
- **Export.** The root carries `data-km-fiber-frame`, and `data-km-fiber-drawn` once that frame is drawn. `VideoExportStage` waits for them to match before capturing. The canvas keeps its drawing buffer so a capture can read it.
- **Holds.** A child whose picture finishes asynchronously (a worker sort, a streamed chunk, a decoded texture) calls `const release = useStageHold()(reason)`. Until every hold is released the frame is not marked drawn, and `data-km-fiber-hold` lists the reasons, so an export waits. On the last release the stage draws once more and marks the frame drawn.
- **Shadows and stencil.** `shadows` turns on filtered PCF shadow maps. The renderer always has a stencil buffer, for outline effects such as `createPartHighlight`.
- **Failure is visible.** An error inside the scene sets `data-km-fiber-status="error"` and shows an alert, and an export stops. A `fallback` replaces the alert only if the caller supplies one. A lost WebGL context returns to `pending` and redraws when it is restored.
- **Size.** `dpr` defaults to 1, so a capture is the output size. `background` paints the scene; without it the canvas is transparent and composites over the page.
- **Camera.** `camera` sets the position, field of view and target. `CameraMove` moves it between two positions over host frames with an ease, for parallax.

## Accessibility
- The root has `role="img"` and the `label` you pass. Describe what the scene shows.
- For reduced motion, pass a fixed frame, or `reducedMotion` to the effects inside.

## Limitations
- One canvas holds one WebGL context. Keep the number of stages on screen small: browsers cap contexts at about sixteen.
- `@react-three/drei` helpers that start their own animation (for example autoplaying controls) do not follow the host frame.
