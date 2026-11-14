import type { RisoArtwork } from "../../registry/video/print-plates-react";
import type { RisoPrintSpec } from "../../registry/video/print-plates";

export type RisoAspect = "landscape" | "portrait";
export type RisoLayer = "both" | "blue" | "red";

/**
 * Original two-ink editorial illustration for Storybook, built from independent SVG plate artwork.
 * This is intentionally not copied from external reference films.
 *
 * Safe type layout: the little red stamp is on an isolated baseline *between* subtitle and footer.
 * Its text is shorter than its border, so it cannot protrude through the right side.
 */
export const RISO_STAMP = {
  landscape: { x: 265, y: 422, width: 156, height: 39, textLeft: 16, textTop: 27, textMaxWidth: 118 },
  portrait: { x: 333, y: 350, width: 167, height: 41, textLeft: 17, textTop: 28, textMaxWidth: 121 },
} as const;
export const RISO_TEXT_ZONES = {
  landscape: {
    title: { x: 39, y: 75, width: 365, height: 253 },
    subtitle: { x: 39, y: 365, width: 365, height: 35 },
    footer: { x: 39, y: 480, width: 880, height: 40 },
  },
  portrait: {
    title: { x: 32, y: 76, width: 459, height: 246 },
    subtitle: { x: 32, y: 395, width: 275, height: 40 },
    footer: { x: 32, y: 899, width: 476, height: 38 },
  },
} as const;

export function risoExampleSpec(aspect: RisoAspect, seed = 23): RisoPrintSpec {
  const portrait = aspect === "portrait";
  return {
    version: 1,
    width: portrait ? 540 : 960,
    height: portrait ? 960 : 540,
    paper: "#F2E9D6",
    seed,
    startFrame: 12,
    passFrames: 76,
    gapFrames: 27,
    plates: [
      { id: "blue", color: "#2362A0", opacity: .94, dotCell: 9, dotAngle: 23, registration: [0, 0] },
      { id: "red", color: "#DD593D", opacity: .91, dotCell: 8, dotAngle: -19, registration: [2, -1] },
    ],
  };
}

