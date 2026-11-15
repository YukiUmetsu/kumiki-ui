/**
 * UKIYO1 wardrobe: dressed, varied people for any role and season, after the Met's Edo kosode (2001.428 series and
 * 45187: commoners' plain or faintly checked indigo, crests on the back and sleeves), the summer robe with irises at
 * Yatsuhashi (813665: the design rising from the hem over a pale ground), Torii Kiyonaga's *A Young Woman with a Dog*
 * (51998: a vermilion robe with large chrysanthemum heads on the skirt, a black obi with gold roundels, layered collars
 * and a long white under-robe) and *Three Women on a Riverbank* (39725: vermilion, grey and black robes side by side).
 *
 * `ukiyoeWardrobe(role, seed, season)` returns a complete look: the robe colour and pattern from the season's dyes, a
 * hem design (suso-moyō) for young women, the obi colour, knot and design, the under-collar, hair, footwear and the
 * small things (a fan, an umbrella, a pipe) that people carry. The same role, seed and season always give the same look.
 */
import { hash01 } from "./ukiyoe-core";
import type { UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoePattern, UkiyoePatternType } from "./ukiyoe-prims";

export type UkiyoeRole = "maiden" | "wife" | "elder-woman" | "girl" | "merchant" | "artisan" | "laborer" | "samurai" | "elder-man" | "boy";
export const UKIYOE_ROLES_LIST: readonly UkiyoeRole[] = ["maiden", "wife", "elder-woman", "girl", "merchant", "artisan", "laborer", "samurai", "elder-man", "boy"];
export type UkiyoeSeason = "spring" | "summer" | "autumn" | "winter";
export const UKIYOE_SEASONS: readonly UkiyoeSeason[] = ["spring", "summer", "autumn", "winter"];

/** Each season's dyes for robes (bright for the young, deep for the rest) and its flower or water motifs. */
const SEASON: Readonly<Record<UkiyoeSeason, { bright: UkiyoePaint[]; deep: UkiyoePaint[]; motifs: UkiyoePatternType[] }>> = {
  spring: { bright: ["beni", "sakura", "ki", "sora", "murasaki", "kusa"], deep: ["ai", "cha", "matsu", "murasaki"], motifs: ["sakura", "ume", "kumo", "asanoha"] },
  summer: { bright: ["asagi", "sora", "gofun", "kusa", "ai", "sakura"], deep: ["ai", "usuzumi", "matsu", "hanada"], motifs: ["ayame", "tachiwaki", "nami", "seigaiha"] },
  autumn: { bright: ["shu", "tan", "kincha", "ki", "murasaki", "beni"], deep: ["cha", "kogecha", "matsu", "ai"], motifs: ["momiji", "kiku", "kumo", "shippo"] },
  winter: { bright: ["beni", "murasaki", "ai", "shu", "sakura", "gofun"], deep: ["sumi", "ai", "kogecha", "usuzumi", "murasaki"], motifs: ["ume", "kanoko", "kikko", "sayagata"] },
};
/** Small repeats for everyday cloth. */
const EVERYDAY: UkiyoePatternType[] = ["shima", "koshi", "kasuri", "kikko", "hishi", "sayagata", "yagasuri", "ichimatsu", "kanoko"];
const LINE_ON: Readonly<Record<string, UkiyoePaint>> = { gofun: "ai", sakura: "beni", ki: "shu", sora: "ai", asagi: "ai", kusa: "matsu", tan: "cha", kincha: "cha" };

/** A pattern colour that reads on the ground: white or pale on dark, a darker dye on pale. */
function onGround(ground: UkiyoePaint, pick: number): UkiyoePaint {
  if (LINE_ON[ground]) return LINE_ON[ground];
  return (["gofun", "ki", "sakura", "sora", "kin"] as UkiyoePaint[])[Math.floor(pick * 5)];
}

