"""Reference sources and the licence gate.

Every image enters as a Record that names its licence. Only licences on the allow list pass; research-only datasets
(CelebA-HQ, MT, FFHQ's NC images) need an explicit opt-in, and anything learned from them is marked not to ship.

Recommended sets (see scripts/makeup/README.md for the reasons and the licence notes):
  bare faces   Face Research Lab London Set (102 faces, attractiveness ratings, CC BY 4.0)  -> frl-london
               FFHQ, the images whose own Flickr licence is CC0, PDM or US-Gov               -> ffhq (licence-filtered)
  with makeup  CC0 / public-domain portraits found through Openverse                          -> openverse
               MT (BeautyGAN, 2,719 makeup / 1,115 bare), CelebA-HQ (Heavy_Makeup)            -> mt, celebahq (research only)
"""

from __future__ import annotations

import csv
import json
import re
import time
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterator

# licence id -> may ship derived numbers in the MIT library / may redistribute the picture
LICENCES = {
    "cc0-1.0": {"ship": True, "redistribute": True, "attribution": False},
    "pdm-1.0": {"ship": True, "redistribute": True, "attribution": False},
    "us-gov": {"ship": True, "redistribute": True, "attribution": False},
    "cc-by-4.0": {"ship": True, "redistribute": True, "attribution": True},
    "cc-by-2.0": {"ship": True, "redistribute": True, "attribution": True},
    "cc-by-sa-4.0": {"ship": True, "redistribute": False, "attribution": True},
    "cc-by-nc-2.0": {"ship": False, "redistribute": False, "attribution": True},
    "cc-by-nc-sa-4.0": {"ship": False, "redistribute": False, "attribution": True},
    "research-only": {"ship": False, "redistribute": False, "attribution": True},
    "unknown": {"ship": False, "redistribute": False, "attribution": True},
}
DEFAULT_ALLOW = ("cc0-1.0", "pdm-1.0", "us-gov", "cc-by-4.0", "cc-by-2.0")


@dataclass
class Record:
    id: str
    path: str
    source: str
    licence: str
    credit: str = ""
    url: str = ""
    labels: dict = field(default_factory=dict)  # e.g. {"makeup": True} or {"makeup": False, "attractiveness": 4.1}

    def to_json(self) -> dict:
        d = asdict(self)
        d["ship"] = LICENCES.get(self.licence, LICENCES["unknown"])["ship"]
        return d


def gate(records: Iterator[Record], allow: tuple[str, ...]) -> Iterator[tuple[Record, str | None]]:
    """Yield (record, None) when the licence is allowed, else (record, reason)."""
    for r in records:
        if r.licence not in LICENCES:
            yield r, f"licence '{r.licence}' is not known"
        elif r.licence not in allow:
            yield r, f"licence '{r.licence}' is not on the allow list"
        else:
            yield r, None


IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _is_image(p: Path) -> bool:
    """An image file, not a macOS resource fork ('._x.jpg', '__MACOSX') or another hidden file."""
    return p.suffix.lower() in IMAGE_EXT and not p.name.startswith(".") and "__MACOSX" not in p.parts


def folder(root: str, licence: str, credit: str = "", makeup: bool | None = None) -> Iterator[Record]:
    """Any folder of images with one licence. A 'sources.json' beside the images ({file: {licence, credit, url,
    labels}}) overrides per file."""
    base = Path(root)
    side = json.loads((base / "sources.json").read_text()) if (base / "sources.json").exists() else {}
    for p in sorted(base.rglob("*")):
        if not _is_image(p):
            continue
        meta = side.get(p.name, {})
        labels = dict(meta.get("labels", {}))
        if makeup is not None:
            labels.setdefault("makeup", makeup)
        yield Record(id=f"folder-{p.stem}", path=str(p), source=f"folder:{base.name}", licence=meta.get("licence", licence),
                     credit=meta.get("credit", credit), url=meta.get("url", ""), labels=labels)


def frl_london(root: str) -> Iterator[Record]:
    """Face Research Lab London Set (DeBruine & Jones 2017, figshare doi:10.6084/m9.figshare.5047666.v5, CC BY 4.0):
    102 adults photographed without makeup in April 2012, neutral front views, with self-reported age, gender and
    ethnicity, and 1-7 attractiveness ratings by 2,513 raters. The participants consented to use in research and to
    illustrate research; keep the photos local and ship only aggregate numbers."""
    base = Path(root)
    info = {row["face_id"]: row for row in csv.DictReader(open(base / "london_faces_info.csv", encoding="utf-8"))}
    ratings: dict[str, list[float]] = {}
    ratings_path = base / "london_faces_ratings.csv"
    if ratings_path.exists():
        for row in csv.DictReader(open(ratings_path, encoding="utf-8")):
            for k, v in row.items():
                if k.startswith("X") and v not in ("", "NA"):
                    ratings.setdefault(k[1:], []).append(float(v))
    for p in sorted(q for q in base.rglob("*_03.jpg") if _is_image(q)):
        fid = p.stem.split("_")[0]
        meta = info.get(fid, {})
        rs = ratings.get(fid, [])
        yield Record(id=f"frl-{fid}", path=str(p), source="frl-london", licence="cc-by-4.0",
                     credit="Face Research Lab London Set, DeBruine & Jones 2017, CC BY 4.0 (doi:10.6084/m9.figshare.5047666.v5)",
                     url="https://doi.org/10.6084/m9.figshare.5047666.v5",
                     labels={"makeup": False, "age": int(meta["face_age"]) if meta.get("face_age") else None, "gender": meta.get("face_gender"),
                             "ethnicity": meta.get("face_eth"), "attractiveness": round(sum(rs) / len(rs), 4) if rs else None, "raters": len(rs)})


