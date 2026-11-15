# PAPER-D3 — ArtCraft source-led hinged printed-page film transition

**Design goal:** A solid, previously printed paper leaf flips on a visible stable gutter, exposing the next cut-paper composition as an independent scene. It must not be merely a color rectangle wipe, photographic grade or alpha dissolve. Preserve the user's original detailed stock and its holes.

## Reference research: construction rather than visual copying

| Source and actual observation | Transfer into a code-authored scene | Unsupported inference |
| --- | --- | --- |
| [Smithsonian Libraries: Paper Engineering](https://library.si.edu/digital-library/exhibition/paper-engineering) and [page turning mechanism](https://library.si.edu/digital-library/exhibition/paper-engineering/page-turners-paper-engineering-fold-pull-pop-turn) | Actual pages are mechanically rotated around a binding. Implement fixed leaf hinge and material-sided front/back, not alpha blend. | We did not physically measure torque, thickness, book cradle or fold bending. |
| [Su Blackwell: The Dark is Rising](https://www.meer.com/long-and-ryle-gallery/artworks/75027) | The elaborate paper world sits on a separate book stock; reference informs layered depth and opaque relief while preserving actual artist's copyright. | No tracing of tree/house shapes; not an exact artwork recreation. |
| [Helen Hiebert: Pop-Up Hand Shadow Book](https://www.artworkarchive.com/profile/helen-hiebert/artwork/pop-up-hand-shadow-book) | Panel binding and moving cutout stay visibly distinct with motivated edge shadow. | No simulation of folded hand sculptures or flashlight field. |
| [Yusuke Oono 360-degree laser-cut book](https://www.core77.com/posts/114559/Architect-Uses-CAD-and-Laser-Cutter-to-Create-360-Degree-Pop-Up-Books) | Stable hinge / layered substrate topology guides the rig and seam. | No claim of his artwork's silhouette fidelity or 360-degree mechanical deployment. |

**Rights:** Only citations and reference-image URLs; no copyrighted source images, meshes or cut contours were imported or distributed. Detailed source image crops and high-speed measured page turn frames were not available with reuse rights. ArtCraft structure/fidelity scores based on source pixels are therefore not claimed. The structured study and feature contract are recorded in [PAPER-D3 reference-study JSON](paper-page-turn-artcraft-study.json).

## Construction map

```text
PaperDirectorShot A (last 12 frames)
  -> Full incoming scene B at frame 0, already assembled, behind
  -> OLD artwork printed across full opaque hinged paper leaf
       -> original PAPER1 SVG cut paths, apertures, stock, shadows
       -> separate opaque reverse side in authored cardstock pigment
       -> physical contact line on free edge
  -> stationary hinge/spine at x=0 or x=width
    [page angle 0° → 88.75°; old artwork foreshortens]
PaperDirectorShot B (first 12 frames)
  -> Full incoming scene B advancing locally, still behind leaf
  -> formerly printed A leaf [angle 91.25° → 180°], verso visible
  -> stationary book spine; no fade between A/B
```

The tangent at the stitch jumps 2.5° (88.75→91.25), intentionally avoiding the exact edge-on degenerate polygon. Both colors remain opaque. This is an **original single rigid leaf** (limited 2.5D perspective) with a scored edge and fixed gutter, *not* a physical page curl simulation, multiple-crease V-fold or global 3D model.

## Testable release gates

1. **Topological:** one leaf with two real faces (front artwork and solid verso), one stable spine, one complete incoming scene below, no floating unattached polygon or 3D scene duplication outside the transition.
2. **Opaque:** full-color cutouts remain opaque in both scenes. Old and new paper art are **never alpha blended**; visibility changes only through solid-card projection/occlusion.
3. **Mechanical and camera:** rightward free-edge motion pivots about the right edge, leftward about the left edge. Separate 16:9/9:16 original paper specs must fit; do not stretch one into the other.
4. **Frame purity:** same absolute frame yields identical HTML and native frame pixels, shuffle/jump safe, reduced-motion shows the complete desired scene without a held fold. No extra animation clock.
5. **Stress views:** global f228/234/239/240/246/251 in both orientations; scene B must never start empty. Review 34-frame real 30FPS clip at normal speed, plus at least one cropped leaf edge and spine region.
6. **Regression:** original paper curtain, other paper media, FilmStage, registry, Storybook and both outputs remain compatible.

## Risk log, prior to render

- At angles around 90°, browser CSS perspective projection may cause white pinhole aliasing or seam flicker, especially in 540px portrait output. Inspect the exact 239/240 boundary.
- Browser 3D flattening could hide the reverse-face cardstock or let old artwork remain at a mirrored angle. Inspect 246/251.
- A single flat leaf produces a book flip but not realistic bowed paper or a V-fold. Do not claim otherwise. Rich animation of people/animals remains a separate D4 ArtCraft subject.

**Result status:** awaiting actual exported pixel inspection and full-speed video review; type tests alone are insufficient.
