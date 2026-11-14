/**
 * Original 2.5D head cels authored against the three uploaded *teacher*
 * paintings. These are NEW SVG paths, not traced/rasterized source images.
 *
 * Each profile shares the approved CharacterPresenter speaking, blinking,
 * gaze and head-pivot tracks, but MUST retain its own age, face shape, brows,
 * hair bun, eye angle and visible beard. See ink-shanshui-teacher-mesh.ts.
 */
import type {CharacterShapeAsset,CharacterPathShape} from
  "../../registry/character/definition";
import type {ShanshuiScene} from "../../registry/video/ink-shanshui";
const p=(d:string,fill="none",stroke="$ink",strokeWidth=1,
  opacity=1):CharacterPathShape=>({type:"path",d,fill,stroke,strokeWidth,opacity});
const art=(...shapes:CharacterPathShape[]):CharacterShapeAsset=>({
  kind:"shapes",width:260,height:340,shapes,
  provenance:{license:"CC0-1.0",
    source:"Original Kumiki three-teacher shanshui figure face construction"},
});
const empty=art();
/** Old hermit: angular downward head, assertive brow, expressive age folds
 * and actual two-part moustache/beard. No youthful, cheerful doll features.
 */
const hermit={
  face:art(
    p("M113 75 Q123 64 142 66 Q159 71 164 83 Q164 95 157 111
      Q156 123 145 134 Q132 140 122 130 Q113 119 111 99 Z".replace(/\s+/g," "),
      "$skin","$shadow",1.85),
    p("M113 101 Q111 116 120 127 Q124 132 132 135",
      "none","$skinshade",3,.34),
    p("M155 85 Q160 94 155 102 Q149 106 152 113",
      "none","$shadow",1.5,.62),
    p("M121 88 Q120 95 122 103","none","$shadow",.95,.59),
    p("M152 102 Q147 112 143 118 Q138 122 133 118",
      "none","$ink",1.35,.76),
    p("M120 114 Q119 123 128 130","none","$shadow",1.1,.53),
    p("M128 81 Q135 78 141 80","none","$skinshade",1,.26)),
  hair:art(
    p("M108 90 Q108 62 130 58 Q138 50 136 47 Q134 37 145 36
      Q156 36 159 48 Q161 57 170 64 Q176 74 171 93
      Q162 82 154 77 Q140 67 125 77 Q119 83 108 90 Z".replace(/\s+/g," "),
      "$shadow","$ink",1.55),
    p("M136 48 Q146 39 158 49 Q154 57 144 60",
      "$wash","$shadow",.85,.49),
    p("M112 85 Q125 72 140 73 Q155 73 170 89",
      "none","$ink",2.3,.84),
    p("M156 52 Q169 48 177 52","none","$shadow",1.4,.65),
    p("M163 59 Q173 62 176 67","none","$wash",1.1,.62)),
  brow:art(
    p("M115 96 Q122 91 133 95","none","$ink",3.2),
    p("M145 94 Q154 87 164 90","none","$ink",3.0),
    p("M115 97 Q123 94 128 96","none","$linen",.75,.48)),
  eyesOpen:art(
    p("M118 105 Q126 108 134 102","none","$ink",1.6),
    p("M146 102 Q152 104 160 99","none","$ink",1.7)),
  eyesSoft:art(
    p("M118 106 Q126 110 134 105 M147 105 Q154 105 161 100",
      "none","$ink",1.5)),
  eyesClosed:art(
    p("M117 108 Q126 111 135 107 M146 106 Q154 108 163 103",
      "none","$ink",1.5)),
  beard:art(
    p("M119 123 Q127 129 132 125 Q143 128 150 122
      Q157 132 152 145 L143 169 Q135 163 134 150
      Q122 145 119 123 Z".replace(/\s+/g," "),
      "$shadow","$ink",.9,.8),
    p("M126 126 Q134 132 139 128 M139 128 Q146 131 150 124",
      "none","$ink",2.1,.9),
    p("M132 143 Q136 152 141 167 M144 142 Q147 151 143 164",
      "none","$paper",1.1,.42),
    p("M130 130 Q125 141 133 150","none","$ink",.8,.63)),
  mouth:art(p("M132 126 Q140 129 147 125","none","$ink",1.2,.72)),
  mouthA:art(p("M131 126 Q140 135 147 125 Z","$shadow","$ink",.8,.75)),
  mouthO:art(p("M140 126 Q144 129 141 133 Q138 131 140 126 Z","$shadow","none",0,.8)),
  mouthM:art(p("M131 127 Q139 127 147 126","none","$ink",1.45,.8)),
  mouthSmile:art(p("M133 125 Q141 130 149 123","none","$shadow",1.15,.8)),
  pupilLeft:art(p("M126 106 l1 2","none","$ink",1.1)),
  pupilRight:art(p("M153 103 l1 1","none","$ink",1.1)),
};
/** Young scroll reader: relatively small, slender three-quarter oval, low
 * almond-lid eyes, fine brow and a top knot; no hermit's moustache or beard.
 */
