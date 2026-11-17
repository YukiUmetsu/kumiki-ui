/**
 * INTERIOR1 data: rooms and furniture in any art style, built round the body.
 *
 * - `ERGONOMICS`: the heights and depths every piece shares (seat about 45 cm, table about 75 cm, a 25–30 cm gap between
 *   them, counter about 90 cm), graded like the other foundations: `reported` (quoted from a cited source),
 *   `measured`, `estimated`.
 * - `CLEARANCES`: room to move round furniture.
 * - `BED_SIZES`: mattress sizes by country.
 * - `FURNITURE_TYPES`: pieces by period and culture with their construction and the details that make them read.
 * - `INTERIOR_STYLES`: what a room of each period and place is made of.
 *
 * `furn-construct.ts` builds the pieces; `furn-library.ts` shows them and paints rooms.
 */
import type { Range } from "./foundation-shapes";
import { range as r } from "./foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string): Range => r(min, typical, max, "reported", source);
const est = (min: number, typical: number, max: number, source?: string): Range => r(min, typical, max, "estimated", source);

/** The heights and depths furniture is built round, metres. */
export const ERGONOMICS = {
  seatHeight: rep(0.42, 0.45, 0.48, "Furniture ergonomics guides: dining seat 43–47 cm with a 75 cm table (Studio Matrx); 46–48 cm for taller users"),
  seatDepth: est(0.38, 0.43, 0.5, "Common chair design practice"),
  backTilt: est(95, 102, 110, "Upright dining chairs lean back a few degrees; lounge chairs more"),
  tableHeight: rep(0.72, 0.75, 0.76, "Dining tables 74–76 cm (furniture guides); desks 72–76 cm"),
  seatToTable: rep(0.25, 0.28, 0.3, "Seat-to-table gap about 25–30 cm (furniture ergonomics guides)"),
  counterHeight: rep(0.86, 0.9, 0.92, "Kitchen counter 36 in (91 cm), Popular Woodworking drafting tables; counter tables 34–36 in"),
  barHeight: est(1.0, 1.05, 1.1, "Bar counters"),
  armrest: est(0.6, 0.65, 0.7, "Armrest top above the floor"),
  sofaSeat: est(0.38, 0.43, 0.46, "Lounge and sofa seats are lower than dining seats"),
  coffeeTable: est(0.38, 0.43, 0.48, "Coffee table about the sofa seat's height"),
  bedTop: est(0.45, 0.55, 0.65, "Mattress top"),
  shelfSpacing: est(0.25, 0.3, 0.38, "Book shelves: octavo books under 25 cm, quartos to 32 cm"),
  shelfDepth: est(0.22, 0.28, 0.35, "Book shelf depth"),
  wardrobeDepth: est(0.55, 0.6, 0.65, "A coat hanger is about 45 cm wide"),
  upperCabinet: est(1.35, 1.45, 1.5, "Underside of wall cupboards above a kitchen floor"),
  mantel: est(1.1, 1.3, 1.5, "Mantelshelf height in period rooms"),
  floorSeat: est(0.0, 0.1, 0.2, "Floor cushions, zabuton and majlis seating"),
  lowTable: est(0.3, 0.33, 0.36, "Japanese chabudai and kotatsu tables"),
} as const;
/** Room to move round furniture, metres. */
export const CLEARANCES = {
  walkway: est(0.75, 0.9, 1.2, "Main path through a room"),
  behindChair: est(0.75, 0.9, 1.0, "From a table edge to a wall, so a chair can be pushed back and passed"),
  coffeeGap: est(0.4, 0.45, 0.5, "Sofa to coffee table, within reach"),
  bedSide: est(0.6, 0.7, 0.9, "Beside a bed"),
  hearth: est(0.9, 1.2, 1.5, "Free floor before a fireplace"),
} as const;
/** Mattress sizes, metres (width × length). */
export const BED_SIZES: readonly { name: string; w: number; l: number; where: string; grade: "reported" | "estimated" }[] = [
  { name: "Single", w: 0.9, l: 1.9, where: "UK and Europe", grade: "reported" },
  { name: "Double", w: 1.35, l: 1.9, where: "UK", grade: "reported" },
  { name: "Twin", w: 0.97, l: 1.91, where: "US (38 × 75 in)", grade: "reported" },
  { name: "Full", w: 1.37, l: 1.91, where: "US (54 × 75 in)", grade: "reported" },
  { name: "Queen", w: 1.52, l: 2.03, where: "US (60 × 80 in)", grade: "reported" },
  { name: "King", w: 1.93, l: 2.03, where: "US (76 × 80 in)", grade: "reported" },
  { name: "Futon", w: 1.0, l: 2.0, where: "Japan (about one tatami)", grade: "estimated" },
];
/** The gap a chair leaves under a table (25–30 cm is comfortable). */
export const seatTableGap = (seat: number, table: number) => table - seat;

