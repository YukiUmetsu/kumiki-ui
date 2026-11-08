"""Bake a set's lighting with Blender Cycles, for the Real-Light Flythrough recipe.

Builds a sandstone slot canyon procedurally, lights it with a high sun through the narrow top and a blue sky, path-traces the light
(direct and every bounce) into a texture on each surface, and exports a glTF whose textures *are* the lit picture. Real-time renders
then show path-traced light, including the orange glow that bounces down the walls, at the cost of a texture lookup.

Run (about a minute on an M-series GPU):
  nice -n 15 /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/light-bake.py -- \
    --out assets/baked/slot-canyon.glb [--samples 96] [--size 2048]

The rock and sand are photographed CC0 materials from Poly Haven ("Cliff Side" by James Ray Cock, Dario Barresi and Jenelle van Heerden;
"Dense Sand" by Dimitrios Savva). The script downloads their 2K maps once into ~/.cache/kumiki/polyhaven, checks each file's MD5
against Poly Haven's API, and uses them only as bake inputs: their colour and normal maps shape the path-traced light, their height maps
displace the walls, and two small tiling detail maps derived from them are written next to the glTF for close-up grain at render time.
Everything else is generated from fixed parameters. The camera path along the canyon floor is written next to
the glTF as <name>.path.json, in glTF coordinates (Y up, the canyon running toward -Z).
"""
import bpy, bmesh, hashlib, json, math, os, sys, urllib.request
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = os.path.abspath(arg("--out", "assets/baked/slot-canyon.glb"))
SAMPLES, SIZE = int(arg("--samples", "96")), int(arg("--size", "2048"))
EXPOSURE = float(arg("--exposure", "1.25"))
LENGTH, HEIGHT = 34.0, 15.0
ROCK_TILE, SAND_TILE = 1.83, 1.8  # metres of real surface in one texture tile, from Poly Haven's dimensions
CACHE = os.path.expanduser("~/.cache/kumiki/polyhaven")

def polyhaven(asset, kind):
    """A Poly Haven 2K JPG map, downloaded once and verified against the MD5 the API publishes."""
    os.makedirs(CACHE, exist_ok=True)
    info = json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.polyhaven.com/files/{asset}", headers={"User-Agent": "kumiki-light-bake/1.0"})))
    entry = info[kind]["2k"]["jpg"]; path = os.path.join(CACHE, os.path.basename(entry["url"]))
    if not os.path.exists(path) or hashlib.md5(open(path, "rb").read()).hexdigest() != entry["md5"]:
        urllib.request.urlretrieve(entry["url"], path)
    if hashlib.md5(open(path, "rb").read()).hexdigest() != entry["md5"]:
        raise SystemExit(f"{path} does not match Poly Haven's MD5")
    return path
def load_image(path, colour):
    image = bpy.data.images.load(path, check_existing=True)
    image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
    return image
def heights(image):
    """A height map as a 2D float array, rows bottom to top as Blender stores them."""
    w, h = image.size; px = np.empty(w * h * 4, dtype=np.float32); image.pixels.foreach_get(px)
    return px.reshape(h, w, 4)[:, :, 0]
def sample(field, u, v):
    """Bilinear sample of a tiling field at texture coordinates (u, v), wrapped."""
    h, w = field.shape; x = (u % 1) * w - .5; y = (v % 1) * h - .5
    x0, y0 = int(math.floor(x)) % w, int(math.floor(y)) % h; x1, y1 = (x0 + 1) % w, (y0 + 1) % h; fx, fy = x - math.floor(x), y - math.floor(y)
    return (field[y0, x0] * (1 - fx) + field[y0, x1] * fx) * (1 - fy) + (field[y1, x0] * (1 - fx) + field[y1, x1] * fx) * fy
ROCK = {kind: polyhaven("cliff_side", kind) for kind in ("Diffuse", "nor_gl", "Displacement")}
SAND = {kind: polyhaven("dense_sand", kind) for kind in ("Diffuse", "nor_gl", "Displacement")}
ROCK_HEIGHT, SAND_HEIGHT = heights(load_image(ROCK["Displacement"], False)), heights(load_image(SAND["Displacement"], False))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def centre(s):
    """The slot's centreline: it meanders, as water-cut canyons do. s runs along Blender +Y (glTF -Z)."""
    return Vector((1.5 * math.sin(s * .21) + .7 * math.sin(s * .53 + 1.1), s, 0))
