/** RAG cinematic cold open: one 12-second causal transformation.
 *
 * RAG expands to Retrieval-Augmented Generation:
 *  R -> select real source text,
 *  A -> ADD that context to the original question (never modify the PDF),
 *  G -> generate a source-linked answer.
 *
 * This stage is pure frame math, so scrub, playback, and export render exactly
 * the same sequence. SVG geometry stays within the 1600x729 authoring region.
 * All moving tokens are semantic data, never decorative connecting dots.
 */
import type { ReactNode } from "react";
import { RAG_CHUNKS } from "./rag-domain";

/** Exactly the same source passage later retrieved as C01; line breaks only. */
export const RAG_HOOK_SOURCE_LINES = [
  "Up to five unused PTO days",
  "may be carried into the",
  "next calendar year.",
] as const;
if (RAG_HOOK_SOURCE_LINES.join(" ") !== RAG_CHUNKS[0].text)
  throw new Error("The hook must quote the same evidence as retrieval.");
export const RAG_HOOK_FRAMES = 360;
export const RAG_HOOK_BEATS = {
  wordmark: [0, 68],
  expand: [49, 112],
  retrieve: [96, 187],
  augment: [171, 265],
  generate: [250, 360],
} as const;
const F = "'Geist Variable', Inter, system-ui, sans-serif";
const M = "ui-monospace, SFMono-Regular, Menlo, monospace";
const K = {
  bg:"#071725", white:"#F3FAFE", subdued:"#A7C0D0",
  mint:"#70EBD4", gold:"#FFD08A", violet:"#ADA4FF", red:"#DB4459",
  border:"#41667A", surface:"#102A3B",
} as const;
const clamp = (t:number) => Math.max(0,Math.min(1,t));
const ease = (t:number) => { const x=clamp(t); return x*x*(3-2*x); };
export const ragHookReveal = (frame:number,start:number,length:number) =>
  ease((frame-start)/length);
export const ragHookStageAt = (frame:number) =>
  frame < 85 ? "title" :
  frame < 174 ? "retrieve" :
  frame < 258 ? "augment" : "generate";

const opacity = (frame:number,at:number,length=22) =>
  ragHookReveal(frame,at,length);
const card = (x:number,accent:string,active:boolean) => <g>
  <rect x={x} y={275} width={430} height={330} rx={27}
    fill={K.surface} stroke={active?accent:K.border} strokeWidth={active?2.8:1.7}
    strokeOpacity={active?.94:.75}/>
  <path d={"M "+(x+27)+" 276 H "+(x+401)}
    stroke={accent} strokeWidth={3} strokeOpacity={active?.88:.45}/>
