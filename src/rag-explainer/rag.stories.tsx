import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExplainerPlayer } from "../../registry/visual/explainer-player";
import { ExplainerFrameCapture } from "../../registry/visual/explainer-frame-capture";
import type { ExplainerFrameCaptureHandle } from "../../registry/visual/explainer-frame-capture";
import { createRagProduction, RAG_CHAPTERS, RAG_OUTPUT, RAG_VISUAL_REGION } from "./rag-production";
import { RagVisual } from "./rag-visual";

/** One Storybook entry. The same story provides an invisible-to-navigation
 * export mode via ?ragExport=1 for the local manual MP4 capture script.
 */
const COPY: CSSProperties = {
  color: "#edf7fc",
  fontFamily: "'Geist Variable', Inter, system-ui, sans-serif",
  fontSize: "clamp(13px, 1.625cqi, 26px)",
  fontWeight: 560,
  lineHeight: 1.38,
  letterSpacing: "-.02em",
  textShadow: "0 2px 12px #0c1725",
};
const SHELL: CSSProperties = {
  minHeight: "100vh", background: "#0b1724", color: "#f1f7fc",
  padding: "clamp(18px, 3vw, 42px)",
  fontFamily: "'Geist Variable', Inter, system-ui, sans-serif",
};
const TAB: CSSProperties = {
  border: "1px solid #3b5969", background: "transparent", color: "#b8ccd8",
  borderRadius: 9, padding: "11px 16px", fontSize: 15, cursor: "pointer",
};

function useRagProduction() {
  return useMemo(() => {
    try { return { ok: true as const, sequence: createRagProduction() }; }
    catch (cause) { return { ok: false as const,
      error: cause instanceof Error ? cause.message : String(cause) }; }
  }, []);
}
function Playback() {
  const built = useRagProduction();
  const [frame, setFrame] = useState(0);
  if (!built.ok) return <main style={SHELL}><pre role="alert">{built.error}</pre></main>;
  const sequence = built.sequence;
  const section = RAG_CHAPTERS.find(ch => frame >= ch.start && frame < ch.end) ?? RAG_CHAPTERS[RAG_CHAPTERS.length - 1];
  return <main style={SHELL}>
    <div style={{ maxWidth: 1640, margin: "auto" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 22, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <div style={{ letterSpacing: ".2em", fontSize: 12, color: "#79e5d3", fontWeight: 700 }}>
            KUMIKI / TECHNICAL EXPLAINER
          </div>
          <h1 style={{ margin: "7px 0 0", fontSize: "clamp(32px, 4.5vw, 55px)",
            fontWeight: 560, letterSpacing: "-.045em" }}>RAG, from PDF to cited answer</h1>
        </div>
        <span style={{ color: "#99b4c5", fontSize: 15 }}>
          107s · extracted text → semantic search → cited answer
        </span>
      </header>
      <div style={{ maxWidth: "100%", width: "100%", minWidth: 0 }}>
        <ExplainerPlayer sequence={sequence} frame={frame} onFrameChange={setFrame}
          strict textStyle={COPY} protectedVisualRegion={RAG_VISUAL_REGION}
          renderVisual={state => <RagVisual state={state} />}
          style={{ width: "100%", maxWidth: "100%", minWidth: 0, background: "#102434",
            border: "1px solid #345567", borderRadius: 16,
            overflow: "hidden", boxShadow: "0 24px 65px #0006" }} />
      </div>
      <nav aria-label="RAG explanation steps" style={{ display: "flex", gap: 10,
        flexWrap: "wrap", marginTop: 17 }}>
        {RAG_CHAPTERS.map((ch, i) => <button key={ch.id} type="button"
          aria-current={section.id === ch.id ? "step" : undefined}
          style={{ ...TAB,
            background: section.id === ch.id ? "#224653" : "transparent",
            borderColor: section.id === ch.id ? "#67b3ae" : "#3b5969",
            color: section.id === ch.id ? "#edfbff" : "#b8ccd8" }}
          onClick={() => setFrame(ch.start)}>
          {String(i + 1).padStart(2, "0")} · {ch.label}
        </button>)}
      </nav>
      <p style={{ color: "#859eaf", fontSize: 13, lineHeight: 1.5, margin: "15px 0 0" }}>
        Illustrative workflow. The sample vectors, extracted passages and model response are simulated.
      </p>
    </div>
  </main>;
}
function CaptureMode() {
  const built = useRagProduction();
  const capture = useRef<ExplainerFrameCaptureHandle>(null);
  useEffect(() => {
    const host = window as Window & { __kmRagSeekFrame?: (frame: number) => Promise<void> };
    host.__kmRagSeekFrame = async frame => {
      if (!capture.current) throw new Error("RAG capture has not mounted.");
      await capture.current.seek(frame);
    };
    return () => { delete host.__kmRagSeekFrame; };
  }, []);
  if (!built.ok) return <pre role="alert">{built.error}</pre>;
  return <div data-rag-export-mode="" style={{ width: RAG_OUTPUT.width, margin: 0 }}>
    <ExplainerFrameCapture sequence={built.sequence} ref={capture}
      textStyle={COPY} protectedVisualRegion={RAG_VISUAL_REGION}
      renderVisual={state => <RagVisual state={state} />}
      style={{ width: RAG_OUTPUT.width, background: "#102434" }} />
  </div>;
}
function RagExplainer() {
  // This is not an extra Storybook story. It is the same entry viewed by the
  // opt-in local frame exporter at the exact fixed output resolution.
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("ragExport") === "1"
    ? <CaptureMode /> : <Playback />;
}

const meta = {
  title: "Explainers/What Is RAG",
  component: RagExplainer,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "One 107-second story: extract PDF text, chunk, embed, index, type a question, compare keyword search with RAG, embed the query, zoom toward relevant source vectors, recover original passages and generate a cited answer. One responsive Storybook page; ?ragExport=1 for deterministic fixed-resolution capture." } },
  },
} satisfies Meta<typeof RagExplainer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CompleteExplainer: Story = { name: "RAG · From PDF to cited answer" };
