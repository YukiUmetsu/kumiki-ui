/** When and how to use each studio video recipe, as data. Storybook, the component catalog and the docs read this one table, so an
 * agent meets the same rules wherever it looks. The rules come from product photography, product films and the best interactive 3D
 * work: see docs/31-react-three-fiber-content-plan.md for the examples and sources.
 */

/** What a studio shot is for. Naming it is the point: a 3D product turning for no reason is a screensaver. */
export const STUDIO_JOBS = ["introduce", "explain-part", "construction", "compare", "mechanism", "reveal", "bridge", "cause-and-effect"] as const;
export type StudioJob = (typeof STUDIO_JOBS)[number];

export interface StudioRecipeGuide {
  id: string;
  title: string;
  /** The React component in `studio-recipes-react.tsx`. */
  component: string;
  jobs: readonly StudioJob[];
  use: string;
  avoid: string;
  settings: string;
  /** How product films and studios use it, described without names. Named examples are in doc 31. */
  practice: string;
  review: readonly string[];
  /** The registry item and the Storybook story id that show it. */
  registryItem: string;
  storyId: string;
  keywords: readonly string[];
}

export const STUDIO_RECIPE_GUIDE: readonly StudioRecipeGuide[] = [
  { id: "product-hero-turn", title: "Product Hero Turn", component: "ProductHeroTurn", jobs: ["introduce", "reveal"], registryItem: "studio-recipes", storyId: "video-studio-recipes--product-hero-turn-story",
    keywords: ["product", "turntable", "hero shot", "launch", "packshot", "three-quarter view"],
    use: "The first time a viewer meets an object: a product, a device, a tool. It turns slowly into its best angle, holds, and then one claim appears.",
    avoid: "Spinning a full 360°, turning faster than about 30° a second, or putting the claim up while the object is still moving. A product that never stops never gets looked at.",
    settings: "Turn 30° to 60°, decelerating into a three-quarter view (yaw −25° to −40°) over 2 to 2.5 s. Hold for at least 1.5 s with 1° to 2° of drift. Long lens (26°). Strip light for metal and glass, softbox for matte, rim for a dark launch. Claim of eight words or fewer, entering 6 frames after the camera lands.",
    practice: "Product films turn the product, not the camera: the object sits on a turntable before a seamless sweep, so the light glides across its surfaces while the background stays clean. The best interactive launches commit to one object and give it real material response; the landing angle is chosen like a photograph.",
    review: ["Does the turn land and stop?", "Does the claim wait for the landing?", "Do highlights move across the surfaces as it turns?"] },
  { id: "part-spotlight", title: "Part Spotlight", component: "PartSpotlight", jobs: ["explain-part"], registryItem: "studio-recipes", storyId: "video-studio-recipes--part-spotlight-story",
    keywords: ["callout", "feature", "highlight", "zoom", "annotation", "leader line"],
    use: "\"This part does X\": a lens, a port, a hinge, a seal. The camera arcs in to the part, the part is outlined, the rest dims a little, and a short label names it.",
    avoid: "Outlining before the camera arrives, dimming the rest so far that the part loses its context, or a label over the subject. One part per shot; a second part is a second shot.",
    settings: "Push over 1.5 to 2 s with the part landing on a third line. Outline 3 to 4 px at 1080p with a faint halo; dim the rest by 0.3 to 0.5. Label of six words or fewer on the empty side, joined by a leader line. Use the softbox or strip look; the rim look darkens the subject too far once it is dimmed.",
    practice: "Explainers and product pages pair a camera move with a single highlighted part and an annotation pinned to it. Selection outlines are one of the most common techniques in interactive 3D; the craft is restraint: one part, a thin clean line, and the label placed where nothing else is.",
    review: ["Is the label clear of the subject (`data-km-text-overlap` false)?", "Does the outline arrive with the camera?", "Can you still see what the part belongs to?"] },
  { id: "exploded-view", title: "Exploded View", component: "ExplodedView", jobs: ["construction", "explain-part"], registryItem: "studio-recipes", storyId: "video-studio-recipes--exploded-view-story",
    keywords: ["exploded", "teardown", "layers", "assembly", "how it is built", "components"],
    use: "How something is built: the layers of a device, the parts of a mechanism. Pieces slide apart along the axis they were assembled on, hold to be read, and nest back.",
    avoid: "Parts flying in every direction, more than about nine pieces moving at once, or exploding so far that the pieces stop reading as one object.",
    settings: "Group small parts with what they belong to (a lens with its ring). Separate over 1.3 to 1.6 s with 3 frames of stagger, outermost first; hold at least 1.5 s; return innermost first, a little faster. A side-on three-quarter view (yaw about −65°, pitch 15°) shows the stack.",
    practice: "Technical illustration and teardown films move parts along their assembly axis with equal gaps, so the order of construction reads at a glance. Pieces that sit at the edge move straight out from their side.",
    review: ["Does every piece move along one axis or straight out?", "Can you count the layers?", "Does the camera keep every piece in frame?"] },
  { id: "finish-compare", title: "Finish Compare", component: "FinishCompare", jobs: ["compare"], registryItem: "studio-recipes", storyId: "video-studio-recipes--finish-compare-story",
    keywords: ["compare", "variants", "colours", "finishes", "side by side", "configurator"],
    use: "Two versions of the same thing: finishes, colours, materials, or before and after a design change.",
    avoid: "Different light or camera in each pane: then the comparison is dishonest. More than four panes stops being a comparison.",
    settings: "Two panes with identical light, exposure and a synchronised camera move of 15° to 25°. Labels of four words or fewer in each pane's corner.",
    practice: "Configurators swap one part's material at a time under fixed studio light. For video, side-by-side panes on one canvas share every model and material, so the only difference on screen is the one being compared.",
    review: ["Is the light identical in both panes?", "Is the only difference the one named in the labels?"] },
  { id: "two-angle-proof", title: "Two-Angle Proof", component: "TwoAngleProof", jobs: ["mechanism"], registryItem: "studio-recipes", storyId: "video-studio-recipes--two-angle-proof-story",
    keywords: ["two angles", "multi-view", "mechanism", "hinge", "front and side", "split screen"],
    use: "A movement that is hard to read from one side: a hinge opening, a lid, a slide. The same moment plays from two cameras at once.",
    avoid: "Two angles of a static object, which only halves the picture. Angles that are too similar to add information.",
    settings: "Two panes 70° to 90° apart (front and side, or front and top), playing one action on the same frame. Keep both cameras still so the movement is the only motion.",
    practice: "Engineering animation shows a mechanism in orthogonal views at once. One canvas with several viewports renders every view from one shared scene, so the views stay in exact sync.",
    review: ["Does each angle show something the other cannot?", "Do both play the same frame?"] },
  { id: "light-through-it", title: "Light Through It", component: "LightThroughIt", jobs: ["cause-and-effect", "reveal"], registryItem: "light-recipes", storyId: "video-light-recipes--light-through-water",
    keywords: ["caustics", "water", "pool", "refraction", "ripple", "light", "drop", "physics of light"],
    use: "Light as the subject: how water or glass bends it. A drop lands on a sunlit pool and its rings sweep the caustic web outward, so the viewer sees the cause (the ripple) and the effect (the light) in one frame.",
    avoid: "Caustics painted on as a texture that ignores the surface, a pattern that repeats as a grid, or a camera moving so much that it competes with the light. Do not title the shot before the rings have reached the floor.",
    settings: "Six short ripple trains a few millimetres high (CALM_POOL), the drop at 1 to 1.5 s, at least 2.5 s for the rings, the camera looking down at about 60° with under 15° of drift. A pale aqua floor shows the light best.",
    practice: "Interactive water demos trace caustics from the surface itself, so light and ripple always agree; title designers keep the camera still and let the light move. The craft is restraint: calm swells keep the floor alive, one event changes it.",
    review: ["Does the light on the floor move with the ripples you can see?", "Is the pattern irregular, not a grid?", "Does the title wait for the rings?"] },
  { id: "screen-comes-alive", title: "Screen Comes Alive", component: "ScreenComesAlive", jobs: ["explain-part", "reveal"], registryItem: "studio-recipes", storyId: "video-studio-recipes--screen-comes-alive-story",
    keywords: ["screen", "app", "interface", "ui demo", "device", "product demo", "push in"],
    use: "A product demo where the interface is the point: push into the device, let the screen perform one short flow, and pull back to the object.",
    avoid: "Starting the interface while the camera is still moving, showing a whole app tour in one shot, or leaving the glass reflecting a softbox across the interface.",
    settings: "Push over 1.3 to 1.6 s to a square, frame-filling view; start the interface as the camera lands; 2.5 s or more on the screen; one flow (a number counts, a list fills, one switch turns). The recipe gives the display an anti-reflective coat while it is the subject.",
    practice: "Product films treat the screen separately from the glass so the interface reads cleanly, and combine 3D device shots with interface motion and kinetic type into one story. One flow per shot; the device frames it.",
    review: ["Does the interface wait for the camera?", "Is any text on the screen under 14 design pixels?", "Is the screen free of reflections while it is read?"] },
  { id: "step-inside", title: "Step Inside", component: "StepInside", jobs: ["bridge", "reveal"], registryItem: "studio-recipes", storyId: "video-studio-recipes--step-inside-story",
    keywords: ["portal", "transition", "through the screen", "window", "chapter bridge", "world"],
    use: "A chapter bridge from an object to what it opens onto: the screen is a live window into a world, and the camera goes through it and keeps moving.",
    avoid: "More than one per film, a crossing that cuts, or a window that shows a flat picture without parallax. The world has to be worth arriving in.",
    settings: "Land square on the screen over about 2 s, dolly through in 12 to 20 frames, then at least 2.5 s inside, decelerating to a drift. Speeds match through the window. Title the world only after the camera arrives.",
    practice: "Portals are among the most common techniques in interactive 3D because they turn a cut into a journey. The craft is continuity: true parallax through the window, and the same camera speed on both sides of it.",
    review: ["Does the view through the screen move with parallax?", "Is the crossing seamless?", "Does the camera keep moving forward after it?"] },
];
