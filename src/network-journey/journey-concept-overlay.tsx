/** Deterministic educational diagrams layered over the shared 3D camera, not another renderer/clock. */
import type { JourneyAspect, JourneySettings } from "./journey-content";
import { JOURNEY_CHAPTERS, JOURNEY_THEME } from "./journey-content";

type ChapterId = (typeof JOURNEY_CHAPTERS)[number]["id"];

export interface JourneyConceptOverlayProps {
  chapter: ChapterId;
  frame: number;
  aspect: JourneyAspect;
  settings: JourneySettings;
}

interface ConceptStep { label: string; detail: string; state?: "secure" | "warning" }

function chapterSteps(chapter: ChapterId, settings: JourneySettings): ConceptStep[] | null {
  switch (chapter) {
    case "secure":
      return [
        { label: "Your device", detail: "TLS endpoint", state: "secure" },
        { label: "Messaging service", detail: settings.protection === "end-to-end" ? "Relays protected content" : "May process plaintext", state: settings.protection === "end-to-end" ? "secure" : "warning" },
        { label: "Recipient", detail: "Separate TLS connection", state: "secure" },
      ];
    case "packets":
      return [
        { label: "App message", detail: "One logical message" },
        { label: "Transport data", detail: "Protected in transit", state: "secure" },
        { label: "Network packets", detail: "Variable count" },
      ];
    case "network":
      return [
        { label: "Incoming packet", detail: "Destination address" },
        { label: settings.selectedRouter.replace(/-/g, " "), detail: "Forwarding decision" },
        { label: "Next hop", detail: "Another router or service" },
      ];
    case "server":
      return [
        { label: "Receive", detail: "Connection endpoint" },
        { label: "Process", detail: "Application logic" },
        { label: "Deliver / queue", detail: "Depends on service" },
      ];
    case "delivery":
      return settings.recipientOnline
        ? [
            { label: "Service", detail: "Ready to deliver" },
            { label: "Recipient device", detail: "Online connection", state: "secure" },
            { label: "Delivery status", detail: "Not a read receipt" },
          ]
        : [
            { label: "Service", detail: "Accepted message" },
            { label: "Delivery queue", detail: "Recipient offline", state: "warning" },
            { label: "Later", detail: "Deliver after reconnection" },
          ];
    default:
      return null;
  }
}

const CAPTIONS: Partial<Record<ChapterId, string>> = {
  secure: "TLS protects each client–service connection; E2EE, if present, is additional.",
  packets: "These glowing pieces visualize transport—not a fixed mapping of words to IP packets.",
  network: "Forwarding uses network addresses; routers need not read message contents.",
  server: "A conceptual service stack, not a literal machine interior.",
  delivery: "Delivery and read receipts are separate, application-dependent events.",
};

export function JourneyConceptOverlay({ chapter, frame, aspect, settings }: JourneyConceptOverlayProps) {
  const steps = chapterSteps(chapter, settings);
  if (!steps) return null;

  const portrait = aspect === "portrait";
  const width = portrait ? 900 : 1600;
  const height = portrait ? 1600 : 900;
  const chapterInfo = JOURNEY_CHAPTERS.find(ch => ch.id === chapter)!;
  const duration = chapterInfo.end - chapterInfo.start;
  const progress = Math.max(0, Math.min(1, (frame - chapterInfo.start) / duration));
  const active = Math.min(2, Math.floor(progress * 3));
  const panel = portrait
    ? { x: 64, y: 1030, width: 772, height: 344 }
    : { x: 830, y: 300, width: 704, height: 310 };
  const pad = portrait ? 30 : 26;
  const columnWidth = (panel.width - pad * 2 - 24) / 3;
  const boxGap = 12;
  const textColor = JOURNEY_THEME.pale;
  const labelSize = portrait ? 23 : 21;
  const detailSize = portrait ? 18 : 17;
  const caption = CAPTIONS[chapter]!;
  const stepsY = panel.y + (portrait ? 105 : 96);
  const boxHeight = portrait ? 132 : 116;

  return <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`}
    width="100%" height="100%" data-network-concept={chapter}
    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <rect x={panel.x} y={panel.y} width={panel.width} height={panel.height} rx="19"
      fill={JOURNEY_THEME.raised} fillOpacity=".93" stroke={JOURNEY_THEME.route} strokeWidth="2" />
    <text x={panel.x + pad} y={panel.y + 46} fontFamily="'Geist Variable', sans-serif"
      fontSize={18} fontWeight="500" letterSpacing="2.1" fill={JOURNEY_THEME.teal}>
      {chapter === "secure" ? "WHAT IS PROTECTED?" : chapter === "packets" ? "FROM DATA TO NETWORK" : chapter === "network" ? "ONE HOP AT A TIME" : chapter === "server" ? "A SERVICE, NOT A SINGLE BOX" : "DELIVERY IS NOT READING"}
    </text>
    {steps.map((step, i) => {
      const x = panel.x + pad + i * (columnWidth + boxGap);
      const selected = i === active;
      const stroke = selected ? JOURNEY_THEME.message : JOURNEY_THEME.route;
      return <g key={i}>
        <rect x={x} y={stepsY} width={columnWidth} height={boxHeight} rx="12"
          fill={selected ? "#2a454a" : JOURNEY_THEME.background} stroke={stroke}
          strokeWidth={selected ? 2.5 : 1} />
        <circle cx={x + 22} cy={stepsY + 26} r={5} fill={selected ? JOURNEY_THEME.message : JOURNEY_THEME.teal} />
        <text x={x + 18} y={stepsY + 58} fill={textColor} fontSize={labelSize}
          fontWeight={selected ? 600 : 450} fontFamily="'Geist Variable', sans-serif">
          {step.label.length > 17 ? step.label.slice(0, 16) + "…" : step.label}
        </text>
        <text x={x + 18} y={stepsY + 85} fontSize={detailSize} fontFamily="'Geist Variable', sans-serif"
          fill={step.state === "warning" ? JOURNEY_THEME.message : JOURNEY_THEME.muted}>
          {step.detail.length > 21 ? step.detail.slice(0, 20) + "…" : step.detail}
        </text>
        {i < 2 ? <path d={`M${x + columnWidth + 2} ${stepsY + boxHeight / 2} h${boxGap - 4}`}
          stroke={JOURNEY_THEME.message} strokeWidth="2.5" strokeLinecap="round" /> : null}
      </g>;
    })}
    <text x={panel.x + pad} y={panel.y + panel.height - 47} fill={JOURNEY_THEME.muted}
      fontFamily="'Geist Variable', sans-serif" fontSize={portrait ? 19 : 17}>
      {caption.length > (portrait ? 68 : 75) ? caption.slice(0, portrait ? 65 : 72) + "…" : caption}
    </text>
    {chapter === "secure" && settings.protection === "end-to-end" ? <text x={panel.x + pad}
      y={panel.y + panel.height - 19} fill={JOURNEY_THEME.message}
      fontFamily="'Geist Variable', sans-serif" fontSize={17}>E2EE: an additional content boundary across the service.</text> : null}
  </svg>;
}
