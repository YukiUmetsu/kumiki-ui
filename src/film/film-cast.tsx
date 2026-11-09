/** The characters a film's cast can name, for the capture page and stories: Pip and Quill, drawn by the character presenter from the
 * Storybook fixtures. App code, not library code: a host supplies its own characters through `FilmStage`'s `renderCast`. */
import { CharacterPresenter } from "../../registry/character/character-presenter-react";
import type { CharacterCue, CharacterDefinition, CharacterInstance } from "../../registry/character/definition";
import type { ReactNode } from "react";
import type { FilmCastMember } from "../../registry/video/film-document";
import { forwardWalkCues } from "../character/character-presenter-demo";
import { doctorQuillAssetFiles, doctorQuillCharacter } from "../character/fixtures/doctor-quill";
import { pipAssetFiles, pipCharacter } from "../character/fixtures/pip";

const FILES = import.meta.glob("../character/fixtures/{doctor-quill-assets,pip-assets-v1-6}/**/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const ASSETS: Record<string, string> = Object.fromEntries(Object.entries({ ...doctorQuillAssetFiles, ...pipAssetFiles })
  .flatMap(([uri, file]) => { const url = FILES[`../character/fixtures/${file}`]; return url ? [[uri, url]] : []; }));
const CHARACTERS: Record<string, CharacterDefinition> = { pip: pipCharacter, quill: doctorQuillCharacter };
export const CAST_NAMES = Object.keys(CHARACTERS);
/** Things a cast can name beside the characters (a plane, a place stamp), registered by the page that can draw them. */
type CastProp = (member: FilmCastMember, context: { frame: number; reducedMotion: boolean }) => ReactNode;
const PROPS: Record<string, CastProp> = {};
export function registerCastProp(character: string, draw: CastProp) { PROPS[character] = draw; }

/** One cast member at one scene frame: its cues become the presenter's actions, expressions and speech. */
export function renderFilmCast(member: FilmCastMember, { frame, reducedMotion }: { frame: number; reducedMotion: boolean }) {
  const definition = CHARACTERS[member.character];
  if (!definition && PROPS[member.character]) return PROPS[member.character](member, { frame, reducedMotion });
  if (!definition) throw new Error(`The cast has no character "${member.character}". Characters: ${CAST_NAMES.join(", ")}.`);
  const instanceId = `${member.character}-${Math.round(member.at[0] * 100)}-${Math.round(member.at[1] * 100)}`;
  const instance: CharacterInstance = { instanceId, characterId: definition.characterId, revision: definition.revision, seed: member.character.length * 7 + Math.round(member.at[0] * 31) };
  const cues: CharacterCue[] = (member.cues ?? []).flatMap((cue, i) => [
    ...cue.action ? [{ id: `${instanceId}-a${i}`, instanceId, kind: "action" as const, startFrame: cue.at, name: cue.action }] : [],
    ...cue.expression ? [{ id: `${instanceId}-e${i}`, instanceId, kind: "expression" as const, startFrame: cue.at, name: cue.expression }] : [],
    ...cue.speak ? [{ id: `${instanceId}-s${i}`, instanceId, kind: "speech" as const, startFrame: cue.at, endFrame: cue.at + cue.speak, precision: "approximate" as const }] : [],
  ]) as CharacterCue[];
  // A walk plays the fixture's matched step and bob cycles (24 frames each) for as long as it lasts.
  if (member.walk) cues.push(...forwardWalkCues(definition, instanceId, member.walk.from, Math.max(1, Math.ceil((member.walk.to - member.walk.from) / 24))));
  return <CharacterPresenter assetUrls={ASSETS} definition={definition} instance={instance} cues={cues} frame={frame} reducedMotion={reducedMotion}
    label={`${member.character === "pip" ? "Pip the squirrel" : "Quill the owl"}`} style={{ width: "100%", height: "100%" }} />;
}
