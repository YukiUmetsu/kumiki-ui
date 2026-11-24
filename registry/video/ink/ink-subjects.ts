/**
 * INK-FILM1 book: every subject a film can name. `subject: "massif", props: { kind: "pillar" }` in a film is `inkMassif({ kind: "pillar" })`.
 * A book is a plain record: add your own makers with `{ ...INK_BOOK, mine: props => … }`.
 */
import type { InkBook, InkSubjectMaker } from "./ink-film";
import { inkMomei } from "./cast/momei";
import { inkQingfeng } from "./cast/qingfeng";
import { inkShuiyue } from "./cast/shuiyue";
import { inkButterfly, inkCrane, inkGoose, inkKoi, inkSwallow } from "./ink-fauna";
import { inkBamboo, inkGrass, inkLeaf, inkLotus, inkMaple, inkOrchid, inkPetal, inkPine, inkPlum, inkRaindrop, inkReeds, inkSnowflake, inkWillow } from "./ink-flora";
import { inkSwordsman, inkUmbrellaLady } from "./ink-folk";
import { inkMassif, inkMist, inkMoon, inkRange, inkSky, inkWater } from "./ink-land";
import { inkLettering, inkSeal } from "./ink-lettering";
import { inkArrow, inkEnso, inkSplash, inkSweep, inkTick, inkUnderline } from "./ink-marks";
import { inkBoat, inkBridge, inkHouses, inkPagoda, inkPavilion } from "./ink-place";

/** A maker with typed options, as a book holds it. */
const of = <T extends object>(make: (o: T) => ReturnType<InkSubjectMaker>): InkSubjectMaker => p => make(p as T);
const words = (p: Readonly<Record<string, unknown>>): string => { if (typeof p.text !== "string") throw new Error("Lettering and seals need a `text`."); return p.text; };

export const INK_BOOK = {
  // figures
  shuiyue: of(inkShuiyue), qingfeng: of(inkQingfeng), momei: of(inkMomei), swordsman: of(inkSwordsman), "umbrella-lady": of(inkUmbrellaLady),
  // land, water and sky
  massif: of(inkMassif), range: of(inkRange), mist: of(inkMist), water: of(inkWater), moon: of(inkMoon), sky: of(inkSky),
  // buildings and boats
  boat: of(inkBoat), bridge: of(inkBridge), houses: of(inkHouses), pagoda: of(inkPagoda), pavilion: of(inkPavilion),
  // plants
  bamboo: of(inkBamboo), plum: of(inkPlum), pine: of(inkPine), lotus: of(inkLotus), orchid: of(inkOrchid), willow: of(inkWillow), maple: of(inkMaple), reeds: of(inkReeds), grass: of(inkGrass),
  // animals
  crane: of(inkCrane), goose: of(inkGoose), swallow: of(inkSwallow), koi: of(inkKoi), butterfly: of(inkButterfly),
  // small pieces, for swarms
  petal: of(inkPetal), leaf: of(inkLeaf), snowflake: of(inkSnowflake), raindrop: of(inkRaindrop),
  // marks
  enso: of(inkEnso), sweep: of(inkSweep), underline: of(inkUnderline), arrow: of(inkArrow), splash: of(inkSplash), tick: of(inkTick),
  // words
  lettering: p => inkLettering(words(p), p), seal: p => inkSeal(words(p), p),
} satisfies InkBook;
export type InkSubjectName = keyof typeof INK_BOOK;
/** Subjects that need the page's own fonts, so that only the page can paint them. */
export const INK_PAGE_ONLY: ReadonlySet<string> = new Set<InkSubjectName>(["lettering", "seal"]);
