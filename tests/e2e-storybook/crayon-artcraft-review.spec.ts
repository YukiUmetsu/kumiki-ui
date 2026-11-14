import {expect,test} from "@playwright/test";

const samples=[
 {label:"wide",story:"video-crayon-wildlife--wildlife-hare-portrait",view:"0 0 960 540"},
 {label:"vertical",story:"video-crayon-wildlife--wildlife-hare-portrait-vertical",view:"0 0 540 960"},
] as const;

for(const item of samples){
 test("ArtCraft hare native Storybook QA: "+item.label,async({page},info)=>{
   const uncaught:string[]=[];
   page.on("pageerror",e=>uncaught.push(e.message));
   await page.goto("/iframe.html?id="+item.story+"&viewMode=story");
   const art=page.locator("svg[data-km-crayon-scene]");
   await expect(art).toBeVisible();
   await expect(art).toHaveAttribute("viewBox",item.view);
   await page.getByRole("button",{name:"Final artwork"}).click();
   await expect(art).toHaveAttribute("data-km-crayon-frame","239");
   const body=art.locator('[data-km-crayon-element="shoulder-silhouette"]');
   const muzzle=art.locator('[data-km-crayon-element="maxillary-junction"]');
   await expect(body).toBeAttached();
   await expect(muzzle).toBeAttached();
   await expect(muzzle.locator('[data-km-crayon-underpaint="opaque"]')).toHaveCount(1);
   await expect(art.locator('[data-km-crayon-anatomical-mask]').first()).toBeAttached();
   const finalMarkup=await art.evaluate(node=>node.outerHTML);
   const a=await art.screenshot({animations:"disabled",
     path:info.outputPath("hare-artcraft-"+item.label+"-239.png")});
   await page.getByRole("button",{name:"Eye & ear"}).click();
   await expect(art).toHaveAttribute("data-km-crayon-frame","82");
   const early=await art.screenshot({animations:"disabled"});
   expect(early).not.toEqual(a);
   await page.getByRole("button",{name:"Final artwork"}).click();
   const back=await art.evaluate(node=>node.outerHTML);
   expect(back).toBe(finalMarkup);
   expect(uncaught).toEqual([]);
 });
}

for(const [name,storyId,highlight] of [
 ["Eye","video-crayon-wildlife--wildlife-hare-eye-macro","eye-amber-iris"],
 ["Fur","video-crayon-wildlife--wildlife-hare-fur-macro","malar-ridge-shadow"],
 ["Muzzle","video-crayon-wildlife--wildlife-hare-muzzle-macro","maxillary-junction"],
 ["Ear","video-crayon-wildlife--wildlife-hare-ear-macro","near-ear-canal-shadow"],
] as const){
 test("ArtCraft native magnified "+name+" artwork, no editorial overlay",async({page},info)=>{
   const uncaught:string[]=[];
   page.on("pageerror",e=>uncaught.push(e.message));
   await page.goto("/iframe.html?id="+storyId+"&viewMode=story");
   const art=page.locator("svg[data-km-crayon-scene]");
   await expect(art).toBeVisible();
   await expect(art.locator('[data-km-crayon-element="'+highlight+'"]')).toBeAttached();
   await expect(art.locator('[data-km-crayon-element="headline"]')).toHaveCount(0);
   await page.getByRole("button",{name:"Final artwork"}).click();
   await expect(art).toHaveAttribute("data-km-crayon-frame","239");
   await art.screenshot({animations:"disabled",
     path:info.outputPath("hare-artcraft-macro-"+name.toLowerCase()+".png")});
   expect(uncaught).toEqual([]);
 });
}
