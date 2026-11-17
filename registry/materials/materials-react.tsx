/**
 * MATL1 React pieces: rendered material swatches (a ball in a studio and a tile under raking light, from each
 * material's procedural texture), a material study with its scale and sources, a flat SVG material ball, weathering
 * strips, wet-and-dry pairs, a value ladder and the reference sheet.
 *
 * Swatches render on the CPU in workers (see `foundation-render.ts`) and are cached by their options.
 */
import { forwardRef, useId } from "react";
import type { CanvasHTMLAttributes, CSSProperties } from "react";
import { RenderFrame } from "../anatomy/foundation-render-react";
import { MATERIALS_RENDER_POOL } from "./materials-render-pool";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "../anatomy/foundation-react";
import type { MaterialFamily, MaterialRecord, WeatheringTrack } from "./materials-data";
import { MATERIAL_SOURCES, MATERIALS, WEATHERING } from "./materials-data";
import type { RGB } from "./materials-physics";
import { f0, findMaterial, highlightSpread, lightness, toHex, valueLadder, weathered, wetMaterial } from "./materials-physics";
import type { SwatchOptions } from "./materials-render";
import { TEXTURE_FACTS, materialTexture } from "./materials-texture";

const useMatId = () => `mat${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

export interface MaterialSwatchProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  /** Material id (`MATERIALS`). */
  material: string;
  options?: SwatchOptions;
  label?: string;
}
/**
 * A material rendered from its texture: a ball in a studio (`view: "ball"`, the default) or a tile under raking light
 * (`view: "tile"`). Renders in a worker, cached, with a visible working state.
 */
export const MaterialSwatch = forwardRef<HTMLCanvasElement, MaterialSwatchProps>(function MaterialSwatch({ material, options = {}, label, ...rest }, ref) {
  const size = Math.max(8, Math.round(options.size ?? 160)), m = findMaterial(material);
  const what = options.view === "tile" ? "tile under raking light" : "material ball";
  return <RenderFrame ref={ref} width={size} height={size} label={label ?? `${m?.name ?? material}, ${what}`} placeholder="var(--km-surface-subtle, #8d8c8b)"
    job={{ pool: MATERIALS_RENDER_POOL, kind: "material", args: { material, options } }} {...rest} />;
});

const NICE_MM = [1, 2, 5, 10, 20, 50, 100, 200];
/** A scale bar for a tile `extentMm` wide: the longest round length up to a third of it. */
export function ScaleBar({ extentMm }: { extentMm: number }) {
  const len = [...NICE_MM].reverse().find(v => v <= extentMm / 3) ?? NICE_MM[0], pct = (len / extentMm) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, ...sheetSmall }} aria-label={`Scale: the bar is ${len} mm; the tile is ${Math.round(extentMm)} mm wide`}>
      <span aria-hidden style={{ display: "block", width: `${pct}%`, minWidth: 8, height: 6, borderLeft: "2px solid currentColor", borderRight: "2px solid currentColor", borderBottom: "2px solid currentColor" }} />
      <span title={`Tile ${Math.round(extentMm)} mm wide`}>{len} mm</span>
    </div>
  );
}

export interface MaterialStudyProps { id: string; size?: number; wet?: number; record?: MaterialRecord; seed?: number; lightAzimuth?: number; lightElevation?: number; showFacts?: boolean }
/** A material as a ball and as a tile at its real scale, with what its texture is built from and the evidence. */
export function MaterialStudy({ id, size = 220, wet = 0, record, seed, lightAzimuth, lightElevation, showFacts = true }: MaterialStudyProps) {
  const tex = materialTexture(id, seed, record), m = record ?? findMaterial(id);
  const common: SwatchOptions = { size, wet, record, seed };
  const facts = tex.facts.map(f => TEXTURE_FACTS[f]).filter(Boolean);
  return (
    <figure style={{ margin: 0, display: "grid", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <MaterialSwatch material={id} options={{ ...common, view: "ball" }} />
        <div style={{ display: "grid", gap: 4, alignContent: "start" }}>
          <MaterialSwatch material={id} options={{ ...common, view: "tile", lightAzimuth, lightElevation }} />
          <ScaleBar extentMm={tex.extentMm} />
        </div>
      </div>
      <figcaption style={{ ...sheetSmall, display: "grid", gap: 4 }}>
        <span><b>{m?.name ?? id}</b>{m?.ja ? ` ${m.ja}` : ""}: {tex.note}</span>
        {showFacts && facts.length ? <ul style={{ ...sheetList, margin: 0 }}>{facts.map(f => <li key={f.label}>{f.label}: {f.value} ({f.grade}; {f.url ? <a href={f.url}>{f.source}</a> : f.source})</li>)}</ul> : null}
      </figcaption>
    </figure>
  );
}

const tileGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 };
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const add = (a: RGB, b: RGB): RGB => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export interface MaterialBallProps { material: MaterialRecord; albedo?: RGB; roughness?: number; metal?: 0 | 1; size?: number; label?: string }

/**
 * A material ball: a sphere lit by a key light from the upper left and a soft sky. A dielectric shows its albedo lit
 * and shaded, with a white highlight whose size follows roughness; a metal has no diffuse colour and reflects a bright
 * sky over a dark ground, tinted by its F0, the horizon between them blurred by roughness.
 */
export function MaterialBall({ material: m, albedo = m.albedo, roughness = m.roughness.typical, metal = m.metal, size = 72, label }: MaterialBallProps) {
  const id = useMatId(), F = metal ? albedo : f0(m), spread = highlightSpread(roughness), sky: RGB = [.55, .6, .68];
  const lit = metal ? scale(F, .95) : add(scale(albedo, 1), scale(sky, .02)), mid = metal ? scale(F, .55) : scale(albedo, .5), dark = metal ? scale(F, .08) : add(scale(albedo, .1), scale(sky, .01));
  // The highlight: smaller and brighter when smooth. Dielectrics reflect ~4% (white); metals their own colour.
  const hr = Math.max(.05, Math.min(.5, .06 + spread / 70)), hk = Math.min(1, (metal ? 1 : 6) * (1 - roughness) ** 2 * (metal ? 1 : F[0] * 12));
  const hl = metal ? F : ([1, 1, 1] as RGB);
  return (
    <svg role="img" aria-label={label ?? `${m.name} material ball`} viewBox="-1.1 -1.1 2.2 2.2" width={size} height={size} style={{ display: "block" }}>
      <defs>
        <radialGradient id={`${id}-d`} cx="-.35" cy="-.4" r="1.45" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={toHex(lit)} /><stop offset=".55" stopColor={toHex(mid)} /><stop offset="1" stopColor={toHex(dark)} />
        </radialGradient>
        {metal ? (
          <linearGradient id={`${id}-env`} x1="0" x2="0" y1="-1" y2="1" gradientUnits="userSpaceOnUse">
            {/* Sky above, ground below; the band near the horizon reflects the metal's own surroundings twice (F², deeper colour). */}
            <stop offset="0" stopColor={toHex(scale(F, .8))} /><stop offset={.42 - roughness * .2} stopColor={toHex(scale([F[0] * F[0], F[1] * F[1], F[2] * F[2]], .75))} />
            <stop offset={.5 + roughness * .25 + .02} stopColor={toHex(scale(F, .1))} /><stop offset="1" stopColor={toHex(scale(F, .22))} />
          </linearGradient>
        ) : null}
        <radialGradient id={`${id}-h`} cx="-.38" cy="-.42" r={hr} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={toHex(hl)} stopOpacity={hk} /><stop offset="1" stopColor={toHex(hl)} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="1.02" rx=".85" ry=".08" fill="#000" opacity=".12" />
      <circle r="1" fill={metal ? `url(#${id}-env)` : `url(#${id}-d)`} />
      {metal ? <circle r="1" fill={`url(#${id}-d)`} opacity=".35" /> : null}
      <circle r="1" fill={`url(#${id}-h)`} />
    </svg>
  );
}

