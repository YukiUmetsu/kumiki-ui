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
    entry.id.startsWith("video-chinese-ink-")||
    entry.id.startsWith("video-ink-")));
  const root="Video production/Film Looks/Chinese Ink/";
  // The seven leaves of the ink folder, plus the brush itself.
  const leaves=new Set(stories.map(story=>story.title.slice(root.length)));
  for(const leaf of ["Any Picture In Ink","Characters","Film","Ink Brush","Motifs",
    "Reveals And Transitions","Scenes","Titles And Seals"])expect([...leaves],leaf).toContain(leaf);
  for(const story of stories){
    expect(story.title.startsWith(root),story.id).toBe(true);
    // One flat Chinese Ink folder: titles end at their leaf, never extra folders.
    expect(story.title.split("/"),story.id).toHaveLength(4);
  }
});