export type FurnitureKind = "seat" | "table" | "storage" | "bed" | "light" | "fixture";
export interface FurnitureType {
  id: string; label: string; kind: FurnitureKind;
  region: string; period: string;
  /** Overall width, depth and height, metres. */
  w: number; d: number; h: number;
  /** Seat or top height where it matters. */
  seat?: number;
  materials: readonly string[];
  /** How it is made and what makes it read. */
  notes: readonly string[];
  source?: string;
}
/** Furniture by period and culture. */
export const FURNITURE_TYPES: readonly FurnitureType[] = [
  { id: "settle", label: "Oak settle", kind: "seat", region: "England", period: "16th–17th century", w: 1.6, d: 0.55, h: 1.5, seat: 0.45, materials: ["oak"], notes: ["A high panelled back keeps draughts off the sitter by the hearth.", "Framed and panelled with pegged mortise and tenon joints."] },
  { id: "windsor-chair", label: "Windsor chair", kind: "seat", region: "England and America", period: "18th–19th century", w: 0.55, d: 0.5, h: 0.95, seat: 0.45, materials: ["elm seat", "beech or ash legs and spindles"], notes: ["A thick saddled seat holds everything: splayed turned legs below, a spindle back and a steam-bent bow above.", "Joints are tenons driven into wet mortises that shrink tight round them."], source: "Fine Woodworking, A short history of styles and forms" },
  { id: "ladder-back", label: "Shaker ladder-back chair", kind: "seat", region: "America (Shaker)", period: "19th century", w: 0.48, d: 0.42, h: 1.05, seat: 0.43, materials: ["maple", "woven tape seat"], notes: ["Turned posts with small finials, three or four arched slats, a woven seat, no ornament.", "Shaker side chairs have no arms."], source: "Fine Woodworking; Invaluable furniture guide" },
  { id: "queen-anne-chair", label: "Queen Anne side chair", kind: "seat", region: "England and colonial America", period: "1720–1760", w: 0.52, d: 0.48, h: 1.0, seat: 0.43, materials: ["walnut", "upholstered slip seat"], notes: ["Cabriole legs ending in pad feet; a vase-shaped solid splat; a yoke-shaped crest rail."] },
  { id: "chippendale-chair", label: "Chippendale chair", kind: "seat", region: "England and America", period: "1750–1790", w: 0.56, d: 0.5, h: 0.98, seat: 0.44, materials: ["mahogany", "upholstered seat"], notes: ["Cabriole legs on ball-and-claw feet; a pierced splat; a serpentine (cupid's bow) crest rail."], source: "Fine Woodworking" },
  { id: "thonet-14", label: "Thonet No. 14 bentwood chair", kind: "seat", region: "Austria", period: "1859", w: 0.43, d: 0.52, h: 0.88, seat: 0.46, materials: ["steam-bent beech", "cane seat"], notes: ["Six pieces of steam-bent wood, ten screws and two nuts; 36 dismantled chairs shipped in one crate.", "Back legs run up into the back hoop; a ring braces the legs."], source: "Wikipedia: No. 14 chair; Brooklyn Museum" },
  { id: "ming-horseshoe", label: "Ming horseshoe armchair (quanyi)", kind: "seat", region: "China", period: "Ming dynasty (1368–1644)", w: 0.6, d: 0.47, h: 1.0, seat: 0.5, materials: ["huanghuali hardwood", "soft mat seat"], notes: ["One continuous arm rail sweeps round into the back as a horseshoe; an S-curved splat fits the spine.", "Joined without nails or glue: mortises, tenons and wedges; a footrest stretcher at the front."] },
  { id: "official-hat-chair", label: "Official's hat armchair (guanmaoyi)", kind: "seat", region: "China", period: "Ming dynasty", w: 0.58, d: 0.46, h: 1.12, seat: 0.5, materials: ["huanghuali"], notes: ["The top rail projects at both ends like the wings of an official's hat.", "Tapering round legs splay a little; stretchers step up from front to back."] },
  { id: "wassily-chair", label: "Tubular steel club chair", kind: "seat", region: "Germany (Bauhaus)", period: "1925", w: 0.78, d: 0.7, h: 0.73, seat: 0.42, materials: ["bent nickel-plated steel tube", "leather straps"], notes: ["A frame of bent steel tube with taut leather straps for seat, back and arms; light enough to see through."] },
  { id: "lounge-chair", label: "Moulded plywood lounge chair", kind: "seat", region: "United States", period: "1956", w: 0.84, d: 0.85, h: 0.84, seat: 0.38, materials: ["moulded rosewood plywood shells", "leather cushions", "aluminium base"], notes: ["Three curved plywood shells hold leather cushions on a swivel base; an ottoman matches."] },
  { id: "chesterfield", label: "Chesterfield sofa", kind: "seat", region: "England", period: "19th century", w: 2.1, d: 0.95, h: 0.75, seat: 0.43, materials: ["deep-buttoned leather", "brass nails"], notes: ["Arms rolled at the same height as the back, both deep-buttoned in leather."] },
  { id: "floor-cushions", label: "Floor cushions and zabuton", kind: "seat", region: "Japan, Morocco, Middle East", period: "traditional", w: 0.6, d: 0.6, h: 0.12, seat: 0.12, materials: ["cotton", "silk", "wool"], notes: ["Sitting on the floor sets the room's eye level: low tables, low windows, scrolls hung low."] },
  { id: "refectory-table", label: "Oak refectory table", kind: "table", region: "England", period: "16th–17th century", w: 2.4, d: 0.8, h: 0.76, materials: ["oak"], notes: ["A thick plank top on bulbous turned legs joined by low stretchers worn by feet."] },
  { id: "gateleg-table", label: "Gateleg table", kind: "table", region: "England", period: "17th century", w: 1.3, d: 1.2, h: 0.72, materials: ["oak"], notes: ["Leaves fold down; swing-out gates of turned legs support them when raised."] },
  { id: "altar-table", label: "Everted-end altar table (qiaotoutai)", kind: "table", region: "China", period: "Ming and Qing", w: 2.2, d: 0.45, h: 0.9, materials: ["hardwood"], notes: ["A long narrow top whose ends curl up (everted flanges); recessed legs on shoe feet with carved spandrels."] },
  { id: "chabudai", label: "Chabudai low table", kind: "table", region: "Japan", period: "Meiji–Showa", w: 0.9, d: 0.9, h: 0.33, materials: ["lacquered wood"], notes: ["A round low table at which a family kneels; its legs fold away."] },
  { id: "pedestal-desk", label: "Victorian pedestal desk", kind: "table", region: "England", period: "19th century", w: 1.5, d: 0.8, h: 0.76, materials: ["mahogany", "tooled leather top", "brass handles"], notes: ["Two pedestals of drawers carry a top inlaid with tooled leather; a kneehole between."] },
  { id: "sideboard", label: "Mid-century sideboard", kind: "storage", region: "Denmark", period: "1950s–60s", w: 1.8, d: 0.45, h: 0.75, materials: ["teak"], notes: ["A low case of sliding doors and drawers on slender tapered legs."] },
  { id: "welsh-dresser", label: "Welsh dresser", kind: "storage", region: "Wales and England", period: "18th–19th century", w: 1.6, d: 0.5, h: 2.0, materials: ["oak or pine", "blue-and-white plates"], notes: ["A cupboard base under an open plate rack, plates propped on the shelves."] },
  { id: "bookcase", label: "Library bookcase", kind: "storage", region: "Europe", period: "18th–19th century", w: 1.6, d: 0.35, h: 2.4, materials: ["mahogany", "books"], notes: ["Adjustable shelves about 30 cm apart, a moulded cornice and plinth."] },
  { id: "tansu", label: "Staircase chest (kaidan-dansu)", kind: "storage", region: "Japan", period: "Edo–Meiji", w: 1.8, d: 0.45, h: 1.8, materials: ["keyaki and paulownia", "black iron fittings"], notes: ["A chest stepped like a stair, with drawers and sliding doors in its risers and iron lock plates."], source: "Collectors' guides to tansu" },
  { id: "round-corner-cabinet", label: "Round-corner cabinet (yuanjiaogui)", kind: "storage", region: "China", period: "Ming", w: 0.9, d: 0.5, h: 1.8, materials: ["huanghuali", "baitong brass mounts"], notes: ["The frame tapers a little toward the top; rounded corners; two doors pivot on dowels with no hinges, a brass lock plate."] },
  { id: "blanket-chest", label: "Iron-bound dowry chest", kind: "storage", region: "Europe", period: "17th–19th century", w: 1.2, d: 0.55, h: 0.65, materials: ["oak", "wrought iron straps"], notes: ["A plank chest bound in iron straps with a hasp, on a plinth."] },
  { id: "four-poster", label: "Four-poster bed", kind: "bed", region: "England", period: "16th–18th century", w: 1.6, d: 2.1, h: 2.4, seat: 0.6, materials: ["carved oak", "wool curtains"], notes: ["Four posts carry a tester (canopy) from which curtains hang to close the bed against draughts."] },
  { id: "futon", label: "Futon on tatami", kind: "bed", region: "Japan", period: "traditional", w: 1.0, d: 2.0, h: 0.12, seat: 0.12, materials: ["cotton", "tatami"], notes: ["Laid out at night on the mats and folded into the oshiire cupboard by day."] },
  { id: "chandelier", label: "Brass candle chandelier", kind: "light", region: "Netherlands and England", period: "17th–18th century", w: 0.9, d: 0.9, h: 0.9, materials: ["cast brass", "candles"], notes: ["S-curved arms round a ball-turned stem, a large ball below to reflect the candlelight."] },
  { id: "tiffany-lamp", label: "Leaded-glass table lamp", kind: "light", region: "United States", period: "1900s", w: 0.45, d: 0.45, h: 0.6, materials: ["leaded stained glass", "bronze base"], notes: ["A shade of small coloured glass pieces in copper foil, glowing when lit."] },
  { id: "longcase-clock", label: "Longcase clock", kind: "fixture", region: "England", period: "18th century", w: 0.5, d: 0.28, h: 2.1, materials: ["oak or mahogany case", "brass dial"], notes: ["A tall case for the long pendulum, a hood over the dial, a door in the trunk."] },
  { id: "fireplace", label: "Georgian fireplace", kind: "fixture", region: "Britain", period: "18th century", w: 1.8, d: 0.35, h: 1.3, materials: ["marble or carved pine surround", "iron grate"], notes: ["A mantelshelf about 1.3 m up over a framed opening with a fire basket."] },
  { id: "tiled-stove", label: "Tiled stove (Kachelofen)", kind: "fixture", region: "Austria, Germany, Scandinavia", period: "17th–19th century", w: 1.2, d: 0.8, h: 2.2, materials: ["glazed ceramic tiles"], notes: ["A tall stove of glazed tiles that stores the fire's heat; a bench often runs round it."] },
  { id: "folding-screen", label: "Folding screen", kind: "fixture", region: "China and Japan", period: "traditional", w: 2.4, d: 0.6, h: 1.7, materials: ["lacquered frames", "painted panels"], notes: ["Panels zigzag to stand; they divide a room and show painting."] },
  { id: "church-chair", label: "Rush-seated church chair", kind: "seat", region: "France", period: "19th century onward", w: 0.44, d: 0.46, h: 0.9, seat: 0.42, materials: ["beech or oak", "woven rush seat"], notes: ["French cathedrals seat their congregations on rows of light rush-seated chairs rather than fixed pews.", "A narrow ledge on the back rail holds the next row's books; the rush is wound from the corners, so four triangles meet on the diagonals."] },
  { id: "pew", label: "Carved oak pew", kind: "seat", region: "England", period: "15th century; Gothic Revival", w: 3.0, d: 0.75, h: 1.15, seat: 0.43, materials: ["oak", "velvet hassocks"], notes: ["Thick bench ends carved with blind tracery and topped by a poppyhead finial.", "Each back carries a book ledge for the row behind and a kneeler rail at its foot; rows sit about 0.9–1.0 m apart."], source: "Church furnishing guides: seat about 43–46 cm, row pitch 36–40 in" },
  { id: "pulpit", label: "Gothic pulpit with sounding board", kind: "fixture", region: "England and Northern Europe", period: "15th–19th century", w: 2.6, d: 1.6, h: 4.9, materials: ["oak", "stone stem", "velvet"], notes: ["An octagonal tub raised about 1.4 m on a stem, so the preacher is seen and heard down the nave; panels of blind tracery.", "A stair with a handrail climbs to it; above hangs the tester (sounding board), which throws the voice down to the congregation."] },
  { id: "altar-reredos", label: "High altar and gilded reredos", kind: "fixture", region: "Western Europe", period: "Late Gothic; Gothic Revival", w: 4.6, d: 2.7, h: 6.0, materials: ["stone mensa", "velvet frontal with gold orphreys", "gilded and painted oak"], notes: ["The altar stands on three steps; its top about 1 m above the footpace, dressed in linen with a frontal below.", "Six candles and a cross stand on the gradine; behind rises the reredos of niches with painted saints under crocketed canopies and pinnacles."], source: "Altar height about 39–41 in (99–104 cm) above the footpace, liturgical furnishing guides" },
  { id: "font", label: "Octagonal stone font", kind: "fixture", region: "England and Northern Europe", period: "12th–15th century", w: 1.24, d: 1.24, h: 2.25, materials: ["limestone", "oak cover"], notes: ["Eight sides for the eighth day (the resurrection): a bowl about 1 m up on a stem and step, carved with quatrefoils.", "A locked oak cover, often a spire of crockets, keeps the blessed water."] },
  { id: "eagle-lectern", label: "Brass eagle lectern", kind: "fixture", region: "England and the Low Countries", period: "15th century; Victorian", w: 0.75, d: 0.6, h: 1.6, materials: ["cast brass"], notes: ["The eagle (St John's emblem) carries the Bible on its spread wings above a globe and a turned column on lion feet.", "The book desk sits about 1.4 m up, for a standing reader."] },
  { id: "corona", label: "Corona (crown chandelier)", kind: "light", region: "Germany and Northern Europe", period: "11th–12th century", w: 2.4, d: 2.4, h: 3.2, materials: ["gilded copper or brass", "candles", "iron chains"], notes: ["A great ring of candles hung on chains, its rim set with gate towers: the walls of the heavenly Jerusalem.", "Romanesque wheels at Hildesheim and Aachen are 4–6 m across; parish coronae about 1–2.5 m."] },
  { id: "votive-stand", label: "Votive candle stand", kind: "light", region: "Catholic and Orthodox churches", period: "traditional", w: 1.2, d: 0.55, h: 1.12, materials: ["black iron", "glass cups", "wax"], notes: ["Tiers of small candles in coloured glass cups, some lit, some spent, a box for offerings below."] },
  { id: "andon", label: "Andon paper lantern", kind: "light", region: "Japan", period: "Edo (1603–1868)", w: 0.34, d: 0.34, h: 1.0, materials: ["wood frame", "washi paper", "oil dish"], notes: ["A wooden frame papered with washi round a dish of oil and a rush wick; one side lifts to light it.", "It stands on the tatami beside the sitter, at the height of a kneeling person's shoulder."] },
  { id: "hibachi", label: "Hibachi with tetsubin", kind: "fixture", region: "Japan", period: "Edo–Shōwa", w: 0.5, d: 0.5, h: 0.52, materials: ["zelkova wood", "copper liner", "ash and charcoal", "cast-iron kettle"], notes: ["A wooden brazier lined with copper, filled with ash on which a few pieces of charcoal glow under a trivet.", "The tetsubin's body is cast with rows of hailstone bosses (arare)."] },
  { id: "kotatsu", label: "Kotatsu", kind: "table", region: "Japan", period: "Edo onward", w: 1.5, d: 1.5, h: 0.42, materials: ["wood frame", "quilted futon", "lacquered top"], notes: ["A low table frame over a heater, a thick quilt over it falling to the floor, the top board laid on the quilt.", "Winter's centre of the house: legs under the quilt, a basket of mikan on top."] },
  { id: "zataku", label: "Zataku low table", kind: "table", region: "Japan", period: "Meiji onward", w: 1.2, d: 0.75, h: 0.33, materials: ["lacquered wood"], notes: ["A low rectangular table for a tatami room, its top about 33 cm up, at which guests sit on zabuton."] },
  { id: "byobu", label: "Gold folding screen (byōbu)", kind: "fixture", region: "Japan", period: "Momoyama–Edo", w: 3.4, d: 0.6, h: 1.72, materials: ["gold leaf on paper", "mineral pigments", "lacquered frame"], notes: ["Six panels joined by paper hinges so one picture runs across all of them; it stands in a zigzag.", "Gold leaf laid in squares about 11 cm across, painted over in malachite, azurite and ink: pines, hills, water and bands of gold cloud."] },
  { id: "platform-sofa", label: "Japandi platform sofa", kind: "seat", region: "Japan and Scandinavia", period: "2010s–2020s", w: 2.2, d: 0.9, h: 0.78, seat: 0.42, materials: ["solid oak", "linen"], notes: ["A low oak platform with deep linen cushions: the Japandi taste for low, quiet, natural pieces.", "Muted colours and visible wood; a throw folded on one end."] },
  { id: "round-coffee-table", label: "Oak drum coffee table", kind: "table", region: "Scandinavia and Japan", period: "2010s–2020s", w: 1.0, d: 1.0, h: 0.36, materials: ["solid oak", "stoneware"], notes: ["A thick round top on a drum base, low beside a low sofa; a handmade bowl and a couple of books."] },
  { id: "paper-pendant", label: "Paper globe pendant", kind: "light", region: "Japan (Gifu lantern tradition)", period: "20th century onward", w: 0.6, d: 0.6, h: 2.0, materials: ["washi paper", "bamboo ribs"], notes: ["Washi stretched over a bamboo spiral; the paper diffuses a bulb into a soft glowing ball."] },
  { id: "wing-chair", label: "Leather wing chair", kind: "seat", region: "England", period: "18th century onward", w: 0.8, d: 0.8, h: 1.18, seat: 0.48, materials: ["deep-buttoned leather", "oak", "brass castors"], notes: ["Wings at head height kept draughts off a sitter by the fire; arms roll outward; front legs turned on castors."] },
  { id: "bankers-lamp", label: "Banker's desk lamp", kind: "light", region: "United States and Britain", period: "1900s onward", w: 0.36, d: 0.2, h: 0.42, materials: ["brass", "cased green glass"], notes: ["A tube of green glass over a white lining throws light down on the desk and hides the bulb."] },
  { id: "globe", label: "Library globe", kind: "fixture", region: "Europe", period: "18th–19th century", w: 0.62, d: 0.62, h: 1.18, materials: ["turned wood", "printed paper gores", "brass meridian"], notes: ["A terrestrial globe in a brass meridian ring on a three-legged turned stand, the horizon ring at table height."] },
  { id: "range-cooker", label: "Enamelled range cooker", kind: "fixture", region: "Britain", period: "1920s onward", w: 1.04, d: 0.68, h: 1.22, materials: ["cast iron", "vitreous enamel", "chrome"], notes: ["A heavy range kept always warm: oven doors in cream enamel, chrome lids over the hotplates, a towel rail.", "It stands in the old inglenook under the bressumer beam."] },
  { id: "butler-sink", label: "Belfast sink", kind: "fixture", region: "Britain and Ireland", period: "19th century onward", w: 1.5, d: 0.55, h: 1.18, materials: ["glazed fireclay", "oak drainer", "brass tap"], notes: ["A deep fireclay sink with an overflow weir, on brick piers, beside a grooved oak draining board."] },
  { id: "potted-olive", label: "Olive tree in a pot", kind: "fixture", region: "Mediterranean", period: "contemporary interiors", w: 0.6, d: 0.6, h: 1.75, materials: ["terracotta", "olive"], notes: ["A twisting grey trunk and silver-green leaves; a favourite living sculpture in calm, natural rooms."] },
];

