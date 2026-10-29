import { TimelineJourneyScene } from "../../../registry/video/recipes/timeline-journey";
import type { SceneTemplateSpec, TimelineJourneyEvent } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
const mono = { mode: "mono" as const, intensity: .6 };
/** Facts and dates: Library of Congress item records, Smithsonian NASM object records, FAI and NASA captions (see the component spec). */
const events: TimelineJourneyEvent[] = [
  { id: "wright", date: "1903-12-17", label: "First powered flight",
    caption: "The Wright Flyer stays aloft for 12 seconds and covers 120 feet at Kitty Hawk, North Carolina.",
    image: { id: "wright", src: asset("timeline-flight-1903-wright.jpg"), alt: "The Wright Flyer just off the ground at Kitty Hawk, Wilbur Wright running beside it",
      licenseRef: "loc-wright-first-flight-1903", width: 1600, height: 1038 },
    focus: { x: .3, y: .16, width: .5, height: .36 }, source: "Library of Congress", credit: "Photo: John T. Daniels", grade: mono },
  { id: "bleriot", date: "1909-07-25", label: "The Channel, by air",
    caption: "Louis Blériot flies a 25-horsepower monoplane from near Calais to Dover: the first aeroplane crossing of the English Channel.",
    image: { id: "bleriot", src: asset("timeline-flight-1909-bleriot.jpg"), alt: "Blériot's monoplane on a grassy slope at Dover, surrounded by police and onlookers",
      licenseRef: "loc-bleriot-dover-1909", width: 1070, height: 700 },
    focus: { x: .56, y: .48 }, source: "Library of Congress, Bain Collection", credit: "After landing at Dover", grade: mono },
  { id: "lindbergh", date: "1927-05-20", label: "Alone across the Atlantic", transition: "dissolve",
    caption: "Charles Lindbergh flies the Spirit of St. Louis nonstop from New York to Paris, solo, in 33 hours 30 minutes.",
    image: { id: "lindbergh", src: asset("timeline-flight-1927-lindbergh.jpg"), alt: "Charles Lindbergh in flying gear shaking hands beside the Spirit of St. Louis",
      licenseRef: "loc-lindbergh-spirit-1927", width: 1600, height: 1250 },
    focus: { x: .33, y: .28, width: .3, height: .5 }, source: "Library of Congress", credit: "Harris & Ewing, 1927 or 1928", grade: mono },
  { id: "x1", date: "1947-10-14", label: "Faster than sound",
    caption: "Chuck Yeager flies the rocket-powered Bell X-1 to Mach 1.06 over the Mojave Desert.",
    image: { id: "x1", src: asset("timeline-flight-1947-x1.jpg"), alt: "The Bell X-1 rocket plane in flight above desert mountains",
      licenseRef: "nasa-bell-x1-46-062", width: 1600, height: 1200 },
    focus: { x: .32, y: .2, width: .45, height: .3 }, source: "NASA", credit: "X-1 46-062 on a test flight, c. 1947", grade: mono },
  { id: "apollo11", date: "1969-07-20", label: "Humans on the Moon",
    caption: "Apollo 11's lunar module Eagle lands in the Sea of Tranquility. Buzz Aldrin, photographed by Neil Armstrong.",
    image: { id: "apollo11", src: asset("timeline-flight-1969-apollo11.jpg"), alt: "Astronaut Buzz Aldrin in a spacesuit standing on the lunar surface",
      licenseRef: "nasa-as11-40-5903", width: 1400, height: 1408 },
    focus: { x: .36, y: 0, width: .3, height: .62 }, source: "NASA", credit: "AS11-40-5903", grade: { mode: "color", intensity: .35 } },
  // Match cut on shape: the standing white suit becomes the standing white orbiter.
  { id: "sts1", date: "1981-04-12", label: "A spacecraft with wings", transition: "match-cut", transitionFrames: 24,
    caption: "Columbia launches on STS-1, the first Space Shuttle mission, with John Young and Robert Crippen aboard.",
    image: { id: "sts1", src: asset("timeline-flight-1981-sts1.jpg"), alt: "Space Shuttle Columbia lifting off from the launch pad in a cloud of exhaust",
      licenseRef: "nasa-sts1-launch", width: 1400, height: 1400 },
    focus: { x: .58, y: .2, width: .22, height: .48 }, kenBurns: "out", source: "NASA", credit: "S81-30498", grade: { mode: "color", intensity: .25 } },
];
export const timelineSpec: SceneTemplateSpec<"timeline-journey"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "timeline-journey", id: "flight-history",
  fps: { num: 24, den: 1 }, durationFrames: 960, width: 960, height: 540,
  // Anchor 2.5 s, six 5 s events, a 7.5 s summary hold.
  cueFrames: [60, 420, 780], background: "#0b0a08", accent: "#e3b46a",
  content: {
    eyebrow: "A short history of flight", narrative: "From Kitty Hawk to orbit", spacing: "elapsed", locale: "en", events,
    summary: { statement: "From 12 seconds over the sand to a winged spacecraft in orbit.",
      detail: "Six moments from 1903 to 1981. Spacing on the rail is proportional to elapsed time." },
  },
};
const japanese = {
  eyebrow: "飛行の小史", narrative: "キティホークから宇宙へ",
  summary: { statement: "砂浜の上の12秒から、軌道を回る翼のある宇宙船へ。",
    detail: "1903年から1981年までの6つの瞬間。レール上の間隔は経過時間に比例します。" },
  events: [
    ["初の動力飛行", "ライト・フライヤー号がノースカロライナ州キティホークで12秒間、120フィート(約37メートル)を飛ぶ。", "米国議会図書館", "撮影: ジョン・T・ダニエルズ"],
    ["空から英仏海峡へ", "ルイ・ブレリオが25馬力の単葉機でカレー近郊からドーバーへ。飛行機による初の英仏海峡横断。", "米国議会図書館 ベイン・コレクション", "ドーバー着陸後"],
    ["単独で大西洋を越えて", "チャールズ・リンドバーグがスピリット・オブ・セントルイス号でニューヨークからパリへ。33時間30分の単独無着陸飛行。", "米国議会図書館", "ハリス&ユーイング、1927年または1928年"],
    ["音速を超えて", "チャック・イェーガーがロケット機ベルX-1でモハーヴェ砂漠上空、マッハ1.06に到達。", "NASA", "試験飛行中のX-1 46-062、1947年頃"],
    ["人類、月へ", "アポロ11号の月着陸船イーグルが静かの海に着陸。写真はニール・アームストロングが撮影したバズ・オルドリン。", "NASA", "AS11-40-5903"],
    ["翼をもつ宇宙船", "コロンビアがSTS-1で打ち上げ。スペースシャトルの初飛行、搭乗はジョン・ヤングとロバート・クリッペン。", "NASA", "S81-30498"],
  ],
};
export function timelineSpecFor(language: "en" | "ja"): SceneTemplateSpec<"timeline-journey"> {
  if (language === "en") return timelineSpec;
  return { ...timelineSpec, content: { ...timelineSpec.content, locale: "ja", eyebrow: japanese.eyebrow, narrative: japanese.narrative, summary: japanese.summary,
    events: events.map((e, i) => { const [label, caption, source, credit] = japanese.events[i]; return { ...e, label, caption, source, credit }; }) } };
}
export function TimelineJourneyPreview({ language = "en" }: { language?: "en" | "ja" }) {
  const spec = timelineSpecFor(language);
  return <ScenePreviewShell title="Timeline Journey" subtitle="Six public-domain archival photographs on a proportional rail · 40 seconds"
    fps={24} durationFrames={spec.durationFrames} reducedFrame={900}
    credits={<>Photographs, public domain. Library of Congress: Wright Flyer, 17 Dec 1903, by John T. Daniels (LC-DIG-ppprs-00626); Blériot at Dover, Bain Collection (LC-USZ62-94567); Lindbergh and the Spirit of St. Louis, Harris &amp; Ewing (LC-DIG-hec-34667). NASA: Bell X-1 46-062; AS11-40-5903 by Neil Armstrong; STS-1 launch, S81-30498. No endorsement implied. No audio.</>}>
    {({ frame, portrait, reduced }) => <TimelineJourneyScene spec={{ ...spec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced}/>}
  </ScenePreviewShell>;
}
