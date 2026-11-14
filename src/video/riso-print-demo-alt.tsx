import type { RisoArtwork } from "../../registry/video/print-plates-react";
import type { RisoAspect } from "./riso-print-demo";

/**
 * The second sheet in the editorial demonstration. Its geography-inspired channels and
 * typography are original vector artwork, not imported frames or traced illustrations.
 */
export function risoSecondSheetArtworks(aspect: RisoAspect): Record<string, RisoArtwork> {
  const portrait = aspect === "portrait", x = portrait ? 35 : 43;
  const hero = portrait ? "translate(-425 366)" : "";
  const ys = portrait ? [154, 229, 304] : [162, 240, 317];
  const stamp = portrait ? { x: 334, y: 348, w: 167, h: 41 } : { x: 265, y: 421, w: 156, h: 39 };
  return {
    blue: paint => <g fill={paint.solid} fontFamily="Arial,Helvetica,sans-serif">
      <rect x={x} y={37} width={28} height={5}/>
      <text x={x + 40} y={44} fontSize={portrait ? 11 : 12} fontWeight={700} letterSpacing={portrait ? 1.1 : 2.2}>
        FIELD STUDIES  /  VOL. 08
      </text>
      <path d={portrait ? "M35 69 H505" : "M43 61 H919"} fill="none" stroke={paint.solid} strokeWidth={1}/>
      <g fontFamily="Georgia,Times New Roman,serif" fontSize={portrait ? 68 : 75} fontWeight={700} letterSpacing="-2.2">
        <text x={x} y={ys[0]}>FOLLOW</text>
        <text x={x} y={ys[1]}>THE</text>
        <text x={x} y={ys[2]}>FLOW</text>
      </g>
      <path d={portrait ? "M35 335 H304" : "M43 347 H368"} fill="none" stroke={paint.solid} strokeWidth={2.3}/>
      <text x={x} y={portrait ? 403 : 374} fontSize={12.5} fontWeight={700} letterSpacing={1.15}>
        THE ROUTE TO THE COAST
      </text>
      <text x={x} y={portrait ? 428 : 399} fontSize={12} letterSpacing=".25" opacity=".88">
        A river branches. The delta grows.
      </text>
      <g transform={hero}>
        <circle cx={686} cy={270} r={182} fill={paint.dots} opacity=".7"/>
        <circle cx={686} cy={270} r={164} fill="none" stroke={paint.solid} strokeWidth="2.6"/>
        <circle cx={686} cy={270} r={147} fill="none" stroke={paint.solid} strokeWidth=".9" strokeDasharray="2 8"/>
        <path d="M579 123 C610 163 603 186 630 210 S687 245 694 282 S756 327 799 370"
          fill="none" stroke={paint.solid} strokeWidth={29} strokeLinecap="round"/>
        <path d="M636 208 C618 236 600 258 568 268 S526 288 498 329" fill="none" stroke={paint.solid} strokeWidth={16} strokeLinecap="round"/>
        <path d="M697 276 C731 261 773 242 806 210 S841 170 866 157" fill="none" stroke={paint.solid} strokeWidth={14} strokeLinecap="round"/>
        <path d="M751 326 C721 348 708 373 701 405" fill="none" stroke={paint.solid} strokeWidth={10} strokeLinecap="round"/>
        <path d="M559 269 C552 237 526 221 503 214" fill="none" stroke={paint.solid} strokeWidth={6} strokeLinecap="round"/>
        <path d="M803 367 C823 379 854 386 876 384" fill="none" stroke={paint.solid} strokeWidth={7} strokeLinecap="round"/>
        <path d="M528 122 Q595 86 665 118 T809 118 M505 421 Q579 380 638 412 T811 423"
          fill="none" stroke={paint.solid} strokeWidth="2" opacity=".67"/>
        <path d="M482 162 C551 103 616 144 655 165 S772 173 858 117 M481 373 C554 309 611 356 669 389 S771 423 875 350"
          fill="none" stroke={paint.solid} strokeWidth=".9" strokeDasharray="2 7"/>
        <g fontSize="10" letterSpacing={1.1} fontWeight={700}>
          <text x={843} y={109}>SOURCE / 01</text><text x={823} y={463}>DELTA / 02</text>
        </g>
        <circle cx={579} cy={123} r={8}/><circle cx={799} cy={370} r={8}/>
      </g>
      <path d={portrait ? "M35 886 H505" : "M43 470 H919"} fill="none" stroke={paint.solid} strokeWidth="1"/>
      <text x={x} y={portrait ? 911 : 493} fontSize={10} letterSpacing={1.4}>PRINT STUDY  /  003</text>
      <text x={x} y={portrait ? 935 : 515} fontSize={10} letterSpacing={1.2}>SEPARATED INKS · ARCHIVAL PAPER</text>
      <text x={portrait ? 432 : 840} y={portrait ? 935 : 512} fontSize={10} letterSpacing={1.2}>02 / 02</text>
    </g>,
    red: paint => <g fill={paint.solid}>
      <g transform={hero}>
        <circle cx={736} cy={243} r={108} fill={paint.dots} opacity=".9"/>
        <circle cx={736} cy={243} r={92} fill="none" stroke={paint.solid} strokeWidth={3}/>
        <circle cx={736} cy={243} r={77} fill={paint.solid} opacity=".12"/>
        <path d="M579 123 C610 163 603 186 630 210 S687 245 694 282 S756 327 799 370"
          fill="none" stroke={paint.solid} strokeWidth={3.5} strokeDasharray="3 16" strokeLinecap="round"/>
        <path d="M636 208 C618 236 600 258 568 268 S526 288 498 329"
          fill="none" stroke={paint.solid} strokeWidth={3} strokeDasharray="10 15"/>
        <path d="M696 282 C733 259 775 242 808 210" fill="none" stroke={paint.solid} strokeWidth={3} strokeDasharray="3 10"/>
        <path d="M697 116 l12 28 -24 -7z M845 354 l22 10 -23 11z" />
        <circle cx={867} cy={154} r={4.5}/><circle cx={701} cy={403} r={4}/>
        <path d="M731 108 v19 M731 360 v20 M600 242 h22 M847 242 h20" fill="none" stroke={paint.solid} strokeWidth={2}/>
      </g>
      <g data-km-riso-next-stamp="" transform={"translate(" + stamp.x + " " + stamp.y + ") rotate(-5)"}
        stroke={paint.solid} strokeWidth={2.5} fill="none">
        <rect width={stamp.w} height={stamp.h}/>
        <text x={17} y={stamp.h - 12} stroke="none" fill={paint.solid}
          fontFamily="Arial,Helvetica,sans-serif" fontWeight={800} fontSize={20} letterSpacing=".8"
          textLength={portrait ? 120 : 116} lengthAdjust="spacingAndGlyphs">PRINT / 03</text>
      </g>
      <g transform={portrait ? "translate(35 844)" : "translate(43 432)"}
        fill="none" stroke={paint.solid} strokeWidth="2">
        <path d="M0 0 q15 -12 30 0 t30 0 t30 0 t30 0"/>
        <path d="M0 17 q15 -12 30 0 t30 0 t30 0 t30 0" strokeWidth="1"/>
      </g>
    </g>,
  };
}