const reader={
  face:art(
    p("M115 76 Q127 65 142 68 Q159 70 164 81
      Q169 93 165 106 Q161 124 148 137
      Q140 144 132 139 Q116 132 112 117 Q108 93 115 76 Z".replace(/\s+/g," "),
      "$skin","$shadow",1.3),
    p("M112 110 Q114 125 129 136 Q136 144 145 140",
      "none","$skinshade",2,.25),
    p("M147 102 Q151 111 145 118 Q142 120 139 118",
      "none","$shadow",.95,.68),
    p("M126 129 Q137 133 148 130","none","$shadow",.7,.29),
    p("M113 99 Q118 85 127 80","none","$linen",1.3,.4)),
  hair:art(
    p("M110 99 Q108 73 119 60 Q130 51 138 53
      Q132 45 136 38 Q145 27 154 32 Q163 38 158 52
      Q174 61 172 91 Q162 81 156 78 Q133 66 115 89 Z".replace(/\s+/g," "),
      "$shadow","$ink",1.4),
    p("M137 47 Q141 35 155 38 Q154 45 151 52",
      "$deep","none",0,.4),
    p("M115 87 Q134 70 153 77 Q162 79 171 91",
      "none","$linen",1.25,.65),
    p("M145 54 Q107 50 85 52 Q61 53 40 42
      Q68 62 98 62 Q125 62 147 58 Z".replace(/\s+/g," "),
      "$shadow","$ink",.8,.65),
    p("M149 56 Q109 63 94 80 Q77 92 61 88
      Q76 106 100 90 Q125 69 149 60 Z".replace(/\s+/g," "),
      "$wash","$shadow",1,.57),
    p("M93 59 Q118 58 142 56","none","$linen",.7,.7)),
  brow:art(
    p("M118 96 Q126 91 135 96","none","$ink",1.8,.75),
    p("M147 94 Q155 90 164 93","none","$ink",1.7,.75)),
  eyesOpen:art(
    p("M117 105 Q126 104 135 106 M147 104 Q155 102 163 104",
      "none","$ink",1.22,.85),
    p("M120 106 Q127 108 133 107 M150 104 Q155 106 160 105",
      "none","$shadow",.55,.36)),
  eyesSoft:art(
    p("M117 106 Q126 108 135 107 M147 105 Q155 107 163 104",
      "none","$ink",1.17,.83)),
  eyesClosed:art(
    p("M117 107 Q125 109 135 107 M147 106 Q155 107 163 105",
      "none","$ink",1.13,.78)),
  beard:empty,
  mouth:art(p("M135 127 Q140 129 147 126","none","$shadow",.95,.75)),
  mouthA:art(p("M137 127 Q143 132 147 126 Z","$shadow","none",0,.74)),
  mouthO:art(p("M142 128 Q145 129 142 132 Q140 131 142 128 Z",
    "$shadow","none",0,.65)),
  mouthM:art(p("M135 129 Q142 129 148 127","none","$ink",1.1,.69)),
  mouthSmile:art(p("M134 125 Q141 131 150 123","none","$shadow",1.05,.74)),
  pupilLeft:art(p("M127 106 l0 1","none","$ink",.8,.68)),
  pupilRight:art(p("M156 104 l0 1","none","$ink",.8,.68)),
};
/** Young mountain walker: similar period attire, distinct lowered lids and
 * strong wind-blown double ribbon. No generic beard, no symmetrical doll face.
 */
