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
    // The formerly needle-sharp triangle now has a real rounded
    // double-shoulder summit with many intermediate contour stations.
    expect(summit.length).toBeGreaterThan(20);
    expect(summit.filter(([,y])=>y>=96&&y<=115).length)
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
    const paint=(school:typeof schools[number][0],detail=1,ink=.95)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          seed:71,mist:.35,detail,ink,inkSchool:school},
      }));
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
  });

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
});
