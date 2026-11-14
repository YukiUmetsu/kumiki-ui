import { useId, useMemo } from "react";
import type { CSSProperties, SVGProps } from "react";
import { crayonHash, crayonMarks, crayonProgress } from "./crayon";
import type { CrayonBounds } from "./crayon";

export type CrayonStory = "lantern" | "garden";
export type CrayonAspect = "landscape" | "portrait";
export interface CrayonStorybookProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox"> {
  frame: number;
  story?: CrayonStory;
  aspect?: CrayonAspect;
  seed?: number;
  pressure?: number;
  paperTooth?: number;
  reducedMotion?: boolean;
  style?: CSSProperties;
}
type WaxProps = {
  d: string; bounds: CrayonBounds; colors: readonly [string, string, string];
  seed: number; pressure: number; tooth: string; frame: number;
  first: number; last: number; reduced: boolean; spacing?: number;
};
type LineProps = { d: string; color: string; width: number; frame: number; first: number; last: number; reduced: boolean; seed: number; opacity?: number };

function WaxRegion({ d, bounds, colors, seed, pressure, tooth, frame, first, last, reduced, spacing = 9.5 }: WaxProps) {
  const raw = useId(), clip = "waxclip-" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const marks = useMemo(() => crayonMarks(bounds, { seed, pressure, spacing, passes: 2 }),
    [bounds.x, bounds.y, bounds.width, bounds.height, seed, pressure, spacing]);
  return <g data-km-crayon-region="" data-km-crayon-seed={seed}>
    <defs><clipPath id={clip}><path d={d}/></clipPath></defs>
    <g clipPath={"url(#" + clip + ")"} mask={"url(#" + tooth + ")"} data-km-crayon-wax="">
      <path d={d} fill={colors[0]} opacity={crayonProgress(frame, first, last, 0, 1, reduced) * .12} />
      {marks.map((mark, i) => {
        const progress = crayonProgress(frame, first, last, i, marks.length, reduced);
        if (progress <= 0) return null;
        return <path key={i} d={mark.d} fill="none" pathLength={100}
          stroke={colors[mark.tone]} strokeWidth={mark.width} strokeLinecap="round"
          strokeDasharray={100} strokeDashoffset={100 * (1 - progress)}
          opacity={.56 + mark.pressure * .29} />;
      })}
    </g>
    <path d={d} fill="none" stroke={colors[1]} strokeWidth={2.5 + pressure * 1.5}
      strokeLinecap="round" strokeLinejoin="round"
      opacity={.38 * crayonProgress(frame, first, last, 0, 1, reduced)} />
  </g>;
}

