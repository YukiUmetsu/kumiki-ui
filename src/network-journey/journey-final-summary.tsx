/** Concrete closing takeaways, not abstract chapter verbs.
 * The recipient's actual screen remains visible. No placeholder network boxes,
 * separate animation clocks, or unqualified claims about all messaging apps.
 */
import { JourneyPhoneCloseup } from "./journey-phone-closeup";
import type { JourneyAspect, JourneySettings } from "./journey-content";

export const JOURNEY_RECAP_START = 2505;
export const JOURNEY_RECAP_STEPS = [
  { id: "dns", term: "DNS", fact: "Finds the service address, if needed." },
  { id: "tls", term: "TLS", fact: "Secures the connection—not automatically end-to-end." },
  { id: "routing", term: "IP ROUTING", fact: "Forwards packets by destination address." },
  { id: "delivery", term: "DELIVERY", fact: "The service delivers it. Delivered isn't read." },
] as const;

export function journeyRecapProgress(frame: number) {
  const local = Math.max(0, Math.min(2699 - JOURNEY_RECAP_START, frame - JOURNEY_RECAP_START));
  const reveal = JOURNEY_RECAP_STEPS.map((_, index) => {
    const start = 15 + index * 38;
    const x = Math.max(0, Math.min(1, (local - start) / 15));
    return x * x * (3 - 2 * x);
  });
  return { local, reveal, progress: Math.max(0, Math.min(1, (local - 12) / 155)) };
}

export interface JourneyFinalSummaryProps {
  frame: number;
  aspect: JourneyAspect;
  settings: JourneySettings;
}

export function JourneyFinalSummary({ frame, aspect, settings }: JourneyFinalSummaryProps) {
  const portrait = aspect === "portrait";
  const { reveal, progress } = journeyRecapProgress(frame);
  const facts = JOURNEY_RECAP_STEPS.map((item, index) => ({
    ...item, opacity: reveal[index],
    fact: index === 1 && settings.protection === "end-to-end"
      ? "Protects each connection; E2EE also protects message content."
      : index === 3 && !settings.recipientOnline
        ? "The service can queue it until the recipient reconnects."
        : item.fact,
  }));
  const headline = settings.recipientOnline
    ? "Your message went through a service."
    : "Your message reached the service.";

  return <div data-journey-summary="" data-recap-progress={progress.toFixed(3)} role="img"
    aria-label={`Message recap. ${headline} ${facts.map(item => `${item.term}: ${item.fact}`).join(" ")}`}
    className="absolute inset-0 overflow-hidden" style={{
      background: "radial-gradient(ellipse at 28% 35%,#31505a 0%,transparent 47%),linear-gradient(120deg,#132a35,#122832 62%,#0e202a)",
      color: "#f1f6f1", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
    <div aria-hidden="true" className="absolute inset-0" style={{
      opacity: .12,
      backgroundImage: "linear-gradient(90deg,#86b8b2 1px,transparent 1px),linear-gradient(#86b8b2 1px,transparent 1px)",
      backgroundSize: "85px 85px",
      maskImage: "linear-gradient(90deg,transparent 25%,black 100%)",
    }} />
    <div className="absolute overflow-hidden" style={portrait
      ? { top: "11%", left: 0, width: "100%", height: "39%", transform: "scale(.94)" }
      : { top: "4%", left: "1%", width: "45%", height: "92%" }}>
      <JourneyPhoneCloseup frame={frame} kind="recipient" recipientOnline={settings.recipientOnline}
        portrait={portrait} />
    </div>
    <section aria-hidden="true" className="absolute" style={portrait
      ? { top: "4%", left: "7%", right: "7%" }
      : { top: "15%", left: "49%", right: "6%" }}>
      <div style={{
        color: "#87d4c9", letterSpacing: ".17em", fontWeight: 700,
        fontSize: portrait ? "clamp(10px,1.4vw,17px)" : "clamp(11px,1vw,16px)",
      }}>WHAT ACTUALLY HAPPENED</div>
      <h2 style={{
        fontSize: portrait ? "clamp(20px,3.8vw,38px)" : "clamp(28px,2.9vw,47px)",
        lineHeight: 1.13, fontWeight: 530, letterSpacing: "-.035em",
        margin: "12px 0 0", textWrap: "balance",
      }}>{headline}</h2>
    </section>
    <div className="absolute" style={portrait
      ? { top: "55%", left: "8%", right: "7%", height: "38%" }
      : { top: "40%", left: "51%", right: "6%", height: "48%" }}>
      <div aria-hidden="true" style={{
        position: "absolute", left: 7, top: "8%", bottom: "10%", width: 1.5,
        background: "rgba(129,182,178,.30)",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", left: 6.5, top: "8%", width: 2.5,
        height: `${82 * progress}%`, background: "#eabb7d",
        boxShadow: "0 0 11px #eabb7d66",
      }} />
      {facts.map((item, index) => <div key={item.id} data-recap-step={item.id}
        data-revealed={item.opacity > .99 ? "true" : "false"} style={{
          position: "absolute", left: 0, width: "100%", top: `${index * 25}%`,
          display: "grid", gridTemplateColumns: "26px minmax(0,1fr)", gap: 12,
          transform: `translateY(${(1 - item.opacity) * 9}px)`, opacity: item.opacity,
        }}>
        <span aria-hidden="true" style={{
          width: 13, height: 13, marginTop: 3, borderRadius: "50%",
          border: "2px solid #eabb7d", background: item.opacity > .9 ? "#eabb7d" : "#19353d",
          boxShadow: item.opacity > .9 ? "0 0 13px #eabb7d70" : "none",
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: "#94dbd0",
            fontSize: portrait ? "clamp(13px,2.1vw,22px)" : "clamp(15px,1.35vw,23px)",
            lineHeight: 1.15, fontWeight: 700, letterSpacing: ".035em",
          }}>{item.term}</div>
          <div style={{
            color: "#e4efeb",
            fontSize: portrait ? "clamp(12px,1.9vw,20px)" : "clamp(12px,1.13vw,20px)",
            marginTop: 3, lineHeight: 1.26, overflowWrap: "break-word",
          }}>{item.fact}</div>
        </div>
      </div>)}
    </div>
    <div aria-hidden="true" style={{
      position: "absolute", right: portrait ? "7%" : "6%", bottom: portrait ? "2%" : "5%",
      maxWidth: portrait ? "86%" : "43%", color: "#93babb",
      fontSize: portrait ? "clamp(9px,1.2vw,13px)" : "clamp(10px,.9vw,14px)",
      lineHeight: 1.3, textAlign: "right",
    }}>Illustrative client–server journey; applications can differ.</div>
  </div>;
}
