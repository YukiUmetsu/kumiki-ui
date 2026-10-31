import { describe, expect, it, vi, afterEach } from "vitest";
afterEach(() => vi.unstubAllGlobals());
import { render } from "@testing-library/react";
import { evaluateOneChangeHold, validateOneChangeWindow } from "../registry/video/one-change-hold";
import { DeviceFrame, validateScreenHighlight } from "../registry/video/device-frame";
import { IconPlate, wrapPlateText } from "../registry/video/icon-plate";
import { DiagramStage } from "../registry/motion/diagram-stage-react";
import { createDiagramTimeline } from "../registry/motion/diagram-stage";
import type { DiagramSpec } from "../registry/infographic/types";
import { SubjectStage, subjectStageLayout } from "../registry/video/subject-stage";

const windowSpec={startFrame:3188,endFrame:3488,changeFrame:3212,change:"connect" as const};
describe("one change, then hold",()=>{
  it("switches exactly at absolute frame 3212 and stays there through 3487",()=>{
    const prior=evaluateOneChangeHold(windowSpec,3211);
    const at=evaluateOneChangeHold(windowSpec,3212);
    const late=evaluateOneChangeHold(windowSpec,3400);
    expect(prior).toMatchObject({phase:"before",changed:false,showCaption:false,showConnector:false});
    expect(at).toMatchObject({phase:"hold",changed:true,showCaption:true,showConnector:true});
    expect(late).toEqual(at);
    expect(evaluateOneChangeHold(windowSpec,3487)).toEqual(at);
    expect(evaluateOneChangeHold(windowSpec,3488).active).toBe(false);
  });
  it("seeks backward without retaining the reveal",()=>{
    expect(evaluateOneChangeHold(windowSpec,3212).changed).toBe(true);
    expect(evaluateOneChangeHold(windowSpec,3190).changed).toBe(false);
  });
  it("rejects malformed ranges and highlight coordinates",()=>{
    expect(()=>validateOneChangeWindow({...windowSpec,changeFrame:3488})).toThrow();
    expect(()=>validateOneChangeWindow({...windowSpec,startFrame:1.25})).toThrow();
    expect(()=>evaluateOneChangeHold(windowSpec,Infinity)).toThrow();
    expect(()=>validateScreenHighlight({x:.8,y:.2,width:.3,height:.1})).toThrow();
  });
});
describe("semantic action recipes",()=>{
  it.each([
    ["connect", "showConnector"],
    ["show", "emphasizeSubject"],
    ["move", "showNextStep"],
    ["compare", "showComparison"],
    ["ring", "showRing"],
  ] as const)("%s reveals only its authored change", (kind,key)=>{
    const state=evaluateOneChangeHold({...windowSpec,change:kind},3212);
    expect(state.changed).toBe(true);
    expect(state[key]).toBe(true);
    const keys=["showConnector","emphasizeSubject","showNextStep","showComparison","showRing"] as const;
    expect(keys.filter(k=>state[k])).toEqual([key]);
    expect(evaluateOneChangeHold({...windowSpec,change:kind},3400)).toEqual(state);
    expect(evaluateOneChangeHold({...windowSpec,change:kind},3211)[key]).toBe(false);
  });
  it("reveals a verified highlight for connect and show only",()=>{
    for(const change of ["connect","show"] as const){
      expect(evaluateOneChangeHold({...windowSpec,change},3212).showHighlight).toBe(true);
    }
    for(const change of ["move","compare","ring"] as const){
      expect(evaluateOneChangeHold({...windowSpec,change},3212).showHighlight).toBe(false);
    }
  });
});
describe("photo-first stage",()=>{
  it("matches the explicit landscape and portrait safe boxes",()=>{
    expect(subjectStageLayout("landscape",true).subject).toEqual({x:120,y:220,width:980,height:640});
    expect(subjectStageLayout("landscape",true).explanation).toEqual({x:1140,y:220,width:660,height:640});
    expect(subjectStageLayout("portrait",true).subject).toEqual({x:116,y:420,width:848,height:620});
    expect(subjectStageLayout("portrait",true).explanation.y).toBeGreaterThan(1040);
  });
  it("gives the diagram the full width when there is no licensed asset",()=>{
    expect(subjectStageLayout("landscape",false).subject).toBeNull();
    expect(subjectStageLayout("landscape",false).explanation.width).toBe(1680);
    const view=render(<SubjectStage frame={3212} window={windowSpec}
      explanation={<span>Diagram only</span>} caption="software files each invoice"/>);
    expect(view.container.querySelector("[data-km-shot-subject]")).toBeNull();
    expect(view.container.querySelector("[data-km-shot-explanation]")?.textContent).toBe("Diagram only");
  });
  it("contains screenshots, while scene photos alone use cover",()=>{
    const screen=render(<SubjectStage frame={3212} window={windowSpec}
      subject={{mode:"screen",src:"/ledger.png",alt:"Ledger"}} explanation={<span>Diagram</span>}/>);
    expect((screen.container.querySelector("img") as HTMLImageElement).style.objectFit).toBe("contain");
    screen.rerender(<SubjectStage frame={3212} window={windowSpec}
      subject={{mode:"scene",src:"/receipt.png",alt:"Receipt"}} explanation={<span>Diagram</span>}/>);
    expect((screen.container.querySelector("img") as HTMLImageElement).style.objectFit).toBe("cover");
  });
  it("reveals only once, including band, connector and caption",()=>{
    const renderAt=(frame:number)=><SubjectStage frame={frame} window={windowSpec}
      subject={{mode:"device",src:"/ledger.png",alt:"Ledger",highlight:{x:.08,y:.42,width:.84,height:.12}}}
      explanation={sample=><span>{sample.showConnector?"Inbox → Ledger":"Inbox"}</span>}
      caption="software files each invoice"/>;
    const view=render(renderAt(3211));
    expect(view.container.querySelector("[data-km-invoice-band]")).toBeNull();
    expect(view.container.querySelector("[data-km-shot-caption]")).toBeNull();
    expect(view.container.querySelector("[data-km-shot-explanation]")?.textContent).toBe("Inbox");
    view.rerender(renderAt(3212));
    expect(view.container.querySelector("[data-km-invoice-band]")).not.toBeNull();
    expect(view.container.querySelector("[data-km-shot-caption]")?.textContent).toBe("software files each invoice");
    view.rerender(renderAt(3400));
    expect(view.container.querySelector("[data-km-invoice-band]")).not.toBeNull();
    view.rerender(renderAt(3190));
    expect(view.container.querySelector("[data-km-invoice-band]")).toBeNull();
  });
  it("uses composition-relative typography instead of viewport-relative text",()=>{
    const view=render(<SubjectStage frame={3212} window={windowSpec}
      title="Where does each invoice go?" caption="software files each invoice"
      explanation={<span>Diagram</span>}/>);
    const root=view.container.querySelector("[data-km-subject-stage]") as HTMLDivElement;
    const title=view.container.querySelector("[data-km-shot-title]") as HTMLDivElement;
    const caption=view.container.querySelector("[data-km-shot-caption]") as HTMLDivElement;
    expect(root.style.containerType).toBe("inline-size");
    expect(title.style.fontSize).toMatch(/cqw$/);
    expect(caption.style.fontSize).toMatch(/cqw$/);
    view.rerender(<SubjectStage frame={3212} window={windowSpec} orientation="portrait"
      title="Where does each invoice go?" caption="software files each invoice"
      explanation={<span>Diagram</span>}/>);
    expect((view.container.querySelector("[data-km-shot-title]") as HTMLDivElement).style.fontSize).toMatch(/cqw$/);
  });
  it("does not leave an empty subject when image mode or URL is invalid",()=>{
    const view=render(<SubjectStage frame={3212} window={windowSpec}
      subject={{mode:"screen",src:"",alt:"Missing"}} explanation={<span>Diagram</span>}/>);
    expect(view.container.querySelector("[data-km-shot-subject]")).toBeNull();
    expect(view.container.querySelector("[data-km-shot-explanation]")).not.toBeNull();
  });
  it("renders the existing DiagramStage inside the subject explanation box",()=>{
    // jsdom does not implement matchMedia, which the existing DiagramStage
    // subscribes to for its accessible reduced-motion preference.
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }));
    const graph:DiagramSpec={nodes:[{id:"source",label:"Inbox"}],edges:[]};
    const timeline=createDiagramTimeline({id:"integration",graph,fps:{num:30,den:1},
      durationFrames:1,layouts:[{frame:0,bounds:{source:{x:50,y:80,width:280,height:130}}}]});
    const view=render(<SubjectStage frame={3212} window={windowSpec}
      explanation={<DiagramStage graph={graph} timeline={timeline} frame={0}
        width={660} height={640} ariaLabel="Invoice inbox"/>}/>);
    expect(view.container.querySelector("[data-km-diagram-stage]")).not.toBeNull();
  });
  it("uses the portrait subject box and keeps the image away from captions",()=>{
    const view=render(<SubjectStage orientation="portrait" frame={3212} window={windowSpec}
      subject={{mode:"icon",name:"Accounting software",claim:"software files each invoice"}}
      explanation={<span>Cause diagram</span>} caption="software files each invoice"/>);
    expect(view.container.querySelector('[data-km-subject-stage="portrait"]')).not.toBeNull();
    expect(view.container.querySelector("[data-km-generic-ledger]")).not.toBeNull();
  });
});
describe("device and icon details",()=>{
  it("supports all three devices without cropping screenshots",()=>{
    for(const device of ["laptop","monitor","phone"] as const){
      const view=render(<DeviceFrame device={device} imageSrc="/ledger.png" alt="Ledger"/>);
      expect(view.container.querySelector("image")?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
      expect(view.container.querySelector("[data-km-device-frame]")?.getAttribute("data-km-device-frame")).toBe(device);
      view.unmount();
    }
  });
  it("reveals the icon claim exactly once and only after its cue",()=>{
    const renderAt=(frame:number)=><SubjectStage frame={frame} window={windowSpec}
      subject={{mode:"icon",name:"Accounting software",claim:"software files each invoice"}}
      caption="software files each invoice" explanation={<span>Cause</span>}/>;
    const view=render(renderAt(3211));
    expect(view.container.querySelectorAll("[data-km-icon-claim]")).toHaveLength(0);
    expect(view.container.querySelectorAll("[data-km-shot-caption]")).toHaveLength(0);
    view.rerender(renderAt(3212));
    expect(view.container.querySelectorAll("[data-km-icon-claim]")).toHaveLength(1);
    expect(view.container.querySelectorAll("[data-km-shot-caption]")).toHaveLength(0);
    view.rerender(renderAt(3190));
    expect(view.container.querySelectorAll("[data-km-icon-claim]")).toHaveLength(0);
  });
  it("wraps long icon names and claims without stretching SVG glyphs",()=>{
    expect(wrapPlateText("FortyLetterProductNameWithoutSpacesOrPunctuation",22)
      .every(line=>Array.from(line).length<=22)).toBe(true);
    const view=render(<IconPlate name="Long Accounting Software Product Name"
      claim="The ledger files invoices without obscuring the amount or changing the source record"/>);
    expect(view.container.querySelectorAll("text")).toHaveLength(4);
    expect(view.container.querySelector("[textLength]")).toBeNull();
  });
  it("shows the ledger glyph when no mark is supplied",()=>{
    const view=render(<IconPlate name="Accounting software" claim="software files each invoice"/>);
    expect(view.container.querySelector("[data-km-generic-ledger]")).not.toBeNull();
    view.rerender(<IconPlate name="Accounting software" claim="software files each invoice" markSrc="/mark.svg"/>);
    expect(view.container.querySelector("[data-km-generic-ledger]")).toBeNull();
    expect(view.container.querySelector("image")?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });
});