/** Printed contour landscape as a navigable, high-contrast editorial composition. */
function BlueInk({ portrait, solid, dots }: { portrait: boolean; solid: string; dots: string }) {
  const hero = portrait ? "translate(-424 365)" : "";
  const titleY = portrait ? [155, 230, 307] : [162, 240, 317];
  const fontSize = portrait ? 69 : 75;
  const left = portrait ? 35 : 43;
  const dividerY = portrait ? 69 : 61;
  return <g fill={solid} fontFamily="Arial, Helvetica, sans-serif">
    <rect x={left} y={37} width={28} height={5} />
    <text x={left + 40} y={44} fontSize={portrait ? 11 : 12} fontWeight="700" letterSpacing={portrait ? 1.1 : 2.2}>FIELD STUDIES  /  VOL. 07</text>
    <path d={"M" + left + " " + dividerY + " H" + (portrait ? 505 : 919)} fill="none" stroke={solid} strokeWidth={1} opacity={.67}/>
    <g fontFamily="Georgia, 'Times New Roman', serif" fontWeight={700} fontSize={fontSize} letterSpacing={-2.2}>
      <text x={left} y={titleY[0]}>THE</text>
      <text x={left} y={titleY[1]}>HIDDEN</text>
      <text x={left} y={titleY[2]}>CURRENT</text>
    </g>
    <path d={portrait ? "M35 335 H304" : "M43 347 H368"} fill="none" stroke={solid} strokeWidth={2.3}/>
    <text x={left} y={portrait ? 403 : 374} fontSize={portrait ? 12 : 13} fontWeight={700} letterSpacing={portrait ? 1 : 1.8}>AN ATLAS OF THE UNSEEN</text>
    <text x={left} y={portrait ? 428 : 399} fontSize={portrait ? 12 : 12} letterSpacing=".35" opacity=".88">One movement. Two printed layers.</text>
    <g transform={hero}>
      {/* All inks share exact hero coordinates. The waves cross the translucent solar disk. */}
      <circle cx={690} cy={270} r={181} fill={dots} opacity=".74"/>
      <circle cx={690} cy={270} r={163} fill="none" stroke={solid} strokeWidth="2.8"/>
      <circle cx={690} cy={270} r={146} fill="none" stroke={solid} strokeDasharray="2 9" strokeWidth="1.3"/>
      <circle cx={690} cy={270} r={128} fill="none" stroke={solid} strokeWidth="1.8"/>
      <circle cx={690} cy={270} r={112} fill="none" stroke={solid} strokeWidth=".9"/>
      <circle cx={690} cy={270} r={87} fill="none" stroke={solid} strokeWidth="1.5"/>
      <path d="M450 294 C499 190 568 172 625 222 S746 371 815 272 S893 202 936 220"
        stroke={solid} strokeWidth={36} strokeLinecap="round" fill="none"/>
      <path d="M450 294 C499 190 568 172 625 222 S746 371 815 272 S893 202 936 220"
        stroke="#F2E9D6" strokeWidth={5} strokeLinecap="round" fill="none" opacity=".85"/>
      <path d="M451 333 C522 236 566 216 619 266 S748 406 828 312 S896 257 936 275"
        stroke={solid} strokeWidth={13} fill="none"/>
      <path d="M464 365 C523 288 585 287 636 329 S743 420 831 357 S904 310 937 318"
        stroke={solid} strokeWidth={3} fill="none"/>
      <path d="M472 208 C521 130 588 125 648 169 S754 225 833 179 S903 154 936 163"
        stroke={solid} strokeWidth={2.5} fill="none"/>
      <path d="M473 181 C539 103 592 109 654 150 S747 202 824 151" stroke={solid} strokeWidth="1.1" fill="none"/>
      <path d="M475 397 C564 329 629 388 690 418 S824 414 911 381" stroke={solid} strokeWidth="1.3" fill="none"/>
      <circle cx={690} cy={270} r={7} fill="#F2E9D6"/><circle cx={690} cy={270} r={2.7}/>
      <g fontSize="10" fontWeight={700} letterSpacing={1.3}>
        <text x={836} y={106}>NORTH / 01</text><text x={793} y={465}>FLOW / 02</text>
      </g>
      <path d="M779 182 l20 9 -14 14z M533 291 l-19 6 9-20z M749 380 l18-9 -4 20z" fill="#F2E9D6"/>
    </g>
    <path d={portrait ? "M34 886 H505" : "M42 470 H919"} fill="none" stroke={solid} strokeWidth={1.1} opacity=".72"/>
    <g fontSize={portrait ? 11 : 10} letterSpacing={1.4}>
      <text x={left} y={portrait ? 911 : 493}>PRINT STUDY  /  002</text>
      <text x={left} y={portrait ? 935 : 515}>SEPARATED INKS · ARCHIVAL PAPER</text>
      <text x={portrait ? 432 : 840} y={portrait ? 935 : 512}>01 / 02</text>
    </g>
    <rect x={portrait ? 385 : 704} y={portrait ? 896 : 490} width={14} height={14}/>
  </g>;
}
function RedInk({ portrait, solid, dots }: { portrait: boolean; solid: string; dots: string }) {
  const hero = portrait ? "translate(-424 365)" : "";
  const stamp = RISO_STAMP[portrait ? "portrait" : "landscape"];
  return <g fill={solid}>
    <g transform={hero}>
      <circle cx={706} cy={236} r={96} fill={dots}/>
      <circle cx={706} cy={236} r={85} fill="none" stroke={solid} strokeWidth={3.5}/>
      <circle cx={706} cy={236} r={74} opacity=".21"/>
      <path d="M700 101 V121 M700 351 V371 M580 236 H604 M811 236 H833 M622 149 l16 15 M773 309 l16 15 M619 324 l16 -15 M780 163 l13 -13" fill="none" stroke={solid} strokeWidth={3} strokeLinecap="round"/>
      <path d="M450 291 C499 190 570 172 625 223 S745 370 819 271"
        fill="none" stroke={solid} strokeWidth={5.4} strokeDasharray="2 19" strokeLinecap="round"/>
      <path d="M455 336 C521 237 565 216 622 269 S746 402 826 311"
        fill="none" stroke={solid} strokeWidth={3.2} strokeDasharray="12 18"/>
      <path d="M879 161 l-12 -24 27 9z M459 387 l-20 14 26 -1z"/>
      <circle cx={513} cy={142} r={4}/><circle cx={855} cy={383} r={5}/>
    </g>
    <g transform={"translate(" + stamp.x + " " + stamp.y + ") rotate(-5)"}
      stroke={solid} fill="none" strokeWidth="2.5">
      <rect x={0} y={0} width={stamp.width} height={stamp.height}/>
      <text x={stamp.textLeft} y={stamp.textTop} fill={solid} stroke="none" fontFamily="Arial, Helvetica, sans-serif"
        fontWeight={800} fontSize={21} letterSpacing=".75">RISO / 02</text>
    </g>
    <g transform={portrait ? "translate(35 844)" : "translate(43 432)"}
      fill="none" stroke={solid} strokeLinecap="round">
      <path d="M0 0 q14 -13 28 0 t28 0 t28 0 t28 0" strokeWidth={3}/>
      <path d="M0 16 q14 -13 28 0 t28 0 t28 0 t28 0" strokeWidth={1.5}/>
    </g>
    <rect x={portrait ? 408 : 728} y={portrait ? 896 : 490} width={14} height={14}/>
  </g>;
}

export function risoExampleArtworks(aspect: RisoAspect): Record<string, RisoArtwork> {
  const portrait = aspect === "portrait";
  return {
    blue: paint => <BlueInk portrait={portrait} solid={paint.solid} dots={paint.dots}/>,
    red: paint => <RedInk portrait={portrait} solid={paint.solid} dots={paint.dots}/>,
  };
}
