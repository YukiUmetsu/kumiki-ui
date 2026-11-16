/**
 * COSTUME1 data: what people wore, everywhere and at every time, as records you find by tags rather than by period
 * alone. Each garment carries facets you can combine:
 * - where: a UN M49 region (hierarchical), ISO 3166 countries and cultures;
 * - when: a year range and named eras;
 * - who: worn by women, men or all; the wearer's role;
 * - what for: occasions;
 * - where on the body and how it is cut and made: slot, cut, fabrics;
 * - climate.
 * Outfits put garments together for a person in a place and time; `costume-query.ts` finds them by any mix of tags.
 *
 * Descriptions and dates are reported from the Wikipedia article named on each record (summaries fetched on
 * 2026-11-16) where the article states them; otherwise the period is estimated and marked so. Regions follow the UN
 * Statistics Division's M49 standard; countries ISO 3166-1 alpha-2.
 */
import type { Grade } from "../anatomy/foundation-shapes";

// ---- Regions (UN M49) -------------------------------------------------------------------------------------------------

export interface Region { id: string; name: string; parent?: string }
/** UN M49 regions and sub-regions (reported: UN Statistics Division, Standard country or area codes, M49). */
export const REGIONS: readonly Region[] = [
  { id: "world", name: "World" },
  { id: "africa", name: "Africa", parent: "world" }, { id: "northern-africa", name: "Northern Africa", parent: "africa" }, { id: "sub-saharan-africa", name: "Sub-Saharan Africa", parent: "africa" },
  { id: "eastern-africa", name: "Eastern Africa", parent: "sub-saharan-africa" }, { id: "middle-africa", name: "Middle Africa", parent: "sub-saharan-africa" }, { id: "southern-africa", name: "Southern Africa", parent: "sub-saharan-africa" }, { id: "western-africa", name: "Western Africa", parent: "sub-saharan-africa" },
  { id: "americas", name: "Americas", parent: "world" }, { id: "northern-america", name: "Northern America", parent: "americas" }, { id: "latin-america", name: "Latin America and the Caribbean", parent: "americas" },
  { id: "caribbean", name: "Caribbean", parent: "latin-america" }, { id: "central-america", name: "Central America", parent: "latin-america" }, { id: "south-america", name: "South America", parent: "latin-america" },
  { id: "asia", name: "Asia", parent: "world" }, { id: "central-asia", name: "Central Asia", parent: "asia" }, { id: "eastern-asia", name: "Eastern Asia", parent: "asia" }, { id: "south-eastern-asia", name: "South-eastern Asia", parent: "asia" },
  { id: "southern-asia", name: "Southern Asia", parent: "asia" }, { id: "western-asia", name: "Western Asia", parent: "asia" },
  { id: "europe", name: "Europe", parent: "world" }, { id: "eastern-europe", name: "Eastern Europe", parent: "europe" }, { id: "northern-europe", name: "Northern Europe", parent: "europe" }, { id: "southern-europe", name: "Southern Europe", parent: "europe" }, { id: "western-europe", name: "Western Europe", parent: "europe" },
  { id: "oceania", name: "Oceania", parent: "world" }, { id: "australia-new-zealand", name: "Australia and New Zealand", parent: "oceania" }, { id: "melanesia", name: "Melanesia", parent: "oceania" }, { id: "micronesia", name: "Micronesia", parent: "oceania" }, { id: "polynesia", name: "Polynesia", parent: "oceania" },
];

// ---- Eras -------------------------------------------------------------------------------------------------------------

export interface Era { id: string; name: string; region: string; country?: string; from: number; to: number }
/** Named periods by place, years CE (negative BCE) (reported: Wikipedia articles on each period). */
export const ERAS: readonly Era[] = [
  { id: "heian", name: "Heian", region: "eastern-asia", country: "JP", from: 794, to: 1185 }, { id: "kamakura", name: "Kamakura", region: "eastern-asia", country: "JP", from: 1185, to: 1333 },
  { id: "muromachi", name: "Muromachi", region: "eastern-asia", country: "JP", from: 1336, to: 1573 }, { id: "azuchi-momoyama", name: "Azuchi–Momoyama", region: "eastern-asia", country: "JP", from: 1573, to: 1603 },
  { id: "edo", name: "Edo", region: "eastern-asia", country: "JP", from: 1603, to: 1868 }, { id: "meiji", name: "Meiji", region: "eastern-asia", country: "JP", from: 1868, to: 1912 },
  { id: "tang", name: "Tang", region: "eastern-asia", country: "CN", from: 618, to: 907 }, { id: "song", name: "Song", region: "eastern-asia", country: "CN", from: 960, to: 1279 },
  { id: "ming", name: "Ming", region: "eastern-asia", country: "CN", from: 1368, to: 1644 }, { id: "qing", name: "Qing", region: "eastern-asia", country: "CN", from: 1644, to: 1912 },
  { id: "republic-of-china", name: "Republic of China (mainland)", region: "eastern-asia", country: "CN", from: 1912, to: 1949 },
  { id: "joseon", name: "Joseon", region: "eastern-asia", country: "KR", from: 1392, to: 1897 },
  { id: "ancient-greece", name: "Ancient Greece", region: "southern-europe", country: "GR", from: -800, to: -31 }, { id: "ancient-rome", name: "Ancient Rome", region: "southern-europe", country: "IT", from: -753, to: 476 },
  { id: "middle-ages", name: "Middle Ages (Europe)", region: "europe", from: 500, to: 1500 }, { id: "renaissance", name: "Renaissance (Europe)", region: "europe", from: 1400, to: 1600 },
  { id: "baroque", name: "Baroque (Europe)", region: "europe", from: 1600, to: 1750 }, { id: "georgian", name: "Georgian (Britain)", region: "northern-europe", country: "GB", from: 1714, to: 1837 },
  { id: "victorian", name: "Victorian (Britain)", region: "northern-europe", country: "GB", from: 1837, to: 1901 }, { id: "edwardian", name: "Edwardian (Britain)", region: "northern-europe", country: "GB", from: 1901, to: 1910 },
];

// ---- Tags -------------------------------------------------------------------------------------------------------------

export type WornBy = "women" | "men" | "all";
export type Slot = "full" | "upper" | "lower" | "outer" | "waist" | "head" | "feet" | "under" | "draped" | "accessory";
export type Cut = "wrapped" | "draped" | "straight-cut" | "tailored" | "tunic" | "tube" | "cloak" | "structure" | "woven-strip" | "shoe";
export type Occasion = "everyday" | "formal" | "ceremonial" | "court" | "wedding" | "festival" | "work" | "religious" | "military" | "bath";
export type Role = "court" | "nobility" | "warrior" | "scholar" | "clergy" | "commoner" | "farmer" | "merchant" | "labourer" | "hunter" | "herder" | "royalty" | "professional";
export type Climate = "hot" | "arid" | "temperate" | "cold";

export interface GarmentRecord {
  id: string; name: string; local?: string;
  region: string; countries: readonly string[]; cultures?: readonly string[];
  /** Years worn, CE (negative BCE); `to` null while still worn. */
  period: { from: number; to: number | null; grade: Grade; note?: string };
  eras?: readonly string[];
  wornBy: WornBy; roles?: readonly Role[]; occasions: readonly Occasion[];
  slot: Slot; cut: Cut; fabrics?: readonly string[]; climate?: readonly Climate[];
  /** What it is, from its article; how to draw it. */
  description: string; drawing: readonly string[];
  source: string;
  /** Where it is already drawn in this library, by style. */
  styles?: readonly { style: string; pack: string; id: string }[];
  /** Free extra tags (pattern names, dyes, alternative names). */
  tags?: readonly string[];
}