/** Dry double-edged wax lines, not a generic smooth SVG path. */
function WaxLine({ d, color, width, frame, first, last, reduced, seed, opacity = 1 }: LineProps) {
  const reveal = crayonProgress(frame, first, last, 0, 1, reduced);
  if (reveal <= 0) return null;
  const wiggle = (crayonHash(seed, 9) - .5) * 2;
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} data-km-crayon-line="">
    <path d={d} pathLength={100} stroke={color} strokeWidth={width * 1.55} opacity=".22"
      strokeDasharray={100} strokeDashoffset={100 * (1 - reveal)} />
    <path d={d} pathLength={100} stroke={color} strokeWidth={width}
      strokeDasharray={100} strokeDashoffset={100 * (1 - reveal)} />
    <path d={d} pathLength={100} stroke="#fff2d7" strokeWidth={Math.max(.35, width * .17)}
      strokeDasharray={100} strokeDashoffset={100 * (1 - reveal)} opacity={.14 + wiggle * .08} />
  </g>;
}
function Paper({ width, height, seed, tooth }: { width: number; height: number; seed: number; tooth: string }) {
  const fibers = useMemo(() => Array.from({ length: 480 }, (_, i) => ({
    x: crayonHash(seed, i, 1) * width, y: crayonHash(seed, i, 2) * height,
    dx: 1 + crayonHash(seed, i, 3) * 14, dy: (crayonHash(seed, i, 4) - .5) * 4,
    r: .4 + crayonHash(seed, i, 5) * 1.4,
  })), [seed, width, height]);
  return <>
    <defs>
      <mask id={tooth} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
        <rect width={width} height={height} fill="#fff" />
        {fibers.map((f, i) => <g key={i} fill="#000" stroke="#000" strokeLinecap="round">
          <path d={"M" + f.x + " " + f.y + " l" + f.dx + " " + f.dy} strokeWidth={f.r} />
          <circle cx={(f.x + 59) % width} cy={(f.y + 43) % height} r={f.r * .68} />
        </g>)}
      </mask>
    </defs>
    <rect width={width} height={height} fill="#faf1da" />
    <g stroke="#b99572" strokeWidth=".6" pointerEvents="none" opacity=".42" data-km-crayon-paper="">
      {fibers.map((f, i) => <path key={i} opacity={.2 + crayonHash(seed, i, 6) * .42}
        d={"M" + f.x + " " + f.y + " l" + f.dx + " " + f.dy} />)}
    </g>
  </>;
}
function Starfield({ width, height, seed, frame, reduced, day }: { width: number; height: number; seed: number; frame: number; reduced: boolean; day: boolean }) {
  const stars = useMemo(() => Array.from({ length: day ? 13 : 31 }, (_, i) => ({
    x: 26 + crayonHash(seed + 30, i, 1) * (width - 52),
    y: 25 + crayonHash(seed + 30, i, 2) * height * .53,
    r: 1.8 + crayonHash(seed + 30, i, 3) * 4.3,
  })), [width, height, seed, day]);
  return <g aria-hidden="true">
    {stars.map((p, i) => <g key={i} opacity={crayonProgress(frame, 55, 148, i, stars.length, reduced) * (day ? .4 : .8)}
      stroke={day ? "#fff3d4" : "#fff1b9"} strokeLinecap="round" fill="none">
      <path d={"M" + (p.x - p.r) + " " + p.y + " l" + (p.r * 2) + " 0 M" + p.x + " " + (p.y - p.r) + " v" + (p.r * 2)} strokeWidth={i % 3 === 0 ? 2 : 1.2}/>
      {i % 5 === 0 && <circle cx={p.x} cy={p.y} r={p.r * 1.8} strokeWidth=".8" strokeDasharray="4 6" />}
    </g>)}
  </g>;
}
function Pine({ x, y, scale, seed, frame, tooth, reduced }: { x: number; y: number; scale: number; seed: number; frame: number; tooth: string; reduced: boolean }) {
  const crown = "M0 -150 C-20 -113 -36 -90 -54 -59 L-37 -62 C-54 -29 -69 -4 -81 17 L-46 6 C-66 31 -74 47 -81 64 Q-1 46 74 63 L43 11 L66 17 L29 -61 L43 -56 Z";
  return <g transform={"translate(" + x + " " + y + ") scale(" + scale + ")"}>
    <WaxRegion d="M-12 20H12V98H-12Z" bounds={{ x: -12, y: 20, width: 24, height: 80 }} colors={["#795b59", "#4b445d", "#a16f61"]} seed={seed+30} pressure={.76} tooth={tooth} frame={frame} first={130} last={230} reduced={reduced} spacing={6}/>
    <WaxRegion d={crown} bounds={{ x: -85, y: -155, width: 170, height: 223 }} colors={["#264d5b", "#213f4f", "#4f7470"]} seed={seed+31} pressure={.85} tooth={tooth} frame={frame} first={105} last={231} reduced={reduced} />
    <WaxLine d="M-22 -80 Q-45 -35 -54 12 M18 -113 Q34 -55 43 5" color="#8ab3a0"
      width={3} seed={seed} frame={frame} first={200} last={243} reduced={reduced} opacity={.58}/>
  </g>;
}
function Fox({ x, y, scale, seed, frame, tooth, reduced }: { x: number; y: number; scale: number; seed: number; frame: number; tooth: string; reduced: boolean }) {
  const orange: [string,string,string] = ["#d87858", "#b85a51", "#f7ad69"];
  const pale: [string,string,string] = ["#f6d1a0", "#fff1d0", "#dbb690"];
  const dark: [string,string,string] = ["#445361", "#344456", "#68748a"];
  const part = (d: string, bounds: CrayonBounds, colors: [string,string,string], id: number, first: number, last: number, spacing = 8.5) =>
    <WaxRegion key={id} d={d} bounds={bounds} colors={colors} seed={seed + id * 11} pressure={.87} tooth={tooth} frame={frame} first={first} last={last} reduced={reduced} spacing={spacing}/>;
  return <g transform={"translate(" + x + " " + y + ") scale(" + scale + ")"} data-km-crayon-fox="">
    {/* The tail is laid down first, under the body. Every painted region is real wax strokes. */}
    {part("M-81 -4 C-138 -83 -224 -66 -216 -12 C-213 53 -160 73 -109 38 Q-118 15 -81 -4Z", {x:-224,y:-87,width:158,height:164}, orange, 1, 178, 260)}
    {part("M-182 -43 Q-224 -55 -216 -12 Q-211 30 -175 50 Q-192 12 -182 -43Z", {x:-226,y:-61,width:63,height:122}, pale, 2, 195, 270)}
    {part("M-107 -15 C-66 -65 18 -59 49 -18 Q85 34 37 62 Q-40 91 -104 55 Q-129 29 -107 -15Z", {x:-133,y:-67,width:215,height:158}, orange, 3, 205, 296)}
    {part("M-85 49 Q-54 56 -44 58 L-49 87 Q-64 96 -86 84Z", {x:-90,y:48,width:52,height:52}, dark, 4, 243, 307, 6)}
    {part("M15 48 L48 44 Q56 63 47 88 Q26 94 13 80Z", {x:9,y:42,width:48,height:56}, dark, 5, 243, 307, 6)}
    {part("M29 -75 L26 -146 Q51 -145 78 -100 L101 -149 Q132 -143 136 -85 Q162 -52 146 -17 Q122 22 68 18 Q22 9 17 -34 Q9 -52 29 -75Z",
      {x:4,y:-157,width:164,height:184}, orange, 6, 236, 318)}
    {part("M36 -135 Q50 -128 62 -100 L42 -102Z M107 -139 Q123 -126 124 -100 L105 -103Z",
      {x:30,y:-143,width:106,height:48}, pale, 7, 246, 310, 5)}
    {part("M35 -25 Q65 -2 91 0 Q119 -6 142 -37 Q158 -12 134 15 Q95 41 49 19Z",
      {x:32,y:-42,width:125,height:91}, pale, 8, 262, 332)}
    <WaxLine d="M68 -60 Q83 -65 91 -60" color="#394358" width={4} frame={frame} first={285} last={330} reduced={reduced} seed={seed+23}/>
    <circle cx={122} cy={-56} r={5.5} fill="#293a50" opacity={crayonProgress(frame, 300, 333, 0, 1, reduced)}/>
    <circle cx={124} cy={-58} r={1.7} fill="#fff4d7" opacity={crayonProgress(frame, 300, 333, 0, 1, reduced)}/>
    <WaxLine d="M134 -31 Q148 -26 159 -38" color="#504153" width={3.1} frame={frame} first={312} last={349} reduced={reduced} seed={seed+25}/>
    <circle cx={154} cy={-39} r={5.3} fill="#4d4150" opacity={crayonProgress(frame, 310, 345, 0, 1, reduced)}/>
    {/* A loose hand-drawn lantern, never a blur bloom. The rings and lines reveal as crayon marks. */}
    <WaxLine d="M157 -36 Q181 -51 199 -19 L197 6" color="#9a6647" width={4} frame={frame} first={315} last={355} reduced={reduced} seed={seed+29}/>
    {part("M174 3 L220 3 L213 58 Q197 70 180 56Z", {x:173,y:2,width:50,height:70},
      ["#eab758","#f9dc83","#f5b560"], 9, 315, 393, 5.8)}
    <WaxLine d="M173 3 Q196 -6 220 3 M178 57 Q197 69 215 56 M194 2 L194 59" color="#865b5b"
      width={3.1} frame={frame} first={333} last={395} reduced={reduced} seed={seed+30}/>
    {[-55,-28,0,28,55].map((a,i) => <g key={a} transform={"translate(195 29) rotate(" + a + ")"}>
      <WaxLine d="M0 -48 L0 -71" color="#f9d87e" width={i % 2 ? 3 : 4.2} frame={frame}
        first={345+i*3} last={411} reduced={reduced} seed={seed+31+i} opacity={.81}/>
    </g>)}
  </g>;
}
function Bloom({ x,y,scale,seed,frame,tooth,reduced }: { x:number;y:number;scale:number;seed:number;frame:number;tooth:string;reduced:boolean }) {
  const petals = Array.from({length:9}, (_,i)=>i);
  const blossom = "M0 -10 Q-28 -48 -15 -89 Q0 -109 15 -89 Q29 -49 0 -10Z";
  const petalsColor: [string,string,string] = ["#f0a6a8", "#d77594", "#fbd3a8"];
  return <g transform={"translate(" + x + " " + y + ") scale(" + scale + ")"} data-km-crayon-bloom="">
    <WaxLine d="M0 -2 Q-17 66 10 140" color="#37776e" width={8} seed={seed} frame={frame} first={166} last={250} reduced={reduced}/>
    <WaxRegion d="M-9 76 Q-76 20 -94 64 Q-45 119 -9 95Z" bounds={{x:-98,y:16,width:96,height:106}}
      colors={["#609979","#3d8076","#a1bf83"]} seed={seed+2} pressure={.81} tooth={tooth} frame={frame} first={183} last={280} reduced={reduced}/>
    <WaxRegion d="M4 95 Q62 28 96 71 Q48 119 7 110Z" bounds={{x:0,y:27,width:104,height:104}}
      colors={["#609979","#3d8076","#a1bf83"]} seed={seed+3} pressure={.81} tooth={tooth} frame={frame} first={192} last={283} reduced={reduced}/>
    {petals.map((i) => <g key={i} transform={"rotate(" + i*40 + ")"}>
      <WaxRegion d={blossom} bounds={{x:-29,y:-111,width:58,height:103}} colors={petalsColor}
        seed={seed+10+i*3} pressure={.76} tooth={tooth} frame={frame} first={205+i*2} last={319} reduced={reduced} spacing={6}/>
    </g>)}
    <WaxRegion d="M-28 0 A28 28 0 1 0 28 0 A28 28 0 1 0 -28 0Z"
      bounds={{x:-30,y:-29,width:60,height:60}} colors={["#9f7159","#6e555b","#d7a36d"]}
      seed={seed+40} pressure={.93} tooth={tooth} frame={frame} first={266} last={354} reduced={reduced} spacing={5}/>
    {Array.from({length:11},(_,i)=> {
      const a = i * 2.4, r = 7 + i * 1.4;
      return <circle key={i} cx={Math.cos(a)*r} cy={Math.sin(a)*r} r="2.1" fill="#e8bb7e"
        opacity={crayonProgress(frame,292,375,i,11,reduced)}/>;
    })}
  </g>;
}
function StoryTitle({ width, height, portrait, day, frame, reduced }: { width:number;height:number;portrait:boolean;day:boolean;frame:number;reduced:boolean }) {
  const title = day ? (portrait ? ["ONE", "LITTLE", "SEED"] : ["ONE LITTLE", "SEED"]) : (portrait ? ["FOLLOW", "THE", "GLOW"] : ["FOLLOW", "THE GLOW"]);
  const x = portrait ? 34 : 52;
  const y = portrait ? 112 : 118;
  const ink = day ? "#34455b" : "#fbefcd";
  const titleSize = portrait ? 64 : 74;
  return <g fill={ink} opacity={.92 + .08 * crayonProgress(frame,20,70,0,1,reduced)} data-km-crayon-title="">
    <text x={x} y={portrait ? 51 : 50} fontFamily="Georgia, 'Times New Roman', serif" fontSize={portrait ? 14 : 15}
      fontWeight="700" letterSpacing={3}>TINY TALES   /   {day ? "02" : "01"}</text>
    <path d={"M" + x + " " + (portrait ? 65 : 64) + " H" + (portrait ? 255 : 404)}
      fill="none" stroke={ink} opacity=".65" strokeWidth="1.6"/>
    {title.map((line,i)=><text key={i} x={x} y={y + i * (portrait ? 72 : 79)}
      fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700"
      fontSize={titleSize} letterSpacing={-2.3}>{line}</text>)}
    <text x={x+3} y={y + title.length * (portrait ? 72 : 79) + 16} fontFamily="Georgia,serif"
      fontSize={portrait ? 18 : 18} fontStyle="italic" opacity=".88">{day ? "A pocketful of beginnings." : "A little light for the long way home."}</text>
    {!portrait && <text x={width-53} y={height-27} textAnchor="end" fontFamily="Georgia,serif"
      fontSize="15" letterSpacing={1.3} fill="#f8eccd">WAX CRAYON   /   001</text>}
  </g>;
}
export function CrayonStorybook({frame, story = "lantern", aspect = "landscape", seed = 23,
  pressure = .87, paperTooth = .58, reducedMotion = false, style, ...props}: CrayonStorybookProps) {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("crayon frame must be a nonnegative integer");
  if (!Number.isSafeInteger(seed)) throw new RangeError("crayon seed must be a safe integer");
  if (!Number.isFinite(pressure) || pressure < 0 || pressure > 1) throw new RangeError("crayon pressure must be in [0,1]");
  if (!Number.isFinite(paperTooth) || paperTooth < 0 || paperTooth > 1) throw new RangeError("crayon paperTooth must be in [0,1]");
  if (aspect !== "landscape" && aspect !== "portrait") throw new RangeError("unknown crayon aspect");
  if (story !== "lantern" && story !== "garden") throw new RangeError("unknown crayon story");
  const portrait = aspect === "portrait", day = story === "garden";
  const W = portrait ? 540 : 960, H = portrait ? 960 : 540;
  const raw = useId(), tooth = "crayonpaper-" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const groundY = H * (portrait ? .76 : .78);
  const skyD = "M0 0 H" + W + " V" + H*.68 + " Q" + W*.76 + " " + H*.59 + " " + W*.50 + " " + H*.67 + " T0 " + H*.61 + "Z";
  const backD = "M0 " + H*.68 + " Q" + W*.23 + " " + H*.48 + " " + W*.44 + " " + H*.67 +
    " Q" + W*.70 + " " + H*.46 + " " + W + " " + H*.65 + " V" + H + " H0Z";
  const hillD = "M0 " + groundY + " Q" + W*.23 + " " + H*.66 + " " + W*.47 + " " + H*.75 +
    " Q" + W*.74 + " " + H*.62 + " " + W + " " + H*.70 + " V" + H + " H0Z";
  const moonX = portrait ? W*.78 : W*.78, moonY = portrait ? 325 : 162;
  const sunR = portrait ? 71 : 89;
  const circle = "M" + (moonX-sunR) + " " + moonY + " a" + sunR + " " + sunR + " 0 1 0 " + (sunR*2) + " 0 a" + sunR + " " + sunR + " 0 1 0 -" + (sunR*2) + " 0Z";
  const foreground = day ? ["#5c9f86","#397f78","#b2c892"] as const : ["#47666d","#294f58","#72927d"] as const;
  const sky = day ? ["#8fbfc7","#6aa5bd","#bbd2c5"] as const : ["#38486f","#263861","#66779a"] as const;
  const far = day ? ["#a9a5b9","#887fa8","#c5bed0"] as const : ["#74899b","#526983","#a2adad"] as const;
  const yellow = day ? ["#f7d27a","#e9a865","#fff0ad"] as const : ["#f7e2a0","#efc778","#fff4c5"] as const;
  const skyBounds = {x:0,y:0,width:W,height:H*.77};
  const totalFrame = Math.min(frame, 419);
  const toothSeed = seed + Math.round(paperTooth * 470);
  return <svg {...props} role={props["aria-hidden"] ? undefined : "img"} aria-label={props["aria-hidden"] ? undefined :
    (day ? "Wax-crayon storybook scene: flowers grow from a little seed" : "Wax-crayon storybook scene: a fox carries a lantern home")}
    data-km-crayon-storybook="" data-km-crayon-frame={frame} data-km-crayon-story={story}
    viewBox={"0 0 " + W + " " + H} xmlns="http://www.w3.org/2000/svg"
    style={{display:"block",width:"100%",height:"100%",isolation:"isolate",...style}}>
    <Paper width={W} height={H} seed={toothSeed} tooth={tooth}/>
    <WaxRegion d={skyD} bounds={skyBounds} colors={sky} seed={seed+1} pressure={pressure} tooth={tooth} frame={totalFrame} first={0} last={121} reduced={reducedMotion} spacing={11}/>
    <WaxRegion d={circle} bounds={{x:moonX-sunR-4,y:moonY-sunR-4,width:2*sunR+8,height:2*sunR+8}} colors={yellow} seed={seed+2}
      pressure={pressure} tooth={tooth} frame={totalFrame} first={47} last={138} reduced={reducedMotion} spacing={7}/>
    <Starfield width={W} height={H} seed={seed} frame={totalFrame} reduced={reducedMotion} day={day}/>
    <WaxRegion d={backD} bounds={{x:0,y:H*.42,width:W,height:H*.60}} colors={far} seed={seed+3} pressure={pressure}
      tooth={tooth} frame={totalFrame} first={82} last={194} reduced={reducedMotion} spacing={10}/>
    <WaxRegion d={hillD} bounds={{x:0,y:H*.60,width:W,height:H*.4}} colors={foreground} seed={seed+4} pressure={pressure}
      tooth={tooth} frame={totalFrame} first={135} last={260} reduced={reducedMotion} spacing={10}/>
    {day ? <>
      <Bloom x={W*.22} y={H*.74} scale={portrait ? .85 : 1.04} seed={seed+50} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <Bloom x={W*.62} y={H*.72} scale={portrait ? 1.11 : 1.27} seed={seed+90} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <Bloom x={W*.86} y={H*.80} scale={portrait ? .58 : .68} seed={seed+140} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <WaxLine d={"M" + W*.09 + " " + H*.89 + " Q" + W*.48 + " " + H*.96 + " " + W*.94 + " " + H*.91}
        color="#e8ca9e" width={6} seed={seed+181} frame={totalFrame} first={295} last={400} reduced={reducedMotion} opacity={.8}/>
    </> : <>
      <Pine x={W*.13} y={H*.72} scale={portrait ? 1.07 : 1.08} seed={seed+30} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <Pine x={W*.88} y={H*.69} scale={portrait ? .84 : .83} seed={seed+44} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <Fox x={portrait ? W*.45 : W*.58} y={portrait ? H*.79 : H*.76} scale={portrait ? .98 : .98}
        seed={seed+80} frame={totalFrame} tooth={tooth} reduced={reducedMotion}/>
      <WaxLine d={"M" + W*.05 + " " + H*.90 + " Q" + W*.43 + " " + H*.86 + " " + W*.82 + " " + H*.98}
        color="#caa990" width={9} seed={seed+140} frame={totalFrame} first={220} last={340} reduced={reducedMotion} opacity={.56}/>
    </>}
    <StoryTitle width={W} height={H} portrait={portrait} day={day} frame={totalFrame} reduced={reducedMotion}/>
    {portrait && <g fill={day?"#365265":"#f9ebd2"} fontSize="17" fontFamily="Georgia,serif" letterSpacing="2" opacity=".86">
      <path d={"M33 " + (H-70) + " H" + (W-33)} stroke={day?"#365265":"#f9ebd2"} strokeWidth="1.5" fill="none"/>
      <text x={34} y={H-36}>WAX CRAYON   /   {day?"002":"001"}</text>
    </g>}
  </svg>;
}
