"""Adds a race rear kit to the Car Concept GLB (CC BY 4.0; see assets/models/vehicles/concept-car.LICENSE.md): a carbon diffuser with
strakes, twin titanium exhaust tips and an LED rain light over the licence plate. Everything already in the file is kept as it is; the kit
is appended as new meshes, materials and textures under one root node, "RearKit". Running it again on a file that has the kit does nothing.

Usage: python3 -I scripts/assets/concept-car-rear-kit.py assets/models/vehicles/concept-car.glb
"""
import io, json, math, struct, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

path = sys.argv[1]
blob = open(path, "rb").read()
jlen = struct.unpack("<I", blob[12:16])[0]
gltf = json.loads(blob[20:20 + jlen])
if any(node.get("name") == "RearKit" for node in gltf["nodes"]):
    print("The rear kit is already in", path); sys.exit(0)
bin_start = 20 + jlen + 8
binary = bytearray(blob[bin_start:bin_start + struct.unpack("<I", blob[20 + jlen:24 + jlen])[0]])

# The car's own frame, as Blender shows it: x across (left +), y towards the tail, z up. The tail is at y = 1.94, the underbody at
# z = .09 and the plate at y = 1.92, z = .26 to .37. glTF's frame is (x, z, -y).
to_gltf = lambda v: np.stack([v[..., 0], v[..., 2], -v[..., 1]], -1)

