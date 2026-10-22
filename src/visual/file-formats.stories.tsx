import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileFormat2D, FormatConversion2D } from "../../registry/domains/file-format-2d";
import type { FileKind, FileFormatSpec } from "../../registry/domains/file-format-2d";

// Format names are real container and codec names; file names are invented.
const SINGLE: { format: string; kind: FileKind; name: string }[] = [
  { format: "MOV", kind: "video", name: "clip.mov" },
  { format: "PNG", kind: "image", name: "logo.png" },
  { format: "WAV", kind: "audio", name: "interview.wav" },
  { format: "PDF", kind: "document", name: "contract.pdf" },
  { format: "CSV", kind: "data", name: "sales.csv" },
];

const CONVERSIONS: { from: FileFormatSpec; to: FileFormatSpec; note: string }[] = [
  { from: { format: "MOV", kind: "video" }, to: { format: "MP4", kind: "video" }, note: "Apple video to a universal container" },
  { from: { format: "HEIC", kind: "image" }, to: { format: "JPG", kind: "image" }, note: "Phone photo to a widely supported image" },
  { from: { format: "WAV", kind: "audio" }, to: { format: "MP3", kind: "audio" }, note: "Heavy audio to a smaller file" },
  { from: { format: "PNG", kind: "image" }, to: { format: "WEBP", kind: "image" }, note: "Web image format" },
  { from: { format: "PDF", kind: "document" }, to: { format: "TXT", kind: "document" }, note: "Plain text from a document" },
  { from: { format: "CSV", kind: "data" }, to: { format: "XLSX", kind: "data" }, note: "Spreadsheet workbook" },
];

const row: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 };
const page = (dark: boolean): CSSProperties => ({ padding: 20, borderRadius: 16, background: dark ? "#182332" : "#f4f6f9", color: dark ? "#edf3fc" : "#243347", font: "15px/1.5 Geist, Inter, system-ui, sans-serif", display: "grid", gap: 24 });
const note: CSSProperties = { margin: 0, fontSize: 13, opacity: 0.75 };

function KindsDemo({ dark = false }: { dark?: boolean }) {
  return <div style={page(dark)}>
    <div style={row}>
      {SINGLE.map(item => <figure key={item.name} style={{ margin: 0, display: "grid", gap: 4 }}>
        <FileFormat2D format={item.format} kind={item.kind} title={item.name} theme={dark ? "midnight" : "paper"} width={240} height={200} />
        <figcaption style={note}>{item.kind}: {item.format}</figcaption>
      </figure>)}
    </div>
  </div>;
}

function ConversionsDemo({ dark = false }: { dark?: boolean }) {
  return <div style={page(dark)}>
    <div style={row}>
      {CONVERSIONS.map(item => <figure key={`${item.from.format}-${item.to.format}`} style={{ margin: 0, display: "grid", gap: 4 }}>
        <FormatConversion2D from={item.from} to={item.to} theme={dark ? "midnight" : "paper"} width={240} height={200} />
        <figcaption style={note}>{item.note}</figcaption>
      </figure>)}
    </div>
  </div>;
}

const meta = { title: "Domains/File Formats", component: FileFormat2D, parameters: { layout: "padded" }, tags: ["autodocs"],
  args: { format: "MP4", kind: "video" } } satisfies Meta<typeof FileFormat2D>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Kinds: Story = { render: () => <KindsDemo /> };
export const Conversions: Story = { render: () => <ConversionsDemo /> };
export const DarkTheme: Story = { name: "Dark theme", render: () => <><KindsDemo dark /><ConversionsDemo dark /></> };
