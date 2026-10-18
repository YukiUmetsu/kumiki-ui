/** Final editorial recap: the REAL recipient phone remains the anchor.
 * Short, progressive callouts trace the four responsibilities; no anonymous
 * network boxes, slide UI, extra clock, or misleading end-to-end packet model.
 */
import { JourneyPhoneCloseup } from "./journey-phone-closeup";
import type { JourneyAspect, JourneySettings } from "./journey-content";

export const JOURNEY_RECAP_START = 2550;
export const JOURNEY_RECAP_STEPS = [
  { id: "find", verb: "FIND", detail: "DNS locates the service." },
  { id: "protect", verb: "PROTECT", detail: "TLS secures the connection." },
  { id: "forward", verb: "FORWARD", detail: "IP routers choose the next hop." },
  { id: "deliver", verb: "DELIVER", detail: "The service reaches the recipient." },
] as const;

export function journeyRecapProgress(frame: number) {
  const local = Math.max(0, Math.min(149, frame - JOURNEY_RECAP_START));
  const reveal = JOURNEY_RECAP_STEPS.map((_, index) => {
    const start = 12 + index * 27;
    const x = Math.max(0, Math.min(1, (local - start) / 14));
    return x * x * (3 - 2 * x);
  });
  return { local, reveal, progress: Math.max(0, Math.min(1, (local - 8) / 119)) };
}

export interface JourneyFinalSummaryProps {
  frame: number;
  aspect: JourneyAspect;
  settings: JourneySettings;
}

export function JourneyFinalSummary({ frame, aspect, settings }: JourneyFinalSummaryProps) {
  const portrait = aspect === "portrait";
  const { reveal, progress } = journeyRecapProgress(frame);
  const lastDetail = settings.recipientOnline ? JOURNEY_RECAP_STEPS[3].detail : "The service can queue it until reconnect.";
  const steps = JOURNEY_RECAP_STEPS.map((item, index) => ({
    ...item, detail: index === 3 ? lastDetail : item.detail, opacity: reveal[index],
  }));
  const heading = settings.recipientOnline ? "One message. Four steps." : "One message. Awaiting delivery.";

  return <div data-journey-summary="" data-recap-progress={progress.toFixed(3)} role="img"
    aria-label={`Message journey recap. Find the service with DNS. Protect the connection with TLS. Forward through IP routers. ${lastDetail}`}
    className="absolute inset-0 overflow-hidden" style={{
      background: "radial-gradient(ellipse at 28% 35%,#31505a 0%,transparent 47%),linear-gradient(120deg,#132a35,#122832 62%,#0e202a)",
      color: "#f1f6f1", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
    <div aria-hidden="true" className="absolute inset-0" style={{
      opacity: .15,
      backgroundImage: "linear-gradient(90deg,#86b8b2 1px,transparent 1px),linear-gradient(#86b8b2 1px,transparent 1px)",
      backgroundSize: "85px 85px",
      maskImage: "linear-gradient(90deg,transparent 25%,black 100%)",
    }} />
    {/* This is the actual message app, not a simplified phone icon or box. */}
    <div className="absolute overflow-hidden" style={portrait
      ? { top: "13%", left: 0, width: "100%", height: "43%", transform: "scale(.96)" }
      : { top: "4%", left: "1%", width: "45%", height: "92%" }}>
      <JourneyPhoneCloseup frame={frame} kind="recipient" recipientOnline={settings.recipientOnline}
        portrait={portrait} />
    </div>
    <section aria-hidden="true" className="absolute" style={portrait
      ? { top: "5%", left: "7%", right: "7%" }
      : { top: "17%", left: "49%", right: "6%" }}>
      <div style={{
        color: "#87d4c9", letterSpacing: ".19em", fontWeight: 700,
        fontSize: portrait ? "clamp(10px,1.4vw,17px)" : "clamp(11px,1vw,17px)",
      }}>THE JOURNEY / RECAP</div>
      <h2 style={{
        fontSize: portrait ? "clamp(22px,4.4vw,42px)" : "clamp(29px,3vw,49px)",
        lineHeight: 1.12, fontWeight: 530, letterSpacing: "-.04em",
        margin: "11px 0 0", textWrap: "balance",
      }}>{heading}</h2>
    </section>
    <div className="absolute" style={portrait
      ? { top: "60%", left: "9%", right: "7%", height: "34%" }
      : { top: "40%", left: "52%", right: "7%", height: "44%" }}>
      <div aria-hidden="true" style={{
        position: "absolute", left: 6, top: "10%", bottom: "9%", width: 1.5,
        background: "rgba(129,182,178,.27)",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", left: 5.5, top: "10%", width: 2.5,
        height: `${80 * progress}%`, background: "#eabb7d",
        boxShadow: "0 0 11px #eabb7d66",
      }} />
      {steps.map((step, index) => <div key={step.id} data-recap-step={step.id}
        data-revealed={step.opacity > .99 ? "true" : "false"}
        style={{
          position: "absolute", left: 0, width: "100%", top: `${index * 26}%`,
          display: "grid", gridTemplateColumns: "28px 1fr", gap: 14,
          transform: `translateY(${(1 - step.opacity) * 8}px)`, opacity: step.opacity,
        }}>
        <div aria-hidden="true" style={{
          width: 14, height: 14, marginTop: 4, borderRadius: "50%",
          border: "2px solid #eabb7d", background: step.opacity > .9 ? "#eabb7d" : "#19353d",
          boxShadow: step.opacity > .9 ? "0 0 13px #eabb7d70" : "none",
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: portrait ? "clamp(14px,2.5vw,27px)" : "clamp(16px,1.4vw,25px)",
            lineHeight: 1.1, fontWeight: 680, letterSpacing: ".045em",
          }}>{step.verb}</div>
          <div style={{
            color: "#bdd7d5", fontSize: portrait ? "clamp(11px,1.9vw,20px)" : "clamp(12px,1.05vw,19px)",
            marginTop: 4, lineHeight: 1.3, overflowWrap: "break-word",
          }}>{step.detail}</div>
        </div>
      </div>)}
    </div>
    <div aria-hidden="true" style={{
      position: "absolute", right: portrait ? "7%" : "6%", bottom: portrait ? "2%" : "6%",
      maxWidth: portrait ? "86%" : "43%", color: "#90b8b9",
      fontSize: portrait ? "clamp(9px,1.2vw,13px)" : "clamp(10px,.95vw,15px)",
      lineHeight: 1.35, textAlign: "right",
    }}>Illustrative client–server path. Delivered does not mean read.</div>
  </div>;
}
