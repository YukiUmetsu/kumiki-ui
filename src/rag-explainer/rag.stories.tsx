import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExplainerPlayer } from "../../registry/visual/explainer-player";
import { ExplainerFrameCapture } from "../../registry/visual/explainer-frame-capture";
import type { ExplainerFrameCaptureHandle } from "../../registry/visual/explainer-frame-capture";
import { evaluateExplainerFrame } from "../../registry/visual/explainer-sequence";
import { createRagProduction, RAG_CHAPTERS, RAG_OUTPUT } from "./rag-production";
import { RagVisual } from "./rag-visual";

const COPY: CSSProperties = {
  color: "#ecf6ff",
  fontFamily: "'Geist Variable', Inter, system-ui, sans-serif",
  fontSize: "clamp(17px, 2.35cqi, 35px)",
  fontWeight: 540,
  lineHeight: 1.42,
  letterSpacing: "-.022em",
  textShadow: "0 2px 16px #07131d",
};

const SHELL: CSSProperties = {
  minHeight: "100vh", background: "#0b1723", color: "#edf4fb",
  padding: "clamp(20px, 5vw, 76px)",
  fontFamily: "'Geist Variable', Inter, system-ui, sans-serif",
};
const H1: CSSProperties = {
  fontSize: "clamp(36px, 5vw, 68px)", fontWeight: 550,
  lineHeight: 1.07, letterSpacing: "-.045em",
  margin: "10px 0 18px",
};
const BUTTON: CSSProperties = {
  background: "#203644", color: "#e6f7ff",
  border: "1px solid #51727e", borderRadius: 12,
  padding: "12px 16px", fontSize: 14, cursor: "pointer",
};

function useRag() {
  return useMemo(() => {
    try { return { ok: true as const, sequence: createRagProduction() }; }
    catch (cause) {
      return { ok: false as const, error: cause instanceof Error ? cause.message : String(cause) };
    }
  }, []);
}
function Introduction() {
  return <>
    <span style={{ fontSize: 12, letterSpacing: ".22em", color: "#7ce5d6", fontWeight: 650 }}>
      KUMIKI / REFERENCE PRODUCTION 02
    </span>
    <h1 style={H1}>What is RAG, and how does it work?</h1>
    <p style={{ maxWidth: 780, marginBottom: 30, color: "#b7cbd9", fontSize: 18, lineHeight: 1.6 }}>
      A 36-second visual explanation of retrieval-augmented generation, using an
      illustrative internal policy question. Five scenes, one fixed camera, no
      artificial zoom and no camera-driven caption movement.
    </p>
  </>;
}

function RagPlayback() {
  const built = useRag();
  const [frame, setFrame] = useState(0);
  if (!built.ok) return <main style={SHELL}><Introduction /><pre role="alert">{built.error}</pre></main>;
  const sequence = built.sequence;
  const active = RAG_CHAPTERS.find(c => frame >= c.start && frame < c.end) ?? RAG_CHAPTERS[4];
  const cues = sequence.director.cues.filter(c => c.frame === frame);
  return <main style={SHELL}>
    <div style={{ maxWidth: 1320, margin: "0 auto" }}>
      <Introduction />
      <ExplainerPlayer sequence={sequence} strict initialFrame={0} textStyle={COPY}
        onFrameChange={setFrame} renderVisual={state => <RagVisual state={state} />}
        style={{ background: "#0f2533", border: "1px solid #315162",
          borderRadius: 20, overflow: "hidden", boxShadow: "0 18px 70px #0008" }} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between",
        gap: 14, padding: "20px 2px", color: "#a9c0ce", fontSize: 14 }}>
        <span>Scene: {active.label} · {(frame / 30).toFixed(1)} / 36.0 seconds</span>
        <span>Narration cue: {cues.find(c => c.payload.kind === "narration")?.id ?? "—"}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        {RAG_CHAPTERS.map(ch => <button key={ch.id} type="button"
          style={{ ...BUTTON, background: active.id === ch.id ? "#315966" : "#203644" }}
          onClick={() => setFrame(ch.start)}>
          {ch.label}
        </button>)}
      </div>
      <p style={{ marginTop: 22, fontSize: 14, color: "#9db9c7", lineHeight: 1.65 }}>
        Visuals show the preparation and retrieval steps conceptually. Scores, documents
        and policy text are illustrative. RAG provides retrieved evidence to the model;
        it does not guarantee a correct answer or retrain the model.
      </p>
    </div>
  </main>;
}

function RagCapture() {
  const built = useRag();
  const capture = useRef<ExplainerFrameCaptureHandle>(null);
  const [status, setStatus] = useState("Choose a frame to prepare for browser capture.");
  if (!built.ok) return <main style={SHELL}><pre role="alert">{built.error}</pre></main>;
  const sequence = built.sequence;
  return <main style={SHELL}>
    <div style={{ maxWidth: 1700, margin: "auto" }}>
      <Introduction />
      <p style={{ marginBottom: 16, color: "#a9c0ce" }}>
        Seeking to a frame does not require playing the previous frames.
        The same scene, fonts and captions are used in the video preview.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        {[75, 285, 522, 799, 1000].map(frame => <button key={frame}
          style={BUTTON} type="button"
          onClick={() => {
            setStatus("Preparing frame " + frame + " …");
            void capture.current?.seek(frame).then(
              () => {
                const state = evaluateExplainerFrame(sequence, frame);
                setStatus("Capture-ready: " + state.shot.id + " at frame " + frame + ".");
              },
              error => setStatus("Capture failed: " + String(error)),
            );
          }}>
          Prepare frame {frame}
        </button>)}
      </div>
      <p role="status" style={{ fontSize: 14, minHeight: 25, color: "#80e8d7" }}>{status}</p>
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <ExplainerFrameCapture ref={capture} sequence={sequence} textStyle={COPY}
          renderVisual={state => <RagVisual state={state} />}
          style={{ width: RAG_OUTPUT.width, background: "#0f2533" }} />
      </div>
    </div>
  </main>;
}

const meta = {
  title: "Explainers/What Is RAG",
  component: RagPlayback,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component:
      "36-second explanation: documents → chunks/embeddings → vector retrieval → prompt context → cited answer. " +
      "Absolute-frame SVG animation with a locked camera and intentional chapter dissolves." } },
  },
} satisfies Meta<typeof RagPlayback>;

export default meta;
type Story = StoryObj<typeof meta>;
export const CompleteExplainer: Story = { name: "01 · Play complete RAG explainer" };
export const CaptureFrames: Story = {
  name: "02 · Prepare export-ready frames",
  render: () => <RagCapture />,
};
