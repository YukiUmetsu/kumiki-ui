import type { PaperCraftSpec, PaperCutLayer, PaperStyle } from "../../registry/video/paper-craft";

export type PaperAspect = "landscape" | "portrait";
const PALETTES: Record<PaperStyle, readonly string[]> = {
  layered: ["#332F53", "#6A5A83", "#A87891", "#D7A6A0", "#EDC5A2", "#B9CBB7", "#6D9E99", "#274E55", "#F7E6BB", "#D27B6B"],
  kirigami: ["#602D3F", "#84384B", "#A54757", "#CA6271", "#DE8990", "#EDB4AD", "#D78B77", "#88394E", "#F9DDC5", "#A64B59"],
  "pop-up": ["#2F5268", "#456D79", "#698F89", "#A2B5A0", "#E1C4A5", "#E6B7A6", "#D99B84", "#567C75", "#FAE4BD", "#D07C6F"],
  lightbox: ["#413B52", "#696074", "#9A7F8A", "#C09B94", "#DAB89B", "#E9CDA6", "#C99B78", "#7A5D5F", "#FFE0AE", "#BF7D6D"],
  "shadow-puppet": ["#53212E", "#74263C", "#983A4A", "#B85051", "#BD6652", "#D68B61", "#A43D46", "#752E3A", "#E4AF68", "#9F3E41"],
};
const circle = (x: number, y: number, r: number) =>
  `M ${x-r} ${y} a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0 Z`;
const petal = (x: number, y: number, r: number, angle: number) => {
  const a = angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const ex = x + dx * r * 1.6, ey = y + dy * r * 1.6;
  return `M${x} ${y} Q${x-dy*r*.8} ${y+dx*r*.8} ${ex} ${ey} Q${x+dy*r*.8} ${y-dx*r*.8} ${x} ${y} Z`;
};
/** Original neutral landscape, composed independently for both social-video aspects.
 * Closed paper contours are individually cut; multiple cut-outs never collapse into a texture overlay.
 */
