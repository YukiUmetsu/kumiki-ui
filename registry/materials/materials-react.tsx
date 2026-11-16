/**
 * MATL1 React pieces: a material ball (a sphere under one key light and a soft sky, from the record's albedo, F0 and
 * roughness), weathering strips, wet-and-dry pairs, a value ladder and the reference sheet.
 */
import { useId } from "react";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "../anatomy/foundation-react";
import type { MaterialFamily, MaterialRecord, WeatheringTrack } from "./materials-data";
import { MATERIAL_SOURCES, MATERIALS, WEATHERING } from "./materials-data";
import type { RGB } from "./materials-physics";
import { f0, findMaterial, highlightSpread, lightness, toHex, valueLadder, weathered, wetMaterial } from "./materials-physics";

const useMatId = () => `mat${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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

function BallCard({ m, note }: { m: MaterialRecord; note?: string }) {
  return (
    <figure style={{ margin: 0, display: "grid", justifyItems: "center", gap: 2, width: 104 }}>
      <MaterialBall material={m} />
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

const FAMILY_ORDER: MaterialFamily[] = ["metal", "metal-oxide", "lacquer", "wood", "plant", "paper", "plaster", "ceramic", "stone", "earth", "organic", "glass", "ice", "liquid", "manmade"];
const FAMILY_LABEL: Record<MaterialFamily, string> = { metal: "Metals", "metal-oxide": "Rust and patina", lacquer: "Lacquer", wood: "Wood", plant: "Bamboo, rush and straw", paper: "Paper", plaster: "Plaster", ceramic: "Ceramics and tile", stone: "Stone", earth: "Earth and sand", organic: "Organic", glass: "Glass", ice: "Snow and ice", liquid: "Liquids", manmade: "Other" };

/** The MATL1 reference sheet. */
export function MaterialsSheet() {
  const ladder = valueLadder(MATERIALS.filter(m => !m.metal && !["glass", "liquid", "ice"].includes(m.family) || m.id === "snow"));
  const wetIds = ["sand", "terracotta", "brick", "wood-light", "plaster-white", "paper-washi", "concrete", "tatami", "granite"];
  const house = ["wood-light", "plaster-white", "roof-tile-grey", "tatami", "paper-washi", "bamboo-dry", "thatch", "lacquer-black", "lacquer-red", "gold", "cast-iron", "bronze-old"];
  return (
    <div style={sheetGrid}>
      {FAMILY_ORDER.map(fam => {
        const list = MATERIALS.filter(m => m.family === fam);
        return list.length ? (
          <SheetCard key={fam} title={FAMILY_LABEL[fam]} wide={list.length > 6}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{list.map(m => <BallCard key={m.id} m={m} />)}</div>
            <ul style={{ ...sheetList, ...sheetSmall }}>{list.slice(0, 6).map(m => <li key={m.id}><b>{m.name}:</b> {m.look[0]}</li>)}</ul>
          </SheetCard>
        ) : null;
      })}
      <SheetCard title="A Japanese house" wide>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{house.map(id => findMaterial(id)).filter((m): m is MaterialRecord => !!m).map(m => <BallCard key={m.id} m={m} />)}</div>
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
                <div style={{ display: "flex", gap: 2 }}><MaterialBall material={m} size={56} label={`${m.name}, dry`} /><MaterialBall material={m} albedo={w.albedo} roughness={w.roughness} size={56} label={`${m.name}, wet`} /></div>
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
