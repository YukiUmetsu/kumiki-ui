/**
 * Artist-authored projections transcribed from the user's three full-resolution
 * Chinese ink teacher images, November 14, 2026.
 *
 * Approximate IMAGE COORDINATES. These are neither automated facial detection
 * nor source-licensed scene drawings. The image bytes remain out of the repo.
 * The three people are intentionally distinct, not alternate views of one man.
 */
import type {FigureReferenceMesh,FigureLandmark,ObservedLandmark,FigureVec2} from
  "../../registry/character/figure-proportion-study";
import type {ShanshuiScene} from "../../registry/video/ink-shanshui";
const B=(x:number,y:number,width:number,height:number)=>({x,y,width,height});
const L=(x:number,y:number,confidence:"clear"|"estimated"="estimated",
  tolerancePx=5):ObservedLandmark=>({
  point:{x,y},confidence,tolerancePx,
});
type M=Partial<Record<FigureLandmark,ObservedLandmark>>;
const hidden:Record<string,string>={
  "knee-left":"Hidden under the robe; knee projection cannot be measured.",
  "knee-right":"Hidden under the robe; knee projection cannot be measured.",
  "ankle-left":"Hidden under the robe; ankle cannot be reliably located.",
  "ankle-right":"Hidden under the robe; ankle cannot be reliably located.",
};
/** First original reference: a compact aged hermit, bent forward, bearded.
 * Its low-resolution head/eyes are especially uncertain: ±6–9 pixels.
 */
