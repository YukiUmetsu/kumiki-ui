import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createRisoTornPaperProfile,risoTornPaperShape,risoTornProgress}
  from "../registry/video/riso-torn-paper";
import {RisoTornPaperTransition}
  from "../registry/video/riso-torn-paper-react";
import {risoExampleArtworks,risoExampleSpec}
  from "../src/video/riso-print-demo";
import {risoSecondSheetArtworks} from "../src/video/riso-print-demo-alt";
import {RISO76_TORN_COLLAGE_FILM}
  from "../src/video/riso76-collage-film";
import {compileFilm} from "../registry/video/film-document";
import {RisoTornCollageStudio} from "../src/video/riso76-paper-collage-studio";
const original={spec:risoExampleSpec("landscape",23),
  artworks:risoExampleArtworks("landscape")};
const incoming={spec:risoExampleSpec("landscape",37),
  artworks:risoSecondSheetArtworks("landscape")};
const p={width:960,height:540,seed:76,roughness:.77};
describe("RISO76 ArtCraft: detailed physical paper cut, source-native two spot inks and film",()=>{
  it("uses 129 source-paper edge stations and 144 independently authored source-fibre splinters",()=>{
    const profile=createRisoTornPaperProfile(p);
    expect(profile.serrations).toHaveLength(129);
    expect(profile.fibres).toHaveLength(144);
    expect(profile).toEqual(createRisoTornPaperProfile(p));
    expect(profile).not.toEqual(createRisoTornPaperProfile({...p,seed:77}));
    expect(profile.serrations.some(n=>n<0)).toBe(true);
    expect(profile.serrations.some(n=>n>0)).toBe(true);
    expect(new Set(profile.fibres.map(x=>x.id)).size).toBe(144);
    expect(profile.fibres.every(x=>x.reach>=.6&&x.reach<=7.3&&
      x.width>.16&&x.opacity>=.17)).toBe(true);
  });
  it("creates all four coherent physical tear directions, reflecting reveal side without altering paper topology",()=>{
    const profile=createRisoTornPaperProfile(p);
    const directions=[
      "left-to-right","right-to-left","top-to-bottom","bottom-to-top",
    ] as const;
    const paths=directions.map(direction=>risoTornPaperShape(profile,direction,.5));
    for(const result of paths){
      expect(result.clipPath).toMatch(/^M/);
      expect(result.clipPath).toMatch(/Z$/);
      expect(result.edgePath.startsWith("M")).toBe(true);
      expect(result.fibrePaths).toHaveLength(144);
      expect(result.fibrePaths.every(x=>x.d.startsWith("M")&&x.d.includes(" Q"))).toBe(true);
      expect(new Set(result.fibrePaths.map(x=>x.id)).size).toBe(144);
    }
    expect(new Set(paths.map(x=>x.clipPath)).size).toBe(4);
    expect(paths[0].centre).toBeCloseTo(480,2);
    expect(paths[1].centre).toBeCloseTo(480,2);
    expect(paths[2].centre).toBeCloseTo(270,2);
    expect(paths[3].centre).toBeCloseTo(270,2);
    const first=risoTornPaperShape(profile,"left-to-right",.23);
    const same=risoTornPaperShape(profile,"left-to-right",.23);
    expect(first).toEqual(same);
  });
  it("supports exact guillotine cut and source-locked fibre positions while varying only physical sheet travel",()=>{
    const clean=createRisoTornPaperProfile({...p,roughness:0});
    expect(clean.serrations.every(x=>x===0)).toBe(true);
    expect(risoTornPaperShape(clean,"left-to-right",.5).fibrePaths).toHaveLength(0);
    const profile=createRisoTornPaperProfile(p);
    const a=risoTornPaperShape(profile,"top-to-bottom",.35);
    const b=risoTornPaperShape(profile,"top-to-bottom",.62);
    expect(a.fibrePaths[0].id).toBe(b.fibrePaths[0].id);
    expect(a.fibrePaths[0].width).toBe(b.fibrePaths[0].width);
    expect(a.fibrePaths[0].opacity).toBe(b.fibrePaths[0].opacity);
    expect(a.edgePath).not.toBe(b.edgePath);
  });
  it("rejects corrupted paper dimensions, profile, unsafe frame, roughness and invalid direction",()=>{
    expect(()=>createRisoTornPaperProfile({...p,width:10})).toThrow(/240/);
    expect(()=>createRisoTornPaperProfile({...p,roughness:1.1})).toThrow(/0..1/);
    expect(()=>createRisoTornPaperProfile({...p,seed:2**32})).toThrow(/31-bit/);
    expect(()=>risoTornProgress(-1,0,120)).toThrow(/nonnegative/);
    expect(()=>risoTornProgress(0,0,0)).toThrow(/1–3600/);
    expect(()=>risoTornPaperShape(createRisoTornPaperProfile(p),
      "upside-down" as "left-to-right",.5)).toThrow(/direction/);
    expect(()=>risoTornPaperShape(createRisoTornPaperProfile(p),
      "left-to-right",Infinity)).toThrow(/0..1/);
  });
  it("has exact first/last frame and reduced-motion terminal picture; no intermediate image dissolve",()=>{
    expect(risoTornProgress(51,52,119)).toBe(0);
    expect(risoTornProgress(52,52,119)).toBe(0);
    expect(risoTornProgress(171,52,119)).toBe(1);
    expect(risoTornProgress(400,52,119)).toBe(1);
    expect(risoTornProgress(52,52,119,true)).toBe(1);
    expect(risoTornProgress(111,52,119)).toBeGreaterThan(.4);
    expect(risoTornProgress(111,52,119)).toBeLessThan(.6);
  });
  it("keeps both original per-ink artwork compositions intact across middle torn clip, including source text",()=>{
    const props={outgoing:original,incoming,frame:45,startFrame:0,
      durationFrames:100,seed:76,paperGrain:.6,
      drumContact:{dryness:.4,feed:"top-to-bottom" as const}};
    const at0=renderToStaticMarkup(<RisoTornPaperTransition
      {...props} frame={0}/>);
    const middle=renderToStaticMarkup(<RisoTornPaperTransition {...props}/>);
    const last=renderToStaticMarkup(<RisoTornPaperTransition
      {...props} frame={100}/>);
    expect(at0).toContain("THE");
    expect(at0).not.toContain("FOLLOW");
    expect(at0).not.toContain('data-km-riso76-edge-material=""');
    expect(at0).not.toContain('data-km-riso76-incoming-original=""');
    expect(middle).toContain("THE");
    expect(middle).toContain("FOLLOW");
    expect(middle).toContain('data-km-riso76-outgoing-original=""');
    expect(middle).toContain('data-km-riso76-incoming-original=""');
    expect(middle).toContain('data-km-riso76-source-torn-mask=""');
    expect(middle).toContain('data-km-riso76-edge-material=""');
    expect(middle).toContain('data-km-riso76-paper-lip=""');
    expect(middle.match(/data-km-riso76-cellulose-fibre=/g)).toHaveLength(144);
    expect(middle).toContain('data-km-riso75-fibre-master="blue"');
    expect(middle).toContain('data-km-riso75-fibre-master="red"');
    expect(last).toContain("FOLLOW");
    expect(last).not.toContain("THE HIDDEN");
    expect(last).not.toContain('data-km-riso76-outgoing-original=""');
    expect(last).not.toContain('data-km-riso76-edge-material=""');
    expect(last).not.toContain('data-km-riso76-source-torn-mask=""');
    const reduced=renderToStaticMarkup(<RisoTornPaperTransition
      {...props} frame={0} reducedMotion/>);
    expect(reduced).toContain('data-km-riso76-progress="1"');
    expect(reduced).not.toContain('data-km-riso76-edge-material=""');
  });
  it("fits real 16:9 and 9:16 outputs into the existing 3-shot FD1 production architecture",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const result=compileFilm(RISO76_TORN_COLLAGE_FILM,{outputId:aspect});
      expect(result.ok).toBe(true);
      if(!result.ok)continue;
      expect(result.film.durationFrames).toBe(232);
      expect(result.film.scenes).toHaveLength(3);
      expect(result.film.fps.num).toBe(24);
    }
    const html=renderToStaticMarkup(<RisoTornCollageStudio/>);
    expect(html).toContain('data-km-riso76-scene="torn-collage"');
    expect(html).toContain('data-km-riso76-direction="left-to-right"');
    expect(html).toContain('data-km-riso76-film=""');
    expect(html).not.toContain("Unknown physical paper");
  });
});
