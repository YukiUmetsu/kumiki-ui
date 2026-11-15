import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePaperCraft, inspectPaperCraft, MAX_PAPER_LAYERS, PAPER_STYLES } from "../registry/video/paper-craft";
import { PaperCraftStage } from "../registry/video/paper-craft-react";
import { PAPER_SCENERIES, PAPER_SCENERY_PALETTES, PAPER_CONIFER_SPECIES, paperScenerySpec } from "../registry/video/paper-scenery-kit";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import film from "../examples/film/paper-craft-scenery.film.json";

describe("PAPER1 original hand-cut scenery worlds",()=>{
  for(const scenery of PAPER_SCENERIES){
    for(const aspect of ["landscape","portrait"] as const){
      for(const palette of PAPER_SCENERY_PALETTES){
        it(scenery+" "+aspect+" "+palette+" produces opaque layered cut-paper",()=>{
          const spec=paperScenerySpec("layered",aspect,{scenery,palette,detail:1,breeze:.5,seed:37});
          expect(inspectPaperCraft(spec)).toEqual([]);
          expect(spec.layers.length).toBeGreaterThan(38);
          expect(spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
          expect(new Set(spec.layers.map(layer=>layer.id)).size).toBe(spec.layers.length);
          expect(spec.layers.every(layer=>/^#[a-fA-F0-9]{6}$/.test(layer.color))).toBe(true);
          expect(new Set(spec.layers.map(layer=>layer.color)).size).toBeGreaterThan(8);
          expect(spec.layers.find(layer=>layer.id==="scenery-frame")?.holes).toHaveLength(1);
          expect(spec.layers.find(layer=>layer.id==="scenery-edge-inlay")?.holes).toHaveLength(1);
          const page=renderToStaticMarkup(React.createElement(PaperCraftStage,{
            spec,frame:220,shadowStrength:.98,edgeStrength:.75,tooth:.7
          }));
          expect(page).toContain('data-km-paper-craft');
          expect(page).toContain('viewBox="0 0 '+spec.width+' '+spec.height+'"');
          expect(page).toContain('data-km-paper-layer="scenery-frame"');
          expect(page).toContain('clip-rule="evenodd"');
          expect((page.match(/data-km-paper-layer=/g)||[])).toHaveLength(spec.layers.length);
          expect(page).not.toContain('fill-opacity="0.');
        });
      }
    }
  }
  it("uses authored foliage, creek and tree connectivity instead of a flat terrain band",()=>{
    const world=paperScenerySpec("layered","landscape",{
      scenery:"woodland",palette:"sage",detail:1,seed:37,breeze:.5});
    const names=world.layers.map(layer=>layer.id);
    for(const part of ["woodland-hill-0","woodland-hill-4","woodland-stream",
      "woodland-trunk-0","woodland-trunk-1","woodland-bough-0-1",
      "woodland-foliage-1-2","woodland-far-pines","woodland-fern-0",
      "woodland-flower-0","woodland-stream-tail","woodland-bank-pebble-0",
      "woodland-lace-canopy-0","woodland-canopy-ribs-1",
      "woodland-arched-arbor-0","woodland-arched-arbor-shadow-0",
      "woodland-arched-arbor-leaves-1",
      "woodland-understory-0-0","woodland-stream-surface-highlights","scenery-frame"]){
      expect(names).toContain(part);
    }
    expect(names.filter(id=>id.startsWith("woodland-fern-")).length).toBeGreaterThan(8);
    expect(names.filter(id=>id.startsWith("woodland-water-cut-"))).toHaveLength(6);
    const crowns=world.layers.filter(layer=>layer.id.startsWith("woodland-foliage-"));
    expect(crowns).toHaveLength(8);
    expect(crowns.every(layer=>layer.motion==="flutter"&&!!layer.pivot)).toBe(true);
    expect(crowns.every(layer=>(layer.path.match(/C/g)||[]).length>=6)).toBe(true);
  });
  it("constructs mountains, snow plates, terraces and far-shore reflections",()=>{
    const world=paperScenerySpec("layered","portrait",{
      scenery:"alpine-lake",palette:"moonlight",detail:1,seed:37,breeze:.4});
    const names=world.layers.map(layer=>layer.id);
    for(const part of ["alpine-peak-0","alpine-peak-1","alpine-peak-2",
      "alpine-snowcap-0","alpine-snowcap-2","alpine-scree-0-1",
      "alpine-lake","alpine-lake-bank","alpine-distant-pines",
      "alpine-continuous-foothills","alpine-foothill-terrace",
      "alpine-ledge-0","alpine-ledge-1","alpine-reflection-0",
      "alpine-moss-0","alpine-bird-0","alpine-rock-facet-1-0",
      "alpine-folded-stratum-0-1","alpine-lake-current","alpine-lake-islet",
      "alpine-islet-reeds","alpine-meadow-bloom-1","scenery-frame"]){
      expect(names).toContain(part);
    }
    expect(names.filter(id=>id.startsWith("alpine-reflection-")).length).toBeGreaterThan(10);
  });
  it("woodland includes real lace canopy openings and attached leafwork",()=>{
    const sparse=paperScenerySpec("layered","landscape",{
      scenery:"woodland",palette:"sage",detail:0,seed:44});
    const dense=paperScenerySpec("layered","landscape",{
      scenery:"woodland",palette:"sage",detail:1,seed:44});
    const crown=(spec:typeof dense)=>spec.layers.find(layer=>layer.id==="woodland-lace-canopy-0")!;
    expect(crown(sparse).holes).toHaveLength(5);
    expect(crown(dense).holes).toHaveLength(18);
    expect(crown(dense).path).toMatch(/C/g);
    expect(crown(dense).color).toMatch(/^#[0-9a-fA-F]{6}$/);
    const leafRibs=dense.layers.filter(layer=>layer.id.startsWith("woodland-canopy-ribs-"));
    expect(leafRibs).toHaveLength(2);
    expect(leafRibs.every(layer=>(layer.path.match(/C/g)??[]).length>12)).toBe(true);
    // Cardstock includes distinct attached leaflet contours, not detached dots.
    const understory=dense.layers.filter(layer=>layer.id.startsWith("woodland-understory-"));
    expect(understory).toHaveLength(8);
    expect(understory.every(layer=>(layer.path.match(/C/g)??[]).length>10)).toBe(true);
  });
  it("woodland forest uses anchored arched trees and actual separated cast paper stock",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const sparse=paperScenerySpec("lightbox",aspect,{
        scenery:"woodland",detail:0,seed:37,breeze:.2});
      const dense=paperScenerySpec("lightbox",aspect,{
        scenery:"woodland",detail:1,seed:37,breeze:.2});
      expect(inspectPaperCraft(dense)).toEqual([]);
      expect(dense.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
      for(let side=0;side<2;side++){
        const get=(suffix:string)=>dense.layers.find(l=>l.id==="woodland-arched-arbor-"+suffix+"-"+side)!;
        const wood=dense.layers.find(l=>l.id==="woodland-arched-arbor-"+side)!;
        const shadow=get("shadow"),leaves=get("leaves");
        expect(wood.depth).toBeGreaterThan(shadow.depth);
        expect(leaves.depth).toBeGreaterThan(wood.depth);
        expect(wood.path).not.toBe(shadow.path);
        expect((wood.path.match(/M/g)??[]).length).toBeGreaterThanOrEqual(19);
        expect((wood.path.match(/C/g)??[]).length).toBeGreaterThan(12);
        expect(wood.path.startsWith("M")).toBe(true);
        expect(wood.path.includes("Z")).toBe(true);
        expect(leaves.path.includes("C")).toBe(true);
        expect(leaves.motion).not.toBe("flutter"); // rigid branch attached to the paper card
        const oldGrain=dense.layers.find(l=>l.id==="woodland-trunk-grain-"+side)!;
        expect((oldGrain.path.match(/C/g)??[]).length).toBeGreaterThan(8);
      }
      expect(dense.layers.filter(l=>l.id.startsWith("woodland-arched-arbor-"))).toHaveLength(6);
      const sparseCrown=sparse.layers.find(l=>l.id==="woodland-lace-canopy-0")!;
      const denseCrown=dense.layers.find(l=>l.id==="woodland-lace-canopy-0")!;
      expect(sparseCrown.holes).toHaveLength(5);
      expect(denseCrown.holes).toHaveLength(18);
      expect(denseCrown.holes?.every(path=>path.includes("C")&&path.endsWith("Z"))).toBe(true);
      // Both palette and cut-through holes remain fully opaque at high detail.
      const html=renderToStaticMarkup(React.createElement(PaperCraftStage,{
        spec:dense,frame:220,shadowStrength:1,edgeStrength:.35
      }));
      expect(html).toContain('data-km-paper-layer="woodland-arched-arbor-0"');
      expect(html).toContain('clip-rule="evenodd"');
      expect(html).not.toContain('fill-opacity="0.');
      const again=paperScenerySpec("lightbox",aspect,{
        scenery:"woodland",detail:1,seed:37,breeze:.2});
      expect(again).toEqual(dense);
      expect(evaluatePaperCraft(dense,196)).toEqual(evaluatePaperCraft(again,196));
    }
  });
  it("canopy filigree uses multilevel connected branchlets rather than radial spokes",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const sparse=paperScenerySpec("layered",aspect,{
        scenery:"woodland",detail:0,seed:67,treeVariety:1});
      const dense=paperScenerySpec("layered",aspect,{
        scenery:"woodland",detail:1,seed:67,treeVariety:1});
      expect(inspectPaperCraft(dense)).toEqual([]);
      const id=(prefix:string,i:number)=>prefix+i;
      for(const side of [0,1]){
        const rib=id("woodland-canopy-ribs-",side);
        const sparseRib=sparse.layers.find(layer=>layer.id===rib)!;
        const denseRib=dense.layers.find(layer=>layer.id===rib)!;
        // Every lead has multiple forked twig tips and paired leaf cards.
        expect((denseRib.path.match(/M/g)??[]).length).toBeGreaterThan(90);
        expect((denseRib.path.match(/C/g)??[]).length).toBeGreaterThan(50);
        expect((sparseRib.path.match(/M/g)??[]).length)
          .toBeLessThan((denseRib.path.match(/M/g)??[]).length);
        expect(denseRib.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
      const crowns=dense.layers.filter(l=>l.id.startsWith("woodland-foliage-"));
      expect(crowns).toHaveLength(8);
      expect(crowns.every(layer=>(layer.path.match(/M/g)??[]).length>45)).toBe(true);
      expect(crowns.every(layer=>(layer.path.match(/C/g)??[]).length>55)).toBe(true);
      expect(crowns.every(layer=>layer.motion==="flutter"&&!!layer.pivot)).toBe(true);
      expect(dense.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
      // Cut detail changes underlying contours without adding excessive layers.
      expect(dense.layers.filter(l=>l.id.startsWith("woodland-foliage-")).length)
        .toBe(sparse.layers.filter(l=>l.id.startsWith("woodland-foliage-")).length);
      const same=paperScenerySpec("layered",aspect,{
        scenery:"woodland",detail:1,seed:67,treeVariety:1});
      expect(dense).toEqual(same);
      expect(evaluatePaperCraft(dense,218)).toEqual(evaluatePaperCraft(same,218));
    }
  });
  it("alpine water is genuinely open and mountain faces carry relief plates",()=>{
    const world=paperScenerySpec("layered","landscape",{
      scenery:"alpine-lake",palette:"moonlight",detail:1,seed:44});
    const shore=world.layers.find(layer=>layer.id==="alpine-lake-far-shore")!;
    const water=world.layers.find(layer=>layer.id==="alpine-lake")!;
    expect(water.depth).toBeLessThan(shore.depth);
    // Thin hand-cut bank has cubic curves, not a filled-to-bottom ridge.
    expect((shore.path.match(/C/g)??[]).length).toBeGreaterThanOrEqual(4);
    expect(shore.path).not.toContain("V");
    expect(world.layers.filter(layer=>layer.id.startsWith("alpine-folded-stratum-"))).toHaveLength(12);
    expect(world.layers.filter(layer=>layer.id.startsWith("alpine-meadow-grass-"))).toHaveLength(2);
    expect(world.layers.find(layer=>layer.id==="alpine-islet-reeds")?.path).toContain("C");
  });
  it("constructs joined serrated herbs and layered botanical highlights in both scenery worlds",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const scenery of PAPER_SCENERIES){
        const rich=paperScenerySpec("layered",aspect,{
          scenery,detail:1,seed:117,breeze:.42});
        const sparse=paperScenerySpec("layered",aspect,{
          scenery,detail:0,seed:117,breeze:.42});
        expect(inspectPaperCraft(rich)).toEqual([]);
        expect(inspectPaperCraft(sparse)).toEqual([]);
        const prefix=scenery==="woodland"?"woodland":"alpine";
        const herbs=rich.layers.filter(layer=>layer.id.startsWith(prefix+"-herb-")&&
          !layer.id.endsWith("-veins"));
        const veins=rich.layers.find(layer=>layer.id===prefix+"-herb-veins")!;
        const leafMaterial=herbs.filter(layer=>layer.id!==prefix+"-herb-veins");
        expect(leafMaterial.length).toBeGreaterThanOrEqual(6);
        expect(leafMaterial.every(layer=>(layer.path.match(/M/g)??[]).length>14)).toBe(true);
        // Serrated, non-elliptic leaves include scored L-vertex runs and
        // the root/stem contributes a continuous cubic C-shaped stock.
        expect(leafMaterial.every(layer=>layer.path.includes("C")&&
          (layer.path.match(/L/g)??[]).length>50)).toBe(true);
        expect(leafMaterial.every(layer=>layer.depth===28)).toBe(true);
        expect(veins.depth).toBe(29);
        expect((veins.path.match(/M/g)??[]).length).toBeGreaterThan(12);
        const html=renderToStaticMarkup(React.createElement(PaperCraftStage,{
          spec:rich,frame:226,reducedMotion:false,tooth:.65
        }));
        expect(html).toContain('data-km-paper-layer="'+prefix+'-herb-veins"');
        expect(html).not.toContain('fill-opacity="0.');
        // An entire stand of physically cut leaves remains within the PAPER1 budget.
        expect(rich.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
      }
    }
  });
  it("new original flower heads have visible separately cut pistil stock",()=>{
    const w=paperScenerySpec("layered","landscape",{
      scenery:"woodland",palette:"sage",detail:1,seed:19});
    const a=paperScenerySpec("layered","landscape",{
      scenery:"alpine-lake",palette:"moonlight",detail:1,seed:19});
    const wCenters=w.layers.find(l=>l.id==="woodland-flower-centers")!;
    const aCenters=a.layers.find(l=>l.id==="alpine-meadow-bloom-centers")!;
    expect(wCenters.color).not.toEqual(w.layers.find(l=>l.id==="woodland-flower-0")!.color);
    expect(aCenters.color).not.toEqual(a.layers.find(l=>l.id==="alpine-meadow-bloom-0")!.color);
    expect((wCenters.path.match(/M/g)??[]).length).toBe(9*6);
    expect((aCenters.path.match(/M/g)??[]).length).toBe(2*6);
    expect(wCenters.depth).toBeGreaterThan(w.layers.find(l=>l.id==="woodland-flower-0")!.depth);
    expect(aCenters.depth).toBeGreaterThan(a.layers.find(l=>l.id==="alpine-meadow-bloom-0")!.depth);
    const alt=paperScenerySpec("layered","landscape",{
      scenery:"woodland",detail:1,seed:22});
    expect(alt.layers.find(l=>l.id==="woodland-herb-0-0")?.path)
      .not.toBe(w.layers.find(l=>l.id==="woodland-herb-0-0")?.path);
    expect(paperScenerySpec("layered","landscape",{
      scenery:"woodland",palette:"sage",detail:1,seed:19})).toEqual(w);
  });
  it("scenery relief adjusts physical z-separation without modifying contours",()=>{
    for(const scenery of PAPER_SCENERIES){
      const flat=paperScenerySpec("lightbox","portrait",{scenery,detail:1,relief:0,seed:27});
      const medium=paperScenerySpec("lightbox","portrait",{scenery,detail:1,relief:.5,seed:27});
      const raised=paperScenerySpec("lightbox","portrait",{scenery,detail:1,relief:1,seed:27});
      expect(inspectPaperCraft(flat)).toEqual([]);
      expect(flat.layers.every(layer=>layer.depth===0)).toBe(true);
      expect(raised.layers.some(layer=>layer.depth>=25)).toBe(true);
      expect(medium.layers.some(layer=>layer.depth>0&&layer.depth<raised.layers.find(
        raisedLayer=>raisedLayer.id===layer.id)!.depth)).toBe(true);
      expect(flat.layers.map(layer=>({id:layer.id,path:layer.path,holes:layer.holes,color:layer.color})))
        .toEqual(raised.layers.map(layer=>({id:layer.id,path:layer.path,holes:layer.holes,color:layer.color})));
      // Equal paper thickness does not imply semi-transparent paper.
      const html=renderToStaticMarkup(React.createElement(PaperCraftStage,{spec:flat,frame:220}));
      expect(html).not.toContain('fill-opacity="0.');
    }
  });
  it("sculpts three conifer species with distinct rooted silhouette grammars",()=>{
    expect(PAPER_CONIFER_SPECIES).toEqual(["spruce","fir","larch"]);
    for(const aspect of ["landscape","portrait"] as const){
      const regular=paperScenerySpec("layered",aspect,{
        scenery:"alpine-lake",detail:1,treeVariety:0,seed:37});
      const wild=paperScenerySpec("layered",aspect,{
        scenery:"alpine-lake",detail:1,treeVariety:1,seed:37});
      expect(inspectPaperCraft(regular)).toEqual([]);
      expect(inspectPaperCraft(wild)).toEqual([]);
      const trees=(scene:typeof wild)=>scene.layers.filter(layer=>/^alpine-pine-[01]-[0-9]+$/.test(layer.id));
      const plain=trees(regular),varied=trees(wild);
      expect(plain).toHaveLength(varied.length);
      expect(plain.length).toBeGreaterThanOrEqual(8);
      // Every tree is a single rooted cut (one M + one Z), not disconnected
      // silhouettes pasted onto a generic triangular tree trunk.
      expect(varied.every(layer=>(layer.path.match(/M/g)??[]).length===1 &&
        (layer.path.match(/Z/g)??[]).length===1)).toBe(true);
      const vertexCounts=(layers:typeof varied)=>new Set(layers.map(
        layer=>(layer.path.match(/L/g)??[]).length));
      expect(vertexCounts(plain).size).toBe(1);
      expect(vertexCounts(varied).size).toBeGreaterThanOrEqual(2);
      expect(varied.some((layer,i)=>layer.path!==plain[i].path)).toBe(true);
      expect(wild.layers.map(layer=>layer.id)).toEqual(regular.layers.map(layer=>layer.id));
      expect(wild.layers.map(layer=>layer.color)).toEqual(regular.layers.map(layer=>layer.color));
      expect(wild.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
      expect(paperScenerySpec("layered",aspect,{
        scenery:"alpine-lake",detail:1,treeVariety:1,seed:37})).toEqual(wild);
    }
  });
  it("introduces species variation in the full woodland tree line without frame randomness",()=>{
    const mono=paperScenerySpec("layered","landscape",{
      scenery:"woodland",detail:1,treeVariety:0,seed:41});
    const mixed=paperScenerySpec("layered","landscape",{
      scenery:"woodland",detail:1,treeVariety:1,seed:41});
    const forest=(scene:typeof mixed)=>scene.layers.find(layer=>layer.id==="woodland-far-pines")!;
    expect((forest(mixed).path.match(/M/g)??[]).length).toBeGreaterThanOrEqual(13);
    expect((forest(mixed).path.match(/Z/g)??[]).length)
      .toBe((forest(mixed).path.match(/M/g)??[]).length);
    expect(forest(mixed).path).not.toEqual(forest(mono).path);
    expect(inspectPaperCraft(mixed)).toEqual([]);
    const frame=evaluatePaperCraft(mixed,211);
    evaluatePaperCraft(mixed,63);
    expect(evaluatePaperCraft(mixed,211)).toEqual(frame);
  });
  it("gives ferns and deciduous branches seeded structural diversity",()=>{
    const first=paperScenerySpec("layered","landscape",{
      scenery:"woodland",seed:11,detail:1,treeVariety:1});
    const second=paperScenerySpec("layered","landscape",{
      scenery:"woodland",seed:62,detail:1,treeVariety:1});
    const fern=(scene:typeof first)=>scene.layers.find(layer=>layer.id==="woodland-fern-0")!;
    const bough=(scene:typeof first)=>scene.layers.find(layer=>layer.id==="woodland-foliage-0-0")!;
    expect(fern(first).path).not.toEqual(fern(second).path);
    expect(bough(first).path).not.toEqual(bough(second).path);
    expect((fern(first).path.match(/C/g)??[]).length).toBeGreaterThan(15);
    expect((bough(first).path.match(/C/g)??[]).length).toBeGreaterThan(20);
    expect(first.layers.every(layer=>/^#[a-fA-F0-9]{6}$/.test(layer.color))).toBe(true);
  });
  it("detail changes actual geometry, while frame seeks are deterministic",()=>{
    for(const scenery of PAPER_SCENERIES){
      const sparse=paperScenerySpec("layered","landscape",{scenery,detail:0,breeze:.3,seed:12});
      const fine=paperScenerySpec("layered","landscape",{scenery,detail:1,breeze:.3,seed:12});
      expect(inspectPaperCraft(sparse)).toEqual([]);
      expect(inspectPaperCraft(fine)).toEqual([]);
      expect(fine.layers.length).toBeGreaterThan(sparse.layers.length);
      const same=paperScenerySpec("layered","landscape",{scenery,detail:1,breeze:.3,seed:12});
      expect(same).toEqual(fine);
      const frame=evaluatePaperCraft(fine,183);
      evaluatePaperCraft(fine,11);evaluatePaperCraft(fine,234);
      expect(evaluatePaperCraft(fine,183)).toEqual(frame);
      expect(evaluatePaperCraft(fine,0,true).layers)
        .toEqual(evaluatePaperCraft(fine,237,true).layers);
    }
  });
  it("breeze affects tree and pine rigs but never opacity or paper geometry",()=>{
    const calm=paperScenerySpec("layered","landscape",{scenery:"woodland",breeze:0,detail:1,seed:8});
    const lively=paperScenerySpec("layered","landscape",{scenery:"woodland",breeze:1,detail:1,seed:8});
    expect(calm.layers.map(({id,path,color})=>({id,path,color})))
      .toEqual(lively.layers.map(({id,path,color})=>({id,path,color})));
    expect(calm.layers.filter(layer=>layer.motion==="flutter").every(layer=>layer.swingDegrees===0)).toBe(true);
    expect(lively.layers.filter(layer=>layer.motion==="flutter").some(layer=>(layer.swingDegrees??0)>1)).toBe(true);
  });
  it("supports all PAPER1 media without hidden shape deformation",()=>{
    for(const style of PAPER_STYLES){
      const spec=paperScenerySpec(style,"portrait",{scenery:"woodland",detail:.7});
      expect(inspectPaperCraft(spec)).toEqual([]);
      expect(spec.layers.length).toBeLessThanOrEqual(128);
    }
  });
  it("rejects invalid scenery, palette, seed and out-of-range controls",()=>{
    expect(()=>paperScenerySpec("layered","landscape",{scenery:"bad" as never})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{palette:"bad" as never})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","square" as never)).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{seed:NaN})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{detail:Infinity})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{breeze:-.1})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{breeze:1.1})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{relief:-.01})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{relief:1.01})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{treeVariety:NaN})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{treeVariety:-.01})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{treeVariety:1.01})).toThrow(RangeError);
  });
  it("renders both film landscape subjects through native FilmStage in both outputs",async()=>{
    for(const outputId of ["landscape","portrait"]){
      const result=compileFilm(film,{outputId});
      expect(result.ok).toBe(true);
      if(!result.ok)continue;
      expect(result.film.scenes).toHaveLength(2);
      const renderer=await loadFilmSlots(result.film);
      for(const scenery of PAPER_SCENERIES){
        const html=renderToStaticMarkup(React.createElement(React.Fragment,null,
          renderer({slot:"paper-craft-study",label:scenery,props:{
            artwork:"scenery",scenery,sceneryPalette:"moonlight",detail:1,breeze:.3,relief:.75,treeVariety:.91,
            medium:"lightbox",seed:37,
          }},{frame:220,durationFrames:240,fps:{num:30,den:1},
             width:outputId==="landscape"?960:540,
             height:outputId==="landscape"?540:960,
             reducedMotion:false})));
        expect(html).toContain("data-km-paper-craft");
        expect(html).toContain('data-km-paper-layer="scenery-frame"');
      }
    }
  });
});
