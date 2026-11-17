"""MAKEUP1 photo pipeline: learn makeup from reference photographs and apply it to other faces.

Phase 1  ingest.py    reference ingestion: dataset adapters, licence gate, landmarks, quality, alignment
Phase 1  geometry.py  facial architecture from the 468-point mesh (thirds, fifths, canthal tilt, lips, cheekbones)
Phase 2  analyze.py   a reference's makeup blueprint: placement, light and shadow, colour, undertone, finish
Phase 2  learn.py     blueprints of many references -> a bare-skin prior, look statistics, beauty correlations
Phase 3  paint.py     a plan or a blueprint painted onto a new face (mesh or thin-plate-spline warp, film blend)

The zone atlas (registry/anatomy/data/makeup-zones.json) and the canonical mesh are shared with the TypeScript
library (registry/anatomy/makeup-*.ts), so a plan made in either language paints the same way in the other.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "registry" / "anatomy" / "data"
