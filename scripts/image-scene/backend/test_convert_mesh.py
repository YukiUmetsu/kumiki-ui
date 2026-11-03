"""Real Blender boundary tests; procedural geometry is solely a format fixture."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

BLENDER = os.environ.get('BLENDER_PATH') or shutil.which('blender') or '/Applications/Blender.app/Contents/MacOS/Blender'
SCRIPT = Path(__file__).with_name('convert_mesh.py').resolve()

@unittest.skipUnless(Path(BLENDER).exists(), 'Install Blender or set BLENDER_PATH for conversion tests')
class ConversionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        source = cls.root / 'fixture.usdz'
        script = cls.root / 'fixture.py'
        script.write_text('''import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add(location=(2,3,4))
obj=bpy.context.object
obj.scale=(1,2,3)
mat=bpy.data.materials.new('photographic-format-fixture');mat.use_nodes=True
img=bpy.data.images.new('source-colors',width=4,height=4)
img.pixels[:]=[0.25,0.5,0.75,1]*16
img.filepath_raw='''+repr(str(cls.root/'colors.png'))+''';img.file_format='PNG';img.save()
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
mat.node_tree.links.new(tex.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
obj.data.materials.append(mat)
bpy.ops.wm.usd_export(filepath='''+repr(str(source))+''',export_materials=True)
''')
        result = subprocess.run([BLENDER,'-b','--factory-startup','--python-exit-code','1','--python',str(script)],capture_output=True,text=True)
        if result.returncode: raise RuntimeError(result.stdout + result.stderr)
        cls.source=source

    @classmethod
    def tearDownClass(cls): cls.temp.cleanup()

    def run_conversion(self, source, output):
        return subprocess.run([BLENDER,'-b','--factory-startup','--python-exit-code','1','--python',str(SCRIPT),'--','--input',str(source),'--output',str(output)],capture_output=True,text=True)

    def test_preserves_geometry_and_texture_with_explicit_unlit_material(self):
        output=self.root/'converted.glb'
        result=self.run_conversion(self.source,output)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        audit=json.loads(output.with_suffix('.audit.json').read_text())
        self.assertEqual(audit['triangles'],12)
        self.assertEqual(audit['bounds'],{'min':[1.0,1.0,-5.0],'max':[3.0,7.0,-1.0]})
        self.assertEqual(audit['normalizedBounds'],{'min':[-1.0,0,-2.0],'max':[1.0,6.0,2.0]})
        self.assertEqual(audit['textures'][0]['width'],4)
        self.assertEqual(audit['lighting'],'baked')
        self.assertEqual(audit['visualApproval'],'pending')
        data=output.read_bytes();length=int.from_bytes(data[12:16],'little');doc=json.loads(data[20:20+length])
        self.assertIn('KHR_materials_unlit',doc['materials'][0]['extensions'])
        self.assertNotIn('emissiveTexture',doc['materials'][0])
        self.assertEqual(len(doc['images']),1)
        self.assertTrue(all('uri' not in x for x in doc['images']+doc['buffers']))
        self.assertNotEqual(self.run_conversion(self.source,output).returncode,0)

    def test_rejects_missing_source_without_publishing(self):
        output=self.root/'missing.glb'
        result=self.run_conversion(self.root/'absent.usdz',output)
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(output.exists())
        self.assertFalse(output.with_suffix('.audit.json').exists())
