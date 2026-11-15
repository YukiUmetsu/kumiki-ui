import { test, expect } from "@playwright/test";

test("ArtCraft object atlas renders four material studies in both aspect ratios", async ({page}, info) => {
  await page.goto("/iframe.html?id=video-colored-pencil-science--object-material-atelier&viewMode=story");
  const artwork=page.locator('svg[data-km-colored-pencil]');
  const subject=page.getByRole("combobox",{name:"Object study"});
  const aspect=page.getByRole("combobox",{name:"Object output aspect"});
  const frame=page.getByRole("slider",{name:"Object drawing frame"});
  await expect(artwork).toBeVisible();
  const seek=async (n:number) => {
    await frame.evaluate((node,n)=>{
      const input=node as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set?.call(input,String(n));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    },n);
    await expect(artwork).toHaveAttribute("data-km-pencil-frame",String(n));
  };
  for (const output of ["landscape","portrait"] as const) {
    await aspect.selectOption(output);
    await expect(artwork).toHaveAttribute("viewBox",output==="landscape"?
      "0 0 960 540":"0 0 540 960");
    for (const item of ["rose","glass","architecture","fabric"] as const) {
      await subject.selectOption(item);
      await expect(page.locator('[data-km-pencil-object-study]')).toHaveAttribute(
        "data-km-pencil-object-study",item);
      await seek(325);
      await expect(artwork.locator('[data-km-pencil-region]')).not.toHaveCount(0);
      await artwork.screenshot({animations:"disabled",
        path:info.outputPath("pencil-object-"+item+"-"+output+".png")});
      await seek(40);
      await seek(325);
      await expect(artwork).toHaveAttribute("data-km-pencil-frame","325");
    }
  }
  await subject.selectOption("glass");
  await expect(artwork.locator('[data-km-pencil-support="pitcher"]')).toHaveCount(0);
  await expect(artwork.locator('[data-km-pencil-support="lemon"]')).toHaveCount(1);
  await page.getByRole("checkbox",{name:"Object reduced motion"}).check();
  await seek(0);
  await expect(artwork.locator('[data-km-pencil-support="lemon"]')).toHaveCount(1);
});
