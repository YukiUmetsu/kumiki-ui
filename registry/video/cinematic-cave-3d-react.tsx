/** Cave logo: an authored photographic environment with genuinely volumetric, frame-seekable signage. */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ACESFilmicToneMapping, AmbientLight, BufferAttribute, BufferGeometry, CanvasTexture,
  Color, DirectionalLight, HemisphereLight, Mesh, PerspectiveCamera, Points,
  PointsMaterial, Scene, SRGBColorSpace, TextureLoader, WebGLRenderer,
} from "three";
import type { Object3D, Texture } from "three";
import { caveCameraAtFrame, caveSignPoseAtFrame, createCaveSignModel } from "./cinematic-cave-3d-scene";

export interface CinematicCave3DProps {
  frame: number;
  background: string;
  woodDiffuse: string;
  woodNormal: string;
  woodRoughness: string;
  title?: string;
  subtitle?: string;
  reducedMotion?: boolean;
}

function engravedLettering(title: string, subtitle: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 706;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to draw sign lettering");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(15,5,0,.9)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;
  ctx.lineJoin = "round";
  ctx.font = "bold 178px Georgia, 'Times New Roman', serif";
  ctx.strokeStyle = "rgba(38,20,8,.8)";
  ctx.lineWidth = 12;
  ctx.strokeText(title, 1024, 283, 1870);
  ctx.fillStyle = "#e6c89a";
  ctx.fillText(title, 1024, 283, 1870);
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  ctx.font = "600 57px Georgia, serif";
  ctx.letterSpacing = "9px";
  ctx.fillStyle = "#d1b78d";
  ctx.fillText(subtitle, 1024, 477, 1710);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(225,184,115,.55)";
  ctx.lineWidth = 4;
  for (const y of [86, 622]) {
    ctx.beginPath();
    ctx.moveTo(310, y);
    ctx.lineTo(1738, y);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createCaveDust() {
  const count = 85;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = Math.sin(i * 12.9898) * 5.25;
    positions[i * 3 + 1] = Math.sin(i * 78.233) * 3.05;
    positions[i * 3 + 2] = .5 + (i % 13) * .22;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const material = new PointsMaterial({ color: "#fbd9a3", size: .026, transparent: true, opacity: .57,
    depthWrite: false, sizeAttenuation: true });
  return new Points(geometry, material);
}

function disposeScene(root: Object3D) {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<{ dispose(): void }>();
  root.traverse(object => {
    if (object instanceof Mesh || object instanceof Points) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

/** One transparent WebGL pass over a photographic/video-compatible backdrop. */
export function CinematicCave3D({
  frame, background, woodDiffuse, woodNormal, woodRoughness, title = "KUMIKI",
  subtitle = "YOUR STORY STARTS HERE", reducedMotion = false,
}: CinematicCave3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const motionRef = useRef(reducedMotion);
  motionRef.current = reducedMotion;
  const drawRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderer: WebGLRenderer | null = null;
    let sign: ReturnType<typeof createCaveSignModel> | null = null;
    let dust: ReturnType<typeof createCaveDust> | null = null;
    let lettering: CanvasTexture | null = null;
    let loaded: Texture[] = [];
    const initialize = async () => {
      const textureLoader = new TextureLoader();
      const textures = await Promise.all([
        textureLoader.loadAsync(woodDiffuse), textureLoader.loadAsync(woodNormal), textureLoader.loadAsync(woodRoughness),
      ]);
      if (cancelled) { textures.forEach(texture => texture.dispose()); return; }
      loaded = textures;
      textures[0].colorSpace = SRGBColorSpace;
      lettering = engravedLettering(title, subtitle);
      sign = createCaveSignModel({ diffuse: textures[0], normal: textures[1], roughness: textures[2], lettering });
      dust = createCaveDust();
      const scene = new Scene();
      scene.add(sign, dust);
      scene.add(new AmbientLight("#a7a4a0", .77));
      scene.add(new HemisphereLight("#bcdcee", "#773718", 1.5));
      const key = new DirectionalLight("#ffdaab", 3.5);
      key.position.set(-2.8, 5, 7);
      scene.add(key);
      const bounce = new DirectionalLight("#91c7f1", 1.9);
      bounce.position.set(4, 1, -3);
      scene.add(bounce);
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.setClearColor(new Color(0, 0, 0), 0);
      renderer.setPixelRatio(1.25);
      renderer.setSize(1280, 720, false);
      const camera = new PerspectiveCamera(36, 1280 / 720, .1, 80);
      drawRef.current = () => {
        if (!sign || !renderer || !dust) return;
        const actualFrame = motionRef.current ? 220 : frameRef.current;
        const pose = caveSignPoseAtFrame(actualFrame);
        const shot = caveCameraAtFrame(actualFrame);
        sign.position.set(0, pose.y, 0);
        sign.rotation.set(0, pose.turn, pose.swing);
        sign.visible = pose.opacity > 0;
        dust.rotation.y = actualFrame * .0003;
        camera.position.set(...shot.position);
        camera.lookAt(...shot.target);
        camera.fov = shot.fov;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        canvas.dataset.kmHeroReady = "true";
        canvas.dataset.kmHeroFrame = String(frameRef.current);
      };
      drawRef.current();
    };
    initialize().catch(cause => {
      if (!cancelled) setError(`3D cave scene failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    });
    return () => {
      cancelled = true;
      drawRef.current = null;
      delete canvas.dataset.kmHeroReady;
      delete canvas.dataset.kmHeroFrame;
      if (sign) disposeScene(sign);
      if (dust) disposeScene(dust);
      lettering?.dispose();
      loaded.forEach(texture => texture.dispose());
      renderer?.dispose();
    };
  }, [woodDiffuse, woodNormal, woodRoughness, title, subtitle]);

  useEffect(() => { drawRef.current?.(); }, [frame, reducedMotion]);
  const f = reducedMotion ? 220 : frame;
  const advance = Math.min(1, Math.max(0, f / 240));
  const fade = Math.min(1, Math.max(0, (f - 274) / 25));
  const backgroundStyle: CSSProperties = {
    position: "absolute", inset: "-3%", backgroundImage: `url(${background})`,
    backgroundPosition: "center center", backgroundSize: "cover",
    transform: `scale(${1.09 + .11 * advance}) translateX(${(advance - .5) * 1.25}%)`,
  };
  return <div data-km-cinematic-cave-3d="" data-km-hero-viewer="" data-km-frame-addressed=""
    style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", background: "#0b0d0d" }}>
    <div aria-hidden="true" style={backgroundStyle} />
    <div aria-hidden="true" style={{ position: "absolute", inset: 0,
      background: "radial-gradient(ellipse 80% 60% at 48% 49%, transparent 30%, rgba(1,5,7,.50) 100%)" }} />
    <canvas ref={canvasRef} role="img" aria-label="Photorealistic three-dimensional wooden sign descending and swinging inside a cavern"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "#060907", opacity: fade }} />
    {error ? <p role="alert" style={{ position: "absolute", bottom: 24, left: 24, color: "#fff",
      background: "#380c0c", padding: "10px 16px" }}>{error}</p> : null}
  </div>;
}
