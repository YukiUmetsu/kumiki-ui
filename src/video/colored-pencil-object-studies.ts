import type { PencilAspect, PencilDrawingSpec, PencilRegion, PencilTrace } from "../../registry/video/colored-pencil";
import { createPencilMaterialRegion } from "../../registry/video/colored-pencil-materials";
import { createPencilFoundationDrawing } from "../../registry/video/colored-pencil-foundation";
import type { PencilMaterialInput, PencilSurface } from "../../registry/video/colored-pencil-materials";
import {ROSE_LAMINA_AXES,roseLaminaFibres} from "./colored-pencil-rose-lamina";
import {ROSE_LIP_BANDS,roseRolledLipTraces} from "./colored-pencil-rose-rolled-lip";
import {ROSE_CALYX_ORGANS,validateRoseCalyxOrgans} from "./colored-pencil-rose-calyx";
import {ROSE_PINNATE_ORGANS,inspectRosePinnateOrgans} from "./colored-pencil-rose-pinnate";
import {ROSE_PHYSICAL_FOLDS,physicalFoldUndersideDetails,physicalFoldFaceDetails,inspectRosePhysicalFolds} from "./colored-pencil-rose-physical-folds";
import {ROSE_INNER_WHORL_ORGANS,inspectRoseInnerWhorl} from "./colored-pencil-rose-inner-whorl";
import {ROSE_MIDDLE_LAMINAE,inspectRoseMiddleLaminae} from "./colored-pencil-rose-middle-lamina";
import {roseFrontValueDetails,inspectRoseFrontValueBands} from "./colored-pencil-rose-front-value";
import {ROSE_PETAL_RIM_SIDEWALLS,rosePetalRimContacts,inspectRosePetalRimSidewalls} from "./colored-pencil-rose-rim-thickness";
import {ROSE_BACK_CUP_RELIEF,roseBackCupUndersideDetails,roseBackCupFaceDetails,inspectRoseBackCupRelief} from "./colored-pencil-rose-back-cup-relief";
import {ROSE_FRONT_LAMINA_VOLUME,inspectRoseFrontLaminaVolume} from "./colored-pencil-rose-front-lamina-volume";
import {ROSE_PROXIMAL_HEELS,inspectRoseProximalHeels} from "./colored-pencil-rose-proximal-heels";
import {ROSE_CENTER_KNOT_SURFACES,ROSE_CENTER_SCROLL_BACKFACE,inspectRoseCenterKnot} from "./colored-pencil-rose-center-knot";
import {ROSE_OUTER_FORM_FACE_PALETTES,roseOuterFormDeposits,inspectRoseOuterForm} from "./colored-pencil-rose-outer-form";
import {ROSE_OUTER_RIPPLE_SURFACES,inspectRoseOuterRippleSurfaces} from "./colored-pencil-rose-outer-ripple";
import {ROSE_HYPANTHIUM_ATTACHMENT,inspectRoseHypanthiumAttachment} from "./colored-pencil-rose-hypanthium";
import {roseCenterValueDetails,inspectRoseCenterValueFields} from "./colored-pencil-rose-center-local-value";
import {roseContactShadowDetails,inspectRoseContactShadows} from "./colored-pencil-rose-contact-shadows";

/**
 * Four independent original subject studies. These are *authored* silhouettes,
 * not automatic image tracing, and deliberately use the generic material API.
 * Every subject owns its anatomy / perspective; a surface recipe owns the marks.
 */
export type PencilObjectStudy = "rose" | "glass" | "architecture" | "fabric";
type Palette = readonly [string, string, string];
const rose: Palette = ["#C4485B", "#791F43", "#EE8C9B"];
const wine: Palette = ["#8E2447", "#531937", "#D45A72"];
const leaf: Palette = ["#82985B", "#405F51", "#C8C88C"];
const lemon: Palette = ["#EABF4F", "#B17F38", "#F9E19B"];
const amber: Palette = ["#C8A36C", "#79634F", "#F1D5A1"];
const glass: Palette = ["#B9D0CA", "#68878E", "#F8FFFA"];
const brick: Palette = ["#C78772", "#855D5B", "#EDBB91"];
const slate: Palette = ["#666F76", "#364D56", "#BAC0B5"];
const blueFabric: Palette = ["#73899C", "#39596D", "#BCC9C7"];
const blueDeep: Palette = ["#3E627C", "#233F56", "#8FA9B7"];

const line = (path: string, color: string, width = .85, startFrame = 185,
  opacity = .78): PencilTrace => ({
  path, color, width, startFrame, durationFrames: 48, opacity,
});

interface ObjectShape {
  id: string;
  surface: PencilSurface;
  path: string;
  bounds: readonly [number, number, number, number];
  palette: Palette;
  details?: readonly PencilTrace[];
  direction?: number;
  flow?: number;
  startFrame?: number;
}

function material(shape: ObjectShape, seed: number, transform: string,
  formAlignedRoseCenter=false): PencilRegion {
  const input: PencilMaterialInput = {
    ...shape, seed, transform,
    startFrame:shape.startFrame ?? 25, durationFrames:170,craft:true,
  };
  const region=createPencilMaterialRegion(input);
  if(!formAlignedRoseCenter)return region;

  // The general petal recipe intentionally cross-hatches at +73° / -44°.
  // That is useful on broad outer petals, but the same crossed passes collapse
  // the compact inner knot into a dark scribble at normal film size. Keep all
  // three original pigment layers and their marks; only align their paper-space
  // axes to this lamina's authored tangent and let each pass fan with the fold.
  if(region.layers.length!==3)
    throw new RangeError("Rose centre requires all three CP-F1 pigment passes");
  const direction=shape.direction??region.layers[0].angle;
  const flow=shape.flow??region.layers[0].flow??0;
  const offsets=[0,11,-9] as const;
  const fan=[1,.88,.76] as const;
  const normalise=(angle:number)=>((angle+180)%360+360)%360-180;
  return {
    ...region,
    layers:region.layers.map((layer,index)=>({
      ...layer,
      angle:normalise(direction+offsets[index]),
      flow:flow*fan[index],
    })),
  };
}

