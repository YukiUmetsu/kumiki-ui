import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DOCUMENT_PAGE_STATES, DocumentPage2D } from "../../registry/domains/document-page-2d";
import type { DocumentPageState } from "../../registry/domains/document-page-2d";

// Placeholder bars stand in for text; no real document content is shown.
const CAPTIONS: Record<DocumentPageState, string> = {
  scan: "A photo of a page. Search, copy and screen readers see nothing.",
  ocr: "Recognised text is stored with the image, so it can be searched and copied.",
  boxed: "The black box covers the line, but the stored text still sits underneath.",
  flattened: "The box is burned into the image and the text layer is removed.",
};

const page = (dark: boolean): CSSProperties => ({ padding: 20, borderRadius: 16, background: dark ? "#182332" : "#f4f6f9", color: dark ? "#edf3fc" : "#243347", font: "15px/1.5 Geist, Inter, system-ui, sans-serif", display: "grid", gap: 20 });
const row: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 };
const note: CSSProperties = { margin: 0, fontSize: 13, opacity: 0.75 };

function StatesDemo({ dark = false }: { dark?: boolean }) {
  return <div style={page(dark)}>
    <div style={row}>
      {DOCUMENT_PAGE_STATES.map(state => <figure key={state} style={{ margin: 0, display: "grid", gap: 4 }}>
        <DocumentPage2D state={state} theme={dark ? "midnight" : "paper"} width={240} height={200} />
        <figcaption style={note}>{CAPTIONS[state]}</figcaption>
      </figure>)}
    </div>
  </div>;
}

function RedactedLinesDemo() {
  return <div style={page(false)}>
    <div style={row}>
      {[0, 3, 5].map(line => <figure key={line} style={{ margin: 0, display: "grid", gap: 4 }}>
        <DocumentPage2D state="boxed" redactedLine={line} title={`Box on line ${line + 1}`} width={240} height={200} />
        <figcaption style={note}>Box position is set per line, so the same drawing can show different redactions.</figcaption>
      </figure>)}
    </div>
  </div>;
}

const meta = { title: "Domains/Document Pages", component: DocumentPage2D, parameters: { layout: "padded" }, tags: ["autodocs"],
  args: { state: "scan" } } satisfies Meta<typeof DocumentPage2D>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = { render: () => <StatesDemo /> };
export const DarkTheme: Story = { name: "Dark theme", render: () => <StatesDemo dark /> };
export const RedactedLines: Story = { name: "Redacted lines", render: () => <RedactedLinesDemo /> };