const hermit:FigureReferenceMesh={
  id:"hermit-teacher-2026",source:{name:"chinese art(1).jpeg",width:1280,height:720},
  figure:B(600,345,157,296),fullSilhouette:B(598,342,163,303),
  view:"three-quarter-left",
  pose:"Older scholar walking slowly, lowered face, beard, left hand at chin",
  regions:{
    hair:B(622,348,72,51),skull:B(621,367,65,66),face:B(623,379,51,54),
    "brow-screen-left":B(625,382,13,8),"brow-screen-right":B(640,379,15,10),
    "eye-screen-left":B(626,390,12,8),"eye-screen-right":B(643,389,11,9),
    nose:B(634,390,15,17),mouth:B(632,411,18,8),neck:B(648,423,26,28),
    torso:B(632,406,87,86),"arm-screen-left":B(601,411,64,97),
    "arm-screen-right":B(691,421,53,123),
    "hand-screen-left":B(620,408,25,31),"hand-screen-right":B(686,501,31,33),
    "sleeve-screen-left":B(600,421,64,92),
    "sleeve-screen-right":B(695,442,53,110),
    waist:B(641,473,60,20),hip:B(640,492,78,37),robe:B(632,466,116,155),
    "foot-screen-left":B(625,618,36,18),
    "foot-screen-right":B(701,618,30,22),
  },
  landmarks:{
    "head-top":L(651,366,"estimated",6),"bun-top":L(648,349,"clear",3),
    "bun-center":L(650,361),"hairline":L(637,378),
    chin:L(652,432,"estimated",8),
    "face-left":L(625,390),"face-right":L(674,409),
    "brow-left-outer":L(626,384),"brow-left-inner":L(637,385),
    "brow-right-inner":L(644,387),"brow-right-outer":L(653,381),
    "eye-left-outer":L(628,392),"eye-left-inner":L(636,392),
    "eye-right-inner":L(643,394),"eye-right-outer":L(653,393),
    "nose-root":L(642,394),"nose-tip":L(633,406),
    "mouth-left":L(632,416),"mouth-right":L(647,418),
    "neck-left":L(646,430),"neck-right":L(669,438),
    "shoulder-left":L(623,403),"shoulder-right":L(701,408),
    "elbow-left":L(615,467,"estimated",14),
    "elbow-right":L(721,461,"estimated",14),
    "wrist-left":L(633,426),"wrist-right":L(701,513),
    "hand-left":L(632,418),"hand-right":L(705,515),
    "waist-left":L(642,478),"waist-right":L(697,487),
    "hip-left":L(644,508),"hip-right":L(712,511),
    "robe-hem-left":L(634,603),"robe-hem-right":L(735,611),
    "sleeve-left-top":L(617,410),"sleeve-left-bottom":L(651,505),
    "sleeve-right-top":L(704,420),"sleeve-right-bottom":L(734,543),
    "foot-left":L(639,631),"foot-right":L(712,634),
  },
  occluded:{
    ...hidden,"leg-screen-left":"Anatomical leg hidden under long garment.",
    "leg-screen-right":"Anatomical leg hidden under long garment.",
    "nostril":"Facial area insufficiently resolved for an independent nostril measurement.",
  },
  notes:[
    "NOT the same figure as the young reader/walker. Older face, moustache and beard are design-defining.",
    "The head is visibly forward and shoulders rounded; a neutral erect skeleton would be misleading.",
    "Low-resolution eye/brow/nose landmarks are estimates, not exact shape extraction.",
    "Robe overlaps both legs; no knee, tibia or ankle coordinates are asserted.",
  ],
};
/** Second reference: young scroll reader with high tied hair and large sleeves. */
const reader:FigureReferenceMesh={
  id:"reader-teacher-2026",
  source:{name:"ChatGPT Image Nov 14, 2026, 11_57_14 AM-2(1).png",
    width:1672,height:941},
  figure:B(377,292,210,514),fullSilhouette:B(312,289,305,520),
  view:"three-quarter-left",pose:"Young scholar reading an open scroll, both hands visible",
  regions:{
    hair:B(454,294,83,92),skull:B(455,319,78,71),
    face:B(461,344,66,47),nose:B(493,356,15,18),
    "brow-screen-left":B(470,340,22,12),"brow-screen-right":B(501,339,22,11),
    "eye-screen-left":B(473,350,20,10),"eye-screen-right":B(504,350,18,10),
    mouth:B(490,375,19,8),neck:B(480,381,32,33),
    torso:B(427,390,124,112),
    "arm-screen-left":B(383,420,134,89),
    "arm-screen-right":B(509,422,80,110),
    "hand-screen-left":B(498,445,30,32),
    "hand-screen-right":B(540,446,28,34),
    "sleeve-screen-left":B(377,402,117,221),
    "sleeve-screen-right":B(505,413,82,208),
    waist:B(449,486,93,31),hip:B(445,517,109,84),
    robe:B(377,481,197,311),
    "foot-screen-left":B(464,763,44,24),
    "foot-screen-right":B(528,763,45,37),
    ornament:B(314,344,199,354),
  },
  landmarks:{
    "bun-top":L(484,294,"clear",3),"bun-center":L(486,316,"clear",3),
    "head-top":L(488,319,"clear",3),"hairline":L(481,343,"clear",3),
    chin:L(500,387,"clear",4),"face-left":L(462,359),"face-right":L(526,361),
    "ribbon-tip":L(318,384,"estimated",8),
    "brow-left-outer":L(474,344),"brow-left-inner":L(490,347),
    "brow-right-inner":L(503,345),"brow-right-outer":L(520,341),
    "eye-left-outer":L(474,354),"eye-left-inner":L(490,356),
    "eye-right-inner":L(504,354),"eye-right-outer":L(519,355),
    "nose-root":L(502,355),"nose-tip":L(498,369),
    "mouth-left":L(490,379),"mouth-right":L(506,380),
    "neck-left":L(482,384),"neck-right":L(509,397),
    "shoulder-left":L(429,398),"shoulder-right":L(538,412),
    "elbow-left":L(417,478,"estimated",13),
    "elbow-right":L(557,485,"estimated",13),
    "wrist-left":L(500,461),"wrist-right":L(540,462),
    "hand-left":L(510,459,"clear",4),
    "hand-right":L(546,462,"clear",4),
    "waist-left":L(452,492),"waist-right":L(534,496),
    "hip-left":L(442,559,"estimated",12),
    "hip-right":L(541,557,"estimated",12),
    "sleeve-left-top":L(417,401),"sleeve-left-bottom":L(410,617),
    "sleeve-right-top":L(538,410),"sleeve-right-bottom":L(532,605),
    "robe-hem-left":L(392,738),"robe-hem-right":L(547,787),
    "foot-left":L(487,781),"foot-right":L(554,779),
  },
  occluded:{
    ...hidden,"elbow-under-fabric":"Elbows only broadly inferred from sleeve creases.",
    "leg-screen-left":"Long underskirt hides leg anatomy.",
    "leg-screen-right":"Long underskirt hides leg anatomy.",
    "nostril":"Nostrils rendered minimally; not a stable measurement.",
  },
  notes:[
    "Youthful narrow chin and delicate downward eyes, not the older hermit's bearded face.",
    "Both hand placements follow the visible scroll; long sleeves drape below wrists.",
    "Flying hair ribbon and lower sash expand full silhouette but MUST NOT inflate body width.",
    "Hidden knees/ankles are deliberately not digitized.",
  ],
};
/** Third reference: youthful pensive traveler, hem and sash catching the wind. */
const walker:FigureReferenceMesh={
  id:"walker-teacher-2026",
  source:{name:"ChatGPT Image Nov 14, 2026, 11_57_14 AM-1(1).png",
    width:1672,height:941},
  figure:B(895,342,239,481),fullSilhouette:B(889,342,288,484),
  view:"three-quarter-left",
  pose:"Young traveler on stone path, one visible hand at chin; wind-swept garment",
  regions:{
    hair:B(908,345,89,100),skull:B(908,380,78,77),
    face:B(913,394,62,62),
    "brow-screen-left":B(915,397,24,13),
    "brow-screen-right":B(943,397,22,14),
    "eye-screen-left":B(919,410,20,13),
    "eye-screen-right":B(945,411,16,12),
    nose:B(929,420,19,18),mouth:B(935,439,20,8),
    neck:B(954,442,30,33),
    torso:B(953,426,139,121),
    "arm-screen-left":B(901,438,88,155),
    "arm-screen-right":B(1013,461,111,168),
    "hand-screen-left":B(934,441,29,47),
    "sleeve-screen-left":B(898,441,104,175),
    "sleeve-screen-right":B(1021,469,102,168),
    waist:B(967,525,75,33),hip:B(950,556,130,89),
    robe:B(925,525,219,278),
    "foot-screen-left":B(900,789,69,33),
    "foot-screen-right":B(1033,771,56,37),
    ornament:B(1022,604,150,150),
  },
  landmarks:{
    "bun-top":L(946,345,"clear",3),"bun-center":L(946,367),
    "head-top":L(949,381),"hairline":L(936,398),
    chin:L(952,452,"clear",4),
    "face-left":L(916,413),"face-right":L(972,428),
    "ribbon-tip":L(1082,418,"estimated",9),
    "brow-left-outer":L(919,400),"brow-left-inner":L(938,405),
    "brow-right-inner":L(948,405),"brow-right-outer":L(964,402),
    "eye-left-outer":L(918,414),"eye-left-inner":L(936,419),
    "eye-right-inner":L(946,417),"eye-right-outer":L(961,422),
    "nose-root":L(947,417),"nose-tip":L(937,434),
    "mouth-left":L(936,442),"mouth-right":L(951,446),
    "neck-left":L(958,446),"neck-right":L(977,460),
    "shoulder-left":L(959,445),"shoulder-right":L(1069,460),
    "elbow-left":L(915,529,"estimated",13),
    "elbow-right":L(1083,526,"estimated",15),
    "wrist-left":L(945,459),"hand-left":L(948,458),
    "waist-left":L(963,533),"waist-right":L(1037,535),
    "hip-left":L(963,606,"estimated",13),
    "hip-right":L(1086,603,"estimated",13),
    "sleeve-left-top":L(954,445),"sleeve-left-bottom":L(966,606),
    "sleeve-right-top":L(1056,453),"sleeve-right-bottom":L(1097,626),
    "robe-hem-left":L(927,779),"robe-hem-right":L(1127,750),
    "foot-left":L(932,811),"foot-right":L(1056,788),
  },
  occluded:{
    ...hidden,
    "wrist-right":"Right wrist is concealed inside voluminous sleeve.",
    "hand-right":"Right hand is not independently visible.",
    "leg-screen-left":"Robe and underskirt conceal left knee and shin.",
    "leg-screen-right":"Robe and underskirt conceal right knee and shin.",
    "nostril":"Only stylized contour of nose visible.",
  },
  notes:[
    "Young narrow jaw; contemplative right-facing body with face tilted toward image left.",
    "Small hand rests near chin; other hand stays hidden within sleeve.",
    "Flaring hem, distinct draped sleeve weight and wide flying sash are essential to its silhouette.",
    "Foot positions are visible, but joint locations under the skirt are not.",
  ],
};
export const SHANSHUI_TEACHER_MESHES:Readonly<Record<ShanshuiScene,FigureReferenceMesh>>={
  "misty-hermit":hermit,"river-scholar":reader,"mountain-trail":walker,
};
/** Artist-digitized baseline of the existing 260×340 generic puppet, before
 * any scene-specific teacher correction. Used ONLY to expose differences;
 * it must never be misrepresented as a measurement of a reference image.
 */
