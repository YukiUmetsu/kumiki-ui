/**
 * Original INK5 apprentice design. The silhouette, face, robe, hair and held
 * paper scroll are authored independently of the elder's artwork.
 * The established layered-rig protocol remains unchanged.
 */
import type {
  CharacterDefinition, CharacterPathShape, CharacterShapeAsset,
} from "../../registry/character/definition";
import { INK_TRAVELLER } from "./ink-wash-performer";

const provenance = {
  license: "CC0-1.0", source: "Original Kumiki junior ink-apprentice geometry",
};
const path = (d: string, fill = "none", stroke = "$ink",
  strokeWidth = 1.4, opacity = 1): CharacterPathShape =>
  ({ type: "path", d, fill, stroke, strokeWidth, opacity });
const asset = (...shapes: CharacterPathShape[]): CharacterShapeAsset =>
  ({ kind: "shapes", width: 260, height: 340, shapes, provenance });

/** Young apprentice with broad frontal hair, smaller nose, layered vest and
 * an illustrated scroll instead of the teacher's long brush and beard.
 * Parts preserve the original approved action anchors and joints.
 */
export const INK_APPRENTICE: CharacterDefinition = {
  ...INK_TRAVELLER,
  characterId: "ink-apprentice",
  revision: "ink-apprentice-v1",
  palette: {
    ...INK_TRAVELLER.palette,
    ink: "#27323A", shadow: "#4D6568", wash: "#9FADB0",
    mist: "#D4D9D4", deep: "#50666A", skin: "#D7C9AC",
    skinshade: "#AD977C", linen: "#ECE9DE", twine: "#97775B",
  },
  assets: {
    ...INK_TRAVELLER.assets,
    face: asset(
      path("M112 78 Q121 65 141 65 Q160 65 169 86 Q173 111 155 134 Q139 144 125 137 Q107 125 107 104 Q106 88 112 78 Z","$skin","$shadow",1.3),
      path("M112 101 Q115 124 133 134","none","$skinshade",1.7,.4),
      path("M144 96 Q141 103 139 110 Q142 113 145 112","none","$shadow",1.0,.7),
      path("M115 118 Q127 127 138 125","none","$skinshade",1.1,.45),
    ),
    hair: asset(
      path("M106 98 Q98 85 104 70 Q108 51 124 50 Q143 40 164 51 Q181 64 173 89 L170 106 Q164 81 151 78 Q131 85 116 75 Q117 88 106 98 Z",
        "$ink","none"),
      path("M113 64 Q125 50 146 55 Q163 57 171 72","none","$wash",1.7,.45),
      path("M121 56 Q135 68 149 65 Q158 64 161 58","none","$paper",1.25,.45),
      path("M171 75 Q183 79 184 96 Q179 106 172 100","$shadow","none",0,.85),
      path("M111 94 Q109 106 114 118","none","$shadow",1.15),
    ),
    robe: asset(
      path("M104 139 Q90 154 88 183 Q89 214 85 251 Q81 281 79 300 Q111 310 164 307 Q193 305 194 298 L186 243 Q185 204 179 176 Q172 146 159 139 Z",
        "$wash","$ink",1.7),
      path("M105 151 Q97 187 96 242 L90 297 Q111 305 134 306 L131 164 Z",
        "$mist","none",0,.8),
      path("M157 147 Q164 179 167 211 L186 299 L163 307 Q154 277 147 222 Z",
        "$deep","none",0,.23),
      path("M103 181 Q110 196 128 205 M155 171 Q162 207 171 242",
        "none","$shadow",1.8,.6),
      path("M89 288 Q129 298 187 290","none","$linen",3,.66),
      path("M82 298 Q139 311 193 299","none","$ink",1.3,.7),
      path("M124 154 L133 191 L140 165","none","$linen",2.1,.82),
    ),
    "chin-trace": asset(
      path("M122 132 Q140 146 155 130","none","$skinshade",1.25,.61),
      path("M132 144 Q140 145 148 143","none","$paper",.8,.41),
    ),
    brush: asset(
      path("M222 226 L238 222 L245 251 L229 255 Z","$linen","$shadow",1.1),
      path("M223 227 L232 225 L239 253","none","$paper",1.15,.8),
      path("M230 231 L237 230 M231 235 L240 234 M232 239 L240 238 M233 243 L241 241",
        "none","$shadow",.8,.55),
      path("M221 227 L229 255","none","$twine",1.7),
      path("M239 222 Q243 220 246 224 L252 249 Q248 252 245 251","$mist","$ink",.8),
    ),
  },
  parts: INK_TRAVELLER.parts.map(part => part.id === "beard"
    ? { ...part, id: "chin-trace", asset: "chin-trace" } : part),
  // Visemes, facial parts, hand pivot, activity and blink definitions are
  // separately timed by this character's own instance and cue list.
  skins: {
    slate: {
      palette: {
        wash:"#9FB1BB", deep:"#546C7C", mist:"#D9E0DE",
        cinnabar:"#B45241",
      },
    },
  },
};
