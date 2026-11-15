import {test,expect} from "@playwright/test";

const story="/iframe.html?id=film-art-watercolour-master-studies--master-craft-study&viewMode=story";
const chapters=[
  {button:"Botanical observation",subject:"botanical-flower",countAttribute:"data-km-joined-petals",count:"13"},
  {button:"Light on water",subject:"estuary-boat",countAttribute:"data-km-rope-attachments",count:"mast,bow,stern"},
  {button:"Architectural shadows",subject:"courtyard-construction",countAttribute:"data-km-roof-courses",count:"4"},
] as const;

for(const ratio of ["landscape","portrait"] as const){
  test("ArtCraft watercolor "+ratio+": authored contours are visible at production resolution",async({page},info)=>{
    await page.goto(story);
    await page.evaluate(()=>document.fonts.ready);
    await page.getByRole("combobox",{name:"Master studies output"}).selectOption(ratio);
    await page.getByRole("checkbox",{name:"Full-canvas watercolor artwork"}).check();
    const canvas=page.getByRole("img",{name:/original watercolor illustration/});
    for(const [i,chapter] of chapters.entries()){
      await page.getByRole("button",{name:chapter.button}).click();
      const subjects=page.locator('[data-km-reference-subject="'+chapter.subject+'"]');
      await expect(subjects.first()).toBeVisible();
      await expect(subjects.first()).toHaveAttribute(chapter.countAttribute,chapter.count);
      const pigment=page.locator("[data-km-subject-pigment] svg[data-km-wet-paper]");
      await expect(pigment).toBeVisible();
      await canvas.screenshot({animations:"disabled",
        path:info.outputPath("wc8-"+ratio+"-"+i+"-reference-constructed.png")});
    }
    const boat=page.getByRole("button",{name:"Light on water"});
    await boat.click();
    await expect(page.locator("[data-km-figure-connected]")).toHaveCount(1);
    await expect(page.locator("[data-km-wake-root]")).toHaveCount(14);
    const root=page.getByRole("slider",{name:"Master studies film frame"});
    await root.evaluate(node=>{
      const el=node as HTMLInputElement;
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(!setter)throw Error("missing slider setter");
      setter.call(el,"777");
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
    });
    await expect(page.locator("[data-km-reference-subject='estuary-boat']")).toBeVisible();
  });
}
