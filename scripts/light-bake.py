"""Bake a set's lighting with Blender Cycles, for the Real-Light Flythrough recipe.

Builds a sandstone slot canyon procedurally, lights it with a high sun through the narrow top and a blue sky, path-traces the light
(direct and every bounce) into a texture on each surface, and exports a glTF whose textures *are* the lit picture. Real-time renders
then show path-traced light, including the orange glow that bounces down the walls, at the cost of a texture lookup.

Run (about a minute on an M-series GPU):
  nice -n 15 /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/light-bake.py -- \
    --out assets/baked/slot-canyon.glb [--samples 96] [--size 2048]

Everything is generated from fixed parameters, with no downloaded assets. The camera path along the canyon floor is written next to
the glTF as <name>.path.json, in glTF coordinates (Y up, the canyon running toward -Z).
"""
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = os.path.abspath(arg("--out", "assets/baked/slot-canyon.glb"))
SAMPLES, SIZE = int(arg("--samples", "96")), int(arg("--size", "2048"))
EXPOSURE = float(arg("--exposure", "1.25"))
LENGTH, HEIGHT = 34.0, 15.0

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
    ns, nh = 220, 120
    verts = []
    for i in range(ns + 1):
        s = LENGTH * i / ns
        c, ahead = centre(s), centre(s + .05)
        tangent = (ahead - c).normalized()
        normal = Vector((tangent.y, -tangent.x, 0))
        row = []
        for j in range(nh + 1):
            h = HEIGHT * j / nh
            row.append(bm.verts.new(c + normal * (side * half_width(s, h)) + Vector((0, 0, h))))
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
    ns, nw = 220, 24
    verts = []
    for i in range(ns + 1):
        s = LENGTH * i / ns
        c, ahead = centre(s), centre(s + .05)
        tangent = (ahead - c).normalized()
        normal = Vector((tangent.y, -tangent.x, 0))
        w = half_width(s, 0) + .25
        verts.append([bm.verts.new(c + normal * (w * (2 * k / nw - 1)) + Vector((0, 0, .04 * math.sin(s * 3.1 + k * .9) + .03 * math.sin(s * 7.3)))) for k in range(nw + 1)])
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
    """Layered sandstone: warped horizontal bands of orange, rust and cream, from fixed procedural textures."""
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = .92
    coords = nodes.new("ShaderNodeTexCoord")
    warp = nodes.new("ShaderNodeTexNoise"); warp.inputs["Scale"].default_value = .35; warp.inputs["Detail"].default_value = 3
    mix = nodes.new("ShaderNodeVectorMath"); mix.operation = "ADD"
    scale = nodes.new("ShaderNodeVectorMath"); scale.operation = "SCALE"; scale.inputs[3].default_value = 1.6
    wave = nodes.new("ShaderNodeTexWave"); wave.wave_type = "BANDS"; wave.bands_direction = "Z"
    wave.inputs["Scale"].default_value = .26 if not sand else 4.0; wave.inputs["Distortion"].default_value = 4.5; wave.inputs["Detail"].default_value = 3.5
    grain = nodes.new("ShaderNodeTexNoise"); grain.inputs["Scale"].default_value = 38; grain.inputs["Detail"].default_value = 6
    ramp = nodes.new("ShaderNodeValToRGB")
    # Close, saturated sandstone tones: the strata should read as soft layers, not stripes.
    stops = [(0, (.60, .21, .06)), (.5, (.70, .28, .08)), (1, (.80, .38, .14))] if not sand else [(0, (.66, .40, .20)), (1, (.78, .52, .30))]
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = stops[0][0], (*stops[0][1], 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        e = ramp.color_ramp.elements.new(pos); e.color = (*col, 1)
    tint = nodes.new("ShaderNodeMixRGB"); tint.blend_type = "MULTIPLY"; tint.inputs["Fac"].default_value = .25
    links.new(coords.outputs["Object"], warp.inputs["Vector"])
    links.new(warp.outputs["Color"], scale.inputs[0])
    links.new(coords.outputs["Object"], mix.inputs[0]); links.new(scale.outputs[0], mix.inputs[1])
    links.new(mix.outputs[0], wave.inputs["Vector"])
    links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], tint.inputs[1]); links.new(grain.outputs["Color"], tint.inputs[2])
    links.new(tint.outputs["Color"], bsdf.inputs["Base Color"])
    return mat

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

# The camera path: the centreline at eye height, converted to glTF axes (x, z_up, -y).
path = [[round(c.x, 4), 1.55 + .25 * math.sin(s * .17), round(-c.y, 4)] for s in [i * .5 for i in range(int(LENGTH * 2) + 1)] for c in [centre(s)]]
with open(OUT.replace(".glb", ".path.json"), "w") as f:
    json.dump({ "schemaVersion": 1, "units": "metres", "path": path, "samples": SAMPLES, "size": SIZE, "generator": "scripts/light-bake.py" }, f)
print("Wrote", OUT)
