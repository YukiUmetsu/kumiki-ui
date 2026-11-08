import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import catalogFile from "../../assets/sound/catalog.json";
import fixtures from "../../assets/sound/lab/lab.json";
import sets from "../../assets/sound/lab/sets.json";
import { findSounds, SOUND_INTENSITIES } from "../../registry/video/sound-design";
import type { SoundAssetRecord, SoundCatalog } from "../../registry/video/sound-catalog";
import { limitingDb, masterGainDb, MAX_LIMITING_DB, MIX_PROFILES } from "../../registry/video/sound-mastering";
import type { MixProfileId } from "../../registry/video/sound-mastering";

/** Every file here was made by `npm run sound:lab`, through the library's own compiler and mixer. */
const catalog = catalogFile as unknown as SoundCatalog;
const labUrls = import.meta.glob("../../assets/sound/lab/*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const previewUrls = import.meta.glob("../../assets/sound/lab/catalog/*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const generatedUrls = import.meta.glob("../../docs/verification/sound-pack/moss-*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const lab = (file: string) => labUrls["../../assets/sound/lab/" + file];
const preview = (id: string) => previewUrls[`../../assets/sound/lab/catalog/${id}.m4a`];

const page: CSSProperties = { padding: 16, maxWidth: 820, display: "grid", gap: 16, font: "16px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #10202e)" };
const panel: CSSProperties = { display: "grid", gap: 8, padding: 12, border: "1px solid var(--km-border-subtle, #c9d3dc)", borderRadius: 10 };
const mono: CSSProperties = { margin: 0, padding: 12, background: "#101a27", color: "#edf3f6", borderRadius: 8, overflowX: "auto", fontSize: 13, lineHeight: 1.45 };
const note: CSSProperties = { margin: 0, fontSize: 14, color: "var(--km-text-secondary, #46586a)" };

function Waveform({ url, peakSeconds, label }: { url: string; peakSeconds?: number; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null), [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let alive = true;
    setState("loading");
    (async () => {
      const bytes = await (await fetch(url)).arrayBuffer();
      const audio = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(bytes);
      if (!alive || !canvas.current) return;
      const context = canvas.current.getContext("2d")!, { width, height } = canvas.current, data = audio.getChannelData(0), step = Math.max(1, Math.floor(data.length / width));
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#7cc4d8";
      for (let x = 0; x < width; x += 1) {
        let top = 0;
        for (let i = x * step; i < Math.min(data.length, (x + 1) * step); i += 1) top = Math.max(top, Math.abs(data[i]));
        const bar = Math.max(1, top * height * .92);
        context.fillRect(x, (height - bar) / 2, 1, bar);
      }
      if (peakSeconds !== undefined) { context.fillStyle = "#f4b860"; context.fillRect(Math.round(peakSeconds * audio.sampleRate / step), 0, 2, height); }
      setState("ready");
    })().catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [url, peakSeconds]);
  const marker = peakSeconds === undefined ? "" : ` The amber line marks the sync point at ${peakSeconds} seconds.`;
  return <figure style={{ margin: 0 }}>
    <canvas ref={canvas} width={760} height={80} role="img" aria-label={`${label} waveform.${marker}`} style={{ width: "100%", background: "#101a27", borderRadius: 8, display: "block" }} />
    <figcaption style={note}>{state === "error" ? "This fixture did not load. Run npm run sound:lab, then reload." : state === "loading" ? "Reading the file." : peakSeconds === undefined ? label : `${label}. The amber line is the sync point.`}</figcaption>
  </figure>;
}
function Clip({ title, url, peakSeconds, children }: { title: string; url: string; peakSeconds?: number; children?: ReactNode }) {
  return <section aria-label={title} style={panel}>
    <strong>{title}</strong>
    <audio controls preload="none" src={url} style={{ width: "100%" }} />
    <Waveform url={url} peakSeconds={peakSeconds} label={title} />
    {children}
  </section>;
}
function Recipe({ value, name }: { value: unknown; name: string }) {
  const text = JSON.stringify(value, null, 2);
  const download = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text + "\n"], { type: "application/json" }));
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return <section aria-label="Recipe" style={{ display: "grid", gap: 8 }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}><strong>Recipe</strong>
      <button type="button" onClick={download} style={{ font: "inherit", minHeight: 40, padding: "0 14px" }}>Download {name}</button></div>
    <pre style={mono}>{text}</pre>
  </section>;
}
const rights = (sound: SoundAssetRecord) => `${sound.licenseId} · ${sound.author}${sound.attribution ? ` · credit: ${sound.attribution}` : ""}`;

/** Search the shipped catalog with the same function an agent calls, and hear each result. */
function Catalog() {
  const [query, setQuery] = useState("water drop"), [origin, setOrigin] = useState<"" | "recorded" | "synthesized">("");
  const matches = useMemo(() => query.trim()
    ? findSounds(catalog, query, { origin: origin || undefined, limit: 12 }).map(match => match.sound)
    : catalog.sounds.filter(sound => !origin || sound.origin === origin).slice(0, 12), [query, origin]);
  return <div style={page}>
    <p style={note}>{catalog.sounds.length} sounds. Each one has a verified hash, a licence that allows redistribution, and a sync point. Search uses <code>findSounds</code>, as an agent does.</p>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
      <label style={{ display: "grid", gap: 4, flex: "1 1 260px" }}>Describe the sound<input value={query} onChange={event => setQuery(event.target.value)} style={{ font: "inherit", minHeight: 40, padding: "0 10px" }} /></label>
      <label style={{ display: "grid", gap: 4 }}>Origin<select value={origin} onChange={event => setOrigin(event.target.value as typeof origin)} style={{ font: "inherit", minHeight: 40 }}>
        <option value="">Any</option><option value="recorded">Recorded</option><option value="synthesized">Synthesized</option></select></label>
    </div>
    <p role="status" style={note}>{matches.length ? `${matches.length} sound${matches.length === 1 ? "" : "s"}.` : "No sound matches. Try fewer words."}</p>
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
      {matches.map(sound => <li key={sound.id} style={panel}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}><strong>{sound.id}</strong><span style={note}>{sound.origin}{sound.material ? ` · ${sound.material}` : ""} · {(sound.durationSamples / sound.sampleRate).toFixed(1)} s</span></div>
        <span>{sound.description}</span>
        <audio controls preload="none" src={preview(sound.id)} style={{ width: "100%" }} />
        <span style={note}>{rights(sound)} · <a href={sound.sourceUrl}>source</a></span>
      </li>)}
    </ul>
  </div>;
}

