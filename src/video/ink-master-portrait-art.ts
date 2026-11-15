/**
 * Original classical Chinese-ink master portrait: one 260×340 ArtCraft sheet,
 * not imported art or a procedural recoloring of a generic avatar.
 *
 * Construction studies: Liang Kai, Li Bai Strolling (Tokyo National Museum),
 * Liang Kai, Immortal in Splashed Ink (National Palace Museum). Those paintings
 * are method/pressure/negative-space references only; no coordinates or pixels
 * are traced from an external image.
 *
 * Anchors MUST stay at the existing rig's eyes (143,102), mouth (142,124),
 * hair/bun (140,74) and head pivot (139,124). Never change the animator just
 * to hide a poorly joined cel.
 */
import type { CharacterAsset, CharacterPathShape } from "../../registry/character/definition";

const p=(d:string,fill="none",stroke="none",strokeWidth=0,opacity=1):CharacterPathShape=>({
  type:"path",d,fill,stroke,strokeWidth,opacity,
});

/** The chiaroscuro is ink deposited on *opaque* warm-paper skin, not a
 * translucent face through which the mountain backdrop can be seen. Stroke
 * masses are asymmetric, with one dry temple and a loaded shadow cheek.
 */
export const MASTER_PORTRAIT_STUDY:Readonly<Record<string,readonly CharacterPathShape[]>>={
  face:[
    p("M116 73 C122 66 136 63 148 68 C159 73 165 82 168 93 C171 105 170 112 166 120 C162 133 153 139 143 141 C131 143 121 134 115 125 C109 115 108 97 111 85 C112 81 113 77 116 73 Z","$skin","$shadow",1.12),
    // Bone-less shadow beneath the near temple and cheek.
    p("M111 88 C114 90 114 99 116 108 C119 118 124 124 132 129 C122 128 114 120 111 112 C108 105 108 95 111 88 Z","$skinshade","none",0,.27),
    p("M154 76 C161 82 167 92 167 100 C170 111 163 123 158 128 C161 115 160 103 157 93 Z","$skinshade","none",0,.17),
    p("M114 89 C115 77 124 72 135 71","none","$skinshade",1.9,.43),
    // Asymmetrical upper cheek bones: a pale drawing stroke, not two badges.
    p("M116 107 C121 111 127 113 133 112","none","$skinshade",1.18,.35),
    p("M156 109 C161 112 164 115 162 121","none","$skinshade",.86,.38),
    // Bridge and wing of the nose have one connected calligraphic turn.
    p("M146 92 C149 99 151 104 150 108 C150 110 148 112 145 111 C142 110 140 111 139 110","none","$shadow",1.25,.85),
    p("M141 110 C144 112 147 112 149 110","none","$skinshade",.82,.58),
    p("M118 123 C120 129 125 134 132 136","none","$shadow",.8,.46),
    p("M157 127 C151 135 146 138 140 138","none","$skinshade",.75,.49),
    // Small nonparallel dry marks imply skin planes without cartoon outlines.
    p("M112 116 L117 122 M164 117 L161 123","none","$shadow",.54,.37),
    p("M121 84 C128 80 134 81 139 83","none","$paper",.86,.37),
  ],
  hair:[
    // Porous hairline with a receding right temple, crown, and two uneven locks.
    p("M109 90 C105 78 108 63 117 56 C124 50 136 47 149 49 C162 48 173 58 174 70 C174 84 171 94 167 104 C162 90 161 83 158 78 C150 75 143 79 137 81 C128 77 120 82 112 93 Z","$ink","none"),
    p("M111 87 C111 74 117 62 128 58 C138 54 148 55 155 60","none","$wash",2.1,.54),
    p("M118 75 C127 63 140 60 151 63","none","$mist",1.04,.46),
    p("M107 86 C107 93 109 101 113 108","none","$shadow",1.5,.82),
    p("M171 77 C173 92 169 104 164 113","none","$shadow",2.0,.87),
    p("M116 58 C122 50 133 47 142 47","none","$shadow",1.1,.83),
    // Hair gathered into an organic tied knot rather than a grey capsule.
    p("M133 52 C130 44 127 34 133 28 C137 23 143 23 147 27 C152 23 159 29 160 36 C162 42 157 49 154 53 Z","$ink","$shadow",.8),
    p("M138 28 C141 34 142 43 142 48","none","$wash",1.15,.56),
    p("M149 28 C154 35 153 43 150 49","none","$mist",.95,.38),
    p("M132 49 C141 54 152 52 160 57","none","$shadow",2.05,.90),
    p("M117 62 L111 78 M162 61 L170 76","none","$wash",.84,.59),
    p("M132 67 C143 69 150 69 160 75","none","$paper",.7,.27),
  ],
  brow:[
    // Loaded, asymmetric brow masses: never two identical emoji arches.
    p("M118 96 C124 92 132 91 139 94 C131 94 125 97 119 98 Z","$ink","none"),
    p("M146 94 C151 89 158 90 166 93 C161 93 154 94 148 96 Z","$ink","none"),
    p("M119 99 L123 97 M159 96 L166 94","none","$shadow",.66,.68),
  ],
  "eyes-open":[
    p("M118 102 C124 99 130 99 135 102 C131 102 126 102 122 104","none","$ink",1.3,.99),
    p("M121 106 C125 108 132 107 135 104","none","$shadow",.68,.58),
    p("M147 101 C153 98 160 99 165 102 C160 101 152 103 149 105","none","$ink",1.27,.99),
    p("M150 106 C155 107 161 106 164 104","none","$shadow",.70,.52),
    p("M118 103 L116 101 M165 102 L167 100","none","$ink",.78,.68),
  ],
  "eyes-soft":[
    p("M118 102 C123 99 129 100 136 102 C131 104 125 104 120 105","none","$ink",1.55),
    p("M148 102 C154 99 161 100 165 102 C161 104 155 105 150 104","none","$ink",1.42),
    p("M120 107 C125 108 132 107 135 105 M150 107 C155 108 162 107 165 104","none","$shadow",.58,.48),
  ],
  "eyes-closed":[
    p("M117 103 C123 106 131 107 136 102","none","$ink",1.55),
    p("M147 102 C153 106 162 107 166 101","none","$ink",1.55),
    p("M125 106 L126 108 M158 107 L159 109","none","$shadow",.72,.53),
  ],
  "pupil-left":[
    p("M126 101 C127 100 130 100 131 102 C131 105 128 106 127 104 Z","$ink","none"),
    p("M128 101 L129 101.4","none","$linen",.54,.57),
  ],
  "pupil-right":[
    p("M154 100 C156 99 158 100 159 102 C159 104 157 105 155 104 Z","$ink","none"),
    p("M156 100 L157 100.8","none","$linen",.50,.54),
  ],
  "mouth-rest":[
    p("M135 125 C139 123 142 125 145 124 C147 124 149 123 151 121","none","$shadow",1.05,.9),
    p("M139 127 C143 128 147 127 148 126","none","$skinshade",.65,.65),
    p("M134 123 L135 125 M150 121 L151 122","none","$ink",.56,.55),
  ],
  "mouth-mm":[
    p("M134 124 C140 123 145 126 151 122","none","$ink",1.25),
    p("M137 127 C143 129 147 126 150 125","none","$skinshade",.64,.52),
  ],
  "mouth-smile":[
    p("M134 121 C140 126 145 127 150 119","none","$shadow",1.12),
    p("M137 127 C143 130 147 127 149 123","none","$skinshade",.64,.52),
  ],
  "mouth-aa":[
    p("M136 122 C139 121 145 121 148 123 C148 129 145 131 142 131 C138 130 136 127 136 122 Z","$shadow","none",0,.88),
    p("M138 123 C141 124 145 124 147 123","none","$skinshade",.8,.72),
    p("M140 130 L145 130","none","$skinshade",.69,.65),
  ],
  "mouth-oh":[
    p("M140 122 C144 120 147 124 147 128 C146 131 141 132 139 128 C138 126 138 123 140 122 Z","$shadow","none",0,.94),
    p("M140 122 C143 123 145 123 146 125","none","$skinshade",.7,.59),
  ],
  "hand-far":[
    // A jointed palm and distinct curled fingers, not the former single
    // mitten oval. Its negative gaps remain paper, not transparent paint.
    p("M42 236 C45 233 48 233 52 233 C57 233 60 236 62 240 C64 244 60 247 55 248 C51 250 45 250 42 246 C39 243 40 239 42 236 Z","$skin","$shadow",.87),
    p("M42 238 C45 237 49 236 52 237","none","$skinshade",.72,.74),
    p("M48 240 C51 241 54 241 57 240","none","$shadow",.66,.72),
    p("M46 244 C50 246 54 246 57 244","none","$skinshade",.71,.68),
    p("M54 234 C59 235 61 239 61 242","none","$shadow",.73,.59),
    p("M42 241 C44 245 47 247 50 248","none","$linen",.56,.64),
  ],
  "hand-near":[
    // Brush-grip thumb is separate from the curled index finger. The real
    // prop remains a child of near-hand and is not painted onto this cel.
    p("M219 236 C222 231 225 231 229 233 C233 232 237 235 239 239 C242 244 238 249 233 251 C227 252 221 250 219 246 C217 241 217 239 219 236 Z","$skin","$shadow",.84),
    p("M222 236 C225 234 230 235 232 239 C233 241 231 243 228 243","none","$skinshade",1.03,.76),
    p("M226 243 C230 244 234 243 236 240","none","$shadow",.70,.74),
    p("M223 247 C227 248 231 248 233 246","none","$skinshade",.72,.60),
    p("M234 234 C237 237 238 240 237 243","none","$shadow",.74,.62),
    p("M219 241 C220 245 222 247 226 250","none","$linen",.59,.58),
    p("M230 238 C232 236 234 237 235 239","none","$shadow",.64,.85),
  ],
  beard:[
    // Six separately released hairs with negative-paper channels, never a
    // triangular plug beneath the chin. Facial identity stays distinct
    // from the clean-shaven apprentice.
    p("M126 130 C129 135 134 139 137 147 C139 154 140 161 141 172 C145 166 147 154 148 147 C151 140 156 135 156 130 C145 141 137 142 126 130 Z","$shadow","none",0,.42),
    p("M131 138 C135 146 139 152 139 164","none","$ink",1.05,.80),
    p("M137 143 C140 150 142 158 141 173","none","$shadow",.95,.80),
    p("M144 141 C145 149 147 153 145 166","none","$ink",1.1,.79),
    p("M149 139 C154 147 151 154 148 160","none","$shadow",.83,.71),
    p("M127 132 C125 137 130 143 134 146","none","$shadow",.75,.61),
    p("M156 133 C158 139 154 146 151 149","none","$ink",.70,.59),
    p("M137 151 L139 163 M146 151 L145 160","none","$paper",.69,.49),
    p("M132 144 C133 149 135 153 135 156","none","$wash",.66,.64),
    p("M150 144 C153 150 152 155 149 158","none","$wash",.68,.58),
  ],
};