const W = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const rep = (from: number, to: number | null, note?: string) => ({ from, to, grade: "reported" as const, note });
const est = (from: number, to: number | null, note?: string) => ({ from, to, grade: "estimated" as const, note });
const UKIYO = (id: string) => [{ style: "ukiyo-e", pack: "ukiyoe-handscroll", id }];

export const GARMENTS: readonly GarmentRecord[] = [
  // Japan
  { id: "kimono", name: "Kimono", local: "着物", region: "eastern-asia", countries: ["JP"], period: est(1603, null, "the kosode became today's kimono through the Edo period"), eras: ["edo", "meiji"], wornBy: "all", occasions: ["everyday", "formal", "festival", "wedding"], slot: "full", cut: "straight-cut", fabrics: ["silk", "cotton", "hemp", "wool"],
    description: "A wrapped-front garment with square sleeves and a rectangular body, worn left side over right (unless the wearer is deceased), with a broad sash (obi), usually with zōri sandals and tabi socks.", drawing: ["Always left over right as seen by the wearer: the right-hand panel lies under.", "Straight panels: folds fall vertically; the obi makes a firm horizontal band."], source: W("Kimono"), styles: UKIYO("ukiyoeWardrobe(any role)") },
  { id: "kosode", name: "Kosode", local: "小袖", region: "eastern-asia", countries: ["JP"], period: est(1336, 1868, "outerwear from the Muromachi period; predecessor of the kimono"), eras: ["muromachi", "azuchi-momoyama", "edo"], wornBy: "all", occasions: ["everyday", "formal"], slot: "full", cut: "straight-cut", fabrics: ["silk", "cotton", "hemp"],
    description: "A short-sleeved garment, the direct predecessor of the kimono: a wider body, a longer collar and narrower sleeves sewn to the body, often with heavily rounded outer edges.", drawing: ["Wider through the body than a modern kimono; sleeves narrow at the wrist and rounded at the outer corner."], source: W("Kosode"), styles: UKIYO("ukiyoeWardrobe(any role)") },
  { id: "furisode", name: "Furisode", local: "振袖", region: "eastern-asia", countries: ["JP"], period: est(1603, null), eras: ["edo"], wornBy: "women", roles: ["commoner", "nobility"], occasions: ["formal", "festival"], slot: "full", cut: "straight-cut", fabrics: ["silk"],
    description: "The most formal kimono for young unmarried women, told by its long sleeves: 85 cm (kofurisode) to 114 cm (ōfurisode).", drawing: ["Sleeves hang to the knees or below and swing with the walk."], source: W("Furisode"), styles: UKIYO("ukiyoeWardrobe(maiden)") },
  { id: "junihitoe", name: "Jūnihitoe", local: "十二単", region: "eastern-asia", countries: ["JP"], period: rep(794, null, "first worn in the Heian period; still worn at imperial ceremonies"), eras: ["heian"], wornBy: "women", roles: ["court", "nobility"], occasions: ["court", "ceremonial", "wedding"], slot: "full", cut: "straight-cut", fabrics: ["silk"],
    description: "Formal court dress of noble women and ladies-in-waiting: many kimono-like robes layered, the outer robes cut larger and thinner to show the layers beneath.", drawing: ["Colour lies in the stacked edges at collar, sleeve and hem (kasane no irome).", "A huge, heavy silhouette that pools on the floor; long loose hair."], source: W("Jūnihitoe"), styles: UKIYO("ukiyoe-heian") },
  { id: "sokutai", name: "Sokutai", local: "束帯", region: "eastern-asia", countries: ["JP"], period: rep(794, null, "from the Heian period onward"), eras: ["heian"], wornBy: "men", roles: ["court", "nobility", "royalty"], occasions: ["court", "ceremonial"], slot: "full", cut: "straight-cut", fabrics: ["silk"],
    description: "Full formal attire of men at the imperial court from the Heian period: the emperor, the imperial family and court nobles, and higher-ranked warriors on great occasions.", drawing: ["A wide outer robe with a long train behind; a flat baton (shaku) held in front; a black lacquered cap (kanmuri)."], source: W("Sokutai") },
  { id: "kariginu", name: "Kariginu", local: "狩衣", region: "eastern-asia", countries: ["JP"], period: rep(794, null, "Heian hunting robe; a white one (jōe) is still worn at religious rites"), eras: ["heian"], wornBy: "men", roles: ["nobility", "clergy"], occasions: ["everyday", "religious"], slot: "outer", cut: "straight-cut", fabrics: ["silk", "hemp"],
    description: "The hunting robe of Heian nobles; worn white as the jōe by people at Buddhist and Shinto ceremonies.", drawing: ["Sleeves joined only at the back of the shoulder, open at the front, with a cord through the cuffs; a tall black cap (eboshi)."], source: W("Jōe") },
  { id: "hakama", name: "Hakama", local: "袴", region: "eastern-asia", countries: ["JP"], period: est(794, null), wornBy: "all", roles: ["warrior", "court", "clergy", "scholar"], occasions: ["formal", "ceremonial", "religious"], slot: "lower", cut: "straight-cut", fabrics: ["silk", "cotton", "hemp"],
    description: "Traditional Japanese clothing for the lower body.", drawing: ["Deep knife pleats from the waist; divided or skirt-like; ties wrapped round the waist over the kimono."], source: W("Hakama"), styles: UKIYO("ukiyoeWardrobe(samurai)") },
  { id: "kamishimo", name: "Kamishimo", local: "裃", region: "eastern-asia", countries: ["JP"], period: est(1573, 1868, "samurai formal wear of the Edo period"), eras: ["edo"], wornBy: "men", roles: ["warrior"], occasions: ["formal", "ceremonial"], slot: "upper", cut: "straight-cut", fabrics: ["hemp", "silk"],
    description: "A sleeveless vest (kataginu) with stiffened, winged shoulders worn over a kimono with matching hakama (described under Hakama).", drawing: ["Broad stiff shoulders that stand out like wings; the same pattern on vest and hakama."], source: W("Hakama") },
  { id: "haori", name: "Haori", local: "羽織", region: "eastern-asia", countries: ["JP"], period: est(1573, null), wornBy: "all", occasions: ["everyday", "formal"], slot: "outer", cut: "straight-cut", fabrics: ["silk", "cotton"],
    description: "A jacket worn over a kimono: like a shortened kimono with no overlapping front panels, a thinner collar, triangular gussets at the side seams, tied at the front with two short cords.", drawing: ["Hangs open in front, to the hip or thigh; the cords tie a small knot at the chest."], source: W("Haori") },
  { id: "obi", name: "Obi", local: "帯", region: "eastern-asia", countries: ["JP"], period: est(794, null, "a thin sash in the Heian period that grew in width and in ways of tying"), wornBy: "all", occasions: ["everyday", "formal", "festival"], slot: "waist", cut: "wrapped", fabrics: ["silk", "cotton"],
    description: "A sash worn with traditional Japanese clothing and martial-arts uniforms; a simple thin sash in the Heian period that developed many sizes, lengths and knots.", drawing: ["Women's obi wide and knotted at the back; men's narrow and low on the hips."], source: W("Obi_(sash)"), styles: UKIYO("ukiyoeWardrobe(any role)") },
  { id: "yukata", name: "Yukata", local: "浴衣", region: "eastern-asia", countries: ["JP"], period: est(1603, null), wornBy: "all", occasions: ["everyday", "festival", "bath"], slot: "full", cut: "straight-cut", fabrics: ["cotton", "linen"], climate: ["hot"],
    description: "An unlined cotton or linen summer kimono for casual wear, festivals and bathhouses; traditionally indigo and white.", drawing: ["Light cloth that clings and creases; indigo and white patterns."], source: W("Yukata") },
  { id: "geta", name: "Geta", local: "下駄", region: "eastern-asia", countries: ["JP"], period: est(794, null), wornBy: "all", occasions: ["everyday", "festival"], slot: "feet", cut: "shoe", fabrics: ["wood"],
    description: "Wooden sandals with a fabric thong, raised on up to three 'teeth'.", drawing: ["A flat board raised on two teeth; the thong between the first two toes."], source: W("Geta_(footwear)"), styles: UKIYO("ukiyoeWardrobe(any role)") },
  { id: "waraji", name: "Waraji", local: "草鞋", region: "eastern-asia", countries: ["JP"], period: est(794, 1912), wornBy: "all", roles: ["commoner", "farmer", "labourer", "warrior"], occasions: ["everyday", "work"], slot: "feet", cut: "shoe", fabrics: ["straw"],
    description: "Light tie-on sandals of rope fibres, the standard footwear of common people in Japan.", drawing: ["Straw soles tied with cords round the ankle."], source: W("Waraji"), styles: UKIYO("ukiyoeWardrobe(laborer)") },
  { id: "tabi", name: "Tabi", local: "足袋", region: "eastern-asia", countries: ["JP"], period: rep(1400, null, "dating back to the 15th century"), wornBy: "all", occasions: ["everyday", "formal"], slot: "feet", cut: "tailored", fabrics: ["cotton"],
    description: "Socks with a separate big toe, worn with thonged footwear such as zōri.", drawing: ["White, split between the big toe and the rest."], source: W("Tabi") },
  { id: "kasa", name: "Kasa (straw hat)", local: "笠", region: "eastern-asia", countries: ["JP"], period: est(794, null), wornBy: "all", roles: ["farmer", "clergy", "warrior", "commoner"], occasions: ["work", "everyday"], slot: "head", cut: "structure", fabrics: ["straw", "bamboo"],
    description: "Any of several traditional Japanese hats, among them the amigasa and jingasa.", drawing: ["A wide shallow cone that hides the eyes; tied under the chin."], source: W("Kasa_(hat)") },
  // China, Korea, Mongolia
  { id: "hanfu", name: "Hanfu", local: "漢服", region: "eastern-asia", countries: ["CN"], cultures: ["han-chinese"], period: rep(-2000, 1644, "from at least the 2nd millennium BC to the mid-17th century"), eras: ["tang", "song", "ming"], wornBy: "all", occasions: ["everyday", "formal", "court"], slot: "full", cut: "wrapped", fabrics: ["silk", "hemp"],
    description: "The historical clothing of the Han Chinese from at least the 2nd millennium BC to the end of the Ming dynasty, replaced under the Qing by Manchu dress.", drawing: ["A crossed collar closing right over left (the y-shaped collar); wide flowing sleeves."], source: W("Hanfu") },
  { id: "shenyi", name: "Shenyi", local: "深衣", region: "eastern-asia", countries: ["CN"], cultures: ["han-chinese"], period: est(-500, 1644), wornBy: "all", roles: ["scholar"], occasions: ["formal", "ceremonial"], slot: "full", cut: "wrapped", fabrics: ["silk", "hemp"],
    description: "A Hanfu robe with obliquely straight, overlapping collars, fastened with a belt; it wraps the body completely; worn by Confucian scholars as academic dress.", drawing: ["One long robe, upper and lower parts sewn together; dark edging on collar and hem."], source: W("Shenyi") },
  { id: "ruqun", name: "Ruqun", local: "襦裙", region: "eastern-asia", countries: ["CN"], cultures: ["han-chinese"], period: est(-200, 1644), eras: ["tang", "song", "ming"], wornBy: "women", occasions: ["everyday", "formal"], slot: "full", cut: "wrapped", fabrics: ["silk"],
    description: "A short jacket (ru) worn with a long wrap-around skirt (qun).", drawing: ["In the Tang the skirt rose high under the bust; a long shawl (pibo) over the arms."], source: W("Ruqun") },
  { id: "changshan", name: "Changshan", local: "長衫", region: "eastern-asia", countries: ["CN"], period: est(1644, null, "derived from Qing dress"), eras: ["qing", "republic-of-china"], wornBy: "men", occasions: ["everyday", "formal"], slot: "full", cut: "tailored", fabrics: ["silk", "cotton"],
    description: "A Chinese robe derived from the Qing dynasty dress of Manchu men, adapted by the Han Chinese.", drawing: ["A standing collar and a side closure from the neck to the right armpit; long, straight to the ankles."], source: W("Changshan") },
  { id: "cheongsam", name: "Qipao (cheongsam)", local: "旗袍", region: "eastern-asia", countries: ["CN"], period: est(1920, null, "the modern qipao from the 1920s"), eras: ["republic-of-china"], wornBy: "women", occasions: ["everyday", "formal"], slot: "full", cut: "tailored", fabrics: ["silk"],
    description: "A Western-influenced Chinese dress after Manchu qizhuang: long and figure-fitting, with a standing collar, an asymmetric left-over-right opening, two side slits and frog fasteners.", drawing: ["Close to the body; the opening curves from the collar to the right armpit; slits at the sides."], source: W("Cheongsam") },
  { id: "zhongshan-suit", name: "Zhongshan suit", local: "中山裝", region: "eastern-asia", countries: ["CN"], period: rep(1912, null, "introduced shortly after the founding of the Republic of China"), eras: ["republic-of-china"], wornBy: "men", occasions: ["formal", "everyday"], slot: "full", cut: "tailored", fabrics: ["wool", "cotton"],
    description: "A tunic suit named after Sun Yat-sen, a national dress with political meaning; its four pockets said to stand for four virtues.", drawing: ["A closed turn-down collar, five buttons, four patch pockets."], source: W("Zhongshan_suit") },
  { id: "hanbok", name: "Hanbok", local: "한복", region: "eastern-asia", countries: ["KR", "KP"], cultures: ["korean"], period: est(-57, null), eras: ["joseon"], wornBy: "all", occasions: ["everyday", "formal", "festival", "wedding"], slot: "full", cut: "tailored", fabrics: ["silk", "cotton", "ramie"],
    description: "The traditional clothing of the Korean people.", drawing: ["Women: a short jacket over a full high-waisted skirt; men: jacket, wide trousers and an overcoat."], source: W("Hanbok") },
  { id: "jeogori", name: "Jeogori", local: "저고리", region: "eastern-asia", countries: ["KR", "KP"], cultures: ["korean"], period: est(-57, null), eras: ["joseon"], wornBy: "all", occasions: ["everyday", "formal"], slot: "upper", cut: "tailored", fabrics: ["silk", "cotton"],
    description: "The basic upper garment of the hanbok, worn by men with baji trousers and by women with a chima skirt.", drawing: ["Women's jeogori grew very short in the later Joseon; a long bow (goreum) ties at the chest."], source: W("Jeogori") },
  { id: "chima", name: "Chima", local: "치마", region: "eastern-asia", countries: ["KR", "KP"], cultures: ["korean"], period: est(-57, null), eras: ["joseon"], wornBy: "women", occasions: ["everyday", "formal"], slot: "lower", cut: "wrapped", fabrics: ["silk", "cotton"],
    description: "The skirt worn with the jeogori; it has changed little over time.", drawing: ["Wrapped high under the bust, it falls in a full bell to the floor."], source: W("Chima_(clothing)") },
  { id: "durumagi", name: "Durumagi", local: "두루마기", region: "eastern-asia", countries: ["KR", "KP"], cultures: ["korean"], period: est(1392, null), eras: ["joseon"], wornBy: "all", occasions: ["everyday", "formal"], slot: "outer", cut: "tailored", fabrics: ["silk", "cotton"],
    description: "An overcoat (po), the outermost layer over the jeogori and baji.", drawing: ["Calf length, closed, with the same long chest tie."], source: W("Durumagi") },
  { id: "gat", name: "Gat", local: "갓", region: "eastern-asia", countries: ["KR"], cultures: ["korean"], period: rep(1392, 1897, "Joseon period"), eras: ["joseon"], wornBy: "men", roles: ["scholar", "nobility"], occasions: ["everyday", "formal"], slot: "head", cut: "structure", fabrics: ["horsehair", "bamboo"],
    description: "A traditional hat worn by men with hanbok in the Joseon period, of bamboo or horsehair on a bamboo frame, partly transparent.", drawing: ["A wide flat brim and a tall cylinder crown, see-through black; tied under the chin."], source: W("Gat_(hat)") },
  { id: "deel", name: "Deel", local: "дээл", region: "eastern-asia", countries: ["MN"], cultures: ["mongol"], period: est(1200, null), wornBy: "all", roles: ["herder"], occasions: ["everyday", "festival"], slot: "full", cut: "tailored", fabrics: ["cotton", "silk", "wool", "brocade"], climate: ["cold"],
    description: "Traditional clothing commonly worn by Mongols, of cotton, silk, wool or brocade.", drawing: ["A long robe closing to the right with a sash; long cuffs to cover the hands."], source: W("Deel_(clothing)") },
  // South and South-east Asia
  { id: "sari", name: "Sari", local: "साड़ी", region: "southern-asia", countries: ["IN", "BD", "NP", "LK", "PK"], period: est(-300, null), wornBy: "women", occasions: ["everyday", "formal", "wedding", "festival"], slot: "draped", cut: "draped", fabrics: ["cotton", "silk"], climate: ["hot"],
    description: "An unstitched length of woven cloth (4.5 to 9 yards long) draped as a dress, one end at the waist and the other over one shoulder, sometimes baring the midriff.", drawing: ["Pleats tucked at the waist fan to the feet; the end (pallu) falls over the left shoulder."], source: W("Sari") },
  { id: "dhoti", name: "Dhoti", local: "धोती", region: "southern-asia", countries: ["IN", "BD", "NP", "LK"], period: est(-300, null), wornBy: "men", occasions: ["everyday", "religious", "formal"], slot: "lower", cut: "draped", fabrics: ["cotton"], climate: ["hot"],
    description: "An ankle-length breechcloth of about 4 yards of unstitched cloth wrapped round the waist and legs like trousers.", drawing: ["Loose folds between the legs; one end tucked at the back."], source: W("Dhoti") },
  { id: "kurta", name: "Kurta", local: "कुर्ता", region: "southern-asia", countries: ["IN", "PK", "BD", "NP"], period: est(800, null, "from Central Asian tunics of the late ancient or early medieval era"), wornBy: "all", occasions: ["everyday", "formal"], slot: "upper", cut: "tunic", fabrics: ["cotton", "silk"],
    description: "A loose collarless shirt or tunic of South Asia, rooted in Central Asian nomadic tunics.", drawing: ["Knee length, side slits, worn over loose trousers."], source: W("Kurta") },
  { id: "shalwar-kameez", name: "Shalwar kameez", region: "southern-asia", countries: ["PK", "IN", "AF"], period: est(1200, null), wornBy: "all", occasions: ["everyday", "formal"], slot: "full", cut: "tailored", fabrics: ["cotton", "silk"],
    description: "A combination dress of tunic and trousers worn by men and women in South and Central Asia.", drawing: ["Baggy trousers gathered at the ankle under a long tunic; women often add a scarf (dupatta)."], source: W("Shalwar_kameez") },
  { id: "sherwani", name: "Sherwani", region: "southern-asia", countries: ["IN", "PK", "BD"], period: rep(1800, null, "evolved in the 19th century"), wornBy: "men", occasions: ["formal", "wedding"], slot: "outer", cut: "tailored", fabrics: ["silk", "wool"],
    description: "A long-sleeved, fitted outer coat falling below the knees, buttoned down the front, often with a stand-up collar.", drawing: ["Long and narrow like a frock coat, a row of buttons from the collar."], source: W("Sherwani") },
  { id: "lehenga", name: "Lehenga", region: "southern-asia", countries: ["IN", "PK"], period: est(1500, null), wornBy: "women", occasions: ["festival", "wedding", "formal"], slot: "lower", cut: "tailored", fabrics: ["silk", "cotton"],
    description: "An ankle-length skirt, embroidered; the lower part of a ghagra choli.", drawing: ["Full and flared, heavy embroidery at the hem; a short blouse (choli) and a scarf."], source: W("Lehenga") },
  { id: "ao-dai", name: "Áo dài", region: "south-eastern-asia", countries: ["VN"], period: est(1744, null), wornBy: "all", occasions: ["formal", "everyday"], slot: "full", cut: "tailored", fabrics: ["silk"],
    description: "A long split tunic over silk trousers, formalwear for men and women.", drawing: ["Fitted to the waist, then two long panels front and back over wide trousers."], source: W("Áo_dài") },
  { id: "sarong", name: "Sarong", region: "south-eastern-asia", countries: ["ID", "MY", "LK", "BN"], period: est(-500, null), wornBy: "all", occasions: ["everyday"], slot: "lower", cut: "tube", fabrics: ["cotton", "batik"], climate: ["hot"],
    description: "A large tube or length of fabric wrapped round the waist, often batik or ikat dyed, worn across South-east and South Asia, Africa and the Pacific.", drawing: ["A tube folded or knotted at the waist; straight to the ankle."], source: W("Sarong") },
  { id: "kebaya", name: "Kebaya", region: "south-eastern-asia", countries: ["ID", "MY", "SG", "BN", "TH"], period: est(1400, null), wornBy: "women", occasions: ["formal", "everyday"], slot: "upper", cut: "tailored", fabrics: ["cotton", "silk", "voile"],
    description: "An upper garment worn by women in Brunei, Indonesia, Malaysia, Singapore and southern Thailand.", drawing: ["A sheer fitted blouse with embroidered edges over a batik sarong."], source: W("Kebaya") },
  { id: "barong-tagalog", name: "Barong tagalog", region: "south-eastern-asia", countries: ["PH"], period: est(1600, null), wornBy: "men", occasions: ["formal", "wedding"], slot: "upper", cut: "tailored", fabrics: ["piña", "abacá"],
    description: "An embroidered long-sleeved formal shirt, the national dress of the Philippines, traditionally of sheer piña or abacá.", drawing: ["Sheer, worn untucked; the shirt beneath shows through."], source: W("Barong_tagalog") },
  { id: "longyi", name: "Longyi", region: "south-eastern-asia", countries: ["MM"], period: est(1800, null), wornBy: "all", occasions: ["everyday"], slot: "lower", cut: "tube", fabrics: ["cotton", "silk"], climate: ["hot"],
    description: "A sheet of cloth about 2 m by 80 cm, often sewn into a tube, worn round the waist to the feet and held by folding without a knot.", drawing: ["A neat fold-tuck at the front of the waist."], source: W("Longyi") },
  // Western Asia and North Africa
  { id: "thawb", name: "Thawb", region: "western-asia", countries: ["SA", "AE", "QA", "KW", "OM"], period: est(600, null), wornBy: "men", occasions: ["everyday", "formal"], slot: "full", cut: "tunic", fabrics: ["cotton", "wool"], climate: ["hot", "arid"],
    description: "A long-sleeved, ankle-length robe worn by men in the Arab world; the main formal attire in Saudi Arabia.", drawing: ["Straight and plain, usually white; a short collar and front placket."], source: W("Thawb") },
  { id: "keffiyeh", name: "Keffiyeh", region: "western-asia", countries: ["SA", "JO", "PS", "IQ", "SY"], period: est(600, null), wornBy: "men", occasions: ["everyday", "formal"], slot: "head", cut: "draped", fabrics: ["cotton"], climate: ["arid"],
    description: "A headdress of a square scarf, usually cotton, protecting from sun, dust and sand, often held by a cord (agal).", drawing: ["Folded in a triangle over the head, held by a black double cord."], source: W("Keffiyeh") },
  { id: "abaya", name: "Abaya", region: "western-asia", countries: ["SA", "AE", "QA", "KW"], period: est(600, null), wornBy: "women", occasions: ["everyday"], slot: "outer", cut: "cloak", fabrics: ["silk", "crepe"], climate: ["hot", "arid"],
    description: "A simple loose robe-like over-garment, traditionally black, covering the whole body except (sometimes) the head, face, feet and hands.", drawing: ["Falls straight from the shoulders or head to the ground."], source: W("Abaya") },
  { id: "djellaba", name: "Djellaba", region: "northern-africa", countries: ["MA", "DZ", "TN"], period: est(1000, null), wornBy: "all", occasions: ["everyday"], slot: "outer", cut: "tunic", fabrics: ["wool", "cotton"],
    description: "A long, loose unisex outer robe with long sleeves worn in North Africa.", drawing: ["A pointed hood (qob) hangs at the back."], source: W("Djellaba") },
  { id: "kaftan", name: "Kaftan", region: "western-asia", countries: ["TR", "IR", "MA", "RU"], period: est(-600, null), wornBy: "all", occasions: ["everyday", "formal"], slot: "full", cut: "tunic", fabrics: ["silk", "cotton", "wool"],
    description: "A robe or tunic originating in West Asia, worn by many cultures for thousands of years; in Russia, a men's long suit with tight sleeves.", drawing: ["Long and loose, often open at the front with a sash."], source: W("Kaftan") },
  { id: "chador", name: "Chador", region: "southern-asia", countries: ["IR", "AF", "PK", "AZ"], period: est(1000, null), wornBy: "women", occasions: ["everyday", "religious"], slot: "outer", cut: "cloak", fabrics: ["cotton", "rayon"],
    description: "An open cloak worn by many women in Persian-influenced countries in public spaces.", drawing: ["A half-circle of cloth over the head, held closed by hand or under the chin."], source: W("Chador") },
  // Europe
  { id: "chiton", name: "Chiton", region: "southern-europe", countries: ["GR", "IT"], cultures: ["ancient-greek", "ancient-roman"], period: est(-800, 400), eras: ["ancient-greece"], wornBy: "all", occasions: ["everyday"], slot: "full", cut: "draped", fabrics: ["linen", "wool"],
    description: "A tunic fastened at the shoulders, worn by men and women of ancient Greece and Rome, in a Doric and a later Ionic form.", drawing: ["Pinned at the shoulders, belted, falling in fine vertical folds."], source: W("Chiton_(costume)") },
  { id: "toga", name: "Toga", region: "southern-europe", countries: ["IT"], cultures: ["ancient-roman"], period: est(-753, 476), eras: ["ancient-rome"], wornBy: "men", roles: ["nobility", "professional"], occasions: ["formal", "ceremonial"], slot: "draped", cut: "draped", fabrics: ["wool"],
    description: "A roughly semicircular cloth 12–20 feet long, usually white wool, draped over the shoulders and round the body over a tunic.", drawing: ["Heavy curved folds across the chest (sinus) and over the left arm."], source: W("Toga") },
  { id: "tunic", name: "Tunic", region: "europe", countries: [], period: est(-800, 1500), eras: ["ancient-rome", "middle-ages"], wornBy: "all", occasions: ["everyday", "work"], slot: "full", cut: "tunic", fabrics: ["wool", "linen"],
    description: "A simple garment for the torso, from the shoulders to between the hips and the ankles, with or without sleeves, mostly without fastenings.", drawing: ["Belted at the waist, it blouses over the belt."], source: W("Tunic") },
  { id: "kirtle", name: "Kirtle", region: "europe", countries: ["GB", "FR", "DE"], period: est(900, 1650, "Middle Ages into the Baroque"), eras: ["middle-ages", "renaissance"], wornBy: "all", occasions: ["everyday"], slot: "full", cut: "tailored", fabrics: ["wool", "linen"],
    description: "A garment of men and women in the European Middle Ages, later a one-piece women's dress into the Baroque, worn over a chemise and under a gown.", drawing: ["Fitted bodice laced at the front or side; a long full skirt."], source: W("Kirtle") },
  { id: "houppelande", name: "Houppelande", region: "western-europe", countries: ["FR", "GB", "NL", "DE"], period: est(1360, 1450, "late Middle Ages"), eras: ["middle-ages"], wornBy: "all", roles: ["nobility", "professional"], occasions: ["formal"], slot: "outer", cut: "tailored", fabrics: ["wool", "silk", "fur"],
    description: "A late-medieval outer garment with a long full body and flaring sleeves, sometimes fur-lined; later the robe of professions (today's academic and legal gowns).", drawing: ["Huge funnel or bag sleeves; a high collar; belted folds."], source: W("Houppelande") },
  { id: "doublet", name: "Doublet", region: "western-europe", countries: ["GB", "FR", "ES", "IT", "DE"], period: est(1300, 1670), eras: ["middle-ages", "renaissance", "baroque"], wornBy: "men", roles: ["nobility", "warrior", "merchant"], occasions: ["everyday", "formal"], slot: "upper", cut: "tailored", fabrics: ["wool", "silk", "linen"],
    description: "A snug jacket shaped to a man's body; under a gown until the end of the 15th century, under a matching jerkin in the 16th.", drawing: ["Padded chest, pointed waist, worn with hose; slashes show the lining."], source: W("Doublet_(clothing)") },
  { id: "ruff", name: "Ruff", region: "western-europe", countries: ["ES", "GB", "NL", "DE", "FR"], period: rep(1550, 1650, "mid-16th to mid-17th century"), eras: ["renaissance", "baroque"], wornBy: "all", roles: ["nobility", "merchant", "clergy"], occasions: ["formal"], slot: "accessory", cut: "structure", fabrics: ["linen"],
    description: "A starched pleated collar of Western, Central and Northern Europe and Spanish America from the mid-16th to the mid-17th century; still worn by Lutheran clergy in Denmark and Germany.", drawing: ["Figure-of-eight pleats in a ring round the neck; white, crisp."], source: W("Ruff_(clothing)") },
  { id: "farthingale", name: "Farthingale", region: "southern-europe", countries: ["ES", "GB", "FR"], period: rep(1470, 1650, "originated in Spain in the 15th century; 16th–17th centuries"), eras: ["renaissance"], wornBy: "women", roles: ["nobility", "court"], occasions: ["formal", "court"], slot: "under", cut: "structure", fabrics: ["linen", "cane"],
    description: "A structure under women's skirts, especially in the 16th and 17th centuries, to hold the skirt in shape and enlarge the lower body.", drawing: ["A stiff cone (Spanish) or a drum-like wheel at the hips (French)."], source: W("Farthingale") },
  { id: "robe-a-la-francaise", name: "Robe à la française", region: "western-europe", countries: ["FR", "GB"], period: rep(1700, 1780, "18th century"), eras: ["georgian"], wornBy: "women", roles: ["nobility"], occasions: ["formal"], slot: "full", cut: "tailored", fabrics: ["silk"],
    description: "The sack-back gown of 18th-century Europe: informal at the start of the century, second only to court dress by the 1770s, with box pleats falling from the back.", drawing: ["Double box pleats from the shoulders to the floor at the back; wide hips over panniers."], source: W("Robe_à_la_française") },
  { id: "corset", name: "Corset (stays)", region: "europe", countries: ["GB", "FR", "DE"], period: est(1500, 1920), eras: ["renaissance", "georgian", "victorian"], wornBy: "women", occasions: ["everyday", "formal"], slot: "under", cut: "structure", fabrics: ["linen", "whalebone", "steel"],
    description: "A support garment with boning, a front busk and lacing, worn to shape the torso; essential in European women's fashion for centuries.", drawing: ["Changes the torso: a cone in the 18th century, an hourglass in the 19th."], source: W("Corset") },
  { id: "frock-coat", name: "Frock coat", region: "europe", countries: ["GB", "FR", "DE", "US"], period: rep(1830, 1910, "Victorian and Edwardian, 1830s–1910s"), eras: ["victorian", "edwardian"], wornBy: "men", roles: ["professional", "nobility", "merchant"], occasions: ["formal", "everyday"], slot: "outer", cut: "tailored", fabrics: ["wool"],
    description: "A formal men's coat with a knee-length skirt cut all round just above the knee, fitted, with a centre back vent.", drawing: ["Knee-length skirts all round; worn with a top hat."], source: W("Frock_coat") },
  { id: "crinoline", name: "Crinoline", region: "europe", countries: ["GB", "FR", "US", "DE"], period: est(1850, 1870, "the cage crinoline's peak"), eras: ["victorian"], wornBy: "women", occasions: ["formal", "everyday"], slot: "under", cut: "structure", fabrics: ["horsehair", "steel"],
    description: "A stiff or structured petticoat to hold out a skirt, popular from the mid-19th century.", drawing: ["A wide bell or dome from the waist to the floor; the waist looks tiny."], source: W("Crinoline") },
  { id: "bustle", name: "Bustle", region: "europe", countries: ["GB", "FR", "US", "DE"], period: est(1869, 1889, "the bustle eras of the 1870s and 1880s"), eras: ["victorian"], wornBy: "women", occasions: ["formal", "everyday"], slot: "under", cut: "structure", fabrics: ["horsehair", "steel"],
    description: "A padded undergarment or wire frame adding fullness at the back of women's dresses in the mid-to-late 19th century.", drawing: ["Flat in front, a shelf behind the waist; drapery and train over it."], source: W("Bustle") },
  { id: "dirndl", name: "Dirndl", region: "western-europe", countries: ["AT", "DE", "IT", "LI", "CH"], period: est(1870, null), wornBy: "women", occasions: ["festival", "formal"], slot: "full", cut: "tailored", fabrics: ["cotton", "linen", "silk"],
    description: "A dress of the German-speaking Alps: a close-fitting low-necked bodice, a blouse under it, a wide high-waisted skirt and an apron.", drawing: ["The apron bow on the wearer's left (by custom, unmarried) or right (married)."], source: W("Dirndl") },
  { id: "lederhosen", name: "Lederhosen", region: "western-europe", countries: ["DE", "AT", "IT", "SI"], period: est(1700, null), wornBy: "men", occasions: ["festival", "work"], slot: "lower", cut: "tailored", fabrics: ["leather"],
    description: "Traditional leather breeches of men in southern Germany, Austria, South Tyrol and Slovenia.", drawing: ["Knee or short length, with an H-shaped brace across the chest."], source: W("Lederhosen") },
  { id: "kilt", name: "Kilt", region: "northern-europe", countries: ["GB"], cultures: ["scottish-highland"], period: rep(1500, null, "the great kilt from the 16th century, the small kilt from the 18th"), wornBy: "men", occasions: ["formal", "festival", "military"], slot: "lower", cut: "wrapped", fabrics: ["wool"],
    description: "A wrap-around knee-length garment of worsted twill wool, pleated at the sides and back, traditionally tartan.", drawing: ["Flat apron in front, pleats behind; a sporran at the front."], source: W("Kilt"), tags: ["tartan"] },
  { id: "sarafan", name: "Sarafan", local: "сарафан", region: "eastern-europe", countries: ["RU"], period: est(1400, null), wornBy: "women", occasions: ["everyday", "festival"], slot: "full", cut: "tailored", fabrics: ["linen", "cotton", "silk"],
    description: "A long trapezoidal dress of Russian folk costume, worn by girls and women.", drawing: ["A pinafore-like A-line over a full-sleeved blouse."], source: W("Sarafan") },
  { id: "kokoshnik", name: "Kokoshnik", local: "кокошник", region: "eastern-europe", countries: ["RU"], period: rep(900, null, "since the 10th century; popular 16th–19th"), wornBy: "women", occasions: ["festival", "wedding"], slot: "head", cut: "structure", fabrics: ["brocade", "pearl"],
    description: "A Russian headdress worn by women and girls with the sarafan, popular from the 16th to the 19th century.", drawing: ["A tall decorated crescent or halo above the forehead."], source: W("Kokoshnik") },
  // Africa
  { id: "kente", name: "Kente", region: "western-africa", countries: ["GH"], cultures: ["asante", "akan", "ewe"], period: est(1600, null), wornBy: "all", roles: ["royalty", "nobility"], occasions: ["ceremonial", "festival", "formal"], slot: "draped", cut: "woven-strip", fabrics: ["silk", "cotton"],
    description: "A Ghanaian textile of hand-woven strips of silk and cotton, historically worn in a toga-like way among the Asante, Akan and Ewe.", drawing: ["Narrow strips sewn edge to edge make a grid of blocks; worn over the left shoulder."], source: W("Kente_cloth") },
  { id: "boubou", name: "Boubou", region: "western-africa", countries: ["SN", "ML", "GN", "NE", "MR"], period: est(1100, null), wornBy: "all", occasions: ["everyday", "formal", "festival"], slot: "full", cut: "tunic", fabrics: ["cotton", "bazin"],
    description: "A flowing, wide-sleeved robe worn across West Africa and to a lesser extent North Africa.", drawing: ["Very wide: the sleeves are part of one broad rectangle folded back over the arms."], source: W("Boubou_(clothing)") },
  { id: "agbada", name: "Agbada", region: "western-africa", countries: ["NG", "BJ", "TG"], cultures: ["yoruba"], period: est(1100, null), wornBy: "men", occasions: ["formal", "ceremonial", "wedding"], slot: "outer", cut: "tunic", fabrics: ["cotton", "damask", "aso-oke"],
    description: "The flowing robe of the Yoruba, worn over an inner cloth with trousers (shokoto) and a cap (fila) for special events.", drawing: ["Wide panels folded up on the shoulders; embroidery at the neck."], source: W("Agbada") },
  { id: "dashiki", name: "Dashiki", region: "western-africa", countries: ["NG", "GH", "SN"], period: est(1900, null), wornBy: "all", occasions: ["everyday", "formal"], slot: "upper", cut: "tunic", fabrics: ["cotton"],
    description: "A colourful garment for the upper body, mostly in West Africa; often a loose pullover with an ornate V-shaped collar, worn with a kufi cap.", drawing: ["A bold printed or embroidered V at the neck."], source: W("Dashiki") },
  { id: "kanga", name: "Kanga", region: "eastern-africa", countries: ["KE", "TZ"], cultures: ["swahili"], period: est(1850, null), wornBy: "women", occasions: ["everyday"], slot: "draped", cut: "wrapped", fabrics: ["cotton"],
    description: "A printed cotton cloth about 1.5 m by 1 m with a border on all four sides and a different centre, sold in pairs, worn in the African Great Lakes region.", drawing: ["A bordered rectangle wrapped as a skirt, another over the shoulders or head; a proverb printed on it."], source: W("Kanga_(African_garment)") },
  { id: "habesha-kemis", name: "Habesha kemis", region: "eastern-africa", countries: ["ET", "ER"], cultures: ["amhara"], period: est(1500, null), wornBy: "women", occasions: ["formal", "festival", "religious"], slot: "full", cut: "tunic", fabrics: ["cotton"],
    description: "The traditional attire of Amhara women.", drawing: ["White cotton to the ankle with a woven coloured border (tibeb) at the hem and front."], source: W("Habesha_kemis") },
  // Americas and Oceania
  { id: "poncho", name: "Poncho", region: "south-america", countries: ["AR", "BO", "CL", "PE", "EC", "CO", "MX"], period: est(-500, null, "since pre-Hispanic times"), wornBy: "all", roles: ["herder", "farmer"], occasions: ["everyday", "work"], slot: "outer", cut: "cloak", fabrics: ["wool", "alpaca"], climate: ["cold", "temperate"],
    description: "A plain loose outer garment of the Americas, worn by the peoples of the Andes and elsewhere since pre-Hispanic times to keep warm.", drawing: ["A rectangle with a head slit; stripes run front to back."], source: W("Poncho") },
  { id: "huipil", name: "Huipil", region: "central-america", countries: ["MX", "GT", "HN"], cultures: ["maya", "nahua"], period: est(-500, null), wornBy: "women", occasions: ["everyday", "festival"], slot: "upper", cut: "tunic", fabrics: ["cotton"],
    description: "The most common traditional garment of indigenous women from central Mexico to Central America.", drawing: ["Woven panels sewn side by side; dense brocade round the neck."], source: W("Huipil") },
  { id: "serape", name: "Serape", region: "central-america", countries: ["MX"], period: est(1600, null), wornBy: "men", occasions: ["everyday"], slot: "outer", cut: "cloak", fabrics: ["wool"],
    description: "A long blanket-like shawl or cloak, often brightly coloured and fringed, worn in Mexico especially by men.", drawing: ["Bright bands across, fringe at the ends; over one shoulder."], source: W("Serape") },
  { id: "parka", name: "Parka", region: "northern-america", countries: ["CA", "US", "GL"], cultures: ["inuit"], period: est(1000, null), wornBy: "all", roles: ["hunter"], occasions: ["everyday", "work"], slot: "outer", cut: "tailored", fabrics: ["caribou skin", "seal skin", "fur"], climate: ["cold"],
    description: "A hooded coat, traditionally of caribou or seal skin, a staple of Inuit clothing for hunting and kayaking in the Arctic.", drawing: ["A deep fur-trimmed hood; to the thigh or knee."], source: W("Parka") },
  { id: "moccasin", name: "Moccasin", region: "northern-america", countries: ["US", "CA"], period: est(-1000, null), wornBy: "all", occasions: ["everyday"], slot: "feet", cut: "shoe", fabrics: ["deerskin", "leather"],
    description: "A shoe of deerskin or other soft leather, sole and sides one piece stitched at the top, often embroidered or beaded.", drawing: ["Soft, flexible; beadwork on the vamp."], source: W("Moccasin") },
  { id: "lavalava", name: "Lavalava", region: "polynesia", countries: ["WS", "TO", "FJ"], period: est(1000, null), wornBy: "all", occasions: ["everyday", "formal"], slot: "lower", cut: "wrapped", fabrics: ["cotton"], climate: ["hot"],
    description: "A single rectangular cloth worn like a wraparound skirt, daily clothing of Polynesian and other Oceanic peoples.", drawing: ["Wrapped and tucked at the waist; printed with large floral motifs."], source: W("Lavalava") },
  { id: "tapa", name: "Tapa cloth", region: "polynesia", countries: ["TO", "WS", "FJ"], period: est(-500, null), wornBy: "all", occasions: ["ceremonial", "everyday"], slot: "draped", cut: "draped", fabrics: ["barkcloth"],
    description: "A barkcloth made in the Pacific islands, mainly Tonga, Samoa and Fiji.", drawing: ["Brown-black geometric patterns on a beige ground; stiff, papery folds."], source: W("Tapa_cloth") },
  // The modern world
  { id: "zoot-suit", name: "Zoot suit", region: "northern-america", countries: ["US"], period: rep(1935, 1950, "1940s"), wornBy: "men", occasions: ["festival", "formal"], slot: "full", cut: "tailored", fabrics: ["wool"],
    description: "A suit with high-waisted, wide-legged, tight-cuffed pegged trousers and a long coat with wide lapels and padded shoulders; a symbol of Hepcat and Pachuco culture, popular among many communities in the 1940s.", drawing: ["Exaggerated drape: big shoulders, long coat, trousers ballooning then narrow at the ankle."], source: W("Zoot_suit") },
  { id: "suit", name: "Suit", region: "world", countries: [], period: est(1860, null), wornBy: "all", roles: ["professional", "merchant"], occasions: ["formal", "work"], slot: "full", cut: "tailored", fabrics: ["wool"],
    description: "A set of jacket and trousers (or skirt) of the same cloth, with a collared shirt, necktie and dress shoes; today semi-formal and business wear.", drawing: ["Lapels, a straight hang from the shoulders, trouser creases."], source: W("Suit") },
  { id: "jeans", name: "Jeans", region: "world", countries: ["US"], period: rep(1873, null, "riveted blue jeans patented 20 May 1873"), wornBy: "all", occasions: ["everyday", "work"], slot: "lower", cut: "tailored", fabrics: ["denim"],
    description: "Trousers of denim; riveted blue jeans were patented by Jacob Davis and Levi Strauss in 1873.", drawing: ["Indigo that fades at the knees and seams; orange stitching."], source: W("Jeans") },
];

