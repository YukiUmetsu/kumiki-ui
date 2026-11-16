# SHO1 brush (筆) — photo reference note

**Date:** 2026-11-16 · **Used for:** `registry/video/shodo/shodo-brush.ts` · **Spec:** [shodō calligraphy](../component-specs/shodo-calligraphy.md)

**Status:** a short study of photographs of real shodō brushes (大筆 and 小筆, new and inked). It records observations only. No image from these sources is in the repository, and no image was traced. The photographs were looked at for study and stay with their owners.

## Sources

| Source | What it shows | Rights |
|---|---|---|
| [Japanese calligraphy in action 01](https://commons.wikimedia.org/wiki/File:Japanese_calligraphy_in_action_01.jpg) (Wikimedia Commons, user Douglaspperkins) | A school class: a 大筆 loaded with ink, held over the inkstone | CC BY 4.0 |
| [Japanese calligraphic brushes, Amsterdam (2021) 01](https://commons.wikimedia.org/wiki/File:Japanese_calligraphic_brushes,_Amsterdam_(2021)_01.jpg) and [02](https://commons.wikimedia.org/wiki/File:Japanese_calligraphic_brushes,_Amsterdam_(2021)_02.jpg) (Commons, user Donald Trung) | New 太筆 and 細筆 in a shop: tufts, collars, handles | CC BY-SA 4.0 |
| [Schreibpinsel](https://commons.wikimedia.org/wiki/File:Schreibpinsel.jpg) (Commons, Immanuel Giel) | Two small brushes, one with a cap: tuft, collar, cord loop | CC BY-SA 3.0 |
| [Japanese Calligraphy Brush](https://commons.wikimedia.org/wiki/File:Japanese_Calligraphy_Brush.jpg) (Commons, user Ph0kin) | A large brush on a rest: a dry, loose tuft and the binding at the joint | CC BY-SA 3.0 |
| [Nara brush](https://commons.wikimedia.org/wiki/File:Nara_brush.jpg) (Commons, user OhMyDeer) | A giant ceremonial brush: cane handle with nodes, a turned collar, dry white hair | CC BY-SA 2.1 JP |
| [奈良筆 craft page](https://sugoude.inuiyosuke.jp/ja/craft/c0/3) (凄腕職人街, sugoude.inuiyosuke.jp) | New Nara brushes in a box; a craftsman writing with an inked 小筆; how hair is set into the cane | All rights reserved. Looked at for study only |

## Observations

**Handle (軸).**
- Natural cane, pale straw to honey: the measured median colour of lit handles is about RGB 210/175/130.
- The surface is smooth, with a satin sheen along the lit side and fine darker specks. There is no large mottling.
- Many handles are cut between nodes, or they show one quiet node.
- The top end is a clean cut, sometimes with a cap and a cord loop for hanging.
- The handle is about as thick as the base of the tuft. On a 大筆 the handle is about three to four times the tuft length.

**Joint (首, 口巻き).**
- On Nara brushes, the hair goes straight into the cane.
- Many school and shop 大筆 have a short dark collar (black lacquer or plastic) at the joint. The collar is flush with the cane, not wider.
- No open end of a tube shows: the hair fills the cane.

**Tuft (穂).**
- New and dry, the tuft is white (goat) or tan to brown (horse, weasel). The hair is stiffened to a sharp point (命毛).
- The belly (腹) is only a little wider than the base (腰). It is about a third of the tuft length out from the joint.
- An inked brush is black and glossy from the point to about three quarters of the tuft.
- The quarter at the joint stays dry and pale. The edge between the two is soft, with single hairs that wick ink upward.
- Wet hair holds one smooth point. Its highlight is a soft band, not a hard line.

**Light and shadow.** The handle casts a long, soft shadow. Near the paper, the tuft's shadow is sharp.

## What changed in the drawing

- The end silhouettes of every cylinder (the handle and the collar) now use the outer half of the end ellipse. Before, they used the inner half, so a pale crescent and a black ellipse showed at the joint, as on an open tube.
- The collar is flush with the cane and short (0.42 of the tuft diameter). It is drawn before the handle, so the handle covers it toward a camera above the paper.
- The ink line on the hair starts at 22 % to 24 % of the tuft length when the brush is full. The dry base is pale, and single hairs have less contrast there. A short run between the dry and the wet part gives a wicking edge.
- The wet sheen is softer (a weaker thin core).
- The mottle of the scanned cane is kept at 60 % of the scan.
- The lean, the press, the bend and the motion of the brush are as before. They come from `shodoBrushPose`.

## Limits

- The brush is still code-drawn: there is no hair simulation and no subsurface light.
- The collar is always drawn, although Nara brushes have none.
- A human comparison at normal playback speed is still necessary.
