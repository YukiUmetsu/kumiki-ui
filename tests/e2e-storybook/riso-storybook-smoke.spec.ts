import {expect,test} from "@playwright/test";

/** Prove the entire Riso character Storybook group mounts without runtime faults.
 * These are deliberate small smoke checks, not pixel snapshots for every component.
 */
const stories=[
  ["Courier performance","video-riso-characters--paper-courier-performance"],
  ["Rigging microscope","video-riso-rig-lab--rigging-microscope"],
  ["Opaque print proof","video-riso-opaque-lab--opaque-print-proof"],
  ["Courier fine-mesh sheet","video-riso-character-model-sheets--courier-construction-sheet"],
  ["Bird fine-mesh sheet","video-riso-character-model-sheets--paper-bird-construction-sheet"],
] as const;
for(const [name,id] of stories){
  test(`RISO8 Storybook runtime: ${name}`,async({page},info)=>{
    const pageErrors:string[]=[],consoleErrors:string[]=[];
    page.on("pageerror",error=>pageErrors.push(error.message));
    page.on("console",message=>{
      if(message.type()==="error")consoleErrors.push(message.text());
    });
    await page.setViewportSize({width:1700,height:1200});
    const response=await page.goto(`/iframe.html?id=${id}&viewMode=story`,{waitUntil:"domcontentloaded"});
    expect(response?.status()).toBe(200);
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator("#storybook-root svg").first()).toBeVisible();
    // Storybook keeps its fallback error templates mounted but hidden in the
    // iframe DOM. Absence from the DOM is not the rendering contract: VISIBLE
    // error overlays and page/console exceptions are.
    await expect(page.getByText(/No Preview|Couldn't find story|Error rendering story/i).first())
      .toBeHidden({timeout:5000});
    await page.locator("#storybook-root").screenshot({
      path:info.outputPath(`${id}-storybook.png`),animations:"disabled",
    });
    expect(pageErrors,`Runtime exception in ${name}`).toEqual([]);
    expect(consoleErrors,`Console error in ${name}`).toEqual([]);
  });
}