def half_width(s, h):
    """Half the slot's width at a distance s and height h: wider at the floor, pinching toward a narrow top, with flowing flutes."""
    taper = 1.75 - 1.12 * (h / HEIGHT) ** .8
    flutes = .26 * math.sin(h * 1.15 + s * .37 + math.sin(s * .61 + h * .42) * 1.4) + .11 * math.sin(h * 2.9 - s * .8)
    swell = .26 * math.sin(s * .29 + 2.0) * math.sin(h * .31)
    return max(.18, taper + flutes + swell)

def wall(side):
    mesh = bpy.data.meshes.new(f"wall-{'left' if side < 0 else 'right'}")
    bm = bmesh.new()
    # About 10 cm between vertices, so the rock's height map can rough up the wall's real shape, not just its shading.
    ns, nh = 340, 160
    verts = []
    for i in range(ns + 1):
        s = LENGTH * i / ns
        c, ahead = centre(s), centre(s + .05)
        tangent = (ahead - c).normalized()
        normal = Vector((tangent.y, -tangent.x, 0))
        row = []
        for j in range(nh + 1):
            h = HEIGHT * j / nh
            # Raised rock (white in the height map) stands out into the slot by up to 14 cm.
            relief = (sample(ROCK_HEIGHT, s / ROCK_TILE, h / ROCK_TILE) - .5) * .28 * min(1, h / .4)
            row.append(bm.verts.new(c + normal * (side * (half_width(s, h) - relief)) + Vector((0, 0, h))))
        verts.append(row)
    # UVs straight from the grid (along the canyon, up the wall): one seamless island, so the bake has no seams to bleed across.
    uv = bm.loops.layers.uv.new("UVMap")
    for i in range(ns):
        for j in range(nh):
            quad = [verts[i][j], verts[i + 1][j], verts[i + 1][j + 1], verts[i][j + 1]]
            coords = [(i / ns, j / nh), ((i + 1) / ns, j / nh), ((i + 1) / ns, (j + 1) / nh), (i / ns, (j + 1) / nh)]
            if side < 0: quad, coords = list(reversed(quad)), list(reversed(coords))
            face = bm.faces.new(quad)
            for loop, c in zip(face.loops, coords): loop[uv].uv = c
    bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new(mesh.name, mesh)
    scene.collection.objects.link(obj)
    for poly in mesh.polygons: poly.use_smooth = True
    return obj

def floor():
    mesh = bpy.data.meshes.new("floor")
    bm = bmesh.new()
    ns, nw = 340, 40
    verts = []
    for i in range(ns + 1):
        s = LENGTH * i / ns
        c, ahead = centre(s), centre(s + .05)
        tangent = (ahead - c).normalized()
        normal = Vector((tangent.y, -tangent.x, 0))
        w = half_width(s, 0) + .25
        row = []
        for k in range(nw + 1):
            across = w * (2 * k / nw - 1)
            ripple = .04 * math.sin(s * 3.1 + k * .9) + .03 * math.sin(s * 7.3) + (sample(SAND_HEIGHT, s / SAND_TILE, (across + 2) / SAND_TILE) - .5) * .05
            row.append(bm.verts.new(c + normal * across + Vector((0, 0, ripple))))
        verts.append(row)
    uv = bm.loops.layers.uv.new("UVMap")
    for i in range(ns):
        for k in range(nw):
            face = bm.faces.new([verts[i][k], verts[i][k + 1], verts[i + 1][k + 1], verts[i + 1][k]])
            for loop, c in zip(face.loops, [(i / ns, k / nw), (i / ns, (k + 1) / nw), ((i + 1) / ns, (k + 1) / nw), ((i + 1) / ns, k / nw)]): loop[uv].uv = c
    bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new("floor", mesh)
    scene.collection.objects.link(obj)
    for poly in mesh.polygons: poly.use_smooth = True
    return obj

