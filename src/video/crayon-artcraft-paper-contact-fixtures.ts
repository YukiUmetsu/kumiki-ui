import type {CrayonColor,CrayonElement,CrayonSceneSpec}
  from "../../registry/video/materials/crayon-scene";

/**
 * ArtCraft wax-material bench: single pass, crossed colors, dense opaque wax,
 * and wax on a dark ground. Not an approved illustration or identity study.
 * Materials are all native CRAYON1 elements with a shared page-height seed.
 */
export function crayonPaperContactSwatches(
  pressure=.72,paperSeed=974,
):CrayonSceneSpec{
  if(!Number.isFinite(pressure)||pressure<.2||pressure>1||
    !Number.isSafeInteger(paperSeed))
    throw new RangeError("Invalid ArtCraft paper-contact controls");
  const make=(id:string,d:string,
    bounds:{x:number;y:number;width:number;height:number},
    colors:readonly [CrayonColor,CrayonColor,CrayonColor],
    first:number,last:number,
    options:Partial<Extract<CrayonElement,{kind:"wax"}>>={}):
    CrayonElement=>({
      kind:"wax",id,d,bounds,colors,
      timing:{start:first,end:last},coverage:"opaque",
      deposition:"stroke-built",pressure,spacing:6.2,
      nibStyle:"dry",strokeOrder:"patches",markLength:"long",
      underpaintTooth:.82,markStrength:.78,outlineOpacity:0,
      edgeRoughness:.21,...options,
    });
  const elements:CrayonElement[]=[
    make("single-pass-umber",
      "M32 161 C87 146 149 181 226 150 Q229 165 219 183"+
      "C153 219 79 193 38 209 Q26 187 32 161Z",
      {x:26,y:145,width:206,height:78},
      ["#c97455","#824d46","#ebaf72"],9,117,
      {spacing:6,pressure:Math.max(.2,pressure*.92),markStrength:.8}),
    make("crossed-lower-ochre",
      "M268 202 C318 168 383 162 461 166 Q456 180 451 195"+
      "C383 200 329 212 279 232Z",
      {x:264,y:159,width:202,height:77},
      ["#b95d43","#8c3e3a","#d78058"],32,139,
      {angle:-19,spacing:6.4,markStrength:.81}),
    make("crossed-upper-indigo",
      "M285 156 C331 169 389 206 446 216 L441 238"+
      "C379 233 323 203 280 177Z",
      {x:277,y:153,width:176,height:90},
      ["#4d617d","#323e61","#8d91a9"],112,207,
      {angle:22,pressure:Math.max(.2,Math.min(1,pressure*.96)),spacing:6.3}),
    make("opaque-layered-ochre",
      "M512 166 C541 139 609 130 672 155 Q698 174 680 226"+
      "C655 250 563 254 520 235 Q501 209 512 166Z",
      {x:504,y:130,width:190,height:133},
      ["#d39b62","#91644b","#f0c285"],50,202,
      {pressure:Math.min(1,pressure*1.1),spacing:5.8,markStrength:.87}),
    make("dark-paper-ground",
      "M724 123 H947 V266 H724Z",
      {x:723,y:122,width:226,height:146},
      ["#34394b","#293443","#454a5b"],10,72,
      {deposition:"smooth",underpaintTooth:0,markStrength:0,
        spacing:12,pressure:1,edgeRoughness:0}),
    make("light-wax-over-dark",
      "M749 173 C791 139 856 150 923 176 Q934 200 921 220"+
      "C844 208 808 227 760 239 Q745 208 749 173Z",
      {x:744,y:146,width:190,height:99},
      ["#efc67a","#b48a58","#f9dba3"],96,220,
      {pressure:Math.min(1,pressure*1.06),spacing:5.7,underpaintTooth:.94}),
  ];
  return {version:1,id:"crayon-artcraft-paper-contact-swatches",
    width:960,height:318,durationFrames:240,seed:paperSeed,
    paper:"#f7ecd8",paperTooth:.9,elements,
    camera:[{frame:0,focusX:480,focusY:159,zoom:1},
      {frame:239,focusX:480,focusY:159,zoom:1}]};
}
