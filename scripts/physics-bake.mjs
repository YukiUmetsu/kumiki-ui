#!/usr/bin/env node
/** Bake physics scenes offline: solve each scene in `registry/visual/physics-shots.ts` once with Rapier's cross-platform deterministic
 * build, and write a BakedPhysicalActionSpec (one track per body, 30 fps keys, contact cues) to assets/physics/<id>.json.
 *   npm run physics:bake            Bake every scene.
 *   npm run physics:bake -- --id=domino-chain
 * The solver is a development dependency only; renders read the JSON. Same inputs always produce the same file.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import RAPIER from "@dimforge/rapier3d-deterministic-compat";
import { PHYSICS_SCENES } from "../registry/visual/physics-shots.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."), OUT = join(ROOT, "assets/physics");
const SUBSTEPS = 8, FPS = 30, round = (v, d = 5) => Number(v.toFixed(d));
await RAPIER.init();

function bake(scene) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / (FPS * SUBSTEPS);
  const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -.05, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(20, .05, 20).setFriction(scene.friction ?? .5).setRestitution(scene.restitution ?? .05), ground);
  const events = new RAPIER.EventQueue(true), bodies = new Map(), handles = new Map();
  for (const spec of scene.bodies) {
    const yaw = (spec.yaw ?? 0) * Math.PI / 180;
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(...spec.position).setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }).setCanSleep(true);
    // A body waiting for its release is out of the simulation, so it cannot be hit or block another body.
    if ((spec.release ?? 0) > 0) desc.setEnabled(false);
    const body = world.createRigidBody(desc);
    const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2).setDensity(600).setFriction(scene.friction ?? .5).setRestitution(scene.restitution ?? .05)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
    bodies.set(spec.id, { spec, body, keys: [], released: (spec.release ?? 0) <= 0 });
    handles.set(collider.handle, spec.id);
    if ((spec.release ?? 0) <= 0 && spec.velocity) body.setLinvel({ x: spec.velocity[0], y: spec.velocity[1], z: spec.velocity[2] }, true);
    // A body pushed at frame 0 (the first domino of a chain that must be seen standing before the push) starts with its spin.
    if ((spec.release ?? 0) <= 0 && spec.angularVelocity) body.setAngvel({ x: spec.angularVelocity[0], y: spec.angularVelocity[1], z: spec.angularVelocity[2] }, true);
  }
  const contacts = [], touched = new Set();
  for (let frame = 0; frame <= scene.durationFrames; frame++) {
    for (const entry of bodies.values()) {
      const p = entry.body.translation(), q = entry.body.rotation();
      const waiting = !entry.released && frame < (entry.spec.release ?? 0);
      entry.keys.push({ frame, position: [round(p.x), round(p.y), round(p.z)], rotation: [round(q.x, 6), round(q.y, 6), round(q.z, 6), round(q.w, 6)], ...(waiting ? { scale: [0, 0, 0] } : (entry.spec.release ?? 0) > 0 ? { scale: [1, 1, 1] } : {}) });
      if (!entry.released && frame >= entry.spec.release) {
        entry.released = true;
        entry.body.setEnabled(true);
        if (entry.spec.velocity) entry.body.setLinvel({ x: entry.spec.velocity[0], y: entry.spec.velocity[1], z: entry.spec.velocity[2] }, true);
        if (entry.spec.angularVelocity) entry.body.setAngvel({ x: entry.spec.angularVelocity[0], y: entry.spec.angularVelocity[1], z: entry.spec.angularVelocity[2] }, true);
      }
    }
    for (let s = 0; s < SUBSTEPS; s++) {
      world.step(events);
      events.drainCollisionEvents((a, b, started) => {
        if (!started) return;
        const ids = [handles.get(a), handles.get(b)].filter(Boolean).sort();
        const key = ids.join("|") || "ground";
        if (touched.has(key)) return;
        touched.add(key);
        // The faster of the two bodies sets the impact speed, which sets how loud its sound is.
        const speed = Math.max(...ids.map(id => { const v = bodies.get(id).body.linvel(); return Math.hypot(v.x, v.y, v.z); }));
        if (speed > .15) contacts.push({ frame: round(frame + (s + 1) / SUBSTEPS, 3), target: ids[ids.length - 1], speedMps: round(speed, 3), material: "wood" });
      });
    }
  }
  world.free();
  // Drop keys that repeat the one before (bodies at rest), keeping the first and last, so files stay small without changing any sample.
  const tracks = [...bodies.values()].map(({ spec, keys }) => ({ target: spec.id, interpolation: "linear",
    keys: keys.filter((k, i) => { const sig = (x) => JSON.stringify([x.position, x.rotation, x.scale]); return i === 0 || i === keys.length - 1 || sig(k) !== sig(keys[i - 1]) || sig(k) !== sig(keys[i + 1]); }) }));
  return { schemaVersion: 1, id: scene.id, label: scene.title, durationFrames: scene.durationFrames, tracks, contacts: contacts.sort((a, b) => a.frame - b.frame) };
}

const only = process.argv.find(arg => arg.startsWith("--id="))?.slice(5);
mkdirSync(OUT, { recursive: true });
for (const [id, make] of Object.entries(PHYSICS_SCENES)) {
  if (only && only !== id) continue;
  const scene = make(), action = bake(scene);
  writeFileSync(join(OUT, `${id}.json`), JSON.stringify({ scene, action }) + "\n");
  console.log(`${id}: ${action.tracks.length} bodies, ${action.tracks.reduce((n, t) => n + t.keys.length, 0)} keys, ${action.contacts.length} contacts, last at frame ${action.contacts.at(-1)?.frame ?? "none"}`);
}
