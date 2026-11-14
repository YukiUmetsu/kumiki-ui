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
  // Preserve bird anatomy rather than distorting it when swapping 16:9 and 9:16.
  const birdX = w*.68, birdY = h*.52, branchY = h*.27;
  const birdScale = Math.min(w/960, h/540)*1.12;
  const X = (dx: number) => +(birdX + dx*birdScale).toFixed(2);
  const Y = (dy: number) => +(birdY + dy*birdScale).toFixed(2);
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
    // A continuous twig physically joins the upper branch to the bird's feet.
    { id:"perch-bridge", color:p[7], depth:12, enterFrame:73, durationFrames:36,
      path:`M${w*.32} ${h*.31} C${w*.42} ${h*.40} ${X(-174)} ${Y(44)} ${X(-104)} ${Y(49)} C${X(-8)} ${Y(54)} ${X(103)} ${Y(47)} ${X(157)} ${Y(32)} Q${X(111)} ${Y(61)} ${X(-104)} ${Y(62)} C${X(-175)} ${Y(60)} ${w*.42} ${h*.45} ${w*.31} ${h*.33} Z` },
    // Large tail feathers are attached to the same pelvis, rather than separate floating triangles.
    { id:"bird-tail",color:p[0],depth:13,enterFrame:80,durationFrames:34,
      path:`M${X(-82)} ${Y(3)} C${X(-126)} ${Y(14)} ${X(-167)} ${Y(47)} ${X(-196)} ${Y(80)} Q${X(-147)} ${Y(65)} ${X(-110)} ${Y(42)} Q${X(-149)} ${Y(72)} ${X(-173)} ${Y(95)} Q${X(-101)} ${Y(67)} ${X(-65)} ${Y(18)} Z` },
    { id:"bird-tail-feather",color:p[1],depth:14,enterFrame:84,durationFrames:34,
      path:`M${X(-83)} ${Y(16)} Q${X(-126)} ${Y(48)} ${X(-159)} ${Y(75)} Q${X(-116)} ${Y(55)} ${X(-83)} ${Y(24)} Z` },
    // The continuous scapula-head-belly silhouette fixes the earlier "red petal as bird" anatomy.
    { id:"bird-body",color:p[7],depth:15,enterFrame:88,durationFrames:32,motion:"rise",pivot:[X(-10),Y(30)],
      path:`M${X(-94)} ${Y(-1)} C${X(-77)} ${Y(-29)} ${X(-47)} ${Y(-43)} ${X(-10)} ${Y(-32)} C${X(12)} ${Y(-53)} ${X(49)} ${Y(-47)} ${X(69)} ${Y(-27)} C${X(88)} ${Y(-16)} ${X(91)} ${Y(4)} ${X(77)} ${Y(23)} C${X(51)} ${Y(48)} ${X(7)} ${Y(43)} ${X(-21)} ${Y(22)} C${X(-52)} ${Y(33)} ${X(-79)} ${Y(24)} ${X(-94)} ${Y(-1)} Z` },
    // A permanently attached throat and curved lower breast follow the same anatomy.
    { id:"bird-throat",color:p[5],depth:16,enterFrame:90,durationFrames:32,
      path:`M${X(33)} ${Y(-21)} Q${X(72)} ${Y(-19)} ${X(75)} ${Y(7)} C${X(53)} ${Y(29)} ${X(27)} ${Y(23)} ${X(15)} ${Y(5)} Z` },
    { id:"bird-breast",color:p[4],depth:17,enterFrame:92,durationFrames:30,
      path:`M${X(-36)} ${Y(11)} C${X(-12)} ${Y(7)} ${X(18)} ${Y(-1)} ${X(38)} ${Y(15)} Q${X(10)} ${Y(52)} ${X(-32)} ${Y(34)} Z` },
    // Eye-stock shines through the real die-cut aperture in the overlying head layer.
    { id:"bird-eye-paper",color:p[8],depth:18,enterFrame:94,durationFrames:28,
      path:circle(X(50),Y(-28),6*birdScale) },
    // Wing is folded along the flank; feather slits and shoulder remain attached when animated.
    { id:"bird-wing",color:p[9],depth:19,motion:"swing",swingDegrees:11,
      pivot:[X(-31),Y(-15)],enterFrame:98,durationFrames:30,
      path:`M${X(-31)} ${Y(-22)} C${X(-74)} ${Y(-45)} ${X(-101)} ${Y(-5)} ${X(-146)} ${Y(28)} Q${X(-93)} ${Y(48)} ${X(-59)} ${Y(27)} Q${X(-23)} ${Y(11)} ${X(-31)} ${Y(-22)} Z`,
      holes:[
        `M${X(-88)} ${Y(3)} Q${X(-66)} ${Y(-12)} ${X(-50)} ${Y(-12)} Q${X(-57)} ${Y(4)} ${X(-88)} ${Y(3)} Z`,
        `M${X(-105)} ${Y(21)} Q${X(-78)} ${Y(7)} ${X(-56)} ${Y(6)} Q${X(-72)} ${Y(21)} ${X(-105)} ${Y(21)} Z`,
        `M${X(-119)} ${Y(31)} Q${X(-89)} ${Y(19)} ${X(-61)} ${Y(20)} Q${X(-82)} ${Y(33)} ${X(-119)} ${Y(31)} Z`,
      ] },
    // A second closed feather-stock panel reads as a wing shoulder, not a paint overlay.
    { id:"bird-wing-coverts",color:p[2],depth:20,enterFrame:101,durationFrames:28,
      path:`M${X(-35)} ${Y(-19)} Q${X(-66)} ${Y(-26)} ${X(-75)} ${Y(-2)} Q${X(-58)} ${Y(17)} ${X(-33)} ${Y(12)} Z`,
      holes:[circle(X(-47),Y(-6),3.7*birdScale)] },
    { id:"bird-crest",color:p[0],depth:20,enterFrame:104,durationFrames:27,
      path:`M${X(8)} ${Y(-43)} Q${X(15)} ${Y(-68)} ${X(39)} ${Y(-66)} Q${X(35)} ${Y(-57)} ${X(43)} ${Y(-46)} Q${X(60)} ${Y(-57)} ${X(79)} ${Y(-42)} Q${X(52)} ${Y(-46)} ${X(27)} ${Y(-32)} Z` },
    { id:"bird-head",color:p[0],depth:21,enterFrame:108,durationFrames:28,
      path:`M${X(5)} ${Y(-42)} C${X(23)} ${Y(-56)} ${X(56)} ${Y(-53)} ${X(75)} ${Y(-34)} C${X(87)} ${Y(-21)} ${X(85)} ${Y(-4)} ${X(65)} ${Y(3)} Q${X(34)} ${Y(3)} ${X(15)} ${Y(-20)} Z`,
      holes:[circle(X(50),Y(-28),4.5*birdScale)] },
    { id:"bird-beak",color:p[8],depth:22,enterFrame:113,durationFrames:26,
      path:`M${X(74)} ${Y(-25)} Q${X(99)} ${Y(-26)} ${X(151)} ${Y(-14)} Q${X(99)} ${Y(-11)} ${X(78)} ${Y(-14)} Z` },
    // Talons wrap over the continuous twig to establish a real visible contact point.
    { id:"bird-feet",color:p[8],depth:23,enterFrame:117,durationFrames:24,
      path:`M${X(-11)} ${Y(28)} Q${X(-12)} ${Y(47)} ${X(-23)} ${Y(54)} Q${X(-36)} ${Y(60)} ${X(-40)} ${Y(54)} Q${X(-21)} ${Y(57)} ${X(-18)} ${Y(35)} Z M${X(22)} ${Y(31)} Q${X(27)} ${Y(47)} ${X(19)} ${Y(55)} Q${X(3)} ${Y(60)} ${X(-4)} ${Y(54)} Q${X(17)} ${Y(56)} ${X(15)} ${Y(33)} Z` },
    { id: "ornamental-flowers", color:p[9], depth:17,
      path:Array.from({length:9},(_,j)=>petal(w*.12,h*.79,w*(j%2?.038:.051),j*40)).join(" "),
      holes:[circle(w*.12,h*.79,Math.max(3,w*.008))],
      enterFrame:105, durationFrames:38, motion:"unfold", pivot:[w*.12,h*.79] },
    { id:"flower-calyx", color:p[8], depth:18, enterFrame:112, durationFrames:32,
      path:circle(w*.12,h*.79,w*.017), holes:[circle(w*.12,h*.79,w*.007)] },
    { id:"leaf-vein-inlays", color:p[5], depth:15, enterFrame:90, durationFrames:28,
      path:`M${w*.291} ${branchY-h*.008} q${w*.014} ${-h*.046} ${w*.045} ${-h*.058} q${-w*.020} ${h*.03} ${-w*.045} ${h*.058} Z M${w*.301} ${branchY+h*.007} q${w*.027} ${h*.006} ${w*.045} ${h*.042} q${-w*.026} ${-h*.020} ${-w*.045} ${-h*.042} Z` },
    { id:"bird-beak", color:p[8], depth:18, enterFrame:120, durationFrames:24,
      path:`M${birdX+w*.058} ${birdY-h*.018} L${birdX+w*.12} ${birdY-h*.028} Q${birdX+w*.091} ${birdY+h*.002} ${birdX+w*.058} ${birdY-h*.004} Z` },
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
