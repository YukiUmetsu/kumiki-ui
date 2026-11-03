"""Isolated Blender USDZ -> embedded photographic GLB boundary. No mesh repair."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
import tempfile
import bpy


def convert(source, output):
    source, output = source.resolve(), output.resolve()
    audit_path = output.with_suffix('.audit.json')
    if not source.is_file() or source.suffix.lower() != '.usdz':
        raise ValueError('Provide an existing reconstructed .usdz file')
    if output.suffix != '.glb' or output.exists() or audit_path.exists():
        raise ValueError('Use a new .glb output revision; existing artifacts cannot be overwritten')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.usd_import(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        raise ValueError('Reconstruction contains no mesh; do not publish this revision')
    points, triangles, textures = [], 0, {}
    for obj in meshes:
        mesh = obj.data
        if not mesh.uv_layers or not mesh.materials or obj.modifiers:
            raise ValueError(f'{obj.name}: require textured UV geometry without unevaluated modifiers')
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        for vertex in mesh.vertices:
            p = obj.matrix_world @ vertex.co
            # Blender Z-up -> glTF Y-up, identical to export_yup.
            point = [float(p.x), float(p.z), float(-p.y)]
            if not all(math.isfinite(v) for v in point):
                raise ValueError(f'{obj.name}: nonfinite geometry')
            points.append(point)
        for face in mesh.polygons:
            if face.material_index >= len(mesh.materials) or mesh.materials[face.material_index] is None:
                raise ValueError(f'{obj.name}: face without photographic material')
    used = {m for obj in meshes for m in obj.data.materials if m}
    for material in used:
        nodes, links = material.node_tree.nodes, material.node_tree.links
        shader = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
        target = next((n for n in nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output), None)
        if shader is None or target is None or not shader.inputs['Base Color'].is_linked:
            raise ValueError(f'{material.name}: missing photographic base-color texture')
        connection = shader.inputs['Base Color'].links[0]
        texture = connection.from_node
        if texture.type != 'TEX_IMAGE' or texture.image is None or connection.from_socket.name != 'Color':
            raise ValueError(f'{material.name}: unsupported color graph; no silent material approximation')
        image = texture.image
        if min(image.size) <= 0 or image.colorspace_settings.name != 'sRGB':
            raise ValueError(f'{material.name}: require a decoded sRGB photographic texture')
        textures[image.name] = {'name': image.name, 'width': image.size[0], 'height': image.size[1]}
        # A color socket directly feeding Surface is Blender's unlit export graph.
        # Do not export inferred AO, normal, roughness or displacement as measured materials.
        links.new(texture.outputs['Color'], target.inputs['Surface'])
    if not triangles or not points:
        raise ValueError('Reconstruction has no surface triangles')
    minimum = [min(p[i] for p in points) for i in range(3)]
    maximum = [max(p[i] for p in points) for i in range(3)]
    size = [maximum[i]-minimum[i] for i in range(3)]
    if min(size) <= 0:
        raise ValueError('Reconstruction must have volume on every axis')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent, prefix='.convert-') as temporary:
        staged = Path(temporary)/'subject.glb'
        bpy.ops.object.select_all(action='DESELECT')
        for obj in meshes: obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(staged), export_format='GLB', use_selection=True,
            export_materials='EXPORT', export_cameras=False, export_lights=False,
            export_animations=False, export_yup=True, export_image_format='AUTO')
        data = staged.read_bytes()
        length = struct.unpack_from('<I', data, 12)[0]
        doc = json.loads(data[20:20+length])
        if any('uri' in r for r in doc.get('buffers', []) + doc.get('images', [])):
            raise ValueError('Exporter produced external resources; require an embedded GLB')
        for material in doc.get('materials', []):
            if 'KHR_materials_unlit' not in material.get('extensions', {}) or 'baseColorTexture' not in material.get('pbrMetallicRoughness', {}):
                raise ValueError('Exporter did not retain an unlit photographic texture')
        exported_triangles = sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
        if exported_triangles != triangles:
            raise ValueError('Export changed triangle count; inspect geometry before publishing')
        audit = {'schemaVersion': 1, 'blenderVersion': bpy.app.version_string,
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'modelSha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
            'triangles': triangles, 'meshes': len(meshes), 'textures': list(textures.values()),
            'bounds': {'min': minimum, 'max': maximum},
            'normalizedBounds': {'min': [-size[0]/2, 0, -size[2]/2], 'max': [size[0]/2, size[1], size[2]/2]},
            'normalizationOffset': [-(minimum[0]+maximum[0])/2, -minimum[1], -(minimum[2]+maximum[2])/2],
            'lighting': 'baked', 'coordinateSystem': 'right-handed-y-up',
            'geometryModified': False, 'visualApproval': 'pending'}
        staged.rename(output)
        audit_path.write_text(json.dumps(audit, indent=2))
    print(json.dumps(audit))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    convert(args.input, args.output)
