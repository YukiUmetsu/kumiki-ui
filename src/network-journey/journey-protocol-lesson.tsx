/** The OSI model is a teaching reference, not the actual implementation
 * hierarchy of a modern internet application. Animate a credible real-world
 * encapsulation path while showing how seven conceptual OSI layers relate.
 */
import { JOURNEY_THEME } from "./journey-content";
import type { JourneyAspect } from "./journey-content";

type ProtocolLayer = { n: number; name: string; example: string; meaning: string };
export const OSI_LAYERS: readonly ProtocolLayer[] = [
  { n: 7, name: "Application", example: "Chat app · HTTP / WebSocket (possible)", meaning: "The application defines message meaning and APIs." },
  { n: 6, name: "Presentation", example: "Encoding · data formats", meaning: "A useful conceptual role, not usually a separate Internet module." },
  { n: 5, name: "Session", example: "Managing conversations and connections", meaning: "Sessions are commonly implemented in applications or libraries." },
  { n: 4, name: "Transport", example: "TCP · UDP / QUIC", meaning: "Transport provides end-to-end transport mechanisms." },
  { n: 3, name: "Network", example: "IP", meaning: "IP packets carry destination network addresses for routing." },
  { n: 2, name: "Data link", example: "Wi-Fi · Ethernet", meaning: "Frames move across one local link." },
  { n: 1, name: "Physical", example: "Radio · copper · optical light", meaning: "Physical signals encode bits on a medium." },
] as const;

export interface JourneyProtocolLessonProps {
  frame: number;
  aspect: JourneyAspect;
  highlightLayer?: number;
}