/** The seven packs that doc 28 plans, and what the catalog holds for each today. */
const PACKS: { name: string; use: string; tags?: readonly string[]; story?: string; missing?: string }[] = [
  { name: "Cinematic Foley", use: "Steps, paper, glass, props and touch", tags: ["step", "foley", "props"] },
  { name: "Physical Impact and Mechanism", use: "Drops, hits, rolls and machines, chosen by material", tags: ["impact", "mechanical"] },
  { name: "Transition and Reveal", use: "Whooshes, risers, hits and soft pings for cuts", tags: ["whoosh", "riser", "boom", "bass", "sting", "tone"] },
  { name: "Atmosphere and Weather", use: "Seamless recorded beds that sit under narration", tags: ["ambience"] },
  { name: "Spatial and Acoustic", use: "Rooms, distance and pan, applied to any sound", story: "Rooms, Position and Under Narration" },
  { name: "Science and Technology", use: "Pulses, scans, chimes, glitches and interface sounds, synthesized by this project from fixed FFmpeg recipes (npm run sound:synth)", tags: ["tech"] },
  { name: "Found and Generated", use: "Sounds the catalog lacks, made by a local model after search fails", story: "Generated" },
];
function Packs() {
  const [open, setOpen] = useState(PACKS[0].name), pack = PACKS.find(item => item.name === open)!;
  const sounds = pack.tags ? catalog.sounds.filter(sound => sound.tags.some(tag => pack.tags!.includes(tag))) : [];
  return <div style={page}>
    <div role="tablist" aria-label="Sound packs" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {PACKS.map(item => <button key={item.name} type="button" role="tab" aria-selected={item.name === open} onClick={() => setOpen(item.name)}
        style={{ font: "inherit", minHeight: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #7a8a99", background: item.name === open ? "#10202e" : "transparent", color: item.name === open ? "#fff" : "inherit" }}>{item.name}</button>)}
    </div>
    <section role="tabpanel" aria-label={pack.name} style={{ display: "grid", gap: 10 }}>
      <p style={{ margin: 0 }}>{pack.use}.</p>
      {pack.missing && <p style={{ ...note, color: "#8a4b00" }}>{pack.missing}</p>}
      {pack.story && <p style={note}>This pack is processing, not files. Hear it in the {pack.story} {pack.story.includes(" and ") ? "stories" : "story"}.</p>}
      {sounds.length > 0 && <p style={note}>{sounds.length} sounds: {sounds.filter(sound => sound.origin === "recorded").length} recorded, {sounds.filter(sound => sound.origin === "synthesized").length} synthesized.</p>}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {sounds.map(sound => <li key={sound.id} style={panel}>
          <strong style={{ fontSize: 14 }}>{sound.id}</strong>
          <span style={note}>{sound.description}</span>
          <audio controls preload="none" src={preview(sound.id)} style={{ width: "100%" }} />
        </li>)}
      </ul>
    </section>
  </div>;
}

const roomNames = [...new Set(fixtures.map(item => item.room))], roomSounds = [...new Set(fixtures.map(item => item.sound))];
function RoomLab() {
  const [sound, setSound] = useState(roomSounds[0]), [room, setRoom] = useState("cave");
  const dry = fixtures.find(item => item.sound === sound && item.room === "dry")!, wet = fixtures.find(item => item.sound === sound && item.room === room)!;
  return <div style={page}>
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <label>Sound <select value={sound} onChange={event => setSound(event.target.value)}>{roomSounds.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Room <select value={room} onChange={event => setRoom(event.target.value)}>{roomNames.filter(item => item !== "dry").map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <Clip title="A: dry" url={lab(dry.file)} peakSeconds={dry.peakSeconds} />
    <Clip title={`B: ${room}`} url={lab(wet.file)} peakSeconds={wet.peakSeconds} />
    <Recipe value={wet.recipe} name={`${wet.recipe.id}.json`} />
  </div>;
}
function Intensity() {
  return <div style={page}>
    <p style={note}>One whoosh at each editorial level. The level is a fixed gain: {Object.entries(SOUND_INTENSITIES).map(([name, db]) => `${name} ${db > 0 ? "+" : ""}${db} dB`).join(", ")}. Measured on these files: -30.8, -24.8 and -21.8 LUFS.</p>
    {sets.intensity.map(item => <Clip key={item.level} title={item.level} url={lab(item.file)} peakSeconds={item.peakSeconds} />)}
    <Recipe value={sets.intensity.map(item => item.recipe)} name="intensity-recipes.json" />
  </div>;
}
function Position() {
  return <div style={page}>
    <p style={note}>One drop, placed three ways. Pan moves it between the speakers. Distance lowers it and takes off its top, as air does. Use headphones.</p>
    {sets.position.map(item => <Clip key={item.label} title={item.label} url={lab(item.file)} peakSeconds={item.peakSeconds}><span style={note}>pan {item.recipe.position.pan}, distance {item.recipe.position.distance} m</span></Clip>)}
    <Recipe value={sets.position.map(item => item.recipe)} name="position-recipes.json" />
  </div>;
}
function Takes() {
  const [a, b] = sets.takes;
  return <div style={page}>
    <p style={note}>Three steps on stone. A plays one recording three times, which is what makes footsteps sound fake. B lets a seed pick a different recorded take for each step, with a small pitch change. The same seed always gives the same walk.</p>
    <Clip title="A: one file, three times" url={lab(a.file)}><span style={note}>{a.recipes.map(recipe => recipe.layers[0].sound).join(", ")}</span></Clip>
    <Clip title="B: seeded takes" url={lab(b.file)}><span style={note}>{b.recipes.map(recipe => recipe.layers[0].sound).join(", ")}</span></Clip>
    <Recipe value={b.recipes} name="seeded-walk.json" />
  </div>;
}
function UnderNarration() {
  const [profile, setProfile] = useState<MixProfileId>("youtube"), ducked = sets.narration.rows.find(row => row.duckDb > 0)!;
  return <div style={page}>
    <p style={note}>A stream bed, a drop and a whoosh under 13 seconds of narration: a public domain LibriVox reading of “Old Man Rain” by Madison Cawein. B lowers the bed by 12 dB while the voice speaks and brings it back in the pauses. Both mixes come from <code>audioMixFfmpegArgs</code>, the same code that mixes a film.</p>
    {sets.narration.rows.map(row => <Clip key={row.duckDb} title={row.duckDb ? `B: ducked ${row.duckDb} dB` : "A: no ducking"} url={lab(row.file)}>
      <span style={note}>{row.measure.integratedLufs} LUFS, true peak {row.measure.truePeakDbtp} dBTP</span></Clip>)}
    <section aria-label="Mastering" style={panel}>
      <strong>Mastering B for a platform</strong>
      <label>Delivery <select value={profile} onChange={event => setProfile(event.target.value as MixProfileId)}>{Object.keys(MIX_PROFILES).map(id => <option key={id}>{id}</option>)}</select></label>
      <table style={{ borderCollapse: "collapse", fontSize: 14 }}><tbody>
        {(() => {
          const target = MIX_PROFILES[profile], plain = masterGainDb(ducked.measure, profile), loud = masterGainDb(ducked.measure, profile, { limit: true }), cut = limitingDb(ducked.measure, loud, profile);
          return [["Target", `${target.lufs} LUFS, peaks at or under ${target.truePeakDbtp} dBTP`], ["One gain, no limiter", `${plain > 0 ? "+" : ""}${plain} dB, which reaches ${(ducked.measure.integratedLufs + plain).toFixed(1)} LUFS`],
            ["With the limiter", `${loud > 0 ? "+" : ""}${loud} dB, limiting ${cut} dB`], ["Allowed", cut <= MAX_LIMITING_DB ? `Yes. The most limiting allowed is ${MAX_LIMITING_DB} dB` : `No. More than ${MAX_LIMITING_DB} dB of limiting crushes the sound, so the export stops`]]
            .map(([name, value]) => <tr key={name}><th scope="row" style={{ textAlign: "left", padding: "4px 12px 4px 0", fontWeight: 600 }}>{name}</th><td style={{ padding: 4 }}>{value}</td></tr>);
        })()}
      </tbody></table>
    </section>
    <Recipe value={{ manifest: sets.narration.manifest, duckDb: ducked.duckDb, recipes: sets.narration.recipes, master: { profile, limit: true } }} name="narration-mix.json" />
  </div>;
}
const GENERATED = [
  { id: "moss-walk-stone", realness: .89, match: "strong, z +3.7" }, { id: "moss-page-turn", realness: .96, match: "strong, z +3.3" },
  { id: "moss-water-drop", realness: .96, match: "strong, z +4.1" }, { id: "moss-ice-crack", realness: .8, match: "no match, z +1.9" },
];
function Generated() {
  return <div style={page}>
    <p style={note}>Four sounds made offline by MOSS-SoundEffect v2 (4-bit MLX, Apache-2.0 code and weights) on an M4 with 24 GB. Each took about 4 minutes and peaked at 18.3 GB. Generation is off by default, and <code>sound:generate</code> refuses a request the catalog can already meet. The scores are Earshot's advisory readings. Nobody has listened to these yet.</p>
    {GENERATED.map(item => <Clip key={item.id} title={item.id} url={generatedUrls[`../../docs/verification/sound-pack/${item.id}.m4a`]}><span style={note}>Earshot realness {item.realness} · match {item.match}</span></Clip>)}
  </div>;
}

const meta = { title: "Video production/Sound Lab", id: "video-sound-lab", component: RoomLab, parameters: { layout: "fullscreen" } } satisfies Meta<typeof RoomLab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CatalogSearch: Story = { render: () => <Catalog /> };
export const SoundPacks: Story = { render: () => <Packs /> };
export const Rooms: Story = { render: () => <RoomLab /> };
export const IntensityLevels: Story = { render: () => <Intensity /> };
export const PositionInSpace: Story = { render: () => <Position /> };
export const VariedTakes: Story = { render: () => <Takes /> };
export const DuckingUnderNarration: Story = { render: () => <UnderNarration /> };
export const GeneratedSounds: Story = { render: () => <Generated /> };
