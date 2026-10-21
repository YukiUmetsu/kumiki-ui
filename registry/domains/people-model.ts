/** Realistic 3D people vocabulary: renderer-free metadata for rigged GLB figures.
 *
 * Every person shares one action vocabulary, so scenes can swap people without
 * re-authoring timelines. Models are third-party assets under their own license
 * (see `license`); they are hosted by the consumer, not bundled into source.
 * No real individuals are depicted; outfits carry no organization marks.
 */
export const PERSON_ACTIONS=[
  {id:"idle",label:"Idle",meaning:"Standing, breathing; the resting pose."},
  {id:"talk",label:"Talk",meaning:"Neutral conversational gestures."},
  {id:"walk",label:"Walk",meaning:"In-place walk cycle; move the figure at its walk speed to avoid foot sliding."},
  {id:"wave",label:"Wave",meaning:"Greeting wave."},
  {id:"look-around",label:"Look around",meaning:"Scans the surroundings."},
  {id:"think",label:"Think",meaning:"Scratches head, considering a problem."},
  {id:"crouch",label:"Crouch",meaning:"Crouches to inspect something low."},
] as const;
export type PersonAction=typeof PERSON_ACTIONS[number]["id"];

export interface PersonSpec {
  kind:string;
  title:string;
  /** Semantic role used for search and grouping. */
  archetype:string;
  meaning:string;
  /** Model file name; resolve it to a hosted URL with `loadPerson3D({ resolveUrl })`. */
  file:string;
  /** Measured root travel of the source walk cycle, made in-place at conversion. */
  walk:{metersPerCycle:number;seconds:number};
  license:string;
  source:string;
}

export const PEOPLE_3D=[
  {kind:"casual-adult",title:"Casual adult",archetype:"person",
    meaning:"Everyday adult in a shirt and jeans: homeowner, customer, presenter.",
    file:"rocketbox-female-adult-01.glb",walk:{metersPerCycle:1.457,seconds:1.2},
    license:"MIT, Microsoft Rocketbox Avatar Library",source:"Rocketbox Female_Adult_01"},
  {kind:"contractor",title:"Contractor",archetype:"worker",
    meaning:"Tradesperson in bib overalls, hard hat and tool belt: inspection, repair, installation.",
    file:"rocketbox-construction-male-04.glb",walk:{metersPerCycle:1.214,seconds:1.2},
    license:"MIT, Microsoft Rocketbox Avatar Library",source:"Rocketbox Construction_Male_04"},
] as const satisfies readonly PersonSpec[];
export type PersonKind=typeof PEOPLE_3D[number]["kind"];

export function personSpec(kind:PersonKind):PersonSpec{
  const spec=PEOPLE_3D.find(p=>p.kind===kind);
  if(!spec)throw new Error("Unknown person kind: "+kind);
  return spec;
}
/** Ground speed (m/s) that matches the walk cycle's footfalls. */
export function personWalkSpeed(kind:PersonKind):number{
  const {walk}=personSpec(kind);
  return walk.metersPerCycle/walk.seconds;
}
