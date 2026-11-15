import { expect, test } from "@playwright/test";

/** Guard actual Storybook navigation, not just source-file naming.
 * Avoid clone stories in Film Looks root that silently diverge from the film.
 */
test("every Chinese ink story is grouped under one Film Looks folder",async({page})=>{
  const response=await page.request.get("/index.json");
  expect(response.ok()).toBe(true);
  const index=await response.json() as {
    entries:Record<string,{id:string;title:string;type:string}>,
  };
  const stories=Object.values(index.entries).filter(entry=>
    entry.type==="story"&&(
    entry.id.startsWith("video-chinese-ink-looks--")||
    entry.id.startsWith("video-ink-")));
  const root="Video production/Film Looks/Chinese Ink/";
  expect(stories.length).toBeGreaterThanOrEqual(18);
  const folders=stories.map(entry=>entry.title);
  for(const story of stories){
    expect(story.title.startsWith(root),story.id).toBe(true);
    // One flat Chinese Ink folder: titles end at their leaf, never extra folders.
    expect(story.title.split("/"),story.id).toHaveLength(4);
  }
  for(const folder of [
    "Studio","Ink Brush","Ink Wash Film Stage","Multi-Genre Film",
    "Character Performance","Character Director","Ensemble",
  ])expect(folders).toContain(root+folder);
  expect(index.entries["video-film-looks--chinese-ink-painting"]).toBeUndefined();
  for(const kind of ["painting","documentary","character"])
    expect(index.entries["video-chinese-ink-looks--chinese-ink-"+kind]?.title).toBe(root+"Studio");
});


test("all Shanshui and ArtCraft studios remain direct leaves in one Chinese Ink folder",async({page})=>{
  const response=await page.request.get("/index.json");
  expect(response.ok()).toBe(true);
  const index=await response.json() as {
    entries:Record<string,{id:string;title:string;type:string}>,
  };
  const root="Video production/Film Looks/Chinese Ink/";
  const expected=new Map([
    ["video-ink-shanshui","Shanshui Film Gallery"],
    ["video-ink-scholar-proportions","Shanshui Proportion Studio"],
    ["video-ink-reader-face","Shanshui Reader Face Studio"],
  ]);
  for(const [id,folder] of expected){
    const matches=Object.values(index.entries).filter(entry=>
      entry.type==="story"&&entry.id.startsWith(id+"--"));
    expect(matches.length,id).toBeGreaterThan(0);
    for(const entry of matches)expect(entry.title,entry.id).toBe(root+folder);
  }
  // Prevent scattered Shanshui studies from spawning duplicate sidebar groups.
  for(const entry of Object.values(index.entries).filter(entry=>entry.type==="story")){
    if(/shanshui|scholar-proportions|reader-face/i.test(entry.id))
      expect(entry.title.startsWith(root),entry.id).toBe(true);
  }
});
