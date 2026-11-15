import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { inspectPaintSurface } from "../registry/video/watercolour-brush";
import { paintExampleSpec } from "../src/video/watercolour-brush-demo";
import { WatercolourFilmViewport, WatercolourParameterEditor, inspectJsonObject } from "../src/video/watercolour-film-parameters";

describe("interactive watercolour Film Looks",()=>{
  it("preserves film dimensions through responsive composition",()=>{
    const html=renderToStaticMarkup(<WatercolourFilmViewport width={960} height={540}>
      {scale=><span data-preview-scale={scale}>Production frame</span>}
    </WatercolourFilmViewport>);
    expect(html).toContain("960 / 540");
    expect(html).toContain("Production frame");
    expect(html).toContain("data-preview-scale");
  });

  it("refuses malformed JSON but applies validated full-parameter changes",()=>{
    const initial=paintExampleSpec("landscape","wild-iris");
    const onApply=vi.fn(),onReset=vi.fn();
    render(<WatercolourParameterEditor title="Iris brush" value={initial}
      validate={candidate=>{
        const problems=inspectJsonObject(candidate);
        return problems.length?problems:inspectPaintSurface(candidate as typeof initial).map(x=>x.message);
      }}
      onApply={onApply} onReset={onReset}/>);
    fireEvent.click(screen.getByText(/Iris brush.*advanced JSON editor/));
    const editor=screen.getByRole("textbox",{name:"Scene configuration (JSON)"});
    fireEvent.change(editor,{target:{value:"{invalid-json"}});
    fireEvent.click(screen.getByRole("button",{name:"Apply validated JSON"}));
    expect(screen.getByRole("alert").textContent).toMatch(/JSON|Unexpected|property|token/i);
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.change(editor,{target:{value:JSON.stringify({...initial,paper:{...initial.paper,tooth:2}})}});
    fireEvent.click(screen.getByRole("button",{name:"Apply validated JSON"}));
    expect(screen.getByRole("alert").textContent).toContain("Paper tooth");
    expect(onApply).not.toHaveBeenCalled();
    const customised={...initial,paper:{...initial.paper,tooth:.28},
      strokes:initial.strokes.map((s,i)=>i===0?{...s,color:"#285A6A"}:s)};
    fireEvent.change(editor,{target:{value:JSON.stringify(customised)}});
    fireEvent.click(screen.getByRole("button",{name:"Apply validated JSON"}));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.calls[0][0].paper.tooth).toBe(.28);
    expect(onApply.mock.calls[0][0].strokes[0].color).toBe("#285A6A");
    fireEvent.click(screen.getByRole("button",{name:"Reset this preset"}));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("rejects root arrays and null instead of rendering unknown configurations",()=>{
    expect(inspectJsonObject([])).toEqual(["Expected a JSON object."]);
    expect(inspectJsonObject(null)).toEqual(["Expected a JSON object."]);
    expect(inspectJsonObject({})).toEqual([]);
  });
});
