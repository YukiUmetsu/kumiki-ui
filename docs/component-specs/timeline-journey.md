# Timeline Journey Scene

`timeline-journey` presents history as an edited sequence rather than a slideshow.
Supply a `SceneTemplateSpec<"timeline-journey">` with dated events. The caller owns
playback and supplies `frame`; the component creates no clock. Every visual is a pure
function of the frame, so any frame can be seeked and exported.

**Causal beat.** *Input:* a period and its dated, sourced photographs. *Transform:*
the playhead travels the rail and the year rolls to each date while the camera moves
to the next plate. *Output:* every plate returns as a contact sheet beside the elapsed
span, so the change across the period is the payoff.

**Beats.** `cueFrames[0]` ends the time anchor and `cueFrames[2]` starts the summary.
Without `cueFrames`, the anchor is about 7% of the duration and the summary about 15%.
`cueFrames[1]` is only the ST1 phase marker.

- **Anchor (0 → cue 0):** the rail draws on from frame 0. The first year rises into
  the readout column by column; no transient wrong year is ever readable. The
  programme eyebrow, the period range (`1903 – 1981`) and the `narrative` title rise.
  A defocused copy of the first plate gives the frame depth.
- **Events (cue 0 → cue 2):** each event owns a window: a transition, then a reading
  hold of at least 48 frames. The year readout rolls like a mechanical odometer:
  a higher digit moves only while every lower digit carries 9 → 0. Units get slight
  motion blur at speed. The playhead travels between ticks on the same easing curve.
  The outgoing copy leaves early in the move. The incoming title (masked word rise),
  caption (fast word wave) and source line land on their cues. The date line lands
  with the year, never before it.
- **Summary (cue 2 → end):** the last plate shrinks into a contact sheet. The other
  plates arrive in chronological order, each with a year chip, and their rail ticks
  pulse as they do. The readout counts the elapsed span (`77 years`, from
  `Intl.NumberFormat` unit formatting), followed by `summary.statement` and
  `summary.detail`.

**Transitions** (`transition` per event = how the edit arrives at it; content default `"truck"`):

| style | motivation | behaviour |
|---|---|---|
| `truck` | moving forward in time | a lateral camera move along a strip of plates in the same direction as the playhead; the outgoing plate dims; in landscape the plate window feathers before the copy lane, so moving images never pass under text |
| `match-cut` | shape continuity | the outgoing plate punches in on its focus, then hard-cuts to the incoming plate with its focus on the same screen point at the same scale, and settles to its own framing |
| `dissolve` | a related moment | a crossfade while Ken Burns continues |
| `cut` | a hard editorial change | a switch at the midpoint of the window |

The first event is revealed with a wipe from the anchor. `transitionFrames` (0–96,
default 30) sets the move length per event or for all events. Reduced motion turns
every transition into a cut on its frame.

**Ken Burns with intent.** The image is laid out at its full cover size and may
overhang the plate. The camera can therefore pan into parts a centred crop would hide,
for example a head above a square photo in a wide plate. The view centre moves
linearly from the plate centre to `focus` (`kenBurns: "in"`, default), or the reverse
(`"out"`). `"none"` holds on the focus. A focus *region* sets how tight the push ends
(1.02–1.45×); a point ends at 1.15×. Translation is clamped so no edge ever shows.
Thumbnails frame their focus.

**Inputs.** All visible copy is an input; nothing English is built in except the
default counter template.

