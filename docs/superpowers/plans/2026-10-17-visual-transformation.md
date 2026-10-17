# VisualTransformation implementation plan

User-authorized implementation, including tests and rendered inspection.

1. Define VT1 scene/mapping contracts and bounded 2D support. Audit MG1 reuse.
2. Write failing topology and transformation boundary/ownership tests.
3. Implement scene preparation, strategy selection, MG1 compilation, pure frame
   sampling, inherited clipping and immutable interruption history.
4. Add SVG adapter, seven reusable recipes, connected reference film and stories.
5. Add registry item and clean-install usage; update canonical contract docs.
6. Run targeted/full checks, render real film in Chromium, inspect frames, fix
   defects, and report exact verification and remaining limits.

Ruling: use the current checkout (initially clean) for the requested component.
Ruling: C0 appearance continuity is explicit; universal C1 is outside the kernel's
current guarantees. Keep the 3D boundary out of this 2D implementation.
Ruling: latest user request restores testing and visual inspection.
