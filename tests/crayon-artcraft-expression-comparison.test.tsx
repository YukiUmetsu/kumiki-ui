import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import faceMeta,{AdultFaceExpressionComparison,MatchedExpressionComparison,MatchedExpressionPortrait} from "../src/video/crayon-artcraft-adult-face.stories";

const args={aspect:"landscape" as const,detail:1,expression:"warm" as const,
  headScaleY:.82,startFrame:299,playbackRate:1,loop:false};

describe("Crayon ArtCraft matched expression comparison",()=>{
  it("stays in the existing hidden Crayon Storybook subtree",()=>{
    expect(faceMeta.title).toBe("Video production/Film Looks/Crayon/Characters/ArtCraft Adult Face Lab");
    expect(faceMeta.tags).toContain("!dev");
    expect(MatchedExpressionComparison.render).toBeTypeOf("function");
    expect(MatchedExpressionPortrait.args?.aspect).toBe("portrait");
  });
  for(const aspect of ["landscape","portrait"] as const){
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