</g>;
function W({x,y,size,color=K.white,weight=600,children,mono=false,anchor="start"}:{
  x:number;y:number;size:number;color?:string;weight?:number;
  children:ReactNode;mono?:boolean;anchor?:"start"|"middle";
}) {
  return <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight}
    textAnchor={anchor} fontFamily={mono?M:F}>{children}</text>;
}
function Retrieve({frame:f}:{frame:number}) {
  const appear=opacity(f,94,25);
  const highlight=opacity(f,131,22);
  return <g opacity={appear}>
    {card(91,K.mint,f<182)}
    <W x={118} y={321} size={22} color={K.mint} mono>01 / RETRIEVE</W>
    <g transform="translate(157 344)">
      <rect x="0" y="1" width="293" height="208" rx="9"
        fill="#F5F8FB" stroke="#D4E2EC" strokeWidth="2"/>
      <path d="M 261 1 V 33 H 293" fill="#E3EDF4" stroke="#C6D7E3"
        strokeWidth="1.6"/>
      <rect x="17" y="17" width="68" height="34" rx="6" fill={K.red}/>
      <W x={27} y={41} size={20} color="#FFF" weight={790}>PDF</W>
      <W x={17} y={86} size={21} weight={745} color="#213849">
        Employee handbook
      </W>
      <W x={17} y={114} size={16} weight={650} color="#5B7182">
        Section 4 · Paid time off
      </W>
      <rect x="13" y="128" width="267" height="77" rx="8"
        fill="#C6F3E8" fillOpacity={.65+.33*highlight}
        stroke="#159F83" strokeOpacity={.3+.65*highlight}/>
      {RAG_HOOK_SOURCE_LINES.map((line,i)=><W key={line} x={21}
        y={152+i*22} size={16} color="#164A45" weight={665}>
        {line}
      </W>)}
    </g>
  </g>;
}
function Augment({frame:f}:{frame:number}) {
  const appear=opacity(f,169,23);
  const source=opacity(f,225,17);
  return <g opacity={appear}>
    {card(585,K.gold,f>=174&&f<260)}
    <W x={612} y={321} size={22} color={K.gold} mono>02 / AUGMENT</W>
    <W x={619} y={370} size={16} color={K.subdued} mono>
      QUESTION
    </W>
    <W x={619} y={407} size={23} weight={625}>
      How many PTO days
    </W>
    <W x={619} y={436} size={23} weight={625}>
      can I carry over?
    </W>
    <g opacity={source}>
      <rect x="612" y="463" width="376" height="104" rx="15"
        stroke={K.mint} strokeOpacity=".7" fill="#153A3B" />
      <W x={633} y={493} size={17} color={K.mint} mono>
        + RETRIEVED CONTEXT
      </W>
      <W x={633} y={528} size={21} weight={650}>
        Up to five PTO days
      </W>
      <W x={633} y={553} size={19} color={K.subdued}>
        Employee handbook · Section 4
      </W>
    </g>
  </g>;
}
function Generate({frame:f}:{frame:number}) {
  const appear=opacity(f,255,22);
  const answer=opacity(f,287,40);
  return <g opacity={appear}>
    {card(1079,K.violet,true)}
    <W x={1105} y={321} size={22} color={K.violet} mono>
      03 / GENERATE
    </W>
    <g opacity={answer}>
      <W x={1111} y={395} size={24} color={K.white} weight={645}>
        Up to five unused
      </W>
      <W x={1111} y={433} size={24} color={K.white} weight={645}>
        PTO days can carry
      </W>
      <W x={1111} y={471} size={24} color={K.white} weight={645}>
        into the next year.
      </W>
      <rect x="1107" y="510" width="363" height="59" rx="13"
        fill="#203B43" stroke={K.mint} strokeOpacity=".7"/>
      <W x={1123} y={548} size={19} color={K.mint} weight={710}>
        Employee handbook · Section 4
      </W>
    </g>
  </g>;
}
/** Single source-linked data packet transitioning to the prompt.
 * It exists ONLY between frames 195 and 238, then becomes the context card.
 */
function RetrievedContextTransfer({frame:f}:{frame:number}) {
  if(f<193||f>242)return null;
  const t=ragHookReveal(f,195,38);
  const outgoing=ragHookReveal(f,232,10);
  const x=450+(612-450)*t, y=494+(463-494)*t;
  return <g opacity={1-outgoing} transform={"translate("+x+" "+y+")"}>
    <rect width="218" height="49" rx="14"
      fill="#1D4845" stroke={K.mint} strokeWidth="2"/>
    <W x={16} y={31} size={20} color={K.mint} weight={700}>
      PTO policy · Section 4
    </W>
  </g>;
}
/** The prompt itself is the thing that moves into generation. */
function PromptTransfer({frame:f}:{frame:number}) {
  if(f<251||f>296)return null;
  const t=ragHookReveal(f,253,34);
  const fade=ragHookReveal(f,284,12);
  const x=976+(1107-976)*t, y=448+(364-448)*t;
  return <g opacity={1-fade} transform={"translate("+x+" "+y+")"}>
    <rect width="175" height="49" rx="14" fill="#433E57"
      stroke={K.gold} strokeWidth="2"/>
    <W x={19} y={31} size={20} color={K.gold} weight={720}>
      Q + EVIDENCE
    </W>
  </g>;
}
/** The three acronym glyphs physically become the three steps.
 * This is a typographic match cut, not an unmotivated transition particle.
 */
