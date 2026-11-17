import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createRisoDrumContactGeometry}
  from "../registry/video/riso-drum-contact";
import {RisoPrint} from "../registry/video/print-plates-react";
import {RisoBrushArt} from "../src/video/riso-brush-studio";
import {risoExampleArtworks,risoExampleSpec}
  from "../src/video/riso-print-demo";

const raw={width:960,height:540,seed:62,plateIndex:0,
  dryness:.8,feed:"top-to-bottom" as const};
describe("RISO75 native source drawing & independent drum contact ArtCraft",()=>{
  it("original zero-contact is IDENTICAL and contains no source-mutating mask",()=>{
    const noEffect=createRisoDrumContactGeometry({...raw,dryness:0});
    expect(noEffect.streaks).toHaveLength(0);
    expect(noEffect.pinpricks).toHaveLength(0);
    const base={spec:risoExampleSpec("landscape",62),
      frame:220,artworks:risoExampleArtworks("landscape"),paperGrain:.6};
    const source=renderToStaticMarkup(<RisoPrint {...base}/>);
    const zero=renderToStaticMarkup(<RisoPrint {...base}
      drumContact={{dryness:0,feed:"top-to-bottom"}}/>);
    expect(zero).toBe(source);
    expect(zero).not.toContain('data-km-riso75-contact-drum');
    expect(zero).toContain('data-km-riso-print=""');
  });
  it("each original ink drum owns independently seeded 112 fibre paths and 80 micro-openings",()=>{
    const blue=createRisoDrumContactGeometry(raw);
    const red=createRisoDrumContactGeometry({...raw,plateIndex:1});
    const again=createRisoDrumContactGeometry(raw);
    expect(blue).toEqual(again);
    expect(blue).not.toEqual(red);
    expect(blue.paperLocked).toBe(true);
    expect(red.paperLocked).toBe(true);
    expect(blue.streaks).toHaveLength(112);
    expect(red.streaks).toHaveLength(112);
    expect(blue.pinpricks).toHaveLength(80);
    expect(blue.streaks.every(s=>s.d.startsWith("M")&&s.d.includes(" C")&&
      s.strokeWidth>0&&s.opacity>0&&s.opacity<=.7)).toBe(true);
    expect(blue.pinpricks.every(p=>p.rx>0&&p.ry>=p.rx&&
      p.opacity>0&&p.opacity<=.72)).toBe(true);
    expect(new Set(blue.streaks.map(x=>x.id)).size).toBe(112);
    expect(new Set(blue.pinpricks.map(x=>x.id)).size).toBe(80);
  });
  it("original image fibers preserve feed-direction geometry and are stable across 24fps source times",()=>{
    const a=createRisoDrumContactGeometry(raw);
    const otherDirection=createRisoDrumContactGeometry({
      ...raw,feed:"left-to-right"});
    expect(a.streaks.map(s=>s.d)).not.toEqual(otherDirection.streaks.map(s=>s.d));
    expect(otherDirection.pinpricks.every(p=>p.rx>=p.ry)).toBe(true);
    expect(otherDirection.feed).toBe("left-to-right");
    const later=createRisoDrumContactGeometry({...raw}); // frame is intentionally not a parameter
    expect(a).toEqual(later);
    const subtler=createRisoDrumContactGeometry({...raw,dryness:.35});
    expect(subtler.streaks.map(s=>s.d)).toEqual(a.streaks.map(s=>s.d));
    expect(subtler.pinpricks.map(s=>s.cx)).toEqual(a.pinpricks.map(s=>s.cx));
    expect(subtler.streaks[3].opacity).toBeLessThan(a.streaks[3].opacity);
  });
  it("rejects invalid paper, density, plate identity, feed direction and unsafe seeds",()=>{
    expect(()=>createRisoDrumContactGeometry({...raw,width:10})).toThrow(/valid paper/);
    expect(()=>createRisoDrumContactGeometry({...raw,dryness:-.2})).toThrow(/dryness/);
    expect(()=>createRisoDrumContactGeometry({...raw,dryness:Infinity})).toThrow(/dryness/);
    expect(()=>createRisoDrumContactGeometry({...raw,plateIndex:25})).toThrow(/drum/);
    expect(()=>createRisoDrumContactGeometry({...raw,feed:"unknown" as "top-to-bottom"}))
      .toThrow(/direction/);
    expect(()=>createRisoDrumContactGeometry({...raw,seed:2**32})).toThrow(/31-bit/);
  });
  it("renders real independently contacted two-plate SVG, with all original art source elements unchanged",()=>{
    const spec=risoExampleSpec("landscape",62);
    const art=risoExampleArtworks("landscape");
    const render=(contact=false)=>renderToStaticMarkup(<RisoPrint
      spec={spec} frame={239} artworks={art}
      drumContact={contact?{dryness:.8,feed:"top-to-bottom"}:undefined}/>);
    const source=render(),contact=render(true);
    expect(contact).toContain('data-km-riso75-fibre-master="blue"');
    expect(contact).toContain('data-km-riso75-fibre-master="red"');
    expect(contact).toContain('data-km-riso75-pore-master="blue"');
    expect(contact).toContain('data-km-riso75-pore-master="red"');
    expect(contact).toContain('data-km-riso75-contact-drum="blue"');
    expect(contact).toContain('data-km-riso75-contact-drum="red"');
    expect(contact.match(/data-km-riso75-streak=/g)).toHaveLength(224);
    expect(contact.match(/<ellipse /g)).toHaveLength(160);
    expect(contact.match(/<mask /g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain('data-km-riso75-streak=');
    expect(contact).toContain('mix-blend-mode:multiply');
    expect(contact).toContain('data-km-riso-screen-mode="am"');
    // Extract native artwork path data; these MUST stay identical across masks.
    const paths=(html:string)=>[...html.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
      .map(m=>m[1]);
    const rawPaths=paths(source),contactPaths=paths(contact);
    expect(rawPaths.length).toBeGreaterThan(0);
    for(const rawPath of rawPaths)expect(contactPaths).toContain(rawPath);
  });
  it("the genuine moving RISO62 brush film source retains intact original 20 authored gesture paths",()=>{
    const common={aspect:"landscape" as const,frame:137,
      plate:"both" as const,dryness:.73,seed:62,inkScale:1,
      registration:.25,grain:.58,animate:true,
      layout:"film" as const};
    const source=renderToStaticMarkup(<RisoBrushArt {...common}/>);
    const contact=renderToStaticMarkup(<RisoBrushArt {...common}
      drumContact={{dryness:.85,feed:"top-to-bottom"}}/>);
    const authored=/<[^>]*data-km-riso62-original-curve="\d+"[^>]*>/g;
    const sourcePaths=source.match(authored)??[];
    const contactPaths=contact.match(authored)??[];
    expect(sourcePaths.length).toBeGreaterThanOrEqual(20);
    expect(contactPaths).toEqual(sourcePaths);
    expect(contact).toContain('data-km-riso75-fibre-master="blue"');
    expect(contact).toContain('data-km-riso75-fibre-master="red"');
    expect(contact).not.toMatch(/feGaussianBlur|<foreignObject|<canvas/);
  });
});
