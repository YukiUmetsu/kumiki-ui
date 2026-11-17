import {readFile} from "node:fs/promises";
import {test,expect} from "@playwright/test";

/** The test uploads its own synthetic screenshot as an IMAGE input; this
 * proves the annotation UI, not that any real physical press was scanned. */
test("RISO71 native Storybook annotates the uploaded source image at 1×/3× and keeps drums independent",
async({page},info)=>{
  test.setTimeout(120000);
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1450,height:1200});
  await page.goto("/iframe.html?id=video-riso-print-lab--risograph-shop-scan-proof&viewMode=story");
  const root=page.locator("[data-km-riso70-studio]");
  await expect(root).toHaveAttribute("data-km-riso70-ready","true");
  const templateDownload=page.waitForEvent("download");
  await page.getByRole("button",{name:"RISO70 download scan measurement template"}).click();
  const file=await templateDownload;
  const template=JSON.parse(await readFile((await file.path())!,"utf8")) as {
    sheetMm:[number,number];
    expectedMarksMm:Record<"top"|"bottom"|"left"|"right",[number,number]>;
  };
  // The PNG is a test-only screen capture; labels must NOT claim it is a press proof.
  const syntheticFixture=await page.screenshot({animations:"disabled"});
  await page.getByRole("combobox",{name:"RISO70 scan evidence source"})
    .selectOption("physical");
  const annotator=page.locator("[data-km-riso71-image-study]");
  await expect(annotator).toBeVisible();
  await expect(annotator).toHaveAttribute("data-km-riso71-count","0");
  await expect(root).toHaveAttribute("data-km-riso70-proof","unavailable");
  await page.getByLabel("RISO71 upload source scan image").setInputFiles({
    name:"synthetic-image-fixture.png",mimeType:"image/png",
    buffer:syntheticFixture,
  });
  const img=annotator.locator("[data-km-riso71-image]");
  await expect(img).toBeVisible();
  await expect.poll(()=>img.evaluate(e=>(e as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(1000);
  // Clicking a displayed, resized image sets a NATURAL source pixel.
  await page.getByRole("button",{name:/RISO71 click image to mark PAPER top left/})
    .click({position:{x:30,y:35}});
  await expect(annotator).toHaveAttribute("data-km-riso71-count","1");
  await expect(annotator.locator('[data-km-riso71-marker="paper:top-left"]'))
    .toHaveCount(1);
  // Manual coordinates are an equally important keyboard-accessible route.
  const [w,h]=template.sheetMm;
  const px=([x,y]:readonly [number,number]):[number,number]=>[
    80+x*1120/w,80+y*860/h,
  ];
  const observed:Record<string,[number,number]>={
    "paper:top-left":px([0,0]),
    "paper:top-right":px([w,0]),
    "paper:bottom-right":px([w,h]),
    "paper:bottom-left":px([0,h]),
  };
  for(const plate of ["blue","red"] as const)
    for(const id of ["top","bottom","left","right"] as const){
      const [x,y]=template.expectedMarksMm[id];
      observed[plate+":"+id]=px([
        x+(plate==="red"?1.25:0),
        y+(plate==="red"?-.6:0),
      ]);
    }
  for(const [key,value] of Object.entries(observed)){
    await annotator.locator('[data-km-riso71-target="'+key+'"]').click();
    await page.getByRole("spinbutton",{name:"RISO71 X image pixel"})
      .fill(String(value[0]));
    await page.getByRole("spinbutton",{name:"RISO71 Y image pixel"})
      .fill(String(value[1]));
    await annotator.getByRole("button",{name:"Set selected point"}).click();
  }
  await expect(annotator).toHaveAttribute("data-km-riso71-count","12");
  await expect(root).toHaveAttribute("data-km-riso70-proof","operator-measured");
  await expect(root).toHaveAttribute("data-km-riso70-within","true");
  await expect(root.locator("[data-km-riso70-relative-pair]"))
    .toContainText("Worst relative:");
  await expect(annotator.locator("[data-km-riso71-marker]")).toHaveCount(12);
  await annotator.screenshot({
    path:info.outputPath("riso71-reference-scan-1x-twelve-points.png"),
    animations:"disabled",
  });
  await page.getByRole("combobox",{name:"RISO71 microscope zoom"})
    .selectOption("3");
  await annotator.screenshot({
    path:info.outputPath("riso71-reference-scan-3x-spot-ink-microscope.png"),
    animations:"disabled",
  });
  // Changing original source frame invalidates mark IDs and observed positions.
  await page.getByRole("slider",{name:"RISO70 absolute source frame"})
    .evaluate((node)=>{
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      setter?.call(node,"182");
      node.dispatchEvent(new Event("input",{bubbles:true}));
      node.dispatchEvent(new Event("change",{bubbles:true}));
    });
  await expect(annotator).toHaveAttribute("data-km-riso71-count","0");
  await expect(root).toHaveAttribute("data-km-riso70-proof","unavailable");
  await expect(page.getByRole("textbox",{name:"RISO70 physical scan measurement JSON"}))
    .toHaveValue("");
  await annotator.getByRole("button",{name:"Clear all observations"}).click();
  await expect(annotator).toHaveAttribute("data-km-riso71-count","0");
  await page.getByRole("combobox",{name:"RISO70 scan evidence source"})
    .selectOption("synthetic");
  await expect(root).toHaveAttribute("data-km-riso70-proof","simulation-only");
  expect(errors).toEqual([]);
});