function roseShapes(laminaStudy=false,seed=173,lipStudy=false,calyxStudy=false,leafStudy=false,foldStudy=false,whorlStudy=false,middleStudy=false,rimStudy=false,crownStudy=false,volumeStudy=false,knotStudy=false,outerFormStudy=false,outerRippleStudy=false,hypanthiumStudy=false,heelStudy=false): ObjectShape[] {
  const shapes:ObjectShape[] = [
    {id:"stem",surface:"wood",palette:leaf,
      path:"M241 266 Q233 324 247 417 L254 417 Q251 331 250 268 Z",
      bounds:[230,263,30,155],direction:86,
      details:[line("M246 286 Q241 338 250 405","#D2D4A0",1.3)]},
    {id:"leaf-left",surface:"leaf",palette:leaf,
      path:"M245 337 C180 288 108 290 69 309 Q115 383 211 371 Q231 362 245 337 Z",
      bounds:[65,284,183,95],direction:17,flow:34,
      details:[
        line("M75 311 Q169 324 244 338","#E1D2A1",1.6),
        line("M116 317 Q116 352 141 367 M154 326 Q159 353 175 374 M191 332 Q200 352 206 363",
          "#3E7059",1.1),
        line("M116 318 Q127 296 149 296 M158 324 Q177 308 193 314",
          "#C3CE88",.9),
      ]},
    {id:"leaf-right",surface:"leaf",palette:leaf,
      path:"M245 362 C286 299 344 281 403 294 Q380 362 318 374 Q276 378 245 362 Z",
      bounds:[241,278,165,104],direction:-35,flow:28,
      details:[
        line("M251 360 Q317 321 397 297","#D1D8A5",1.5),
        line("M289 341 Q282 321 296 306 M316 329 Q318 350 344 360 M351 313 Q356 336 367 343",
          "#4B7159",1),
      ]},
    {id:"sepal",surface:"leaf",palette:["#6E7852","#3D5044","#BAC18A"],
      path:"M150 271 Q174 284 183 257 L211 287 Q220 290 232 281 L250 301 L259 277 Q274 284 301 268 L289 304 Q258 316 226 308 Q186 319 168 295 Z",
      bounds:[147,254,158,70],startFrame:50,
      details:[line("M182 280 Q213 314 243 304 M258 296 Q274 292 291 282",
        "#CED2A0",1)]},
    {id:"outer-left",surface:"petal",palette:wine,
      path:"M222 270 C151 260 122 229 126 166 Q133 109 188 94 C179 145 202 202 251 244 Z",
      bounds:[121,88,134,188],direction:53,flow:28,
      details:[line("M139 169 Q142 232 213 256 M173 123 Q162 179 210 231",
        "#F49CA0",1.1,209)]},
    {id:"outer-right",surface:"petal",palette:rose,
      path:"M249 259 C321 271 367 232 372 174 Q362 123 315 105 C324 173 284 211 236 237 Z",
      bounds:[230,101,146,176],direction:-51,flow:-27,
      details:[line("M358 158 Q363 216 281 253 M338 133 Q331 188 277 225",
        "#F2A6A2",1.2,212)]},
    {id:"back-cup",surface:"petal",palette:rose,
      path:"M161 158 C169 107 207 79 242 91 Q282 65 319 108 Q327 143 299 171 Q247 201 202 180 Z",
      bounds:[156,75,170,131],direction:38,
      details:[line("M173 149 Q208 114 246 124 Q281 103 307 120",
        "#F5ABAD",1.35,210)]},
    {id:"petal-front-left",surface:"petal",palette:rose,
      path:"M179 171 Q186 140 210 136 Q227 166 252 174 Q255 222 236 270 Q194 256 173 223 Q163 197 179 171 Z",
      bounds:[167,132,93,143],direction:57,flow:31,
      details:[
        line("M181 183 Q190 217 230 248 M191 161 Q199 183 230 188",
          "#FDB9B2",1.2,217),
        line("M180 206 Q195 236 221 250","#7C2447",.9,230),
      ]},
    {id:"petal-front-right",surface:"petal",palette:["#E76B72","#8D244B","#F8ADAB"],
      path:"M250 171 Q291 132 319 164 Q333 207 305 250 Q283 268 237 278 Q246 239 250 171 Z",
      bounds:[233,158,100,124],direction:-42,flow:-31,
      details:[
        line("M304 172 Q316 218 256 261 M299 191 Q294 230 267 246",
          "#FCC0AB",1.1,217),
        line("M253 176 Q259 205 249 236","#8E3154",1.1,231),
      ]},
    {id:"inner-fold",surface:"petal",palette:wine,
      path:"M205 144 Q245 118 273 144 Q302 143 307 165 Q275 163 257 180 Q228 179 206 161 Z",
      bounds:[202,136,109,47],direction:11,
      details:[line("M208 149 Q241 139 259 159 Q280 151 304 159",
        "#F8A5AD",1.1,223)]},
    {id:"heart",surface:"petal",palette:["#A93657","#641B40","#E68794"],
      path:"M222 152 Q235 133 254 150 Q263 165 252 179 Q242 184 234 174 Q229 162 240 156",
      bounds:[219,130,47,56],direction:35,flow:19,
      details:[line("M228 155 Q241 146 247 160","#FBC1BB",.9,236)]},
  ];
  // Preserve all original petal supports, layers, geometry, local contours,
  // overlapping fold edges, palettes and timeline. This optical study is
  // additive, disabled in shipped default until independent art approval.
  // Only the explicitly selected anatomical study substitutes the old
  // single, broad green polygon. Every original petal, its authored pigment
  // and its source-native detail traces remain untouched and in z-order.
  if(calyxStudy){
    const errors=validateRoseCalyxOrgans();
    if(errors.length)throw new Error("Rose calyx morphology: "+errors.join("; "));
  }
  if(leafStudy){
    const issues=inspectRosePinnateOrgans();
    if(issues.length)throw new Error("Rose odd-pinnate foliage: "+issues.join("; "));
  }
  if(foldStudy){
    const issues=inspectRosePhysicalFolds();
    if(issues.length)throw new Error("Rose shaped underturns: "+issues.join("; "));
  }
  if(whorlStudy){
    const issues=inspectRoseInnerWhorl();
    if(issues.length)throw new Error("Rose inner whorl: "+issues.join("; "));
  }
  if(middleStudy){
    const issues=inspectRoseMiddleLaminae();
    if(issues.length)throw new Error("Rose middle cup: "+issues.join("; "));
  }
  if(rimStudy){
    const issues=inspectRosePetalRimSidewalls();
    if(issues.length)throw new Error("Rose cuticle rim thickness: "+issues.join("; "));
  }
  if(crownStudy){
    const issues=inspectRoseBackCupRelief();
    if(issues.length)throw new Error("Rose rear cup physical relief: "+issues.join("; "));
  }
  if(volumeStudy){
    const issues=inspectRoseFrontLaminaVolume();
    if(issues.length)throw new Error("Rose frontal lamina material shape: "+issues.join("; "));
  }
  if(knotStudy){
    const issues=inspectRoseCenterKnot();
    if(issues.length)throw new Error("Rose center source relief: "+issues.join("; "));
  }
  if(outerFormStudy){
    const issues=inspectRoseOuterForm();
    if(issues.length)throw new Error("Rose outer petal sculptural color fields: "+issues.join("; "));
  }
  if(outerRippleStudy){
    const issues=inspectRoseOuterRippleSurfaces();
    if(issues.length)throw new Error("Rose outer petal actual edge topology: "+issues.join("; "));
  }
  if(hypanthiumStudy){
    const issues=inspectRoseHypanthiumAttachment();
    if(issues.length)throw new Error("Rose source-rooted floral axis: "+issues.join("; "));
  }
  if(heelStudy){
    const issues=inspectRoseProximalHeels();
    if(issues.length)throw new Error("Rose source-attached petal heels: "+issues.join("; "));
  }
  const anatomy:ObjectShape[]=shapes.flatMap(shape=>{
    if(leafStudy&&(shape.id==="leaf-left"||shape.id==="leaf-right")){
      const side=shape.id==="leaf-left"?"left":"right";
      return ROSE_PINNATE_ORGANS.filter(organ=>
        organ.id.startsWith("rose-"+side+"-")).map(organ=>({...organ}));
    }
    if(calyxStudy&&shape.id==="sepal")
      return ROSE_CALYX_ORGANS.map(organ=>{
        const source=organ.id==="calyx-receptacle"&&hypanthiumStudy?
          ROSE_HYPANTHIUM_ATTACHMENT:undefined;
        return {...organ,surface:"leaf" as const,startFrame:50,
          ...(source?{path:source.path,bounds:source.bounds,
            details:[...organ.details,...source.details]}:{})};
      });
    // The inner cup uses independently curved real material rather than a
    // generic spiral. Every keyed original pigment seed and pre-existing
    // contact remains; only opt-in lamina paths and additional dry marks change.
    const knot=(part:ObjectShape):ObjectShape=>{
      const source=knotStudy?ROSE_CENTER_KNOT_SURFACES.find(o=>o.id===part.id):undefined;
      return source?{...part,path:source.path,bounds:source.bounds,
        palette:source.palette,direction:source.direction,flow:source.flow,
        // Long legacy centre arcs are re-authored as short local contacts;
        // the four existing whorl fibres remain and are separately aligned.
        details:[...(source.replacementBaseDetails??part.details??[]),
          ...source.dryContours]}:part;
    };
    if(whorlStudy&&shape.id==="inner-fold")
      return [knot(shape),...ROSE_INNER_WHORL_ORGANS
        .filter(o=>o.id!=="rose-whorl-scroll").map(o=>knot({...o}))];
    if(whorlStudy&&shape.id==="heart"){
      const scroll=ROSE_INNER_WHORL_ORGANS.find(o=>o.id==="rose-whorl-scroll")!;
      const under=ROSE_CENTER_SCROLL_BACKFACE;
      const realUnderside:ObjectShape={
        id:under.id,surface:"petal",palette:under.palette,path:under.path,
        bounds:under.bounds,direction:under.direction,flow:under.flow,
        details:under.details,
      };
      return knotStudy?[knot(shape),realUnderside,knot({...scroll})]:
        [shape,scroll];
    }
    const fold=foldStudy?ROSE_PHYSICAL_FOLDS.find(f=>f.id===shape.id):undefined;
    if(fold){
      // The independently authored rear crest replaces BOTH physical halves
      // of the back cup, preserving every other petal and the optional
      // frontal cuticle sidewalls introduced separately.
      const source=crownStudy&&shape.id==="back-cup"?ROSE_BACK_CUP_RELIEF:fold;
      const underturn:ObjectShape={
        id:"rose-turn-"+shape.id,surface:"petal",palette:source.undersidePalette,
        path:source.underside,bounds:source.undersideBounds,
        direction:source.direction,flow:source.flow,startFrame:shape.startFrame??25,
        details:source===ROSE_BACK_CUP_RELIEF?
          roseBackCupUndersideDetails():physicalFoldUndersideDetails(fold),
      };
      const frontalContacts=source===ROSE_BACK_CUP_RELIEF?
        roseBackCupFaceDetails():physicalFoldFaceDetails(fold);
      // Upper attachment remains byte-exact with both old turned underside
      // and true original sidewall. Only the full front-facing lamina belly
      // and its material-specific crease/vein contacts are reconstructed.
      const volume=volumeStudy?ROSE_FRONT_LAMINA_VOLUME.find(v=>v.id===shape.id):undefined;
      const heel=heelStudy?ROSE_PROXIMAL_HEELS.find(v=>v.id===shape.id):undefined;
      const ripple=outerRippleStudy?ROSE_OUTER_RIPPLE_SURFACES.find(v=>v.id===shape.id):undefined;
      const contacts=[...frontalContacts,...(volume?.contacts??[]),...(heel?.contacts??[]),...(ripple?.contacts??[])];
      const outerPetal=shape.id==="outer-left"||shape.id==="outer-right"?
        shape.id:undefined;
      const face:ObjectShape={
        ...shape,path:heel?.face??volume?.face??ripple?.face??source.face,
        bounds:heel?.bounds??volume?.bounds??ripple?.bounds??source.faceBounds,
        // Only the explicitly requested facing lamina receives a warmer
        // middle-value material palette; the cool physically turned underside,
        // original flowers, and all material seeds are left untouched.
        palette:outerFormStudy&&outerPetal?
          ROSE_OUTER_FORM_FACE_PALETTES[outerPetal]:shape.palette,
        ...(contacts.length?
          {details:[...(shape.details??[]),...contacts]}:{}),
      };
      const rimSource=rimStudy?ROSE_PETAL_RIM_SIDEWALLS.find(r=>r.faceId===shape.id):undefined;
      const rim:ObjectShape|undefined=rimSource?{
        id:rimSource.id,surface:"petal",palette:rimSource.palette,
        path:rimSource.path,bounds:rimSource.bounds,
        direction:rimSource.direction,flow:rimSource.flow,
        startFrame:shape.startFrame??25,
        details:rosePetalRimContacts(rimSource),
      }:undefined;
      return shape.id==="back-cup"&&middleStudy?
        [underturn,face,...ROSE_MIDDLE_LAMINAE]:
        rim?[underturn,face,rim]:[underturn,face];
    }
    if(middleStudy&&shape.id==="back-cup")
      return [shape,...ROSE_MIDDLE_LAMINAE];
    return [shape];
  });
  return !laminaStudy&&!lipStudy?anatomy:anatomy.map(shape=>({
    ...shape,details:[...(shape.details??[]),
      ...(laminaStudy&&ROSE_LAMINA_AXES.some(a=>a.id===shape.id)?roseLaminaFibres(shape.id,seed):[]),
      ...(lipStudy&&ROSE_LIP_BANDS.some(a=>a.id===shape.id)?roseRolledLipTraces(shape.id):[])],
  }));
}

