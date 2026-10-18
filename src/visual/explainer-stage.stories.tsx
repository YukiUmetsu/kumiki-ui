import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ExplainerStage, ExplainerText, ExplainerVisual } from "../../registry/visual/explainer-stage";
import type { ExplainerStageProps } from "../../registry/visual/explainer-stage";
import type { ProtectedSubjectRegion } from "../../registry/visual/explainer-layout";

const subjects: ProtectedSubjectRegion[] = [{ id: "primary", region: { x: .08, y: .16, width: .42, height: .65 },
  portraitRegion: { x: .1, y: .08, width: .8, height: .48 } }];
function Composition({ aspect = "auto", text = "A clear path connects each part. The explanation occupies measured space beside the subject, then moves below it in portrait.", lang = "en", maxLines = 6, fontSize = 24 }: {
  aspect?: ExplainerStageProps["aspect"]; text?: string; lang?: string; maxLines?: number; fontSize?: number;
}) {
  return <section style={{ maxWidth: 1440, margin: "auto", color: "var(--km-text-primary)", padding: 16 }}>
    <style>{`[data-km-explainer-text][data-typography="wide"] { letter-spacing: 2px; }`}</style>
    <p style={{ fontSize: 14, margin: "0 0 8px" }}>CONSTRAINT-DRIVEN COMPOSITION</p>
    <h1 style={{ fontSize: 32, lineHeight: 1.15, margin: "0 0 24px" }}>Room for the subject. Space for the idea.</h1>
    <ExplainerStage subjects={subjects} protect={["primary"]} aspect={aspect} aria-label="Measured visual explanation"
      style={{ background: "var(--km-surface-subtle, #f2f3f4)", border: "1px solid var(--km-border-default, #b8b8b8)" }}>
      <ExplainerVisual aria-label="Abstract connected structure">
        {({ subjects: resolved }) => {
          const region = resolved[0].region;
          return <div data-testid="protected-primary" style={{ position: "absolute", left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%`, color: "var(--km-text-primary, #242424)" }}>
            <svg viewBox="0 0 400 400" width="100%" height="100%" role="img" aria-label="Five connected nodes">
              <path d="M70 200H200M200 200L310 90M200 200L310 200M200 200L310 310" stroke="currentColor" strokeWidth="4" fill="none" />
              <circle cx="70" cy="200" r="40" fill="currentColor" />
              <circle cx="200" cy="200" r="25" fill="var(--km-surface-default, white)" stroke="currentColor" strokeWidth="4" />
              {[90, 200, 310].map(y => <circle key={y} cx="310" cy={y} r="32" fill="var(--km-surface-default, white)" stroke="currentColor" strokeWidth="4" />)}
            </svg>
          </div>;
        }}
      </ExplainerVisual>
      <ExplainerText data-typography="wide" id="essential-explanation" lang={lang} maxLines={maxLines} style={{ fontSize, lineHeight: 1.4 }}>{text}</ExplainerText>
    </ExplainerStage>
  </section>;
}
const meta = { title: "Explainers/Explainer Stage", component: ExplainerStage, parameters: { layout: "fullscreen" }, tags: ["autodocs"] } satisfies Meta<typeof ExplainerStage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Responsive: Story = { render: () => <Composition /> };
export const Landscape: Story = { render: () => <Composition aspect="16:9" /> };
export const PortraitCJK: Story = { render: () => <div style={{ maxWidth: 480, margin: "auto" }}><Composition aspect="9:16" lang="ja" text="重要な被写体を保護しながら、説明文を読みやすい安全な場所に配置します。画面の幅に合わせて構成が変わります。" /></div> };
export const ImpossibleLayout: Story = { render: () => <Composition text={"An essential explanation that must remain fully readable. ".repeat(50)} maxLines={2} /> };
export const TypographyAndContent: Story = { render: function TypographyAndContent() {
  const [large, setLarge] = useState(false);
  return <><button style={{ margin: 16, padding: 12 }} onClick={() => setLarge(value => !value)}>Change typography</button>
    <Composition fontSize={large ? 32 : 24} text="Measured typography respects the font size and the available reading space." /></>;
} };