function BallCard({ m, note, look = "rendered" }: { m: MaterialRecord; note?: string; look?: SheetLook }) {
  return (
    <figure style={{ margin: 0, display: "grid", justifyItems: "center", gap: 2, width: 104 }}>
      {look === "rendered" ? <div style={{ width: 104 }}><MaterialSwatch material={m.id} options={{ size: 112, supersample: 2 }} /></div> : <MaterialBall material={m} />}
      <figcaption style={{ ...sheetSmall, textAlign: "center", lineHeight: 1.3 }}>{m.name}{m.ja ? <><br />{m.ja}</> : null}<br />{m.metal ? "metal" : `L* ${lightness(m.albedo).toFixed(0)}`} · {m.grade}{note ? <><br />{note}</> : null}</figcaption>
    </figure>
  );
}

/** A weathering track as a strip of swatches over time. */
export function WeatheringStrip({ track, years, environment }: { track: WeatheringTrack; years: readonly number[]; environment?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {years.map(y => {
        const w = weathered(track, y, environment);
        return (
          <figure key={y} style={{ margin: 0, display: "grid", gap: 2, width: 76 }}>
            <div aria-hidden style={{ height: 34, borderRadius: 6, background: toHex(w.albedo), border: "1px solid var(--km-border-subtle, #cecac8)" }} />
            <figcaption style={{ ...sheetSmall, lineHeight: 1.25 }}>{y < 1 ? `${Math.round(y * 12)} mo` : `${y} y`}<br />{w.label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

const FAMILY_ORDER: MaterialFamily[] = ["metal", "metal-oxide", "lacquer", "wood", "plant", "paper", "plaster", "ceramic", "stone", "earth", "organic", "food", "glass", "ice", "liquid", "manmade"];
const FAMILY_LABEL: Record<MaterialFamily, string> = { metal: "Metals", "metal-oxide": "Rust and patina", lacquer: "Lacquer", wood: "Wood", plant: "Bamboo, rush and straw", paper: "Paper", plaster: "Plaster", ceramic: "Ceramics and tile", stone: "Stone", earth: "Earth and sand", organic: "Organic", glass: "Glass", ice: "Snow and ice", liquid: "Liquids", manmade: "Other" , food: "Food"};

export type SheetLook = "rendered" | "flat";
/** Materials to see up close: the organic ones first. */
export const UP_CLOSE = ["wood-light", "wood-mid", "wood-weathered", "bamboo-green", "bamboo-dry", "bamboo-old", "tatami-new", "tatami", "tatami-old", "thatch", "paper-washi", "paper-kraft", "cardboard", "leather", "grass", "charcoal", "granite", "marble", "brick", "rust", "bronze-old", "zinc"] as const;

/** The MATL1 reference sheet: rendered from the textures (`look: "rendered"`, default) or as flat SVG balls (`"flat"`, light and instant). */
export function MaterialsSheet({ look = "rendered" }: { look?: SheetLook } = {}) {
  const ladder = valueLadder(MATERIALS.filter(m => !m.metal && !["glass", "liquid", "ice"].includes(m.family) || m.id === "snow"));
  const wetIds = ["sand", "terracotta", "brick", "wood-light", "plaster-white", "paper-washi", "concrete", "tatami", "granite"];
  const house = ["wood-light", "plaster-white", "roof-tile-grey", "tatami", "paper-washi", "bamboo-dry", "thatch", "lacquer-black", "lacquer-red", "gold", "cast-iron", "bronze-old"];
  return (
    <div style={sheetGrid}>
      {FAMILY_ORDER.map(fam => {
        const list = MATERIALS.filter(m => m.family === fam);
        return list.length ? (
          <SheetCard key={fam} title={FAMILY_LABEL[fam]} wide={list.length > 6}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{list.map(m => <BallCard key={m.id} m={m} look={look} />)}</div>
            <ul style={{ ...sheetList, ...sheetSmall }}>{list.slice(0, 6).map(m => <li key={m.id}><b>{m.name}:</b> {m.look[0]}</li>)}</ul>
          </SheetCard>
        ) : null;
      })}
      {look === "rendered" ? (
        <SheetCard title="Up close: tiles under raking light" wide>
          <div style={tileGrid}>{UP_CLOSE.map(id => { const t = materialTexture(id), m = findMaterial(id); return (
            <figure key={id} style={{ margin: 0, display: "grid", gap: 4, alignContent: "start" }}>
              <MaterialSwatch material={id} options={{ view: "tile", size: 160, supersample: 2 }} />
              <ScaleBar extentMm={t.extentMm} />
              <figcaption style={{ ...sheetSmall, lineHeight: 1.3 }}><b>{m?.name ?? id}</b>: {t.note}</figcaption>
            </figure>
          ); })}</div>
          <p style={{ ...sheetSmall, margin: 0 }}>Each texture is built from the material's structure at its real size (rings, rushes, stalks, fibres, crystals), its tone and palette calibrated to measured CC0 ambientCG maps. A low key light from the upper left shows the relief.</p>
        </SheetCard>
      ) : null}
      <SheetCard title="A Japanese house" wide>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{house.map(id => findMaterial(id)).filter((m): m is MaterialRecord => !!m).map(m => <BallCard key={m.id} m={m} look={look} />)}</div>
      </SheetCard>
      <SheetCard title="Value ladder (L*)" wide>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ladder.map(({ m, L }) => (
            <div key={m.id} title={m.name} style={{ display: "grid", gap: 2, width: 76, alignContent: "start" }}>
              <div aria-hidden style={{ height: 28, borderRadius: 4, background: toHex(m.albedo), border: "1px solid var(--km-border-subtle, #cecac8)" }} />
              <span style={{ ...sheetSmall, fontSize: 12, lineHeight: 1.2 }}>{L.toFixed(0)} {m.name.split(" (")[0]}</span>
            </div>
          ))}
        </div>
        <p style={{ ...sheetSmall, margin: 0 }}>Lightness L* of each material's albedo (0 black, 100 white): what a painter's value scale sets. Snow and white paper sit near 95; charcoal and black lacquer near 13–16.</p>
      </SheetCard>
      <SheetCard title="Weathering" wide>
        <p style={{ ...sheetSmall, margin: 0 }}><b>Copper</b> (rural or industrial air): {WEATHERING.copper.note}</p>
        <WeatheringStrip track="copper" years={[0, .5, 2, 5, 10, 15, 20, 30]} />
        <p style={{ ...sheetSmall, margin: 0 }}><b>Copper by the sea</b> (about 8 years to green):</p>
        <WeatheringStrip track="copper" environment="marine" years={[0, .5, 2, 4, 6, 8]} />
        <p style={{ ...sheetSmall, margin: 0 }}><b>Wood outdoors:</b> {WEATHERING.wood.note}</p>
        <WeatheringStrip track="wood" years={[0, .1, .25, .5, 1, 3]} />
        <p style={{ ...sheetSmall, margin: 0 }}><b>Tatami</b> and <b>bamboo:</b> {WEATHERING.tatami.note} {WEATHERING.bamboo.note}</p>
        <WeatheringStrip track="tatami" years={[0, .25, .5, 1, 5, 15]} />
        <WeatheringStrip track="bamboo" years={[0, .25, .5, 5, 15, 30]} />
        <p style={{ ...sheetSmall, margin: 0 }}><b>Iron:</b> {WEATHERING.iron.note} <b>Lacquer:</b> {WEATHERING.lacquer.note}</p>
        <WeatheringStrip track="iron" years={[0, .02, .05, .5, 1, 2]} />
      </SheetCard>
      <SheetCard title="Wet and dry" wide>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {wetIds.map(id => findMaterial(id)).filter((m): m is MaterialRecord => !!m).map(m => {
            const w = wetMaterial(m, 1);
            return (
              <figure key={m.id} style={{ margin: 0, display: "grid", gap: 2, justifyItems: "center" }}>
                {look === "rendered" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 72px)", gap: 2 }}>
                    <MaterialSwatch material={m.id} options={{ view: "tile", size: 96, supersample: 2 }} label={`${m.name}, dry`} />
                    <MaterialSwatch material={m.id} options={{ view: "tile", size: 96, supersample: 2, wet: 1 }} label={`${m.name}, wet`} />
                  </div>
                ) : <div style={{ display: "flex", gap: 2 }}><MaterialBall material={m} size={56} label={`${m.name}, dry`} /><MaterialBall material={m} albedo={w.albedo} roughness={w.roughness} size={56} label={`${m.name}, wet`} /></div>}
                <figcaption style={{ ...sheetSmall, textAlign: "center" }}>{m.name.split(" (")[0]}<br />wet: {(w.darkening * 100).toFixed(0)}% of dry</figcaption>
              </figure>
            );
          })}
        </div>
        <p style={{ ...sheetSmall, margin: 0 }}>Porous materials darken when wet because water traps light inside them (Ångström; Lekner & Dorf 1988: sand measured 0.182 dry, 0.091 wet). Dark materials darken least in absolute terms; a water film adds gloss to everything.</p>
      </SheetCard>
      <SheetCard title="Sources" wide>
        <ul style={{ ...sheetList, ...sheetSmall }}>{MATERIAL_SOURCES.map(s => <li key={s.url}><a href={s.url}>{s.title}</a></li>)}</ul>
        <p style={{ ...sheetSmall, margin: 0 }}>Each material names its own source (the database's measurement or reference, an ambientCG map or a photograph).</p>
      </SheetCard>
    </div>
  );
}