/** A complete look for a role in a season. */
export function ukiyoeWardrobe(role: UkiyoeRole, seed: number, season: UkiyoeSeason = "spring"): UkiyoeFigureLook {
  const r = (i: number) => hash01(seed, i, 911), pick = <T>(a: readonly T[], i: number): T => a[Math.floor(r(i) * a.length) % a.length];
  const S = SEASON[season], pat = (type: UkiyoePatternType, ground: UkiyoePaint, scale: number, opacity = .8): UkiyoePattern => ({ type, color: onGround(ground, r(40)), scale, opacity });
  const woman = role === "maiden" || role === "wife" || role === "elder-woman" || role === "girl";
  const winter = season === "winter";
  if (woman) {
    const young = role === "maiden" || role === "girl";
    const robe = role === "elder-woman" ? pick(["cha", "usuzumi", "kogecha", "ai"] as const, 1) : young ? pick(S.bright, 1) : pick(S.deep, 1);
    const robePattern = role === "elder-woman" ? (r(2) < .5 ? pat("shima", robe, .35, .5) : undefined)
      : young ? pat(r(2) < .55 ? pick(S.motifs, 3) : pick(EVERYDAY, 3), robe, .4 + r(4) * .25)
      : pat(pick(EVERYDAY, 3), robe, .3 + r(4) * .15, .6);
    const hem = role === "maiden" && r(5) < .55 ? { ...pat(pick(S.motifs, 6), robe, .9 + r(7) * .5, .9), height: .2 + r(8) * .14 } : undefined;
    const obi = pick(role === "elder-woman" ? ["kogecha", "sumi", "ai"] as const : ["sumi", "kincha", "ai", "beni", "kin", "murasaki", "matsu", "gofun"] as const, 9);
    return {
      hair: role === "girl" ? "child" : "shimada", hairColor: role === "elder-woman" ? "usuzumi" : undefined,
      features: role === "elder-woman" ? { age: .75 } : undefined, skin: role === "elder-woman" ? "hada" : undefined,
      build: role === "girl" ? "child" : "slim", robe, robePattern, hem, under: pick(["beni", "ki", "gofun", "shu", "sakura"] as const, 10),
      obi, obiKnot: role === "girl" ? "bunko" : pick(["tateya", "bunko", "taiko", "kichiya"] as const, 11),
      obiDesign: r(12) < .6 ? { type: pick(["kikko", "hishi", "shippo", "sayagata", "kiku"] as const, 13), color: obi === "kin" || obi === "gofun" ? "beni" : "kin", scale: .25, opacity: .8 } : undefined,
      sleeves: young ? "long" : undefined, lower: "robe", feet: winter || r(14) < .7 ? "geta" : "waraji", accent: pick(["shu", "beni", "ai", "kin"] as const, 15),
      prop: r(16) < (season === "summer" ? .45 : .25) ? pick(season === "summer" ? ["fan", "umbrella"] as const : ["umbrella", "fan", "bundle"] as const, 17) : undefined,
      layers: role === "maiden" && r(18) < .4 ? [pick(["beni", "ki", "sakura"] as const, 19), "gofun"] : undefined,
    } as UkiyoeFigureLook;
  }
  if (role === "boy") return { hair: "child", build: "child", robe: pick(S.bright, 1), robePattern: pat(pick(["ichimatsu", "yagasuri", "kasuri", "shima"] as const, 2), pick(S.bright, 1), .5), obi: pick(["shu", "ai", "kogecha"] as const, 3), feet: "geta" } as UkiyoeFigureLook;
  const robe = pick(role === "elder-man" ? ["usuzumi", "cha", "kogecha", "ai"] as const : S.deep, 1);
  const base = { hair: role === "elder-man" ? "elder" : "chonmage", robe, robePattern: r(2) < .6 ? pat(pick(EVERYDAY, 3), robe, .35 + r(4) * .2, .6) : undefined, beard: role === "elder-man" && r(5) < .6 } as Partial<UkiyoeFigureLook>;
  switch (role) {
    case "merchant": return { ...base, coat: pick(["kogecha", "sumi", "cha", "ai"] as const, 6), coatPattern: r(7) < .4 ? pat("kikko", "kogecha", .35, .5) : undefined, lower: "hakama", hakama: pick(["usuzumi", "ai", "kogecha"] as const, 8), feet: "tabi", prop: r(9) < .5 ? pick(["fan", "pipe", "scroll"] as const, 10) : undefined, accent: "shu" } as UkiyoeFigureLook;
    case "artisan": return { ...base, lower: "tucked", legs: winter ? "ai" : "hada", feet: "waraji", hat: "headband", hatColor: pick(["gofun", "ai", "shu"] as const, 6), prop: r(7) < .4 ? "bundle" : undefined } as UkiyoeFigureLook;
    case "laborer": return { ...base, robe: pick(["ai", "cha", "kogecha", "asagi"] as const, 1), lower: "tucked", legs: winter ? "ai" : "hada", feet: "waraji", hat: r(6) < .5 ? "kasa" : "headband", hatColor: "gofun", prop: pick(["basket-pole", "firewood", "bundle", "staff"] as const, 7), mino: winter && r(8) < .5 } as UkiyoeFigureLook;
    case "samurai": return { ...base, robe: pick(["ai", "sumi", "kogecha", "matsu", "murasaki"] as const, 1), lower: "hakama", hakama: pick(["usuzumi", "kogecha", "ai"] as const, 6), feet: "tabi", swords: "daisho", kataginu: r(7) < .3 ? pick(["ai", "usuzumi"] as const, 8) : undefined, crest: "gofun" } as UkiyoeFigureLook;
    default: return { ...base, lower: "tucked", legs: "hada", feet: "waraji", prop: r(6) < .6 ? "staff" : undefined } as UkiyoeFigureLook;
  }
}

/** A mixed street of people for a season: roles in typical proportions, each dressed by `ukiyoeWardrobe`. */
export function ukiyoeTownsfolk(seed: number, count: number, season: UkiyoeSeason = "spring"): UkiyoeFigureLook[] {
  const roles: UkiyoeRole[] = ["maiden", "maiden", "wife", "wife", "elder-woman", "girl", "merchant", "merchant", "artisan", "laborer", "laborer", "samurai", "elder-man", "boy"];
  return Array.from({ length: count }, (_, i) => ukiyoeWardrobe(roles[Math.floor(hash01(seed, i, 917) * roles.length)], seed * 31 + i * 7, season));
}