/** Text-free spot-ink impression for transitions: ink contact is constrained to
 * the visual subject. Editorial captions and approval stamps never double-print
 * on a different poster while the incoming sheet is travelling.
 */
export function risoSecondSheetImprintArt(aspect: RisoAspect): RisoArtwork {
  const hero = aspect === "portrait" ? "translate(-425 366)" : "";
  return paint => <g transform={hero} fill={paint.solid}>
    <circle cx={736} cy={243} r={108} fill={paint.dots} opacity=".9"/>
    <circle cx={736} cy={243} r={92} fill="none" stroke={paint.solid} strokeWidth={3}/>
    <path d="M579 123 C610 163 603 186 630 210 S687 245 694 282 S756 327 799 370"
      fill="none" stroke={paint.solid} strokeWidth={3.5} strokeDasharray="3 16" strokeLinecap="round"/>
    <path d="M636 208 C618 236 600 258 568 268 S526 288 498 329"
      fill="none" stroke={paint.solid} strokeWidth={3} strokeDasharray="10 15"/>
    <path d="M696 282 C733 259 775 242 808 210"
      fill="none" stroke={paint.solid} strokeWidth={3} strokeDasharray="3 10"/>
    <path d="M697 116 l12 28 -24 -7z M845 354 l22 10 -23 11z"/>
    <circle cx={867} cy={154} r={4.5}/><circle cx={701} cy={403} r={4}/>
  </g>;
}