function glassShapes(): ObjectShape[] {
  return [
    {id:"table-linen",surface:"fabric",palette:blueFabric,
      path:"M23 338 Q92 317 163 331 Q249 349 335 323 L435 339 L442 397 Q317 406 220 391 Q112 408 17 393 Z",
      bounds:[15,317,430,93],direction:22,flow:32,
      details:[
        line("M40 351 Q131 338 199 361 Q287 369 419 343 M33 381 Q129 367 217 385 Q331 398 428 373",
          "#D1D7CC",1.6,206),
        line("M104 351 Q114 381 149 393 M293 358 Q301 383 337 396",
          "#2B546C",1.1,229),
      ]},
    {id:"vessel-shadow",surface:"cast-shadow",palette:["#77706F","#645E60","#B4A79D"],
      path:"M186 323 Q293 307 369 326 Q312 342 206 339 Z",
      bounds:[179,306,195,38],direction:7,startFrame:55},
    {id:"pitcher",surface:"glass",palette:glass,
      path:"M218 92 Q259 79 300 91 L306 110 Q302 160 325 196 Q349 245 327 305 Q300 330 228 309 Q200 279 215 233 Q236 181 215 116 Z",
      bounds:[196,75,159,260],direction:79,flow:14,
      details:[
        line("M219 94 Q261 107 301 94 M224 108 Q263 117 305 110",
          "#F6FFFF",2.1,176,.93),
        line("M231 137 Q238 171 232 202 M228 224 Q218 270 240 295",
          "#F7FFFC",2.8,192,.94),
        line("M316 231 Q333 268 313 301 M286 313 Q302 311 311 306",
          "#3D6673",1.65,213,.78),
        line("M243 114 Q259 124 282 117 M229 276 Q277 290 325 272",
          "#88A9AB",1.05,203),
        line("M240 298 Q270 322 312 303 M235 245 Q236 222 246 204",
          "#EEF4E7",1.3,221),
      ]},
    {id:"handle",surface:"glass",palette:glass,
      path:"M301 126 C385 105 407 176 371 218 Q353 238 327 223 L332 210 Q358 225 372 204 C395 171 371 128 310 144 Z",
      bounds:[300,109,105,130],direction:73,flow:9,
      details:[line("M336 124 Q388 128 385 178 Q382 209 361 215",
        "#FEFFFF",2.4,207,.94)]},
    {id:"lemon",surface:"citrus",palette:lemon,
      path:"M46 268 Q62 234 106 227 Q145 224 168 251 Q184 280 158 311 Q128 337 82 324 Q49 315 42 292 Q34 277 46 268 Z",
      bounds:[38,223,147,116],direction:-27,flow:21,
      details:[
        line("M52 279 Q77 249 111 248 M62 301 Q112 338 157 299",
          "#FFF2BD",1.4,203),
        line("M63 278 L68 274 M96 257 L103 256 M141 281 L147 284 M99 315 L104 314",
          "#907444",.75,219),
        line("M42 280 Q29 281 30 291 Q38 294 45 289",
          "#7B7C4A",1.25,224),
      ]},
    {id:"citrus-cut",surface:"citrus",palette:["#F5E4A8","#BE9851","#FFFFDA"],
      path:"M126 286 C152 262 183 273 190 305 C196 341 156 357 135 336 Q115 314 126 286 Z",
      bounds:[114,268,82,94],direction:12,flow:9,
      details:[
        line("M154 284 Q152 315 166 343 M132 308 L184 317 M144 289 Q156 324 137 331",
          "#FFFBE5",2,215,.92),
        line("M151 280 Q174 276 186 305 Q195 339 165 349",
          "#AC8B56",1.2,225),
      ]},
    {id:"brass-rim",surface:"metal",palette:amber,
      path:"M210 90 Q257 80 303 90 L302 102 Q260 94 215 103 Z",
      bounds:[206,77,100,28],direction:5,
      details:[line("M216 90 Q264 85 300 92","#FFF2C8",1.7,209)]},
  ];
}