| field | purpose |
|---|---|
| `events[]` | 2–12 `{ id, label (title), date \| when, caption \| description, image?, focus?, source?, credit?, dateLabel?, eyebrow?, kenBurns?, grade?, frames?, transition?, transitionFrames?, cues?, annotations? }` |
| `date` | ISO 8601 (`"1903"`, `"1903-12"`, `"1903-12-17"`, expanded `"-000499"`); the precision is the number of fields given; legacy strings `Date.parse` accepts still work |
| `when` | `{ year, month?, day? }` with historical years: −500 is 500 BCE, and there is no year 0 |
| `spacing` | `"elapsed"` places ticks by true time on a continuous rail with round-step graduations; `"equal"` places them evenly on a segmented rail, so the two read differently |
| `nonLinear` | allows a deliberately out-of-order edit; the rail still places ticks by date |
| `locale`, `dateFormat` | BCP 47 locale for every date, range, era and number (Intl only; digits roll in the locale's own numbering system); `dateFormat` caps the date-line precision (`auto`, `year`, `month`, `day`) |
| `eyebrow`, `narrative`, `counter`, `summary` | programme eyebrow, anchor title, counter template (`"{index} / {count}"`, `""` hides it), and summary `{ eyebrow?, statement, detail?, span? }` (`span: false` hides the readout; a string overrides it) |
| `cues` | per-event `title`, `caption` and `source` offsets in frames from arrival (defaults −4, +8, +14) |
| `frames` | an event's window; omitted events share what is left between the anchor and the summary |
| `grade` | `{ mode: "mono" \| "sepia" \| "color", intensity 0–1 }` per event or as the default |
| `rail` | `graduations` (elapsed only, default on) and `labels` (`"bounds"`: period ends plus the active year; `"none"`) |
| `palette`, `typography` | CSS colours and font stacks; colours are also overridable from outside via `--km-tj-bg`, `--km-tj-ink`, `--km-tj-muted`, `--km-tj-rail`, and the accent via `spec.accent` / `--km-accent` |
| `backdrop`, `look` | `"blur"` (default) fills the frame with the defocused current plate; `look.grain`/`vignette` 0–1 |
| `annotations` | SA1 marks in that image's space; bind them to the event with `{ step: "<event id>" }` |

**Migration.** The change is additive; no version bump. The original payload
(`events: { id, label, date, image?, description? }[]`, `spacing`, `narrative`,
`nonLinear?`) validates and renders unchanged: `label` is the title and `description`
the caption. Validation is stricter in three honest ways. Dates must be real calendar
dates. A timeline may have 2–12 events. Each event must fit a 48-frame reading hold.

**Layout and type.** Landscape keeps a fixed copy lane at the left (eyebrow, year
readout, date line, accent rule, title, caption) and a plate window at the right, with
the rail across the bottom. Portrait stacks plate, copy and rail. Sizes are fractions
of the short side and resolve in `cqw`, so preview and export agree. Titles are 6.2%
(4.6% minimum). Captions are 3.6–4% (2.8% minimum). The date line is 3.5%, the year
readout 13–17%, and source and rail labels 2.5–2.9%. Titles and captions are fitted to
3–5 lines in their lane. Below the minimum they take more lines; they are never
clipped. Year labels on the rail are collision-aware: the bounds give way to the
active year, and a bound event's label keeps the bound's alignment.

**Accessibility.** Decorative layers are `aria-hidden`. A visually hidden line
announces the current date, title, caption and source. Images keep their `alt`.
Reduced motion removes the camera moves, rolls, word motion and grain drift, and shows
each beat settled at or after its frame.

**Slots.** `renderAsset` (frame-addressable media), `renderOverlay` (stage space,
with the event-arrival beats), `className`, `style`, the forwarded ref and DOM props
all pass through `SceneTemplateView`. Pure helpers, including date resolution, Intl
formatting, `timelineJourneySchedule`, rail positions, graduations and
`odometerColumns`, live in `registry/video/timeline-journey.ts`.

**Storybook:** *Video production / Scene Templates / Timeline Journey*, with play,
pause, seek, 16:9 or 9:16, reduced motion and an en/ja copy control. The demo is a
40-second history of flight, 1903–1981, on an elapsed rail.

| event | date | photograph (public domain) | fact source |
|---|---|---|---|
| First powered flight, 12 s, 120 ft | 1903-12-17 | LoC LC-DIG-ppprs-00626, John T. Daniels | LoC item title "First flight, 120 feet in 12 seconds" |
| Blériot crosses the Channel, Calais → Dover | 1909-07-25 | LoC Bain LC-USZ62-94567 (after landing at Dover) | FAI: "first ever flight in an airplane across the Channel" |
| Lindbergh, New York → Paris nonstop solo, 33 h 30 min | 1927-05-20 | LoC Harris & Ewing LC-DIG-hec-34667 (dated 1927 or 1928; credited as such) | Smithsonian NASM, Ryan NYP object record |
| Yeager, Bell X-1, Mach 1.06 | 1947-10-14 | NASA, X-1 46-062 on a test flight (c. 1947; not claimed to be the record flight) | Smithsonian NASM, Bell X-1 object record |
| Apollo 11 lands; Aldrin photographed by Armstrong | 1969-07-20 | NASA AS11-40-5903 | NASA image caption |
| STS-1, first Space Shuttle mission, Young and Crippen | 1981-04-12 | NASA S81-30498 / 81pc0382 | NASA image caption |

Provenance, rights statements and modifications (crops of torn print edges, resizing)
are recorded in `assets/THIRD_PARTY_ASSETS.json`. The elapsed span (77 years,
17 Dec 1903 → 12 Apr 1981) is computed, not authored. NASA media are used factually,
with no implied endorsement. No audio.

**Limits.** The camera is 2D: plates are flat photographs moved by Ken Burns, trucks
and cuts, not a 3D editorial set. Calendars are proleptic Gregorian, so convert Julian
dates yourself. Caption fitting estimates glyph widths, so very long copy (above about
220 Latin or 110 CJK characters) can exceed the lane. Run the rendered-bounds check on
real copy at the output size. Human visual review at normal playback speed remains a
release gate. These scenes are not a claim of premium signoff.