def sandstone(name, sand=False):
    """Photographed rock (or sand) with its normal map, tinted by broad warped strata so the canyon varies over metres as well as
    centimetres. The normal map is what lets the path tracer bake real micro-relief: every ledge and pit shades itself."""
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = .9
    maps = SAND if sand else ROCK
    uv = nodes.new("ShaderNodeTexCoord"); mapping = nodes.new("ShaderNodeMapping")
    # Grid UVs run 0..1 along the canyon and up the wall (or across the floor); scale them to tiles of real size.
    mapping.inputs["Scale"].default_value = (LENGTH / SAND_TILE, 4.0 / SAND_TILE, 1) if sand else (LENGTH / ROCK_TILE, HEIGHT / ROCK_TILE, 1)
    links.new(uv.outputs["UV"], mapping.inputs["Vector"])
    diff = nodes.new("ShaderNodeTexImage"); diff.image = load_image(maps["Diffuse"], True)
    nor = nodes.new("ShaderNodeTexImage"); nor.image = load_image(maps["nor_gl"], False)
    normal = nodes.new("ShaderNodeNormalMap"); normal.inputs["Strength"].default_value = 1.15
    for tex in (diff, nor): links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
    links.new(nor.outputs["Color"], normal.inputs["Color"]); links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    # Broad strata as a tint over the photograph.
    coords = nodes.new("ShaderNodeTexCoord")
    warp = nodes.new("ShaderNodeTexNoise"); warp.inputs["Scale"].default_value = .35; warp.inputs["Detail"].default_value = 3
    add = nodes.new("ShaderNodeVectorMath"); add.operation = "ADD"
    scale = nodes.new("ShaderNodeVectorMath"); scale.operation = "SCALE"; scale.inputs[3].default_value = 1.6
    wave = nodes.new("ShaderNodeTexWave"); wave.wave_type = "BANDS"; wave.bands_direction = "Z"
    wave.inputs["Scale"].default_value = .22; wave.inputs["Distortion"].default_value = 4.5; wave.inputs["Detail"].default_value = 3
    ramp = nodes.new("ShaderNodeValToRGB")
    stops = [(0, (.92, .62, .48)), (.5, (1.0, .78, .62)), (1, (1.0, .9, .78))] if not sand else [(0, (.86, .64, .48)), (1, (.92, .72, .55))]
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = stops[0][0], (*stops[0][1], 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        e = ramp.color_ramp.elements.new(pos); e.color = (*col, 1)
    tint = nodes.new("ShaderNodeMixRGB"); tint.blend_type = "MULTIPLY"; tint.inputs["Fac"].default_value = 1
    links.new(coords.outputs["Object"], warp.inputs["Vector"]); links.new(warp.outputs["Color"], scale.inputs[0])
    links.new(coords.outputs["Object"], add.inputs[0]); links.new(scale.outputs[0], add.inputs[1])
    links.new(add.outputs[0], wave.inputs["Vector"]); links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    links.new(diff.outputs["Color"], tint.inputs[1]); links.new(ramp.outputs["Color"], tint.inputs[2])
    links.new(tint.outputs["Color"], bsdf.inputs["Base Color"])
    return mat

def detail_map(source, out_path, size=1024):
    """A tiling grain map for render time: the photograph's luminance with its broad shading removed (a high-pass), centred on mid
    grey, so multiplying by it adds fine texture without changing the baked light."""
    image = load_image(source, True); w, h = image.size
    px = np.empty(w * h * 4, dtype=np.float32); image.pixels.foreach_get(px); rgb = px.reshape(h, w, 4)[:, :, :3]
    lum = rgb @ np.array([.2126, .7152, .0722], dtype=np.float32)
    step = max(1, w // size); lum = lum[::step, ::step][:size, :size]
    k = 24; pad = np.pad(lum, k, mode="wrap"); c = pad.cumsum(0).cumsum(1)
    blur = (c[2 * k:, 2 * k:] - c[:-2 * k, 2 * k:] - c[2 * k:, :-2 * k] + c[:-2 * k, :-2 * k])[:size, :size] / (2 * k) ** 2
    detail = np.clip(.5 + (lum - blur) * 1.6, 0, 1)
    img = bpy.data.images.new(os.path.basename(out_path), size, size, alpha=False); img.colorspace_settings.name = "Non-Color"
    out = np.ones((size, size, 4), dtype=np.float32); out[:, :, 0] = out[:, :, 1] = out[:, :, 2] = detail
    img.pixels.foreach_set(out.ravel()); img.filepath_raw = out_path; img.file_format = "JPEG"; img.save()

objects = [wall(-1), wall(1), floor()]
for obj in objects:
    obj.data.materials.append(sandstone(obj.name + "-stone", sand=obj.name == "floor"))

# Light: a high, warm sun just off vertical, so a beam reaches part of the floor, and a blue sky that only enters through the top.
sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 9.0; sun.angle = math.radians(.6); sun.color = (1, .93, .82)
sun_obj = bpy.data.objects.new("sun", sun); sun_obj.rotation_euler = (math.radians(9), math.radians(-6), math.radians(20)); scene.collection.objects.link(sun_obj)
world = bpy.data.worlds.new("sky"); world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.46, .58, .80, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .45
scene.world = world

scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"; prefs.get_devices()
    for d in prefs.devices: d.use = True
    scene.cycles.device = "GPU"
except Exception:
    scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 10; scene.cycles.diffuse_bounces = 8
scene.cycles.seed = 7
scene.render.bake.margin = 6

for obj in objects:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    # Texture aspect follows each surface's own proportions, so texels are close to square on the wall.
    width, height = (SIZE, SIZE // 2) if obj.name != "floor" else (SIZE, SIZE // 8)
    image = bpy.data.images.new(obj.name + "-light", width, height, float_buffer=True)
    nodes = obj.data.materials[0].node_tree.nodes
    tex = nodes.new("ShaderNodeTexImage"); tex.image = image
    nodes.active = tex
    print(f"Baking {obj.name} at {width}x{height}px, {SAMPLES} samples")
    bpy.ops.object.bake(type="COMBINED")
    # The bake is linear light with highlights far above 1. A filmic curve (ACES, fitted) rolls them off before the picture is stored
    # as 8-bit sRGB, so a sunlit patch keeps its texture instead of clipping to white, and the dim bounce light keeps its colour.
    px = np.empty(width * height * 4, dtype=np.float32); image.pixels.foreach_get(px)
    rgb = px.reshape(-1, 4)[:, :3] * EXPOSURE
    rgb = np.clip(rgb * (2.51 * rgb + .03) / (rgb * (2.43 * rgb + .59) + .14), 0, 1)
    rgb = np.where(rgb <= .0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - .055)
    out = bpy.data.images.new(obj.name + "-light-display", width, height, alpha=False)
    out.colorspace_settings.name = "Non-Color"
    display = np.ones((width * height, 4), dtype=np.float32); display[:, :3] = rgb
    out.pixels.foreach_set(display.ravel())
    image = out
    # The baked picture becomes the material: an image straight into the base colour, which the recipe draws unlit.
    mat = bpy.data.materials.new(obj.name + "-baked"); mat.use_nodes = True
    mnodes = mat.node_tree.nodes
    btex = mnodes.new("ShaderNodeTexImage"); btex.image = image
    mat.node_tree.links.new(btex.outputs["Color"], mnodes["Principled BSDF"].inputs["Base Color"])
    image.file_format = "JPEG"; image.filepath_raw = os.path.join(os.path.dirname(OUT), f"{obj.name}-light.jpg")
    obj.data.materials[0] = mat

os.makedirs(os.path.dirname(OUT), exist_ok=True)
scene.render.image_settings.file_format = "JPEG"; scene.render.image_settings.quality = 88
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.select_by_type(type="LIGHT"); bpy.ops.object.select_all(action="INVERT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_image_format="JPEG", export_image_quality=88, export_lights=False, export_cameras=False, export_apply=True)

detail_map(ROCK["Diffuse"], os.path.join(os.path.dirname(OUT), "rock-detail.jpg"))
detail_map(SAND["Diffuse"], os.path.join(os.path.dirname(OUT), "sand-detail.jpg"))

# The camera path: the centreline at eye height, converted to glTF axes (x, z_up, -y).
path = [[round(c.x, 4), 1.55 + .25 * math.sin(s * .17), round(-c.y, 4)] for s in [i * .5 for i in range(int(LENGTH * 2) + 1)] for c in [centre(s)]]
with open(OUT.replace(".glb", ".path.json"), "w") as f:
    # Close-up grain: each mesh's detail map and how many times it repeats over the mesh's 0..1 UVs (about 0.9 m per repeat).
    details = { "wall": { "file": "rock-detail.jpg", "repeat": [LENGTH / .9, HEIGHT / .9] }, "floor": { "file": "sand-detail.jpg", "repeat": [LENGTH / .9, 4.0 / .9] } }
    json.dump({ "schemaVersion": 1, "units": "metres", "path": path, "details": details, "samples": SAMPLES, "size": SIZE, "generator": "scripts/light-bake.py" }, f)
print("Wrote", OUT)
