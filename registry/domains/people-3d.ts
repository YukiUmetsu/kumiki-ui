/** Load a realistic rigged person from {@link PEOPLE_3D} as a reusable HeroAsset factory.
 *
 * Models are hosted by the consumer (copy `assets/models/people/*.glb` and their
 * license notice next to your app's static files); pass `resolveUrl` when they do
 * not live at `/models/people/<file>`. Each factory rests in the first Idle frame
 * and exposes the shared {@link PERSON_ACTIONS} as frame-addressable actions.
 */
import { loadGltfHero } from "../craft/hero-gltf";
import type { GltfHeroFactory, GltfHeroOptions } from "../craft/hero-gltf";
import { PERSON_ACTIONS, personSpec } from "./people-model";
import type { PersonKind, PersonSpec } from "./people-model";

export interface Person3DOptions extends Omit<GltfHeroOptions, "actions" | "license" | "restPose"> {
  /** Map a model file name to a URL or loaded bytes. Defaults to `/models/people/<file>`. */
  resolveUrl?: (file: string, spec: PersonSpec) => string | ArrayBuffer;
}

const ACTION_META = Object.fromEntries(PERSON_ACTIONS.map(a => [a.id, { label: a.label, meaning: a.meaning }]));

export function loadPerson3D(kind: PersonKind, options: Person3DOptions = {}): Promise<GltfHeroFactory> {
  const spec = personSpec(kind);
  const { resolveUrl = (file: string) => `/models/people/${file}`, ...rest } = options;
  return loadGltfHero(resolveUrl(spec.file, spec), {
    id: kind, studio: { palette: "graphite" }, ...rest,
    actions: ACTION_META, restPose: { action: "idle" },
    license: `${spec.license} (${spec.source}).`,
  });
}
