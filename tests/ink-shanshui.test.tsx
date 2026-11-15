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
    }
  });

  it("roots irregular bamboo brush fans at the same real painted culm joints",()=>{
    for(const scene of SHANSHUI_SCENES){
      const full=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls:{...DEFAULT_SHANSHUI,scene,detail:1},
      }));
      const roots=[...full.matchAll(/data-km-bamboo-branch-root="([^"]+)"/g)]
        .map(m=>m[1]);
      const nodes=[...full.matchAll(/data-km-bamboo-node="([^"]+)"/g)]
        .map(m=>m[1]);
      expect(roots).toHaveLength(21);
      expect(nodes).toHaveLength(21);
      expect(new Set(roots)).toEqual(new Set(nodes));
      expect((full.match(/data-km-bamboo-pressure-twig=""/g)??[]))
        .toHaveLength(21);
      expect((full.match(/data-km-bamboo-dry-lift=""/g)??[]))
        .toHaveLength(42);
      // A real painted fan uses more than one curve/ink weight. It is
      // not a repeated identical triangular leaf clip-art template.
      const blades=[...full.matchAll(
        /data-km-shanshui-bamboo-leaf="" d="([^"]+)"/g,
      )].map(m=>m[1]);
      expect(blades).toHaveLength(105);
      expect(new Set(blades).size).toBeGreaterThan(100);
      expect(blades.every(d=>d.includes(" C")&&d.endsWith(" Z"))).toBe(true);
      expect(full).not.toMatch(/NaN|Infinity|undefined/);
      const sparse=renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:153,controls:{...DEFAULT_SHANSHUI,scene,detail:.35},
      }));
      expect((sparse.match(/data-km-shanshui-bamboo-leaf=""/g)??[]))
        .toHaveLength(42);
      expect(sparse).not.toContain("data-km-bamboo-dry-lift");
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
      expect(shoots).toHaveLength(42); // two shoots per each of 21 culm nodes
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
      expect(leaves).toHaveLength(105);
      expect(leaves.filter(m=>m[3]==="main")).toHaveLength(63);
      expect(leaves.filter(m=>m[3]==="spur-0")).toHaveLength(21);
      expect(leaves.filter(m=>m[3]==="spur-1")).toHaveLength(21);
      const headings=[...html.matchAll(
        /data-km-bamboo-leaf-heading="(-?[0-9.]+)"/g,
      )].map(m=>Number(m[1]));
      expect(headings).toHaveLength(105);
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
        .toHaveLength(21);
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
      /data-km-shanshui-bamboo="" data-km-bamboo-ink-load="[01]" filter="url\\(#([^"]+)\\)"/,
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