export function JourneyProtocolLesson({ frame, aspect, highlightLayer }: JourneyProtocolLessonProps) {
  const portrait = aspect === "portrait", width = portrait ? 900 : 1600, height = portrait ? 1600 : 900;
  // Chapter four occurs [840,1260), protocol study appears after the VT1 split.
  const t = Math.max(0, Math.min(1, (frame - 945) / 215));
  const sequence = Math.min(6, Math.floor(t * 7));
  const activeIndex = highlightLayer === undefined ? sequence : Math.max(0, Math.min(6, 7 - highlightLayer));
  const left = portrait ? 68 : 106, top = portrait ? 490 : 290;
  const layerHeight = portrait ? 120 : 73;
  const bandWidth = portrait ? 762 : 930;
  const xNum = left + 25, xName = left + (portrait ? 78 : 84), xExample = left + (portrait ? 258 : 296);
  const fg = JOURNEY_THEME.pale, mint = JOURNEY_THEME.teal, gold = JOURNEY_THEME.message;

  const now = OSI_LAYERS[activeIndex];
  return <svg role="img" width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}
    data-network-protocol-lesson="" aria-label="Conceptual OSI seven-layer model. Modern Internet protocols are not always cleanly separated into those seven layers."
    xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <defs>
      <linearGradient id="journey-protocol-stage" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#112530" /><stop offset="1" stopColor="#243f48" />
      </linearGradient>
      <pattern id="journey-protocol-micro" width="44" height="44" patternUnits="userSpaceOnUse">
        <path d="M44 0H0V44" stroke="#a8d0ce" strokeWidth=".4" opacity=".12" fill="none" />
      </pattern>
    </defs>
    <rect width={width} height={height} fill="url(#journey-protocol-stage)" />
    <rect width={width} height={height} fill="url(#journey-protocol-micro)" />
    <path d={`M${left} ${portrait ? 140 : 92}h70`} stroke={gold} strokeWidth="4" />
    <text x={left} y={portrait ? 202 : 140} fontFamily="'Geist Variable',sans-serif"
      fill={mint} fontSize={portrait ? 22 : 19} letterSpacing="3">04 / UNDER THE MESSAGE</text>
    <text x={left} y={portrait ? 285 : 210} fill={fg} fontFamily="'Geist Variable',sans-serif"
      fontSize={portrait ? 42 : 55} fontWeight="560">Seven layers. One useful model.</text>
    <text x={left} y={portrait ? 343 : 252} fill="#b8d0ce"
      fontFamily="'Geist Variable',sans-serif" fontSize={portrait ? 21 : 21}>
      {portrait ? "OSI explains roles; Internet protocols do not" : "The OSI model explains roles, not seven separate boxes inside your phone."}
    </text>
    {portrait ? <text x={left} y="377" fill="#b8d0ce" fontSize="24"
      fontFamily="'Geist Variable',sans-serif">always map to separate software modules.</text> : null}
    {OSI_LAYERS.map((layer, index) => {
      const y = top + index * layerHeight;
      const isCurrent = index === activeIndex;
      const seen = index <= sequence;
      return <g key={layer.n}>
        <rect x={left} y={y} width={bandWidth} height={layerHeight - 5} rx="8"
          fill={isCurrent ? "#38545c" : seen ? "#263f48" : "#1b333d"}
          stroke={isCurrent ? gold : "#45636b"} strokeWidth={isCurrent ? 2.5 : .8} />
        <rect x={left} y={y} width={isCurrent ? 7 : 3} height={layerHeight - 5} rx="2"
          fill={isCurrent ? gold : mint} />
        <text x={xNum} y={y + (portrait ? 65 : 44)} fill={isCurrent ? gold : mint}
          fontFamily="'Geist Variable',sans-serif" fontSize={portrait ? 32 : 28} fontWeight="650">{layer.n}</text>
        <text x={xName} y={y + (portrait ? 54 : 43)} fill={fg}
          fontFamily="'Geist Variable',sans-serif" fontSize={portrait ? 30 : 26} fontWeight={isCurrent ? 650 : 460}>{layer.name}</text>
        {portrait
          ? <text x={xName} y={y + 90} fill="#abc4c6" fontFamily="'Geist Variable',sans-serif" fontSize={18}>
              {layer.example.length > 43 ? layer.example.slice(0, 42) + "…" : layer.example}
            </text>
          : <text x={xExample} y={y + 43} fill={isCurrent ? fg : "#b1caca"}
              fontFamily="'Geist Variable',sans-serif" fontSize={20}>{layer.example}</text>}
      </g>;
    })}
    {portrait ? <>
      <text x={left} y="1430" fill={gold} fontFamily="'Geist Variable',sans-serif" fontWeight="650" fontSize="29">{now.name.toUpperCase()}</text>
      <text x={left} y="1485" fill={fg} fontFamily="'Geist Variable',sans-serif" fontSize="23">
        {now.meaning.length > 58 ? now.meaning.slice(0, 57) + "…" : now.meaning}
      </text>
    </> : <>
      <path d="M1085 295v420" stroke="#627d83" strokeWidth="2" strokeDasharray="5 13" />
      <text x="1130" y="329" fill={gold} fontSize="20" fontWeight="650"
        letterSpacing="2" fontFamily="'Geist Variable',sans-serif">IN FOCUS</text>
      <text x="1130" y="396" fill={fg} fontSize="37"
        fontFamily="'Geist Variable',sans-serif" fontWeight="560">{now.name}</text>
      {now.meaning.match(/.{1,32}(?:\s|$)/g)?.slice(0, 4).map((line, i) =>
        <text key={i} x="1130" y={455 + i * 32} fill="#c6dad9"
          fontFamily="'Geist Variable',sans-serif" fontSize="21">{line.trim()}</text>)}
      <text x="1130" y="659" fill={mint} fontFamily="'Geist Variable',sans-serif"
        fontSize="19">App data ↓ transport ↓ IP ↓ local links</text>
    </>}
    <path d={`M${left} ${height - (portrait ? 86 : 39)}h${bandWidth}`} stroke="#617d81" strokeWidth="1" />
    <text x={left} y={height - (portrait ? 51 : 13)} fill="#a8c6c7" fontFamily="'Geist Variable',sans-serif"
      fontSize={portrait ? 17 : 17}>
      TLS/QUIC layer boundaries vary by stack · Encapsulation is illustrative · OSI is a conceptual reference.
    </text>
  </svg>;
}