function architectureShapes(): ObjectShape[] {
  const brickJoints: string[] = [];
  for (let row = 0; row < 12; row++) {
    const y = 127 + row * 20;
    brickJoints.push("M48 " + y + " L432 " + y);
    for (let j = 0; j < 12; j++) {
      const x = 49 + j*32 + (row%2 ? 16 : 0);
      if (x < 431) brickJoints.push("M" + x + " " + y + " v" + (13 + (j % 3)));
    }
  }
  const window = (id:string,x:number):ObjectShape => ({
    id, surface:"glass", palette:glass,
    path:"M"+x+" 179 Q"+(x+4)+" 151 "+(x+36)+" 151 Q"+(x+67)+" 151 "+(x+72)+" 179 L"+(x+72)+" 327 L"+x+" 327 Z",
    bounds:[x-2,148,77,181],direction:74,
    details:[
      line("M"+(x+35)+" 153 L"+(x+35)+" 325 M"+x+" 210 L"+(x+72)+" 210 M"+x+" 267 L"+(x+72)+" 267",
        "#E5E5D2",2.1,198),
      line("M"+(x+8)+" 181 Q"+(x+12)+" 156 "+(x+34)+" 158 M"+(x+54)+" 171 L"+(x+61)+" 305",
        "#F8F9EB",1.6,211),
    ],
  });
  const recess = (id:string,x:number):ObjectShape => ({
    id,surface:"stone",palette:slate,
    path:"M"+(x-7)+" 174 Q"+(x+1)+" 144 "+(x+36)+" 144 Q"+(x+71)+" 144 "+(x+79)+" 174 L"+(x+79)+" 334 L"+(x-7)+" 334 Z",
    bounds:[x-9,140,92,198],direction:10,
  });
  return [
    {id:"facade",surface:"masonry",palette:brick,
      path:"M36 122 Q242 104 444 123 L447 390 L32 390 Z",
      bounds:[30,99,420,300],startFrame:35,direction:5,
      details:[
        line(brickJoints.join(" "),"#805958",.62,205,.51),
        line("M42 125 Q242 117 440 130 M42 372 L438 375",
          "#F2CEB2",1.65,221),
      ]},
    {id:"parapet",surface:"stone",palette:["#B8A08E","#696F6C","#DDCEB6"],
      path:"M22 100 L75 100 L78 83 L145 83 L148 93 L301 91 L305 80 L372 80 L376 101 L456 101 L460 125 Q234 114 22 126 Z",
      bounds:[19,78,444,51],direction:5,
      details:[
        line("M26 108 L74 108 M80 92 L141 92 M151 101 L294 100 M307 90 L371 90 M381 109 L450 108",
          "#E7D7B9",1.4,208),
      ]},
    recess("recess-one",92),
    recess("recess-two",202),
    recess("recess-three",312),
    window("window-one",92),
    window("window-two",202),
    window("window-three",312),
    {id:"storefront-awning",surface:"fabric",palette:blueDeep,
      path:"M23 337 Q112 330 213 339 Q327 348 454 334 L450 357 Q408 362 371 356 Q326 370 291 360 Q253 372 219 363 Q177 372 148 359 Q109 372 74 359 L25 361 Z",
      bounds:[19,328,438,47],direction:3,flow:7,
      details:[line("M31 343 Q232 352 449 344","#C4D6D1",2.2,215)]},
    {id:"ground-shadow",surface:"cast-shadow",palette:["#5A6866","#4F5956","#A49D86"],
      path:"M39 386 Q237 379 440 387 Q358 409 133 407 Z",
      bounds:[35,375,410,40],direction:6,startFrame:100},
    {id:"door",surface:"wood",palette:["#89675F","#4A4448","#C9A58B"],
      path:"M203 365 L286 365 L286 390 L203 390 Z",
      bounds:[200,362,90,31],direction:90,startFrame:115,
      details:[line("M222 367 L222 385 M267 367 L267 385","#D7C9AD",1.1,220)]},
  ];
}

