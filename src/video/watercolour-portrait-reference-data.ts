/**
 * Research-only watercolor portrait reference atlas, not bundled image assets.
 * Source images are displayed from their credited owners (hotlinks); their
 * licenses have NOT been cleared for redistribution, tracing or training.
 *
 * Original rejected WC11–WC15 portrait render code is deliberately removed.
 * The next authored figure will need a new reference study and visual gate.
 */
export interface WatercolourPortraitReference {
  id:string;
  artist:string;
  work:string;
  sourceUrl:string;
  imageUrl?:string;
  publishedBy:string;
  priority:"primary"|"secondary";
  viewpoint:string;
  observed:string;
  construction:string;
  negativeControl:string;
  rightsNote:string;
}
export const WATERCOLOUR_PORTRAIT_REFERENCES:readonly WatercolourPortraitReference[]=[
  {
    id:"whyte-workshop-portrait",artist:"Mary Whyte",
    work:"Workshop demonstration — contemplative woman",
    sourceUrl:"https://marywhyte.com/workshops.php",
    imageUrl:"https://marywhyte.com/uploads/workshop%20demo.jpg",
    publishedBy:"Artist's website",priority:"primary",
    viewpoint:"Adult face, three-quarter, eyes looking toward side light",
    observed:"Eyes are inset into the brow ridge, not white disks; the nose bridge is built from connected highlight and shadow planes. Jaw anatomy is believable even where the contour dissolves into the background. Hair is directional and the white garment is largely reserved paper.",
    construction:"Block the original sitter's cranial and jaw proportions first. Attach each eye to the orbital plane with upper-lid thickness; reserve small paper whites at the nose; paint hair as root-directed masses; avoid closing every jaw/shoulder outline.",
    negativeControl:"Symmetrical cartoon eyes, thick enclosed lips, identical outlines for jaw and hair, fully opaque painted white shirt.",
    rightsNote:"Contemporary copyrighted work: cite and view on the artist's site; do not download into the package, trace or redistribute.",
  },
  {
    id:"miller-heathers-memory",artist:"Stan Miller",
    work:"Heather's Memory",
    sourceUrl:"https://stanmiller.net/gallery/",
    imageUrl:"https://realismtoday.com/wp-content/uploads/2022/05/painting-portraits-realism-Stan-Miller-heather-scaled.jpg",
    publishedBy:"Artist's gallery / Realism Today",priority:"primary",
    viewpoint:"Young adult, near-frontal three-quarter portrait",
    observed:"Anatomy reads from correctly placed orbital cavities, asymmetric pupils, quiet nasolabial plane and an uneven mouth shape. Mid-value cool green/violet shadows are interleaved with warm reflected light. Edges disappear into hair and loose background pigment.",
    construction:"Build a five-value grayscale face before color. Separate eye sockets from eyelid folds and eyelashes; preserve distinct nasal side planes and unsymmetrical mouth corners. Include controlled wet transitions only at soft tissue and hair-to-paper boundaries.",
    negativeControl:"Floating irises, angular cheek stripes, flat polygon nose, evenly sprayed material noise, identical skin tone over entire skull.",
    rightsNote:"Contemporary copyrighted work: external study link only; no source image included in distributed code.",
  },
  {
    id:"miller-nicks-gaze",artist:"Stan Miller",
    work:"Nick's Gaze — aged bearded man",
    sourceUrl:"https://stanmiller.net/gallery/",
    imageUrl:"https://cdn.shopify.com/s/files/1/0057/8161/8732/products/StanMiller_Nick_streamline_FinalDemoApproved_1200x.jpg?v=1674066023",
    publishedBy:"Artist gallery / instructional publisher",priority:"primary",
    viewpoint:"Elderly adult male, close-up with spectacles, beard",
    observed:"Aged facial volume turns through strong warm/cool shadows. Glass lenses distort color and reflect light without becoming flat outlined circles. The beard is many intersecting negative spaces and value clumps, not a single brown polygon with repeated hair hatches.",
    construction:"Separate forehead, eye bags, brow ridge, nasal wing and cheek sag into overlapping measurable masses. Use oriented hair clumps with open paper gaps. Draw metal lens geometry only after the underlying eyes and cheek perspective are correct.",
    negativeControl:"Perfectly circular floating lenses, uniform sine-wave beard, featureless skull, dark eyeliner-like eye borders.",
    rightsNote:"Contemporary copyrighted work: external image for research only, not a production asset.",
  },
  {
    id:"whyte-veteran-closeup",artist:"Mary Whyte",
    work:"Veteran watercolor portrait — face under hat",
    sourceUrl:"https://fineartconnoisseur.com/2020/07/portraits-veterans-watercolor-mary-whyte/",
    imageUrl:"https://fineartconnoisseur.com/wp-content/uploads/2020/07/watercolor-portraits-veterans-Mary-Whyte-art-Tomato-Pie.72.jpg",
    publishedBy:"Fine Art Connoisseur",priority:"primary",
    viewpoint:"Elderly adult, close frontal portrait",
    observed:"Facial likeness arises from many asymmetrical contour inflections: lower eyelid pockets, cheek folds, nose alae, mouth/philtrum and forehead wrinkles. Light catches specific planes; delicate hatching is subordinate to large value masses.",
    construction:"Produce a full-resolution face-only geometry map: landmarks, overlap and folds. Add wrinkle lines following convexity only where a preceding wash establishes volume. Reserve whites inside the eyelids and on raised nose/cheek planes.",
    negativeControl:"Generic age lines pasted over a youthful symmetrical face, flat skin fill with decorative scratches.",
    rightsNote:"Contemporary copyrighted work: study and credit at publication; no embedded reference pixels.",
  },
  {
    id:"reid-stevie-wonder",artist:"Charles Reid",
    work:"Portrait of Stevie Wonder — loose expressive watercolor",
    sourceUrl:"https://auction.caseantiques.com/online-auctions/case-antiques/charles-reid-watercolor-stevie-wonder-5750120",
    imageUrl:"https://s1.img.bidsquare.com/item/xl/2489/24895258.jpeg?t=1",
    publishedBy:"Case Antiques auction catalog",priority:"primary",
    viewpoint:"Adult face in upward-looking three-quarter angle",
    observed:"Daring ochre/blue/red pigment splits define zygomatic and chin volume. White paper interrupts the cheek, nose and forehead; linework is deliberately incomplete. The eyes are shaped by pigment around them rather than repeated geometric ellipse primitives.",
    construction:"Study the red-versus-blue value blocks without copying the particular person's likeness. Model original cheek and jaw planes with discontinuous, tapered wash boundaries; allow light gaps to remain unpainted. Separate the hard focus around eyelids/nose from lost cheek edges.",
    negativeControl:"Evenly filled facial mask with a thin black outline, random speckles masquerading as wash, literal circular pupils without sockets.",
    rightsNote:"Contemporary copyrighted portrait and a recognizable real individual: external technique reference only, never a character to reproduce.",
  },
  {
    id:"sargent-mrs-gardner",artist:"John Singer Sargent",
    work:"Mrs. Gardner at Fenway Court (1903)",
    sourceUrl:"https://www.gardnermuseum.org/experience/collection/10875",
    publishedBy:"Isabella Stewart Gardner Museum",priority:"secondary",
    viewpoint:"Distant figure and shadowed head; not a fine facial anatomy reference",
    observed:"An example of deliberate loss of feature detail: readable posture, color, light and pose without specifying eyelashes or both eyes equally. Useful for mid-distance animation economy, not head close-ups.",
    construction:"For far-away figures, replace superfluous outlines and eyes with a small set of correctly oriented head/light/shoulder silhouettes. Do not use this distant study to validate a hero close-up face.",
    negativeControl:"Mistaking omitted facial features in a small figure for an acceptable close-up portrait.",
    rightsNote:"Historic watercolor, but the museum imposes reproduction conditions: source link only; inspect rights before asset use.",
  },
];
export const WATERCOLOUR_PORTRAIT_GATE={
  status:"rejected-rebuild-required" as const,
  rejectedPortraitIds:["sitter-a","sitter-b"] as const,
  minimumEvidence:[
    "Original figure proportions and pose documented from an authorized anatomy reference",
    "Source crop at 100% and 300% for both eyes, nose, mouth, cheek, hair and chin",
    "Five-value grayscale construction and asymmetrical head/face geometry",
    "Separately authored lost/found watercolor boundaries, reserved paper and pigment loading",
    "Native 16:9/9:16 face comparison reviewed at 100% and 300%, not merely HTML/TypeScript tests",
    "Approved still face before face rigging, blinking, export or public Storybook promotion",
  ],
} as const;
