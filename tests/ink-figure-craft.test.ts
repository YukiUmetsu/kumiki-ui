import { describe,expect,it } from "vitest";
import {
  assertInkFigureCraft, inkFigureCraftShapes, inkCraftAsset, DEFAULT_INK_FIGURE_CRAFT,
} from "../registry/video/ink-figure-craft";
import type { InkFigureStroke } from "../registry/video/ink-figure-craft";
import type { CharacterShapeAsset } from "../registry/character/definition";

const folds:InkFigureStroke[]=[
 {id:"long-silk",kind:"silk-thread",points:[{x:5,y:10,pressure:.1},{x:22,y:35,pressure:.7},{x:33,y:50,pressure:.04}],
  width:2,tone:.68,water:.2,pigment:"$shadow",detailMin:.15},
 {id:"wash-fold",kind:"fold",points:[{x:10,y:12,pressure:.05},{x:33,y:29,pressure:.8},{x:49,y:52,pressure:.02}],
  width:9,tone:.45,water:.45,detailMin:.5,washPigment:"$wash"},
 {id:"dry-crease",kind:"dry-brush",points:[{x:12,y:30,pressure:.07},{x:29,y:32,pressure:.9},{x:64,y:40,pressure:.06}],
  width:4,tone:.76,water:.08,detailMin:.8},
];
const asset:CharacterShapeAsset={kind:"shapes",width:260,height:340,
 provenance:{license:"CC0-1.0",source:"Original unit fixture"},
 shapes:[{type:"path",d:"M0 0 L70 0 L60 70 Z",fill:"$wash"}]};

describe("INK5 material-native figure craftsmanship",()=>{
 it("validates every authored fold before constructing SVG parts",()=>{
   expect(()=>assertInkFigureCraft(folds,DEFAULT_INK_FIGURE_CRAFT)).not.toThrow();
   expect(()=>inkFigureCraftShapes(folds,{...DEFAULT_INK_FIGURE_CRAFT,detail:NaN})).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes(folds,{...DEFAULT_INK_FIGURE_CRAFT,contrast:3})).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([...folds,{...folds[0]}])).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([{...folds[0],kind:"oil" as never}])).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([{...folds[0],points:[{x:NaN,y:0,pressure:.3},{x:7,y:8,pressure:.6}]}])).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([{...folds[1],water:2}])).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([{...folds[2],water:1}])).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([{...folds[1],pigment:"url(#evil)"}])).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([{...folds[0],detailMin:-.2}])).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([{...folds[0],width:300}])).toThrow(RangeError);
   expect(()=>inkFigureCraftShapes([{...folds[0],points:[folds[0].points[0]]}])).toThrow(RangeError);
 });
 it("creates independent pale fold/ink core geometry without extra animation state",()=>{
   const shapes=inkFigureCraftShapes(folds);
   const next=inkFigureCraftShapes(folds);
   expect(next).toEqual(shapes);
   expect(shapes.length).toBeGreaterThanOrEqual(4);
   expect(shapes.some(s=>s.fill==="$wash")).toBe(true);
   expect(shapes.some(s=>s.fill==="$shadow")).toBe(true);
   expect(shapes.some(s=>s.opacity!==undefined&&s.opacity<.5)).toBe(true);
   for(const s of shapes){
     expect(s.type).toBe("path");
     expect(s.d).not.toMatch(/NaN|Infinity|<|>/);
     expect(s.d).toMatch(/^M/);
   }
   const tinted=inkFigureCraftShapes(folds,{...DEFAULT_INK_FIGURE_CRAFT,contrast:1.5});
   expect(tinted).not.toEqual(shapes);
 });
 it("uses data-driven quality controls without replacing the rig or mutating assets",()=>{
   expect(inkFigureCraftShapes(folds,{...DEFAULT_INK_FIGURE_CRAFT,detail:0})).toEqual([]);
   expect(inkFigureCraftShapes(folds,{...DEFAULT_INK_FIGURE_CRAFT,detail:.2})).toHaveLength(1);
   expect(inkFigureCraftShapes(folds,{...DEFAULT_INK_FIGURE_CRAFT,detail:.6})).toHaveLength(3);
   const enriched=inkCraftAsset(asset,folds);
   expect(enriched.shapes.length).toBeGreaterThan(asset.shapes.length);
   expect(enriched.width).toBe(asset.width);
   expect(enriched.height).toBe(asset.height);
   expect(enriched.provenance).toBe(asset.provenance);
   expect(asset.shapes).toHaveLength(1);
 });
});
