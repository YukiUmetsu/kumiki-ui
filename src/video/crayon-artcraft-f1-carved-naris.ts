import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
type Wax=Extract<CrayonElement,{kind:"wax"}>;

/** V26: dark negative space after the upper skin's native wax deposition.
 * The CC0 source's near (405,631) is RGB(29,4,4), native V25 (140,103,93):
 * preceding opaque dark cavities are overpainted by wax skin. New renderer
 * order is an opt-in experimental source comparison, not art approval.
 */
export const CRAYON_F1_V26_REFERENCE_CAVITIES=Object.freeze({
 near:{x:405,y:631,source:[29,4,4],v25:[140,103,93]},
 far:{x:450,y:627,source:[74,22,18],v25:[145,111,101]},
} as const);
const surface:Readonly<Record<string,Partial<Wax>>> ={
 "naris-shadow-near":{
   d:"M388 637 C391 628 400 622 408 623 C416 623 422 628 423 633 "+
     "C420 630 412 630 409 633 C405 639 404 647 399 650 "+
     "C394 648 389 643 388 637Z",
   bounds:{x:385,y:619,width:42,height:35},
   colors:["#69483f","#1b1012","#a26c5e"],
   coverage:"opaque",deposition:"stroke-built",
   pressure:.80,spacing:4.2,markStrength:.25,
   underpaintTooth:.1,opaqueBurnish:.88,
   underpaintGradient:{light:"#916053",shadow:"#1a0c0f",
     focusX:.92,focusY:.39,radius:.85},
   outlineOpacity:0,edgeRoughness:.18,
 },
 "naris-shadow-far":{
   d:"M448 634 C446 626 450 618 454 616 C459 615 461 620 461 626 "+
     "C462 633 460 640 456 645 C451 643 450 640 448 634Z",
   bounds:{x:445,y:612,width:20,height:37},
   colors:["#79564b","#261718","#ad796b"],
   coverage:"opaque",deposition:"stroke-built",
   pressure:.78,spacing:4.1,markStrength:.24,
   underpaintTooth:.1,opaqueBurnish:.86,
   underpaintGradient:{light:"#aa7969",shadow:"#251618",
     focusX:.93,focusY:.76,radius:.86},
   outlineOpacity:0,edgeRoughness:.18,
 },
};
export const CRAYON_F1_V26_CAVITY_IDS=Object.freeze(Object.keys(surface));
export function crayonF1CarveNarisRecess(
 elements:readonly CrayonElement[],
):CrayonElement[]{
 const seen=new Set<string>(), displaced=new Map<string,Wax>();
 const output:CrayonElement[]=[];
 for(const el of elements){
   if(Object.prototype.hasOwnProperty.call(surface,el.id)){
     if(el.kind!=="wax"||seen.has(el.id))
       throw new RangeError("Invalid/duplicate photographed naris "+el.id);
     seen.add(el.id);
     if(el.id==="naris-shadow-near"&&el.d===surface[el.id].d)
       throw new RangeError("Already carved");
     displaced.set(el.id,{...el,...surface[el.id]});
     continue;
   }
   output.push(el);
   if(el.id==="alar-roof-near"||el.id==="alar-roof-far"){
     const key="naris-shadow-"+(el.id.endsWith("near")?"near":"far");
     const cavity=displaced.get(key);
     if(!cavity)throw new RangeError("Missing anterior recess "+key);
     output.push(cavity);
   }
 }
 if(seen.size!==2||output.length!==elements.length)
   throw new RangeError("Incomplete CC0 naris anatomy");
 return output;
}