def append(data: bytes, target=None) -> int:
    while len(binary) % 4: binary.append(0)
    view = {"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)}
    if target: view["target"] = target
    binary.extend(data); gltf["bufferViews"].append(view)
    return len(gltf["bufferViews"]) - 1

def accessor(array: np.ndarray, kind: str, target=None, bounds=False) -> int:
    array = np.ascontiguousarray(array)
    comp = 5125 if array.dtype == np.uint32 else 5126
    acc = {"bufferView": append(array.tobytes(), target), "componentType": comp, "count": int(array.shape[0]), "type": kind}
    if bounds: acc["min"] = array.min(0).tolist(); acc["max"] = array.max(0).tolist()
    gltf["accessors"].append(acc)
    return len(gltf["accessors"]) - 1

class Builder:
    """Collects triangles in the car's frame, with normals and UVs in metres."""
    def __init__(self): self.p, self.n, self.uv, self.i = [], [], [], []
    def quad(self, a, b, c, d, uv_scale=1.0):
        a, b, c, d = map(np.asarray, (a, b, c, d))
        normal = np.cross(b - a, d - a); normal = normal / (np.linalg.norm(normal) or 1)
        base = sum(len(x) for x in self.p)
        u = (b - a) / (np.linalg.norm(b - a) or 1); w = np.cross(normal, u)
        pts = np.array([a, b, c, d]); uvs = np.stack([(pts - a) @ u, (pts - a) @ w], -1) * uv_scale
        self.p.append(pts); self.n.append(np.repeat(normal[None], 4, 0)); self.uv.append(uvs)
        self.i.append(np.array([0, 1, 2, 0, 2, 3]) + base)
    def box(self, centre, size, tilt=0.0, uv_scale=1.0):
        """An axis box, tilted about x by `tilt` radians (nose up for a diffuser floor rising to the tail)."""
        c, (sx, sy, sz) = np.asarray(centre, float), size
        rot = np.array([[1, 0, 0], [0, math.cos(tilt), -math.sin(tilt)], [0, math.sin(tilt), math.cos(tilt)]])
        corner = lambda x, y, z: c + rot @ np.array([x * sx / 2, y * sy / 2, z * sz / 2])
        for (a, b, cc, d) in [((-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)), ((-1, 1, -1), (1, 1, -1), (1, -1, -1), (-1, -1, -1)),
                              ((-1, 1, -1), (-1, 1, 1), (1, 1, 1), (1, 1, -1)), ((1, -1, -1), (1, -1, 1), (-1, -1, 1), (-1, -1, -1)),
                              ((1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)), ((-1, -1, 1), (-1, 1, 1), (-1, 1, -1), (-1, -1, -1))]:
            self.quad(corner(*a), corner(*b), corner(*cc), corner(*d), uv_scale)
    def tube(self, centre, radius, y0, y1, inward=False, segments=40, end=None):
        """A cylinder along y from y0 to y1 (open), facing out, or in for the inside of a pipe. `end` closes it at that y with a disc
        facing the tail."""
        cx, cz = centre
        for k in range(segments):
            t0, t1 = 2 * math.pi * k / segments, 2 * math.pi * (k + 1) / segments
            p = lambda t, y: (cx + radius * math.cos(t), y, cz + radius * math.sin(t))
            a, b, c, d = p(t0, y0), p(t1, y0), p(t1, y1), p(t0, y1)
            base = sum(len(x) for x in self.p); pts = np.array([a, b, c, d], float)
            nrm = np.array([[math.cos(t), 0, math.sin(t)] for t in (t0, t1, t1, t0)]) * (-1 if inward else 1)
            self.p.append(pts); self.n.append(nrm); self.uv.append(np.array([[k / segments, 0], [(k + 1) / segments, 0], [(k + 1) / segments, 1], [k / segments, 1]]))
            self.i.append(np.array([0, 2, 1, 0, 3, 2] if not inward else [0, 1, 2, 0, 2, 3]) + base)
            if end is not None:
                base = sum(len(x) for x in self.p)
                self.p.append(np.array([(cx, end, cz), p(t0, end), p(t1, end)], float)); self.n.append(np.repeat([[0, 1, 0]], 3, 0)); self.uv.append(np.zeros((3, 2)))
                self.i.append(np.array([0, 2, 1]) + base)
    def ring(self, centre, r_in, r_out, y, segments=40):
        """A flat annulus facing the tail: the lip of a pipe."""
        cx, cz = centre
        for k in range(segments):
            t0, t1 = 2 * math.pi * k / segments, 2 * math.pi * (k + 1) / segments
            p = lambda r, t: (cx + r * math.cos(t), y, cz + r * math.sin(t))
            base = sum(len(x) for x in self.p)
            self.p.append(np.array([p(r_in, t0), p(r_out, t0), p(r_out, t1), p(r_in, t1)], float)); self.n.append(np.repeat([[0, 1, 0]], 4, 0))
            self.uv.append(np.zeros((4, 2))); self.i.append(np.array([0, 2, 1, 0, 3, 2]) + base)
    def mesh(self, name, material):
        p, n = to_gltf(np.concatenate(self.p)).astype(np.float32), to_gltf(np.concatenate(self.n)).astype(np.float32)
        uv, i = np.concatenate(self.uv).astype(np.float32), np.concatenate(self.i).astype(np.uint32)
        prim = {"attributes": {"POSITION": accessor(p, "VEC3", 34962, True), "NORMAL": accessor(n, "VEC3", 34962), "TEXCOORD_0": accessor(uv, "VEC2", 34962)},
                "indices": accessor(i, "SCALAR", 34963), "material": material}
        gltf["meshes"].append({"name": name, "primitives": [prim]})
        gltf["nodes"].append({"name": name, "mesh": len(gltf["meshes"]) - 1})
        return len(gltf["nodes"]) - 1

def image(img: Image.Image, name: str) -> int:
    out = io.BytesIO(); img.save(out, "PNG")
    gltf["images"].append({"name": name, "mimeType": "image/png", "bufferView": append(out.getvalue())})
    gltf.setdefault("samplers", []).append({"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497})
    gltf["textures"].append({"source": len(gltf["images"]) - 1, "sampler": len(gltf["samplers"]) - 1})
    return len(gltf["textures"]) - 1

def material(spec) -> int:
    gltf["materials"].append(spec); return len(gltf["materials"]) - 1

# Carbon twill: 2x2 weave, each tow a soft ridge, so the clearcoat catches a woven sheen. 32 tows to the tile; one tile is 12 cm.
tile, tows = 512, 16
y, x = np.mgrid[0:tile, 0:tile] / tile * tows
tow_u, tow_v = np.floor(x), np.floor(y)
over = ((tow_u + tow_v) // 2 % 2 == 0) ^ (((tow_u - tow_v) % 4) < 2)
ridge = np.where(over, np.sin((x % 1) * math.pi), np.sin((y % 1) * math.pi)) ** .6
grey = (16 + 30 * ridge * np.where(over, 1, .8)).astype(np.uint8)
carbon = image(Image.fromarray(np.stack([grey, grey, (grey * 1.06).clip(0, 255).astype(np.uint8)], -1)), "Carbon twill")
# Rain light: a grid of LEDs behind a smoked lens.
led = Image.new("RGB", (512, 256), (6, 4, 4)); draw = ImageDraw.Draw(led)
for row in range(6):
    for col in range(16):
        cx, cy = 22 + col * 31, 30 + row * 39; draw.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(255, 40, 30))
led = Image.blend(led, led.filter(ImageFilter.GaussianBlur(6)), .35)
led_tex = image(led, "Rain light LEDs")

m_carbon = material({"name": "Rear Kit Carbon", "pbrMetallicRoughness": {"baseColorTexture": {"index": carbon}, "metallicFactor": 0, "roughnessFactor": .5},
                     "extensions": {"KHR_materials_clearcoat": {"clearcoatFactor": .35, "clearcoatRoughnessFactor": .12}}})
m_titanium = material({"name": "Rear Kit Titanium", "pbrMetallicRoughness": {"baseColorFactor": [.62, .6, .57, 1], "metallicFactor": 1, "roughnessFactor": .24}})
m_soot = material({"name": "Rear Kit Soot", "pbrMetallicRoughness": {"baseColorFactor": [.012, .011, .01, 1], "metallicFactor": 0, "roughnessFactor": .9}})
m_housing = material({"name": "Rear Kit Housing", "pbrMetallicRoughness": {"baseColorFactor": [.02, .02, .022, 1], "metallicFactor": 0, "roughnessFactor": .45}})
m_led = material({"name": "Rear Kit Rain Light", "pbrMetallicRoughness": {"baseColorTexture": {"index": led_tex}, "metallicFactor": 0, "roughnessFactor": .2},
                  "emissiveTexture": {"index": led_tex}, "emissiveFactor": [1, 1, 1], "extensions": {"KHR_materials_emissive_strength": {"emissiveStrength": 1.6}}})

TAIL = 1.95  # the exhaust tips stand 5 cm proud of the bumper's face (y = 1.88 to 1.90 at their height)
children = []
# Diffuser: under the tail the bumper's lower edge is 17 cm up and the space beneath it is open. A carbon floor ramps up into it from
# the underbody (z = .09 at y = 1.0) to just under that edge at the bumper's face (y = 1.885), with seven strakes and two side fences
# beneath it, flush with the face, so seen from behind the tail ends in a diffuser rather than a gap.
floor = Builder(); floor.box((0, 1.4425, .1215), (1.5, .885, .012), tilt=math.atan2(.075, .885), uv_scale=1 / .12)
# The strakes fill the tunnel between the ramp and the underbody's floor line (z = .085), as a diffuser's do: they never hang below it.
for x in (-.74, -.6, -.4, -.2, 0, .2, .4, .6, .74):
    floor.box((x, 1.665, .1225), (.012 if abs(x) < .7 else .016, .43, .075), uv_scale=1 / .12)
children.append(floor.mesh("RearKitDiffuser", m_carbon))
# Twin exhausts either side of the plate: a titanium tip with a rolled lip, sooty inside.
tips, insides = Builder(), Builder()
for x in (-.31, .31):
    tips.tube((x, .25), .046, 1.78, TAIL)
    tips.ring((x, .25), .038, .046, TAIL)
    insides.tube((x, .25), .038, 1.80, TAIL, inward=True, end=1.84)
children.append(tips.mesh("RearKitExhaustTips", m_titanium))
children.append(insides.mesh("RearKitExhaustInsides", m_soot))
# Rain light over the plate: a smoked housing with an LED face.
housing, face = Builder(), Builder()
housing.box((0, 1.921, .315), (.37, .014, .112))
face.quad((.168, 1.9285, .276), (-.168, 1.9285, .276), (-.168, 1.9285, .354), (.168, 1.9285, .354))
face.uv[-1] = np.array([[1, 1], [0, 1], [0, 0], [1, 0]], float)
children.append(housing.mesh("RearKitRainLightHousing", m_housing))
children.append(face.mesh("RearKitRainLight", m_led))

gltf["nodes"].append({"name": "RearKit", "children": children})
gltf["scenes"][gltf.get("scene", 0)]["nodes"].append(len(gltf["nodes"]) - 1)

while len(binary) % 4: binary.append(0)
gltf["buffers"][0]["byteLength"] = len(binary)
js = json.dumps(gltf, separators=(",", ":")).encode()
js += b" " * (-len(js) % 4)
out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binary)) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(binary), 0x004E4942) + bytes(binary)
open(path, "wb").write(out)
print("Added the rear kit:", len(children), "meshes,", len(out) // 1024, "KB")
