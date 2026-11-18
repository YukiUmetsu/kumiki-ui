import {test,expect} from "@playwright/test";
test("RISO79 real 1x and 3x original printed diecuts, reverse frame, portrait, reduced motion",
async({page},info)=>{
test.setTimeout(135000);
const errors:string[]=[];
page.on("pageerror",err=>errors.push(err.message));
await page.setViewportSize({width:1490,height:1270});
await page.goto("/iframe.html?id=video-riso-print-lab--risograph-printed-pull-tab&viewMode=story");
const studio=page.locator("[data-km-riso79-studio]");
await expect(studio).toBeVisible();
await expect(studio).toHaveAttribute("data-km-riso79-frame","110");
const print=studio.locator("[data-km-riso79-theatre]");
await expect(print).toBeVisible();
await expect(print.locator("[data-km-riso-print]")).toHaveCount(2);
await expect(print.locator("[data-km-riso79-cut-rim]")).toHaveCount(3);
await expect(print.locator("[data-km-riso79-cut-fibre]")).toHaveCount(264);
const source=print.locator("[data-km-riso79-insert-plane] [data-km-riso-print]");
const cover=print.locator("[data-km-riso79-stationary-original-cover] [data-km-riso-print]");
// React useId is reallocated across FilmStage scene boundaries. Compare the
// original source-stencil geometry and all paper pores, not ephemeral SVG IDs.
const printSignature=(which:typeof source)=>which.evaluate(el=>({
plates:Array.from(el.querySelectorAll("[data-km-riso-plate]")).map(x=>x.getAttribute("data-km-riso-plate")),
paths:Array.from(el.querySelectorAll("[data-km-riso-plate] path")).map(x=>x.getAttribute("d")),
text:Array.from(el.querySelectorAll("[data-km-riso-plate] text")).map(x=>x.textContent),
pores:Array.from(el.querySelectorAll("mask circle")).map(x=>[x.getAttribute("cx"),x.getAttribute("cy"),x.getAttribute("r")]),
}));
const orig=await printSignature(source);
const top=await printSignature(cover);
const cut=await print.locator("[data-km-riso79-cut-fibre]").first().getAttribute("d");
await studio.locator("[data-km-riso79-film]").screenshot({path:info.outputPath("riso79-1x-two-original-prints-three-openings.png"),animations:"disabled"});
await studio.getByRole("combobox",{name:"RISO79 source microscope zoom"}).selectOption("3");
await expect(print.locator("[data-km-riso79-paper-wall]")).toHaveCount(3);
await expect(print.locator("[data-km-riso79-edge-bevel]")).toHaveCount(3);
await expect(print.locator("[data-km-riso79-cavity-occlusion]")).toHaveCount(3);
await studio.getByRole("slider",{name:"RISO79 physical stock thickness"}).focus();
await studio.getByRole("slider",{name:"RISO79 physical stock thickness"}).press("End");
await expect(print).toHaveAttribute("data-km-riso79-paper-depth-mm","1.2");
await studio.locator("[data-km-riso79-film]").screenshot({path:info.outputPath("riso79-3x-thick-stock-cross-section-and-cavity-shadow.png"),animations:"disabled"});
await studio.getByRole("slider",{name:"RISO79 edge lamp angle"}).focus();
await studio.getByRole("slider",{name:"RISO79 edge lamp angle"}).press("Home");
await expect(print).toHaveAttribute("data-km-riso79-light-direction","1,0");
await expect(print.locator("linearGradient").first()).toHaveAttribute("x1","1");
await expect(print.locator("linearGradient").first()).toHaveAttribute("x2","0");
await studio.locator("[data-km-riso79-film]").screenshot({path:info.outputPath("riso79-3x-edge-lamp-from-right.png"),animations:"disabled"});
await studio.getByRole("slider",{name:"RISO79 physical stock thickness"}).press("Home");
for(let i=0;i<6;i++)await studio.getByRole("slider",{name:"RISO79 physical stock thickness"}).press("ArrowRight");
await expect(print).toHaveAttribute("data-km-riso79-paper-depth-mm","0.32");
await studio.locator("[data-km-riso79-film]").screenshot({path:info.outputPath("riso79-3x-diecut-fibres-spot-ink-detail.png"),animations:"disabled"});
expect(await printSignature(source)).toEqual(orig);
expect(await printSignature(cover)).toEqual(top);
await studio.getByRole("combobox",{name:"RISO79 source microscope zoom"}).selectOption("1");
await studio.getByRole("slider",{name:"RISO79 absolute film frame"}).focus();
await studio.getByRole("slider",{name:"RISO79 absolute film frame"}).press("Home");
await expect(studio).toHaveAttribute("data-km-riso79-phase","held");
await expect(print.locator("[data-km-riso79-insert-plane]")).toHaveAttribute("transform","translate(0 0)");
await studio.getByRole("slider",{name:"RISO79 absolute film frame"}).press("End");
await expect(studio).toHaveAttribute("data-km-riso79-phase","revealed");
await expect(print.locator("[data-km-riso79-insert-plane]")).not.toHaveAttribute("transform","translate(0 0)");
await expect(print.locator("[data-km-riso79-cut-fibre]").first()).toHaveAttribute("d",cut!);
expect(await printSignature(source)).toEqual(orig);
expect(await printSignature(cover)).toEqual(top);
await studio.locator("[data-km-riso79-film]").screenshot({path:info.outputPath("riso79-original-sliding-print-at-physical-endstop.png"),animations:"disabled"});
await studio.getByRole("combobox",{name:"RISO79 pull direction"}).selectOption("left");
await expect(print).toHaveAttribute("data-km-riso79-direction","left");
await expect(print.locator("[data-km-riso79-insert-plane]")).toHaveAttribute("transform",/translate\(-/);
await studio.getByRole("combobox",{name:"RISO79 pull direction"}).selectOption("up");
await expect(print.locator("[data-km-riso79-insert-plane]")).toHaveAttribute("transform",/translate\(0 -/);
await studio.getByRole("combobox",{name:"RISO79 pull direction"}).selectOption("down");
await expect(print.locator("[data-km-riso79-insert-plane]")).toHaveAttribute("transform",/translate\(0 [1-9]/);
await studio.getByRole("slider",{name:"RISO79 diecut window count"}).focus();
await studio.getByRole("slider",{name:"RISO79 diecut window count"}).press("Home");
await expect(print.locator("[data-km-riso79-cut-rim]")).toHaveCount(1);
await expect(print.locator("[data-km-riso79-cut-fibre]")).toHaveCount(88);
await studio.getByRole("combobox",{name:"RISO79 aspect"}).selectOption("portrait");
await expect(studio).toHaveAttribute("data-km-riso79-aspect","portrait");
await studio.getByRole("slider",{name:"RISO79 diecut window count"}).focus();
await studio.getByRole("slider",{name:"RISO79 diecut window count"}).press("End");
await expect(print.locator("[data-km-riso79-cut-rim]")).toHaveCount(3);
await expect(print.locator("[data-km-riso79-cut-fibre]")).toHaveCount(264);
await studio.locator("[data-km-riso79-film]").screenshot({path:info.outputPath("riso79-portrait-three-original-ink-windows.png"),animations:"disabled"});
await studio.getByRole("slider",{name:"RISO79 diecut window count"}).press("Home");
await expect(print.locator("[data-km-riso79-cut-rim]")).toHaveCount(1);
await studio.locator("[data-km-riso79-film]").screenshot({path:info.outputPath("riso79-portrait-original-kinetic-paper.png"),animations:"disabled"});
await studio.getByRole("checkbox",{name:"RISO79 reduced motion"}).check();
await studio.getByRole("button",{name:"Halfway reveal"}).click();
await expect(studio).toHaveAttribute("data-km-riso79-frame","110");
await expect(print).toHaveAttribute("data-km-riso79-progress","1");
expect(errors).toEqual([]);
});