/** Sparse structural wardrobe marks replace the old flat chest stripes.
 * These strokes are built on the existing rig's 260×340 shoulder/cuff/hem
 * coordinates; every wash belongs to the BODY rather than the camera.
 */
export const MASTER_ROBE_STUDY:readonly CharacterPathShape[]=[
  p("M101 139 C91 153 89 174 86 195 C85 224 84 256 76 287 C73 296 77 299 82 303 C109 309 141 312 166 309 C180 308 195 304 201 300 C198 276 195 249 189 221 C184 193 182 168 169 147 C151 134 121 132 101 139 Z","$wash","$shadow",1.68),
  p("M102 145 C93 161 94 190 91 218 C91 253 85 284 84 299 C97 301 107 306 122 307 C124 265 130 214 130 170 C120 156 114 149 102 145 Z","$mist","none",0,.67),
  p("M160 148 C174 163 178 188 181 213 C190 249 191 278 196 296 C183 304 169 307 152 306 C159 268 154 229 149 191 Z","$deep","none",0,.16),
  p("M101 150 C94 177 93 217 89 245 C91 273 87 290 81 300","none","$ink",1.06,.62),
  p("M118 167 C121 195 116 230 115 261 C113 277 109 294 105 303","none","$shadow",.84,.55),
  p("M137 170 C130 199 131 228 133 255 C134 279 135 296 133 308","none","$shadow",1.5,.56),
  p("M160 164 C160 194 163 222 167 249 C173 279 179 294 184 300","none","$shadow",1.23,.61),
  p("M177 178 C182 208 185 234 187 258","none","$skinshade",.95,.40),
  p("M94 252 C100 256 113 257 121 255","none","$paper",1.5,.36),
  p("M155 258 C163 261 174 260 181 256","none","$linen",1.34,.55),
  p("M82 298 C99 306 122 310 145 309 C163 309 185 306 200 298","none","$ink",1.5,.79),
  p("M92 290 C106 300 126 303 141 303","none","$linen",1.02,.55),
  p("M153 304 C172 304 182 299 192 295","none","$shadow",.88,.57),
  // Wet-on-dry volume washed into left shoulder, not a vector radial gradient.
  p("M103 148 C110 154 116 164 116 174 C113 210 107 232 104 249 C101 225 101 190 100 169 Z","$shadow","none",0,.11),
  p("M163 169 C174 196 177 226 177 253 C172 238 164 208 158 191 Z","$deep","none",0,.10),
];

/** At detail=0 the original historical demo survives byte-for-byte. At
 * high detail this optional master study replaces the cartoon geometry
 * without changing any rig topology, references, metadata or part pivots.
 */
export function masterPortraitAssets(
  source: Readonly<Record<string,CharacterAsset>>,detail:number,
): Record<string,CharacterAsset> {
  const assets:Record<string,CharacterAsset>={...source};
  if(detail<.55)return assets;
  for(const [key,shapes] of Object.entries({...MASTER_PORTRAIT_STUDY,robe:MASTER_ROBE_STUDY})){
    const base=assets[key];
    if(!base||base.kind!=="shapes")
      throw new RangeError("INK classical master requires original rig part: "+key);
    // No external textures, no authoring mutation and no reused file provenance.
    assets[key]={...base,shapes:[...shapes]};
  }
  return assets;
}
