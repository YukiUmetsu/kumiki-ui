import { describe,expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { watercolourMasterworkMaterialPlan, WatercolourMasterworkMaterial } from "../src/video/watercolour-masterwork-material";
import { WatercolourMasterStudyPage, watercolourStudySpec } from "../src/video/watercolour-master-studies";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import film from "../examples/film/watercolour-master-studies-art-only.film.json";

describe("WM7 ten-master watercolor material grammar",()=>{
  for(const study of ["botanical","estuary","courtyard"] as const){
    it(study+" is deterministic, bounded, paper-aware and has real pigment lifting",()=>{
      const plan=watercolourMasterworkMaterialPlan(study,83);
      expect(plan).toEqual(watercolourMasterworkMaterialPlan(study,83));
      expect(plan).not.toEqual(watercolourMasterworkMaterialPlan(study,84));
      expect(plan.marks.length).toBeGreaterThan(65);
      expect(plan.marks.length).toBeLessThan(301);
      expect(plan.reserves.length).toBeGreaterThan(5);
      expect(plan.reserves.length).toBeLessThan(51);
      expect(new Set(plan.marks.map(x=>x.id)).size).toBe(plan.marks.length);
      expect(plan.marks.every(x=>/^M/.test(x.path)&&
        !x.path.includes("NaN")&&!x.path.includes("Infinity")&&
        x.opacity>0&&x.opacity<=1&&x.startFrame>=0&&x.startFrame<420)).toBe(true);
      expect(plan.reserves.every(x=>/^M/.test(x.path)&&x.width>0)).toBe(true);
      expect(plan.marks.some(x=>x.kind==="transparent-glaze")).toBe(true);
      expect(plan.marks.some(x=>x.kind==="tonal-mass")).toBe(true);
      expect(watercolourMasterworkMaterialPlan(study,83,0)).toEqual({
        marks:[],reserves:[],
      });
    });
  }

  it("botanical glazes and dry brush are root-attached and move with source stems",()=>{
    const plan=watercolourMasterworkMaterialPlan("botanical",83,1);
    const shaded=plan.marks.filter(x=>x.id.startsWith("leaf-shade-"));
    const fibres=plan.marks.filter(x=>x.id.startsWith("leaf-tooth-"));
    expect(shaded.length).toBe(57);
    expect(fibres.length).toBe(57);
    expect([...shaded,...fibres].every(x=>x.plantIndex!==undefined&&
      Number.isFinite(x.plantX))).toBe(true);
    const early=renderToStaticMarkup(<WatercolourMasterworkMaterial
      study="botanical" seed={83} frame={180}/>);
    const dry=renderToStaticMarkup(<WatercolourMasterworkMaterial
      study="botanical" seed={83} frame={355}/>);
    expect(early).not.toEqual(dry);
    expect(dry).toContain('data-km-masterwork-kind="transparent-glaze"');
    expect(dry).toContain("rotate(");
  });

  it("estuary has broad tonal structure, shaped blue mist, and subtractive foam",()=>{
    const plan=watercolourMasterworkMaterialPlan("estuary",83);
    expect(plan.marks.some(x=>x.id==="near-water-depth"&&x.kind==="tonal-mass")).toBe(true);
    expect(plan.marks.some(x=>x.id==="boat-contact"&&x.kind==="focal-shadow")).toBe(true);
    expect(plan.marks.filter(x=>x.kind==="directional-drybrush").length).toBeGreaterThan(40);
    expect(plan.reserves.some(x=>x.path.includes(" q"))).toBe(true);
    const html=renderToStaticMarkup(<WatercolourMasterworkMaterial
      study="estuary" seed={83} frame={300}/>);
    expect(html).toContain("<mask");
    expect(html).toContain('stroke="#000"');
    expect(html).toContain('mask="url(#');
    // Lifting is a black-on-white alpha mask, not white foreground decals.
    expect(plan.marks.every(x=>!["#FFFFFF","#FFF","#F8F3E8"].includes(x.color))).toBe(true);
  });

  it("courtyard projected material never covers architectural window apertures",()=>{
    const plan=watercolourMasterworkMaterialPlan("courtyard",83);
    const points=plan.marks.filter(x=>x.id.startsWith("plaster-brush-"));
    expect(points.length).toBeGreaterThan(35);
    for(const mark of points){
      const m=/^M([-\d.]+) ([-\d.]+)/.exec(mark.path);
      expect(m).not.toBeNull();
      const x=Number(m![1]),y=Number(m![2]);
      for(let i=0;i<6;i++){
        const wx=525+(i%3)*108,wy=329+Math.floor(i/3)*73;
        expect(x>=wx-7&&x<=wx+48&&y>=wy-7&&y<=wy+45).toBe(false);
      }
    }
    expect(plan.marks.some(x=>x.id==="portal-depth"&&x.opacity>.25)).toBe(true);
  });

  it("validates all material intensity, seed and scene bounds",()=>{
    for(const invalid of [-.01,1.001,Infinity,NaN])
      expect(()=>watercolourMasterworkMaterialPlan("estuary",83,invalid)).toThrow(RangeError);
    expect(()=>watercolourMasterworkMaterialPlan("estuary",-1)).toThrow(RangeError);
    expect(()=>watercolourMasterworkMaterialPlan("estuary",2147483648)).toThrow(RangeError);
    expect(()=>watercolourMasterworkMaterialPlan("invalid" as "estuary",83)).toThrow(RangeError);
  });

  it("layers material into original two-aspect FilmStage without editing typography or base pigments",async()=>{
    for(const output of ["landscape","portrait"] as const){
      const spec=watercolourStudySpec("botanical",output);
      const full=renderToStaticMarkup(<WatercolourMasterStudyPage
        spec={spec} study="botanical" frame={300} materialDepth={1}/>);
      const bare=renderToStaticMarkup(<WatercolourMasterStudyPage
        spec={spec} study="botanical" frame={300} materialDepth={0}/>);
      expect(full).toContain('data-km-masterwork-strength="1"');
      expect(bare).toContain('data-km-masterwork-strength="0"');
      expect(full).toContain('data-km-masterwork-kind="transparent-glaze"');
      expect(bare).not.toContain('data-km-masterwork-kind="transparent-glaze"');
      expect(bare).toContain('data-km-subject-pigment=""');
      expect(bare).toContain('data-km-wet-pigment-field=""');
      expect(bare).toContain("WATERCOLOUR / ORIGINAL STUDIES");
      expect(()=>renderToStaticMarkup(<WatercolourMasterStudyPage
        spec={spec} study="botanical" frame={300} materialDepth={-1}/>)).toThrow(RangeError);
      const compiled=compileFilm(film,{outputId:output});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      const slots=await loadFilmSlots(compiled.film);
      const ctx={frame:320,fps:{num:30,den:1},durationFrames:420,
        width:compiled.film.width,height:compiled.film.height,reducedMotion:false};
      const html=renderToStaticMarkup(<>{slots({
        slot:"watercolour-master-study",label:"Material study",
        props:{study:"courtyard",materialDepth:.7,artOnly:true},
      },ctx)}</>);
      expect(html).toContain('data-km-masterwork-strength="0.7"');
      expect(()=>slots({slot:"watercolour-master-study",label:"Invalid",
        props:{study:"courtyard",materialDepth:1.2}},ctx)).toThrow(RangeError);
    }
  });
});
