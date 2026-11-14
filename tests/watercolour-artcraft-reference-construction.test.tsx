import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {
  referenceDaisyPetals,REFERENCE_BOAT_GEOMETRY,
  WatercolourReferenceFlower,WatercolourReferenceBoat,
  WatercolourReferenceCourtyard,
} from "../src/video/watercolour-reference-construction";
import {WatercolourMasterStudyPage,watercolourStudySpec} from "../src/video/watercolour-master-studies";

describe("ArtCraft reference structure and construction, not global image noise",()=>{
  it("uses 13 heterogeneous petal silhouettes with shared attached disc roots",()=>{
    const petals=referenceDaisyPetals(83,2);
    expect(petals).toHaveLength(13);
    expect(petals).toEqual(referenceDaisyPetals(83,2));
    expect(petals).not.toEqual(referenceDaisyPetals(84,2));
    expect(new Set(petals.map(x=>x.path)).size).toBe(13);
    expect(new Set(petals.map(x=>x.length.toFixed(2))).size).toBeGreaterThan(9);
    expect(petals.every(x=>x.path.startsWith("M0 -3.7 C")&&
      x.path.endsWith("0 -3.7 Z")&&x.fold.startsWith("M"))).toBe(true);
    expect(petals.every(x=>!x.path.includes("NaN"))).toBe(true);
    for(const index of [-1,10001,1.5])
      expect(()=>referenceDaisyPetals(83,index)).toThrow(RangeError);
    expect(()=>referenceDaisyPetals(-1,2)).toThrow(RangeError);
    const svg=renderToStaticMarkup(<svg>
      <WatercolourReferenceFlower cx={10} cy={20} seed={83} index={2} frame={355}/>
    </svg>);
    expect(svg).toContain('data-km-joined-petals="13"');
    expect((svg.match(/data-km-petal-root=/g)||[])).toHaveLength(13);
    expect(svg).toContain("linearGradient");
    expect(svg).toContain("radialGradient");
  });

  it("keeps hull a closed mass and sail rigging on explicit mast/deck anchors",()=>{
    const g=REFERENCE_BOAT_GEOMETRY;
    expect(g.hull).toMatch(/^M686 397 /);
    expect(g.hull).toMatch(/ Z$/);
    expect(g.mainsail).toMatch(/ Z$/);
    expect(g.headsail).toMatch(/ Z$/);
    expect(g.mast.x).toBe(761);
    expect(g.mast.topY).toBe(316);
    expect(g.backstay.startsWith("M761 318")).toBe(true);
    expect(g.forestay.startsWith("M761 318")).toBe(true);
    expect(g.backstay.endsWith("693 398")).toBe(true);
    expect(g.forestay.endsWith("839 397")).toBe(true);
    const first=renderToStaticMarkup(<svg><WatercolourReferenceBoat frame={215} seed={83}/></svg>);
    const second=renderToStaticMarkup(<svg><WatercolourReferenceBoat frame={355} seed={83}/></svg>);
    expect(first).not.toEqual(second);
    expect(second).toContain('data-km-rope-attachments="mast,bow,stern"');
    expect(second).toContain('data-km-figure-connected="head-neck-torso-arm-thigh-shin"');
    expect((second.match(/data-km-wake-root=/g)||[])).toHaveLength(14);
    expect(second).toContain("linearGradient");
  });

  it("places coursed roof contours in actual architectural planes and preserves six windows",()=>{
    const html=renderToStaticMarkup(<svg>
      <WatercolourReferenceCourtyard seed={83} frame={355}/>
    </svg>);
    expect(html).toContain('data-km-roof-courses="4"');
    expect(html).toContain('data-km-window-reveals="6"');
    expect((html.match(/data-km-window-aperture=/g)||[])).toHaveLength(6);
    expect(html).toContain("M448 319");
    expect(html).toContain("M452 323");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
    expect(html.length).toBeLessThan(45000);
    const early=renderToStaticMarkup(<svg>
      <WatercolourReferenceCourtyard seed={83} frame={120}/>
    </svg>);
    expect(early).toContain('opacity="0"');
  });

  it("replaces all three authored film scenes while retaining WM4–WM7 pigment systems",()=>{
    for(const output of ["landscape","portrait"] as const){
      for(const study of ["botanical","estuary","courtyard"] as const){
        const markup=renderToStaticMarkup(<WatercolourMasterStudyPage
          study={study} spec={watercolourStudySpec(study,output,83)}
          frame={355} artOnly materialDepth={1} craftDetail={1}/>);
        expect(markup).toContain('data-km-reference-subject="'+
          (study==="botanical"?"botanical-flower":
            study==="estuary"?"estuary-boat":"courtyard-construction")+'"');
        expect(markup).toContain('data-km-subject-pigment=""');
        expect(markup).toContain('data-km-masterwork-medium=""');
        expect(markup).toContain('data-km-watercolour-craft=""');
        expect(markup).not.toContain("NaN");
      }
    }
  });
});
