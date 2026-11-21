# Dolly zoom (VE1.11)

The camera moves toward or away from its subject while the lens changes, so the subject keeps its size and the background stretches away or looms up ([Wikipedia: Dolly zoom](https://en.wikipedia.org/wiki/Dolly_zoom), also named the zolly, trombone shot or contra zoom there). Filmmakers use it for a feeling of unreality or for a character's realization (same source). Editing apps teach it as a named effect ([CapCut](https://www.capcut.com/resource/dolly-zoom-effect)); that shows the move is common, not that it brings views.

Two components have it:

- **Race shots**: `camera.dollyZoom` on a `follow` camera.
- **The cinematic camera**: the `dolly-zoom` shot kind.

## The rule

A subject at distance *d* fills a frame height of 2 · *d* · tan(fov / 2), whatever the lens ([Unity manual: Dolly Zoom](https://docs.unity3d.com/462/Documentation/Manual/DollyZoom.html)). So the subject keeps its size while *d* · tan(fov / 2) stays the same. As the lens goes from fov₀ to fov, the camera's distance changes by tan(fov₀ / 2) / tan(fov / 2).

- **A wider lens** brings the camera in: the background stretches away (dolly in, zoom out).
- **A longer lens** takes the camera out: the background comes closer and grows (dolly out, zoom in).

The camera keeps its direction to the subject, so only the perspective changes. Things far behind the subject change the most: on a distant range of mountains, the change is close to the full distance ratio.

**A solid subject.** The rule holds a flat subject exactly. A car's outline lies at several depths, so the race camera does not scale its distance by the ratio. It finds, in every frame, the distance at which the car's outline covers the same share of the frame as through the starting lens (the square root of its width times its height on screen). Planes held instead missed by a lot. Side-on from 3.7 m to 11 m, the car looked 13 % smaller when its centre line was held, and 18 % larger when its near side was held.

## Race shots

```json
"camera": { "mode": "follow", "along": 0.6, "side": 3.6, "height": 1, "fov": 60, "lead": 0,
  "dollyZoom": { "to": 22, "start": 20, "end": 120 } }
```

- **`to`** is the lens at the end, in degrees (8 to 90). The camera's `fov` is the lens at the start.
- **`start` and `end`** are content frames. By default the zoom runs through the whole shot. The lens eases in and out.
- **The camera** slides along its line to the point it aims at (`lead` metres behind the car's centre) to the distance that holds the car's outline. `TrackPass` measures the outline from the car model: about 3000 of its vertices. `trackPassState` takes a `CarBody`; without points it uses a rounded box of the body's size. The camera car's shake keeps its size.
- **Only a `follow` camera.** It is locked to the car, so the car's distance is known in every frame. A trackside camera and a chasing camera car move on their own.
- **Keep the camera inside the guardrails.** The rails are 11 m from the centre line. From 60° to 22° the camera pulls back about 2.7 times, so the example's 3.6 m side offset ends near 9.6 m.

`dollyZoomAt(spec, frame, fov)` returns the lens at a content frame and the ratio tan(fov₀ / 2) / tan(fov / 2).

| Code | Severity | When |
|---|---|---|
| `race-dolly-zoom-mode` | error | A dolly zoom on a camera that is not `follow` |
| `race-dolly-zoom-lens` | error | `to` outside 8 to 90 degrees |
| `race-dolly-zoom-frames` | error | A zoom shorter than 0.5 s, or not inside the shot |
| `race-dolly-zoom-small` | warning | The camera moves less than about 20 %, so the background barely changes |

## Cinematic camera

```ts
CameraShotRecipe("dolly-zoom", { id: "realise", target: "hero", durationFrames: 90, dollyZoom: { from: 20, to: 60 } })
```

- **How it works.** The framing solver (`frameCameraBounds`) already sets the distance that frames the target for a given lens. A `dolly-zoom` shot sweeps the lens with the shot's progress (its easing), and the solver moves the camera, so the target keeps its projected size.
- **Defaults.** Medium framing, the `hold` movement, an elevation of 8°, and a lens from 20° to 60° (the camera moves in, and the background stretches away).
- **Validation.** `from` and `to` are 5 to 120 degrees, at least 5 degrees apart. Only a `dolly-zoom` shot takes `dollyZoom`.

## Craft

- **Keep the subject still in the frame.** The effect is the background's change; a subject that also moves hides it. A race car locked to the camera holds still.
- **Put depth behind the subject.** A plain wall right behind it hardly changes.
- **Use it once or twice in a film.** It is a strong move.
- **The cinematic camera holds the target's bounds**, as all its framing does. A rounded subject's outline inside the box can drift a few per cent.

## Example and evidence (2026-11-21)

**Example.** [`examples/film/dolly-zoom.film.json`](../../examples/film/dolly-zoom.film.json):

- A white race car, number 27, from the side, on a camera locked to it. From frame 20 to 120 the lens goes from 60° to 22° and the camera pulls back from 3.7 m to about 9.7 m. The car keeps its size, and the mountains behind it grow about three times.
- The sound is `bed-drone-low`, the catalog's dark drone for tension.
- **Storybook.** **Speed Ramp → Dolly Zoom**, beside the same shot with the lens held at 60°.

**Rendered frames** (960 × 540, `film:render --gl=gpu`, 38 s; the software renderer took over 16 s a frame):

- **Frames 0, 45, 95 and 149.** The mountains grow from a low band to the top third of the frame, and the far kerb and grass rise behind the car.
- **The car's size, measured on frames 0 and 149.** Its length changes by +1.5 % and its height by −4 %. The first draft held the centre line and the car shrank by 13 %; the second held the near side and it grew by 18 %. That is why the camera now holds the outline.
- **Frames 18 to 25 and 114 to 121, one by one.** The lens eases in and out with no jump. The car holds its place, apart from the camera car's 1.2 cm shake.

**Tests.** `tests/dolly-zoom.test.ts`:

- the cinematic shot sweeps the lens from 20° to 60°, the camera's distance falls by more than half, and the target's projected height stays within 8 %;
- the shot's validation rejects a sweep under 5° and `dollyZoom` on another kind of shot;
- on the race camera, an outline given as a box's corners covers the same share of the frame at every frame, within 0.2 %, measured by the test's own projection; a shot without a zoom is unchanged;
- each race check code fires.

**Owner review.** Visual and listening review is pending.
