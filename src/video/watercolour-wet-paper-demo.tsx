import { WatercolourWetPaper } from "../../registry/video/watercolour-wet-paper-react";
import type { WetPaperSpec } from "../../registry/video/watercolour-wet-paper";

type Output = "landscape" | "portrait";

/** A neutral, original pigment study, not imported reference art.
 * Coordinates are proportional to the paper, so both output ratios preserve
 * the gesture and the multi-pigment contact points.
 */
export function wetPaperDemo(output:Output,seed=34):WetPaperSpec {
  const portrait=output==="portrait";
  const width=portrait?540:960,height=portrait?960:540;
  const place=(x:number,y:number) => ({
    x:width*(portrait?.5+(x-.5)*.88:x),
    y:height*(portrait?.48+(y-.48)*.84:y),
  });
  const drops:WetPaperSpec["drops"]=[
    {id:"sky-cobalt",x:.61,y:.34,radius:.16,pigment:"#6D9BB6",load:.64,water:.91,startFrame:8},
    {id:"sky-dusk",x:.72,y:.40,radius:.13,pigment:"#B4A3C5",load:.44,water:.84,startFrame:25},
    {id:"petal-rose",x:.59,y:.51,radius:.11,pigment:"#CB7898",load:.78,water:.88,startFrame:48},
    {id:"petal-apricot",x:.72,y:.54,radius:.12,pigment:"#E2B18D",load:.64,water:.95,startFrame:68},
    {id:"leaf-sage",x:.59,y:.70,radius:.13,pigment:"#578E7F",load:.88,water:.79,startFrame:86},
    {id:"leaf-verdigris",x:.73,y:.73,radius:.14,pigment:"#3C8186",load:.71,water:.90,startFrame:108},
    {id:"gold-infusion",x:.67,y:.59,radius:.08,pigment:"#D3A15E",load:.48,water:.92,startFrame:135},
  ].map(d=>({id:d.id,...place(d.x,d.y),
    radius:Math.min(width,height)*d.radius,pigment:d.pigment,
    load:d.load,water:d.water,startFrame:d.startFrame}));
  return {version:1,width,height,seed,paper:{color:"#F8F2E8",tooth:.78},
    cellSize:24,flow:.77,granulation:.72,dryFrames:220,drops};
}

/** Frame-addressable painting plus independent fine-line drawing: neither
 * the artwork nor typography is filtered by the wet pigment material pass.
 */
export function WetStudyPage({spec,frame,reducedMotion}:{spec:WetPaperSpec;frame:number;reducedMotion:boolean}) {
  const portrait=spec.height>spec.width;
  const w=spec.width,h=spec.height;
  return <div style={{position:"relative",width:w,height:h,overflow:"hidden",background:spec.paper.color}}>
    <WatercolourWetPaper spec={spec} frame={frame} reducedMotion={reducedMotion}/>
    <svg viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label="Fine botanical ink contours over a wet-on-wet watercolor painting"
      style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
      {/* Delicate illustrative lines are intentionally drawn ABOVE the paint.
          They never disappear into the numerical pigment simulation. */}
      <g transform={portrait?`translate(${w*.01} ${h*.24}) scale(.57 .96)`:""}
         fill="none" stroke="#556E68" strokeLinecap="round" strokeLinejoin="round">
        <path d="M630 462 C620 392 661 334 654 266 M630 462 C684 422 729 368 752 308
          M629 462 C582 432 531 384 512 329" strokeWidth="2" opacity=".51"/>
        <path d="M637 426 C578 394 568 366 558 343 C593 347 628 374 637 426 Z
          M664 397 C695 345 745 328 769 336 C754 372 705 398 664 397 Z"
          stroke="#698578" strokeWidth="1.5" opacity=".67"/>
        <path d="M650 281 C609 246 600 215 627 205 C649 210 660 242 650 281 Z
          M652 283 C654 230 681 206 705 218 C718 239 692 269 652 283 Z
          M651 286 C596 289 570 269 581 249 C601 231 637 250 651 286 Z"
          stroke="#8B738D" strokeWidth="1.5" opacity=".60"/>
        <path d="M653 270 C655 248 658 234 668 223 M648 271 C633 256 616 245 606 231
          M640 287 C621 279 604 270 590 266" strokeWidth=".8" opacity=".55"/>
        <path d="M630 459 C592 443 575 430 560 418
          M628 459 C652 456 688 448 705 435" strokeWidth=".8" opacity=".48"/>
      </g>
      <g fill="#4E605E">
        <path d={portrait?"M34 61 H506":"M40 52 H920"} stroke="#8E9D92" strokeWidth="1" opacity=".6"/>
        <text x={portrait?34:44} y={portrait?94:82}
          fontFamily="system-ui,sans-serif" fontSize={portrait?13:12}
          letterSpacing="2.7" fontWeight="700">ATELIER  /  WET PIGMENT</text>
        <text x={portrait?34:44} y={portrait?186:143}
          fontFamily="Georgia,serif" fontSize={portrait?48:43} fontStyle="italic">
          Water carries colour
        </text>
        <text x={portrait?35:46} y={portrait?226:174}
          fontFamily="Georgia,serif" fontSize={portrait?19:16} fontStyle="italic">
          Seven translucent deposits · one shared paper field
        </text>
        <path d={portrait?"M34 904 H506":"M42 492 H918"}
          stroke="#8E9D92" strokeWidth="1" opacity=".6"/>
        <text x={portrait?35:44} y={portrait?931:513}
          fontFamily="system-ui,sans-serif" fontSize={12} letterSpacing="1.1">
          WATER  ·  PIGMENT  ·  ABSORPTION
        </text>
      </g>
    </svg>
  </div>;
}

