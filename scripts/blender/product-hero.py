"""Original product-studio fixture; run in a NEW background Blender process.
blender --background --factory-startup --python scripts/blender/product-hero.py -- --output .review/product-hero/r01
No downloads. The .blend is the editable camera/material source; all 300 frames use 30 fps.
"""
import argparse, bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--portrait', action='store_true')
parser.add_argument('--render-frame', type=int, default=240)
args = parser.parse_args(__import__('sys').argv[__import__('sys').argv.index('--') + 1:])
output = Path(args.output).resolve()
if (output / 'product-hero.blend').exists():
    raise RuntimeError('This revision already exists. Choose a new --output directory to preserve it.')
output.mkdir(parents=True, exist_ok=True)
# This process is explicitly factory-started; it never edits the user's desktop scene.
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.resolution_x, scene.render.resolution_y = ((540, 960) if args.portrait else (960, 540))
scene.render.resolution_percentage = 100
scene.render.fps = 30; scene.frame_start = 1; scene.frame_end = 300
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(output / 'frames' / '') + '/'
Path(scene.render.filepath).mkdir(exist_ok=True)
scene.world.use_nodes = True
world = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
world.inputs['Color'].default_value = (.12, .15, .18, 1); world.inputs['Strength'].default_value = .12
scene.view_settings.exposure = -.3