// ---- Outfits ----------------------------------------------------------------------------------------------------------

export interface Outfit {
  id: string; name: string; region: string; countries: readonly string[]; year: number; wornBy: WornBy;
  roles?: readonly Role[]; occasion: Occasion;
  /** Garment ids, from the innermost to the outermost. */
  garments: readonly string[];
  notes: string;
  styles?: readonly { style: string; pack: string; id: string }[];
}
export const OUTFITS: readonly Outfit[] = [
  { id: "heian-court-lady", name: "Heian court lady", region: "eastern-asia", countries: ["JP"], year: 1000, wornBy: "women", roles: ["court"], occasion: "court", garments: ["hakama", "junihitoe"], notes: "Red hakama under the layered robes; hair loose to the floor.", styles: UKIYO("ukiyoe-heian") },
  { id: "heian-courtier", name: "Heian courtier", region: "eastern-asia", countries: ["JP"], year: 1000, wornBy: "men", roles: ["court"], occasion: "court", garments: ["hakama", "sokutai"], notes: "With a lacquered cap and a baton.", styles: UKIYO("ukiyoe-heian") },
  { id: "edo-townswoman", name: "Edo townswoman", region: "eastern-asia", countries: ["JP"], year: 1780, wornBy: "women", roles: ["commoner", "merchant"], occasion: "everyday", garments: ["tabi", "kosode", "obi", "geta"], notes: "Seasonal dyes; the obi tied behind.", styles: UKIYO("ukiyoeWardrobe(wife)") },
  { id: "edo-young-woman", name: "Edo young woman, festival", region: "eastern-asia", countries: ["JP"], year: 1790, wornBy: "women", roles: ["commoner"], occasion: "festival", garments: ["furisode", "obi", "geta"], notes: "Long swinging sleeves, a hem design.", styles: UKIYO("ukiyoeWardrobe(maiden)") },
  { id: "edo-samurai-formal", name: "Edo samurai, formal", region: "eastern-asia", countries: ["JP"], year: 1750, wornBy: "men", roles: ["warrior"], occasion: "formal", garments: ["tabi", "kimono", "kamishimo", "hakama"], notes: "Winged kataginu over kimono; two swords.", styles: UKIYO("ukiyoeWardrobe(samurai)") },
  { id: "edo-labourer", name: "Edo labourer", region: "eastern-asia", countries: ["JP"], year: 1800, wornBy: "men", roles: ["labourer", "farmer"], occasion: "work", garments: ["kosode", "waraji", "kasa"], notes: "Robe hitched up; straw sandals and hat.", styles: UKIYO("ukiyoeWardrobe(laborer)") },
  { id: "summer-festival", name: "Summer festival", region: "eastern-asia", countries: ["JP"], year: 2020, wornBy: "all", occasion: "festival", garments: ["yukata", "obi", "geta"], notes: "Indigo and white cotton." },
  { id: "tang-lady", name: "Tang dynasty lady", region: "eastern-asia", countries: ["CN"], year: 750, wornBy: "women", roles: ["nobility"], occasion: "formal", garments: ["ruqun"], notes: "High skirt under the bust, a long shawl." },
  { id: "ming-scholar", name: "Ming scholar", region: "eastern-asia", countries: ["CN"], year: 1550, wornBy: "men", roles: ["scholar"], occasion: "formal", garments: ["shenyi"], notes: "Dark-edged robe and a black cap." },
  { id: "shanghai-1930s", name: "Shanghai, 1930s", region: "eastern-asia", countries: ["CN"], year: 1935, wornBy: "women", occasion: "everyday", garments: ["cheongsam"], notes: "Close-fitting qipao, short sleeves." },
  { id: "joseon-scholar", name: "Joseon scholar", region: "eastern-asia", countries: ["KR"], year: 1750, wornBy: "men", roles: ["scholar", "nobility"], occasion: "everyday", garments: ["jeogori", "durumagi", "gat"], notes: "White or pale robes; the transparent black hat." },
  { id: "joseon-woman", name: "Joseon woman", region: "eastern-asia", countries: ["KR"], year: 1850, wornBy: "women", occasion: "everyday", garments: ["chima", "jeogori"], notes: "A very short jacket over a full skirt." },
  { id: "mongolian-herder", name: "Mongolian herder", region: "eastern-asia", countries: ["MN"], year: 1900, wornBy: "all", roles: ["herder"], occasion: "everyday", garments: ["deel"], notes: "Sash and boots; long cuffs." },
  { id: "indian-bride", name: "Indian bride", region: "southern-asia", countries: ["IN"], year: 2020, wornBy: "women", occasion: "wedding", garments: ["lehenga"], notes: "Red or rose, heavy gold embroidery." },
  { id: "indian-woman-sari", name: "Woman in a sari", region: "southern-asia", countries: ["IN", "BD"], year: 1950, wornBy: "women", occasion: "everyday", garments: ["sari"], notes: "Pleats at the front; the end over the left shoulder." },
  { id: "south-asian-groom", name: "South Asian groom", region: "southern-asia", countries: ["IN", "PK"], year: 2020, wornBy: "men", occasion: "wedding", garments: ["kurta", "sherwani"], notes: "Cream or gold sherwani, a turban." },
  { id: "vietnamese-ao-dai", name: "Vietnamese áo dài", region: "south-eastern-asia", countries: ["VN"], year: 2000, wornBy: "women", occasion: "formal", garments: ["ao-dai"], notes: "White for schoolgirls; a conical hat (nón lá)." },
  { id: "gulf-man", name: "Gulf Arab man", region: "western-asia", countries: ["SA", "AE"], year: 2000, wornBy: "men", occasion: "everyday", garments: ["thawb", "keffiyeh"], notes: "White thawb; red-and-white or white headcloth." },
  { id: "roman-citizen", name: "Roman citizen", region: "southern-europe", countries: ["IT"], year: 50, wornBy: "men", roles: ["nobility"], occasion: "formal", garments: ["tunic", "toga"], notes: "White wool; senators' tunics had a broad purple stripe." },
  { id: "elizabethan-gentleman", name: "Elizabethan gentleman", region: "northern-europe", countries: ["GB"], year: 1590, wornBy: "men", roles: ["nobility"], occasion: "formal", garments: ["doublet", "ruff"], notes: "Padded doublet, trunk hose, a short cape." },
  { id: "rococo-lady", name: "Rococo lady", region: "western-europe", countries: ["FR"], year: 1765, wornBy: "women", roles: ["nobility"], occasion: "formal", garments: ["corset", "robe-a-la-francaise"], notes: "Silk sack-back gown over stays and panniers." },
  { id: "victorian-lady-1860", name: "Victorian lady, 1860s", region: "northern-europe", countries: ["GB"], year: 1862, wornBy: "women", occasion: "formal", garments: ["corset", "crinoline"], notes: "Bell-shaped skirt over the cage." },
  { id: "victorian-lady-1880", name: "Victorian lady, 1880s", region: "northern-europe", countries: ["GB"], year: 1885, wornBy: "women", occasion: "everyday", garments: ["corset", "bustle"], notes: "Flat front, the bustle behind." },
  { id: "victorian-gentleman", name: "Victorian gentleman", region: "northern-europe", countries: ["GB"], year: 1870, wornBy: "men", roles: ["professional"], occasion: "formal", garments: ["frock-coat"], notes: "Frock coat, waistcoat, top hat." },
  { id: "highland-dress", name: "Highland dress", region: "northern-europe", countries: ["GB"], year: 1900, wornBy: "men", occasion: "formal", garments: ["kilt"], notes: "Tartan kilt, sporran, jacket." },
  { id: "alpine-festival", name: "Alpine festival", region: "western-europe", countries: ["DE", "AT"], year: 2000, wornBy: "all", occasion: "festival", garments: ["dirndl", "lederhosen"], notes: "Dirndl for women, lederhosen for men." },
  { id: "russian-folk", name: "Russian folk dress", region: "eastern-europe", countries: ["RU"], year: 1850, wornBy: "women", occasion: "festival", garments: ["sarafan", "kokoshnik"], notes: "Red sarafan, embroidered blouse." },
  { id: "asante-ceremony", name: "Asante ceremony", region: "western-africa", countries: ["GH"], year: 1950, wornBy: "all", roles: ["royalty"], occasion: "ceremonial", garments: ["kente"], notes: "Kente worn toga-like with gold." },
  { id: "yoruba-formal", name: "Yoruba man, formal", region: "western-africa", countries: ["NG"], year: 2000, wornBy: "men", occasion: "ceremonial", garments: ["agbada"], notes: "With shokoto trousers and a fila cap." },
  { id: "andean-herder", name: "Andean herder", region: "south-america", countries: ["PE", "BO"], year: 1950, wornBy: "all", roles: ["herder"], occasion: "everyday", garments: ["poncho"], notes: "Striped wool poncho, a knitted hat." },
  { id: "inuit-hunter", name: "Inuit hunter", region: "northern-america", countries: ["CA", "GL"], year: 1900, wornBy: "all", roles: ["hunter"], occasion: "work", garments: ["parka"], notes: "Skin parka and boots." },
  { id: "samoan-formal", name: "Samoan formal", region: "polynesia", countries: ["WS"], year: 2000, wornBy: "men", occasion: "formal", garments: ["lavalava"], notes: "A tailored lavalava with a shirt." },
  { id: "pachuco-1940s", name: "Pachuco, 1940s", region: "northern-america", countries: ["US"], year: 1943, wornBy: "men", occasion: "festival", garments: ["zoot-suit"], notes: "Long chain, wide hat." },
];

export const COSTUME_SOURCES = [
  { title: "UN Statistics Division: Standard country or area codes for statistical use (M49)", url: "https://unstats.un.org/unsd/methodology/m49/" },
  { title: "ISO 3166-1 alpha-2 country codes", url: "https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2" },
  { title: "Wikipedia articles named on each garment (summaries fetched 2026-11-16)", url: "https://en.wikipedia.org/wiki/Clothing" },
] as const;
