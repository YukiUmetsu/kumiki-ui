# ANAT1 human-body lattice — provenance

`human-body-lattice.bin` is baked by `scripts/anatomy/bake_makehuman.py` from the MakeHuman base mesh (hm08), macro
targets (`targets/macrodetails`, `targets/macrodetails/height`), default skeleton (`rigs/default.mhskel`) and skin
weights (`rigs/default_weights.mhw`) at https://github.com/makehumancommunity/makehuman revision
a8bc2d54ff0ac92e78ff71431b1023eda42bf482. Those assets were released under **CC0 1.0** in September 2020
(`LICENSE.ASSETS.md` in that repository). No attribution is required; this notice records provenance.

Modifications: body decimated to ~3,400 vertices with exact barycentric transfer of every target; 72 macro corners,
16 height and 24 ancestry deltas stored as int16 (0.1 mm); skeleton reduced to 57 bones (face, twist and toe-segment
bones merged into their nearest kept ancestor); 47 named anthropometric landmarks added.
