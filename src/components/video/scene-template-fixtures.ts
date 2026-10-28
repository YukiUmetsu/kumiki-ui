/** Original, deterministic SVG fixture assets for Storybook and unit tests.
 * These are illustrations only; no inferred evidence or production footage. */
import type { ImageAsset, SceneRecipeId, SceneTemplateSpec } from "../../../registry/video/scene-templates";
export const recipeBase = {
  schemaVersion: 1 as const,
  recipeVersion: 1 as const,
  fps: { num:30,den:1 }, durationFrames:120, width:960,height:540,
  accent:"#9fd9ce", cueFrames:[25,55,90] as [number,number,number],
};
/** Deliberately different original art directions for cinematic QA.
 * The asset name selects an illustrative motif, not an external/AI stock image.
 * Every SVG stays self-contained so capture is deterministic and offline.
 */
export function demoAsset(id:string,label:string,fill="#477ba3"):ImageAsset {
  const defs=`<defs>
    <linearGradient id="sky" x1="0" y1="0" x2=".35" y2="1">
      <stop stop-color="${fill}"/><stop offset="1" stop-color="#07182f"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#eaf3f1"/><stop offset=".43" stop-color="#92b4bd"/>
      <stop offset="1" stop-color="#304e68"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2=".25">
      <stop stop-color="#a3e1ed" stop-opacity=".72"/><stop offset="1" stop-color="#27577b" stop-opacity=".38"/>
    </linearGradient>
    <radialGradient id="planet"><stop stop-color="#77cbd4"/><stop offset=".7" stop-color="#2e7197"/><stop offset="1" stop-color="#092b56"/></radialGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="13" stdDeviation="13" flood-color="#041b30" flood-opacity=".45"/>
    </filter>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" stroke="#cdeefa" opacity=".07" fill="none"/>
    </pattern>
  </defs>`;
  const base=`<rect width="800" height="500" fill="url(#sky)"/>
    <rect width="800" height="500" fill="url(#grid)"/>
    <circle cx="608" cy="135" r="170" fill="#bdeaf4" opacity=".08"/>`;
  const landscape=`<circle cx="607" cy="126" r="68" fill="#f2dfa8" opacity=".83"/>
    <path d="M0 400L160 232 276 340 419 174 620 376 715 252 800 332V500H0Z" fill="#8fbec0" opacity=".55"/>
    <path d="M0 424L136 294 281 405 462 238 620 415 747 330 800 377V500H0Z" fill="#275674"/>
    <path d="M0 468Q210 385 402 450T800 408V500H0Z" fill="#15344e"/>
    <g filter="url(#shadow)"><rect x="495" y="120" width="78" height="168" rx="10" fill="url(#metal)"/>
      <rect x="511" y="145" width="46" height="57" rx="6" fill="#2d6787"/>
      <path d="M534 95L500 123H567Z" fill="#edf6e8"/><rect x="522" y="225" width="26" height="52" rx="4" fill="#214361"/></g>`;
  const house=`<rect x="0" y="395" width="800" height="105" fill="#244a55"/>
    <path d="M145 246L389 95 646 246" fill="none" stroke="#f2e6c9" stroke-width="32" stroke-linejoin="round"/>
    <rect x="169" y="235" width="460" height="222" rx="9" fill="url(#metal)" filter="url(#shadow)"/>
    <rect x="225" y="282" width="105" height="90" rx="8" fill="#29546c" stroke="#e7f6ed" stroke-width="9"/>
    <rect x="462" y="282" width="108" height="90" rx="8" fill="#29546c" stroke="#e7f6ed" stroke-width="9"/>
    <rect x="358" y="330" width="74" height="127" rx="8" fill="#25445c"/>
    <path d="M175 417H625" stroke="#d6e5db" stroke-width="9" opacity=".65"/>`;
  const network=`<g fill="none" stroke="#9bdfe3" stroke-width="8" opacity=".72">
    <path d="M145 250C260 90 300 370 420 242S590 110 676 232"/>
    <path d="M145 250C292 400 520 395 676 232" stroke-dasharray="16 15" opacity=".6"/>
  </g><g fill="#183f5c" stroke="#cff8ec" stroke-width="12" filter="url(#shadow)">
    <circle cx="145" cy="250" r="63"/><circle cx="420" cy="242" r="73"/><circle cx="676" cy="232" r="62"/>
  </g><g fill="#a6e8c9"><circle cx="145" cy="250" r="22"/><circle cx="420" cy="242" r="26"/><circle cx="676" cy="232" r="21"/></g>`;
  const uiHighlight=id==="ui-selected"?"#36b49a":id==="ui-updated"?"#77a8d9":id==="ui-saved"?"#35bc83":"#b6d8de";
  const interfaceArt=`<rect x="108" y="63" width="584" height="385" rx="21" fill="#e8f3f5" filter="url(#shadow)"/>
    <path d="M129 63H671Q692 63 692 84V126H108V84Q108 63 129 63" fill="#244861"/>
    <circle cx="146" cy="96" r="8" fill="#f0a4a2"/><circle cx="172" cy="96" r="8" fill="#efd499"/>
    <circle cx="198" cy="96" r="8" fill="#8fd5b2"/>
    <rect x="140" y="160" width="160" height="248" rx="12" fill="#d5e6eb"/>
    <rect x="334" y="161" width="323" height="48" rx="9" fill="#f9fcfc" stroke="${uiHighlight}" stroke-width="4"/>
    <rect x="334" y="236" width="323" height="48" rx="9" fill="#f9fcfc" stroke="#b6d8de" stroke-width="4"/>
    <path d="M354 186H465M355 261H580" stroke="#7f9faa" stroke-width="7" stroke-linecap="round"/>
    <rect x="486" y="331" width="171" height="54" rx="12" fill="#217b78"/>
    <path d="M536 357H600" stroke="#e9fcf8" stroke-width="10" stroke-linecap="round"/>
    <rect x="159" y="189" width="115" height="13" rx="6" fill="#91b6bf"/>
    <rect x="159" y="243" width="91" height="13" rx="6" fill="#91b6bf"/>
    <rect x="159" y="297" width="105" height="13" rx="6" fill="#91b6bf"/>`;
  const documentArt=`<g filter="url(#shadow)"><rect x="205" y="35" width="390" height="430" rx="12" fill="#f9f4e8"/>
    <rect x="252" y="83" width="284" height="27" rx="5" fill="#466f83"/>
    <path d="M251 145H540M251 176H517M251 207H540M251 238H490M251 304H537M251 337H498M251 370H525"
      stroke="#9ab4bd" stroke-width="12" stroke-linecap="round"/>
    <rect x="241" y="160" width="310" height="104" rx="8" fill="#a4daca" fill-opacity=".19"
      stroke="#31a391" stroke-width="4"/>
    <circle cx="478" cy="405" r="34" fill="none" stroke="#369c87" stroke-width="8"/>
    <path d="M463 406L475 418 496 390" fill="none" stroke="#369c87" stroke-width="7"/></g>`;
  const exploded=`<g filter="url(#shadow)">
    <path d="M165 337L400 231 631 337 401 450Z" fill="#1a405b" stroke="#bde6e2" stroke-width="8"/>
    <path d="M170 270L401 164 633 270 402 375Z" fill="#64a5af" stroke="#d7f6ea" stroke-width="7"/>
    <path d="M178 208L402 105 626 208 401 309Z" fill="#a9d8ca" stroke="#effcf1" stroke-width="6"/>
    <path d="M200 151L403 63 604 151 400 242Z" fill="#d9f3dc" stroke="#ffffff" stroke-width="6"/>
    <path d="M401 242V309M170 270V337M633 270V337" stroke="#7ce0c5" stroke-dasharray="8 10" stroke-width="5"/></g>`;
  const globe=`<circle cx="400" cy="249" r="202" fill="url(#planet)" filter="url(#shadow)"/>
    <g stroke="#c9e9df" stroke-width="3" fill="none" opacity=".35">
    <ellipse cx="400" cy="249" rx="100" ry="201"/><ellipse cx="400" cy="249" rx="178" ry="201"/>
    <ellipse cx="400" cy="249" rx="202" ry="90"/><path d="M200 249H600"/></g>
    <path d="M292 105L357 117 386 171 365 221 329 224 328 287 290 300 245 264 221 221 240 165Z
      M460 167L517 143 558 179 580 249 540 280 524 344 464 379 455 318 428 265Z
      M352 318L417 331 435 391 405 429 367 407Z" fill="#7fc99c" opacity=".82"/>
    <circle cx="334" cy="167" r="44" fill="#d6f7f8" opacity=".19"/>`;
  const character=`<ellipse cx="396" cy="449" rx="150" ry="22" fill="#001524" opacity=".25"/>
    <g filter="url(#shadow)">
    <path d="M305 248Q205 210 240 335L328 348M491 248Q597 211 558 335L470 348" fill="#ad7b7d" stroke="#543b5d" stroke-width="9"/>
    <ellipse cx="403" cy="313" rx="130" ry="156" fill="#cba5b7" stroke="#604f68" stroke-width="11"/>
    <path d="M300 191L275 99 358 150M450 151L528 91 504 197" fill="#bd8eab" stroke="#604f68" stroke-width="11"/>
    <ellipse cx="360" cy="266" rx="41" ry="52" fill="#f7f4e9"/><ellipse cx="448" cy="266" rx="41" ry="52" fill="#f7f4e9"/>
    <circle cx="370" cy="274" r="14" fill="#2c344b"/><circle cx="437" cy="274" r="14" fill="#2c344b"/>
    <path d="M391 311L411 311 401 335Z" fill="#e4a46f"/>
    <path d="M366 370Q403 388 439 370" fill="none" stroke="#9b697d" stroke-width="7" stroke-linecap="round"/></g>`;
  const spacecraft=`<g filter="url(#shadow)">
    <path d="M400 52L524 323 444 294 402 414 354 294 276 323Z" fill="url(#metal)" stroke="#d8f8f3" stroke-width="9" stroke-linejoin="round"/>
    <path d="M366 219Q400 121 433 219V264H367Z" fill="#347aa0" stroke="#173b5b" stroke-width="8"/>
    <path d="M373 336L402 448 429 336" fill="#f2b47b"/></g>`;
  const glassOffice=`<g><path d="M0 420L90 420V170H236V420H310V88H458V420H520V214H690V420H800V500H0Z" fill="#174058"/>
    <path d="M110 203H220M110 247H220M110 290H220M110 334H220M330 133H437M330 184H437M330 234H437M330 284H437M542 255H667M542 301H667M542 345H667" stroke="#79b0c7" stroke-width="19" opacity=".55"/>
    <path d="M0 410Q340 375 800 433V500H0Z" fill="#102b46" opacity=".7"/></g>`;
  const idLower=id.toLowerCase();
  const motif=/^ui/.test(idLower)?interfaceArt
    :/^(source)$/.test(idLower)?documentArt
    :/^sphere$/.test(idLower)?globe
    :/^craft$/.test(idLower)?spacecraft
    :/^character$/.test(idLower)?character
    :/^(whole|outer|core|center)$/.test(idLower)?exploded
    :/^(subject|answer|object)$/.test(idLower)?network
    :/^(old|new|alt-a|alt-b)$/.test(idLower)?house
    :/^(page\d+)$/.test(idLower)?documentArt
    :/^glass-bg$/.test(idLower)?glassOffice
    :landscape;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">${defs}${base}${motif}</svg>`;
  return {id,src:"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg),alt:label,
    licenseRef:"original-generated-fixture"};
}
const a=(id:string,label:string,color?:string)=>demoAsset(id,label,color);
const base=recipeBase;
export const DEMO_SCENES: { [K in SceneRecipeId]: SceneTemplateSpec<K> } = {
  "question-reveal": {...base,id:"demo-question",recipeId:"question-reveal",
    content:{question:"Where does this signal go?",subject:a("subject","Illustrated communication system"),
      answer:"The receiver completes the route",answerVisual:a("answer","Receiver illustration","#43897a")}},
  "hidden-detail": {...base,id:"demo-hidden",recipeId:"hidden-detail",
    content:{subject:a("main","Illustrated landscape"),target:{x:.54,y:.18,width:.22,height:.35},
      detail:"A small detail changes the interpretation",context:"Look at the whole scene first"}},
  "before-after": {...base,id:"demo-before",recipeId:"before-after",
    content:{subjectId:"same-item",before:{id:"before",label:"Before",image:a("old","Initial condition","#7b6a75")},
      after:{id:"after",label:"After",image:a("new","Changed condition","#47857b")},
      changes:["Shape changed","Surface restored"]}},
  "side-by-side": {...base,id:"demo-side",recipeId:"side-by-side",
    content:{alternatives:[{id:"a",label:"Approach A",image:a("alt-a","Approach A"),note:"Lower setup cost"},
      {id:"b",label:"Approach B",image:a("alt-b","Approach B","#6585ab"),note:"Lower ongoing effort"}],
      criterion:"One comparison criterion",comparison:"Choose based on context, not an invented winner"}},
  "cause-effect": {...base,id:"demo-cause",recipeId:"cause-effect",
    content:{initial:"A system begins in state A",event:"An input is applied",
      links:["The first stage reacts","A second stage responds"],outcome:"A measured change is observed",
      qualification:"Illustrative mechanism; causality requires evidence"}},
  "scale-reveal": {...base,id:"demo-scale",recipeId:"scale-reveal",
    content:{subject:{label:"Subject",quantity:120},reference:{label:"Reference",quantity:40},
      unit:"units",mode:"proportional"}},
  "context-to-detail": {...base,id:"demo-detail",recipeId:"context-to-detail",
    content:{context:a("context","Wide illustrated context"),target:{x:.48,y:.2,width:.3,height:.45},
      detail:a("detail","Close view of a focal region","#639c84"),description:"The relevant part in context"}},
  "layered-cutaway": {...base,id:"demo-cutaway",recipeId:"layered-cutaway",
    content:{object:a("whole","Intact construction"),relationship:"Three interior layers interact",
      reconstructed:true,layers:[{id:"shell",label:"Outer shell",image:a("outer","Outer layer")},
        {id:"core",label:"Middle core",image:a("core","Core","#73929d")},
        {id:"center",label:"Inner center",image:a("center","Interior","#a08579")}] }},
  "build-and-connect": {...base,id:"demo-connect",recipeId:"build-and-connect",
    content:{nodes:[{id:"input",label:"Input"},{id:"logic",label:"Processing"},{id:"result",label:"Output"}],
      connections:[{from:"input",to:"logic"},{from:"logic",to:"result"}],result:"A connected system"}},
  "transform-and-track": {...base,id:"demo-transform",recipeId:"transform-and-track",
    content:{source:[{id:"a",label:"Entity A"},{id:"b",label:"Entity B"}],
      destination:[{id:"a-next",label:"Entity A moved"},{id:"b-next",label:"Entity B moved"}],
      mapping:[{from:"a",to:"a-next"},{from:"b",to:"b-next"}],changedProperty:"Position changed, identity retained"}},
  "time-evolution": {...base,id:"demo-evolve",recipeId:"time-evolution",
    content:{milestones:[{id:"m1",date:"2020-01-01",label:"Baseline",image:a("past","Baseline")},
      {id:"m2",date:"2022-01-01",label:"Transition"},{id:"m3",date:"2024-01-01",label:"Outcome",image:a("future","Outcome")}],
      baseline:"The initial state",outcome:"The final recorded state"}},
  "data-story": {...base,id:"demo-data",recipeId:"data-story",
    content:{data:[{id:"a",label:"Period A",value:12},{id:"b",label:"Period B",value:18},
      {id:"c",label:"Period C",value:23}],unit:"items",source:"Original demo data, not empirical evidence",
      insight:"Change becomes clear when values are compared",baseline:0}},
  "consequence-chain": {...base,id:"demo-consequence",recipeId:"consequence-chain",
    content:{event:"A change is introduced",impacts:["First dependency responds","Second dependency adapts",
      "Third dependency changes"],outcome:"The system reaches another state",
      uncertainty:"Illustrated conditional chain"}},
  "decision-branch": {...base,id:"demo-branch",recipeId:"decision-branch",
    content:{decision:"Choose an approach",options:[
      {id:"a",label:"Path A",condition:"Under condition A",outcome:"Result A"},
      {id:"b",label:"Path B",condition:"Under condition B",outcome:"Result B"},
      {id:"c",label:"Path C",condition:"Under condition C",outcome:"Result C"}]}},
  "worked-example": {...base,id:"demo-worked",recipeId:"worked-example",
    content:{startingCase:"Begin with 3 + 4",operations:[{id:"add",instruction:"Add the values",intermediate:"3 + 4 = 7"},
      {id:"double",instruction:"Double the result",intermediate:"7 × 2 = 14"}],result:"14"}},
  "demonstration": {...base,id:"demo-demo",recipeId:"demonstration",
    content:{setup:a("ui","Illustrative interface mockup"),target:"Edit the field and save",
      actions:["Select the field","Enter the updated value","Apply the change"],
      states:[a("ui-selected","Field selected"),a("ui-updated","Updated form values"),a("ui-saved","Saved form state")],
      actionTargets:[{x:.40,y:.30,width:.37,height:.14},{x:.40,y:.47,width:.37,height:.14},
        {x:.6,y:.64,width:.23,height:.14}],
      result:"The visible field reflects the saved value",simulated:true}},
  "guided-inspection": {...base,id:"demo-inspect",recipeId:"guided-inspection",
    content:{scene:a("surface","Illustrated scene with focus targets"),targets:[
      {id:"region-a",label:"Upper region",region:{x:.1,y:.1,width:.28,height:.28}},
      {id:"region-b",label:"Lower region",region:{x:.46,y:.52,width:.31,height:.29}}],
      summary:"See both regions as part of a whole"}},
  "character-discovery": {...base,id:"demo-character",recipeId:"character-discovery",
    content:{character:a("character","Illustrative presenter","#947b9a"),
      subject:a("object","Discovered subject"),attentionTarget:"What is this object?",
      reaction:"A clue appears",reveal:"The subject is identified"}},
  "evidence-reveal": {...base,id:"demo-evidence",recipeId:"evidence-reveal",
    content:{claim:"The observation matches the supplied reading",
      evidence:a("source","Illustrative evidence source"),
      source:"Demonstration document, not a real research citation",
      excerpt:"This is an explicitly fictional source excerpt",qualification:"Replace demo with verifiable evidence",
      region:{x:.2,y:.26,width:.56,height:.31}}},
  "environment-reveal": {...base,id:"demo-environment",recipeId:"environment-reveal",
    content:{environment:a("world","Environment","#365b87"),
      foreground:a("foreground","Foreground layer","#396b6d"),
      focal:a("focal","Revealed subject","#6b8f95"),title:"The subject emerges",
      focalAnchor:{x:.52,y:.46},camera:{from:{x:.3,y:.35,zoom:1},to:{x:.5,y:.5,zoom:1.25}},
      atmosphere:{tint:"#164362",opacity:.13}}},
  "page-turn-story": {...base,id:"demo-book",recipeId:"page-turn-story",
    content:{documentTitle:"A short illustrated story",direction:"right",
      paper:{color:"#f5ead7",ink:"#26344b",shadowOpacity:.28},
      pages:[{id:"p1",heading:"Opening",image:a("page1","First page"),text:"First observation"},
        {id:"p2",heading:"Discovery",image:a("page2","Second page","#7f8074"),text:"Second observation"},
        {id:"p3",heading:"Conclusion",image:a("page3","Final page","#517c8e"),text:"Final observation"}]}},
  "orbit-world": {...base,id:"demo-world",recipeId:"orbit-world",
    content:{globe:a("sphere","Illustrative globe"),placement:"geographic",
      locations:[{id:"tokyo",label:"Tokyo",latitude:35.68,longitude:139.69},
        {id:"nyc",label:"New York",latitude:40.71,longitude:-74.01},
        {id:"london",label:"London",latitude:51.5,longitude:-.12}],
      subject:a("craft","Illustrative craft","#95a3b8")}},
  "timeline-journey": {...base,id:"demo-timeline",recipeId:"timeline-journey",
    content:{spacing:"equal",narrative:"Three milestones in chronological order",
      events:[{id:"a",date:"2000-01-01",label:"Beginning",image:a("tl1","Timeline start")},
        {id:"b",date:"2010-01-01",label:"Middle",image:a("tl2","Timeline middle","#728f99")},
        {id:"c",date:"2020-01-01",label:"End",image:a("tl3","Timeline final","#a1838d")}] }},
  "glass-data-reveal": {...base,id:"demo-glass",recipeId:"glass-data-reveal",
    content:{background:a("glass-bg","Soft illustrated background","#5a7d9b"),
      material:{tint:"#d7edf9",opacity:.2,blurPx:9,borderColor:"rgba(228,246,255,.7)"},
      panels:[{id:"stats",label:"First insight",text:"A focused message"},
        {id:"meaning",label:"Second insight",text:"A useful interpretation"}],
      data:[{id:"d1",label:"A",value:4},{id:"d2",label:"B",value:8},{id:"d3",label:"C",value:12}],unit:"items"}},
};
export const SCENE_IDS=Object.keys(DEMO_SCENES) as SceneRecipeId[];