const walker={
  face:art(
    p("M112 77 Q123 65 143 67 Q162 68 166 85
      Q169 103 160 120 Q152 140 139 142
      Q128 138 119 129 Q112 117 109 101 Q108 85 112 77 Z".replace(/\s+/g," "),
      "$skin","$shadow",1.4),
    p("M115 119 Q117 131 132 139 Q137 141 142 140",
      "none","$skinshade",1.5,.37),
    p("M150 105 Q148 112 141 119 Q140 121 136 118",
      "none","$shadow",1.0,.68),
    p("M128 129 Q138 132 150 127","none","$shadow",.7,.35)),
  hair:art(
    p("M108 94 Q108 73 124 61 Q134 53 139 51
      Q134 39 145 33 Q155 28 159 41 Q166 48 163 56
      Q173 68 170 93 Q158 81 151 76 Q136 67 117 83 Z".replace(/\s+/g," "),
      "$shadow","$ink",1.6),
    p("M137 49 Q145 34 158 41 Q155 55 144 55",
      "$deep","none",0,.55),
    p("M109 90 Q134 66 151 76 Q164 80 171 92",
      "none","$linen",1.3,.7),
    p("M150 59 Q178 52 199 63 Q215 74 234 70
      Q217 85 195 76 Q173 68 150 65 Z".replace(/\s+/g," "),
      "$shadow","$ink",.85,.7),
    p("M151 64 Q176 71 193 87 Q205 101 233 97
      Q211 112 192 99 Q174 80 149 68 Z".replace(/\s+/g," "),
      "$wash","$shadow",.8,.58),
    p("M176 63 Q201 66 221 72","none","$linen",1,.65)),
  brow:art(
    p("M118 95 Q125 91 134 93 M149 93 Q155 89 162 92",
      "none","$ink",1.6,.82)),
  eyesOpen:art(
    p("M118 105 Q126 105 134 102 M149 103 Q156 103 163 101",
      "none","$ink",1.32,.83),
    p("M121 106 Q127 110 134 104","none","$shadow",.6,.34)),
  eyesSoft:art(
    p("M118 107 Q126 108 135 105 M149 105 Q155 106 162 104",
      "none","$ink",1.15,.82)),
  eyesClosed:art(
    p("M117 109 Q126 110 135 106 M149 107 Q157 107 164 105",
      "none","$ink",1.15,.82)),
  beard:empty,
  mouth:art(p("M134 128 Q140 130 147 126","none","$shadow",1.03,.75)),
  mouthA:art(p("M134 127 Q140 133 147 126 Z","$shadow","none",0,.7)),
  mouthO:art(p("M141 129 Q144 131 142 133 Q139 130 141 129 Z","$shadow","none",0,.72)),
  mouthM:art(p("M135 128 Q141 129 148 126","none","$ink",1.15,.77)),
  mouthSmile:art(p("M133 127 Q142 132 149 125","none","$shadow",1.1,.76)),
  pupilLeft:art(p("M126 106 l0 1","none","$ink",.82,.68)),
  pupilRight:art(p("M157 104 l0 1","none","$ink",.82,.68)),
};
const parts={ "misty-hermit":hermit,"river-scholar":reader,
  "mountain-trail":walker} as const;
export function shanshuiFaceAssets(scene:ShanshuiScene):Record<string,CharacterShapeAsset>{
  const a=parts[scene];
  if(!a)throw new RangeError("Unknown shanshui figure face.");
  return {
    face:a.face,hair:a.hair,brow:a.brow,
    "eyes-open":a.eyesOpen,"eyes-soft":a.eyesSoft,
    "eyes-closed":a.eyesClosed,
    "mouth-rest":a.mouth,"mouth-aa":a.mouthA,
    "mouth-oh":a.mouthO,"mouth-mm":a.mouthM,
    "mouth-smile":a.mouthSmile,
    "pupil-left":a.pupilLeft,"pupil-right":a.pupilRight,
    beard:a.beard,
  };
}