export function paperCraftExampleSpec(style: PaperStyle, aspect: PaperAspect = "landscape", seed = 27): PaperCraftSpec {
  const w = aspect === "portrait" ? 540 : 960, h = aspect === "portrait" ? 960 : 540;
  const p = PALETTES[style], cx = w*.58, cy = h*.39, R = w*.19;
  const birdX = w*.68, birdY = h*.52, branchY = h*.27;
  const background = style === "shadow-puppet" ? "#F0C992" :
    style === "lightbox" ? "#A38C86" : style === "kirigami" ? "#F8DDCD" : "#EFE5D6";
  const foreground = style === "shadow-puppet" ? "#FFE3A7" : "#FFF0D5";
  const shapes: PaperCutLayer[] = [
    { id: "distant-ridge", color:p[1], depth:1,
      path:`M0 ${h*.69} Q${w*.12} ${h*.41} ${w*.28} ${h*.61} T${w*.59} ${h*.58} Q${w*.76} ${h*.38} ${w} ${h*.63} V${h} H0 Z`,
      enterFrame:6, durationFrames:40 },
    { id: "moon-disc", color:p[8], depth:2,
      path:circle(cx,cy,R), holes:[circle(cx+R*.34,cy-R*.16,R*.71)],
      enterFrame:15, durationFrames:36, motion:"unfold", pivot:[cx,cy] },
    { id: "cloud-strips", color:p[4], depth:3,
      path:`M${w*.09} ${h*.37} q${w*.08} ${-h*.07} ${w*.16} 0 t${w*.15} 0 l${w*.05} ${h*.034} h${-w*.4} Z M${w*.57} ${h*.17} q${w*.1} ${-h*.06} ${w*.2} 0 l${w*.1} ${h*.05} h${-w*.3} Z`,
      holes:[circle(w*.24,h*.365,Math.max(3,w*.009))],
      enterFrame:22, durationFrames:40 },
    { id: "mid-ridge", color:p[2], depth:5,
      path:`M0 ${h*.76} Q${w*.16} ${h*.52} ${w*.35} ${h*.71} Q${w*.47} ${h*.82} ${w*.64} ${h*.65} Q${w*.83} ${h*.53} ${w} ${h*.72} V${h} H0 Z`,
      enterFrame:36, durationFrames:38 },
    { id: "water-ribbon", color:p[6], depth:7,
      path:`M${w*.24} ${h} Q${w*.66} ${h*.79} ${w*.48} ${h*.70} Q${w*.62} ${h*.75} ${w*.78} ${h*.71} Q${w*.84} ${h*.81} ${w*.62} ${h} Z`,
      holes:[`M${w*.39} ${h*.93} Q${w*.57} ${h*.84} ${w*.58} ${h*.85} Q${w*.46} ${h*.94} ${w*.39} ${h*.93} Z`],
      enterFrame:48, durationFrames:42, motion:"rise", pivot:[w*.52,h*.92] },
    { id: "near-terrace", color:p[5], depth:8,
      path:`M0 ${h*.83} Q${w*.15} ${h*.69} ${w*.31} ${h*.81} Q${w*.37} ${h*.86} ${w*.47} ${h*.83} Q${w*.64} ${h*.89} ${w*.81} ${h*.82} Q${w*.91} ${h*.73} ${w} ${h*.77} V${h} H0 Z`,
      enterFrame:56, durationFrames:45 },
    { id: "botanical-branch", color:p[7], depth:12,
      path:`M0 ${h*.03} Q${w*.19} ${h*.14} ${w*.30} ${branchY} Q${w*.33} ${h*.31} ${w*.38} ${h*.32} L${w*.39} ${h*.34} Q${w*.31} ${h*.33} ${w*.28} ${h*.28} Q${w*.20} ${h*.23} ${w*.12} ${h*.20} Q${w*.13} ${h*.29} ${w*.08} ${h*.34} Q${w*.1} ${h*.22} ${w*.075} ${h*.19} Q${w*.045} ${h*.18} 0 ${h*.15} Z`,
      holes:[circle(w*.12,h*.19,Math.max(3,w*.009))],
      enterFrame:64, durationFrames:44, motion:"still" },
    { id: "branch-leaves", color:p[9], depth:14, motion:"swing", swingDegrees:6, pivot:[w*.30,branchY],
      path:petal(w*.29,branchY,w*.078,-27)+" "+petal(w*.30,branchY,w*.063,50)+" "+petal(w*.20,h*.18,w*.051,-25)+" "+petal(w*.17,h*.15,w*.045,30),
      enterFrame:73, durationFrames:32 },
    { id: "bird-body", color:p[7], depth:15,
      path:`M${birdX-w*.09} ${birdY} Q${birdX-w*.03} ${birdY-h*.09} ${birdX+w*.055} ${birdY-h*.015} L${birdX+w*.115} ${birdY-h*.028} L${birdX+w*.061} ${birdY+h*.014} Q${birdX+.01*w} ${birdY+h*.092} ${birdX-w*.05} ${birdY+h*.028} L${birdX-w*.16} ${birdY+h*.050} Z`,
      holes:[circle(birdX+w*.041,birdY-h*.024,Math.max(2.8,w*.0048))],
      enterFrame:87, durationFrames:35, motion:"rise", pivot:[birdX,birdY+h*.06] },
    { id: "bird-wing", color:p[9], depth:16, motion:"swing", swingDegrees:18,
      pivot:[birdX-w*.01,birdY+h*.01],
      path:`M${birdX-w*.03} ${birdY+h*.009} Q${birdX-w*.115} ${birdY-h*.18} ${birdX-w*.03} ${birdY-h*.14} Q${birdX+w*.075} ${birdY-h*.074} ${birdX+w*.01} ${birdY+h*.03} Z`,
      holes:[`M${birdX-w*.03} ${birdY-h*.092} q${w*.022} ${-h*.027} ${w*.034} ${h*.012} q${-w*.015} ${h*.015} ${-w*.034} ${-h*.012} Z`],
      enterFrame:98, durationFrames:30 },
    { id: "ornamental-flowers", color:p[9], depth:17,
      path:[0,1,2,3,4,5].map(j=>petal(w*.12,h*.79,w*.052,j*60)).join(" "),
      holes:[circle(w*.12,h*.79,Math.max(3,w*.009))],
      enterFrame:105, durationFrames:38, motion:"unfold", pivot:[w*.12,h*.79] },
    { id: "die-cut-border", color:p[0], depth:24,
      path:`M0 0 H${w} V${h} H0 Z`,
      holes:[`M${w*.035} ${h*.05} H${w*.965} V${h*.95} H${w*.035} Z`],
      enterFrame:113, durationFrames:28, motion:"still" },
  ];
  return {
    version:1, id:"paper-garden-" + style + "-" + aspect, style,
    width:w, height:h, fps:30, durationFrames:240, seed,
    backing:background, light:foreground, layers:shapes,
  };
}