/** What a room of each period and place is made of. */
export const INTERIOR_STYLES: readonly { id: string; label: string; region: string; period: string; walls: string; floor: string; ceiling: string; light: string; pieces: readonly string[]; notes: string }[] = [
  { id: "tudor-hall", label: "Tudor hall", region: "England", period: "16th century", walls: "oak panelling, limewashed plaster above", floor: "stone flags with rush matting", ceiling: "exposed oak beams", light: "a great hearth, candles, leaded windows", pieces: ["refectory-table", "settle", "blanket-chest"], notes: "Dark panelling and a big fire; the table is the room." },
  { id: "georgian-drawing-room", label: "Georgian drawing room", region: "Britain", period: "1714–1830", walls: "painted panels in pale green or grey, a dado rail", floor: "boards with a carpet", ceiling: "plaster cornice", light: "tall sash windows with shutters, a chandelier", pieces: ["fireplace", "chippendale-chair", "chandelier", "longcase-clock"], notes: "Symmetry: the fireplace centred, chairs against the walls." },
  { id: "victorian-parlour", label: "Victorian parlour", region: "Britain", period: "1837–1901", walls: "patterned wallpaper, a picture rail", floor: "a patterned carpet over boards", ceiling: "a ceiling rose", light: "gas or oil lamps, heavy curtains", pieces: ["chesterfield", "pedestal-desk", "tiffany-lamp", "bookcase"], notes: "Crowded with things: pictures, ornaments, plants." },
  { id: "shaker-room", label: "Shaker room", region: "United States", period: "19th century", walls: "plain white plaster, a peg rail", floor: "scrubbed pine boards", ceiling: "plain", light: "large windows", pieces: ["ladder-back", "gateleg-table"], notes: "Chairs hang on the peg rail when the floor is swept." },
  { id: "alpine-stube", label: "Alpine Stube", region: "Austria and Bavaria", period: "18th–19th century", walls: "pine panelling", floor: "boards", ceiling: "panelled wood", light: "small windows, the stove", pieces: ["tiled-stove", "settle", "refectory-table"], notes: "A wood-lined room round the tiled stove, a corner bench under the shrine." },
  { id: "art-deco-lounge", label: "Art Deco lounge", region: "France and United States", period: "1920s–30s", walls: "lacquer, mirror, sunburst veneer", floor: "parquet in patterns", ceiling: "stepped coves with hidden light", light: "frosted glass uplighters", pieces: ["wassily-chair", "sideboard"], notes: "Geometry and shine: chrome, glass, exotic veneers." },
  { id: "mid-century-living", label: "Mid-century living room", region: "Scandinavia and United States", period: "1950s–60s", walls: "white walls, a teak feature wall", floor: "oak with a wool rug", ceiling: "plain", light: "large windows, pendant lamps", pieces: ["lounge-chair", "sideboard"], notes: "Low furniture on thin legs, light and open." },
  { id: "washitsu", label: "Japanese washitsu", region: "Japan", period: "Edo onward", walls: "earth plaster, shoji and fusuma", floor: "tatami mats", ceiling: "wooden boards", light: "diffused through shoji paper", pieces: ["chabudai", "floor-cushions", "tansu", "futon"], notes: "Sized in mats; a tokonoma alcove holds a scroll and flowers; the room changes use through the day." },
  { id: "scholar-studio", label: "Chinese scholar's studio", region: "China", period: "Ming and Qing", walls: "white plaster, lattice windows", floor: "grey brick or stone", ceiling: "timber", light: "lattice windows onto a garden", pieces: ["official-hat-chair", "ming-horseshoe", "altar-table", "round-corner-cabinet", "folding-screen"], notes: "Few pieces of fine hardwood, a desk at the window, scrolls and a stone." },
  { id: "moroccan-salon", label: "Moroccan salon", region: "Morocco", period: "18th–20th century", walls: "zellige dado, carved plaster, painted cedar", floor: "tiles and rugs", ceiling: "painted cedar", light: "pierced brass lanterns", pieces: ["floor-cushions"], notes: "Long low banquettes round the walls, a low table, lanterns." },
];

/** The checks a drawing of a room or piece should pass. */
export function checkFurniture(t: FurnitureType): { label: string; ok: boolean; note: string }[] {
  const out: { label: string; ok: boolean; note: string }[] = [];
  if (t.kind === "seat" && t.seat !== undefined && t.seat > 0.3) out.push({ label: "Seat height", ok: t.seat >= 0.38 && t.seat <= 0.52, note: `${Math.round(t.seat * 100)} cm (dining 42–48 cm, lounge from 38 cm, Ming chairs about 50 cm with a footrest)` });
  if (t.kind === "table" && t.h > 0.5) out.push({ label: "Table height", ok: t.h >= 0.7 && t.h <= 0.92, note: `${Math.round(t.h * 100)} cm (dining 72–76 cm; altar tables higher)` });
  if (t.kind === "storage" && t.id === "bookcase") out.push({ label: "Shelf depth", ok: t.d >= 0.22 && t.d <= 0.4, note: `${Math.round(t.d * 100)} cm` });
  return out;
}
export const findFurnitureType = (id: string) => FURNITURE_TYPES.find(t => t.id === id);