function AcronymDock({frame:f}:{frame:number}) {
  if(f<51||f>116)return null;
  const t=ragHookReveal(f,54,52);
  const fade=1-ragHookReveal(f,97,19);
  const glyphs=[
    {letter:"R",color:K.mint,from:[569,417],to:[118,332]},
    {letter:"A",color:K.gold,from:[778,417],to:[610,332]},
    {letter:"G",color:K.violet,from:[988,417],to:[1104,332]},
  ] as const;
  return <g opacity={fade}>
    {glyphs.map(v=>{
      const x=v.from[0]+(v.to[0]-v.from[0])*t;
      const y=v.from[1]+(v.to[1]-v.from[1])*t-50*Math.sin(Math.PI*t);
      const size=204+(37-204)*t;
      return <text key={v.letter} x={x} y={y}
        fill={v.color} fontFamily={F} fontWeight="810"
        fontSize={size} style={{paintOrder:"stroke",stroke:K.bg,strokeWidth:2}}>
        {v.letter}
      </text>;
    })}
  </g>;
}
export function RagHook({frame}:{frame:number}) {
  const f=Math.max(0,Math.min(RAG_HOOK_FRAMES-1,Math.trunc(frame)));
  const splash=1-ragHookReveal(f,49,26);
  const hero=ragHookReveal(f,3,30);
  const expand=ragHookReveal(f,56,31);
  const phase=ragHookStageAt(f);
  return <g data-rag-cold-open="">
    <defs>
      <linearGradient id="rag-hook-letters" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={K.mint}/>
        <stop offset=".49" stopColor={K.gold}/>
        <stop offset="1" stopColor={K.violet}/>
      </linearGradient>
      <radialGradient id="rag-hook-halo">
        <stop stopColor="#356A83" stopOpacity=".34"/>
        <stop offset="1" stopColor={K.bg} stopOpacity="0"/>
      </radialGradient>
      <clipPath id="rag-hook-title-wipe">
        <rect x="415" y="170" width={785*ragHookReveal(f,5,30)}
          height="300"/>
      </clipPath>
    </defs>
    <ellipse cx="806" cy="348" rx="720" ry="350"
      fill="url(#rag-hook-halo)" opacity={.78*splash}/>
    {/* Attention at frame zero: one strong piece of kinetic typography. */}
    <g opacity={splash*hero}>
      <W x={800} y={177} anchor="middle" color={K.subdued} size={26}
        mono weight={660}>WHAT IS</W>
      <g clipPath="url(#rag-hook-title-wipe)"
        transform={"translate(0 "+(1-hero)*24+")"}>
        <text x="800" y="422" textAnchor="middle" fontFamily={F}
          fontWeight="790" letterSpacing="12" fontSize="252"
          fill="url(#rag-hook-letters)">RAG</text>
      </g>
      <rect x="560" y="466" width={485*ragHookReveal(f,21,29)}
        height="4" rx="2" fill={K.mint} opacity=".83"/>
    </g>
    {/* The expansion is fully readable before the mechanics start. */}
    <g opacity={expand}>
      <W x={99} y={134} size={94} color={K.white} weight={790}>RAG</W>
      <rect x="347" y="69" width="2.5" height="82" fill={K.border}/>
      <g opacity={ragHookReveal(f,61,21)}>
        <W x={382} y={127} size={45} color={K.mint} weight={710}>
          Retrieval
        </W>
      </g>
      <g opacity={ragHookReveal(f,72,21)}>
        <W x={691} y={127} size={45} color={K.gold} weight={710}>
          Augmented
        </W>
      </g>
      <g opacity={ragHookReveal(f,83,21)}>
        <W x={1071} y={127} size={45} color={K.violet} weight={710}>
          Generation
        </W>
      </g>
      <W x={99} y={209} size={24} color={K.subdued} weight={550}>
        FROM KNOWLEDGE TO AN ANSWER
      </W>
    </g>
    {/* One new process object at a time. No idle connector paths. */}
    <AcronymDock frame={f}/>
    <Retrieve frame={f}/>
    <Augment frame={f}/>
    <Generate frame={f}/>
    <RetrievedContextTransfer frame={f}/>
    <PromptTransfer frame={f}/>
    {/* Tiny stage lights respond to the current semantic operation,
        not arbitrary data particles or unrelated scene transitions. */}
    <g opacity={ragHookReveal(f,100,30)}>
      {[{x:153,color:K.mint,live:phase==="retrieve"},
        {x:646,color:K.gold,live:phase==="augment"},
        {x:1144,color:K.violet,live:phase==="generate"}].map((v,i)=>
        <rect key={i} x={v.x} y={635} width="290" height="4"
          rx="2" fill={v.color} opacity={v.live?.9:.22}/>)}
    </g>
  </g>;
}
