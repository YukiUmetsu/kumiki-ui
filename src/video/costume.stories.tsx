import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CostumeFigure, CostumeSheet, GarmentCard, OutfitCard } from "../../registry/costume/costume-react";
import { GARMENTS } from "../../registry/costume/costume-data";
import { FABRIC_BENDING, FOLD_RULES, bendingLength } from "../../registry/costume/costume-drape";
import { garmentShape } from "../../registry/costume/costume-shapes";
import { findGarments, findOutfits, parseCostumeQuery } from "../../registry/costume/costume-query";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)", width: "min(100%, 640px)" } as const;

function SheetStory() {
  return <main style={page}><h1 style={{ margin: 0, font: "600 22px var(--km-font-sans, system-ui, sans-serif)" }}>Clothing and costume (COSTUME1)</h1><CostumeSheet /></main>;
}

const EXAMPLES = ["region:eastern-asia year:1700 worn:women", "era:victorian", "region:africa occasion:ceremonial", "climate:cold", "country:JP slot:feet", "silk slot:outer", "region:europe year:1590"];

/** Type tags, see the garments and outfits that match. */
function Finder() {
  const [q, setQ] = useState(EXAMPLES[0]);
  const garments = findGarments(q), outfits = findOutfits(q);
  return (
    <main style={page}>
      <label style={{ display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" }}>Tags
        <input style={field} value={q} onChange={e => setQ(e.target.value)} aria-describedby="costume-help" />
      </label>
      <p id="costume-help" style={{ margin: 0, font: "13px var(--km-font-sans, system-ui, sans-serif)" }}>
        Facets: region, country, culture, year, from, to, era, worn, role, occasion, slot, cut, fabric, climate, tag; other words search the text. Try: {EXAMPLES.map(e => <button key={e} type="button" onClick={() => setQ(e)} style={{ margin: "0 6px 6px 0" }}>{e}</button>)}
      </p>
      <code style={{ font: "12px ui-monospace, monospace" }}>{JSON.stringify(parseCostumeQuery(q))}</code>
      <h2 style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui, sans-serif)" }}>{outfits.length} outfits</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{outfits.map(o => <OutfitCard key={o.id} o={o} />)}</div>
      <h2 style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui, sans-serif)" }}>{garments.length} garments</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>{garments.map(g => <GarmentCard key={g.id} g={g} />)}</div>
    </main>
  );
}

/** Folds and garment details up close (costume-drape.ts): fold size from each cloth's stiffness, necklines, signatures and patterns. */
function DrapeDetail() {
  const ids = ["kimono", "furisode", "hakama", "haori", "junihitoe", "cheongsam", "hanbok", "sari", "toga", "kilt", "suit", "frock-coat", "dirndl", "kente", "chiton", "crinoline"];
  return (
    <main style={page}>
      <p style={{ margin: 0, font: "13px/1.5 var(--km-font-sans, system-ui, sans-serif)" }}>Folds hang about four bending lengths apart: soft silk in many narrow folds, wool broader, stiff cloth in few. {FOLD_RULES[2]} Crossed collars are always left over right (a "y" seen from the front); drapes go over the wearer's left shoulder.</p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>{ids.map(id => { const g = GARMENTS.find(x => x.id === id)!, s = garmentShape(g); return (
        <figure key={id} style={{ margin: 0, display: "grid", gap: 4 }}><CostumeFigure garments={[g]} height={320} />
          <figcaption style={{ font: "12px/1.4 var(--km-font-sans, system-ui, sans-serif)" }}><b>{g.name}</b> · {g.fabrics?.find(f => FABRIC_BENDING[f.toLowerCase()]) ?? "cotton (default)"}, bending length {(bendingLength(g) * 100).toFixed(1)} cm{s.drapeInfo ? `, ${s.drapeInfo.count} folds across the front` : ""}{s.neckline !== "none" ? ` · ${s.neckline} neck` : ""}{s.pattern !== "none" ? ` · ${s.pattern}` : ""}</figcaption></figure>); })}</div>
    </main>
  );
}

const meta = { title: "Video production/Art Foundations/Clothing and Costume", id: "video-costume", component: SheetStory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SheetStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sheet: Story = { render: () => <SheetStory /> };
export const FinderStory: Story = { name: "Costume finder", render: () => <Finder /> };
export const Drape: Story = { name: "Drape and details", render: () => <DrapeDetail /> };
