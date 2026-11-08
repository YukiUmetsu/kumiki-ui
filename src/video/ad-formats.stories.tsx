import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrandBug, FilmCard } from "../../registry/video/film-cards-react";
import type { FilmCardSafeInset } from "../../registry/video/film-cards-react";
import type { FilmBrand, FilmCardContent } from "../../registry/video/film-cards";
import { compileAdBrief } from "../../registry/video/ad-formats";
import type { AdBrief } from "../../registry/video/ad-formats";
import budget from "../../examples/ads/budget-hook-body-close.ad.json";
import problem from "../../examples/ads/budget-problem-solution.ad.json";
import desk from "../../examples/ads/desk-before-after.ad.json";
import study from "../../examples/ads/study-three-reasons.ad.json";
import sleep from "../../examples/ads/sleep-myth-vs-fact.ad.json";
import tool from "../../examples/ads/tool-social-proof.ad.json";

/** The safe areas the film presets declare: the bands that platform players cover. */
const SAFE: Record<string, FilmCardSafeInset> = { vertical: { left: .08, right: .12, top: .09, bottom: .19 }, landscape: { left: .08, right: .12, top: .09, bottom: .1 }, square: { left: .08, right: .12, top: .09, bottom: .1 } };
const SIZE = { vertical: [270, 480], landscape: [480, 270], square: [360, 360] } as const;
type Aspect = keyof typeof SIZE;
const brand: FilmBrand = { name: "Brand A", color: "#2f6bff", cta: { text: "Try it free", url: "example.com/start" }, bug: true };
const CARDS: Record<string, FilmCardContent> = {
  headline: { card: "headline", text: "Your budget leaks every single week", emphasis: "leaks" },
  list: { card: "list", title: "Why it works", items: ["See every charge in one place", "Cancel what you forgot", "Keep the difference"] },
  versus: { card: "versus", left: { label: "Before", items: ["Ten apps", "Missed bills"] }, right: { label: "After", items: ["One view", "Bills on time"] }, strike: true },
  quote: { card: "quote", quote: "I found two subscriptions I had forgotten about.", name: "A. Reviewer", role: "Freelancer", rating: 5 },
  end: { card: "end", line: "Find your leaks in two minutes." },
};

/** A card drawn at full output size and scaled down, so the type, safe area and layout are exactly what the film renders. */
function Card({ content, frame, aspect, cardBrand = brand, label }: { content: FilmCardContent; frame: number; aspect: Aspect; cardBrand?: FilmBrand; label?: string }) {
  const [w, h] = SIZE[aspect], full = aspect === "vertical" ? [1080, 1920] : aspect === "landscape" ? [1920, 1080] : [1080, 1080], scale = w / full[0];
  return <figure style={{ margin: 0 }}>
    <div style={{ width: w, height: h, overflow: "hidden", position: "relative", borderRadius: 6 }}>
      <div style={{ width: full[0], height: full[1], transform: `scale(${scale})`, transformOrigin: "0 0", position: "relative" }}>
        <FilmCard content={content} brand={cardBrand} frame={frame} fps={30} width={full[0]} height={full[1]} safeInset={SAFE[aspect]} />
        {content.card !== "end" && cardBrand.bug && <BrandBug brand={cardBrand} width={full[0]} height={full[1]} safeInset={SAFE[aspect]} />}
      </div>
    </div>
    {label && <figcaption style={{ color: "#c9ced6", font: "600 12px system-ui", padding: "6px 2px" }}>{label}</figcaption>}
  </figure>;
}

const meta: Meta = { title: "Video production/Ad Formats", parameters: { layout: "fullscreen", backgrounds: { default: "dark" } } };
export default meta;
type Story = StoryObj;

/** Every card kind, held after it has landed, in the three output shapes. */
export const Cards: Story = {
  render: () => <div style={{ background: "#0b0d10", padding: 16, display: "grid", gap: 20 }}>
    {(["vertical", "landscape", "square"] as const).map(aspect => <div key={aspect} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
      {Object.entries(CARDS).map(([id, content]) => <Card key={id} content={content} frame={240} aspect={aspect} label={`${id} · ${aspect}`} />)}
    </div>)}
  </div>,
};

/** One card through its entrance: words rise behind masks, list points arrive one by one, the strike draws. Scrub `frame`. */
export const Entrance: StoryObj<{ card: keyof typeof CARDS; frame: number; aspect: Aspect }> = {
  args: { card: "list", frame: 40, aspect: "vertical" },
  argTypes: { card: { control: "select", options: Object.keys(CARDS) }, frame: { control: { type: "range", min: 0, max: 200 } }, aspect: { control: "inline-radio", options: ["vertical", "landscape", "square"] } },
  render: ({ card, frame, aspect }) => <div style={{ background: "#0b0d10", padding: 16, display: "flex", gap: 12 }}>
    {[0, 12, 24].map(offset => <Card key={offset} content={CARDS[card]} frame={frame + offset} aspect={aspect} label={`frame ${frame + offset}`} />)}
  </div>,
};

const BRIEFS = [budget, problem, desk, study, sleep, tool] as unknown as AdBrief[];
/** Each example brief, compiled: its card scenes at their hold, in order, with the 3D product shot named where it sits. */
export const Formats: Story = {
  name: "Ad Formats",
  render: () => <div style={{ background: "#0b0d10", padding: 16, display: "grid", gap: 24 }}>
    {BRIEFS.map(brief => {
      const result = compileAdBrief(brief);
      if (!result.ok) return <pre key={brief.id} style={{ color: "#f88" }}>{result.problems.map(p => p.message).join("\n")}</pre>;
      const film = result.film, seconds = film.scenes.reduce((sum, s) => sum + s.durationFrames, 0) / 30;
      return <section key={brief.id}>
        <h3 style={{ color: "#eef0f3", font: "650 15px system-ui", margin: "0 0 8px" }}>{brief.format} · {film.scenes.length} scenes · {seconds.toFixed(1)} s</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
          {film.scenes.map(scene => scene.recipeId === "card"
            ? <Card key={scene.id} content={scene.content} frame={scene.durationFrames - 1} aspect="vertical" cardBrand={film.brand!} label={`${scene.id} · ${(scene.durationFrames / 30).toFixed(1)} s`} />
            : <figure key={scene.id} style={{ margin: 0 }}><div style={{ width: 270, height: 480, borderRadius: 6, display: "grid", placeItems: "center", background: "#1a1d22", color: "#9aa3ad", font: "500 13px system-ui", textAlign: "center", padding: 16, boxSizing: "border-box" }}>
              3D product shot (hero turn). Rendered by film:review and film:render.</div>
              <figcaption style={{ color: "#c9ced6", font: "600 12px system-ui", padding: "6px 2px" }}>{scene.id} · {(scene.durationFrames / 30).toFixed(1)} s</figcaption></figure>)}
        </div>
      </section>;
    })}
  </div>,
};
