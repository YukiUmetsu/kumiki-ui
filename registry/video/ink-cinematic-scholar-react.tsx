/**
 * INK7 original scholar: layered paper-cut/brush-painted SVG parts, no imported
 * still or trace. The scroll, wrists, sleeves, legs, face and skirt are drawn on
 * separate planes and evaluate solely from the supplied absolute-frame pose.
 *
 * Coordinates are local to an authored 330px-tall character; origin is the feet.
 */
import type { InkCinematicActor, InkCinematicFrame } from "./ink-cinematic-scene";
interface ScholarProps {
  actor:InkCinematicActor;
  pose:InkCinematicFrame;
  ink:number;
  detail:number;
}
const palette={
  dark:"#39342b",ridge:"#655747",contour:"#574d40",shadow:"#94826b",
  cloth:"#d8c2a2",light:"#eee0c9",skin:"#e9d8bb",
};
export function InkCinematicScholar({actor,pose,ink,detail}:ScholarProps){
  const reading=actor.gesture==="read-scroll";
  const step=pose.actorStep;
  const silk=pose.robeSway;
  const arm=pose.armSway;
  const line=palette.dark;
  const stroke={stroke:line,strokeWidth:1.3,strokeLinecap:"round" as const,
    strokeLinejoin:"round" as const};
  return <g data-km-ink-cinematic-scholar={actor.id} data-km-ink-actor-x={pose.actorX.toFixed(3)}
    data-km-ink-actor-y={pose.actorY.toFixed(3)} data-km-ink-actor-gesture={actor.gesture}
    transform={`translate(${pose.actorX.toFixed(3)} ${(pose.actorY+pose.actorBob).toFixed(3)}) scale(${actor.scale})`}>
    {/* A grounded dry contact edge and very light dilute shadow. */}
    <ellipse cx={8} cy={-1} rx={59} ry={5.5} fill="#61574a" opacity={.16*ink}/>
    {/* Separate shoes with short planted intervals; beneath the robe. */}
    <g data-km-ink-actor-leg="far" transform={`translate(${(-18-step*.54).toFixed(2)} 0)`}>
      <path d="M-11 -64 Q-15 -38 -12 -12 L9 -11 Q10 -39 14 -64 Z" fill="#c3ad8f" stroke="#84745d" strokeWidth={1.1}/>
      <path d="M-17 -13 Q-4 -18 10 -12 Q17 -8 14 -2 L-23 -2 Q-28 -6 -17 -13Z"
        fill="#544b3e" {...stroke}/>
      <path d="M-21 -4 Q-2 -1 13 -5" fill="none" stroke="#cdbca1" strokeWidth={1}/>
    </g>
    <g data-km-ink-actor-leg="near" transform={`translate(${(24+step*.62).toFixed(2)} 0)`}>
      <path d="M-8 -65 Q-15 -42 -12 -13 L12 -11 Q10 -36 10 -65 Z" fill="#d3baa0" stroke="#82735e" strokeWidth={1.2}/>
      <path d="M-10 -14 Q5 -19 16 -13 Q27 -7 20 -1 L-15 -1 Q-24 -5 -10 -14Z"
        fill="#615646" {...stroke}/>
      <path d="M-17 -4 Q6 0 21 -5" fill="none" stroke="#dfd2b9" strokeWidth={.9}/>
    </g>
    {/* Rear sash and skirt tails: damp broad masses plus crisp defining edges. */}
    <g data-km-ink-actor-part="robe-tail"
      transform={`rotate(${(-silk*.34).toFixed(3)} -12 -151)`}>
      <path d="M-24 -184 Q-57 -158 -68 -115 Q-75 -70 -103 -33 Q-60 -35 -33 -74 L17 -175Z"
        fill="#b3a084" opacity={.66*ink} stroke={palette.contour} strokeWidth={1.2}/>
      <path d="M-48 -143 Q-60 -96 -84 -45 M-34 -138 Q-37 -83 -62 -48"
        fill="none" stroke="#796754" strokeWidth={1.9} opacity={.54*ink}/>
    </g>
    {/* Broad cloth silhouette: the interior wash is carefully separated from the outline. */}
    <g data-km-ink-actor-part="robe-hem" transform={`rotate(${(silk*.29).toFixed(3)} 8 -159)`}>
      <path d="M-47 -180 Q-59 -131 -57 -97 Q-65 -47 -67 -13 Q-26 -3 20 -12 Q49 -9 65 -16
        Q46 -61 54 -103 L51 -177 Q10 -186 -47 -180Z"
        fill={palette.cloth} stroke={palette.contour} strokeWidth={1.8}/>
      <path d="M-46 -168 Q-54 -108 -48 -55 Q-57 -29 -54 -18 Q-37 -7 -20 -14
        Q-22 -77 -15 -146Z" fill="#b29a79" opacity={.29*ink}/>
      <path d="M-14 -165 Q-11 -107 -6 -62 L-15 -15 Q1 -10 13 -13 Q26 -80 22 -158Z"
        fill="#f5e8d3" opacity={.72}/>
      <path d="M34 -162 Q29 -114 35 -70 L51 -20 Q61 -23 65 -17 Q55 -79 50 -131 Z"
        fill="#8f7b60" opacity={.25*ink}/>
      <path d="M-55 -21 Q-36 -14 -18 -15 Q0 -8 20 -13 Q37 -12 59 -17"
        fill="none" stroke="#51493d" strokeWidth={1.45} opacity={.92*ink}/>
      <path d="M-39 -170 Q-35 -126 -40 -86 Q-45 -47 -35 -23
        M-23 -166 Q-25 -113 -21 -79 Q-23 -45 -15 -18
        M9 -165 Q4 -116 9 -78 Q11 -40 3 -14
        M28 -168 Q34 -123 29 -83 Q27 -49 37 -17"
        fill="none" stroke="#655848" strokeWidth={2} opacity={.47*ink}/>
      <path d="M-29 -128 Q-34 -102 -30 -83 M41 -144 Q42 -108 44 -91"
        fill="none" stroke="#fff7e7" strokeWidth={3.6} opacity={.38}/>
      {detail>.62&&<path d="M-50 -16 Q-21 -9 15 -11 Q43 -7 61 -17 M-8 -24 Q17 -20 37 -23"
        fill="none" stroke="#7f6c55" strokeWidth={.6} strokeDasharray="11 4 24 7" opacity={.5*ink}/>}
      {detail>.62&&<>
        <path d="M-46 -149 Q-52 -113 -50 -79 M-34 -134 Q-39 -97 -32 -62
          M16 -148 Q11 -121 14 -87 M24 -74 Q25 -47 20 -23
          M47 -131 Q44 -92 53 -41"
          fill="none" stroke="#65513f" strokeWidth={.95} opacity={.40*ink}/>
        <path d="M-49 -36 Q-38 -47 -28 -57 M-20 -28 Q-13 -35 -5 -43
          M31 -39 Q40 -46 49 -54" fill="none" stroke="#fdf0d7"
          strokeWidth={2.3} opacity={.36}/>
      </>}
    </g>
    {/* Outer wide sleeves are not alpha ghost sprites; solid silk is behind hands. */}
    <g data-km-ink-actor-part="far-sleeve" transform={`rotate(${(-arm*.8).toFixed(3)} -53 -204)`}>
      <path d="M-39 -250 Q-63 -239 -80 -203 Q-94 -157 -107 -120
        Q-97 -107 -80 -114 Q-57 -137 -43 -180 L-17 -228Z"
        fill="#c8b191" stroke={palette.contour} strokeWidth={1.8}/>
      <path d="M-77 -202 Q-88 -154 -100 -126 Q-92 -121 -87 -125 L-58 -185"
        fill="#8d775e" opacity={.35*ink}/>
      <path d="M-52 -222 Q-72 -179 -87 -136 M-66 -211 Q-79 -157 -92 -130"
        fill="none" stroke="#695b4a" strokeWidth={1.55} opacity={.74*ink}/>
      <path d="M-100 -124 Q-93 -118 -82 -125" fill="none" stroke="#eee1c9" strokeWidth={2.4}/>
    </g>
    {/* Center bodice; layered crossing collar and belt retain drawing clarity. */}
    <path d="M-44 -249 Q-19 -264 6 -267 Q31 -259 48 -246
      Q56 -226 55 -195 Q58 -171 49 -153 Q7 -144 -43 -157
      Q-58 -191 -55 -216Z"
      fill="#dac5a7" stroke={palette.contour} strokeWidth={1.8}/>
    <path d="M-44 -247 Q-31 -210 -16 -186 L9 -170 Q28 -213 32 -258"
      fill="#f2e3cc" opacity={.66}/>
    <path d="M-35 -253 Q-19 -227 9 -196 Q15 -188 25 -188
      M31 -252 Q20 -215 -4 -187"
      fill="none" stroke="#51483c" strokeWidth={3.7} opacity={.85*ink}/>
    <path d="M-31 -249 Q-17 -222 11 -198 M24 -249 Q17 -230 -1 -206"
      fill="none" stroke="#fdf5e4" strokeWidth={2.2} opacity={.87}/>
    <path d="M-44 -184 Q-3 -173 49 -184 L51 -168 Q1 -160 -47 -172Z"
      fill="#7c674f" opacity={.86*ink}/>
    <path d="M-44 -175 Q4 -171 49 -177" stroke="#e6d7bd" strokeWidth={1.4} fill="none"/>
    <path d="M0 -173 Q9 -162 11 -153 L2 -137 L-9 -153Z" fill="#b8a186"
      stroke="#635748" strokeWidth={1}/>
    <path d="M-44 -210 Q-48 -194 -40 -184 M51 -221 Q56 -201 49 -182"
      stroke="#91816a" strokeWidth={1.5} opacity={.56*ink} fill="none"/>
    {/* Front sleeves, sleeve surfaces and cuffs travel independently from center mass. */}
    <g data-km-ink-actor-part="near-sleeve" transform={`rotate(${(arm*.75).toFixed(3)} 43 -225)`}>
      <path d="M34 -249 Q55 -249 67 -225 Q81 -185 96 -147 Q88 -132 72 -135
        Q59 -150 45 -184 L18 -236Z"
        fill="#d4bfa0" stroke="#554b3d" strokeWidth={1.8}/>
      <path d="M60 -221 Q74 -182 89 -149 L79 -145 Q65 -177 54 -202Z"
        fill="#8b795f" opacity={.26*ink}/>
      <path d="M45 -226 Q62 -198 79 -149 M55 -238 Q69 -213 81 -172"
        stroke="#655746" strokeWidth={1.65} opacity={.61*ink} fill="none"/>
      <path d="M56 -221 Q71 -188 83 -151 M48 -223 Q61 -193 66 -176"
        stroke="#9b866b" strokeWidth={3.2} opacity={.27*ink} fill="none"/>
      <path d="M42 -229 Q52 -208 58 -194"
        stroke="#f6e9d0" strokeWidth={2.4} opacity={.56} fill="none"/>
      <path d="M76 -139 Q86 -136 94 -144" fill="none" stroke="#f7ead3" strokeWidth={2.7}/>
    </g>
    {/* Fingers/props must be in front of solid sleeves, never translucent. */}
    {reading?<g data-km-ink-actor-part="scroll">
      {/* Far wrist and open reading hand. */}
      <path d="M-51 -195 Q-54 -183 -41 -180 L-31 -193 L-38 -202Z" fill={palette.skin}
        stroke={palette.contour} strokeWidth={1.3}/>
      <path d="M-43 -198 Q-38 -207 -32 -202 Q-26 -196 -29 -190 L-40 -190Z"
        fill="#efdfc2" stroke="#5d5042" strokeWidth={1.2}/>
      {/* Scroll slightly rotates between hands; paper area remains opaque. */}
      <g transform={`rotate(${pose.scrollTilt.toFixed(3)} 6 -208)`}>
        <path d="M-35 -221 Q-10 -211 15 -215 Q39 -215 52 -227
          L47 -179 Q16 -184 -13 -178 Q-26 -182 -37 -185Z"
          fill="#f9f0dc" stroke="#665b4d" strokeWidth={1.3}/>
        <path d="M-36 -222 Q-40 -224 -39 -218 L-37 -182 Q-31 -179 -29 -185 L-30 -220Z"
          fill="#c5ae8d" stroke="#655748" strokeWidth={1.1}/>
        <path d="M50 -229 Q56 -231 57 -224 L54 -180 Q47 -177 46 -183 L49 -228Z"
          fill="#c5ae8d" stroke="#645748" strokeWidth={1.1}/>
        <circle cx={-34} cy={-224} r={3.3} fill="#7f6951" stroke="#50463a" strokeWidth={.7}/>
        <circle cx={53} cy={-228} r={3.5} fill="#7f6951" stroke="#50463a" strokeWidth={.7}/>
        {detail>.42&&<>
          <path d="M-21 -208 Q-9 -208 5 -211 M-18 -201 Q-6 -199 7 -202
            M11 -209 Q23 -210 35 -214 M12 -202 Q23 -203 34 -207"
            stroke="#9c886b" strokeWidth={.85} opacity={.38*ink} fill="none"/>
          <rect x={13} y={-192} width={9} height={9} rx={.7}
            fill="#a4614b" opacity={.52}/>
        </>}
      </g>
      {/* Near fingers in front of the parchment roller. */}
      <path d="M42 -201 Q43 -210 51 -210 Q58 -207 55 -201 L52 -188
        Q47 -184 43 -190Z" fill="#ebd5b7" stroke="#534a3e" strokeWidth={1.3}/>
      <path d="M45 -205 Q47 -206 49 -203 M46 -198 Q49 -200 51 -198"
        stroke="#8b7965" strokeWidth={.9} fill="none"/>
    </g>:<g data-km-ink-actor-part="contemplating-hand">
      <path d="M-59 -184 Q-63 -190 -56 -202 Q-49 -220 -39 -235
        Q-32 -239 -29 -232 Q-32 -224 -41 -211 Q-42 -198 -38 -196
        Q-34 -190 -42 -185Z" fill="#ead8b8" stroke="#625548" strokeWidth={1.4}/>
      <path d="M-41 -217 Q-37 -225 -33 -229 M-49 -201 Q-45 -209 -39 -213"
        stroke="#9d8d78" strokeWidth={.95} fill="none"/>
    </g>}
    {/* Neck and face: ink-defined features, a continuous character rather than
        a static postcard silhouette painted on top of the moving landscape. */}
    <g data-km-ink-actor-part="head"
      transform={`translate(0 -282) rotate(${(pose.armSway*.17).toFixed(3)} 0 0)`}>
      <path d="M-10 12 L-8 -11 L20 -16 L24 10 L13 24Z"
        fill="#dfc9aa" stroke="#665748" strokeWidth={1.1}/>
      <path d="M-20 -49 Q-27 -32 -24 -17 Q-18 2 -4 14
        Q8 21 21 6 Q33 -12 32 -29 Q28 -48 19 -53
        Q-3 -63 -20 -49Z"
        fill={palette.skin} stroke={palette.dark} strokeWidth={1.65}/>
      <path d="M-21 -27 Q-16 -5 -9 4" fill="none" stroke="#c8b296" strokeWidth={3} opacity={.4}/>
      {/* Soft lateral nose profile, two deliberately asymmetrical eyes. */}
      <path d="M-14 -21 Q-8 -25 -3 -22 M10 -26 Q16 -29 22 -28"
        fill="none" stroke="#554a3e" strokeWidth={1.8}/>
      <path d="M-13 -18 Q-9 -15 -3 -18 M10 -22 Q16 -19 22 -23"
        stroke="#51483d" strokeWidth={1} fill="none"/>
      <path d="M-12 -17 L-9 -16 M12 -21 L15 -20"
        stroke="#3f362e" strokeWidth={1.15} fill="none"/>
      <path d="M-14 -25 Q-8 -29 -1 -27 M9 -30 Q16 -33 22 -30"
        stroke="#94806a" strokeWidth={.8} fill="none" opacity={.52}/>
      <path d="M1 -21 Q-1 -10 5 -8 L10 -10" stroke="#8f7965" strokeWidth={.9} fill="none"/>
      <path d="M4 1 Q11 2 17 -1" stroke="#735b4e" strokeWidth={1.1} fill="none"/>
      {!reading&&<g opacity={.73*ink} fill="none" stroke="#5d5042" strokeLinecap="round">
        <path d="M-2 1 Q7 -1 13 1 M15 1 Q21 4 23 -1" strokeWidth={1.1}/>
        <path d="M4 9 Q8 20 13 27 M17 6 Q18 19 11 30" strokeWidth={.94}/>
      </g>}
      <path d="M-21 -52 Q-14 -65 -4 -70 Q22 -79 33 -56
        L31 -45 Q6 -53 -22 -42Z"
        fill="#473d32" stroke="#342f29" strokeWidth={1.7}/>
      <path d="M-14 -55 Q-3 -61 16 -57 M-17 -47 Q3 -54 27 -49"
        stroke="#a38e73" strokeWidth={1.35} opacity={.56} fill="none"/>
      <path d="M-11 -70 Q-9 -88 1 -90 Q16 -91 20 -73 L18 -69Z"
        fill="#4b4236" stroke="#312f29" strokeWidth={1.4}/>
      <path d="M10 -87 Q18 -84 18 -73" stroke="#95846d" strokeWidth={1.2} fill="none" opacity={.68}/>
      {/* Scholar's cap ribbon: separate flutter around a stable head pivot. */}
      <g transform={`rotate(${(-silk*.3).toFixed(3)} 28 -44)`}>
        <path d="M27 -47 Q52 -44 58 -52 Q47 -41 36 -30 L25 -37Z"
          fill="#584b3c" stroke="#4b4034" strokeWidth={1}/>
        <path d="M33 -40 Q48 -28 54 -24 L37 -31Z"
          fill="#7a6853" opacity={.82}/>
      </g>
      {detail>.75&&<path d="M-17 -11 Q-12 2 -5 6" stroke="#ffedd2" strokeWidth={2.1}
        opacity={.5} fill="none"/>}
    </g>
  </g>;
}
