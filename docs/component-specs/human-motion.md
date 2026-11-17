# MOTION1 — human movement for any art style

**Registry pack:** `human-motion` (depends on `human-anatomy`)
**Files:**

- `registry/anatomy/motion-gait.ts`: gaits, moods, `gaitPose`, `gaitCycle`, sit-to-stand.
- `motion-react.tsx`: `GaitStrip`, `GaitPlayer`, `MotionSheet`.

**Storybook:** Video production → Art Foundations → Human Motion → **Sheet**, **Walking and running**, **Walk with a
mood**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.

## Gaits (`GAITS`)

### Walking

- Speed: preferred about 1.4 m/s.
- Cadence: about 100–120 steps a minute.
- Stride: about 1.2–1.6 m.
- Stance: 60% of the cycle, with double support twice.
- Events: heel strike; loading, where the knee flexes 15–20°; mid-stance; heel rise; toe-off at about 60%; peak swing
  knee of about 60° at 73%.

### Running

- Speed: jogging 2.5–5 m/s.
- Cadence: 150–185 steps a minute.
- Stance: about 38%, then flight.
- Events: knee flexion of about 40° in absorption; a swing knee of about 100°.

### Curves

Each gait lists curves for the hip, knee, ankle, toes, shoulder (arm swing with the opposite leg) and elbow, plus trunk
lean and twist. They are keyframes after the published shapes: Winter 1991; Perry & Burnfield 2010; Novacheck 1998.
Values are approximate; the timing landmarks are reported.

## Moods (`MOODS`)

Emotion shows in a walk (Roether et al. 2009; Montepare et al. 1987):

- **Sad:** slower, shorter steps, little arm swing, head bowed. It is the most recognised emotion in gait.
- **Happy:** faster, with more arm swing and a bounce.
- **Angry:** fast, heavy steps with bent elbows.
- **Afraid:** tense, short steps.
- **Tired:** a shuffle.

The directions are reported; the sizes are estimated.

## Feet on the ground (`gaitCycle`)

`gaitCycle(body, gait, { frames, mood })` poses ANAT1's body for each frame:

- The lowest foot point is placed on the floor.
- While a foot is in stance, the point it rolls on (the heel, then the ball, then the toe) is held where it was, and
  the body moves over it. Feet never slide.
- In a run's flight, the body coasts on a ballistic arc.

With the neutral walk, the derived stride is 1.29 m and the speed 1.21 m/s; the run gives 1.64 m and 2.26 m/s. Both
come from the joint angles, not from a set speed.

## Views

- `GaitStrip`: a chronophotograph. The frames of one cycle are set at their true distance along one ground line, as
  in Muybridge's plates.
- `GaitPlayer`: the cycle at its cadence, with a tracking camera, scrolling ground marks and a mark under the planted
  foot. Under reduced motion it waits for Play.

## Also

`SIT_TO_STAND`: the four phases of rising from a chair (Schenkman et al. 1990), as keyframe poses.

## Limits

- Sagittal curves only: hip abduction, pelvic drop and pelvic rotation are not yet modelled.
- No turning or stairs.
- Mood sizes are estimated.
