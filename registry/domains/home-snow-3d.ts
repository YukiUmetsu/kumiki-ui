/** A snowman yard prop for winter scenes (meters, origin on the ground at its base, faces +Z).
 * Three lumpy snow balls, coal eyes and buttons, a carrot nose, twig arms and a knit scarf.
 * `setBuilt(k)` builds it bottom-up for a frame-addressed reveal (0 = not yet, 1 = finished).
 */
import { BufferGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";

export interface Snowman { group: Group; setBuilt(k: number): void; dispose(): void }

export function buildSnowman(options: { height?: number; seed?: number; scarf?: string } = {}): Snowman {
  const H = options.height ?? 1.5, seed = options.seed ?? 3;
  const own: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => { own.push(x); return x; };
  const snow = keep(new MeshPhysicalMaterial({ color: "#f6f9fd", roughness: .88, sheen: .8, sheenColor: new Color("#dfe9ff"), sheenRoughness: .55 }));
  const coal = keep(new MeshStandardMaterial({ color: "#141414", roughness: .9 }));
  const carrot = keep(new MeshStandardMaterial({ color: "#e8742a", roughness: .7 }));
  const wood = keep(new MeshStandardMaterial({ color: "#5a3d26", roughness: .95 }));
  const knit = keep(new MeshStandardMaterial({ color: options.scarf ?? "#c0392b", roughness: .95 }));
  const group = new Group(); group.name = "yard.snowman";
  const lumpy = (r: number, s: number) => {
    const g = keep(new SphereGeometry(r, 40, 28)) as BufferGeometry, p = g.attributes.position, v = new Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = 1 + Math.sin(v.x * 9 + s) * .025 + Math.sin(v.y * 11 + s * 2) * .02 + Math.sin(v.z * 13 + s * 3) * .018 - (v.y < -r * .7 ? .08 * (-v.y / r - .7) : 0);
      v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  };
  const radii = [H * .23, H * .17, H * .12];
  const ys = [radii[0] * .92, radii[0] * 1.75 + radii[1] * .75, radii[0] * 1.75 + radii[1] * 1.6 + radii[2] * .8];
  const balls = radii.map((r, i) => { const m = new Mesh(lumpy(r, seed + i * 5), snow); m.position.y = ys[i]; m.castShadow = m.receiveShadow = true; group.add(m); return m; });
  const head = balls[2], torso = balls[1], rh = radii[2], rt = radii[1];
  const dot = (parent: Mesh, r: number, dir: [number, number, number], size: number) => { const m = new Mesh(keep(new SphereGeometry(size, 10, 8)), coal); m.position.set(...dir).normalize().multiplyScalar(r * 1.01); parent.add(m); };
  dot(head, rh, [-.35, .3, .9], rh * .085); dot(head, rh, [.35, .3, .9], rh * .085);
  for (let i = 0; i < 5; i++) { const a = -.5 + i * .25; dot(head, rh, [Math.sin(a) * .9, -.35 - Math.cos(a * 1.4) * .12, Math.cos(a) * .9], rh * .05); }
  for (const y of [.45, .05, -.35]) dot(torso, rt, [0, y, 1], rt * .075);
  const nose = new Mesh(keep(new ConeGeometry(rh * .12, rh * .7, 14).rotateX(Math.PI / 2).translate(0, 0, rh * 1.25)), carrot); head.add(nose);
  const arm = (side: 1 | -1) => {
    const a = new Group(); a.position.set(side * rt * .85, rt * .2, 0); a.rotation.z = side * -.55;
    const stick = new Mesh(keep(new CylinderGeometry(.012, .018, H * .42, 7).rotateZ(Math.PI / 2).translate(side * H * .21, 0, 0)), wood);
    const twig = new Mesh(keep(new CylinderGeometry(.007, .01, H * .12, 6).rotateZ(Math.PI / 2 - side * .8).translate(side * H * .33, H * .03, 0)), wood);
    a.add(stick, twig); torso.add(a);
  };
  arm(1); arm(-1);
  const scarf = new Mesh(keep(new TorusGeometry(rh * 1.02, rh * .16, 10, 32).rotateX(Math.PI / 2).translate(0, -rh * .82, 0)), knit);
  const tail = new Mesh(keep(new CapsuleGeometry(rh * .12, rh * .9, 4, 10).translate(rh * .45, -rh * 1.35, rh * .85)), knit);
  tail.rotation.z = -.15; head.add(scarf, tail);
  // Bottom-up build: each ball grows in a third of the reveal; details pop with the head.
  const setBuilt = (k: number) => {
    balls.forEach((b, i) => { const t = Math.max(0, Math.min(1, k * 3 - i)), e = t * t * (3 - 2 * t); b.scale.setScalar(Math.max(1e-3, e)); b.visible = t > 0; });
  };
  setBuilt(1);
  return { group, setBuilt, dispose() { for (const x of own) x.dispose(); } };
}
