import { useId } from "react";
import type { ReactNode } from "react";
import { InkWashActor } from "../../registry/video/ink-wash-actor-react";
import type { InkActorCue, InkActorFrame, InkActorPart, InkActorRig } from "../../registry/video/ink-wash-actor";

/** Original unbranded figure with separately authored facial, clothing and limb regions.
 * Coordinates describe a single immutable 360×440 character sheet. No third-party assets.
 */
export const INK_TRAVELER_RIG: InkActorRig = {
  id: "traveler-ink-study",
  revision: "original-silhouette-01",
  width: 360, height: 440, cadence: 2,
  parts: [
    { id:"rear-sash",role:"garment",pivot:[183,267],order:-5 },
    { id:"left-leg",role:"left-leg",pivot:[161,321],order:-4 },
    { id:"right-leg",role:"right-leg",pivot:[207,322],order:-3 },
    { id:"robe",role:"body",pivot:[182,222],order:0 },
    { id:"left-arm",role:"left-arm",parent:"robe",pivot:[140,220],order:1 },
    { id:"right-arm",role:"right-arm",parent:"robe",pivot:[228,219],order:2 },
    { id:"neck",role:"head",parent:"robe",pivot:[184,166],order:3 },
    { id:"hair",role:"hair",parent:"neck",pivot:[184,119],order:0 },
    { id:"eyes",role:"eyes",parent:"neck",pivot:[181,137],order:1 },
    { id:"mouth",role:"mouth",parent:"neck",pivot:[185,158],order:2 },
    { id:"front-sash",role:"garment",parent:"robe",pivot:[187,276],order:5 },
  ],
};
export const INK_TRAVELER_CUES: readonly InkActorCue[] = [
  { id:"enter",kind:"travel",startFrame:6,durationFrames:89,from:[0,0],to:[69,0],steps:3 },
  { id:"blink-on-approach",kind:"blink",startFrame:48,durationFrames:7 },
  { id:"looking-at-viewer",kind:"gaze",startFrame:97,durationFrames:55,target:[.72,-.25] },
  { id:"presenting",kind:"gesture",startFrame:111,durationFrames:70,arm:"right-arm",gesture:"point",degrees:53 },
  { id:"speaking",kind:"speech",startFrame:111,durationFrames:76,visemes:[
    {frame:0,shape:"closed"},{frame:5,shape:"open"},{frame:12,shape:"wide"},{frame:20,shape:"open"},
    {frame:29,shape:"round"},{frame:38,shape:"open"},{frame:50,shape:"closed"},
    {frame:58,shape:"wide"},{frame:68,shape:"closed"}
  ]},
  { id:"blink-during-speech",kind:"blink",startFrame:132,durationFrames:7 },
  { id:"gently-agree",kind:"nod",startFrame:184,durationFrames:34,degrees:7 },
];
const InkTravelerArt = ({part, state, uid}: { part: InkActorPart; state: InkActorFrame; uid: string }):ReactNode => {
  const C = { contour:"#26312e", dark:"#303734", mid:"#66736d", pale:"#b6b8a8", white:"#f2ebdd", red:"#a65c4e" };
  const id = (suffix:string) => "inkact-" + uid + "-" + suffix;
  const outline={stroke:C.contour,strokeLinejoin:"round" as const,strokeLinecap:"round" as const};
  const dryFill = `url(#${id("dry")})`;
  switch (part.id) {
    case "rear-sash":
      return <g {...outline}>
        <path d="M166 292 Q133 340 105 404 Q156 390 178 354 L192 295Z" fill={C.mid} opacity=".58"/>
        <path d="M201 295 Q220 355 252 414 Q220 399 190 358 Z" fill="#737d72" opacity=".45"/>
      </g>;
    case "left-leg":
      return <g {...outline}><path d="M150 311 Q145 347 149 389 L137 401 Q128 416 152 418 L184 416 L183 407 L177 392 L180 325 Z" fill={C.dark} strokeWidth="2.5"/>
        <path d="M150 356 Q161 354 177 360" stroke="#bdc0ac" opacity=".53" strokeWidth="2" fill="none"/>
        <path d="M134 405 Q150 403 177 408" stroke="#191f1d" strokeWidth="2" fill="none"/></g>;
    case "right-leg":
      return <g {...outline}><path d="M193 320 Q197 352 206 397 L194 408 Q194 420 222 422 L252 418 Q259 414 239 404 L224 390 L230 323Z" fill="#394440" strokeWidth="2.6"/>
        <path d="M216 343 Q217 363 221 381" stroke="#a9b0a1" opacity=".42" strokeWidth="2" fill="none"/>
        <path d="M199 410 Q216 405 248 414" stroke="#1e2723" strokeWidth="2" fill="none"/></g>;
    case "robe":
      return <g {...outline}>
        <defs>
          <linearGradient id={id("robe")} x1="15%" y1="12%" x2="95%" y2="85%">
            <stop offset="0" stopColor="#dedfcf"/><stop offset=".38" stopColor="#c2c6b8"/>
            <stop offset=".77" stopColor="#808c80"/><stop offset="1" stopColor="#47544f"/>
          </linearGradient>
          <pattern id={id("dry")} width="24" height="32" patternUnits="userSpaceOnUse">
            <path d="M2 4 l3 12 M11 18 l-2 10 M21 2 l-3 14" stroke="#f0eddf" strokeWidth="1" opacity=".5"/>
            <circle cx="13" cy="9" r="1" fill="#eee9dc" opacity=".6"/>
          </pattern>
        </defs>
        <path d="M148 204 Q175 189 214 201 Q235 205 244 234 Q247 264 230 308 Q227 333 250 370
          Q195 392 129 371 Q151 337 143 307 Q123 258 134 229Z"
          fill={`url(#${id("robe")})`} stroke={C.contour} strokeWidth="3.5"/>
        <path d="M148 208 Q169 248 180 285 Q188 318 184 381" fill="none" stroke="#31403b" strokeWidth="11" opacity=".36"/>
        <path d="M206 208 Q199 258 214 312 L245 366" fill="none" stroke="#f7eedb" strokeWidth="17" opacity=".43"/>
        <path d="M151 214 Q163 278 150 331" fill="none" stroke="#4f5d55" strokeWidth="3.6" opacity=".75"/>
        <path d="M165 221 Q174 235 181 246 Q195 231 205 217" fill="none" stroke="#313e38" strokeWidth="2"/>
        <path d="M144 354 Q191 366 234 351" fill="none" stroke="#374740" opacity=".55" strokeWidth="2.5"/>
        <path d="M136 369 Q173 381 221 373" fill="none" stroke="#28332c" opacity=".52" strokeWidth="2"/>
        <path d="M145 214 Q165 202 210 211" fill="none" stroke={dryFill} strokeWidth="5" opacity=".66"/>
      </g>;
    case "left-arm":
      return <g {...outline}>
        <path d="M143 217 Q115 229 113 281 Q111 294 122 303 L143 298 Q159 264 165 239Z"
          fill={C.pale} stroke={C.contour} strokeWidth="3"/>
        <path d="M115 281 Q130 287 143 282" stroke={C.mid} strokeWidth="5" fill="none" opacity=".6"/>
        <path d="M127 301 L129 312 Q140 316 144 303" fill={C.white} strokeWidth="2.3"/>
      </g>;
    case "right-arm":
      return <g {...outline}>
        <path d="M221 215 Q249 229 255 270 L278 300 Q283 309 274 317 L258 317 Q246 304 236 292 Q210 256 208 230 Z"
          fill={C.mid} stroke={C.contour} strokeWidth="3.3"/>
        <path d="M236 252 Q248 267 253 289" fill="none" stroke="#e5e4d0" strokeWidth="6" opacity=".55"/>
        <path d="M259 313 Q274 318 280 311" fill="none" stroke="#332f2b" strokeWidth="2"/>
        <path d="M258 315 q-3 11 4 14 l8-3 -1-13" fill="#d4c1a8" strokeWidth="2"/>
      </g>;
    case "neck":
      return <g {...outline}>
        <path d="M160 103 Q177 86 196 105 Q219 128 205 161 Q207 181 190 198 L167 192 Q149 174 153 151 Q148 121 160 103 Z"
          fill="#d3cfbb" stroke={C.contour} strokeWidth="2.6"/>
        <path d="M158 130 Q165 156 157 172" stroke={C.mid} strokeWidth="7" opacity=".28" fill="none"/>
        <path d="M175 168 Q186 176 197 168" stroke="#8b897b" strokeWidth="1.4" fill="none" opacity=".48"/>
        <path d="M166 188 Q180 199 193 189" stroke="#414946" strokeWidth="1.5" fill="none"/>
      </g>;
    case "hair":
      return <g {...outline}>
        <path d="M154 142 Q140 113 151 94 Q165 74 199 85 Q215 89 218 108 L214 135
          Q204 112 198 104 Q181 118 156 120 Z"
          fill={C.dark} stroke={C.contour} strokeWidth="2.6"/>
        <path d="M169 94 Q182 87 199 96" stroke="#879188" strokeWidth="2" opacity=".58" fill="none"/>
        <path d="M207 107 q18 5 17 19 q-5 8 -17 3" fill={C.dark}/>
        <path d="M157 122 Q146 132 149 154" stroke={C.contour} strokeWidth="4" fill="none"/>
        <path d="M153 99 Q166 77 192 84" stroke="#a7ada0" strokeWidth="1.2" opacity=".65" fill="none"/>
      </g>;
    case "eyes":
      return state.blink ? <g stroke={C.contour} fill="none" strokeLinecap="round" strokeWidth="2.3">
        <path d="M167 137 Q174 134 180 137 M189 137 Q196 134 202 137"/>
      </g> : <g stroke={C.contour} fill="none" strokeLinecap="round" strokeWidth="2.1">
        <path d="M168 136 Q174 132 180 136 M190 135 Q196 132 201 134"/>
        <circle cx="176" cy="137" r="1.5" fill={C.contour} stroke="none"/>
        <circle cx="196" cy="136" r="1.5" fill={C.contour} stroke="none"/>
      </g>;
    case "mouth": {
      const v = state.viseme;
      if(v === "closed") return <path d="M177 159 Q185 161 191 158" fill="none" stroke={C.contour} strokeWidth="1.7" strokeLinecap="round"/>;
      if(v === "round") return <ellipse cx="184" cy="160" rx="3.3" ry="5.7" fill={C.dark}/>;
      if(v === "wide") return <path d="M174 157 Q185 169 196 156 Q185 164 174 157 Z" fill={C.dark}/>;
      return <ellipse cx="184" cy="159" rx="5.5" ry="4.5" fill={C.dark}/>;
    }
    case "front-sash":
      return <g {...outline}>
        <path d="M151 291 Q183 300 225 289" fill="none" stroke="#4e5b54" strokeWidth="9" opacity=".62"/>
        <path d="M163 290 Q174 294 185 290 Q195 295 207 290" fill="none" stroke="#d9d8c5" strokeWidth="2.2"/>
        <path d="M187 296 Q195 323 183 352" fill="none" stroke="#566156" strokeWidth="4" opacity=".65"/>
      </g>;
    default: return null;
  }
};
export function InkTraveler({ frame, reducedMotion = false, cues=INK_TRAVELER_CUES }: {
  frame: number; reducedMotion?: boolean; cues?: readonly InkActorCue[];
}) {
  const rawId=useId(),uid=rawId.replace(/[^a-z0-9]/gi,"");
  return <InkWashActor rig={INK_TRAVELER_RIG} cues={cues} frame={frame} reducedMotion={reducedMotion}
    label="Original ink-wash traveler walks, looks, blinks, speaks and gestures"
    renderPart={(part,_,state)=>InkTravelerArt({part,state,uid})}/>;
}