# Distinct physical surfaces: powder coat, walnut, copper, rubber and dark acoustic fabric.
def material(name, color, roughness=.5, metallic=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness; p.inputs['Metallic'].default_value = metallic
    return m
coat = material('Graphite powder coat', (.028, .039, .043), .42, .65)
grille = material('Fine anodized grille', (.065, .084, .085), .32, .82)
brass = material('Satin brass', (.40, .23, .095), .29, .92)
rubber = material('Moulded rubber', (.011, .013, .014), .85)
fabric = material('Acoustic backing', (.008, .009, .008), .96)
wood = material('Walnut side cheeks', (.10, .035, .013), .48)
nodes, links = wood.node_tree.nodes, wood.node_tree.links
p = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
tex = nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = 4; tex.inputs['Detail'].default_value = 4
mapping = nodes.new('ShaderNodeVectorMath'); mapping.operation = 'MULTIPLY'; mapping.inputs[1].default_value = (4, 140, 4)
coord = nodes.new('ShaderNodeTexCoord'); links.new(coord.outputs['Generated'], mapping.inputs[0]); links.new(mapping.outputs[0], tex.inputs['Vector'])
ramp = nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = .2; ramp.color_ramp.elements[0].color = (.016, .005, .002, 1)
ramp.color_ramp.elements[1].position = .8; ramp.color_ramp.elements[1].color = (.13, .045, .014, 1)
links.new(tex.outputs['Fac'], ramp.inputs[0]); links.new(ramp.outputs['Color'], p.inputs['Base Color'])
bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .12; bump.inputs['Distance'].default_value = .00015
links.new(tex.outputs['Fac'], bump.inputs['Height']); links.new(bump.outputs[0], p.inputs['Normal'])

def cube(name, size, position, mat, bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object; obj.name = name; obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Machined edge radius', 'BEVEL'); mod.width = bevel; mod.segments = 4
        obj.modifiers.new('Weighted face normals', 'WEIGHTED_NORMAL')
    return obj

def cylinder(name, radius, depth, position, mat, axis='Z', vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=position)
    obj = bpy.context.object; obj.name = name
    if axis == 'Y': obj.rotation_euler.x = math.pi / 2
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('Turned edge chamfer', 'BEVEL'); bevel.width = .0006; bevel.segments = 3
    for face in obj.data.polygons: face.use_smooth = True
    obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj

# Hypothetical unbranded desktop speaker: each manufactured part has thickness and seams.
cube('Speaker / main enclosure', (.115, .112, .194), (0, 0, .112), coat, .009)
for x in [-.061, .061]: cube('Speaker / walnut cheek', (.009, .110, .190), (x, .001, .112), wood, .004)
cube('Speaker / acoustic backing', (.101, .004, .174), (0, -.058, .112), fabric, .007)
# True perforations, not a hole photograph. Connected hexagonal cell walls have a front and back rim.
verts, faces = [], []
radius, hole, step = .0019, .00138, .00330
for row in range(60):
    z = .028 + row * radius * 1.5
    for col in range(29):
        x = -.0462 + col * step + (row % 2) * step / 2
        if abs(x) > .049 or z > .196: continue
        # Curved grille corner silhouette.
        if abs(x) > .043 and (z < .034 or z > .190): continue
        base = len(verts)
        for y, r in [(-.062, radius), (-.062, hole), (-.0608, radius), (-.0608, hole)]:
            for side in range(6):
                angle = math.pi / 6 + math.pi / 3 * side
                verts.append((x + r * math.cos(angle), y, z + r * math.sin(angle)))
        for side in range(6):
            nxt = (side + 1) % 6
            faces.extend([(base+side, base+nxt, base+6+nxt, base+6+side),
                          (base+6+side, base+6+nxt, base+18+nxt, base+18+side),
                          (base+12+side, base+12+nxt, base+nxt, base+side)])
mesh = bpy.data.meshes.new('Perforated grille / real hex apertures'); mesh.from_pydata(verts, [], faces); mesh.update()
obj = bpy.data.objects.new('Speaker / perforated metal grille', mesh); scene.collection.objects.link(obj); obj.data.materials.append(grille)
# Fine front frame and hardware sit on the enclosure, never suspended above it.
for x in [-.0515, .0515]: cube('Speaker / grille edge', (.003, .005, .177), (x, -.060, .112), coat, .001)
for z in [.022, .201]: cube('Speaker / grille edge', (.106, .005, .003), (0, -.060, z), coat, .001)
for x in [-.050, .050]:
    for z in [.026, .197]:
        cylinder('Speaker / grille screw', .00145, .001, (x, -.063, z), brass, 'Y', 24)
        cube('Speaker / screw slot', (.0015, .00015, .0003), (x, -.0636, z), rubber, .00005)
for x in [-.043, .043]:
    for y in [-.036, .036]: cylinder('Speaker / rubber foot', .008, .015, (x, y, .009), rubber, vertices=48)
# Volume dial: actual machined knurl, bearing collar and inset cap.
cylinder('Speaker / dial bearing', .017, .003, (.020, -.004, .211), rubber)
cylinder('Speaker / volume dial', .015, .013, (.020, -.004, .219), brass)
cylinder('Speaker / dial inset', .0128, .001, (.020, -.004, .226), coat)
for tooth in range(80):
    a = math.tau * tooth / 80
    cylinder('Speaker / dial knurl', .00036, .010, (.020 + .015*math.cos(a), -.004 + .015*math.sin(a), .219), brass, vertices=8)
cube('Speaker / dial index', (.001, .007, .0003), (.020, -.010, .2267), brass, .0001)
cylinder('Speaker / power key', .0055, .0017, (-.024, -.004, .211), coat)
led = material('Power indicator / warm white', (.8, .65, .38), .3)
principled = next(n for n in led.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
principled.inputs['Emission Color'].default_value = (.8, .55, .23, 1)
for frame, power in [(1, 0), (208, 0), (213, 3), (300, 3)]:
    principled.inputs['Emission Strength'].default_value = power
    principled.inputs['Emission Strength'].keyframe_insert('default_value', frame=frame)
cylinder('Speaker / power indicator', .0012, .0006, (-.024, -.015, .211), led, vertices=32)
# Rear ports provide real construction on reverse and three-quarter views.
cube('Speaker / rear port recess', (.048, .001, .025), (0, .0565, .044), rubber, .003)
for x in [-.010, .010]: cylinder('Speaker / rear socket', .0035, .002, (x, .058, .044), coat, 'Y', 32)
cube('Studio / seamless floor', (200, 200, .005), (0, 0, -.001), material('Studio charcoal', (.018, .024, .029), .7), 0)

def aim(obj, point): obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()
def area(name, position, target, watts, shape, color=(1,1,1)):
    data = bpy.data.lights.new(name, 'AREA'); data.energy = watts; data.shape = 'RECTANGLE'; data.size = shape[0]; data.size_y = shape[1]; data.color = color
    obj = bpy.data.objects.new(name, data); scene.collection.objects.link(obj); obj.location = position; aim(obj, target)
area('Studio / key strip', (-.25, -.25, .40), (0, 0, .12), 24, (.28, .12), (1, .88, .73))
area('Studio / rim strip', (.21, .15, .32), (0, 0, .12), 35, (.05, .35), (.75, .86, 1))
area('Studio / broad fill', (.30, -.35, .24), (0, 0, .12), 7, (.3, .3))

def camera(name, at, start, end, target, lens):
    data = bpy.data.cameras.new(name); data.lens = lens
    obj = bpy.data.objects.new(name, data); scene.collection.objects.link(obj)
    focus = bpy.data.objects.new(name + ' / focus', None); scene.collection.objects.link(focus); focus.location = target
    constraint = obj.constraints.new('TRACK_TO'); constraint.target = focus; constraint.track_axis = 'TRACK_NEGATIVE_Z'; constraint.up_axis = 'UP_Y'
    sharp = bpy.data.objects.new(name + ' / focal plane', None); scene.collection.objects.link(sharp)
    sharp.location = target if at == 1 else (0, -.045, .12)
    data.dof.use_dof = True; data.dof.focus_object = sharp; data.dof.aperture_fstop = 6.3 if at == 1 else 11
    for frame, position in [(at, start), ((84 if at==1 else 195 if at==85 else 300), end)]:
        obj.location = position; obj.keyframe_insert('location', frame=frame)
    marker = scene.timeline_markers.new(name, frame=at); marker.camera = obj
    return obj
camera('01 / tactile dial', 1, (.11,-.18,.28), (.08,-.16,.265), (.015,-.005,.215), 80)
camera('02 / construction', 85, (.27,-.46,.25), (.20,-.43,.245), (0,0,.115), 62)
camera('03 / hero', 196, (.37,-.82,.34), (.34,-.79,.33), (0 if args.portrait else -.066,0,.12), 57 if args.portrait else 58)
scene.camera = next(o for o in scene.objects if o.name == '01 / tactile dial')
scene.frame_set(args.render_frame)
bpy.ops.wm.save_as_mainfile(filepath=str(output / 'product-hero.blend'))
manifest = {'generator':'Blender', 'version':bpy.app.version_string,'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 'license':'Original procedural model and studio; no third-party assets', 'fps':{'num':30,'den':1}, 'durationFrames':300,
 'portrait':args.portrait, 'shots':[{'frame':0,'name':'tactile dial'},{'frame':84,'name':'construction'},{'frame':195,'name':'hero'}],
 'audioAnchorFrame':209, 'objects':len(scene.objects),'vertices':sum(len(o.data.vertices) for o in scene.objects if o.type=='MESH')}
(output / 'source.json').write_text(json.dumps(manifest, indent=2)+'\n')
scene.render.filepath = str(output / 'look.png'); bpy.ops.render.render(write_still=True)
print('KUMIKI_PRODUCT_HERO', json.dumps(manifest))