export const SHANSHUI_LEGACY_PUPPET_MESH:FigureReferenceMesh={
  id:"shanshui-original-puppet",
  source:{name:"Kumiki ink-traveller original 260×340 design art",width:260,height:340},
  figure:B(36,43,198,291),fullSilhouette:B(35,42,200,296),
  view:"three-quarter-left",pose:"Legacy front-facing puppet in neutral costume",
  regions:{
    hair:B(109,53,69,48),skull:B(108,68,68,77),face:B(111,76,59,65),
    "brow-screen-left":B(119,89,17,7),"brow-screen-right":B(147,88,18,7),
    "eye-screen-left":B(117,98,19,10),"eye-screen-right":B(146,97,18,10),
    nose:B(136,106,18,13),mouth:B(133,119,16,9),neck:B(121,131,41,21),
    torso:B(95,136,76,87),"arm-screen-left":B(39,146,72,108),
    "arm-screen-right":B(156,145,76,109),
    "hand-screen-left":B(46,237,20,19),
    "hand-screen-right":B(215,237,20,19),
    "sleeve-screen-left":B(39,146,73,111),
    "sleeve-screen-right":B(155,143,78,113),
    waist:B(91,212,91,24),hip:B(87,240,106,39),
    robe:B(77,136,126,177),
    "foot-screen-left":B(89,315,32,18),
    "foot-screen-right":B(141,314,35,19),
  },
  landmarks:{
    "head-top":L(139,68,"clear",1),
    "bun-top":L(141,55,"estimated",3),"bun-center":L(141,69),
    "hairline":L(139,79),chin:L(141,141),
    "face-left":L(114,105),"face-right":L(167,112),
    "brow-left-outer":L(119,94),"brow-left-inner":L(135,94),
    "brow-right-inner":L(148,94),"brow-right-outer":L(164,92),
    "eye-left-outer":L(119,102),"eye-left-inner":L(135,102),
    "eye-right-inner":L(148,102),"eye-right-outer":L(163,102),
    "nose-root":L(143,105),"nose-tip":L(145,115),
    "mouth-left":L(135,123),"mouth-right":L(147,123),
    "neck-left":L(123,134),"neck-right":L(162,134),
    "shoulder-left":L(96,148),"shoulder-right":L(166,146),
    "elbow-left":L(70,206),"elbow-right":L(201,206),
    "wrist-left":L(54,242),"wrist-right":L(223,245),
    "hand-left":L(53,244),"hand-right":L(223,244),
    "waist-left":L(92,221),"waist-right":L(182,221),
    "hip-left":L(102,255),"hip-right":L(162,255),
    "robe-hem-left":L(79,305),"robe-hem-right":L(202,301),
    "sleeve-left-top":L(95,151),"sleeve-left-bottom":L(56,252),
    "sleeve-right-top":L(166,149),"sleeve-right-bottom":L(215,254),
    "foot-left":L(100,328),"foot-right":L(153,329),
  },
  occluded:{...hidden,"leg-screen-left":"Knee hidden within existing robe.",
    "leg-screen-right":"Knee hidden within existing robe."},
  notes:[
    "Baseline approximates existing approved source-design art, not an actual reference photo.",
    "Face and hair are noticeably large relative to body compared with the scroll-reader target.",
    "Generic symmetrical puppet is not an appropriate shared identity for all three teachers.",
  ],
};
export function teacherHeadRatio(scene:ShanshuiScene):number {
  const reference=SHANSHUI_TEACHER_MESHES[scene];
  const h=reference.regions.skull?.height;
  if(h===undefined)throw new RangeError("Teacher skull measurement unavailable.");
  return h/reference.figure.height;
}
export function teacherLandmark(
  scene:ShanshuiScene,name:FigureLandmark,
):FigureVec2|null{
  return SHANSHUI_TEACHER_MESHES[scene].landmarks[name]?.point??null;
}