function fabricShapes(): ObjectShape[] {
  return [
    {id:"back-cloth",surface:"fabric",palette:blueFabric,
      path:"M46 134 Q121 77 198 132 Q273 176 367 118 Q399 145 412 213 Q374 232 328 220 Q263 215 210 255 Q147 296 72 253 Q35 221 46 134 Z",
      bounds:[31,70,387,236],direction:35,flow:35,
      details:[
        line("M58 148 Q154 105 211 170 Q263 225 370 149",
          "#D4E3DC",2.4,208),
        line("M72 226 Q146 269 212 226 Q302 178 393 219",
          "#28475B",2,213),
      ]},
    {id:"fold-shadow",surface:"fabric",palette:blueDeep,
      path:"M76 248 Q147 284 218 244 Q301 188 393 227 Q367 289 324 306 Q248 317 199 356 Q124 364 77 316 Z",
      bounds:[73,219,325,144],direction:20,flow:25,
      details:[
        line("M90 270 Q162 326 238 267 Q304 236 369 249",
          "#AFC6C7",2.1,222),
        line("M124 316 Q191 344 246 303 M252 312 Q309 286 332 289",
          "#293F59",1.4,237),
      ]},
    {id:"fold-lip",surface:"fabric",palette:["#91ABB7","#50748C","#D9DCD0"],
      path:"M74 305 Q147 340 205 302 Q260 276 326 283 Q275 326 233 354 Q158 392 86 362 Z",
      bounds:[69,272,264,126],direction:27,flow:27,
      details:[
        line("M83 315 Q151 350 210 312 Q277 286 313 292",
          "#F1EFE1",1.7,216),
        line("M105 356 Q165 374 219 337","#34536B",1.5,234),
      ]},
    {id:"brass-contact-shadow",surface:"cast-shadow",palette:["#526371","#3B4654","#889DA0"],
      path:"M156 227 Q247 208 337 232 Q297 254 176 249 Z",
      bounds:[150,206,191,52],direction:3,startFrame:72},
    {id:"brass-cup-handle",surface:"metal",palette:amber,
      path:"M298 112 C348 103 387 132 372 182 Q360 206 319 187 L325 174 Q353 197 365 171 C376 145 353 123 305 130 Z",
      bounds:[292,99,91,111],direction:62,flow:13,
      details:[line("M312 114 Q352 107 371 143 Q380 166 361 188",
        "#FFF0C6",1.45,209)]},
    {id:"brass-cup-body",surface:"metal",palette:amber,
      path:"M179 93 Q247 77 307 96 Q321 123 313 177 Q307 212 291 235 Q243 251 203 231 Q181 205 174 164 Q166 124 179 93 Z",
      bounds:[165,75,161,182],direction:69,flow:18,
      details:[
        line("M188 103 Q194 167 211 210","#FFF1CE",2.8,197,.95),
        line("M292 109 Q309 160 297 207","#514849",2,215),
        line("M206 232 Q248 245 285 226","#F4D5A3",1.8,216),
      ]},
    {id:"brass-cup-rim",surface:"metal",palette:["#E3C68B","#876E5D","#FFF2C5"],
      path:"M176 92 Q245 67 310 92 Q318 105 304 109 Q237 123 177 109 Q166 103 176 92 Z",
      bounds:[168,67,149,61],direction:2,flow:7,
      details:[
        line("M181 95 Q242 72 307 94 M181 105 Q243 115 304 105",
          "#F8E2B5",1.8,208),
      ]},
  ];
}

export interface PencilObjectStudyOptions {
  subject: PencilObjectStudy;
  aspect: PencilAspect;
  paperTooth?: number;
  seed?: number;
  /** Global studio art-direction knob; local material deposition remains distinct. */
  pressure?: number;
  /** Opt-in original anatomical petal fibre study; not artist-approved. */
  roseLaminaStudy?: boolean;
  /** Experimental source-native rose rolled-lip tonal edges; off by default. */
  roseLipStudy?: boolean;
  /** Opt-in FLORA1: five anatomically attached sepals and a receptacle. */
  roseCalyxStudy?: boolean;
  /** Opt-in FLORA1 five-leaflet rose foliage, serrations and stipules. */
  rosePinnateStudy?: boolean;
  /** Opt-in physical undersides and re-profiled corolla, not optical lines. */
  rosePhysicalFolds?: boolean;
  /** Opt-in four independently shaded nested central rose petals. */
  roseInnerWhorlStudy?: boolean;
  /** Opt-in three individually curved middle-whorl laminae; ART HOLD. */
  roseMiddleCupStudy?: boolean;
  /** Opt-in original form-aligned local dry-pigment value planes; requires physical folds. */
  roseFrontValueStudy?: boolean;
  /** Opt-in two genuine, variably thick frontal petal cuticle sidewalls; requires folded petal supports. */
  rosePetalRimStudy?: boolean;
  /** Opt-in nonuniform rear cup scallop and thick individually drawn underside. */
  roseBackCupReliefStudy?: boolean;
  /** Opt-in broad convex frontal lamina source reconstruction. Requires physical folds. */
  roseFrontLaminaVolumeStudy?: boolean;
  /** Experimental true source-curved center knot, with a physically separate scroll reverse. */
  roseCenterKnotStudy?: boolean;
  /** Opt-in source-curved dry-pencil color transitions on two outer adaxial rose petals. */
  roseOuterFormStudy?: boolean;
  /** Experimental nonmirrored outer petal edge silhouettes; existing physical reverse is retained. */
  roseOuterRippleStudy?: boolean;
  /** Original gently diffused pencil values for the six true center knot surfaces. */
  roseCenterValueStudy?: boolean;
  /** Five independent between-petal physical source contact-shadow valleys; opt-in knot required. */
  roseContactShadowStudy?: boolean;
  /** Continuous calyx-receptacle wall rising to the real under-petal root (opt-in). */
  roseHypanthiumAttachmentStudy?: boolean;
  /** Two continuous rounded proximal front-petal heels, preserving old upper cuticle hinge. */
  roseProximalHeelStudy?: boolean;
}

