import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect} from "vitest";
import {validateCharacterDefinition} from "../registry/character/validate";
import {samplePoseCorrection} from "../registry/character/authoring";
import {
  SHANSHUI_SCENES,DEFAULT_SHANSHUI,SHANSHUI_FRAMES,
  assertShanshuiControls,shanshuiAt,shanshuiRoute,shanshuiHash,
} from "../registry/video/ink-shanshui";
import {InkShanshuiStage} from "../registry/video/ink-shanshui-react";
import {InkShanshuiFilm,makeShanshuiScholar,shanshuiScholarInstance,
  shanshuiPerformanceCues} from "../src/video/ink-shanshui-film";

describe("reusable original Chinese ink shanshui art engine",()=>{
  it("enforces bounded art controls, safe seed, recognized scene and absolute frame",()=>{
    expect(()=>assertShanshuiControls(DEFAULT_SHANSHUI)).not.toThrow();
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,detail:NaN})).toThrow(RangeError);
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,seed:-1})).toThrow(RangeError);
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,wind:2})).toThrow(RangeError);
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,scene:"unknown" as never})).toThrow(RangeError);
    expect(()=>shanshuiAt(DEFAULT_SHANSHUI,-1)).toThrow(RangeError);
    expect(()=>shanshuiAt(DEFAULT_SHANSHUI,SHANSHUI_FRAMES)).toThrow(RangeError);
    expect(shanshuiHash(71,91)).toEqual(shanshuiHash(71,91));
    expect(shanshuiHash(71,91)).not.toEqual(shanshuiHash(72,91));
    expect(shanshuiHash(71,91)).toBeGreaterThanOrEqual(0);
    expect(shanshuiHash(71,91)).toBeLessThanOrEqual(1);
  });
  for(const scene of SHANSHUI_SCENES){
    it(scene+" has distinct walk blocking, stable absolute-frame environment and ink objects",()=>{
      const controls={...DEFAULT_SHANSHUI,scene};
      const route=shanshuiRoute(scene);
      expect(route.instanceId).toBe("shanshui-scholar");
      expect(route.waypoints).toHaveLength(4);
      expect(route.waypoints[3].frame).toBe(SHANSHUI_FRAMES-1);
      const a=shanshuiAt(controls,80),b=shanshuiAt(controls,180);
      expect(shanshuiAt(controls,80)).toEqual(a);
      expect(a.cameraZoom).not.toEqual(b.cameraZoom);
      expect(a.birdX).not.toEqual(b.birdX);
      expect(a.scholarX).not.toEqual(b.scholarX);
      expect(shanshuiAt(controls,80,true).frame).toBe(SHANSHUI_FRAMES-1);
      expect(shanshuiAt(controls,80,true).breeze).toBe(0);
      const pngIndependent=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls,
      }));
      expect(pngIndependent).toContain('data-km-shanshui-scene="'+scene+'"');
      expect(pngIndependent).toContain('data-km-shanshui-frame="125"');
      expect(pngIndependent).toContain('data-km-shanshui-mountains=""');
      expect(pngIndependent).toContain('data-km-shanshui-birds=""');
      expect(pngIndependent).toContain('data-km-shanshui-rock=""');
      expect(pngIndependent).toEqual(renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls,
      })));
      if(scene==="river-scholar"){
        expect(pngIndependent).toContain('data-km-shanshui-water=""');
        expect(pngIndependent).toContain('data-km-shanshui-willow=""');
        expect(pngIndependent).toContain('data-km-shanshui-bridge=""');
      }else {
        expect(pngIndependent).toContain('data-km-shanshui-pine=""');
        expect(pngIndependent).toContain('data-km-shanshui-bamboo=""');
      }
      const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls:{...controls,detail:0},
      }));
      expect(pngIndependent.length).toBeGreaterThan(sparse.length+1500);
    });
  }

  it("renders the completed ink wash for reduced motion and scopes gradients per mounted film",()=>{
    const staticWash=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:0,controls:DEFAULT_SHANSHUI,reducedMotion:true,
    }));
    expect(staticWash).toContain('data-km-shanshui-frame="0"');
    // The effective frozen frame is 299, so the first displayed image must
    // not inherit an early-frame partial-wash opacity.
    expect(staticWash).toMatch(/data-km-shanshui-world=""[^>]*><g opacity="1">/);
    const together=renderToStaticMarkup(createElement("section",null,
      createElement(InkShanshuiStage,{frame:50,controls:DEFAULT_SHANSHUI}),
      createElement(InkShanshuiStage,{frame:50,controls:{
        ...DEFAULT_SHANSHUI,scene:"river-scholar",
      }}),
    ));
    const pathIds=[...together.matchAll(/<linearGradient id="(kmshan[^"]+path)"/g)]
      .map(match=>match[1]);
    expect(pathIds).toHaveLength(2);
    expect(new Set(pathIds).size).toBe(2);
    for(const id of pathIds)expect(together).toContain('fill="url(#'+id+')"');
  });


  it("keeps source-directed willow leaf clusters rooted and pine branch canopies irregular",()=>{
    const river=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:125,controls:{...DEFAULT_SHANSHUI,scene:"river-scholar",detail:1},
    }));
    expect((river.match(/data-km-willow-frond=""/g)??[])).toHaveLength(39);
    expect(river).not.toContain("NaN");
    const pine=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:125,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",detail:1},
    }));
    expect((pine.match(/data-km-pine-bough=""/g)??[]).length).toBeGreaterThan(0);
    expect(pine).not.toContain("NaN");
    expect(pine).toEqual(renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:125,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",detail:1},
    })));
  });

  it("builds a rounded mid-ridge and bone-anchored interlocking rock face volumes",()=>{
    const paint=(seed:number,detail=1)=>renderToStaticMarkup(createElement(
      InkShanshuiStage,{frame:145,controls:{
        ...DEFAULT_SHANSHUI,scene:"mountain-trail",detail,seed,
      }},
    ));
    const full=paint(71);
    const ridge=full.match(/data-km-shanshui-ridge-contour="1" d="([^"]+)"/)?.[1];
    expect(ridge).toBeDefined();
    const points=[...ridge!.matchAll(/[ML] ?(-?[0-9.]+) (-?[0-9.]+)/g)]
      .map(([,x,y])=>[Number(x),Number(y)]);
    const summit=points.filter(([x])=>x>=531&&x<=572);
    // The formerly needle-sharp triangle now has a broad, held,
    // lower, asymmetrically rolled summit with full dense stations.
    // Avoid silently preserving the old 105px needle-height band.
    expect(summit.length).toBeGreaterThan(20);
    expect(summit.filter(([,y])=>y>=116&&y<=146).length)
      .toBeGreaterThan(12);
    // A saw-tooth skyline was visible at native 960x540 when each
    // 13–15px section inherited a full long-cliff jitter budget.
    // The actual SVG now has continuous summit contour at 1.6px steps.
    const summitSteps=summit.slice(1).map(([,y],i)=>
      Math.abs(y-summit[i][1]));
    expect(Math.max(...summitSteps)).toBeLessThan(4.4);

    const masses=[...full.matchAll(
      /data-km-rock-interlocked-mass="" data-km-rock-mass-root="([^"]+)" data-km-rock-mass-side="(-?1)"/g,
    )];
    expect(masses).toHaveLength(3);
    expect(masses.map(m=>Number(m[2]))).toEqual([-1,1,-1]);
    expect(new Set(masses.map(m=>m[1])).size).toBe(3);
    const washes=[...full.matchAll(
      /data-km-rock-mass-underwash="" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
    )];
    expect(washes).toHaveLength(3);
    for(let i=0;i<masses.length;i++){
      expect(washes[i][1].startsWith("M"+masses[i][1].replace(","," ")))
        .toBe(true);
      expect((washes[i][1].match(/ C/g)??[])).toHaveLength(5);
      expect(full).toContain('id="'+washes[i][2]+'"');
    }
    const caps=[...full.matchAll(
      /data-km-rock-mass-alum-cap="" data-km-rock-mass-cap-root="([^"]+)" d="([^"]+)"/g,
    )];
    const cracks=[...full.matchAll(
      /data-km-rock-mass-erosion="" data-km-rock-mass-erosion-root="([^"]+)" d="([^"]+)"/g,
    )];
    expect(caps).toHaveLength(6);
    expect(cracks).toHaveLength(9);
    const inkFibre=[...full.matchAll(
      /data-km-rock-mass-flow="" data-km-rock-mass-flow-root="([^"]+)" data-km-rock-mass-flow-load="(loaded|lifted)" d="([^"]+)"/g,
    )];
    expect(inkFibre).toHaveLength(33); // uneven 14 + 11 + 8
    expect(new Set(inkFibre.map(m=>m[1])).size).toBe(33);
    expect(inkFibre.filter(m=>m[2]==="lifted").length)
      .toBeGreaterThan(6);
    expect(inkFibre.every(([,root,,d])=>
      d.startsWith("M"+root.replace(","," "))&&
      (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z")))
      .toBe(true);
    const fields=[...full.matchAll(
      /data-km-rock-mass-flow-group="" clip-path="url\(#([^"]+)\)" data-km-rock-mass-flow-count="([^"]+)"/g,
    )];
    expect(fields.map(m=>Number(m[2]))).toEqual([14,11,8]);
    expect(fields.every(([,id])=>full.includes('id="'+id+'"')))
      .toBe(true);
    expect((paint(71,.81).match(/data-km-rock-mass-flow=""/g)??[]))
      .toHaveLength(26); // 11 + 9 + 6 at reduced density

    for(const [,r,d] of [...caps,...cracks]){
      expect(d.startsWith("M"+r.replace(","," "))).toBe(true);
      expect((d.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(22);
    }
    expect(full).toBe(paint(71));
    expect(paint(87)).not.toBe(full);
    expect(paint(71,0)).not.toContain("data-km-rock-interlocked-mass");
    expect(full).not.toMatch(/NaN|Infinity|undefined/);
    // Three neighboring Storybook previews may not share SVG gradient IDs.
    const adjacent=renderToStaticMarkup(createElement("section",null,
      createElement(InkShanshuiStage,{frame:145,controls:{
        ...DEFAULT_SHANSHUI,scene:"mountain-trail",detail:1,
      }}),
      createElement(InkShanshuiStage,{frame:145,controls:{
        ...DEFAULT_SHANSHUI,scene:"mountain-trail",detail:1,ink:.4,
      }}),
    ));
    const ids=[...adjacent.matchAll(/<linearGradient id="(kmrock[^"]+face[012])"/g)]
      .map(m=>m[1]);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });

  it("separates original four-master Chinese rock brush grammars at one identical mountain topology",()=>{
    const schools=[
      ["fuchun","long-hemp",78],
      ["early-spring","cloud-head",52],
      ["travelers","raindrop",187],
      ["forest-grotto","ox-hair",178],
    ] as const;
    // This cross-school proof intentionally renders large source-rooted
    // trees + hundreds of strokes for four masters. Reuse identical
    // deterministic specimens rather than re-rendering the Fuchun scene
    // in every comparison. Distinct school/detail/ink settings still
    // undergo separate complete native renderers.
    const specimens=new Map<string,string>();
    const paint=(school:typeof schools[number][0],detail=1,ink=.95)=>{
      const key=school+":"+detail+":"+ink;
      const prior=specimens.get(key);
      if(prior!==undefined)return prior;
      const html=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          seed:71,mist:.35,detail,ink,inkSchool:school},
      }));
      specimens.set(key,html);
      return html;
    };
    const ridgeContour:string[]=[];
    const uniqueStyles:string[]=[];
    for(const [school,expectedStyle,count] of schools){
      const html=paint(school);
      const first=html.match(/data-km-shanshui-ridge-contour="1" d="([^"]+)"/);
      expect(first).not.toBeNull();
      ridgeContour.push(first![1]);
      if(school!=="fuchun"){
        expect(first![1]).not.toEqual(paint("fuchun").match(
          /data-km-shanshui-ridge-contour="1" d="([^"]+)"/)?.[1]);
      }
      expect(html).toContain('data-km-master-school="'+school+'"');
      const faces=[...html.matchAll(
        /data-km-master-face="" data-km-master-face-root="([^"]+)" data-km-master-face-side="(-?1)" data-km-master-plane-index="(\d+)"/g,
      )];
      expect(faces).toHaveLength(3);
      expect(faces.map(m=>Number(m[2]))).toEqual([-1,1,-1]);
      expect(faces.map(m=>Number(m[3]))).toEqual([0,1,2]);
      const shades=[...html.matchAll(
        /data-km-master-mass="" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
      )];
      expect(shades).toHaveLength(3);
      for(const [i,shade] of shades.entries()){
        expect(shade[1].startsWith("M"+faces[i][1].replace(","," ")))
          .toBe(true);
        expect((shade[1].match(/ C/g)??[]).length).toBeGreaterThanOrEqual(5);
        expect(html).toContain('id="'+shade[2]+'"');
      }
      // The source comparison originally stuck every cun mark to the
      // *top* of the mountain and left its lower face blank. Each of the
      // three face masses now has five independent, physically drawn
      // supporting ink strata; every child names a real parent bank.
      const connected=[...html.matchAll(
        /data-km-master-stratum="" data-km-master-stratum-root="([^"]+)" data-km-master-stratum-index="([0-4])"/g,
      )];
      expect(connected).toHaveLength(15);
      expect(connected.map(m=>Number(m[2]))).toEqual([
        0,1,2,3,4,0,1,2,3,4,0,1,2,3,4,
      ]);
      expect(connected.every(([,r])=>r.split(",").length===2&&
        r.split(",").every(v=>Number.isFinite(Number(v))))).toBe(true);
      const wash=[...html.matchAll(
        /data-km-master-stratum-wash="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(wash).toHaveLength(15);
      expect(wash.every((d,k)=>d.startsWith(
        "M"+connected[k][1].replace(","," "))&&
        (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z"))).toBe(true);
      expect((html.match(/data-km-master-stratum-lip=""/g)??[]))
        .toHaveLength(15);
      const brushParents=[...html.matchAll(
        /data-km-master-stroke="" data-km-master-stroke-style="[^"]+" data-km-master-stroke-root="([^"]+)" data-km-master-stroke-dry="(dry|wet)" data-km-master-stroke-bank="([0-4])"/g,
      )];
      expect(brushParents).toHaveLength(count);
      expect(new Set(brushParents.map(m=>m[3])).size).toBe(5);
      const fanFaces=[...html.matchAll(
        /data-km-master-fan-facet="" data-km-master-fan-facet-root="([^"]+)"/g,
      )];
      const fanMasses=[...html.matchAll(
        /data-km-master-fan-facet-wash="" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
      )];
      const expectedFacets=school==="travelers"?6:0;
      expect(fanFaces).toHaveLength(expectedFacets);
      expect(fanMasses).toHaveLength(expectedFacets);
      expect((html.match(/data-km-master-fan-facet-rim=""/g)??[]))
        .toHaveLength(expectedFacets);
      expect(fanMasses.every((d,k)=>
        d[1].startsWith("M"+fanFaces[k][1].replace(","," "))&&
        html.includes('id="'+d[2]+'"'))).toBe(true);
      // ArtCraft five-axis Fuchun pass: nested positive hill-backs should
      // carry the root-connected ink into the pale central face, instead
      // of leaving the long hemp marks as standalone black wires.
      const hillbacks=[...html.matchAll(
        /data-km-master-fuchun-hillback="" data-km-master-fuchun-hillback-root="([^"]+)" data-km-master-fuchun-hillback-form="(round|saddle)"/g,
      )];
      const backMasses=[...html.matchAll(
        /data-km-master-fuchun-hillback-wash="" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
      )];
      const backContours=[...html.matchAll(
        /data-km-master-fuchun-hillback-lip="" d="([^"]+)"/g,
      )];
      const undercuts=[...html.matchAll(
        /data-km-master-fuchun-hillback-undercut="" data-km-master-fuchun-hillback-undercut-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(undercuts).toHaveLength(school==="fuchun"?6:0);
      expect(hillbacks).toHaveLength(school==="fuchun"?6:0);
      expect(backMasses).toHaveLength(hillbacks.length);
      expect(backContours).toHaveLength(hillbacks.length);
      if(school==="fuchun"){
        expect(hillbacks.filter(m=>m[2]==="round")).toHaveLength(3);
        expect(hillbacks.filter(m=>m[2]==="saddle")).toHaveLength(3);
        expect(backMasses.every((m,k)=>
          m[1].startsWith("M"+hillbacks[k][1].replace(","," "))&&
          (m[1].match(/ C/g)??[]).length>=5&&m[1].endsWith(" Z")&&
          html.includes('id="'+m[2]+'"'))).toBe(true);
        expect(backContours.every((m,k)=>
          m[1].startsWith("M"+hillbacks[k][1].replace(","," "))&&
          (m[1].match(/ C/g)??[]).length>=30&&m[1].endsWith(" Z")))
          .toBe(true);
        expect(new Set(backMasses.map(m=>m[1])).size).toBe(6);
        for(let k=0;k<6;k++){
          const path=backMasses[k][1];
          const numbers=(path.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
          // Seven connected cubic contour edges; the concave undercut
          // must begin at the SECOND edge's own geometric knuckle.
          expect((path.match(/ C/g)??[])).toHaveLength(7);
          const knuckle=numbers.slice(12,14);
          expect(knuckle.every(Number.isFinite)).toBe(true);
          expect(undercuts[k][1]).toBe(knuckle.join(","));
          expect(undercuts[k][2]).toMatch(/^M-?[\d.]+ -?[\d.]+ C/);
          expect((undercuts[k][2].match(/ C/g)??[])).toHaveLength(3);
          expect(undercuts[k][2].endsWith(" Z")).toBe(true);
          expect(html).toContain('id="'+backMasses[k][2]+'-volume-clip"');
          expect(html).toContain('id="'+backMasses[k][2]+'-undercut"');
        }
        expect(paint(school,0)).not.toContain("data-km-master-fuchun-hillback");
        // Ink dilution changes pigment only, never supported stone paths.
        const weak=paint(school,1,.28);
        const weakPaths=[...weak.matchAll(
          /data-km-master-fuchun-hillback-wash="" d="([^"]+)"/g,
        )].map(m=>m[1]);
        expect(weakPaths).toEqual(backMasses.map(m=>m[1]));
      }
      // Guo Xi (NPM Early Spring): a cloud-head is a ROLLED POSITIVE
      // stone cheek with a shaded throat, not a bare S-shaped scratch.
      // Four irregular connected banks per main face, never a global
      // floating motif that can invade paper mist.
      // Early Spring's old pine boughs need crab-claw terminal arcs
      // with a second joint, not merely unchanged upward pine shelves.
      const crabClaws=[...html.matchAll(
        /data-km-cliff-pine-crab-claw="" data-km-cliff-pine-crab-claw-root="([^"]+)" data-km-cliff-pine-crab-claw-bend="([01])" d="([^"]+)"/g,
      )];
      expect(crabClaws).toHaveLength(school==="early-spring"?40:0);
      if(school==="early-spring"){
        expect(crabClaws.filter(m=>m[2]==="0")).toHaveLength(20);
        expect(crabClaws.filter(m=>m[2]==="1")).toHaveLength(20);
        expect(crabClaws.every(([,root,,d])=>
          d.startsWith("M"+root.replace(","," "))&&
          (d.match(/ C/g)??[]).length>=34&&d.endsWith(" Z")))
          .toBe(true);
        expect(new Set(crabClaws.map(m=>m[3])).size).toBe(40);
      }
      const cloudBanks=[...html.matchAll(
        /data-km-master-cloud-bank="" data-km-master-cloud-bank-root="([^"]+)" data-km-master-cloud-bank-index="(\d+)"/g,
      )];
      const cloudBodies=[...html.matchAll(
        /data-km-master-cloud-mass="" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
      )];
      const cloudCount=school==="early-spring"?12:0;
      expect(cloudBanks).toHaveLength(cloudCount);
      expect(cloudBodies).toHaveLength(cloudCount);
      expect((html.match(/data-km-master-cloud-crown=""/g)??[]))
        .toHaveLength(cloudCount);
      expect((html.match(/data-km-master-cloud-recess=""/g)??[]))
        .toHaveLength(cloudCount);
      expect((html.match(/data-km-master-cloud-undercut=""/g)??[]))
        .toHaveLength(cloudCount);
      expect((html.match(/data-km-master-cloud-shelf=""/g)??[]))
        .toHaveLength(cloudCount);
      const guoUndercuts=[...html.matchAll(
        /data-km-master-cloud-undercut="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      const guoShelves=[...html.matchAll(
        /data-km-master-cloud-shelf="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(guoUndercuts).toHaveLength(cloudCount);
      expect(guoShelves).toHaveLength(cloudCount);
      expect(guoUndercuts.every(d=>d.startsWith("M")&&
        (d.match(/ C/g)??[]).length>=3&&
        (d.match(/ Q/g)??[]).length>=1&&d.endsWith(" Z")))
        .toBe(true);
      expect(guoShelves.every(d=>d.startsWith("M")&&
        (d.match(/ C/g)??[]).length>=34&&d.endsWith(" Z")))
        .toBe(true);
      expect(new Set(guoUndercuts).size).toBe(cloudCount);
      if(school==="early-spring"){
        expect(cloudBanks.map(m=>Number(m[2]))).toEqual([
          0,1,2,3,0,1,2,3,0,1,2,3,
        ]);
        const cloudMorphs=[...html.matchAll(
          /data-km-master-cloud-morph="([0-3])"/g,
        )].map(m=>Number(m[1]));
        expect(cloudMorphs).toEqual([0,1,2,3,2,3,0,1,0,1,2,3]);
        for(const index of [0,1,2,3])
          expect(cloudMorphs.filter(m=>m===index)).toHaveLength(3);
        expect(new Set(cloudBanks.map(m=>m[1])).size).toBe(12);
        for(let index=0;index<12;index++){
          const [,root]=cloudBanks[index];
          const [,d,id]=cloudBodies[index];
          expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
          expect((d.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(5);
          expect(d.endsWith(" Z")).toBe(true);
          expect(html).toContain('id="'+id+'"');
        }
      }
      const softBanks=[...html.matchAll(
        /data-km-master-rock-bank="" data-km-master-rock-bank-root="([^"]+)" data-km-master-rock-bank-index="(\d+)"/g,
      )];
      const shadowBodies=[...html.matchAll(
        /data-km-master-rock-bank-wash="" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
      )];
      const expectedBankCount=school==="fuchun"?9:
        school==="forest-grotto"?12:0;
      expect(softBanks).toHaveLength(expectedBankCount);
      expect(shadowBodies).toHaveLength(expectedBankCount);
      expect((html.match(/data-km-master-rock-bank-cap=""/g)??[]))
        .toHaveLength(expectedBankCount);
      for(const [idx,face] of softBanks.entries()){
        expect(Number(face[2])).toBe(idx%(school==="fuchun"?3:4));
        expect(shadowBodies[idx][1].startsWith(
          "M"+face[1].replace(","," "))).toBe(true);
        expect((shadowBodies[idx][1].match(/ C/g)??[])).toHaveLength(5);
        expect(html).toContain('id="'+shadowBodies[idx][2]+'"');
      }
      // Wang Meng's "almost claustrophobic" interlocking rock must
      // exist as shaded connected mass, not exclusively thin hair/line
      // primitives over one beige polygon. Nine nested gorge formations
      // are rooted at five real stone-bank stations, strictly clipped.
      const gullies=[...html.matchAll(
        /data-km-master-wang-gully="" data-km-master-wang-gully-root="([^"]+)" data-km-master-wang-gully-kind="([0-2])"/g,
      )];
      const gullyShadows=[...html.matchAll(
        /data-km-master-wang-gully-shadow="" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
      )];
      const expectedGullies=school==="forest-grotto"?9:0;
      expect(gullies).toHaveLength(expectedGullies);
      expect(gullyShadows).toHaveLength(expectedGullies);
      // V40 screenshot showed large downward columns ending at a
      // blunt parent-clip boundary; the painted gully was too long
      // and dark compared to the source's tapered recessed rock.
      const falls=[...html.matchAll(
        /data-km-master-wang-gully-fall="([^"]+)"/g,
      )].map(m=>Number(m[1]));
      expect(falls).toHaveLength(expectedGullies);
      expect(falls.every(Number.isFinite)).toBe(true);
      if(school==="forest-grotto"){
        expect(Math.max(...falls)).toBeLessThan(50);
        expect(Math.min(...falls)).toBeGreaterThan(20);
      }
      expect((html.match(/data-km-master-wang-gully-rim=""/g)??[]))
        .toHaveLength(expectedGullies);
      expect((html.match(/data-km-master-wang-gully-fold=""/g)??[]))
        .toHaveLength(expectedGullies);
      if(school==="forest-grotto"){
        expect(gullies.map(m=>Number(m[2])))
          .toEqual([0,1,2,0,1,2,0,1,2]);
        expect(new Set(gullies.map(m=>m[1])).size).toBe(9);
        for(let index=0;index<9;index++){
          const root=gullies[index][1];
          const [_,d,id]=gullyShadows[index];
          expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
          expect((d.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(5);
          expect(d.endsWith(" Z")).toBe(true);
          expect(html).toContain('id="'+id+'"');
        }
      }
      const moss=[...html.matchAll(
        /data-km-master-moss-dab="" data-km-master-moss-root="([^"]+)" data-km-master-moss-wet="(dry|wet)" d="([^"]+)"/g,
      )];
      expect(moss).toHaveLength(school==="forest-grotto"?63:0);
      expect(moss.every(([,root,,d])=>
        d.startsWith("M"+root.replace(","," "))&&d.endsWith(" Z")))
        .toBe(true);
      expect(moss.filter(m=>m[2]==="wet").length)
        .toBe(school==="forest-grotto"?12:0);
      const placements=[...html.matchAll(
        /data-km-master-stroke-placement="(rock-volume|attached-stratum)" data-km-master-stroke-curl="(with|counter|none)"/g,
      )];
      expect(placements).toHaveLength(count);
      if(school==="travelers"){
        // Fan Kuan's loaded raindrop *dots* legitimately stand
        // individually on a connected stone plane. Forcing them onto
        // five identical long spines made five visible black columns.
        expect(placements.every(m=>m[1]==="rock-volume"&&m[2]==="none"))
          .toBe(true);
        for(const [start,total] of [[0,78],[78,65],[143,44]] as const){
          const coords=brushParents.slice(start,start+total)
            .map(m=>m[1].split(",").map(Number));
          const xx=coords.map(p=>p[0]),yy=coords.map(p=>p[1]);
          expect(Math.max(...xx)-Math.min(...xx)).toBeGreaterThan(19);
          expect(Math.max(...yy)-Math.min(...yy)).toBeGreaterThan(40);
        }
      }else{
        expect(placements.every(m=>m[1]==="attached-stratum"))
          .toBe(true);
        if(school==="early-spring"){
          // Alternating local hook handedness prevents a uniform set
          // of repeated telephone-cord S stamps.
          expect(placements.filter(m=>m[2]==="counter").length)
            .toBeGreaterThan(10);
          expect(placements.filter(m=>m[2]==="with").length)
            .toBeGreaterThan(10);
        }
      }
      // Four historical schools must not receive the same inherited
      // Fuchun-only downward ridge gouges.
      expect(html.includes('data-km-rock-hero-fold=""'))
        .toBe(school==="fuchun");
      const marks=[...html.matchAll(
        /data-km-master-stroke="" data-km-master-stroke-style="([^"]+)" data-km-master-stroke-root="([^"]+)" data-km-master-stroke-dry="(dry|wet)"/g,
      )];
      expect(marks).toHaveLength(count);
      expect(marks.every(m=>m[1]===expectedStyle)).toBe(true);
      uniqueStyles.push(marks[0][1]);
      expect(new Set(marks.map(m=>m[2])).size)
        .toBeGreaterThan(count*.90);
      expect(marks.some(m=>m[3]==="dry")).toBe(true);
      expect(marks.some(m=>m[3]==="wet")).toBe(true);
      expect(marks.every(m=>m[2].split(",")
        .every(x=>Number.isFinite(Number(x))))).toBe(true);
      const inkPaths=[...html.matchAll(
        /data-km-master-stroke-loaded="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(inkPaths).toHaveLength(count);
      expect(inkPaths.every((d,i)=>
        d.startsWith("M"+marks[i][2].replace(","," "))&&
        (d.match(/ C/g)??[]).length>=34&&d.endsWith(" Z")))
        .toBe(true);
      const fields=[...html.matchAll(
        /data-km-master-brush-field="" data-km-master-field-count="(\d+)" clip-path="url\(#([^"]+)\)"/g,
      )];
      expect(fields).toHaveLength(3);
      expect(fields.reduce((sum,m)=>sum+Number(m[1]),0)).toBe(count);
      expect(fields.every(([,n,id])=>Number(n)>0&&html.includes('id="'+id+'"')))
        .toBe(true);
      expect(html).not.toMatch(/NaN|Infinity|undefined/);
      expect(paint(school)).toBe(html);
      const low=paint(school,0);
      expect(low).not.toContain('data-km-master-rock-art=""');
      // Ink density must not alter brush geometry, and 0 ink removes
      // the entire material contribution via its ancestor opacity.
      const light=paint(school,1,.32);
      const original=html.match(/data-km-master-mass="" d="([^"]+)"/)?.[1];
      const diluted=light.match(/data-km-master-mass="" d="([^"]+)"/)?.[1];
      expect(original).toBe(diluted);
    }
    // This compares school-specific *source-sculpted landforms* rather
    // than merely changing ink opacity on the same generic triangle.
    expect(new Set(ridgeContour).size).toBe(4);
    expect(new Set(uniqueStyles).size).toBe(4);
    expect(()=>assertShanshuiControls({...DEFAULT_SHANSHUI,
      inkSchool:"invented-master" as never})).toThrow(RangeError);
    // CSS/gradient/clip ownership is per film; no duplicated IDs for
    // the same artwork mounted four times on the comparison page.
    const four=renderToStaticMarkup(createElement("section",null,
      ...schools.map(([school])=>createElement(InkShanshuiStage,{
        key:school,frame:145,
        controls:{...DEFAULT_SHANSHUI,detail:1,inkSchool:school},
      })),
    ));
    const scoping=[...four.matchAll(/<clipPath id="(kmrk[^"]+m[012])"/g)]
      .map(m=>m[1]);
    expect(scoping).toHaveLength(12);
    expect(new Set(scoping).size).toBe(12);
    expect(four).not.toContain("<image ");
    expect(four).not.toContain("data:image/");
  },30000);

  it("constructs pine canopies as root-connected, pressure-tapered needle clusters",()=>{
    for(const scene of ["mountain-trail","misty-hermit"] as const){
      const controls={...DEFAULT_SHANSHUI,scene,detail:1};
      const full=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:144,controls,
      }));
      const sprays=(full.match(/data-km-pine-spray=""/g)??[]).length;
      const rosettes=[...full.matchAll(
        /data-km-pine-needle-cluster="" data-km-pine-needles="(\d+)" data-km-pine-twig-root="([^"]+)"/g,
      )];
      expect(sprays).toBeGreaterThan(25);
      expect(rosettes.length).toBeGreaterThan(sprays*2);
      expect(rosettes.length).toBeLessThan(sprays*5);
      const needles=rosettes.reduce((sum,match)=>sum+Number(match[1]),0);
      expect(needles).toBeGreaterThan(800);
      expect(new Set(rosettes.map(match=>match[1])).size).toBeGreaterThan(2);
      expect(rosettes.every(match=>match[2].includes(","))).toBe(true);
      const bark=(full.match(/data-km-pine-bark=""/g)??[]).length;
      expect(bark).toBeGreaterThanOrEqual(20);
      expect(full).not.toMatch(/NaN|Infinity|undefined/);
      expect(full).toEqual(renderToStaticMarkup(createElement(
        InkShanshuiStage,{frame:144,controls},
      )));
      const bare=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:144,controls:{...controls,detail:0},
      }));
      expect(bare).toContain('data-km-shanshui-pine=""');
      expect(bare).not.toContain('data-km-pine-needle-cluster');
    }
  });

  it("places cunfa roots under the same curved ridge actually painted",()=>{
    for(const scene of SHANSHUI_SCENES){
      const controls={...DEFAULT_SHANSHUI,scene};
      const svg=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:168,controls,
      }));
      const ridges=[...svg.matchAll(/data-km-shanshui-ridge="([0-2])"/g)];
      expect(ridges.map(x=>x[1])).toEqual(["0","1","2"]);
      for(const band of ["0","1","2"])
        expect(svg).toContain('data-km-shanshui-ridge-contour="'+band+'"');
      const kinds=[...svg.matchAll(/data-km-cunfa-kind="(axe|hemp)"/g)]
        .map(match=>match[1]);
      expect(kinds.filter(kind=>kind==="hemp").length).toBeGreaterThan(70);
      expect(kinds.filter(kind=>kind==="axe").length).toBeGreaterThan(0);
      const roots=[...svg.matchAll(/data-km-cunfa-crest-y="([^"]+)" data-km-cunfa-root-y="([^"]+)"/g)];
      expect(roots.length).toBeGreaterThan(100);
      expect(kinds).toHaveLength(roots.length);
      for(const [,crest,root] of roots){
        const offset=Number(root)-Number(crest);
        expect(Number.isFinite(offset)).toBe(true);
        expect(offset).toBeGreaterThanOrEqual(4.95);
        expect(offset).toBeLessThanOrEqual(16.05);
      }
      // Randomized-looking pigment is deterministic even after out-of-order
      // seek; the rock-geometry evidence is independent of animation clocks.
      expect(svg).toEqual(renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:168,controls,
      })));
    }
  });

  it("models mountain mass with crest-connected loaded ink shoulders and tributary fibres",()=>{
    for(const scene of SHANSHUI_SCENES){
      const controls={...DEFAULT_SHANSHUI,scene,seed:71,detail:1};
      const draw=(detail:number,seed=71)=>renderToStaticMarkup(createElement(
        InkShanshuiStage,{frame:145,controls:{...controls,detail,seed}},
      ));
      const full=draw(1);
      const masses=[...full.matchAll(
        /data-km-rock-shoulder="" data-km-rock-shoulder-crest="([^"]+)" data-km-rock-shoulder-root="([^"]+)" data-km-rock-shoulder-band="([0-2])" data-km-rock-shoulder-seed="([^"]+)"/g,
      )];
      expect(masses.length).toBeGreaterThanOrEqual(9);
      expect(masses.length).toBeLessThan(23);
      expect(new Set(masses.map(x=>x[3]))).toEqual(new Set(["0","1","2"]));
      for(const [,crest,root] of masses){
        const coords=root.split(",").map(Number);
        expect(coords).toHaveLength(2);
        expect(coords.every(Number.isFinite)).toBe(true);
        expect(Number.isFinite(Number(crest))).toBe(true);
        expect(coords[1]-Number(crest)).toBeGreaterThanOrEqual(2.49);
        expect(coords[1]-Number(crest)).toBeLessThanOrEqual(2.51);
      }
      const washes=(full.match(/data-km-rock-shoulder-wash=""/g)??[]).length;
      const bones=(full.match(/data-km-rock-shoulder-bone=""/g)??[]).length;
      const fibres=[...full.matchAll(
        /data-km-rock-shoulder-vein="" data-km-rock-shoulder-vein-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(washes).toBe(masses.length);
      expect(bones).toBe(masses.length);
      // 3 shared clipped wash filters (one per depth band), not a
      // separate noisy global filter on every geological child path.
      const absorbed=[...full.matchAll(
        /<filter id="([^"]+-rock-[0-2]-paper-absorption)" /g,
      )].map(m=>m[1]);
      expect(absorbed).toHaveLength(3);
      expect(new Set(absorbed).size).toBe(3);
      const absorbedWashes=[...full.matchAll(
        /data-km-rock-shoulder-wash="" d="[^"]+" fill="url\(#([^"]+)\)" filter="url\(#([^"]+)\)"/g,
      )];
      expect(absorbedWashes).toHaveLength(washes);
      expect(absorbedWashes.every(([,gradient,filter])=>
        full.includes('id="'+gradient+'"')&&absorbed.includes(filter)))
        .toBe(true);
      expect(fibres.length).toBeGreaterThan(masses.length*3);
      expect(fibres.every(([,root,d])=>d.startsWith("M"+
        root.replace(","," "))&&d.includes(" Q"))).toBe(true);
      const ledges=[...full.matchAll(
        /data-km-rock-alum-ledge="" data-km-rock-alum-ledge-root="([^"]+)"/g,
      )];
      const faces=[...full.matchAll(
        /data-km-rock-alum-face="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      const rims=(full.match(/data-km-rock-alum-rim=""/g)??[]).length;
      expect(ledges.length).toBeGreaterThan(masses.length);
      expect(ledges.length).toBeLessThanOrEqual(masses.length*3);
      expect(faces.length).toBe(ledges.length);
      expect(rims).toBe(ledges.length);
      expect(faces.every((d,i)=>d.startsWith("M"+
        ledges[i][1].replace(","," "))&&
        d.includes(" Q")&&d.endsWith(" Z"))).toBe(true);
      // A single composed, nested rock formation, rooted on the
      // geographically highest midrange crest, not stamped across
      // every peak or floated on top of the sky.
      const heroRoots=[...full.matchAll(
        /data-km-rock-hero-cliff="" data-km-rock-hero-root="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(heroRoots).toHaveLength(1);
      const cliffStart=full.match(
        /data-km-rock-hero-bone="" d="([^"]+)"/,
      )?.[1];
      expect(cliffStart).toBeDefined();
      expect(cliffStart!.startsWith("M"+heroRoots[0].replace(","," ")))
        .toBe(true);
      const ribs=[...full.matchAll(
        /data-km-rock-hero-rib="" data-km-rock-hero-rib-root="([^"]+)"/g,
      )].map(m=>m[1]);
      const ribFaces=[...full.matchAll(
        /data-km-rock-hero-face="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      const childFibres=[...full.matchAll(
        /data-km-rock-hero-fibre="" data-km-rock-hero-fibre-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(ribs).toHaveLength(4);
      expect(ribFaces).toHaveLength(4);
      // ArtCraft Fuchun bank-following reconstruction: all four existing
      // fracture ribbons traverse three joined, curved ink-loaded stages.
      // Each segment inherits a named positive bank, rather than painting
      // one long nearly straight black vector from a summit.
      const ribCourses=[...full.matchAll(
        /data-km-rock-hero-rib="" data-km-rock-hero-rib-root="([^"]+)" data-km-rock-hero-rib-support="([012])" data-km-rock-hero-rib-course="folded-3"/g,
      )];
      expect(ribCourses).toHaveLength(4);
      expect(ribCourses.map(m=>Number(m[2]))).toEqual([0,1,2,1]);
      expect(ribFaces.every((d,i)=>{
        const parts=d.split(" Z").filter(Boolean);
        return parts.length===3&&
          d.startsWith("M"+ribCourses[i][1].replace(","," "))&&
          (d.match(/ C/g)??[]).length>=90;
      })).toBe(true);
      // A real folded centerline changes curvature, not only pressure.
      const trajectoryStarts=ribFaces.map(d=>
        [...d.matchAll(/(?:^| )M(-?[\d.]+) (-?[\d.]+)/g)]
          .map(([,x,y])=>[Number(x),Number(y)]));
      expect(trajectoryStarts.every(points=>points.length===3&&
        points.every(p=>p.every(Number.isFinite)))).toBe(true);
      // Actual native 1.65x ArtCraft review rejected a violent lateral
      // hairpin: Huang's hemp follows rounded rock backs, with gently
      // changing slope rather than a three-piece lightning bolt.
      expect(trajectoryStarts.every(points=>{
        const dx1=points[1][0]-points[0][0];
        const dx2=points[2][0]-points[1][0];
        return dx1*dx2>=-4; // tolerate a tiny real lifted reversal
      })).toBe(true);
      expect(trajectoryStarts.filter(points=>{
        const dx1=points[1][0]-points[0][0];
        const dy1=points[1][1]-points[0][1];
        const dx2=points[2][0]-points[1][0];
        const dy2=points[2][1]-points[1][1];
        return Math.abs(dx1/dy1-dx2/dy2)>.08;
      }).length).toBeGreaterThanOrEqual(2);
      // Fuchun should contain dry continuous parent brushwork AND
      // independently loaded, curved sub-marks, instead of four
      // solid dark arrow-like spines with one uniform value.
      const deposits=[...full.matchAll(
        /data-km-rock-hero-rib-deposit="" data-km-rock-hero-rib-deposit-root="([^"]+)" data-km-rock-hero-rib-deposit-stage="([0-2])" d="([^"]+)"/g,
      )];
      expect(deposits).toHaveLength(12);
      expect(deposits.map(m=>Number(m[2]))).toEqual([
        0,1,2,0,1,2,0,1,2,0,1,2,
      ]);
      expect(deposits.every(([,root,,d])=>
        d.startsWith("M"+root.replace(","," "))&&
        (d.match(/ C/g)??[]).length>=34&&d.endsWith(" Z")))
        .toBe(true);
      expect(new Set(deposits.map(m=>m[3])).size).toBe(12);
      const folds=[...full.matchAll(
        /data-km-rock-hero-fold="" data-km-rock-hero-fold-root="([^"]+)" data-km-rock-hero-fold-station="([^"]+)"/g,
      )];
      const pressurePaths=[...full.matchAll(
        /data-km-rock-hero-fold-pressure="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      const childRoots=[...full.matchAll(
        /data-km-rock-hero-fold-fibre="" data-km-rock-hero-fold-fibre-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(folds).toHaveLength(3); // One hero, not repetitive rock stamps
      expect(folds.map(m=>Number(m[2]))).toEqual([.13,.36,.59]);
      const foldRoots=folds.map(m=>m[1].split(",").map(Number));
      // A single origin made a mechanically radial black comb. Each
      // rounded primary stone back is now planted on a DIFFERENT
      // verified connected crest station, so the full silhouette has
      // a left bank, a true central bank and a right subordinate bank.
      expect(Math.max(...foldRoots.map(p=>p[0]))-
        Math.min(...foldRoots.map(p=>p[0]))).toBeGreaterThan(90);
      expect(foldRoots.every(p=>p.every(Number.isFinite))).toBe(true);
      expect(pressurePaths).toHaveLength(3);
      expect(pressurePaths.every((d,i)=>
        d.startsWith("M"+folds[i][1].replace(","," "))&&
        (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z")))
        .toBe(true);
      expect((full.match(/data-km-rock-hero-fold-understroke=""/g)??[]))
        .toHaveLength(3);
      expect(childRoots).toHaveLength(9);
      const families=[...full.matchAll(
        /data-km-rock-pima-family="" data-km-rock-pima-family-count="(\d+)"/g,
      )].map(m=>Number(m[1]));
      const pima=[...full.matchAll(
        /data-km-rock-pima-stroke="" data-km-rock-pima-root="([^"]+)" data-km-rock-pima-dry="(loaded|lifted)"/g,
      )];
      const bodies=[...full.matchAll(
        /data-km-rock-pima-body="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(families).toEqual([8,10,6]);
      expect(pima).toHaveLength(24);
      expect(bodies).toHaveLength(24);
      expect(bodies.every((d,i)=>d.startsWith("M"+
        pima[i][1].replace(","," "))&&
        (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z")))
        .toBe(true);
      expect(new Set(pima.map(m=>m[1])).size).toBe(24);
      expect(pima.filter(m=>m[2]==="lifted").length).toBeGreaterThan(4);
      expect((full.match(/data-km-rock-pima-lift=""/g)??[]).length)
        .toBe(pima.filter(m=>m[2]==="lifted").length);
      expect(childRoots.every(([,r,d])=>
        d.startsWith("M"+r.replace(","," "))&&
        (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z")))
        .toBe(true);
      expect((full.match(/data-km-rock-hero-crease=""/g)??[]))
        .toHaveLength(4);
      expect(childFibres).toHaveLength(8);
      // Fuchun nested backs are modeled as attached cubic ribbons.
      // Unlike the earlier straight wedge/rain marks, every primary
      // lobe grows from the ONE mountain bone and the fine hemp tips
      // grow from actual stations of that lobe.
      const terraces=[...full.matchAll(
        /data-km-rock-terrace="" data-km-rock-terrace-root="([^"]+)" data-km-rock-terrace-side="(-?1)"/g,
      )];
      expect(terraces).toHaveLength(3);
      expect(terraces.map(m=>Number(m[2]))).toEqual([-1,1,-1]);
      const terraceRoots=terraces.map(m=>m[1].split(",").map(Number));
      expect(Math.max(...terraceRoots.map(p=>p[0]))-
        Math.min(...terraceRoots.map(p=>p[0]))).toBeGreaterThan(95);
      expect(terraceRoots.every(p=>p.every(Number.isFinite))).toBe(true);
      expect(new Set(terraces.map(m=>m[1])).size).toBe(3);
      const backs=[...full.matchAll(
        /data-km-rock-terrace-back="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      const unders=(full.match(/data-km-rock-terrace-under=""/g)??[]).length;
      expect(backs).toHaveLength(3);
      expect(unders).toBe(3);
      expect(backs.every((d,i)=>
        d.startsWith("M"+terraces[i][1].replace(","," "))&&
        (d.match(/ C/g)??[]).length>=34&&d.endsWith(" Z")))
        .toBe(true);
      const caps=[...full.matchAll(
        /data-km-rock-terrace-cap="" data-km-rock-terrace-cap-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(caps).toHaveLength(6);
      expect(caps.every(([,root,d])=>d.startsWith("M"+root.replace(","," "))))
        .toBe(true);
      const terraceFibres=[...full.matchAll(
        /data-km-rock-terrace-hemp="" data-km-rock-terrace-hemp-root="([^"]+)" data-km-rock-terrace-hemp-dry="(yes|no)" d="([^"]+)"/g,
      )];
      expect(terraceFibres).toHaveLength(40); // 13 + 16 + 11 from three parent backs
      expect(new Set(terraceFibres.map(m=>m[1])).size).toBe(40);
      expect(terraceFibres.filter(m=>m[2]==="yes").length).toBeGreaterThan(7);
      expect(terraceFibres.every(([,r,,d])=>
        r.split(",").every(v=>Number.isFinite(Number(v)))&&
        d.startsWith("M"+r.replace(","," "))&&
        (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z")))
        .toBe(true);
      expect((full.match(/data-km-rock-hero-recess=""/g)??[]))
        .toHaveLength(1);
      expect(ribFaces.every((d,i)=>d.startsWith("M"+
        ribs[i].replace(","," "))&&d.endsWith(" Z"))).toBe(true);
      // Four thin, multi-station curved strokes replace the native
      // screenshot's large triangular rock blades (ArtCraft failure).
      expect(ribFaces.every(d=>(d.match(/ C/g)??[]).length>=22))
        .toBe(true);
      expect(childFibres.every(([,root,d])=>
        d.startsWith("M"+root.replace(","," "))&&d.includes(" Q")))
        .toBe(true);
      // Source-structured five-tree grove is planted ON the same
      // middle ridge visible in the underlying geological scene.
      const groves=(full.match(/data-km-cliff-pine-grove=""/g)??[]).length;
      const rooted=[...full.matchAll(
        /data-km-cliff-pine="" data-km-cliff-pine-root="([^"]+)" data-km-cliff-pine-crest="([^"]+)" data-km-cliff-pine-height="([^"]+)"/g,
      )];
      const boughs=[...full.matchAll(
        /data-km-cliff-pine-bough="" data-km-cliff-pine-bough-root="([^"]+)"/g,
      )];
      const pineBones=[...full.matchAll(
        /data-km-cliff-pine-bough-bone="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      const needles=[...full.matchAll(
        /data-km-cliff-pine-needle="" data-km-cliff-pine-needle-root="([^"]+)" d="([^"]+)"/g,
      )];
      const trunkPaths=[...full.matchAll(
        /data-km-cliff-pine-trunk="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(groves).toBe(1);
      expect(rooted).toHaveLength(5);
      // ArtCraft old-pine reference: Huang Gongwang's grove is uneven
      // in age, spacing and crown rhythm, not 5 regularly tiered antennas.
      // This tests original *connected trunk* geometry, not pixel count.
      const treeXs=rooted.map(([,root])=>Number(root.split(",")[0]));
      const heights=rooted.map(([, , ,h])=>Number(h));
      const gaps=treeXs.slice(1).map((x,i)=>x-treeXs[i]);
      expect(Math.max(...heights)-Math.min(...heights))
        .toBeGreaterThan(54);
      expect(Math.max(...gaps)-Math.min(...gaps))
        .toBeGreaterThan(8);
      // The tallest pine belongs to the displaced right-hand terrace,
      // not the old tightly packed apex; the same plan is repositioned
      // by scene-specific centers, so never hardcode a film x coordinate.
      expect(heights[3]).toBe(Math.max(...heights));
      expect(treeXs[3]-treeXs[2]).toBeGreaterThan(50);
      expect(treeXs[3]-treeXs[0]).toBeGreaterThan(140);
      const boughStations=[...full.matchAll(
        /data-km-cliff-pine-bough-station="([^"]+)"/g,
      )].map(m=>Number(m[1]));
      expect(boughStations).toHaveLength(20);
      expect(new Set(boughStations).size).toBeGreaterThan(13);
      expect(boughStations.every(t=>t>=.18&&t<=.95)).toBe(true);
      for(const [,root,crest,height] of rooted){
        const coords=root.split(",").map(Number);
        expect(coords.every(Number.isFinite)).toBe(true);
        expect(coords[1]-Number(crest)).toBeGreaterThanOrEqual(2.79);
        expect(coords[1]-Number(crest)).toBeLessThanOrEqual(2.81);
        expect(Number(height)).toBeGreaterThan(30);
      }
      expect(trunkPaths).toHaveLength(5);
      expect(trunkPaths.every((d,i)=>d.startsWith("M"+
        rooted[i][1].replace(","," "))&&
        (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z")))
        .toBe(true);
      expect(boughs).toHaveLength(20);
      expect(pineBones).toHaveLength(20);
      expect(pineBones.every((d,i)=>d.startsWith("M"+
        boughs[i][1].replace(","," "))&&d.endsWith(" Z")))
        .toBe(true);
      const pads=[...full.matchAll(
        /data-km-cliff-pine-pad="" data-km-cliff-pine-pad-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(pads).toHaveLength(60);
      expect(pads.every(([,root,d])=>
        d.startsWith("M"+root.replace(","," "))&&
        (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z")))
        .toBe(true);
      // The older grove passed by counting 310 free needle lines but
      // still looked like spindly rooftop antennas at normal scale.
      // True old-pine crowns need supporting filled ink *islands*
      // rooted at real branch stations, beneath those existing needles.
      const islands=[...full.matchAll(
        /data-km-cliff-pine-ink-island="" data-km-cliff-pine-ink-island-root="([^"]+)"/g,
      )];
      const silhouettes=[...full.matchAll(
        /data-km-cliff-pine-ink-canopy="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      const darkEdges=[...full.matchAll(
        /data-km-cliff-pine-ink-edge="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(islands).toHaveLength(40);
      expect(silhouettes).toHaveLength(40);
      expect(darkEdges).toHaveLength(40);
      expect(silhouettes.every((d,k)=>
        d.startsWith("M"+islands[k][1].replace(","," "))&&
        (d.match(/ Q/g)??[]).length>=7&&
        (d.match(/ C/g)??[]).length>=2&&d.endsWith(" Z")))
        .toBe(true);
      const islandLobes=[...full.matchAll(
        /data-km-cliff-pine-fan-lobes="([6-8])"/g,
      )].map(m=>Number(m[1]));
      expect(islandLobes).toHaveLength(40);
      expect(new Set(islandLobes).size).toBe(3);
      expect(darkEdges.every((d,k)=>
        d.startsWith("M"+islands[k][1].replace(","," "))&&
        (d.match(/ C/g)??[]).length>=22&&d.endsWith(" Z")))
        .toBe(true);
      expect(new Set(silhouettes).size).toBe(40);
      expect(needles).toHaveLength(310);
      expect(needles.every(([,root,d])=>
        d.startsWith("M"+root.replace(","," "))&&d.includes(" Q")))
        .toBe(true);
      expect(new Set(needles.map(m=>m[1])).size)
        .toBeGreaterThan(275);
      expect((full.match(/<clipPath id="[^"]*-rock-[0-2]-clip"/g)??[]))
        .toHaveLength(3);
      expect(draw(1)).toBe(full);
      const sparse=draw(0);
      expect(sparse).not.toContain('data-km-rock-shoulder=""');
      expect(sparse).not.toContain('data-km-rock-shoulder-vein=""');
      expect(sparse).not.toContain('data-km-rock-hero-cliff=""');
      expect(sparse).not.toContain('data-km-rock-pima-stroke=""');
      expect(sparse).not.toContain('data-km-cliff-pine-grove=""');
      expect(draw(1,73)).not.toBe(full);
    }
  });

  it("constructs a seed-stable Fuchun dome and broad shoulder, never a needle peak",()=>{
    const paint=(seed:number,detail:number)=>renderToStaticMarkup(
      createElement(InkShanshuiStage,{frame:145,controls:{
        ...DEFAULT_SHANSHUI,scene:"mountain-trail",
        inkSchool:"fuchun",seed,detail,
      }}));
    const ridge=(html:string)=>html.match(
      /data-km-shanshui-ridge-contour="1" d="([^"]+)"/,
    )?.[1];
    for(const seed of [71,87]){
      const d=ridge(paint(seed,1));
      expect(d).toBeDefined();
      // The physical ridge is independent of brush-detail density.
      expect(ridge(paint(seed,0))).toBe(d);
      const points=[...d!.matchAll(
        /[ML] (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
      )].map(([,x,y])=>[Number(x),Number(y)]);
      const at=(x:number)=>points.reduce((nearest,p)=>
        Math.abs(p[0]-x)<Math.abs(nearest[0]-x)?p:nearest)[1];
      // Seven interlocking source stations turn a 559px needle-like
      // triangle into a genuinely held, asymmetrical cap with an
      // uninterrupted left bench and a second, softer right shoulder.
      expect(Math.abs(at(492)-at(512))).toBeLessThan(7);
      expect(at(474)).toBeGreaterThan(at(492)+7);
      expect(at(559)+40).toBeLessThan(at(492));
      expect(at(545)).toBeGreaterThan(at(559));
      const dome=[545,559,572,588,603].map(at);
      expect(Math.max(...dome)-Math.min(...dome)).toBeLessThan(21);
      expect(at(622)-at(572)).toBeLessThan(22);
      // Original native ArtCraft f210 evidence rejected the narrow
      // V-shaped peak. The same source crest now rolls across BOTH
      // shoulders; the actual ridge path, all rooted child strokes,
      // trees and half-dry paper reserves remain source-connected.
      expect(at(531)-at(559)).toBeLessThan(21);
      expect(at(603)-at(559)).toBeLessThan(7);
      expect(at(647)).toBeGreaterThan(at(707)+4);
      // 25 source ridge nodes produce 24×9 preserved organic samples
      // plus two polygon closure edges. Do not decimate curve density.
      expect((d!.match(/L /g)??[])).toHaveLength(218);
    }
    expect(ridge(paint(71,1))).not.toEqual(ridge(paint(87,1)));
    // The old distant pale mountain retained a tall 581px pyramid
    // after the closer geology was fixed. Only the Fuchun far band now
    // shares a gentler two-station crown; do not rewrite the other
    // three schools' historically separate far/middle ridge grammars.
    const far=(html:string)=>html.match(
      /data-km-shanshui-ridge-contour="0" d="([^"]+)"/,
    )?.[1];
    const fuchunFar=far(paint(71,1));
    const guoFar=far(renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
        inkSchool:"early-spring",seed:71,detail:1},
    })));
    expect(fuchunFar).toBeDefined();
    expect(guoFar).toBeDefined();
    const stationY=(d:string,x:number)=>{
      const coords=[...d.matchAll(
        /[ML] (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
      )].map(m=>[Number(m[1]),Number(m[2])]);
      const nearest=coords.reduce((best,p)=>
        Math.abs(p[0]-x)<Math.abs(best[0]-x)?p:best);
      expect(nearest[0]).toBeCloseTo(x,3);
      return nearest[1];
    };
    expect(stationY(fuchunFar!,581)).toBe(123);
    expect(stationY(fuchunFar!,624)).toBe(122);
    expect(stationY(guoFar!,581)).toBe(103);
    expect(stationY(guoFar!,624)).toBe(117);
    // 12 original far parent nodes, 11×9 natural sub-stations
    // and both contour closure edges all remain, never simplified.
    expect((fuchunFar!.match(/L /g)??[])).toHaveLength(101);
  });

  it("builds broad connected Fuchun rock brows rather than tall wet-wash curtains",()=>{
    const paint=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:school,seed,detail},
      }));
    const extent=(path:string)=>{
      const n=(path.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      expect(n.length%2).toBe(0);
      const x=n.filter((_,i)=>i%2===0),y=n.filter((_,i)=>i%2===1);
      return {w:Math.max(...x)-Math.min(...x),
        h:Math.max(...y)-Math.min(...y)};
    };
    for(const seed of [71,87]){
      const scene=paint("fuchun",seed);
      const faces=[...scene.matchAll(
        /data-km-master-mass="" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
      )];
      expect(faces).toHaveLength(3);
      for(const [,path,gradient] of faces){
        // A genuine rounded rock BROW adds connected convex transitions
        // to the existing parent silhouette. No traced source bitmap.
        expect((path.match(/ C/g)??[])).toHaveLength(7);
        expect(path.endsWith(" Z")).toBe(true);
        const {w,h}=extent(path);
        expect(w/h).toBeGreaterThan(.83);
        expect(scene).toContain('id="'+gradient+'"');
      }
      const backs=[...scene.matchAll(
        /data-km-master-fuchun-hillback-wash="" d="([^"]+)"/g,
      )];
      expect(backs).toHaveLength(6);
      for(const [,path] of backs){
        expect((path.match(/ C/g)??[])).toHaveLength(7);
        const {w,h}=extent(path);
        expect(w/h).toBeGreaterThan(.76);
      }
      expect(scene).toMatch(/data-km-master-fuchun-cross-shelf=/);
      expect((scene.match(/data-km-master-stroke="" /g)??[]))
        .toHaveLength(78);
    }
    // Only Huang's positive terrain anatomy is modified. The separate
    // Guo Xi source rock grammar retains its own five-edge silhouettes.
    const guo=paint("early-spring");
    const clouds=[...guo.matchAll(/data-km-master-mass="" d="([^"]+)"/g)];
    expect(clouds).toHaveLength(3);
    expect(clouds.every(([,path])=>(path.match(/ C/g)??[]).length===5))
      .toBe(true);
    expect(paint("fuchun",71,0)).not.toContain(
      "data-km-master-fuchun-hillback-wash");
  });

  it("roots twelve lateral Fuchun stone courses to the actual wet undercut rim",()=>{
    const paint=(school:"fuchun"|"early-spring",seed=71,detail=1,mist=.35)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          seed,detail,mist,inkSchool:school},
      }));
    const full=paint("fuchun");
    const undertops=[...full.matchAll(
      /data-km-master-fuchun-hillback-undercut="" data-km-master-fuchun-hillback-undercut-root="([^"]+)" d="([^"]+)"/g,
    )];
    const shelves=[...full.matchAll(
      /data-km-master-fuchun-cross-shelf="" data-km-master-fuchun-cross-shelf-parent="([01])" data-km-master-fuchun-cross-shelf-root="([^"]+)" data-km-master-fuchun-cross-shelf-station="([^"]+)" data-km-master-fuchun-cross-shelf-axis="([^"]+)" data-km-master-fuchun-cross-shelf-loaded="([01])" d="([^"]+)"/g,
    )];
    expect(undertops).toHaveLength(6);
    expect(shelves).toHaveLength(12);
    for(let j=0;j<shelves.length;j++){
      const [,parent,root,station,axis,loaded,body]=shelves[j];
      // The two courses of one hill-back share its 0/1 local
      // parent index; their load role alternates within that parent.
      expect(Number(parent)).toBe(Math.floor(j/2)%2);
      expect(Number(loaded)).toBe(j%2);
      expect(Number(station)).toBe(j%2===0?.24:.68);
      const undercut=undertops[j>>1][2];
      const bone=(undercut.match(/-?\d+(?:\.\d+)?/g)??[])
        .map(Number).slice(0,8);
      expect(bone).toHaveLength(8);
      const t=Number(station),u=1-t;
      const expected=[
        u*u*u*bone[0]+3*u*u*t*bone[2]+3*u*t*t*bone[4]+t*t*t*bone[6],
        u*u*u*bone[1]+3*u*u*t*bone[3]+3*u*t*t*bone[5]+t*t*t*bone[7],
      ];
      const actual=root.split(",").map(Number);
      expect(Math.hypot(actual[0]-expected[0],
        actual[1]-expected[1])).toBeLessThan(.055);
      expect(axis.startsWith("M"+root.replace(","," "))).toBe(true);
      const points=(axis.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      expect(points).toHaveLength(8);
      const dx=points[6]-points[0],dy=points[7]-points[1];
      expect(Math.abs(dx)).toBeGreaterThan(12);
      expect(Math.abs(dx)).toBeGreaterThan(Math.abs(dy)*1.25);
      expect(body.startsWith("M"+root.replace(","," "))).toBe(true);
      expect((body.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(22);
      // The shelves never escape their exact sampled parent rock volume.
      // React's static SVG serializer can emit an explicit </path>
      // instead of a self-closing />, so inspect only this path's start
      // tag rather than looking for a serializer-dependent terminator.
      const start=shelves[j].index!;
      const openTag=full.slice(start,full.indexOf(">",start)+1);
      expect(openTag).toContain("-volume-clip)");
      expect(openTag).toContain(j%2===0?'fill="#41372f"':'fill="#584a3b"');
    }
    const another=paint("fuchun",87);
    const otherAxes=[...another.matchAll(
      /data-km-master-fuchun-cross-shelf-axis="([^"]+)"/g,
    )].map(x=>x[1]);
    expect(otherAxes).toHaveLength(12);
    expect(otherAxes).not.toEqual(shelves.map(m=>m[4]));
    expect(paint("fuchun",71,0)).not.toContain("data-km-master-fuchun-cross-shelf=");
    expect(paint("early-spring")).not.toContain("data-km-master-fuchun-cross-shelf=");
    // Mist is a material/lighting input, not a geometry or anchor mutation.
    expect([...paint("fuchun",71,1,.9).matchAll(
      /data-km-master-fuchun-cross-shelf-axis="([^"]+)"/g,
    )].map(x=>x[1])).toEqual(shelves.map(m=>m[4]));
  });

  it("groups Fuchun 78 child fibres across all five live banks with an unpainted middle reserve",()=>{
    const paint=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:school,seed,detail},
      }));
    const full=paint("fuchun");
    const starts=[...full.matchAll(/<g data-km-master-face=""[^>]*>/g)]
      .map(match=>match.index!);
    expect(starts).toHaveLength(3);
    const allMarks:string[]=[];
    for(let i=0;i<3;i++){
      const part=full.slice(starts[i],starts[i+1]??full.length);
      const marks=[...part.matchAll(/<g data-km-master-stroke=""[^>]+>/g)]
        .map(m=>m[0]);
      expect(marks).toHaveLength([34,26,18][i]);
      allMarks.push(...marks);
      const zones=new Map<number,Set<string>>();
      for(let j=0;j<marks.length;j++){
        const markup=marks[j];
        const bank=Number(markup.match(/data-km-master-stroke-bank="(\d)"/)?.[1]);
        const t=Number(markup.match(/data-km-master-stroke-bank-station="([^"]+)"/)?.[1]);
        const zone=markup.match(/data-km-master-stroke-source-zone="([^"]+)"/)?.[1];
        expect(bank).toBeGreaterThanOrEqual(0);
        expect(bank).toBeLessThan(5);
        expect(Number.isFinite(t)).toBe(true);
        expect(t).toBeGreaterThanOrEqual(.1);
        expect(t).toBeLessThan(.9);
        // Real open paper, not barely different random distribution.
        expect(t<.46||t>.56).toBe(true);
        expect(zone).toBe(t<.46?"upper-bank":"lower-bank");
        if(!zones.has(bank))zones.set(bank,new Set());
        zones.get(bank)!.add(zone!);
        expect(markup).toContain('data-km-master-stroke-placement="attached-stratum"');
      }
      // Every complete 5-contact phrase visits 5 distinct parent banks.
      for(let j=0;j<marks.length;j+=5){
        const group=marks.slice(j,j+5);
        const banks=group.map(x=>x.match(/data-km-master-stroke-bank="(\d)"/)?.[1]);
        expect(new Set(banks).size).toBe(group.length);
      }
      expect([...zones.values()].every(z=>
        z.has("upper-bank")&&z.has("lower-bank"))).toBe(true);
    }
    expect(allMarks).toHaveLength(78);
    const graded=[...full.matchAll(
      /data-km-master-stratum-wash="" d="[^"]+" fill="url\(#([^"]+)\)"/g,
    )].map(m=>m[1]);
    expect(graded).toHaveLength(15);
    expect(new Set(graded).size).toBe(15);
    for(const id of graded){
      expect(full).toContain('id="'+id+'"');
      expect(id).toContain("hemp-body");
    }
    expect(full).toContain('data-km-master-stroke-source-zone="upper-bank"');
    expect(full).toContain('data-km-master-stroke-source-zone="lower-bank"');
    // Altered pigment load makes the short roots the dark notes; full
    // downhill hemp remains physically present but optically recessive.
    // Long-hemp faces now carry a true negative paper-reserve mask
    // before the same original loaded SVG path; short head contacts
    // remain fully wet and do not need a dry-core reserve.
    expect(full).toMatch(/data-km-master-stroke-phrase="long"[^>]*><defs><mask data-km-master-stroke-reserve=""/);
    expect(full).toMatch(/<path data-km-master-stroke-loaded="" d="[^"]+" fill="#675541" mask="url\(#([^"]+)\)"/);
    expect(full).toMatch(/data-km-master-stroke-phrase="short"[^>]*><path data-km-master-stroke-loaded="" d="[^"]+" fill="#44382f"/);
    expect(paint("fuchun",87)).not.toBe(full);
    expect(paint("fuchun",71,0)).not.toContain("data-km-master-stroke-source-zone=");
    expect(paint("early-spring")).not.toContain("data-km-master-stroke-source-zone=");
  });

  it("opens four actual hero ribs to paper without sacrificing any folded parent course",()=>{
    const paint=(school:"fuchun"|"early-spring",detail=1,seed=71,mist=.35)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:school,detail,seed,mist},
      }));
    const full=paint("fuchun");
    const ribs=[...full.matchAll(
      /data-km-rock-hero-rib="" data-km-rock-hero-rib-root="([^"]+)" data-km-rock-hero-rib-support="[012]" data-km-rock-hero-rib-course="folded-3"/g,
    )];
    const reserves=[...full.matchAll(
      /<mask data-km-rock-hero-rib-reserve="" id="([^"]+)" /g,
    )];
    const bodies=[...full.matchAll(
      /data-km-rock-hero-face="" d="([^"]+)" fill="[^"]+" mask="url\(#([^"]+)\)"/g,
    )];
    const witness=[...full.matchAll(
      /data-km-rock-hero-crease=""[^>]*mask="url\(#([^"]+)\)"/g,
    )];
    expect(ribs).toHaveLength(4);
    expect(reserves).toHaveLength(4);
    expect(bodies).toHaveLength(4);
    expect(witness).toHaveLength(4);
    expect(new Set(reserves.map(m=>m[1])).size).toBe(4);
    expect(bodies.map(m=>m[2])).toEqual(reserves.map(m=>m[1]));
    expect(witness.map(m=>m[1])).toEqual(reserves.map(m=>m[1]));
    for(let i=0;i<4;i++){
      const from=reserves[i].index!;
      const mask=full.slice(from,full.indexOf("</mask>",from)+7);
      expect(mask).toContain('style="mask-type:luminance"');
      expect(mask).toContain('fill="#fff"');
      const slits=[...mask.matchAll(
        /data-km-rock-hero-rib-paper-slit="" data-km-rock-hero-rib-paper-stage="([012])" data-km-rock-hero-rib-paper-station="([^"]+)" d="([^"]+)" /g,
      )];
      expect(slits).toHaveLength(6);
      expect(slits.map(m=>Number(m[1]))).toEqual([0,0,1,1,2,2]);
      expect(slits.map(m=>Number(m[2]))).toEqual([
        .38,.7,.38,.7,.38,.7,
      ]);
      expect(slits.every(m=>(m[3].match(/ Q/g)??[]).length===1&&
        (m[3].match(/-?\d+(?:\.\d+)?/g)??[]).length===6))
        .toBe(true);
      expect(mask).toContain('stroke="#000"');
      expect((bodies[i][1].match(/ C/g)??[]).length)
        .toBeGreaterThanOrEqual(90);
    }
    expect((full.match(/data-km-rock-hero-rib-deposit="" /g)??[]))
      .toHaveLength(12);
    expect((full.match(/data-km-rock-hero-fibre="" /g)??[]))
      .toHaveLength(8);
    expect(paint("fuchun",1,71)).toEqual(full);
    expect(paint("fuchun",1,87)).not.toEqual(full);
    expect([...paint("fuchun",1,71,.88).matchAll(
      /<mask data-km-rock-hero-rib-reserve="" id="([^"]+)" /g,
    )].map(m=>m[1])).toEqual(reserves.map(m=>m[1]));
    expect(paint("fuchun",.5)).not.toContain(
      'data-km-rock-hero-rib-reserve=""');
    expect(paint("early-spring")).not.toContain(
      'data-km-rock-hero-rib-reserve=""');
  });



  it("paints the unchanged Fuchun hero geological bone as two genuine source-exact ink phrases, not one opaque ruler",()=>{
    const draw=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,seed,detail},
      }));
    for(const seed of [71,97]){
      const html=draw("fuchun",seed);
      const original=html.match(
        /data-km-rock-hero-bone="" d="([^"]+)" fill="none" stroke="#695745"/,
      );
      expect(original).not.toBeNull();
      expect((original![1].match(/ Q/g)??[])).toHaveLength(2);
      expect((original![1].match(/ M/g)??[])).toHaveLength(1);
      const parts=[...html.matchAll(
        /data-km-rock-hero-bone-loaded="" data-km-rock-hero-bone-part="(crown|dry-tail)" data-km-rock-hero-bone-loaded-root="([^"]+)" data-km-rock-hero-bone-loaded-tip="([^"]+)" data-km-rock-hero-bone-source-from="([^"]+)" data-km-rock-hero-bone-source-to="([^"]+)" d="([^"]+)"/g,
      )];
      expect(parts).toHaveLength(2);
      expect(parts.map(p=>p[1])).toEqual(["crown","dry-tail"]);
      expect(parts.map(p=>[Number(p[4]),Number(p[5])])).toEqual([
        [0,.41],[.52,.91],
      ]);
      const parent=html.match(/data-km-rock-hero-cliff="" data-km-rock-hero-root="([^"]+)"/)?.[1];
      expect(parent).toBeDefined();
      expect(original![1].startsWith(
        "M"+parent!.replace(","," "))).toBe(true);
      const [x,y]=parent!.split(",").map(Number);
      const control:[number,number]=[x-19,y+31];
      const tail:[number,number]=[x-56,y+116];
      const source=(t:number)=>{
        const u=1-t;
        return [
          u*u*x+2*u*t*control[0]+t*t*tail[0],
          u*u*y+2*u*t*control[1]+t*t*tail[1],
        ];
      };
      for(const [, ,r,t,start,stop,d] of parts){
        // Even the original fine witness follows the identical source
        // subcurve and cannot silently paint over the true paper gap.
        expect(original![1]).toContain("M"+r.replace(","," "));
        const control=source(Number(start));
        expect(control.every(Number.isFinite)).toBe(true);
        const at=source(Number(start)),end=source(Number(stop));
        const actualR=r.split(",").map(Number);
        const actualT=t.split(",").map(Number);
        expect(Math.hypot(actualR[0]-at[0],actualR[1]-at[1]))
          .toBeLessThan(.02);
        expect(Math.hypot(actualT[0]-end[0],actualT[1]-end[1]))
          .toBeLessThan(.02);
        expect(d.startsWith("M"+r.replace(","," "))).toBe(true);
        expect((d.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(22);
        expect(d.endsWith(" Z")).toBe(true);
      }
      // No pale canvas overpaint; the source quad has a real
      // unpainted interval .41...52 between the two ink deposits.
      expect(Number(parts[1][4])-Number(parts[0][5]))
        .toBeGreaterThan(.1);
      expect((html.match(/data-km-rock-hero-rib=""/g)??[])).toHaveLength(4);
      expect((html.match(/data-km-rock-hero-rib-paper-slit=""/g)??[]))
        .toHaveLength(24);
      expect((html.match(/data-km-rock-hero-rib-deposit=""/g)??[]))
        .toHaveLength(12);
      expect((html.match(/data-km-rock-terrace-hemp=""/g)??[]))
        .toHaveLength(40);
      expect(draw("fuchun",seed)).toBe(html);
    }
    expect(draw("fuchun",71,0)).not.toContain(
      'data-km-rock-hero-bone-loaded=""');
    expect(draw("early-spring")).not.toContain(
      'data-km-rock-hero-bone-loaded=""');
  });

  it("folds four authentic Fuchun hero-rib ribbons over short positive cheeks instead of diagonal stone wires",()=>{
    const draw=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,seed,detail},
      }));
    for(const seed of [71,97]){
      const html=draw("fuchun",seed);
      const ribs=[...html.matchAll(
        /data-km-rock-hero-rib="" data-km-rock-hero-rib-root="([^"]+)" data-km-rock-hero-rib-support="([012])" data-km-rock-hero-rib-course="folded-3" data-km-rock-hero-rib-knee="([^"]+)" data-km-rock-hero-rib-return="([^"]+)" data-km-rock-hero-rib-tip="([^"]+)"/g,
      )];
      expect(ribs).toHaveLength(4);
      const wash=[...html.matchAll(
        /data-km-rock-hero-rib-cheek-wash="" d="([^"]+)" data-km-rock-hero-rib-cheek-root="([^"]+)" data-km-rock-hero-rib-cheek-knee="([^"]+)" data-km-rock-hero-rib-cheek-tip="([^"]+)" fill="url\(#([^"]+)\)"/g,
      )];
      expect(wash).toHaveLength(4);
      expect(new Set(wash.map(x=>x[1])).size).toBe(4);
      for(let i=0;i<4;i++){
        const [,root, ,knee,returning,tip]=ribs[i];
        const [ ,d,from,bend,end,gradient]=wash[i];
        expect([from,bend,end]).toEqual([root,knee,tip]);
        expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
        expect((d.match(/ C/g)??[])).toHaveLength(6);
        expect((d.match(/ Q/g)??[])).toHaveLength(1);
        expect(d.endsWith(" Z")).toBe(true);
        expect(html).toContain('id="'+gradient+'"');
        const p=[root,knee,returning,tip].map(x=>x.split(",").map(Number));
        expect(p.every(q=>q.every(Number.isFinite))).toBe(true);
        const dy=p[3][1]-p[0][1];
        expect(dy).toBeGreaterThan(35);
        expect(dy).toBeLessThan(70);
        // The original 62–84 vertical-unit hanging wire had a weak
        // lateral turn in its first quarter. These positive rock
        // brows must reach at least one third their drift by the first
        // shallow 20–23% of their descent, then physically fold down.
        const dx=p[3][0]-p[0][0];
        expect(Math.abs(dx)).toBeGreaterThan(15);
        expect(Math.abs(p[1][0]-p[0][0])).toBeGreaterThan(
          Math.abs(dx)*.30);
        expect((p[1][1]-p[0][1])/dy).toBeLessThan(.32);
        expect((p[2][1]-p[0][1])/dy).toBeLessThan(.65);
      }
      expect((html.match(/data-km-rock-hero-face=""/g)??[]))
        .toHaveLength(4);
      expect((html.match(/data-km-rock-hero-rib-deposit=""/g)??[]))
        .toHaveLength(12);
      expect((html.match(/data-km-rock-hero-rib-paper-slit=""/g)??[]))
        .toHaveLength(24);
      expect((html.match(/data-km-rock-hero-fibre=""/g)??[]))
        .toHaveLength(8);
      expect(draw("fuchun",seed)).toBe(html);
    }
    expect(draw("fuchun",71,0)).not.toContain(
      'data-km-rock-hero-rib-cheek-wash=""');
    expect(draw("early-spring")).not.toContain(
      'data-km-rock-hero-rib-cheek-wash=""');
  });


  it("keeps 24 Fuchun hero ink paper slits open through the original brush, its positive cheek, and all twelve loaded deposits",()=>{
    const render=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,detail,seed},
      }));
    for(const seed of [71,97]){
      const html=render("fuchun",seed);
      const ids=[...html.matchAll(
        /<mask data-km-rock-hero-rib-reserve="" id="([^"]+)" /g,
      )].map(m=>m[1]);
      expect(ids).toHaveLength(4);
      expect(new Set(ids).size).toBe(4);
      const cheeks=[...html.matchAll(
        /data-km-rock-hero-rib-cheek-wash="" d="[^"]+" data-km-rock-hero-rib-cheek-root="[^"]+" data-km-rock-hero-rib-cheek-knee="[^"]+" data-km-rock-hero-rib-cheek-tip="[^"]+" fill="[^"]+" mask="url\(#([^"]+)\)"/g,
      )].map(m=>m[1]);
      expect(cheeks).toEqual(ids);
      const strokes=[...html.matchAll(
        /data-km-rock-hero-face="" d="[^"]+" fill="[^"]+" mask="url\(#([^"]+)\)"/g,
      )].map(m=>m[1]);
      expect(strokes).toEqual(ids);
      const deposits=[...html.matchAll(
        /data-km-rock-hero-rib-deposit="" data-km-rock-hero-rib-deposit-root="[^"]+" data-km-rock-hero-rib-deposit-stage="[012]" d="[^"]+" fill="[^"]+" mask="url\(#([^"]+)\)"/g,
      )].map(m=>m[1]);
      expect(deposits).toEqual(ids.flatMap(id=>[id,id,id]));
      const masks=ids.map(id=>{
        const start=html.indexOf('id="'+id+'"');
        return html.slice(start,html.indexOf("</mask>",start)+7);
      });
      expect(masks).toHaveLength(4);
      masks.forEach((mask,i)=>{
        expect(mask).toContain('style="mask-type:luminance"');
        expect((mask.match(/data-km-rock-hero-rib-paper-slit=""/g)??[]))
          .toHaveLength(6);
        const actualIds=[...mask.matchAll(
          /data-km-rock-hero-rib-paper-station="([^"]+)" d="([^"]+)"/g,
        )];
        expect(actualIds).toHaveLength(6);
        for(const [,at,d] of actualIds){
          expect([.38,.7]).toContain(Number(at));
          expect(d).not.toMatch(/NaN|Infinity|undefined/);
        }
        expect(cheeks[i]).toBe(ids[i]);
      });
      expect((html.match(/data-km-rock-hero-rib-cheek-wash=""/g)??[]))
        .toHaveLength(4);
      expect((html.match(/data-km-rock-hero-rib-deposit=""/g)??[]))
        .toHaveLength(12);
      expect(render("fuchun",seed)).toBe(html);
    }
    expect(render("fuchun",71,0)).not.toContain(
      'data-km-rock-hero-rib-cheek-wash=""');
    expect(render("early-spring")).not.toContain(
      'data-km-rock-hero-rib-cheek-wash=""');
  });

  it("preserves Fuchun loaded fibres while opening true negative dry-paper reserves",()=>{
    const paint=(school:"fuchun"|"early-spring",seed=71,detail=1,
      mist=.35)=>renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
        inkSchool:school,seed,detail,mist},
    }));
    const full=paint("fuchun");
    const reserves=[...full.matchAll(
      /<mask data-km-master-stroke-reserve="" id="([^"]+)" /g,
    )];
    const painted=[...full.matchAll(
      /<path data-km-master-stroke-loaded="" d="([^"]+)" fill="([^"]+)" mask="url\(#([^"]+)\)"/g,
    )];
    // Do not delete a single brush or replace it with a raster texture.
    expect((full.match(/data-km-master-stroke="" /g)??[]))
      .toHaveLength(78);
    expect(reserves.length).toBeGreaterThan(18);
    expect(reserves.length).toBeLessThan(45);
    expect(painted).toHaveLength(reserves.length);
    expect(new Set(reserves.map(m=>m[1])).size).toBe(reserves.length);
    expect(painted.map(m=>m[3])).toEqual(reserves.map(m=>m[1]));
    const stations:number[]=[];
    for(let j=0;j<reserves.length;j++){
      const id=reserves[j][1];
      const from=reserves[j].index!;
      const mask=full.slice(from,full.indexOf("</mask>",from)+7);
      const original=painted[j][1];
      expect(mask).toContain('style="mask-type:luminance"');
      expect(mask).toContain('d="'+original+'" fill="#fff"');
      expect(painted[j][2]).toMatch(/^#(675541|44382f)$/);
      const slits=[...mask.matchAll(
        /data-km-master-stroke-paper-slit="" data-km-master-stroke-paper-station="([^"]+)" d="([^"]+)" /g,
      )];
      expect(slits).toHaveLength(2);
      for(const slit of slits){
        const t=Number(slit[1]);
        expect(t).toBeGreaterThanOrEqual(.38);
        expect(t).toBeLessThanOrEqual(.67);
        const points=(slit[2].match(/-?\d+(?:\.\d+)?/g)??[])
          .map(Number);
        expect(points).toHaveLength(6);
        expect(points.every(Number.isFinite)).toBe(true);
        expect(points[5]).toBeGreaterThan(points[1]);
        stations.push(t);
      }
      expect(mask).toContain('id="'+id+'"');
      expect(mask).toContain('stroke="#000"');
    }
    expect(stations.filter(t=>t===.38)).toHaveLength(reserves.length);
    expect(stations.filter(t=>t===.67)).toHaveLength(reserves.length);
    // Reproducibility: masks belong to same seeded anatomical marks,
    // while their tear edge, pressure and crop respond deterministically.
    expect(paint("fuchun")).toEqual(full);
    expect(paint("fuchun",87)).not.toEqual(full);
    expect([...paint("fuchun",71,1,.9).matchAll(
      /<mask data-km-master-stroke-reserve="" id="([^"]+)" /g,
    )].map(m=>m[1])).toEqual(reserves.map(m=>m[1]));
    expect(paint("fuchun",71,.6)).not.toContain(
      'data-km-master-stroke-reserve=""');
    expect(paint("fuchun",71,0)).not.toContain(
      'data-km-master-stroke-reserve=""');
    expect(paint("early-spring")).not.toContain(
      'data-km-master-stroke-reserve=""');
  });


  it("paints nine genuine Fuchun slope-turning ink volumes between original cubic rock strata",()=>{
    const render=(school:"fuchun"|"early-spring",seed=71)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,seed,detail:1},
      }));
    for(const seed of [71,97]){
      const html=render("fuchun",seed);
      const ribs=[...html.matchAll(
        /data-km-master-stratum="" data-km-master-stratum-root="([^"]+)" data-km-master-stratum-index="([0-4])" data-km-master-stratum-centerline="([^"]+)"/g,
      )].map(m=>(m[3].match(/-?\d+(?:\.\d+)?/g)??[]).map(Number));
      expect(ribs).toHaveLength(15);
      const bands=[...html.matchAll(
        /data-km-master-fuchun-turning-bank="" data-km-master-fuchun-turning-bank-root="([^"]+)" data-km-master-fuchun-turning-bank-tip="([^"]+)" data-km-master-fuchun-turning-bank-from="([0-4])" data-km-master-fuchun-turning-bank-to="([0-4])" data-km-master-fuchun-turning-bank-depth="([^"]+)" data-km-master-fuchun-turning-bank-offset="([^"]+)"/g,
      )];
      expect(bands).toHaveLength(9);
      const sample=(p:number[],t:number)=>{
        const [x,y,c1x,c1y,c2x,c2y,tx,ty]=p,u=1-t;
        return [u*u*u*x+3*u*u*t*c1x+3*u*t*t*c2x+t*t*t*tx,
          u*u*u*y+3*u*u*t*c1y+3*u*t*t*c2y+t*t*t*ty];
      };
      for(let i=0;i<9;i++){
        const [,root,tip,from,to,depth,offset]=bands[i];
        const face=Math.floor(i/3);
        const a=sample(ribs[face*5+Number(from)],Number(depth));
        const b=sample(ribs[face*5+Number(to)],
          Number(depth)+Number(offset));
        const actualA=root.split(",").map(Number);
        const actualB=tip.split(",").map(Number);
        expect(Math.hypot(actualA[0]-a[0],actualA[1]-a[1]))
          .toBeLessThan(.06);
        expect(Math.hypot(actualB[0]-b[0],actualB[1]-b[1]))
          .toBeLessThan(.06);
        expect(Math.hypot(actualA[0]-actualB[0],
          actualA[1]-actualB[1])).toBeGreaterThan(9);
      }
      expect((html.match(/data-km-master-fuchun-turning-wash=""/g)??[]))
        .toHaveLength(9);
      expect((html.match(/data-km-master-fuchun-turning-crest=""/g)??[]))
        .toHaveLength(9);
      expect((html.match(/data-km-master-fuchun-turning-crease=""/g)??[]))
        .toHaveLength(9);
      expect((html.match(/data-km-master-stroke-style="long-hemp"/g)??[]))
        .toHaveLength(78);
      expect((html.match(/data-km-master-fuchun-hillback=""/g)??[]))
        .toHaveLength(6);
      expect(render("fuchun",seed)).toBe(html);
    }
    expect(render("early-spring")).not.toContain(
      "data-km-master-fuchun-turning-bank");
  });

  it("keeps all 78 live Fuchun ink strokes while varying length and handedness across rock cheeks",()=>{
    const paint=(school:"fuchun"|"early-spring",detail=1,seed=71)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,detail,seed},
      }));
    const html=paint("fuchun");
    const marks=[...html.matchAll(
      /data-km-master-stroke="" data-km-master-stroke-style="long-hemp" data-km-master-stroke-root="([^"]+)" data-km-master-stroke-dry="(?:dry|wet)" data-km-master-stroke-bank="[0-4]" data-km-master-stroke-bank-station="[^"]+" data-km-master-stroke-placement="attached-stratum" data-km-master-stroke-curl="none" data-km-master-stroke-phrase="(short|medium|long)" data-km-master-stroke-axis="([^"]+)"/g,
    )];
    expect(marks).toHaveLength(78);
    const lens:number[]=[];
    const lean:number[]=[];
    for(const [,root,phrase,axis] of marks){
      const p=(axis.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      expect(p).toHaveLength(8);
      expect(axis.startsWith("M"+root.replace(","," "))).toBe(true);
      expect(axis.includes(" C")).toBe(true);
      expect(p.every(Number.isFinite)).toBe(true);
      expect(p[3]).toBeGreaterThan(p[1]);
      expect(p[5]).toBeGreaterThan(p[3]);
      expect(p[7]).toBeGreaterThan(p[5]);
      const length=p[7]-p[1];
      lens.push(length);
      lean.push(p[6]-p[0]);
      expect(length).toBeGreaterThan(8);
      expect(length).toBeLessThan(62);
      if(phrase==="short")expect(length).toBeLessThan(26);
      if(phrase==="long")expect(length).toBeGreaterThan(34);
    }
    for(const phrase of ["short","medium","long"])
      expect(marks.filter(m=>m[2]===phrase).length)
        .toBeGreaterThanOrEqual(12);
    expect(Math.max(...lens)-Math.min(...lens)).toBeGreaterThan(37);
    expect(lean.filter(x=>x< -5).length).toBeGreaterThanOrEqual(15);
    expect(lean.filter(x=>x>5).length).toBeGreaterThanOrEqual(9);
    // Native v52 ArtCraft screenshot exposed crossed X-shaped wires.
    // Huang's hemp descends WITH the supporting rock cheek. Opposite
    // cheek sides exist across the landscape, but an individual cheek
    // must not reverse a quarter of its fibres into diagonal X hatching.
    const cheeks=[
      {from:0,to:34,side:-1,minimum:28},
      {from:34,to:60,side:1,minimum:21},
      {from:60,to:78,side:-1,minimum:15},
    ] as const;
    for(const cheek of cheeks){
      const matching=lean.slice(cheek.from,cheek.to)
        .filter(dx=>dx*cheek.side>3).length;
      expect(matching).toBeGreaterThanOrEqual(cheek.minimum);
    }
    expect(paint("fuchun")).toBe(html);
    expect(paint("fuchun",1,91)).not.toBe(html);
    expect(paint("fuchun",0)).not.toContain(
      'data-km-master-stroke-phrase=');
    expect(paint("early-spring")).not.toContain(
      'data-km-master-stroke-phrase=');
  });



  it("loads the original 78 parent-rooted Fuchun hemp paths with three historically distinct pressure envelopes",()=>{
    const make=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,seed,detail},
      }));
    for(const seed of [71,97,111]){
      const html=make("fuchun",seed);
      const strokes=[...html.matchAll(
        /data-km-master-stroke="" data-km-master-stroke-style="long-hemp" data-km-master-stroke-root="([^"]+)" data-km-master-stroke-dry="(?:wet|dry)" data-km-master-stroke-bank="[0-4]" data-km-master-stroke-bank-station="[^"]+" data-km-master-stroke-placement="attached-stratum" data-km-master-stroke-curl="none" data-km-master-stroke-phrase="(short|medium|long)" data-km-master-stroke-axis="([^"]+)" data-km-master-stroke-source-zone="[^"]+" data-km-master-stroke-flow="shoulder-first-pima" data-km-master-stroke-pressure-role="(root-loaded|broken-middle|feathered-tail)"/g,
      )];
      expect(strokes).toHaveLength(78);
      for(const mode of ["root-loaded","broken-middle","feathered-tail"]){
        expect(strokes.filter(x=>x[4]===mode).length).toBeGreaterThan(12);
      }
      const mapping={
        short:"root-loaded",medium:"broken-middle",long:"feathered-tail",
      } as const;
      const roots=strokes.map(x=>x[1]);
      for(const [,root,phrase,axis,role] of strokes){
        expect(role).toBe(mapping[phrase as keyof typeof mapping]);
        expect(axis.startsWith("M"+root.replace(","," "))).toBe(true);
      }
      const positive=[...html.matchAll(
        /data-km-master-stroke-loaded="" d="([^"]+)" fill="[^"]+"(?: mask="[^"]+")?/g,
      )].map(x=>x[1]);
      expect(positive).toHaveLength(78);
      expect(new Set(positive).size).toBe(78);
      positive.forEach((path,i)=>{
        expect(path.startsWith("M"+roots[i].replace(","," "))).toBe(true);
        expect((path.match(/ C/g)??[]).length).toBeGreaterThan(30);
        expect(path.endsWith(" Z")).toBe(true);
        expect(path).not.toMatch(/NaN|Infinity|undefined/);
      });
      expect((html.match(/data-km-master-stratum=""/g)??[]))
        .toHaveLength(15);
      expect((html.match(/data-km-master-stroke-paper-slit=""/g)??[]).length)
        .toBeGreaterThan(35);
      expect(make("fuchun",seed)).toBe(html);
    }
    expect(make("fuchun",71,0)).not.toContain(
      'data-km-master-stroke-pressure-role="root-loaded"');
    expect(make("early-spring")).not.toContain(
      "data-km-master-stroke-pressure-role");
  });

  it("sweeps all 78 Fuchun pima across the source rock shoulder before descending with a tapered dry tail",()=>{
    const draw=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,seed,detail},
      }));
    for(const seed of [71,97,111]){
      const html=draw("fuchun",seed);
      const marks=[...html.matchAll(
        /data-km-master-stroke="" data-km-master-stroke-style="long-hemp" data-km-master-stroke-root="([^"]+)" data-km-master-stroke-dry="(?:wet|dry)" data-km-master-stroke-bank="[0-4]" data-km-master-stroke-bank-station="[^"]+" data-km-master-stroke-placement="attached-stratum" data-km-master-stroke-curl="none" data-km-master-stroke-phrase="(short|medium|long)" data-km-master-stroke-axis="([^"]+)" data-km-master-stroke-source-zone="[^"]+" data-km-master-stroke-flow="shoulder-first-pima"/g,
      )];
      expect(marks).toHaveLength(78);
      const lengths:number[]=[];
      const sweeps:number[]=[];
      let strongEarlyTurns=0;
      for(const [,root,phrase,axis] of marks){
        const p=(axis.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
        expect(p).toHaveLength(8);
        expect(axis.startsWith("M"+root.replace(","," "))).toBe(true);
        const dx=p[6]-p[0],dy=p[7]-p[1];
        expect(Math.abs(dx)).toBeGreaterThan(3);
        expect(dy).toBeGreaterThan(8);
        expect(dy).toBeLessThan(50);
        const firstTurn=(p[2]-p[0])/dx;
        const secondTurn=(p[4]-p[0])/dx;
        const headFall=(p[3]-p[1])/dy;
        const shoulderFall=(p[5]-p[1])/dy;
        expect(firstTurn).toBeGreaterThan(.26);
        expect(firstTurn).toBeLessThan(.9);
        expect(secondTurn).toBeGreaterThan(.62);
        expect(secondTurn).toBeLessThan(1.35);
        expect(headFall).toBeGreaterThan(0);
        expect(headFall).toBeLessThan(.19);
        expect(shoulderFall).toBeGreaterThan(.49);
        expect(shoulderFall).toBeLessThan(.68);
        expect(p[3]).toBeLessThan(p[5]);
        if(firstTurn>.49)strongEarlyTurns++;
        lengths.push(dy);sweeps.push(firstTurn);
        if(phrase==="short")expect(dy).toBeLessThan(22);
        if(phrase==="medium"){
          expect(dy).toBeGreaterThan(16);
          expect(dy).toBeLessThan(35);
        }
        if(phrase==="long"){
          expect(dy).toBeGreaterThan(34);
          expect(dy).toBeLessThan(50);
        }
      }
      expect(strongEarlyTurns).toBeGreaterThanOrEqual(36);
      expect(Math.max(...lengths)-Math.min(...lengths))
        .toBeGreaterThan(37);
      expect(Math.max(...sweeps)-Math.min(...sweeps))
        .toBeGreaterThan(.14);
      // Three real geological faces, fifteen supporting rock
      // stratum centerlines; no parent detail destroyed in redesign.
      expect((html.match(/data-km-master-face=""/g)??[])).toHaveLength(3);
      expect((html.match(/data-km-master-stratum=""/g)??[])).toHaveLength(15);
      expect((html.match(/data-km-master-stroke-loaded=""/g)??[]))
        .toHaveLength(78);
      expect(draw("fuchun",seed)).toBe(html);
    }
    expect(draw("fuchun",71,0)).not.toContain(
      'data-km-master-stroke-flow="shoulder-first-pima"');
    expect(draw("early-spring")).not.toContain(
      'data-km-master-stroke-flow="shoulder-first-pima"');
  });

  it("roots all original 78 Fuchun long-hemp marks to curving parent strata rather than straight dark wires",()=>{
    const paint=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:school,seed,detail,mist:.35},
      }));
    const full=paint("fuchun");
    const strata=[...full.matchAll(
      /data-km-master-stratum="" data-km-master-stratum-root="([^"]+)" data-km-master-stratum-index="([0-4])" data-km-master-stratum-centerline="([^"]+)"/g,
    )];
    expect(strata).toHaveLength(15);
    const bones=strata.map(([,root,,d])=>{
      expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
      expect((d.match(/ C/g)??[])).toHaveLength(1);
      const p=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      expect(p).toHaveLength(8);
      expect(p.every(Number.isFinite)).toBe(true);
      // Genuine Fuchun strata vary from compact rock-shelf creases to
      // long hanging hemp. Requiring every supported parent to exceed
      // 25 scene units incorrectly rejects its real 20.67px short one.
      // Test descending topology, while the separate curvature gate
      // prevents the long members reverting to ruler-straight wires.
      expect(p[7]-p[1]).toBeGreaterThan(12);
      return p;
    });
    const bent=bones.filter(([x,,c1x,,c2x,,endx])=>{
      const dx=endx-x;
      return Math.abs(c1x-x-dx/3)+
        Math.abs(c2x-x-2*dx/3)>12;
    });
    expect(bent.length).toBeGreaterThanOrEqual(12);
    const marked=[...full.matchAll(
      /data-km-master-stroke="" data-km-master-stroke-style="long-hemp" data-km-master-stroke-root="([^"]+)" data-km-master-stroke-dry="(?:wet|dry)" data-km-master-stroke-bank="([0-4])" data-km-master-stroke-bank-station="([^"]+)"/g,
    )];
    expect(marked).toHaveLength(78);
    // Independent original master faces carry 34, 26 and 18 marks.
    // Read actual nested source groups so each stroke samples the
    // correct 0-4 bone in its own *positive* face.
    const faces=[...full.matchAll(/<g data-km-master-face=""[^>]*>/g)];
    expect(faces).toHaveLength(3);
    for(let i=0;i<faces.length;i++){
      const start=faces[i].index!;
      const end=i===2?full.length:faces[i+1].index!;
      const part=full.slice(start,end);
      const ownedBones=bones.slice(i*5,i*5+5);
      const strokes=[...part.matchAll(
        /data-km-master-stroke="" data-km-master-stroke-style="long-hemp" data-km-master-stroke-root="([^"]+)" data-km-master-stroke-dry="(?:wet|dry)" data-km-master-stroke-bank="([0-4])" data-km-master-stroke-bank-station="([^"]+)"/g,
      )];
      expect(strokes).toHaveLength([34,26,18][i]);
      for(const [,root,bank,station] of strokes){
        const [x,y,c1x,c1y,c2x,c2y,tx,ty]=ownedBones[Number(bank)];
        const t=Number(station),q=1-t;
        const actual=root.split(",").map(Number);
        const expected=[
          q*q*q*x+3*q*q*t*c1x+3*q*t*t*c2x+t*t*t*tx,
          q*q*q*y+3*q*q*t*c1y+3*q*t*t*c2y+t*t*t*ty,
        ];
        expect(Math.hypot(actual[0]-expected[0],
          actual[1]-expected[1])).toBeLessThan(.055);
      }
    }
    expect(paint("fuchun")).toBe(full);
    expect(paint("fuchun",77)).not.toBe(full);
    expect(paint("fuchun",71,0)).not.toContain(
      'data-km-master-stroke-style="long-hemp"');
    expect(paint("early-spring")).not.toContain(
      'data-km-master-stratum-centerline=');
  });

  it("paints three connected Fuchun rounded mountain underbacks with real rooted dry hemp",()=>{
    const make=(school:"fuchun"|"early-spring",detail=1,seed=71,mist=.35)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,detail,seed,mist},
      }));
    const full=make("fuchun");
    const hills=[...full.matchAll(
      /data-km-rock-hero-hill-wash="" data-km-rock-hero-hill-wash-root="([^"]+)" data-km-rock-hero-hill-wash-side="(-?1)" data-km-rock-hero-hill-wash-arc="([^"]+)" d="([^"]+)" fill="url\(#([^"]+)\)"/g,
    )];
    expect(hills).toHaveLength(3);
    expect(hills.map(m=>Number(m[2]))).toEqual([-1,1,-1]);
    const roots=hills.map(m=>m[1].split(",").map(Number));
    expect(roots.every(p=>p.length===2&&p.every(Number.isFinite))).toBe(true);
    expect(Math.max(...roots.map(p=>p[0]))-Math.min(...roots.map(p=>p[0])))
      .toBeGreaterThan(150);
    for(const [,root,,arc,d,gradient] of hills){
      expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
      expect((d.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(3);
      expect(d.endsWith(" Z")).toBe(true);
      expect(arc.startsWith("M"+root.replace(","," "))).toBe(true);
      expect(arc.match(/ C/g)).toHaveLength(1);
      expect(full).toContain('id="'+gradient+'"');
    }
    const marks=[...full.matchAll(
      /data-km-rock-hero-hill-fibre="" data-km-rock-hero-hill-fibre-root="([^"]+)" data-km-rock-hero-hill-fibre-parent="([012])" data-km-rock-hero-hill-fibre-station="([^"]+)" d="([^"]+)"/g,
    )];
    expect(marks).toHaveLength(12);
    expect(marks.map(m=>Number(m[2])).filter(i=>i===0)).toHaveLength(5);
    expect(marks.map(m=>Number(m[2])).filter(i=>i===1)).toHaveLength(4);
    expect(marks.map(m=>Number(m[2])).filter(i=>i===2)).toHaveLength(3);
    for(const [,root,parent,t,d] of marks){
      const n=(hills[Number(parent)][3].match(/-?\d+(?:\.\d+)?/g)??[])
        .map(Number);
      expect(n).toHaveLength(8); // real parent cubic brush centerline
      const q=1-Number(t),tt=Number(t);
      const x=q*q*q*n[0]+3*q*q*tt*n[2]+3*q*tt*tt*n[4]+tt*tt*tt*n[6];
      const y=q*q*q*n[1]+3*q*q*tt*n[3]+3*q*tt*tt*n[5]+tt*tt*tt*n[7];
      const p=root.split(",").map(Number);
      expect(Math.hypot(p[0]-x,p[1]-y)).toBeLessThan(.055);
      expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
      expect(d.endsWith(" Z")).toBe(true);
    }
    expect(make("fuchun")).toBe(full);
    expect(make("fuchun",0)).not.toContain('data-km-rock-hero-hill-wash=""');
    expect(make("early-spring")).not.toContain('data-km-rock-hero-hill-wash=""');
    expect(make("fuchun",1,73)).not.toBe(full);
    // Opacity can respond to atmosphere without changing topology.
    expect(make("fuchun",1,71,.9).match(/data-km-rock-hero-hill-wash-root="([^"]+)"/g))
      .toEqual(full.match(/data-km-rock-hero-hill-wash-root="([^"]+)"/g));
  });

  it("anchors all five Fuchun crooked old-pine trunks, bark and 20 boughs to one cubic anatomy",()=>{
    const paint=(school:"fuchun"|"early-spring",frame=145,seed=71)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:school,seed,detail:1},
      }));
    const html=paint("fuchun");
    const trees=[...html.matchAll(
      /data-km-cliff-pine="" data-km-cliff-pine-root="([^"]+)" data-km-cliff-pine-crest="[^"]+" data-km-cliff-pine-height="([^"]+)" data-km-cliff-pine-centerline="([^"]+)"/g,
    )];
    expect(trees).toHaveLength(5);
    const sites=trees.map(m=>m[1].split(",").map(Number));
    const xSites=sites.map(p=>p[0]);
    const gaps=xSites.slice(1).map((x,j)=>x-xSites[j]);
    // NPM Fuchun trees are irregular, cliff-rooted groups rather than
    // a single five-antenna crest cluster. Preserve compact pairs AND
    // genuinely vacant paper/stone passages between them.
    expect(xSites[4]-xSites[0]).toBeGreaterThan(160);
    expect(gaps.filter(dx=>dx<40)).toHaveLength(2);
    expect(gaps.filter(dx=>dx>50)).toHaveLength(2);
    expect(trees.map(m=>Number(m[2]))).toEqual([31,48,70,89,32]);
    const branches=[...html.matchAll(
      /data-km-cliff-pine-bough="" data-km-cliff-pine-bough-root="([^"]+)" data-km-cliff-pine-bough-station="([^"]+)"/g,
    )];
    expect(branches).toHaveLength(20);
    const bark=[...html.matchAll(
      /data-km-cliff-pine-bark="" d="([^"]+)"/g,
    )];
    expect(bark).toHaveLength(5);
    let bending=0;
    for(let i=0;i<5;i++){
      const root=trees[i][1].split(",").map(Number);
      const coords=(trees[i][3].match(/-?\d+(?:\.\d+)?/g)??[])
        .map(Number);
      expect(coords).toHaveLength(8);
      const [x,y,c1x,c1y,c2x,c2y,tipx,tipy]=coords;
      expect(Math.abs(x-root[0])).toBeLessThan(.01);
      expect(Math.abs(y-root[1])).toBeLessThan(.01);
      expect(Math.abs(y-tipy-Number(trees[i][2]))).toBeLessThan(.01);
      expect(c1y).toBeLessThan(y);
      expect(c2y).toBeLessThan(c1y);
      expect(tipy).toBeLessThan(c2y);
      // A bent trunk has two independently selected tangent directions,
      // never the old single-control quadratic pretending to be crooked.
      const firstLean=c1x-x,secondLean=c2x-c1x;
      if(firstLean*secondLean<0)bending++;
      const point=(t:number)=>{
        const u=1-t;
        return [
          u*u*u*x+3*u*u*t*c1x+3*u*t*t*c2x+t*t*t*tipx,
          u*u*u*y+3*u*u*t*c1y+3*u*t*t*c2y+t*t*t*tipy,
        ];
      };
      for(let j=0;j<4;j++){
        const branch=branches[i*4+j];
        const station=Number(branch[2]);
        const actual=branch[1].split(",").map(Number);
        const expected=point(station);
        expect(Math.hypot(actual[0]-expected[0],
          actual[1]-expected[1])).toBeLessThan(.055);
      }
      const barkRoot=(bark[i][1].match(/^M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/)??[])
        .slice(1).map(Number);
      expect(bark[i][1]).toContain(" C");
      expect(Math.hypot(barkRoot[0]-point(.13)[0],
        barkRoot[1]-point(.13)[1])).toBeLessThan(.055);
    }
    expect(bending).toBeGreaterThanOrEqual(3);
    expect(paint("fuchun")).toEqual(html);
    expect(paint("fuchun",0)).toContain('data-km-cliff-pine-centerline=');
    expect(paint("fuchun",299,87)).not.toEqual(html);
    expect(paint("early-spring")).not.toContain('data-km-cliff-pine-centerline=');
  });


  it("gives the Fuchun grove 20 intentionally unequal supporting branch architectures without removing fine ink",()=>{
    const draw=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,seed,detail},
      }));
    const full=draw("fuchun");
    const arms=[...full.matchAll(
      /data-km-cliff-pine-bough="" data-km-cliff-pine-bough-root="([^"]+)" data-km-cliff-pine-bough-station="([^"]+)" data-km-cliff-pine-bough-centerline="([^"]+)" data-km-cliff-pine-arm-reach="([^"]+)" data-km-cliff-pine-arm-arch="([^"]+)"/g,
    )];
    expect(arms).toHaveLength(20);
    const reaches=arms.map(m=>Number(m[4]));
    const arches=arms.map(m=>Number(m[5]));
    expect(reaches.every(Number.isFinite)).toBe(true);
    expect(reaches.filter(n=>n>40).length).toBeGreaterThanOrEqual(4);
    expect(reaches.filter(n=>n<27).length).toBeGreaterThanOrEqual(6);
    expect(Math.max(...reaches)-Math.min(...reaches)).toBeGreaterThan(35);
    expect(new Set(reaches.map(n=>Math.round(n))).size).toBeGreaterThan(14);
    expect(arches.filter(n=>n<0).length).toBeGreaterThanOrEqual(3);
    expect(arches.filter(n=>n>10).length).toBeGreaterThanOrEqual(6);
    expect(new Set(arches).size).toBeGreaterThan(8);
    arms.forEach(([,root,station,d,reach],k)=>{
      const points=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      expect(points).toHaveLength(6);
      const xy=root.split(",").map(Number);
      expect(Math.hypot(points[0]-xy[0],points[1]-xy[1]))
        .toBeLessThan(.01);
      const dx=Math.abs(points[4]-points[0]);
      expect(Math.abs(dx-Number(reach))).toBeLessThan(.02);
      expect(Number(station)).toBeGreaterThan(.17);
      expect(Number(station)).toBeLessThan(.95);
      if(k<4)expect(dx).toBeLessThan(37);
    });
    expect((full.match(/data-km-cliff-pine-bough-bone=""/g)??[])).toHaveLength(20);
    expect((full.match(/data-km-cliff-pine-rootlet=""/g)??[])).toHaveLength(15);
    expect((full.match(/data-km-cliff-pine-graft=""/g)??[])).toHaveLength(60);
    expect((full.match(/data-km-cliff-pine-ink-island=""/g)??[])).toHaveLength(40);
    expect((full.match(/data-km-cliff-pine-needle=""/g)??[])).toHaveLength(310);
    expect(draw("fuchun")).toBe(full);
    expect(draw("fuchun",87)).not.toBe(full);
    expect(draw("fuchun",71,0)).not.toContain("data-km-cliff-pine-arm-reach");
    expect(draw("early-spring")).not.toContain("data-km-cliff-pine-arm-reach");
  });

  it("Fuchun old-pine needles include hooked and lateral flicks, not 310 uniformly upward comb teeth",()=>{
    const paint=(school:"fuchun"|"early-spring",seed=71)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:school,seed,detail:1},
      }));
    const getFlicks=(school:"fuchun"|"early-spring")=>{
      const html=paint(school);
      const needles=[...html.matchAll(
        /data-km-cliff-pine-needle="" data-km-cliff-pine-needle-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(needles).toHaveLength(310);
      return needles.map(([,root,path])=>{
        const origin=root.split(",").map(Number);
        const curve=path.match(
          /^M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Q(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/,
        );
        expect(curve).not.toBeNull();
        expect(Math.abs(Number(curve![1])-origin[0])).toBeLessThan(.01);
        expect(Math.abs(Number(curve![2])-origin[1])).toBeLessThan(.01);
        const dy=Number(curve![6])-origin[1];
        expect(Number.isFinite(dy)).toBe(true);
        return dy;
      });
    };
    const fuchun=getFlicks("fuchun");
    const upward=fuchun.filter(dy=>dy< -2.5).length;
    const lateral=fuchun.filter(dy=>Math.abs(dy)<=1.6).length;
    const hooked=fuchun.filter(dy=>dy>2).length;
    expect(upward).toBeGreaterThan(95);
    expect(lateral).toBeGreaterThan(40);
    expect(hooked).toBeGreaterThan(55);
    // Another historical school retains its original independently
    // designed needle flow rather than inheriting the Fuchun vocabulary.
    expect(getFlicks("early-spring").filter(dy=>dy>2)).toHaveLength(0);
    expect(paint("fuchun",73)).not.toBe(paint("fuchun"));
  });

  it("builds non-stamped wet Fuchun pine ink bunches rooted on the live branch centerline",()=>{
    const paint=(school:"fuchun"|"early-spring",detail=1,seed=71)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,detail,seed},
      }));
    const full=paint("fuchun");
    const boughs=[...full.matchAll(
      /data-km-cliff-pine-bough="" data-km-cliff-pine-bough-root="([^"]+)" data-km-cliff-pine-bough-station="([^"]+)" data-km-cliff-pine-bough-centerline="([^"]+)"/g,
    )];
    expect(boughs).toHaveLength(20);
    const clusters=[...full.matchAll(
      /data-km-cliff-pine-wet-cluster="" data-km-cliff-pine-wet-cluster-root="([^"]+)" data-km-cliff-pine-wet-cluster-station="([^"]+)" data-km-cliff-pine-wet-cluster-bough="(\d+)" data-km-cliff-pine-wet-cluster-weight="([^"]+)" d="([^"]+)"/g,
    )];
    expect(clusters).toHaveLength(119); // 5..7 unequal per real bough
    const counts=Array.from({length:20},()=>0);
    const weights:number[]=[];
    for(const [,root,station,boughId,width,d] of clusters){
      const i=Number(boughId),t=Number(station);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(20);
      counts[i]++;
      const coords=(boughs[i][3].match(/-?\d+(?:\.\d+)?/g)??[])
        .map(Number);
      expect(coords).toHaveLength(6);
      const [x,y,cx,cy,tx,ty]=coords;
      const q=1-t;
      const expected=[q*q*x+2*q*t*cx+t*t*tx,
        q*q*y+2*q*t*cy+t*t*ty];
      const actual=root.split(",").map(Number);
      expect(Math.hypot(actual[0]-expected[0],
        actual[1]-expected[1])).toBeLessThan(.06);
      expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
      expect((d.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(35);
      expect(d.endsWith(" Z")).toBe(true);
      weights.push(Number(width));
    }
    expect(new Set(counts)).toEqual(new Set([5,6,7]));
    expect(counts.every(n=>n>=5&&n<=7)).toBe(true);
    expect(Math.max(...weights)-Math.min(...weights)).toBeGreaterThan(1.3);
    expect(new Set(clusters.map(m=>m[5])).size).toBe(119);
    expect(paint("fuchun")).toBe(full);
    expect(paint("fuchun",1,97)).not.toBe(full);
    expect(paint("fuchun",0)).not.toContain('data-km-cliff-pine-wet-cluster=');
    expect(paint("early-spring")).not.toContain('data-km-cliff-pine-wet-cluster=');
  });

  it("gives Huang's old pine crowns asymmetric drooping arms and real filled value depth",()=>{
    const html=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls:{...DEFAULT_SHANSHUI,
        scene:"mountain-trail",inkSchool:"fuchun",seed:71,detail:1},
    }));
    const boughs=[...html.matchAll(
      /data-km-cliff-pine-bough-centerline="([^"]+)"/g,
    )].map(m=>(m[1].match(/-?\d+(?:\.\d+)?/g)??[]).map(Number));
    expect(boughs).toHaveLength(20);
    expect(boughs.every(n=>n.length===6&&n.every(Number.isFinite))).toBe(true);
    const drops=boughs.map(p=>p[5]-p[1]);
    expect(drops.filter(d=>d>2).length).toBeGreaterThanOrEqual(6);
    expect(drops.filter(d=>d< -4).length).toBeGreaterThanOrEqual(7);
    const alternating=Array.from({length:5},(_,i)=>{
      const s=boughs.slice(i*4,i*4+4).map(p=>
        Math.sign(p[4]-p[0]));
      return s.every((v,j)=>j===0||v!==s[j-1]);
    }).filter(Boolean).length;
    expect(alternating).toBeLessThan(3);
    const islandRoots=[...html.matchAll(
      /data-km-cliff-pine-ink-island="" data-km-cliff-pine-ink-island-root="([^"]+)"/g,
    )].map(m=>Number(m[1].split(",")[1]));
    const canopyPaths=[...html.matchAll(
      /data-km-cliff-pine-ink-canopy="" d="([^"]+)"/g,
    )].map(m=>m[1]);
    expect(islandRoots).toHaveLength(40);
    expect(canopyPaths).toHaveLength(40);
    const lifts=canopyPaths.map((d,i)=>{
      const ns=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      expect(ns.length%2).toBe(0);
      return islandRoots[i]-Math.min(...ns.filter((_,j)=>j%2===1));
    });
    // Actual v48 browser crop rejected large FLAT-TOPPED opaque
    // blocks. Peak size alone rewarded geometric paper stickers,
    // not Huang's asymmetric tapered pine tufts. Require sufficient
    // loaded-value depth AND lifted tips with true arched silhouettes.
    expect(lifts.filter(h=>h>6).length).toBeGreaterThan(24);
    const lobes=[...html.matchAll(
      /data-km-cliff-pine-fan-lobes="([6-8])"/g,
    )].map(m=>Number(m[1]));
    expect(lobes).toHaveLength(40);
    let peaked=0;
    for(let i=0;i<40;i++){
      const upper=canopyPaths[i].split(" C")[0];
      const q=[...upper.matchAll(
        / Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/g,
      )];
      expect(q).toHaveLength(lobes[i]+1);
      const heights=q.slice(0,lobes[i]).map(m=>
        islandRoots[i]-Number(m[4]));
      const edge=(heights[0]+heights[heights.length-1])/2;
      const center=Math.max(...heights.slice(1,-1));
      if(center>edge*1.5&&center-edge>1.1)peaked++;
    }
    expect(peaked).toBeGreaterThanOrEqual(27);
  });

  it("breaks former symmetric Fuchun pine crowns into separate parent-rooted wet load crests",()=>{
    const render=(seed:number)=>renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls:{...DEFAULT_SHANSHUI,
        scene:"mountain-trail",inkSchool:"fuchun",seed,detail:1},
    }));
    for(const seed of [71,97]){
      const html=render(seed);
      const roots=[...html.matchAll(
        /data-km-cliff-pine-ink-island="" data-km-cliff-pine-ink-island-root="([^"]+)"/g,
      )].map(m=>Number(m[1].split(",")[1]));
      const lobes=[...html.matchAll(
        /data-km-cliff-pine-fan-lobes="([6-8])"/g,
      )].map(m=>Number(m[1]));
      const fans=[...html.matchAll(
        /data-km-cliff-pine-ink-canopy="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(roots).toHaveLength(40);
      expect(lobes).toHaveLength(40);
      expect(fans).toHaveLength(40);
      let independentWetCrests=0;
      for(let i=0;i<fans.length;i++){
        const upper=fans[i].split(" C")[0];
        const q=[...upper.matchAll(
          / Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/g,
        )];
        expect(q).toHaveLength(lobes[i]+1);
        const heights=q.slice(0,lobes[i]).map(m=>
          roots[i]-Number(m[4]));
        // This rejects the earlier global sine umbrella: its crest
        // rose monotonically and declined monotonically at every seed.
        // A physically separate mid-bough dry lift now divides at least
        // 15 of 40 ORIGINAL rooted fan silhouettes into two wet loads.
        const hasInkLift=heights.some((height,k)=>
          k>0&&k<heights.length-1&&
          height<heights[k-1]-.4&&height<heights[k+1]-.4);
        if(hasInkLift)independentWetCrests++;
        expect(Math.max(...heights)).toBeGreaterThan(4);
      }
      expect(independentWetCrests).toBeGreaterThanOrEqual(15);
      // Preserve the actual rich source, never flatten other layers.
      expect((html.match(/data-km-cliff-pine-connected-canopy=""/g)??[]))
        .toHaveLength(20);
      expect((html.match(/data-km-cliff-pine-needle=""/g)??[]))
        .toHaveLength(310);
      expect((html.match(/data-km-cliff-pine-canopy-paper-channels="2"/g)??[]))
        .toHaveLength(40);
      expect(render(seed)).toBe(html);
    }
  });

  it("keeps 60 source-anchored Fuchun pine grafts under 40 four-cubic ink crowns",()=>{
    const draw=(school:"fuchun"|"early-spring",seed:number,detail:number)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,seed,detail},
      }));
    const full=draw("fuchun",71,1);
    const grafts=[...full.matchAll(/data-km-cliff-pine-graft="" data-km-cliff-pine-graft-root="([^"]+)" data-km-cliff-pine-graft-station="([^"]+)" data-km-cliff-pine-graft-bough="(\d+)" data-km-cliff-pine-graft-hand="(-?1)" d="([^"]+)"/g)];
    expect(grafts).toHaveLength(60);
    expect(new Set(grafts.map(m=>m[5])).size).toBe(60);
    for(let i=0;i<20;i++)expect(grafts.filter(m=>Number(m[3])===i)
      .map(m=>Number(m[2]))).toEqual([.56,.74,.92]);
    for(const [,root,,group,hand,d] of grafts){
      expect(Number(group)).toBeGreaterThanOrEqual(0);
      expect(Math.abs(Number(hand))).toBe(1);
      expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
      expect((d.match(/ C/g)??[]).length).toBeGreaterThan(20);
    }
    const canopies=[...full.matchAll(/data-km-cliff-pine-ink-canopy="" d="([^"]+)"/g)];
    expect(canopies).toHaveLength(40);
    expect(canopies.every(m=>(m[1].match(/ C/g)??[]).length===4)).toBe(true);
    expect((full.match(/data-km-cliff-pine-needle=""/g)??[])).toHaveLength(310);
    expect((full.match(/data-km-cliff-pine-pad=""/g)??[])).toHaveLength(60);
    expect(draw("fuchun",71,1)).toBe(full);
    expect(draw("fuchun",87,1)).not.toBe(full);
    expect(draw("fuchun",71,0)).not.toContain("data-km-cliff-pine-graft");
    expect(draw("early-spring",71,1)).not.toContain("data-km-cliff-pine-graft");
  });

  it("retains all pine stroke geometry while cutting two true Fuchun flying-white channels in each fan",()=>{
    const draw=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:school,seed,detail},
      }));
    const full=draw("fuchun");
    const canopies=[...full.matchAll(
      /data-km-cliff-pine-ink-canopy="" d="([^"]+)" data-km-cliff-pine-canopy-paper-channels="(\d+)" fill-rule="([^"]+)"/g,
    )];
    expect(canopies).toHaveLength(40);
    const paperShapes=new Set<string>();
    for(const [,d,holes,winding] of canopies){
      expect(holes).toBe("2");
      expect(winding).toBe("evenodd");
      expect((d.match(/ M/g)??[])).toHaveLength(2);
      expect((d.match(/ Z/g)??[])).toHaveLength(3);
      expect((d.match(/ C/g)??[])).toHaveLength(4);
      expect(d.startsWith("M")).toBe(true);
      expect(d.endsWith(" Z")).toBe(true);
      expect(d.split(" Z ").slice(1)).toHaveLength(2);
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
      paperShapes.add(d);
    }
    expect(paperShapes.size).toBe(40);
    expect((full.match(/data-km-cliff-pine-graft=""/g)??[])).toHaveLength(60);
    expect((full.match(/data-km-cliff-pine-pad=""/g)??[])).toHaveLength(60);
    expect((full.match(/data-km-cliff-pine-needle=""/g)??[])).toHaveLength(310);
    expect((full.match(/data-km-cliff-pine-wet-cluster=""/g)??[])).toHaveLength(119);
    expect(draw("fuchun")).toBe(full);
    expect(draw("fuchun",97)).not.toBe(full);
    expect(draw("fuchun",71,0)).not.toContain('data-km-cliff-pine-ink-canopy');
    const guo=draw("early-spring");
    expect((guo.match(/data-km-cliff-pine-ink-canopy=""/g)??[])).toHaveLength(40);
    expect(guo).not.toContain('data-km-cliff-pine-canopy-paper-channels="2"');
    expect(guo).not.toContain('fill-rule="evenodd"');
  });


  it("plants five Fuchun pine root systems on true trunk cubics and independent hillside contact ink",()=>{
    const render=(seed:number,school:"fuchun"|"early-spring",detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",seed,inkSchool:school,detail},
      }));
    const ink=render(71,"fuchun");
    const trees=[...ink.matchAll(
      /data-km-cliff-pine-centerline="(M[^"]+)"/g,
    )].map(m=>(m[1].match(/-?\d+(?:\.\d+)?/g)??[]).map(Number));
    expect(trees).toHaveLength(5);
    expect(trees.every(t=>t.length===8)).toBe(true);
    const rootlets=[...ink.matchAll(
      /data-km-cliff-pine-rootlet="" data-km-cliff-pine-rootlet-source="([^"]+)" data-km-cliff-pine-rootlet-end="([^"]+)" data-km-cliff-pine-rootlet-station="([^"]+)" data-km-cliff-pine-rootlet-hand="([^"]+)" d="([^"]+)"/g,
    )];
    expect(rootlets).toHaveLength(15);
    const sample=(curve:number[],t:number)=>{
      const u=1-t;
      return [u*u*u*curve[0]+3*u*u*t*curve[2]+3*u*t*t*curve[4]+t*t*t*curve[6],
        u*u*u*curve[1]+3*u*u*t*curve[3]+3*u*t*t*curve[5]+t*t*t*curve[7]];
    };
    rootlets.forEach(([,start,end,station,hand,d],index)=>{
      const t=Number(station);
      const root=start.split(",").map(Number),target=end.split(",").map(Number);
      expect([.012,.032,.071]).toContain(t);
      expect(Math.abs(Number(hand))).toBe(1);
      const expected=sample(trees[Math.floor(index/3)],t);
      expect(Math.hypot(root[0]-expected[0],root[1]-expected[1]))
        .toBeLessThan(.1);
      expect(Math.hypot(root[0]-target[0],root[1]-target[1]))
        .toBeGreaterThan(5);
      expect(d.startsWith("M"+start.replace(","," "))).toBe(true);
      expect((d.match(/ C/g)??[]).length).toBeGreaterThan(20);
    });
    expect(new Set(rootlets.map(m=>m[5])).size).toBe(15);
    const ground=[...ink.matchAll(
      /data-km-cliff-pine-ground-ink="" data-km-cliff-pine-ground-ink-root="([^"]+)" data-km-cliff-pine-ground-ink-hand="([^"]+)" data-km-cliff-pine-ground-ink-load="([^"]+)" d="([^"]+)"/g,
    )];
    expect(ground).toHaveLength(40);
    expect(ground.every(([,root,hand,load,d])=>
      Math.abs(Number(hand))===1&&Number(load)>.6&&
      d.startsWith("M"+root.replace(","," ")))).toBe(true);
    expect(new Set(ground.map(m=>m[4])).size).toBe(40);
    expect((ink.match(/data-km-cliff-pine-needle=""/g)??[])).toHaveLength(310);
    expect((ink.match(/data-km-cliff-pine-graft=""/g)??[])).toHaveLength(60);
    expect(render(71,"fuchun")).toBe(ink);
    expect(render(87,"fuchun")).not.toBe(ink);
    expect(render(71,"fuchun",0)).not.toContain("data-km-cliff-pine-rootlet");
    expect(render(71,"early-spring")).not.toContain("data-km-cliff-pine-ground-contact");
  });

  it("joins 20 Fuchun old pine ink crowns to original quadratic boughs without deleting any detail",()=>{
    const draw=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",seed,inkSchool:school,detail},
      }));
    const full=draw("fuchun");
    const boughs=[...full.matchAll(
      /data-km-cliff-pine-bough-centerline="(M[^"]+)"/g,
    )].map(m=>(m[1].match(/-?\d+(?:\.\d+)?/g)??[]).map(Number));
    const banks=[...full.matchAll(
      /data-km-cliff-pine-connected-canopy="" data-km-cliff-pine-connected-canopy-bough="(\d+)" data-km-cliff-pine-connected-canopy-root="([^"]+)" data-km-cliff-pine-connected-canopy-tip="([^"]+)" d="([^"]+)"/g,
    )];
    expect(boughs).toHaveLength(20);
    expect(banks).toHaveLength(20);
    const sample=(coords:number[],t:number)=>{
      const [x,y,cx,cy,tx,ty]=coords,u=1-t;
      return [u*u*x+2*u*t*cx+t*t*tx,
        u*u*y+2*u*t*cy+t*t*ty];
    };
    for(const [index,m] of banks.entries()){
      const [,slot,root,tip,d]=m;
      expect(Number(slot)).toBe(index);
      const rootCoords=root.split(",").map(Number);
      const tipCoords=tip.split(",").map(Number);
      const p=sample(boughs[index],.34);
      const q=sample(boughs[index],.985);
      expect(Math.hypot(rootCoords[0]-p[0],rootCoords[1]-p[1]))
        .toBeLessThan(.07);
      expect(Math.hypot(tipCoords[0]-q[0],tipCoords[1]-q[1]))
        .toBeLessThan(.07);
      expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
      expect((d.match(/ Q/g)??[])).toHaveLength(16);
      expect(d.endsWith(" Z")).toBe(true);
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
    }
    expect(new Set(banks.map(x=>x[4])).size).toBe(20);
    expect((full.match(/data-km-cliff-pine-ink-island=""/g)??[])).toHaveLength(40);
    expect((full.match(/data-km-cliff-pine-graft=""/g)??[])).toHaveLength(60);
    expect((full.match(/data-km-cliff-pine-pad=""/g)??[])).toHaveLength(60);
    expect((full.match(/data-km-cliff-pine-wet-cluster=""/g)??[])).toHaveLength(119);
    expect((full.match(/data-km-cliff-pine-needle=""/g)??[])).toHaveLength(310);
    expect(draw("fuchun")).toBe(full);
    expect(draw("fuchun",97)).not.toBe(full);
    expect(draw("fuchun",71,0)).not.toContain("data-km-cliff-pine-connected-canopy");
    expect(draw("early-spring")).not.toContain("data-km-cliff-pine-connected-canopy");
  });


  it("does not fill 80 original Fuchun flying-white channels with the 20 newly joined pine underwashes",()=>{
    const paint=(school:"fuchun"|"early-spring",seed=71,detail=1)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,
          scene:"mountain-trail",inkSchool:school,seed,detail},
      }));
    const ink=paint("fuchun");
    const masks=[...ink.matchAll(
      /<mask data-km-cliff-pine-bridge-paper-mask="" data-km-cliff-pine-bridge-paper-mask-bough="(\d+)" id="([^"]+)"[^>]+>/g,
    )];
    expect(masks).toHaveLength(20);
    expect(new Set(masks.map(m=>m[2])).size).toBe(20);
    // Native masks must stay close to each original living branch.
    // A full-canvas mask ×20 is an unacceptable 960x540 film cost.
    const boxes=[...ink.matchAll(
      /<mask data-km-cliff-pine-bridge-paper-mask=""[^>]+ x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g,
    )];
    expect(boxes).toHaveLength(20);
    for(const [,x,y,w,h] of boxes){
      expect([x,y,w,h].every(v=>Number.isFinite(Number(v)))).toBe(true);
      expect(Number(w)).toBeGreaterThan(72);
      expect(Number(w)).toBeLessThan(180);
      expect(Number(h)).toBeGreaterThan(60);
      expect(Number(h)).toBeLessThan(140);
      expect(Number(w)*Number(h)).toBeLessThan(21000);
    }
    expect(masks.map(m=>Number(m[1]))).toEqual(
      Array.from({length:20},(_,k)=>k));
    const cuts=[...ink.matchAll(
      /data-km-cliff-pine-bridge-paper-cut="" data-km-cliff-pine-bridge-paper-cut-fan="([01])" d="([^"]+)"/g,
    )];
    expect(cuts).toHaveLength(40);
    for(let j=0;j<40;j++){
      const d=cuts[j][2];
      expect(Number(cuts[j][1])).toBe(j%2);
      expect((d.match(/ M/g)??[])).toHaveLength(1);
      expect((d.match(/ Q/g)??[])).toHaveLength(4);
      expect((d.match(/ Z/g)??[])).toHaveLength(2);
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
    }
    const fans=[...ink.matchAll(
      /data-km-cliff-pine-ink-canopy="" d="([^"]+)" data-km-cliff-pine-canopy-paper-channels="2"/g,
    )];
    expect(fans).toHaveLength(40);
    // Every black lumen in the underpaint mask is EXACTLY the same
    // geometry as the original fan's two nested bristle paper gaps.
    cuts.forEach(([, ,d],index)=>{
      const fan=fans[index][1];
      expect(fan.endsWith(" "+d)).toBe(true);
    });
    const bridges=[...ink.matchAll(
      /data-km-cliff-pine-connected-canopy=""[^>]* mask="url\(#([^"]+)\)"/g,
    )];
    expect(bridges).toHaveLength(20);
    for(let i=0;i<20;i++)expect(bridges[i][1]).toBe(masks[i][2]);
    expect((ink.match(/data-km-cliff-pine-needle=""/g)??[])).toHaveLength(310);
    expect((ink.match(/data-km-cliff-pine-graft=""/g)??[])).toHaveLength(60);
    expect(paint("fuchun")).toBe(ink);
    expect(paint("fuchun",87)).not.toBe(ink);
    expect(paint("fuchun",71,0)).not.toContain("data-km-cliff-pine-bridge-paper-mask");
    expect(paint("early-spring")).not.toContain("data-km-cliff-pine-bridge-paper-mask");
  });

  it("renders willow boughs as closed tapering brush geometry with fine attached leaves",()=>{
    const html=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:125,controls:{...DEFAULT_SHANSHUI,scene:"river-scholar",detail:1},
    }));
    const boughs=[...html.matchAll(/data-km-willow-tapered-branch="" d="([^"]+)"/g)];
    expect(boughs.length).toBe(6);
    expect(boughs.every(x=>x[1].endsWith(" Z"))).toBe(true);
    expect((html.match(/data-km-willow-frond=""/g)??[]).length).toBe(39);
    expect((html.match(/data-km-willow-leaf=""/g)??[]).length)
      .toBeGreaterThan(150);
    const dry=(html.match(/data-km-willow-bark=""/g)??[]).length;
    expect(dry).toBeGreaterThanOrEqual(25);
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("paints willow as varied sparse curved ink strands rather than a repeated vertical lattice",()=>{
    const controls={...DEFAULT_SHANSHUI,scene:"river-scholar" as const,detail:1};
    const html=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls,
    }));
    const strands=[...html.matchAll(
      /data-km-willow-frond="" data-km-willow-frond-root="([^"]+)" data-km-willow-frond-tip="([^"]+)" data-km-willow-frond-drift="([^"]+)" data-km-willow-frond-leaves="(\d+)"/g,
    )];
    expect(strands).toHaveLength(39);
    const drifts=strands.map(x=>Number(x[3]));
    expect(drifts.every(Number.isFinite)).toBe(true);
    expect(drifts.some(x=>x>15)).toBe(true);
    expect(drifts.some(x=>x< -15)).toBe(true);
    expect(new Set(drifts.map(x=>x.toFixed(1))).size).toBeGreaterThan(26);
    expect(strands.filter(x=>Number(x[4])===0)).toHaveLength(5);
    expect(strands.every(x=>x[1].includes(",")&&x[2].includes(",")))
      .toBe(true);
    const ribbons=[...html.matchAll(/data-km-willow-pressure-strand="" d="([^"]+)"/g)];
    expect(ribbons).toHaveLength(39);
    expect(ribbons.every(x=>x[1].endsWith(" Z")&&
      (x[1].match(/ L/g)??[]).length>=20)).toBe(true);
    expect((html.match(/data-km-willow-dry-release=""/g)??[])).toHaveLength(10);
    const leafCount=strands.reduce((sum,x)=>sum+Number(x[4]),0);
    expect(leafCount).toBeGreaterThan(150);
    expect((html.match(/data-km-willow-leaf=""/g)??[])).toHaveLength(leafCount);
    expect(html).not.toMatch(/NaN|Infinity|undefined|--[0-9]/);
    expect(html).toBe(renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls,
    })));
    const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls:{...controls,detail:0},
    }));
    expect(sparse).not.toContain('data-km-willow-pressure-strand');
    expect((sparse.match(/data-km-willow-tapered-branch=""/g)??[])).toHaveLength(6);
  });

  it("finesses old-pine bough taper and connected foliage ink masses",()=>{
    const html=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:125,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",detail:1},
    }));
    const boughs=[...html.matchAll(/data-km-pine-bough-shape="" d="([^"]+)"/g)];
    const foliage=(html.match(/data-km-pine-foliage-wash=""/g)??[]).length;
    const sprays=(html.match(/data-km-pine-spray=""/g)??[]).length;
    const rosettes=[...html.matchAll(/data-km-pine-needles="(\d+)"/g)]
      .map(match=>Number(match[1]));
    expect(boughs.length).toBeGreaterThanOrEqual(8);
    expect(boughs.every(match=>match[1].endsWith(" Z"))).toBe(true);
    expect(foliage).toBeGreaterThanOrEqual(sprays*2);
    expect(rosettes.length).toBeGreaterThan(80);
    expect(rosettes.every(count=>count>=16&&count<=27)).toBe(true);
    expect(new Set(rosettes).size).toBeGreaterThan(5);
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("breaks repeated pine shelf silhouettes with source-led bough crooks and fan pitch",()=>{
    const controls={...DEFAULT_SHANSHUI,scene:"mountain-trail" as const,detail:1};
    const markup=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:125,controls,
    }));
    const turns=[...markup.matchAll(/data-km-pine-fan-turn="([^"]+)"/g)]
      .map(m=>Number(m[1]));
    expect(turns.length).toBeGreaterThan(80);
    expect(turns.every(Number.isFinite)).toBe(true);
    expect(new Set(turns).size).toBeGreaterThan(50);
    expect(Math.max(...turns)-Math.min(...turns)).toBeGreaterThan(.95);
    expect(Math.min(...turns)).toBeLessThan(-.3);
    expect(Math.max(...turns)).toBeGreaterThan(.3);
    const boughs=[...markup.matchAll(/data-km-pine-bough-shape="" d="([^"]+)"/g)];
    expect(boughs).toHaveLength(8);
    expect(new Set(boughs.map(m=>m[1])).size).toBe(8);
    expect(markup).toEqual(renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:125,controls,
    })));
    const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:125,controls:{...controls,detail:0},
    }));
    expect(sparse).not.toContain("data-km-pine-fan-turn");
  });

  it("grows each pine lateral from its parent cubic and fractures the old wood",()=>{
    for(const scene of ["mountain-trail","misty-hermit"] as const){
      const controls={...DEFAULT_SHANSHUI,scene,detail:1};
      const full=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls,
      }));
      const laterals=[...full.matchAll(
        /data-km-pine-lateral="" data-km-pine-lateral-root="([^"]+)" data-km-pine-lateral-parent-pt="([^"]+)" data-km-pine-lateral-side="(-?1)"/g,
      )];
      expect(laterals).toHaveLength(8*3);
      expect(laterals.every(m=>m[1]===m[2])).toBe(true);
      expect(new Set(laterals.map(m=>m[1])).size).toBeGreaterThan(20);
      expect(new Set(laterals.map(m=>m[3]))).toEqual(new Set(["-1","1"]));
      const bones=[...full.matchAll(/data-km-pine-lateral-bone="" d="([^"]+)"/g)];
      expect(bones).toHaveLength(24);
      expect(bones.every(m=>m[1].includes(" Q")&&m[1].endsWith(" Z"))).toBe(true);
      expect((full.match(/data-km-pine-lateral-lift=""/g)??[]).length).toBe(24);
      const crotches=[...full.matchAll(/data-km-pine-lateral-crotch="" d="([^"]+)"/g)];
      expect(crotches).toHaveLength(24);
      expect(crotches.every(m=>!m[1].includes("--")&&m[1].includes(" q")))
        .toBe(true);
      expect((full.match(/data-km-pine-bough-bark-root="[^"]+"/g)??[]).length).toBe(72);
      expect((full.match(/data-km-pine-bark-fissure=""/g)??[]).length)
        .toBeGreaterThanOrEqual(12);
      expect((full.match(/data-km-pine-bark=""/g)??[])).toHaveLength(42);
      expect(full).not.toMatch(/NaN|Infinity|undefined/);
      expect(renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls,
      }))).toBe(full);

      const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:125,controls:{...controls,detail:0},
      }));
      expect(sparse).not.toContain('data-km-pine-bough-bark=""');
      expect(sparse).not.toContain('data-km-pine-fan-turn');
      expect(sparse).not.toContain('data-km-pine-bark-fissure');
    }
  });

  it("renders authored non-collinear pine elbows and anchors all fork roots to that skeleton",()=>{
    for(const scene of ["mountain-trail","misty-hermit"] as const){
      const controls={...DEFAULT_SHANSHUI,scene,seed:71,detail:1};
      const full=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:142,controls,
      }));
      const primary=[...full.matchAll(
        /data-km-pine-bough="" data-km-pine-bough-root="([^"]+)" data-km-pine-bough-tip="([^"]+)"/g,
      )];
      const elbows=[...full.matchAll(/data-km-pine-elbow="([^"]+)"/g)]
        .map(m=>m[1].split(" ").map(Number));
      expect(primary).toHaveLength(8);
      expect(elbows).toHaveLength(16);
      const deviations=primary.flatMap((p,i)=>{
        const [rx,ry]=p[1].split(",").map(Number);
        const [tx,ty]=p[2].split(",").map(Number);
        const dx=tx-rx,dy=ty-ry;
        return elbows.slice(i*2,i*2+2).map(([x,y])=>
          Math.abs(dx*(y-ry)-dy*(x-rx))/Math.hypot(dx,dy));
      });
      expect(deviations.filter(x=>x>9).length).toBeGreaterThanOrEqual(12);
      expect(new Set(deviations.map(x=>x.toFixed(1))).size).toBeGreaterThan(12);
      expect((full.match(/data-km-pine-bough-light=""/g)??[])).toHaveLength(8);
      const shapes=[...full.matchAll(/data-km-pine-bough-shape="" d="([^"]+)"/g)];
      expect(shapes).toHaveLength(8);
      // Smooth sampled normals form a continuous taper without the
      // sharp folded-cardboard joints of the first draft.
      expect((full.match(/data-km-pine-bough-stations="37"/g)??[]))
        .toHaveLength(8);
      for(const shape of shapes){
        expect((shape[1].match(/ L/g)??[]).length).toBeGreaterThanOrEqual(70);
        expect(shape[1].endsWith(" Z")).toBe(true);
        expect(shape[1]).not.toMatch(/NaN|Infinity|--[0-9]/);
      }
      expect((full.match(/data-km-pine-lateral-parent-pt="[^"]+"/g)??[]))
        .toHaveLength(24);
      expect(full).not.toMatch(/NaN|Infinity|undefined|--[0-9]/);
      expect(full).toBe(renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:142,controls,
      })));
      const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:142,controls:{...controls,detail:0},
      }));
      // Branch *shape* is structural and must remain when details fade;
      // all separately animated foliage and bough scratches are optional.
      expect((sparse.match(/data-km-pine-bough-shape=""/g)??[])).toHaveLength(8);
      expect(sparse).not.toContain('data-km-pine-fan-turn');
      expect(sparse).not.toContain('data-km-pine-bough-bark=""');
    }
  });

  it("constructs ridge-rooted geological brush planes, not floating repeated rain",()=>{
    for(const scene of SHANSHUI_SCENES){
      const controls={...DEFAULT_SHANSHUI,scene,detail:1};
      const markup=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:168,controls,
      }));
      const faces=[...markup.matchAll(
        /data-km-rock-ink-plane="" data-km-rock-plane-root="([^"]+)" data-km-rock-plane-crest="([^"]+)" data-km-rock-plane-style="([^"]+)"/g,
      )];
      expect(faces).toHaveLength(7+12+17);
      expect(new Set(faces.map(m=>m[1])).size).toBeGreaterThan(28);
      for(const [,root,crest] of faces){
        const [,y]=root.split(",").map(Number);
        const ridgeY=Number(crest);
        expect(Number.isFinite(y)&&Number.isFinite(ridgeY)).toBe(true);
        expect(y-ridgeY).toBeGreaterThanOrEqual(3.49);
        expect(y-ridgeY).toBeLessThanOrEqual(7.51);
      }
      expect(faces.some(m=>m[3]==="alum-head")).toBe(true);
      expect(faces.some(m=>m[3]==="hemp-fibre")).toBe(true);
      expect((markup.match(/data-km-rock-moss-pocket=""/g)??[]).length)
        .toBeGreaterThan(90);
      expect(markup).not.toMatch(/NaN|Infinity|undefined/);
      expect(renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:168,controls,
      }))).toBe(markup);
      const noDetail=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:168,controls:{...controls,detail:0},
      }));
      expect(noDetail).not.toContain("data-km-rock-ink-plane");
      expect(noDetail).not.toContain("data-km-rock-moss-pocket");
    }
  });

  it("varies rock texture into long, broken and lateral side-brush gestures",()=>{
    for(const scene of SHANSHUI_SCENES){
      const svg=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:168,controls:{...DEFAULT_SHANSHUI,scene,detail:1},
      }));
      const styles=[...svg.matchAll(/data-km-cunfa-style="([^"]+)"/g)]
        .map(match=>match[1]);
      const family=(name:string)=>styles.filter(x=>x===name).length;
      expect(family("long-hemp")).toBeGreaterThan(20);
      expect(family("short-hemp")).toBeGreaterThan(8);
      expect(family("side-axe")).toBeGreaterThan(0);
      expect(family("long-hemp")+family("short-hemp")+
        family("side-axe")).toBe(styles.length);
      expect((svg.match(/data-km-cunfa-dry-brush=""/g)??[]).length)
        .toBeGreaterThan(15);
      const xRoots=[...svg.matchAll(/data-km-cunfa-root-x="([^"]+)"/g)]
        .map(m=>Number(m[1]));
      expect(xRoots).toHaveLength(styles.length);
      expect(xRoots.every(Number.isFinite)).toBe(true);
      const bucketCounts=Array.from({length:10},(_,i)=>
        xRoots.filter(x=>x>=i*100&&x<(i+1)*100).length);
      expect(bucketCounts.filter(x=>x===0).length).toBeGreaterThan(0);
      expect(bucketCounts.filter(x=>x>0).length).toBeGreaterThan(4);
    }
  });

  it("draws ridge-rooted structural rock spines and lighter feathered pine ink",()=>{
    const rock=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",detail:1},
    }));
    const creases=[...rock.matchAll(/data-km-rock-spine="" data-km-rock-spine-root-y="([^"]+)" d="([^"]+)"/g)];
    expect(creases.every(x=>(x[2].match(/M/g)??[]).length>=3)).toBe(true);
    const paleMasses=(rock.match(/data-km-pine-foliage-wash="" d="[^"]+" fill="#59503d"/g)??[]).length;
    expect(paleMasses).toBe(0);
    expect(creases.length).toBeGreaterThan(9);
    expect(creases.length).toBeLessThan(34);
    expect(creases.every(x=>Number.isFinite(Number(x[1])))).toBe(true);
    const tufts=(rock.match(/data-km-pine-feather=""/g)??[]).length;
    expect(tufts).toBeGreaterThan(80);
    expect(rock).not.toMatch(/NaN|Infinity|undefined/);
    const bare=renderToStaticMarkup(createElement(InkShanshuiStage,{
      frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",detail:0},
    }));
    expect(bare).not.toContain('data-km-rock-spine');
    expect(bare).not.toContain('data-km-pine-feather');
  });

  it("keeps calligraphic bamboo stems tapered and leaves attached at any art detail",()=>{
    for(const scene of SHANSHUI_SCENES){
      const controls={...DEFAULT_SHANSHUI,scene,detail:1};
      const markup=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls,
      }));
      const stems=[...markup.matchAll(/data-km-shanshui-bamboo-stem="([0-2])"/g)];
      expect(stems.map(m=>m[1])).toEqual(["0","1","2"]);
      const leaves=[...markup.matchAll(/data-km-shanshui-bamboo-leaf="" d="([^"]+)"/g)]
        .map(m=>m[1]);
      expect(leaves.length).toBeGreaterThanOrEqual(90);
      for(const leaf of leaves){
        expect(leaf.endsWith(" Z")).toBe(true);
        expect(leaf).not.toMatch(/NaN|undefined|Infinity/);
      }
      const empty=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls:{...controls,detail:0},
      }));
      expect(empty).toContain('data-km-shanshui-bamboo-stem="0"');
      expect(empty).not.toContain('data-km-shanshui-bamboo-leaf');
      expect(empty).not.toContain('data-km-bamboo-pressure-twig');
    }
  });

  it("roots irregular bamboo brush fans at the same real painted culm joints",()=>{
    for(const scene of SHANSHUI_SCENES){
      const full=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls:{...DEFAULT_SHANSHUI,scene,detail:1},
      }));
      const roots=[...full.matchAll(/data-km-bamboo-branch-root="([^"]+)"/g)]
        .map(m=>m[1]);
      const budgets=[...full.matchAll(/data-km-bamboo-cluster-budget="([0-9]+)"/g)]
        .map(m=>Number(m[1]));
      expect(budgets).toHaveLength(21);
      const profiles=[budgets.slice(0,7),budgets.slice(7,14),budgets.slice(14,21)];
      expect(profiles.map(p=>p.reduce((a,b)=>a+b,0))).toEqual([34,34,34]);
      expect(new Set(profiles.map(p=>p.join(","))).size).toBe(3);
      expect(profiles.every(p=>p.some(b=>b===0)&&p.some(b=>b===10))).toBe(true);
      const nodes=[...full.matchAll(/data-km-bamboo-node="([^"]+)"/g)]
        .map(m=>m[1]);
      expect(roots).toHaveLength(21);
      expect(nodes).toHaveLength(21);
      expect(new Set(roots)).toEqual(new Set(nodes));
      // Source bare internodes are actually bare, not empty branch lines.
      expect((full.match(/data-km-bamboo-pressure-twig=""/g)??[]))
        .toHaveLength(18);
      // Nine major nodes support their own calligraphic seven-leaf brush
      // group. Each painted tip starts on a continuous rooted secondary
      // curve and exposes paper through its own stencil reserve.
      const heroGroups=[...full.matchAll(
        /data-km-bamboo-hero-spray="" data-km-bamboo-hero-parent="([^"]+)" data-km-bamboo-hero-plan="([^"]+)"/g,
      )];
      expect(heroGroups).toHaveLength(9);
      expect(heroGroups.every(([,root,n])=>
        root.split(",").every(x=>Number.isFinite(Number(x)))&&n==="7"))
        .toBe(true);
      const heroLeaves=[...full.matchAll(
        /data-km-bamboo-hero-leaf="" d="([^"]+)" data-km-bamboo-hero-root="([^"]+)" data-km-bamboo-hero-heading="([^"]+)" data-km-bamboo-hero-station="([^"]+)"/g,
      )];
      expect(heroLeaves).toHaveLength(63);
      expect(heroLeaves.every(([,d,root,heading,station])=>
        d.startsWith("M"+root.replace(","," "))&&
        d.includes(" C")&&d.endsWith(" Z")&&
        Number.isFinite(Number(heading))&&
        Number(station)>.12&&Number(station)<.96)).toBe(true);
      expect((full.match(/data-km-bamboo-hero-mask=""/g)??[]))
        .toHaveLength(63);
      expect((full.match(/data-km-bamboo-hero-bristle=""/g)??[]))
        .toHaveLength(126);
      expect((full.match(/data-km-bamboo-hero-twig=""/g)??[]))
        .toHaveLength(9);
      expect((full.match(/data-km-bamboo-dry-lift=""/g)??[]))
        .toHaveLength(39);
      // A real painted fan uses more than one curve/ink weight. It is
      // not a repeated identical triangular leaf clip-art template.
      const blades=[...full.matchAll(
        /data-km-shanshui-bamboo-leaf="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(blades).toHaveLength(102);
      expect(new Set(blades).size).toBeGreaterThan(100);
      expect(blades.every(d=>d.includes(" C")&&d.endsWith(" Z"))).toBe(true);
      // Brush-pressure station geometry replaces a two-C vector lozenge:
      // there should be many continuously loaded pressure transitions.
      expect(blades.every(d=>(d.match(/ C/g)??[]).length>=17)).toBe(true);
      // At high detail every loaded blade carries three short, *internal*
      // direction-following dry bristle marks, not detached paper speckles.
      const internal=[...full.matchAll(
        /data-km-bamboo-internal-bristle="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      const satellites=[...full.matchAll(
        /data-km-bamboo-satellite-bristle="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(internal).toHaveLength(blades.length*3);
      expect(satellites).toHaveLength(63*3);
      expect([...internal,...satellites].every(path=>
        path.startsWith("M")&&path.includes(" Q")&&
        !/NaN|undefined|Infinity/.test(path))).toBe(true);
      // Dry-brush hairs must remove pigment through local SVG luminance masks.
      // A pale overlay path was a false fei-bai simulation in earlier passes.
      const masks=[...full.matchAll(/<mask id="(kmbamboo[^"]+)" /g)]
        .map(m=>m[1]);
      expect(masks).toHaveLength(165); // 102 loaded + 63 satellites
      expect(new Set(masks).size).toBe(masks.length);
      const primaryPaint=[...full.matchAll(
        /data-km-shanshui-bamboo-leaf=""[^>]*fill="url\(#([^"]+)\)" mask="url\(#([^"]+)\)"/g,
      )];
      expect(primaryPaint).toHaveLength(102);
      const echoPaint=[...full.matchAll(
        /data-km-bamboo-satellite-leaf=""[^>]*fill="url\(#([^"]+)\)" mask="url\(#([^"]+)\)"/g,
      )];
      expect(echoPaint).toHaveLength(63);
      expect(primaryPaint.concat(echoPaint).every(([,gradient,mask])=>
        full.includes('id="'+gradient+'"')&&full.includes('id="'+mask+'"')))
        .toBe(true);
      expect(full).toContain('mask-type:luminance');
      expect(full).not.toMatch(/NaN|Infinity|undefined/);
      const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls:{...DEFAULT_SHANSHUI,scene,detail:.35},
      }));
      expect((sparse.match(/data-km-shanshui-bamboo-leaf=""/g)??[]))
        .toHaveLength(39);
      expect(sparse).not.toContain("data-km-bamboo-dry-lift");
      expect(sparse).not.toContain("data-km-bamboo-internal-bristle");
      expect(sparse).not.toContain("data-km-bamboo-satellite-bristle");
      expect(sparse).not.toContain("data-km-bamboo-hero-leaf");
      expect(sparse).not.toContain("data-km-bamboo-hero-twig");
      expect(sparse).not.toContain("<mask id=\"kmbamboo");
    }
  });

  it("grows bamboo secondary shoots from painted parent limbs and anchors every leaf",()=>{
    for(const scene of SHANSHUI_SCENES){
      const controls={...DEFAULT_SHANSHUI,scene,detail:1,seed:87};
      const draw=()=>renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls,
      }));
      const html=draw();
      expect(html).toBe(draw());
      const shoots=[...html.matchAll(
        /data-km-bamboo-secondary-shoot="" data-km-bamboo-secondary-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(shoots).toHaveLength(24); // selective source-led mass: eight shoots per culm
      for(const [,root,d] of shoots){
        const [x,y]=root.split(",").map(Number);
        const match=d.match(/^M(-?[\d.]+) (-?[\d.]+)/);
        expect(match).not.toBeNull();
        expect(Math.abs(Number(match![1])-x)).toBeLessThan(1);
        expect(Math.abs(Number(match![2])-y)).toBeLessThan(1);
        expect(d.endsWith(" Z")).toBe(true);
      }
      const leaves=[...html.matchAll(
        /data-km-shanshui-bamboo-leaf="" d="([^"]+)" data-km-bamboo-leaf-root="([^"]+)" data-km-bamboo-leaf-parent="([^"]+)"/g,
      )];
      expect(leaves).toHaveLength(102);
      expect(leaves.filter(m=>m[3]==="main")).toHaveLength(63);
      expect(leaves.filter(m=>m[3]==="spur-0")).toHaveLength(24);
      expect(leaves.filter(m=>m[3]==="spur-1")).toHaveLength(15);
      const headings=[...html.matchAll(
        /data-km-bamboo-leaf-heading="(-?[0-9.]+)"/g,
      )].map(m=>Number(m[1]));
      expect(headings).toHaveLength(102);
      const stations=[...html.matchAll(
        /data-km-bamboo-leaf-parent="([^"]+)" data-km-bamboo-leaf-heading="([^"]+)" data-km-bamboo-leaf-station="([^"]+)" data-km-bamboo-leaf-cluster="([^"]+)"/g,
      )];
      expect(stations).toHaveLength(102);
      expect(stations.every(m=>Number.isFinite(Number(m[3]))&&
        Number(m[3])>=.12&&Number(m[3])<=.96)).toBe(true);
      const byCluster=new Map<string,number[]>();
      for(const m of stations.filter(m=>m[1]==="main")){
        const positions=byCluster.get(m[4])??[];
        positions.push(Number(m[3]));
        byCluster.set(m[4],positions);
      }
      expect(byCluster.size).toBeGreaterThanOrEqual(12);
      for(const positions of byCluster.values())
        expect(Math.max(...positions)-Math.min(...positions)).toBeLessThan(.28);
      const satelliteStations=[...html.matchAll(
        /data-km-bamboo-satellite-station="([^"]+)" data-km-bamboo-satellite-cluster="([^"]+)"/g,
      )];
      expect(satelliteStations).toHaveLength(63);
      expect(satelliteStations.every(m=>Number.isFinite(Number(m[1]))&&
        Number(m[1])>=.12&&Number(m[1])<=.96)).toBe(true);
      // Genuine fan flow requires nonparallel ink gestures, not a lattice
      // of identically tilted triangles. This is a necessary, not artistic,
      // check: crop inspection remains the release authority.
      expect(new Set(headings).size).toBeGreaterThan(85);
      expect(Math.max(...headings)-Math.min(...headings)).toBeGreaterThan(3);
      const satellites=[...html.matchAll(
        /data-km-bamboo-satellite-leaf="" data-km-bamboo-satellite-root="([^"]+)" d="([^"]+)"/g,
      )];
      expect(satellites).toHaveLength(63);
      for(const [,root,d] of satellites){
        expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
        expect(d.endsWith(" Z")).toBe(true);
      }
      for(const [,d,root] of leaves){
        expect(d.startsWith("M"+root.replace(","," "))).toBe(true);
      }
      expect(html).not.toMatch(/NaN|Infinity|undefined/);
      const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls:{...controls,detail:.35},
      }));
      expect((sparse.match(/data-km-bamboo-secondary-shoot=""/g)??[]))
        .toHaveLength(9);
      const bare=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls:{...controls,detail:0},
      }));
      expect(bare).not.toContain("data-km-bamboo-secondary-shoot");
    }
  });

  it("makes foreground bamboo ink-load controls functional with instance-scoped paper absorption",()=>{
    const draw=(ink:number)=>renderToStaticMarkup(createElement(
      InkShanshuiStage,{frame:145,controls:{
        ...DEFAULT_SHANSHUI,scene:"misty-hermit",ink,detail:1,
      }},
    ));
    const weak=draw(0),strong=draw(1);
    expect(weak).toContain('data-km-bamboo-ink-load="0"');
    expect(strong).toContain('data-km-bamboo-ink-load="1"');
    expect(strong).toContain('feDisplacementMap');
    expect(strong).toContain('feTurbulence');
    expect(strong).not.toMatch(/NaN|Infinity|undefined/);
    const extract=(html:string)=>html.match(
      /data-km-shanshui-bamboo="" data-km-bamboo-ink-load="[01]" filter="url\(#([^"]+)\)"/,
    )?.[1];
    const id=extract(strong);
    expect(id).toBeTruthy();
    expect(strong).toContain('id="'+id+'"');
    expect(weak).not.toEqual(strong);
    // Multiple paintings in Storybook must not share a document-global SVG filter.
    const doubled=renderToStaticMarkup(createElement("div",{},
      createElement(InkShanshuiStage,{frame:145,controls:{
        ...DEFAULT_SHANSHUI,scene:"misty-hermit",ink:1,
      }}),
      createElement(InkShanshuiStage,{frame:145,controls:{
        ...DEFAULT_SHANSHUI,scene:"river-scholar",ink:.6,
      }}),
    ));
    const filterIds=[...doubled.matchAll(/<filter id="([^"]*brush)"/g)]
      .map(m=>m[1]);
    expect(filterIds).toHaveLength(2);
    expect(filterIds[0]).not.toBe(filterIds[1]);
  });

  it("attaches the reserve-paper cascade to a cliff lip and a receiving pool",()=>{
    const controls={...DEFAULT_SHANSHUI,scene:"mountain-trail" as const};
    const stage=(frame:number,detail=1)=>renderToStaticMarkup(createElement(
      InkShanshuiStage,{frame,controls:{...controls,detail}},
    ));
    const at145=stage(145);
    expect(at145).toContain('data-km-shanshui-waterfall=""');
    expect(at145).toContain('data-km-waterfall-shelf=""');
    expect(at145).toContain('data-km-waterfall-reserve=""');
    expect(at145).toContain('data-km-waterfall-pool=""');
    expect((at145.match(/data-km-waterfall-bank="(?:left|right)"/g)??[]))
      .toHaveLength(2);
    expect((at145.match(/data-km-waterfall-ribbon=""/g)??[]))
      .toHaveLength(3);
    expect((at145.match(/data-km-waterfall-impact=""/g)??[])).toHaveLength(9);
    expect(at145).toBe(stage(145));
    expect(stage(20)).not.toBe(at145);
    expect(stage(145,0)).not.toContain("data-km-waterfall-impact");
    for(const scene of ["misty-hermit","river-scholar"] as const){
      const other=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...controls,scene},
      }));
      expect(other).not.toContain("data-km-shanshui-waterfall");
    }
    expect(at145).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("samples the same final absolute frame for reduced-motion scenery and actor",()=>{
    for(const requestedFrame of [0,88,200,299]){
      const html=renderToStaticMarkup(createElement(InkShanshuiFilm,{
        frame:requestedFrame,controls:DEFAULT_SHANSHUI,reducedMotion:true,
      }));
      expect(html).toContain('data-km-shanshui-frame="'+requestedFrame+'"');
      expect(html).toContain('data-km-ink-character-frame="299"');
      expect(html).toMatch(/data-km-shanshui-world=""[^>]*><g opacity="1">/);
    }
    const animated=renderToStaticMarkup(createElement(InkShanshuiFilm,{
      frame:88,controls:DEFAULT_SHANSHUI,
    }));
    expect(animated).toContain('data-km-ink-character-frame="88"');
  });

  it("preserves articulated knee, hair, face and garment ancestry with warm original costume art",()=>{
    const scholar=makeShanshuiScholar();
    const issues=validateCharacterDefinition(scholar);
    expect(issues.filter(d=>d.severity==="error")).toEqual([]);
    for(const part of ["near-thigh","near-shin","far-thigh","far-shin","eyes","mouth",
      "hem-flow","robe-outer","sash-tail","hair-band","sleeve-paint"]){
      expect(scholar.parts.some(p=>p.id===part)).toBe(true);
    }
    expect(scholar.palette.wash).toBe("#bd9d7b");
    expect(scholar.assets["scholar-flowing-hem"]).toMatchObject({kind:"shapes"});
    expect(makeShanshuiScholar()).toEqual(scholar);
    expect(scholar.parts.find(p=>p.id==="hair-band")).toMatchObject({parent:"head"});
    expect(scholar.parts.find(p=>p.id==="hem-flow")).toMatchObject({parent:"body"});
  });
  it("points the reader at the scroll while walkers still gaze across the landscape",()=>{
    const reader=shanshuiScholarInstance("river-scholar");
    const page=reader.targets?.["scroll-page"];
    expect(page).toBeDefined();
    expect(Number.isFinite(page?.x)).toBe(true);
    expect(Number.isFinite(page?.y)).toBe(true);
    expect(page!.y).toBeGreaterThan(90);
    const gaze=shanshuiPerformanceCues("river-scholar").find(c=>c.kind==="gaze");
    expect(gaze?.target).toBe("scroll-page");
    for(const scene of ["mountain-trail","misty-hermit"] as const){
      expect(shanshuiScholarInstance(scene).targets?.["scroll-page"]).toBeUndefined();
      const sceneGaze=shanshuiPerformanceCues(scene).find(c=>c.kind==="gaze");
      expect(sceneGaze?.target).toBe("landscape");
    }
  });

  it("samples gait, cloth and trailing fabric from shared canonical constraints",()=>{
    const moving=shanshuiScholarInstance("mountain-trail",.85);
    const still=shanshuiScholarInstance("mountain-trail",0);
    expect(moving.instanceId).toBe("shanshui-scholar");
    const corrections=moving.corrections??{};
    for(const part of ["near-thigh","near-shin","far-thigh","far-shin",
      "hem-drape","near-cuff","far-cuff","hem-flow","sash-tail"]){
      expect(corrections[part]?.length).toBeGreaterThan(20);
    }
    const a=samplePoseCorrection(corrections,"near-thigh",65);
    const b=samplePoseCorrection(corrections,"near-thigh",85);
    expect(a).not.toEqual(b);
    expect(samplePoseCorrection(still.corrections??{},"hem-flow",75).rotation).toBe(0);
    expect(()=>shanshuiScholarInstance("mountain-trail",1.5)).toThrow(RangeError);
  });
  it("renders a real posed scholar between background and foreground with no artwork texture imports",()=>{
    const controls={...DEFAULT_SHANSHUI,scene:"mountain-trail" as const};
    const rich=renderToStaticMarkup(createElement(InkShanshuiFilm,{frame:178,controls}));
    expect(rich).toContain('data-km-shanshui-scene="mountain-trail"');
    expect(rich).toContain('data-km-ink-character-frame="178"');
    expect(rich).toContain('data-km-ink-character-part="body"');
    expect(rich).toContain('data-km-shanshui-foreground=""');
    expect(rich).toContain("foreignObject");
    expect(rich).not.toContain("<image ");
    expect(rich).not.toContain("data:image/");
    const empty=renderToStaticMarkup(createElement(InkShanshuiFilm,{
      frame:178,controls,showScholar:false,
    }));
    expect(empty).not.toContain("data-km-ink-character-frame");
    expect(empty.length).toBeLessThan(rich.length);
  });

  it("keeps nine original source-supported alum-head stone caps with all 27 attached microdeposits, independent of seed",()=>{
    const paint=(seed:number,school:"fuchun"|"early-spring"="fuchun")=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool:school,detail:1,ink:.9,mist:.35,seed},
      }));
    const a=paint(71),again=paint(71),b=paint(87);
    expect(a).toBe(again);
    const crowns=[...a.matchAll(/data-km-master-fuchun-alum-head="" data-km-master-fuchun-alum-head-root="([^"]+)" data-km-master-fuchun-alum-head-bank="(\d+)" data-km-master-fuchun-alum-head-station="([^"]+)"/g)];
    const volumes=[...a.matchAll(/data-km-master-fuchun-alum-head-volume="" d="([^"]+)" fill="url\(#([^"]+)\)"/g)];
    const lips=[...a.matchAll(/data-km-master-fuchun-alum-head-lip="" d="([^"]+)"/g)];
    expect(crowns).toHaveLength(9);
    expect(volumes).toHaveLength(9);
    expect(lips).toHaveLength(9);
    expect((a.match(/data-km-master-fuchun-alum-head-moss=""/g)??[])).toHaveLength(27);
    expect((a.match(/data-km-master-fuchun-alum-head-field=""/g)??[])).toHaveLength(3);
    for(let k=0;k<9;k++){
      const [x,y]=crowns[k][1].split(",").map(Number);
      expect([x,y].every(Number.isFinite)).toBe(true);
      expect(Number(crowns[k][2])).toBeLessThan(5);
      expect(Number(crowns[k][3])).toBeGreaterThan(.1);
      expect(Number(crowns[k][3])).toBeLessThan(.85);
      expect(volumes[k][1].startsWith("M"+crowns[k][1].replace(","," ")))
        .toBe(true);
      expect((volumes[k][1].match(/ C/g)??[])).toHaveLength(6);
      expect(volumes[k][1].endsWith(" Z")).toBe(true);
      expect(lips[k][1].startsWith("M")).toBe(true);
      expect(a.includes('id="'+volumes[k][2]+'"')).toBe(true);
    }
    expect((a.match(/data-km-master-fuchun-hillback=""/g)??[])).toHaveLength(6);
    expect((a.match(/data-km-master-fuchun-cross-shelf=""/g)??[])).toHaveLength(12);
    expect((a.match(/data-km-master-stroke-bank-station=/g)??[])).toHaveLength(78);
    expect((a.match(/data-km-master-stratum=""/g)??[])).toHaveLength(15);
    const crownsB=[...b.matchAll(/data-km-master-fuchun-alum-head-volume="" d="([^"]+)"/g)];
    expect(crownsB).toHaveLength(9);
    expect(crownsB.some((m,k)=>m[1]!==volumes[k][1])).toBe(true);
    expect(paint(71,"early-spring")).not.toContain("data-km-master-fuchun-alum-head");
    expect(a).not.toContain("<image ");
    expect(a).not.toContain("data:image/");
  });

  it("constructs a candidate Fuchun broad lower mountain from 19 original continuous stations without changing production or other schools",()=>{
    const paint=(school:"fuchun"|"travelers",seed:number,rounded?:boolean,
      frame=145,scene:"mountain-trail"|"river-scholar"="mountain-trail")=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame,controls:{...DEFAULT_SHANSHUI,scene,inkSchool:school,
          seed,detail:1,mist:.35,ink:.9,
          fuchunNearShoulderStudy:rounded},
      }));
    const ridge=(html:string,band:number)=>html.match(
      new RegExp('data-km-shanshui-ridge-contour="'+band+'" d="([^"]+)"'),
    )?.[1];
    const legacy=paint("fuchun",71),off=paint("fuchun",71,false),
      candidate=paint("fuchun",71,true),candidate87=paint("fuchun",87,true);
    expect(legacy).toBe(off);
    expect(candidate).toBe(paint("fuchun",71,true));
    expect(ridge(legacy,2)).not.toEqual(ridge(candidate,2));
    expect(ridge(candidate,2)).not.toEqual(ridge(candidate87,2));
    // The new native source contour contains 18 spans * 9 sub-stations,
    // not an ellipse, flat path or detached overlay in the lower sky.
    expect((ridge(candidate,2)?.match(/L /g)??[])).toHaveLength(164);
    expect((ridge(legacy,2)?.match(/L /g)??[])).toHaveLength(92);
    expect(ridge(candidate,2)).toContain("512 258");
    for(const band of [0,1])
      expect(ridge(candidate,band)).toEqual(ridge(legacy,band));
    // Same exact clip, ink and downstream ridge-derived features; changing
    // the actual near ridge changes the child painter's root positions.
    expect(legacy).not.toContain('data-km-fuchun-near-relief=""');
    expect((candidate.match(/data-km-fuchun-near-relief=""/g)??[])).toHaveLength(1);
    expect((candidate.match(/data-km-fuchun-near-bank=""/g)??[])).toHaveLength(4);
    expect((candidate.match(/data-km-fuchun-near-bank-wash=""/g)??[])).toHaveLength(4);
    expect((candidate.match(/data-km-fuchun-near-bank-broken-crest=""/g)??[]))
      .toHaveLength(8);
    expect((candidate.match(/data-km-fuchun-near-hemp=""/g)??[])).toHaveLength(28);
    expect((candidate.match(/data-km-fuchun-near-deposit=""/g)??[])).toHaveLength(12);
    const banks=[...candidate.matchAll(
      /data-km-fuchun-near-bank-source="([^"]+)" data-km-fuchun-near-bank-order="(\d+)" data-km-fuchun-near-bank-contour="([^"]+)"/g,
    )];
    expect(banks).toHaveLength(4);
    for(const [i,bank] of banks.entries()){
      const [left,right]=bank[1].split(";").map(point=>point.split(",").map(Number));
      expect(Number(bank[2])).toBe(i);
      expect(left.every(Number.isFinite)).toBe(true);
      expect(right.every(Number.isFinite)).toBe(true);
      expect(right[0]).toBeGreaterThan(left[0]+75);
      expect(bank[3]).toMatch(/^M[-.\d]+ [-.\d]+ C/);
      expect(bank[3].endsWith(" Z")).toBe(true);
    }
    const fineRoots=[...candidate.matchAll(
      /data-km-fuchun-near-hemp-root="([^"]+)" data-km-fuchun-near-hemp-axis="([^"]+)"/g,
    )];
    expect(fineRoots).toHaveLength(28);
    for(const [,root,axis] of fineRoots){
      expect(axis.startsWith("M"+root.replace(","," ")+" C")).toBe(true);
    }
    expect([...candidate87.matchAll(/data-km-fuchun-near-bank-contour="([^"]+)"/g)]
      .map(m=>m[1])).not.toEqual(banks.map(b=>b[3]));
    // The formerly near-vertical original wash family keeps every
    // source mark, shelf and moss deposit. Only the opt-in lower band
    // follows the widened bank's true curved ridge coordinates.
    expect((legacy.match(/data-km-rock-plane-flow="source-following"/g)??[]))
      .toHaveLength(0);
    const nearFlow=[...candidate.matchAll(
      /data-km-rock-plane-flow="source-following" data-km-rock-plane-bank-register="[^"]+" data-km-rock-plane-bank-axis="([^"]+)" data-km-rock-plane-bank-end="([^"]+)"/g,
    )];
    expect(nearFlow).toHaveLength(17);
    // Huang's upper-to-lower long pima remains distinct from the
    // rounded alum-head presses and cheek-following middle ink.
    expect((candidate.match(/data-km-rock-plane-bank-register="descending-hemp"/g)??[]))
      .toHaveLength(6);
    expect((candidate.match(/data-km-rock-plane-bank-register="short-head"/g)??[]))
      .toHaveLength(2);
    expect((candidate.match(/data-km-rock-plane-bank-register="rolled-cheek"/g)??[]))
      .toHaveLength(9);
    expect(legacy).not.toContain("data-km-rock-plane-bank-register=");
    const nearRoots=[...candidate.matchAll(
      /data-km-rock-ink-plane="" data-km-rock-plane-root="([^"]+)" data-km-rock-plane-crest="([^"]+)" data-km-rock-plane-style="([^"]+)" data-km-rock-plane-flow="source-following"/g,
    )];
    expect(nearRoots).toHaveLength(17);
    for(const [j,mark] of nearFlow.entries()){
      const root=nearRoots[j][1].split(",").map(Number);
      const endpoint=mark[2].split(",").map(Number);
      expect(root.every(Number.isFinite)).toBe(true);
      expect(endpoint.every(Number.isFinite)).toBe(true);
      expect(mark[1].startsWith("M"+root.join(" ")+" C")).toBe(true);
      expect(Math.abs(endpoint[0]-root[0])).toBeGreaterThan(16);
      expect(root[1]-Number(nearRoots[j][2])).toBeGreaterThan(3);
      expect(root[1]-Number(nearRoots[j][2])).toBeLessThan(8);
    }
    expect((candidate.match(/data-km-rock-plane-flow="original"/g)??[]))
      .toHaveLength(19);
    expect(candidate).toContain('data-km-rock-plane-family="2"');
    const roots=(html:string)=>[...html.matchAll(
      /data-km-rock-plane-root="([^"]+)"/g,
    )].map(m=>m[1]);
    expect(roots(candidate)).not.toEqual(roots(legacy));
    for(const frame of [84,215])
      expect(ridge(paint("fuchun",71,true,frame),2))
        .toEqual(ridge(candidate,2));
    // The opt-in is never a cosmetic global shared mountain preference.
    expect(paint("travelers",71,true)).toBe(paint("travelers",71,false));
    expect(paint("fuchun",71,true,145,"river-scholar"))
      .toBe(paint("fuchun",71,false,145,"river-scholar"));
    expect(candidate).not.toContain("<image ");
  });

  it("rejects malformed opt-in near-rock study controls",()=>{
    expect(()=>assertShanshuiControls({
      ...DEFAULT_SHANSHUI,fuchunNearShoulderStudy:"enabled" as never,
    })).toThrow(RangeError);
    expect(()=>assertShanshuiControls({
      ...DEFAULT_SHANSHUI,fuchunNearShoulderStudy:true,
    })).not.toThrow();
  });
});
