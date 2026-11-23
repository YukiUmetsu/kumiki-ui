# Match a drawing to a reference illustration

Use this page when a drawing must be as good as a reference picture, or when the question is "why does ours look worse?". It gives the order of work, and the tool that shows which part is at fault: `scripts/reference-match.py`. It applies to any drawn subject with two points that are the same in both pictures. On a face these are the middles of the irises.

**Rights.** A reference is for study. Read positions, proportions and values from it, then draw with your own marks. Do not trace it, and do not model a face on a real person. Keep the reference, and each picture that shows a part of it, in a scratch folder and off every page you deliver. The tool does not write inside a Git work tree.

## Order of work

1. **Choose one main reference.** If there are more, ask which one, or which one for each part. Ranges from several pictures pass while the drawing still looks worse.
2. **Level first.** Read the two anchors (below), write `pair.json`, and look at `side`. Until both pictures are levelled, do not write a number and do not name a difference in pose, length or tilt. A picture that is turned a few degrees, or cropped in another way, shows false differences: a longer chin, a turned head, wider eyes.
3. **Compare the big shapes first.** Look at the outline of the face or body, the silhouette of the hair or mass, the hairline, and the eyes. `overlap` and `side` show where to look. Take the number from `trace`, each 0.05 along the line.
4. **Then the values.** Use `values` on three or four boxes. Busy grey where the reference is calm and dark takes the eye off the subject.
5. **Then construction.** For each mass, write where it starts, what it runs along and where it ends. For hair: the part, the hairline, the tie. Copy that before any strand.
6. **If the fault is not clear, use `swap`.** The part whose exchange changes the look most is the fault. If the reference keeps its looks with all of your features in it, the fault is round them.
7. **Change one cause, then measure again.** Keep the old render next to the new one. Change the outline of a face in small steps, 0.02 to 0.04. Keep what was accepted.
8. **Read feedback as a small change of one thing.** A word about shape can be about a shade or a line: "rounder" can be met with less shade on the jaw, not with a wider jaw. Ask for the part and the picture if it is not clear.
9. **Draw masses solid and overlapping, then cut paper out of them.** Two masses painted up to a gap leave a blurred edge. Draw paired features of a turned head once from the front and turn them.
10. **Look at each close-up at final size,** in each finish, for stray marks, before you show it.

## The tool

Needs Python 3, Pillow and numpy. `python3 -I scripts/reference-match.py -h` gives an example of each command.

| Command | Question it answers |
|---|---|
| `zoom` | Where exactly are the two anchors, in pixels? |
| `side` | What differs, by eye, in the same frame and size? Add `--grid 0.1` to read points |
| `overlap` | Do the dark shapes cover each other? Grey is both, blue is only the reference, orange is only the drawing |
| `values` | In a named box, how dark, how busy (`spread`) and how full (`covered`) is the dark? |
| `trace` | Along a line, how far off is it, how thick and how dark? `--by x` for a lying line, `--by y` for a standing one. Give it only a stretch where both lines are in the open: near hair it finds the hair. A gap with a plus sign is down or to the right |
| `swap` | Which part makes the difference? It pastes polygons that you name, both ways. Look at the picture it writes |

```json
{ "reference": { "image": "ref.png", "a": [305.5, 338], "b": [396, 327] },
  "drawing":   { "image": "ours.png", "a": [1088.5, 1404.8], "b": [1468.7, 1363.2] } }
```

**Read the anchors to half a pixel.** Zoom on one eye at a time, with a box of about half the distance between the eyes. Take the middle of the iris's whole circle, from its left and right rims and its foot. The lid hides the top, so the middle of the visible part is too low. Then check them: in `side --box=-0.8,-0.3,0.8,0.3 --scale 700 --grid 0.1` a red cross must sit on the middle of each of the four irises. If one does not, correct it first. An error of 4 pixels at one eye tilts everything by a degree and a half.

All other numbers are in the levelled frame: origin between the anchors, their distance is 1, y down. Write a value that starts with a minus sign with `=`: `--box=-1.3,-2,2,1.6`. For a drawing from code, take the anchors from its geometry (`head.level` for an INK-RISO1 head).

## What the numbers mean

- **Error.** One pixel in an anchor is 0.011 when the anchors are 90 pixels apart. Smaller gaps than that are noise.
- **Resolution.** The measuring commands reduce both pictures to the coarser one. A small reference has less texture, so a full-size drawing would look busy beside it.
- **`overlap` and `values` are alarms, not targets.** They reward a fat shape in the right place. They say how far a drawing is from one picture, not if it is good.
- **Do not use a face detector on a drawing.** It misplaced a drawn chin by a tenth of the face, and its result moved with the render size. Read points by hand.
- A person must judge the result. Say who looked at it.
