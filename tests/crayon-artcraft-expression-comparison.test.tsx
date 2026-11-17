import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import faceMeta,{AdultFaceExpressionComparison,Cc0SourceRegisteredFaceWorkbench,
  crayonArtcraftInspectionSpec} from "../src/video/crayon-artcraft-adult-face.stories";
import {crayonAdultFaceStudy} from "../src/video/crayon-artcraft-adult-face-fixtures";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";

const args={aspect:"landscape" as const,detail:1,expression:"warm" as const,
  headScaleY:.82,startFrame:299,playbackRate:1,loop:false};

describe("Crayon ArtCraft matched expression comparison",()=>{
  it("keeps the rejected paired expression portrait out of the Storybook catalog",()=>{
    expect(faceMeta.title).toBe("Video production/Film Looks/Crayon/ArtCraft Source Lab");
    expect(faceMeta.tags).toContain("!dev");
    expect(faceMeta.component).toBe(Cc0SourceRegisteredFaceWorkbench);
  });
  for(const aspect of ["landscape","portrait"] as const){
    it("uses original wax with valid native camera crops in "+aspect,()=>{
      const source=crayonAdultFaceStudy(aspect);
      expect(crayonArtcraftInspectionSpec(source,"full")).toBe(source);
      for(const region of ["face","eyes","nose-mouth","garment"] as const){
        const focused=crayonArtcraftInspectionSpec(source,region);
        expect(focused.elements).toBe(source.elements);
        expect(focused.seed).toBe(source.seed);
        expect(focused.durationFrames).toBe(source.durationFrames);
        expect(inspectCrayonScene(focused)).toEqual([]);
        expect(focused.camera).toHaveLength(2);
        expect(focused.camera?.[0].frame).toBe(0);
        expect(focused.camera?.[1].frame).toBe(source.durationFrames-1);
        expect(focused.camera?.[0].zoom).toBe(focused.camera?.[1].zoom);
        expect(focused.camera?.[0].focusX).toBe(focused.camera?.[1].focusX);
        expect(focused.camera?.[0].focusY).toBe(focused.camera?.[1].focusY);
        expect(focused.camera?.[0].zoom).toBeGreaterThan(1);
        const html=renderToStaticMarkup(
          <AdultFaceExpressionComparison {...args} aspect={aspect} inspection={region}/>
        );
        expect(html).toContain('data-km-crayon-artcraft-inspection="'+region+'"');
        expect(html.match(/data-km-crayon-scene=/g)).toHaveLength(2);
        expect(html.match(/data-km-crayon-element="adult-face"/g)).toHaveLength(2);
      }
      expect(source.camera?.[0].zoom).toBe(1);
    });
    it("shows two synchronized original SVG studies in "+aspect,()=>{
      const html=renderToStaticMarkup(<AdultFaceExpressionComparison {...args} aspect={aspect}/>);
      expect(html).toContain('data-km-crayon-artcraft-comparison=""');
      expect(html).toContain("Warm expression");
      expect(html).toContain("Neutral expression");
      expect(html.match(/data-km-crayon-scene=/g)).toHaveLength(2);
      expect(html.match(/data-km-crayon-element="adult-face"/g)).toHaveLength(2);
      expect(html).toContain('type="range"');
      expect(html).toContain("Shared frame");
      expect(html).toContain("not approved production characters");
    });
  }
});
