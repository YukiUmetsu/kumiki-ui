/** Prepare cave alpha plates from verified CC0 Poly Haven geology, not generated skin-like surfaces.
 * Source models stay in ignored .review/cave-rock-source; only rendered PNGs enter the demo.
 * Run: node scripts/render-cave-rocks.mjs. No runtime scene dependency is added.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const sourceDirectory = resolve(root, '.review/cave-rock-source');
const sourceFiles = JSON.parse(await readFile(resolve(root, 'scripts/cave-rock-sources.json'), 'utf8'));
const sources = Object.keys(sourceFiles);

async function downloadSources() {
  for (const id of sources) {
    const files = sourceFiles[id], model = files.gltf['2k'].gltf;
    for (const [name, entry] of [[`${id}_2k.gltf`, model], ...Object.entries(model.include)]) {
      const target = resolve(sourceDirectory, id, name);
      const cached = await readFile(target).catch(() => null);
      if (cached && createHash('md5').update(cached).digest('hex') === entry.md5) continue;
      const data = await fetch(entry.url);
      if (!data.ok) throw Error(`Download failed for ${name}: HTTP ${data.status}. Retry preparation.`);
      const bytes = Buffer.from(await data.arrayBuffer());
      if (createHash('md5').update(bytes).digest('hex') !== entry.md5) throw Error(`Checksum mismatch for ${name}; source was not saved.`);
      await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes);
    }
    await writeFile(resolve(sourceDirectory, id, 'source-files.json'), JSON.stringify(files, null, 2));
  }
}

const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const loader=new GLTFLoader(), models={};
for(const id of ${JSON.stringify(sources)}) models[id]=(await loader.loadAsync('/.review/cave-rock-source/'+id+'/'+id+'_2k.gltf')).scene;
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
renderer.setClearColor(0x000000,0);document.body.append(renderer.domElement);
window.renderPlate=async(profile)=>{
 const scene=new THREE.Scene(), w=profile==='overhang'||profile==='ledge'?1678:1024,h=w===1678?937:1536;
 renderer.setSize(w,h,false);
 const key=new THREE.DirectionalLight(0xdce2dc,1.35);key.position.set(2,3,4);scene.add(key);
 const fill=new THREE.DirectionalLight(0x929c96,.28);fill.position.set(-3,1,3);scene.add(fill);
 scene.add(new THREE.HemisphereLight(0xb7c3b9,0x1b1d1c,.32));
 const evidence=[];
 function stone(id,{mesh,scale=1,x=0,y=0,z=0,yaw=0,roll=0}={}) {
  let model=models[id].clone(true);
  if(mesh!==undefined){const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o)});model=meshes[mesh%meshes.length].clone();model.updateMatrixWorld(true);}
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const pivot=new THREE.Group();model.position.sub(center);pivot.add(model);pivot.scale.setScalar(scale/Math.max(size.x,size.y,size.z));
  pivot.position.set(x,y,z);pivot.rotation.set(0,yaw*Math.PI/180,roll*Math.PI/180);
  model.traverse(o=>{if(o.isMesh){
    o.material=o.material.clone();o.material.roughness=1;o.material.metalness=0;o.material.side=THREE.DoubleSide;
    o.material.normalScale?.set(.22,.22);
    // Neutral stone luminance; retain only subdued green already present in the scanned albedo.
    o.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',\`#include <map_fragment>
      float stoneLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
      float mossRatio=diffuseColor.g/max(.001,max(diffuseColor.r,diffuseColor.b));
      float mossAmount=smoothstep(1.08,1.35,mossRatio);
      vec3 stoneTone=vec3(1.02,.96,.88)*stoneLuma;
      vec3 mossTone=vec3(.42,.66,.38)*stoneLuma;
      diffuseColor.rgb=mix(stoneTone,mossTone,mossAmount);
    \`);};
    evidence.push({source:id,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,uv:!!o.geometry.attributes.uv,diffuse:!!o.material.map,normal:!!o.material.normalMap,roughness:!!o.material.roughnessMap});
  }});scene.add(pivot);
 }
 if(profile==='left') stone('rock_face_02',{scale:1.5,x:-.63,y:0,yaw:12});
 if(profile==='right') stone('rock_face_01',{scale:1.5,x:.62,y:0,yaw:-14});
 if(profile==='outcrop') stone('rock_moss_set_01',{mesh:1,scale:.6,x:0,y:-.26,yaw:42});
 if(profile==='overhang') {stone('rock_face_02',{scale:1.6,x:-.48,y:.76,roll:180,yaw:8});stone('rock_face_01',{scale:1.5,x:.65,y:.74,roll:180,yaw:-12});}
 if(profile==='ledge') {stone('rock_moss_set_01',{mesh:0,scale:.8,x:-.58,y:-.27,yaw:20});stone('rock_moss_set_01',{mesh:2,scale:.66,x:-.12,y:-.36,yaw:-30});stone('rock_moss_set_01',{mesh:4,scale:.58,x:.35,y:-.42,yaw:15});stone('rock_moss_set_01',{mesh:5,scale:.43,x:.7,y:-.45,yaw:-25});}
 if(!evidence.length||evidence.some(e=>!e.uv||!e.diffuse||!e.normal||e.triangles<100)) throw Error('Rock asset lacks the geometry/UV/material evidence needed for rendering.');
 const aspect=w/h,camera=new THREE.OrthographicCamera(-aspect/2,aspect/2,.5,-.5,.01,20);camera.position.set(0,0,5);camera.lookAt(0,0,0);
 renderer.render(scene,camera);return {w,h,evidence};
};window.ready=true;
</script></body></html>`;

await downloadSources();
const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(req.url.split('?')[0]);
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+'/node_modules/three/')&&!file.startsWith(sourceDirectory+'/')){res.writeHead(404);res.end();return;}
  try {const bytes=await readFile(file);res.setHeader('Content-Type',({'.js':'application/javascript','.gltf':'model/gltf+json','.jpg':'image/jpeg'})[extname(file)]??'application/octet-stream');res.end(bytes);}
  catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1678,height:1536},deviceScaleFactor:1});
const report={sources,plates:[]};
try {
 page.on('pageerror',e=>console.error(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready,{timeout:60000});
 for(const profile of ['left','right','outcrop','overhang','ledge']){
  const metadata=await page.evaluate(profile=>window.renderPlate(profile),profile);
  const path=resolve(root,'src/video/assets/cave-scan-'+profile+'.png');
  await page.locator('canvas').screenshot({path,omitBackground:true});report.plates.push({profile,...metadata});console.log('Rendered',profile,metadata.w,metadata.h);
 }
 await mkdir(resolve(root,'artifacts/cave-cinematic'),{recursive:true});
 await writeFile(resolve(root,'artifacts/cave-cinematic/rock-source-evidence.json'),JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