export const PENCIL_OBJECT_STUDIES: readonly PencilObjectStudy[] =
  ["rose","glass","architecture","fabric"];

export function pencilObjectStudyDrawing({
  subject, aspect, paperTooth = .72, seed = 173, pressure = 1,
  roseLaminaStudy = false, roseLipStudy = false, roseCalyxStudy = false,
  rosePinnateStudy = false, rosePhysicalFolds = false,
  roseInnerWhorlStudy = false, roseMiddleCupStudy = false,
  roseFrontValueStudy = false, rosePetalRimStudy = false,
  roseBackCupReliefStudy = false, roseFrontLaminaVolumeStudy = false,
  roseCenterKnotStudy = false, roseOuterFormStudy = false,
  roseCenterValueStudy = false, roseOuterRippleStudy = false,
  roseContactShadowStudy = false, roseHypanthiumAttachmentStudy = false,
  roseProximalHeelStudy = false,
}: PencilObjectStudyOptions): PencilDrawingSpec {
  if (!PENCIL_OBJECT_STUDIES.includes(subject)) throw new RangeError("Invalid pencil object study");
  if (aspect !== "landscape" && aspect !== "portrait") throw new RangeError("Invalid pencil output aspect");
  if (!Number.isFinite(paperTooth) || paperTooth < 0 || paperTooth > 1)
    throw new RangeError("Invalid pencil paper tooth");
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 2147483000)
    throw new RangeError("Invalid pencil object seed");
  if (!Number.isFinite(pressure) || pressure < .2 || pressure > 1.2)
    throw new RangeError("Pencil pressure must be .2–1.2");
  if(typeof roseLaminaStudy !== "boolean")
    throw new RangeError("Rose lamina study flag must be boolean");
  if(typeof roseLipStudy !== "boolean")
    throw new RangeError("Rose lip study flag must be boolean");
  if(typeof roseCalyxStudy !== "boolean")
    throw new RangeError("Rose calyx study flag must be boolean");
  if(typeof rosePinnateStudy !== "boolean")
    throw new RangeError("Rose pinnate study flag must be boolean");
  if(typeof rosePhysicalFolds !== "boolean")
    throw new RangeError("Rose physical folds flag must be boolean");
  if(typeof roseInnerWhorlStudy !== "boolean")
    throw new RangeError("Rose inner whorl flag must be boolean");
  if(typeof roseMiddleCupStudy !== "boolean")
    throw new RangeError("Rose middle cup flag must be boolean");
  if(typeof roseFrontValueStudy !== "boolean")
    throw new RangeError("Rose frontal value study flag must be boolean");
  if(typeof rosePetalRimStudy !== "boolean")
    throw new RangeError("Rose cuticle rim study flag must be boolean");
  if(typeof roseBackCupReliefStudy !== "boolean")
    throw new RangeError("Rose back-cup relief flag must be boolean");
  if(typeof roseFrontLaminaVolumeStudy !== "boolean")
    throw new RangeError("Rose front lamina volume flag must be boolean");
  if(typeof roseCenterKnotStudy !== "boolean")
    throw new RangeError("Rose center knot study flag must be boolean");
  if(typeof roseOuterFormStudy !== "boolean")
    throw new RangeError("Rose outer form study flag must be boolean");
  if(typeof roseOuterRippleStudy !== "boolean")
    throw new RangeError("Rose outer ripple flag must be boolean");
  if(subject==="rose"&&roseOuterRippleStudy&&!rosePhysicalFolds)
    throw new RangeError("Rose outer ripple requires physically attached underturned petals");
  if(typeof roseCenterValueStudy !== "boolean")
    throw new RangeError("Rose center value study flag must be boolean");
  if(typeof roseContactShadowStudy !== "boolean")
    throw new RangeError("Rose contact-shadow study flag must be boolean");
  if(typeof roseHypanthiumAttachmentStudy !== "boolean")
    throw new RangeError("Rose hypanthium attachment flag must be boolean");
  if(typeof roseProximalHeelStudy !== "boolean")
    throw new RangeError("Rose proximal heel flag must be boolean");
  if(subject==="rose"&&roseProximalHeelStudy&&
    (!rosePhysicalFolds||!roseFrontLaminaVolumeStudy||!roseCalyxStudy||!roseHypanthiumAttachmentStudy))
    throw new RangeError("Rose proximal heels need real folded frontal laminae, calyx and hypanthium");
  if(subject==="rose"&&roseHypanthiumAttachmentStudy&&
    (!roseCalyxStudy||!rosePhysicalFolds))
    throw new RangeError("Rose hypanthium needs real calyx organs and folded front petals");
  if(subject==="rose"&&roseContactShadowStudy&&!roseCenterKnotStudy)
    throw new RangeError("Rose contact shadows require real source center knot");
  if(subject==="rose"&&roseContactShadowStudy){
    const issues=inspectRoseContactShadows();
    if(issues.length)throw new RangeError("Rose physical contact shadows: "+issues.join("; "));
  }
  if(subject==="rose"&&roseCenterValueStudy&&!roseCenterKnotStudy)
    throw new RangeError("Rose center values require independently authored source knot petals");
  if(subject==="rose"&&roseCenterValueStudy){
    const errors=inspectRoseCenterValueFields();
    if(errors.length)throw new RangeError("Rose center value fields: "+errors.join("; "));
  }
  if(subject==="rose"&&roseOuterFormStudy&&!rosePhysicalFolds)
    throw new RangeError("Rose outer form requires real physical fold anatomy");
  if(subject==="rose"&&roseCenterKnotStudy&&!roseInnerWhorlStudy)
    throw new RangeError("Rose source center reconstruction requires real inner-whorl laminae");
  if(subject==="rose"&&roseFrontLaminaVolumeStudy&&!rosePhysicalFolds)
    throw new RangeError("Rose front lamina volume requires physical fold anatomy");
  if(subject==="rose"&&roseBackCupReliefStudy&&!rosePhysicalFolds)
    throw new RangeError("Rose back-cup relief requires physical fold anatomy");
  if(subject==="rose"&&rosePetalRimStudy&&!rosePhysicalFolds)
    throw new RangeError("Rose cuticle sidewalls require source-connected physical folds");
  if(subject==="rose"&&roseFrontValueStudy&&!rosePhysicalFolds)
    throw new RangeError("Rose frontal values require the anatomically folded petal supports");
  if(subject==="rose"&&roseFrontValueStudy){
    const errors=inspectRoseFrontValueBands();
    if(errors.length)throw new RangeError("Rose frontal value axes: "+errors.join("; "));
  }
  const shapes = subject === "rose" ? roseShapes(roseLaminaStudy,seed,roseLipStudy,roseCalyxStudy,rosePinnateStudy,rosePhysicalFolds,roseInnerWhorlStudy,roseMiddleCupStudy,rosePetalRimStudy,roseBackCupReliefStudy,roseFrontLaminaVolumeStudy,roseCenterKnotStudy,roseOuterFormStudy,roseOuterRippleStudy,roseHypanthiumAttachmentStudy,roseProximalHeelStudy) :
    subject === "glass" ? glassShapes() :
    subject === "architecture" ? architectureShapes() : fabricShapes();
  const transform = aspect === "landscape" ? "translate(416 32) scale(1.08)" :
    "translate(24 246) scale(1.07)";
  // Keep original material hashes byte-stable even when experimental calyx
  // organs expand one botanical shape into six. Otherwise inserting the calyx
  // silently re-seeds every original petal and destroys A/B fidelity.
  const roseOriginalIds=[
    "stem","leaf-left","leaf-right","sepal","outer-left","outer-right",
    "back-cup","petal-front-left","petal-front-right","inner-fold","heart",
  ] as const;
  const regions = shapes.map((shape, i) => {
    // Permit every valid UI seed while keeping each material pass in signed-31-bit range.
    const original=subject==="rose"&&(roseCalyxStudy||rosePinnateStudy||rosePhysicalFolds||roseInnerWhorlStudy||roseMiddleCupStudy||rosePetalRimStudy||roseCenterKnotStudy)?
      roseOriginalIds.findIndex(id=>id===shape.id):-1;
    // The original seven-petal material hashes never change. Calyx organ
    // material seeds also remain identical when foliage is simultaneously on;
    // the new leaf organs precede the calyx in the authored z-order.
    const calyxIndex=subject==="rose"&&roseCalyxStudy?
      ROSE_CALYX_ORGANS.findIndex(organ=>organ.id===shape.id):-1;
    const foldIndex=subject==="rose"&&rosePhysicalFolds?
      ROSE_PHYSICAL_FOLDS.findIndex(f=>"rose-turn-"+f.id===shape.id):-1;
    const whorlIndex=subject==="rose"&&roseInnerWhorlStudy?
      ROSE_INNER_WHORL_ORGANS.findIndex(o=>o.id===shape.id):-1;
    const middleIndex=subject==="rose"&&roseMiddleCupStudy?
      ROSE_MIDDLE_LAMINAE.findIndex(o=>o.id===shape.id):-1;
    const rimIndex=subject==="rose"&&rosePetalRimStudy?
      ROSE_PETAL_RIM_SIDEWALLS.findIndex(o=>o.id===shape.id):-1;
    const knotIndex=subject==="rose"&&roseCenterKnotStudy&&
      shape.id===ROSE_CENTER_SCROLL_BACKFACE.id?42:-1;
    const materialIndex=original>=0?original:
      calyxIndex>=0?3+calyxIndex:
      foldIndex>=0?22+foldIndex:
      whorlIndex>=0?31+whorlIndex:
      middleIndex>=0?35+middleIndex:
      rimIndex>=0?40+rimIndex:
      knotIndex>=0?knotIndex:i;
    const centerSurface=subject==="rose"&&roseCenterKnotStudy&&(
      ROSE_CENTER_KNOT_SURFACES.some(s=>s.id===shape.id)||
      shape.id===ROSE_CENTER_SCROLL_BACKFACE.id);
    const region = material(shape,
      (seed + materialIndex * 311) % 2147483647, transform,centerSurface);
    const frontal=subject==="rose"&&roseFrontValueStudy&&
      (shape.id==="petal-front-left"||shape.id==="petal-front-right")?
      roseFrontValueDetails(shape.id,seed):undefined;
    const outer=subject==="rose"&&roseOuterFormStudy&&
      (shape.id==="outer-left"||shape.id==="outer-right")?
      roseOuterFormDeposits(shape.id,seed):undefined;
    const center=subject==="rose"&&roseCenterValueStudy&&
      ROSE_CENTER_KNOT_SURFACES.some(s=>s.id===shape.id)?
      roseCenterValueDetails(shape.id as typeof ROSE_CENTER_KNOT_SURFACES[number]["id"],seed):undefined;
    const contact=subject==="rose"&&roseContactShadowStudy&&
      ROSE_CENTER_KNOT_SURFACES.some(s=>s.id===shape.id)?
      roseContactShadowDetails(shape.id as typeof ROSE_CENTER_KNOT_SURFACES[number]["id"],seed):undefined;
    return { ...region, ...(frontal||outer||center||(contact?.length)?{
      interiorDetails:[...(frontal??[]),...(outer??[]),...(center??[]),...(contact??[])]}:{}),
      layers:region.layers.map(layer => ({
        ...layer, pressure:Math.min(1, layer.pressure * pressure),
      })) };
  });
  const references={
    rose:{
      title:"Ann Swan — large-scale botanical coloured-pencil work",
      url:"https://annswan.co.uk/",
      observation:"Ruffled petals have independent folds, exposed paper highlights and curved vein direction.",
    },
    glass:{
      title:"Janie Gildow — layer pressure and burnishing instruction",
      url:"https://www.desertmuseumarts.com/",
      observation:"Light-to-medium pigment pressure and reserved reflected highlights separate transparent glass from opaque pigment.",
    },
    architecture:{
      title:"Caran d'Ache — layering and pencil depth guide",
      url:"https://www.carandache.com/gb/en/blending-colours-with-coloured-pencils",
      observation:"Nested value layers and hard edge accents define masonry course depth without flat single-colour fills.",
    },
    fabric:{
      title:"Jesse Lane — portrait fabric light and shadow studies",
      url:"https://www.jesselaneart.com/gallery",
      observation:"Broad cloth folds require tonal gradients, sharp contact shadows and direction-aware microstrokes.",
    },
  } as const;
  return createPencilFoundationDrawing({
    version:1, seed, width:aspect === "landscape" ? 960 : 540,
    height:aspect === "landscape" ? 540 : 960,
    paper:"#F9F5EA", paperTooth, regions,
  },{
    subject:subject==="rose"?"botanical":subject==="architecture"?"architecture":"object",
    medium:"dry",
    references:[{...references[subject],rights:"technique-only"},
      ...(subject==="rose"&&roseInnerWhorlStudy?[{
        title:"UPOV TG/11/8 and APHIS rose double-flower morphology",
        url:"https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf",
        rights:"technique-only" as const,
        observation:"Double roses have progressively occluded shorter inner petals; independent curled lamina and deep negative pockets, not stamped nested circles.",
      }]:[]),
      ...(subject==="rose"&&roseMiddleCupStudy?[{
        title:"Karen Elaine Evans — Pink Rose (artist-owned coloured-pencil source)",
        url:"https://www.artfinder.com/product/pink-rose-6a554/",
        rights:"technique-only" as const,
        observation:"Anatomical double-rose cup has separate intermediate hooked petal faces with asymmetrical shoulders, counterturning edges and dark fold attachment, rather than a single empty band.",
      }]:[]),
      ...(subject==="rose"&&roseHypanthiumAttachmentStudy?[{
        title:"K. R. Robertson / Illinois Natural History Survey — perigynous insertion in Rosa",
        url:"https://www.life.illinois.edu/help/digitalflowers/Flowers/56.htm",
        rights:"technique-only" as const,
        observation:"The green receptacular cup physically supports petal bases, carries five sepals and joins the floral stalk. A broad continuous hypanthium is seen from behind the corolla, not two isolated green stickers separated from the rose by blank paper.",
      }]:[]),
      ...(subject==="rose"&&roseContactShadowStudy?[{
        title:"Leyth and chuttersnap — CC0 rose closeup photographs (Wikimedia Commons)",
        url:"https://commons.wikimedia.org/wiki/File:Rose_Blossom_Closeup.jpg",
        rights:"technique-only" as const,
        observation:"Two original CC0 oblique pink and red closeup roses show independent petal overlaps and asymmetric cast shadows on exposed lower petals. References are separately documented, not digitally registered to this imagined rose.",
      }]:[]),
      ...(subject==="rose"&&roseCenterValueStudy?[{
        title:"CPSA ArtTopics — original colored-pencil rose value transitions",
        url:"https://cpsa.org/wp-content/uploads/ARTopics01_Maklowski_GoldLeaf.pdf",
        rights:"technique-only" as const,
        observation:"A hand-drawn rose shows sharp structural boundaries between central petals yet soft changes through cool shadow, mid-rose and returned warm light within each curved lamina; dry pencil fields are clipped to individually built source shapes.",
      }]:[]),
      ...(subject==="rose"&&roseOuterRippleStudy?[{
        title:"Sakurai Midori — Rosa chinensis petals (2006), CC BY-SA 3.0",
        url:"https://commons.wikimedia.org/wiki/File:Rosa_chinensis_petals.jpg",
        rights:"technique-only" as const,
        observation:"Natural rose outer petal margins have uneven convex lobes, local rolled lips and one-sided edge notches. The fresh faces must preserve the actual upper fold seam of the differently shaded abaxial reverse rather than applying an artificial overpaint outline.",
      },{
        title:"Riboim — original Rosa Centifolia photo (2024), CC0",
        url:"https://commons.wikimedia.org/wiki/File:Rosa_Centifolia.jpg",
        rights:"technique-only" as const,
        observation:"The broader petal margin is wavy and asymmetric; its curved distal edge develops slightly different scallop intervals on opposing petals. This is a separate cultivar and only a general shape observation, not a registered landmark match.",
      }]:[]),
      // The same Evans original is already attributed by the middle cup.
      // In the new combined experiment prefer unique morphological evidence:
      // keep exactly one cited Evans URL (12-reference CP-F1 hard ceiling).
      ...(subject==="rose"&&roseOuterFormStudy&&
        !(roseHypanthiumAttachmentStudy&&roseMiddleCupStudy)?[{
        title:"Karen Elaine Evans — artist-original Pink Rose colored-pencil form",
        url:"https://www.artfinder.com/product/pink-rose-6a554/",
        rights:"technique-only" as const,
        observation:"Reflexed outer rose laminae have a rounded warm midtone, cool fold contact and interrupted edge-return light, built through layered dry-pencil pigment rather than perfectly concentric bands or flat fills.",
      }]:[]),
      ...(subject==="rose"&&roseCenterKnotStudy?[{
        title:"Dianne Sutherland — drawing a complex rose structure",
        url:"https://www.botanicalartcourses.com/post/drawing-a-complex-flower-structure-rose",
        rights:"technique-only" as const,
        observation:"Outer petals enclose a compact irregular central bud: short, overlapping surfaces must recede in depth, with genuinely visible tucked backfaces; a uniform concentric C motif lacks anatomical changes of plane.",
      }]:[]),
      ...(subject==="rose"&&roseFrontLaminaVolumeStudy?[{
        title:"Plant Cell — ethylene-regulated asymmetric petal-base growth of hybrid roses",
        url:"https://academic.oup.com/plcell/article/33/4/1229/6126472",
        rights:"technique-only" as const,
        observation:"Rose petal opening produces unequal proximal and distal curvature, outward asymmetric expansion, a rounded adaxial belly and tightly hinged overhang, so the front lamina cannot terminate in a simple triangular tip.",
      }]:[]),
      ...(subject==="rose"&&roseBackCupReliefStudy?[{
        title:"Draw Botanical — original rose petal and cup studies at NYBG",
        url:"https://drawbotanical.com/how-to-draw-a-rose/",
        rights:"technique-only" as const,
        observation:"Rear rose cup has irregular staggered scalloped apex, asymmetrical fold thickness and restrained dry-pencil contact near the physical hinge, retaining an opaque facing lamina.",
      }]:[]),
      ...(subject==="rose"&&roseFrontValueStudy?[{
        title:"Gary Greene — Rose in coloured pencil, layered local value",
        url:"https://www.artistsnetwork.com/art-techniques/touchable-textures-in-colored-pencil/",
        rights:"technique-only" as const,
        observation:"The actual source rose shading builds distinct deep red shadow contacts first, lighter rose and reflected values later; local axes follow curling petal surfaces.",
      }]:[])],
    construction:subject==="rose"?
      "Author the stem, petal overlap, continuous attached leaf veins, shadow pockets and isolated curled lamina edges before pencil deposits.":
      subject==="glass"?
      "Align transparent pitcher rim, specular reflections, citrus pulp, cast shadows and foreground contacts before medium shading.":
      subject==="architecture"?
      "Author building perspective, doorway depth, roof silhouettes, masonry courses and their light-facing planes before texture.":
      "Stage folded textile masses, fold-lip overlap, reflected brass edges and contact shadow under the cup.",
    surfaces:Object.fromEntries(shapes.map(shape=>[shape.id,shape.surface])),
  });
}