_FFHQ_LICENCE = {"Public Domain Mark": "pdm-1.0", "Public Domain Dedication (CC0)": "cc0-1.0", "United States Government Work": "us-gov",
                 "Attribution License": "cc-by-2.0", "Attribution-NonCommercial License": "cc-by-nc-2.0"}


def ffhq(root: str, metadata: str) -> Iterator[Record]:
    """FFHQ (Karras et al. 2019). The dataset is CC BY-NC-SA 4.0, but each image keeps its own Flickr licence in
    ffhq-dataset-v2.json; the gate keeps the CC0, PDM, US-Gov and CC BY ones. Credit the photographer."""
    meta = json.loads(Path(metadata).read_text())
    for key, m in meta.items():
        md = m.get("metadata", {})
        lic = _FFHQ_LICENCE.get(md.get("license", ""), "unknown")
        img = m.get("image", {}).get("file_path") or m.get("in_the_wild", {}).get("file_path", "")
        p = Path(root) / img
        if not p.exists():
            continue
        yield Record(id=f"ffhq-{int(key):05d}", path=str(p), source="ffhq", licence=lic, credit=f"{md.get('author', '')} via FFHQ (Karras et al. 2019)",
                     url=md.get("photo_url", ""), labels={})


def celebahq(root: str, attributes: str) -> Iterator[Record]:
    """CelebA-HQ with CelebA's attribute labels (Heavy_Makeup, Wearing_Lipstick). Non-commercial research only."""
    lines = Path(attributes).read_text().splitlines()
    names = lines[1].split()
    for line in lines[2:]:
        parts = line.split()
        if not parts:
            continue
        attrs = dict(zip(names, (int(v) for v in parts[1:])))
        p = Path(root) / parts[0]
        if not p.exists():
            p = p.with_suffix(".png")
            if not p.exists():
                continue
        yield Record(id=f"celebahq-{Path(parts[0]).stem}", path=str(p), source="celebahq", licence="research-only", credit="CelebA-HQ (Karras et al. 2018; Liu et al. 2015)",
                     labels={"makeup": attrs.get("Heavy_Makeup", -1) > 0, "lipstick": attrs.get("Wearing_Lipstick", -1) > 0})


def mt(root: str) -> Iterator[Record]:
    """MT, the BeautyGAN makeup-transfer set (Li et al. 2018): images/makeup and images/non-makeup. Research only."""
    for sub, made in (("makeup", True), ("non-makeup", False)):
        for p in sorted((Path(root) / "images" / sub).glob("*")):
            if _is_image(p):
                yield Record(id=f"mt-{sub}-{p.stem}", path=str(p), source="mt", licence="research-only", credit="MT dataset, BeautyGAN (Li et al. 2018)", labels={"makeup": made})


_OV_LICENCE = {"cc0": "cc0-1.0", "pdm": "pdm-1.0", "by": "cc-by-4.0"}


def openverse(query: str, out_dir: str, licences: str = "cc0,pdm", limit: int = 40, makeup: bool | None = True,
              exclude: str = r"sexy|nude|ahegao|lingerie|bikini|amateur") -> Iterator[Record]:
    """Search Openverse (openverse.org, the WordPress Foundation's index of openly licensed media) and download the
    hits through its own image proxy. Each download is saved with a provenance sidecar. Downloads are untrusted data:
    they go into their own folder and are only read as images."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    side_path = out / "sources.json"
    side = json.loads(side_path.read_text()) if side_path.exists() else {}
    got, page = 0, 1
    bad = re.compile(exclude, re.I) if exclude else None
    while got < limit and page <= 8:
        q = urllib.parse.urlencode({"q": query, "license": licences, "category": "photograph", "page_size": 20, "page": page, "mature": "false"})
        req = urllib.request.Request(f"https://api.openverse.org/v1/images/?{q}", headers={"User-Agent": "kumiki-makeup-ingest/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read().decode("utf-8"))
        results = data.get("results", [])
        if not results:
            break
        for hit in results:
            if got >= limit:
                break
            title = hit.get("title") or ""
            if bad and bad.search(title):
                continue
            name = f"ov-{hit['id']}.jpg"
            path = out / name
            if not path.exists():
                req = urllib.request.Request(f"https://api.openverse.org/v1/images/{hit['id']}/thumb/?full_size=true", headers={"User-Agent": "kumiki-makeup-ingest/1.0"})
                try:
                    with urllib.request.urlopen(req, timeout=60) as r:
                        blob = r.read()
                except Exception:
                    continue
                if blob[:3] != b"\xff\xd8\xff":
                    continue
                path.write_bytes(blob)
                time.sleep(0.3)
            lic = _OV_LICENCE.get(hit.get("license", ""), "unknown")
            if lic == "cc-by-4.0":
                lic = f"cc-by-{hit.get('license_version', '4.0')}"
                lic = lic if lic in LICENCES else "unknown"
            side[name] = {"licence": lic, "credit": f"\"{title}\" by {hit.get('creator', 'unknown')} ({hit.get('provider')})",
                          "url": hit.get("foreign_landing_url", ""), "labels": {"makeup": makeup} if makeup is not None else {}}
            got += 1
            yield Record(id=f"ov-{hit['id']}", path=str(path), source=f"openverse:{hit.get('provider')}", licence=lic, credit=side[name]["credit"],
                         url=side[name]["url"], labels=side[name]["labels"])
        page += 1
    side_path.write_text(json.dumps(side, indent=1))
