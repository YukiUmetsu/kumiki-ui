import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HAIR_COLOR_PRESETS, MONK_SKIN_TONES } from "../../registry/anatomy/anatomy-color";
import { EMOTIONS } from "../../registry/anatomy/expression-facs";
import { EYE_SHAPES, IRIS_TYPES } from "../../registry/anatomy/eye-detail";
import { beautifulFace } from "../../registry/anatomy/face-beauty";
import type { Portrait, PortraitOptions } from "../../registry/anatomy/face-portrait";
import { FacePortrait } from "../../registry/anatomy/face-portrait-react";
import { HAIRSTYLES } from "../../registry/anatomy/hair-groom";
import { basePalette, blushOn, BLUSH_FAMILIES, BLUSH_FOR, labToHex, lipColour, LIP_FAMILIES, readSkin, RED_FOR } from "../../registry/anatomy/makeup-color";
import type { BlushFamily, LipFamily, Undertone } from "../../registry/anatomy/makeup-color";
import { FACE_SHAPE_RULES, findLook, MAKEUP_LEARNED, MAKEUP_LOOKS } from "../../registry/anatomy/makeup-data";
import type { FaceShape, Look, LookLayer } from "../../registry/anatomy/makeup-data";
import { designMakeup } from "../../registry/anatomy/makeup-design";
import type { MakeupPlan } from "../../registry/anatomy/makeup-design";
import { paintPhoto, wornFace } from "../../registry/anatomy/makeup-paint";
import { BeautyCorrelations, FaceChart, LearnedContrast, LearnedEffects, MakeupChecks, MakeupEvidenceList, MakeupPortrait, MakeupSwatches, UndertonePlane } from "../../registry/anatomy/makeup-react";
import { findZone } from "../../registry/anatomy/makeup-zones";
import type { FinishId } from "../../registry/anatomy/makeup-zones";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const label = { display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" } as const;
const muted = { margin: 0, color: "var(--km-text-muted, #4e4d4d)", font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" } as const;
const h3 = { margin: "8px 0 0", font: "650 17px/1.3 var(--km-font-sans, system-ui, sans-serif)" } as const;
const grid = (min: number) => ({ display: "grid", gap: 14, gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${min}px), 1fr))` }) as const;

const SKINS = ["#f1d3bd", "#e6c0a4", "#d8a98a", "#c99a7e", "#b3825f", "#8d5a3b", "#6d452f", "#4b2e20"];
const skinLabel = (hex: string) => { const s = readSkin(hex); return `${hex} · ${s.category}, ${s.undertone}`; };
const hairOf = (id: string) => { const h = HAIR_COLOR_PRESETS.find(p => p.id === id) ?? HAIR_COLOR_PRESETS[1]; return { eumelanin: h.eumelanin, pheomelanin: h.pheomelanin }; };

// ---- Makeup lab ---------------------------------------------------------------------------------------------------------

type Group = "base" | "sculpt" | "cheeks" | "eyes" | "liner" | "brows" | "lips";
const GROUPS: Record<Group, string> = { base: "Base (foundation, concealer)", sculpt: "Sculpt (contour, highlight, bronzer)", cheeks: "Blush", eyes: "Eyeshadow", liner: "Liner", brows: "Brows", lips: "Lips" };
const groupOf = (zone: string): Group => {
  const p = findZone(zone).product;
  if (p === "foundation" || p === "concealer" || p === "corrector" || p === "powder") return "base";
  if (p === "contour" || p === "bronzer") return "sculpt";
  if (p === "highlight") return zone === "inner-corner" ? "eyes" : "sculpt";
  if (p === "blush") return "cheeks";
  if (p === "eyeshadow") return "eyes";
  if (p === "liner") return "liner";
  if (p === "brow") return "brows";
  return "lips";
};
const BLUSH_ZONES = ["blush-apples", "blush-lifted", "blush-draped", "blush-igari", "blush-sunkissed"];
const FINISHES: FinishId[] = ["matte", "velvet", "satin", "dewy", "glossy", "shimmer", "metallic", "glitter"];

interface LabState {
  look: string; intensity: number; compare: boolean; sex: number; skin: string; undertone: "" | Undertone; eyes: string; eyeShape: string; hair: string; hairStyle: string;
  faceShape: "" | FaceShape; groups: Record<Group, boolean>; blushZone: string; blushFamily: "" | BlushFamily; lipFamily: "" | LipFamily | "red"; contour: number;
  foundationFinish: "" | FinishId; highlightFinish: "" | FinishId; wing: "look" | "none" | "short" | "long"; mascara: number; expression: string; yaw: number; keyAzimuth: number;
  faceWidth: number; lowerFace: number;
}

/** A look changed by the lab's controls (all as data: the same changes an agent can make). */
function labLook(s: LabState): Look {
  const base = findLook(s.look)!;
  let layers: LookLayer[] = base.layers.filter(l => s.groups[groupOf(l.zone)]).map(l => {
    const p = findZone(l.zone).product;
    if (p === "blush") return { ...l, zone: s.blushZone || l.zone, colour: s.blushFamily ? { kind: "blush", family: s.blushFamily } : l.colour };
    if ((l.zone === "lips" || l.zone === "lip-liner") && s.lipFamily) return { ...l, colour: { kind: "lip", family: s.lipFamily } };
    if (l.zone === "cheek-contour" && s.contour) return { ...l, colour: { kind: "skin", dL: s.contour, da: -1, db: -3 } };
    if (l.zone === "foundation" && s.foundationFinish) return { ...l, finish: s.foundationFinish };
    if (p === "highlight" && s.highlightFinish && l.zone !== "inner-corner") return { ...l, finish: s.highlightFinish };
    if (l.zone === "liner-wing" && s.wing !== "look") return { ...l, adjust: { ...l.adjust, scale: s.wing === "short" ? 0.7 : 1.3 } };
    return l;
  });
  if (s.wing === "none") layers = layers.filter(l => l.zone !== "liner-wing");
  const liner = layers.find(l => l.zone === "liner");
  if ((s.wing === "short" || s.wing === "long") && liner && !layers.some(l => l.zone === "liner-wing")) layers.push({ zone: "liner-wing", colour: liner.colour, coverage: liner.coverage, adjust: { scale: s.wing === "short" ? 0.7 : 1.3 } });
  return { ...base, layers };
}

function Select<T extends string>({ name, value, onChange, options }: { name: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[] }) {
  return <label style={label}>{name}<select style={field} value={value} onChange={e => onChange(e.target.value as T)}>{options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>;
}
function Range({ name, value, onChange, min, max, step, fmt = (v: number) => String(v) }: { name: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; fmt?: (v: number) => string }) {
  return <label style={label}>{name}: {fmt(value)}<input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset style={{ display: "grid", gap: 8, border: "1px solid var(--km-border-subtle, #ddd6cf)", borderRadius: 8, padding: "8px 10px 10px", margin: 0 }}><legend style={{ font: "650 13px var(--km-font-sans, system-ui)", padding: "0 4px" }}>{title}</legend>{children}</fieldset>;
}

function Lab() {
  const [s, setS] = useState<LabState>({ look: "soft-glam", intensity: 1, compare: false, sex: 0, skin: "#d8a98a", undertone: "", eyes: "brown", eyeShape: "almond", hair: "dark-brown", hairStyle: "bun",
    faceShape: "", groups: { base: true, sculpt: true, cheeks: true, eyes: true, liner: true, brows: true, lips: true }, blushZone: "", blushFamily: "", lipFamily: "", contour: 0,
    foundationFinish: "", highlightFinish: "", wing: "look", mascara: 0, expression: "", yaw: 0, keyAzimuth: -22, faceWidth: 1, lowerFace: 0 });
  const set = <K extends keyof LabState>(k: K, v: LabState[K]) => setS(prev => ({ ...prev, [k]: v }));
  const portrait: PortraitOptions = { sex: s.sex, skin: s.skin, eyes: s.eyes, eyeShape: s.eyeShape, hair: hairOf(s.hair), hairStyle: s.hairStyle, faceWidth: s.faceWidth, lowerFace: s.lowerFace,
    expression: s.expression || undefined, yaw: s.yaw, keyAzimuth: s.keyAzimuth, width: 384, height: 480, makeup: "none" };
  const face = useMemo(() => beautifulFace(portrait).vertices, [s.sex, s.faceWidth, s.lowerFace, s.eyeShape]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan: MakeupPlan = useMemo(() => {
    const p = designMakeup({ look: labLook(s), skin: s.skin, eyes: s.eyes, eyeShape: s.eyeShape, hair: hairOf(s.hair), face, intensity: s.intensity, undertone: s.undertone || undefined, faceShape: s.faceShape || undefined });
    return s.mascara ? { ...p, lashes: { ...p.lashes, length: p.lashes.length * (1 + s.mascara), thickness: p.lashes.thickness * (1 + s.mascara * 0.8) } } : p;
  }, [s, face]);
  const skinOpts = [...SKINS, ...MONK_SKIN_TONES.map(t => t.hex)].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <div style={{ ...page, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
      <div style={{ display: "grid", gap: 10, alignContent: "start", maxWidth: 380 }}>
        <h2 style={{ margin: 0, font: "700 20px var(--km-font-sans, system-ui)" }}>Makeup lab</h2>
        <Section title="Look">
          <Select name="Look" value={s.look} onChange={v => set("look", v)} options={MAKEUP_LOOKS.map(l => [l.id, l.label] as const)} />
          <Range name="Intensity" value={s.intensity} onChange={v => set("intensity", v)} min={0} max={1.5} step={0.05} fmt={v => `${Math.round(v * 100)}%`} />
          <label style={{ ...label, gridAutoFlow: "column", justifyContent: "start", alignItems: "center", gap: 8 }}><input type="checkbox" checked={s.compare} onChange={e => set("compare", e.target.checked)} />Show bare beside it</label>
        </Section>
        <Section title="Products">
          {(Object.keys(GROUPS) as Group[]).map(g => <label key={g} style={{ ...label, gridAutoFlow: "column", justifyContent: "start", alignItems: "center", gap: 8, fontWeight: 500 }}>
            <input type="checkbox" checked={s.groups[g]} onChange={e => set("groups", { ...s.groups, [g]: e.target.checked })} />{GROUPS[g]}</label>)}
          <Range name="Contour depth (dL*; 0 = the look's)" value={s.contour} onChange={v => set("contour", v)} min={-18} max={0} step={1} />
          <Select name="Blush placement" value={s.blushZone} onChange={v => set("blushZone", v)} options={[["", "the look's (and face shape's)"], ...BLUSH_ZONES.map(z => [z, findZone(z).label] as const)]} />
          <Select name="Blush colour" value={s.blushFamily} onChange={v => set("blushFamily", v)} options={[["", "for the undertone"], ...Object.keys(BLUSH_FAMILIES).map(f => [f as BlushFamily, f] as const)]} />
          <Select name="Lip colour" value={s.lipFamily} onChange={v => set("lipFamily", v)} options={[["", "the look's"], ["red", "red for the undertone"], ...Object.keys(LIP_FAMILIES).map(f => [f as LipFamily, f] as const)]} />
          <Select name="Foundation finish" value={s.foundationFinish} onChange={v => set("foundationFinish", v)} options={[["", "the look's"], ...FINISHES.map(f => [f, f] as const)]} />
          <Select name="Highlight finish" value={s.highlightFinish} onChange={v => set("highlightFinish", v)} options={[["", "the look's"], ...FINISHES.map(f => [f, f] as const)]} />
          <Select name="Liner wing" value={s.wing} onChange={v => set("wing", v)} options={[["look", "the look's"], ["none", "none"], ["short", "short"], ["long", "long"]]} />
          <Range name="Extra mascara" value={s.mascara} onChange={v => set("mascara", v)} min={0} max={0.6} step={0.05} fmt={v => `+${Math.round(v * 100)}%`} />
        </Section>
        <Section title="Person">
          <Range name="Woman → man" value={s.sex} onChange={v => set("sex", v)} min={0} max={1} step={1} />
          <Select name="Skin" value={s.skin} onChange={v => set("skin", v)} options={skinOpts.map(h => [h, skinLabel(h)] as const)} />
          <Select name="Undertone" value={s.undertone} onChange={v => set("undertone", v)} options={[["", "measured from the skin"], ["cool", "cool"], ["neutral", "neutral"], ["warm", "warm"], ["olive", "olive"]]} />
          <Select name="Iris" value={s.eyes} onChange={v => set("eyes", v)} options={IRIS_TYPES.map(t => [t.id, t.label] as const)} />
          <Select name="Eye shape" value={s.eyeShape} onChange={v => set("eyeShape", v)} options={EYE_SHAPES.map(t => [t.id, t.label] as const)} />
          <Select name="Hair colour" value={s.hair} onChange={v => set("hair", v)} options={HAIR_COLOR_PRESETS.map(h => [h.id, h.label] as const)} />
          <Select name="Hairstyle" value={s.hairStyle} onChange={v => set("hairStyle", v)} options={HAIRSTYLES.map(h => [h.id, h.label] as const)} />
          <Range name="Face width" value={s.faceWidth} onChange={v => set("faceWidth", v)} min={0.9} max={1.1} step={0.02} fmt={v => `${v.toFixed(2)}×`} />
          <Range name="Lower face (SD)" value={s.lowerFace} onChange={v => set("lowerFace", v)} min={-2} max={2} step={0.5} />
          <Select name="Face shape rule" value={s.faceShape} onChange={v => set("faceShape", v)} options={[["", "as measured"], ...(Object.keys(FACE_SHAPE_RULES) as FaceShape[]).map(f => [f, f] as const)]} />
          <Select name="Expression" value={s.expression} onChange={v => set("expression", v)} options={[["", "neutral"], ...EMOTIONS.map(e => [e.id, e.name] as const)]} />
          <Range name="Head turn" value={s.yaw} onChange={v => set("yaw", v)} min={-25} max={25} step={5} fmt={v => `${v}°`} />
          <Range name="Key light from" value={s.keyAzimuth} onChange={v => set("keyAzimuth", v)} min={-70} max={70} step={5} fmt={v => `${v}°`} />
        </Section>
      </div>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div style={grid(260)}>
          {s.compare ? <figure style={{ margin: 0, display: "grid", gap: 4 }}><FacePortrait options={portrait} label="Bare skin" /><figcaption style={muted}>Bare</figcaption></figure> : null}
          <figure style={{ margin: 0, display: "grid", gap: 4 }}><MakeupPortrait portrait={portrait} plan={plan} label={`${plan.label} on this face`} /><figcaption style={muted}>{plan.label}, {Math.round(s.intensity * 100)}%</figcaption></figure>
        </div>
        <h3 style={h3}>Why these choices</h3>
        <ul style={{ ...muted, paddingLeft: 18, display: "grid", gap: 4 }}>{plan.rationale.map((r, k) => <li key={k}>{r}</li>)}</ul>
        <h3 style={h3}>Checks</h3>
        <MakeupChecks plan={plan} face={face} />
        <h3 style={h3}>Colours</h3>
        <MakeupSwatches plan={plan} />
        <h3 style={h3}>Face chart</h3>
        <div style={{ maxWidth: 560 }}><FaceChart face={face} plan={plan} title={`${plan.label}: where each product goes on this face`} /></div>
      </div>
    </div>
  );
}

// ---- Looks ------------------------------------------------------------------------------------------------------------------

function Looks() {
  const [person, setPerson] = useState("0");
  const people: { o: PortraitOptions; label: string }[] = [
    { o: { sex: 0, skin: "#e6c0a4", eyes: "blue", hair: hairOf("light-brown"), hairStyle: "bun" }, label: "Woman, light skin, blue eyes" },
    { o: { sex: 0, skin: "#8d5a3b", eyes: "dark-brown", hair: hairOf("black"), hairStyle: "bun" }, label: "Woman, brown skin" },
    { o: { sex: 0, skin: "#c99a7e", eyes: "brown", eyeShape: "monolid", hair: hairOf("black"), hairStyle: "bun" }, label: "Woman, single lids" },
    { o: { sex: 1, skin: "#d7aa86", eyes: "grey", hair: hairOf("brown"), hairStyle: "short-crop" }, label: "Man, light skin" },
  ];
  const p = people[Number(person)];
  return (
    <div style={page}>
      <Select name="Person" value={person} onChange={setPerson} options={people.map((q, k) => [String(k), q.label] as const)} />
      <p style={{ ...muted, maxWidth: 920 }}>Every look is data: colour rules (palette swatches from the skin, blush and lip families for the undertone, eyeshadow from the iris) and zones on the face's own landmarks. The same look adapts to each skin, eye shape and face shape.</p>
      <div style={grid(220)}>
        {MAKEUP_LOOKS.map((look, k) => <figure key={look.id} style={{ margin: 0, display: "grid", gap: 4, alignContent: "start" }}>
          <MakeupPortrait portrait={{ ...p.o, width: 256, height: 320, seed: 5 + k }} design={{ look: look.id }} label={`${look.label}, ${p.label}`} />
          <figcaption style={muted}><b>{look.label}.</b> {look.summary}</figcaption></figure>)}
      </div>
    </div>
  );
}

// ---- Face charts ----------------------------------------------------------------------------------------------------------

function FaceCharts() {
  const [look, setLook] = useState("soft-glam");
  const V = useMemo(() => beautifulFace({ sex: 0 }).vertices, []);
  return (
    <div style={page}>
      <Select name="Look" value={look} onChange={setLook} options={MAKEUP_LOOKS.filter(l => l.layers.length).map(l => [l.id, l.label] as const)} />
      <p style={{ ...muted, maxWidth: 920 }}>A face chart is how makeup artists plan a face. Here the same look is placed by each face shape's rule (cosmetology convention): the contour turns steeper or flatter, blush moves, temples and jaw are shaded or left light. Dashed lines: the brow map (head over the inner canthus, peak on the line from the nose wing through the lateral limbus, tail on the line through the outer canthus) and the facial thirds. Numbers match the list under each chart.</p>
      <div style={grid(330)}>
        {(Object.keys(FACE_SHAPE_RULES) as FaceShape[]).map(shape => {
          const plan = designMakeup({ look, face: V, faceShape: shape, skin: "#d8a98a" });
          return <div key={shape} style={{ display: "grid", gap: 6, alignContent: "start" }}><h3 style={h3}>{shape}</h3><p style={muted}>{FACE_SHAPE_RULES[shape].note}</p>
            <FaceChart face={V} plan={plan} title={`${findLook(look)?.label} placed for a ${shape} face`} /></div>;
        })}
      </div>
      <h3 style={h3}>Every zone in the atlas</h3>
      <div style={{ maxWidth: 640 }}><FaceChart face={V} title="Every makeup zone in the MAKEUP1 atlas" /></div>
    </div>
  );
}

// ---- Skin and colour --------------------------------------------------------------------------------------------------------

function Chip({ hex, name }: { hex: string; name: string }) {
  return <span title={`${name} ${hex}`} style={{ display: "grid", gap: 2, justifyItems: "center", font: "11px/1.2 var(--km-font-sans, system-ui)" }}>
    <span aria-hidden style={{ width: 34, height: 34, borderRadius: 6, background: hex, border: "1px solid rgba(0,0,0,.15)" }} />{name}</span>;
}

function SkinAndColour() {
  return (
    <div style={page}>
      <p style={{ ...muted, maxWidth: 920 }}>Each skin's base products, blush and lips, chosen by the rules in makeup-color.ts: foundation within CIEDE2000 2.5 plus part of the measured healthy shift (Stephen et al. 2009); concealer about +5 L* (Jones et al. 2016); correctors by complementary hue; contour deeper, greyer and cooler; highlight pearl, champagne or gold-bronze by depth and undertone; blush and red lipstick by undertone.</p>
      <div style={{ display: "grid", gap: 10 }}>
        {[...SKINS, ...MONK_SKIN_TONES.map(t => t.hex)].map(hex => {
          const s = readSkin(hex), b = basePalette(hex), lab = s.lab;
          return <div key={hex} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
            <span style={{ ...muted, width: 200 }}><b>{hex}</b> · ITA {s.ita.toFixed(0)}° ({s.category}) · hue {s.hue.toFixed(0)}° → {s.undertone}</span>
            <Chip hex={hex} name="skin" />{Object.values(b).map(w => <Chip key={w.id} hex={w.hex} name={w.id} />)}
            <Chip hex={labToHex(blushOn(lab, BLUSH_FOR[s.undertone]))} name={`blush (${BLUSH_FOR[s.undertone]})`} />
            <Chip hex={labToHex(lipColour(lab, RED_FOR[s.undertone]))} name={RED_FOR[s.undertone]} /><Chip hex={labToHex(lipColour(lab, "nude"))} name="nude lip" />
          </div>;
        })}
      </div>
      <UndertonePlane skin="#d8a98a" />
    </div>
  );
}

// ---- Learned ----------------------------------------------------------------------------------------------------------------

function Learned() {
  const c = MAKEUP_LEARNED.counts;
  return (
    <div style={{ ...page, maxWidth: 1100 }}>
      <p style={muted}>{MAKEUP_LEARNED.about} Bare faces: {c.bare}; made-up faces: {c.made_up}; rated faces: {c.rated}. Generated {MAKEUP_LEARNED.generated} by <code>scripts/makeup/makeup.py learn</code>.</p>
      <h3 style={h3}>What the made-up references wore (change against bare skin, CIELAB)</h3>
      <LearnedEffects />
      <h3 style={h3}>Facial contrast</h3>
      <LearnedContrast />
      <h3 style={h3}>What went with rated attractiveness (Face Research Lab London Set, exploratory)</h3>
      <div style={grid(420)}><div><p style={muted}>Women</p><BeautyCorrelations sex="female" /></div><div><p style={muted}>Men</p><BeautyCorrelations sex="male" /></div></div>
      <h3 style={h3}>Evidence the looks apply</h3>
      <MakeupEvidenceList />
    </div>
  );
}

// ---- On a photograph ---------------------------------------------------------------------------------------------------------

function draw(canvas: HTMLCanvasElement | null, w: number, h: number, data: Uint8ClampedArray) {
  if (!canvas) return;
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
}

function OnAPhotograph() {
  const [look, setLook] = useState("classic-red");
  const [bare, setBare] = useState<Portrait | null>(null);
  const [own, setOwn] = useState<{ img: ImageData; landmarks: number[][]; skin: Uint8Array | null } | null>(null);
  const [status, setStatus] = useState("Rendering the bare portrait…");
  const out = useRef<HTMLCanvasElement>(null), ownOut = useRef<HTMLCanvasElement>(null), ownIn = useRef<HTMLCanvasElement>(null);
  const portrait: PortraitOptions = { sex: 0, skin: "#c99a7e", eyes: "brown", hairStyle: "bun", width: 384, height: 480, seed: 9, makeup: "none" };
  useEffect(() => {
    if (!bare) return;
    const plan = designMakeup({ look, skin: portrait.skin, face: bare.face.vertices, faceReference: "anat1" });
    draw(out.current, bare.width, bare.height, paintPhoto({ width: bare.width, height: bare.height, data: bare.rgba, landmarks: bare.landmarks }, plan));
    setStatus("Painted with the photo path.");
  }, [bare, look]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!own) return;
    const plan = designMakeup({ look, skin: "#c99a7e" });
    draw(ownIn.current, own.img.width, own.img.height, own.img.data);
    draw(ownOut.current, own.img.width, own.img.height, paintPhoto({ width: own.img.width, height: own.img.height, data: own.img.data, landmarks: own.landmarks, skinMask: own.skin }, plan));
  }, [own, look]);
  const load = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []), img = files.find(f => f.type.startsWith("image/")), json = files.find(f => f.name.endsWith(".json"));
    if (!img || !json) { setStatus("Choose one image and its landmarks JSON together."); return; }
    const data = JSON.parse(await json.text()) as { width: number; height: number; landmarks: number[][]; skinRuns?: [number, number][] };
    const bmp = await createImageBitmap(img), c = document.createElement("canvas");
    c.width = data.width; c.height = data.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, data.width, data.height);
    let skin: Uint8Array | null = null;
    if (data.skinRuns) { skin = new Uint8Array(data.width * data.height); for (const [s0, n] of data.skinRuns) skin.fill(1, s0, s0 + n); }
    setOwn({ img: ctx.getImageData(0, 0, data.width, data.height), landmarks: data.landmarks, skin });
  };
  return (
    <div style={page}>
      <Select name="Look" value={look} onChange={setLook} options={MAKEUP_LOOKS.filter(l => l.layers.length).map(l => [l.id, l.label] as const)} />
      <p style={{ ...muted, maxWidth: 920 }}><code>paintPhoto</code> paints a plan on any photograph from its 478 MediaPipe landmarks: the face is fitted to the canonical mesh, every pixel gets its place on the face, and frequency separation keeps the photo's own texture. No photographs of people ship with the library, so here it paints the rendered portrait as if it were a photo (left), beside the renderer's own makeup (right), which uses the same plan. Your own photo works too: run <code>python3 -I scripts/makeup/makeup.py landmarks photo.jpg --out photo.json</code>, then choose both files below.</p>
      <div style={grid(260)}>
        <figure style={{ margin: 0, display: "grid", gap: 4 }}><FacePortrait options={portrait} label="Bare portrait used as a photograph" onRendered={setBare} /><figcaption style={muted}>Bare (the "photograph")</figcaption></figure>
        <figure style={{ margin: 0, display: "grid", gap: 4 }}><canvas ref={out} role="img" aria-label="The look painted with the photo path" style={{ width: "100%", height: "auto", borderRadius: 6, background: "var(--km-surface-subtle, #e8e4df)" }} /><figcaption style={muted} aria-live="polite">{status}</figcaption></figure>
        <figure style={{ margin: 0, display: "grid", gap: 4 }}><MakeupPortrait portrait={portrait} design={{ look }} label="The look painted by the renderer" /><figcaption style={muted}>Renderer path (light-aware films, sparkle, mascara)</figcaption></figure>
      </div>
      <label style={{ ...label, maxWidth: 520 }}>Your photo and its landmarks JSON<input type="file" multiple accept="image/*,.json" onChange={e => { void load(e); }} /></label>
      {own ? <div style={grid(260)}><canvas ref={ownIn} role="img" aria-label="Your photo" style={{ width: "100%", height: "auto" }} /><canvas ref={ownOut} role="img" aria-label="Your photo with the look" style={{ width: "100%", height: "auto" }} /></div> : null}
    </div>
  );
}

// ---- East Asian looks ----------------------------------------------------------------------------------------------------

const EAST_ASIAN_LOOKS = ["c-glam", "k-idol", "jirai", "neo-gyaru", "ryousangata"] as const;
const EA_SKINS = ["#f1d3bd", "#e8c6a8", "#ddb594", "#c99a7e"] as const;
interface EaState { look: string; intensity: number; eyeShape: string; variant: number; skin: string; sex: number; lashes: boolean; lens: boolean; tape: boolean; aegyo: boolean; gallery: boolean }

/** The look with the story's tool switches applied: the same changes an agent can make as data. */
function eaLook(s: EaState): Look {
  const base = findLook(s.look)!;
  return { ...base, layers: base.layers.filter(l => s.aegyo || !l.zone.startsWith("aegyo-sal")), lashes: s.lashes ? base.lashes : { length: 1, thickness: 1, darkness: 0.5 },
    eyes: { lens: s.lens ? base.eyes?.lens : undefined, tape: s.tape ? base.eyes?.tape : 0 } };
}

function EastAsianLooks() {
  const [s, setS] = useState<EaState>({ look: "c-glam", intensity: 1, eyeShape: "monolid", variant: 0, skin: "#e8c6a8", sex: 0, lashes: true, lens: true, tape: true, aegyo: true, gallery: false });
  const set = <K extends keyof EaState>(k: K) => (v: EaState[K]) => setS(p => ({ ...p, [k]: v }));
  const portrait: PortraitOptions = { sex: s.sex, faceType: "east-asian", faceVariant: s.variant, eyeShape: s.eyeShape, skin: s.skin, eyes: "dark-brown", hair: hairOf("black"), hairStyle: s.sex ? "short-crop" : "bun", keyAzimuth: -15, makeup: "none", seed: 11 };
  const face = useMemo(() => beautifulFace(portrait).vertices, [s.sex, s.variant, s.eyeShape]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => designMakeup({ look: eaLook(s), face, eyeShape: s.eyeShape, skin: s.skin, hair: portrait.hair, eyes: "dark-brown", intensity: s.intensity }), [JSON.stringify(s), face]); // eslint-disable-line react-hooks/exhaustive-deps
  const look = findLook(s.look)!;
  // the checks and the chart use the face as the plan wears it: tape opens the eye
  const worn = useMemo(() => wornFace(portrait, plan), [plan, face]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (k: "lashes" | "lens" | "tape" | "aegyo", text: string) =>
    <label style={{ ...label, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}><input type="checkbox" checked={s[k]} onChange={e => set(k)(e.target.checked)} />{text}</label>;
  const fig = { margin: 0, display: "grid", gap: 4, alignContent: "start" } as const;
  return (
    <div style={{ ...page, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
      <div style={{ display: "grid", gap: 10, alignContent: "start", maxWidth: 380 }}>
        <h2 style={{ margin: 0, font: "700 20px var(--km-font-sans, system-ui, sans-serif)" }}>East Asian looks</h2>
        <Section title="Look">
          <Select name="Look" value={s.look} onChange={set("look")} options={EAST_ASIAN_LOOKS.map(id => [id, findLook(id)!.label] as const)} />
          <Range name="Intensity" value={s.intensity} onChange={set("intensity")} min={0} max={1.5} step={0.05} fmt={v => `${Math.round(v * 100)}%`} />
        </Section>
        <Section title="Tools beyond paint">
          {toggle("lashes", "False lashes and lower lashes")}{toggle("lens", "Circle lenses")}{toggle("tape", "Double-eyelid tape (where the look uses it)")}{toggle("aegyo", "Aegyo-sal and its shadow")}
        </Section>
        <Section title="Person">
          <Select name="Sex" value={String(s.sex)} onChange={v => set("sex")(Number(v))} options={[["0", "Woman"], ["1", "Man"]]} />
          <Select name="Eye shape" value={s.eyeShape} onChange={set("eyeShape")} options={[["monolid", "Single lid"], ["inner-double", "In-fold double lid"], ["almond", "Almond"]]} />
          <Select name="Face variant" value={String(s.variant)} onChange={v => set("variant")(Number(v))} options={[["0", "The type's average"], ["1", "Variant 1"], ["2", "Variant 2"]]} />
          <Select name="Skin" value={s.skin} onChange={set("skin")} options={EA_SKINS.map(h => [h, skinLabel(h)] as const)} />
        </Section>
        <label style={{ ...label, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}><input type="checkbox" checked={s.gallery} onChange={e => set("gallery")(e.target.checked)} />Show all five looks on this face</label>
      </div>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <p style={{ ...muted, maxWidth: 860 }}><b>{look.label}.</b> {look.summary}</p>
        <div style={grid(240)}>
          <figure style={fig}><FacePortrait options={{ ...portrait, width: 256, height: 320 }} label="Bare face" /><figcaption style={muted}>Bare</figcaption></figure>
          <figure style={fig}><MakeupPortrait portrait={{ ...portrait, width: 256, height: 320 }} plan={plan} label={`${plan.label} on this face`} /><figcaption style={muted}>{plan.label}, {Math.round(s.intensity * 100)}%</figcaption></figure>
        </div>
        <div style={grid(360)}>
          <figure style={fig}><FacePortrait options={{ ...portrait, framing: "eyes", width: 384, height: 192 }} label="Bare eyes" /><figcaption style={muted}>Bare eyes</figcaption></figure>
          <figure style={fig}><MakeupPortrait portrait={{ ...portrait, framing: "eyes", width: 384, height: 192 }} plan={plan} label={`The eyes in ${plan.label}`} /><figcaption style={muted}>The eyes in this look</figcaption></figure>
        </div>
        <h3 style={h3}>Why these choices</h3>
        <ul style={{ ...muted, paddingLeft: 18, display: "grid", gap: 4 }}>{plan.rationale.map((r, k) => <li key={k}>{r}</li>)}</ul>
        <h3 style={h3}>Checks</h3>
        <MakeupChecks plan={plan} face={worn} />
        <div style={{ maxWidth: 560 }}><FaceChart face={worn} plan={plan} title={`${plan.label}: where each product goes on this face`} /></div>
        {s.gallery ? <div style={grid(200)}>
          {EAST_ASIAN_LOOKS.map(id => <figure key={id} style={fig}>
            <MakeupPortrait portrait={{ ...portrait, width: 224, height: 280 }} design={{ look: id }} label={`${findLook(id)!.label} on this face`} />
            <figcaption style={muted}>{findLook(id)!.label}</figcaption></figure>)}
        </div> : null}
      </div>
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Makeup", id: "video-makeup", component: Lab, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Lab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const MakeupLab: Story = { name: "Makeup lab", render: () => <Lab /> };
export const LooksStory: Story = { name: "Looks", render: () => <Looks /> };
export const FaceChartsStory: Story = { name: "Face charts by face shape", render: () => <FaceCharts /> };
export const SkinAndColourStory: Story = { name: "Skin and colour", render: () => <SkinAndColour /> };
export const LearnedStory: Story = { name: "Learned from photographs", render: () => <Learned /> };
export const OnAPhotographStory: Story = { name: "On a photograph", render: () => <OnAPhotograph /> };
export const EastAsianLooksStory: Story = { name: "East Asian looks", render: () => <EastAsianLooks /> };
