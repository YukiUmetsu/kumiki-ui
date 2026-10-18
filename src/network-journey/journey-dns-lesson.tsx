/** A standalone, cinematic DNS ladder—not boxes pasted over a 3D film.
 * Emphasizes the actual question, lookup, returned address, and subsequent
 * client-to-service connection. All animations derive from absolute MG1 frames.
 */
import { JOURNEY_THEME } from "./journey-content";
import type { JourneyAspect, JourneySettings } from "./journey-content";

export interface JourneyDnsLessonProps {
  frame: number;
  aspect: JourneyAspect;
  settings: JourneySettings;
}

const EXAMPLE_IP = "192.0.2.42"; // IANA documentation range—not a measured network address.

export function JourneyDnsLesson({ frame, aspect, settings }: JourneyDnsLessonProps) {
  const portrait = aspect === "portrait", w = portrait ? 900 : 1600, h = portrait ? 1600 : 900;
  const progress = Math.max(0, Math.min(1, (frame - 262) / 240));
  const step = Math.min(3, Math.floor(progress * 4));
  const x = portrait ? [125, 450, 775] : [220, 800, 1380];
  const headY = portrait ? 510 : 398;
  const lineTop = portrait ? 600 : 462, lineBottom = portrait ? 1230 : 725;
  const questionY = portrait ? 690 : 525, responseY = portrait ? 990 : 635;
  const appY = portrait ? 1270 : 770;
  const domain = (settings.domain.trim() || "messages.example.test").slice(0, 55);
  const fg = JOURNEY_THEME.pale, mint = JOURNEY_THEME.teal, amber = JOURNEY_THEME.message;
  const laneName = settings.cachedDns ? ["YOUR PHONE", "LOCAL CACHE", "MESSAGING SERVICE"] : ["YOUR PHONE", "DNS RESOLVER", "MESSAGING SERVICE"];
  const detail = settings.cachedDns
    ? ["The app already has an address", "Reuse a previously resolved answer", "Connect to the service"]
    : ["Needs the service's IP address", "Finds the address for the service", "Accepts the client connection"];
  const active = (index: number) => step >= index ? 1 : .18;
  const reveal = (start: number) => Math.max(0, Math.min(1, (progress - start) * 5.7));
  const query = reveal(0);
  const answer = reveal(.29);
  const connect = reveal(.59);
  const moving = (from: number, to: number, fraction: number) => from + (to - from) * fraction;

  return <svg data-network-dns-lesson="" role="img"
    aria-label={settings.cachedDns
      ? "The phone can reuse a cached DNS answer, then connect directly to the messaging service."
      : "The phone asks DNS for a messaging service address. DNS returns an IP address. The app connects to the service, not the recipient's phone."}
    width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <defs>
      <linearGradient id="journey-dns-back" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0e212b" /><stop offset=".65" stopColor="#193942" />
        <stop offset="1" stopColor="#1c333b" />
      </linearGradient>
      <pattern id="journey-dns-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" stroke="#c1e4df" strokeWidth=".45" opacity=".12" fill="none" />
      </pattern>
      <marker id="journey-dns-arrow" markerWidth="11" markerHeight="11" refX="9" refY="5.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0 0 L11 5.5 L0 11" fill="none" stroke={amber} strokeWidth="1.8" />
      </marker>
    </defs>
    <rect width={w} height={h} fill="url(#journey-dns-back)" />
    <rect width={w} height={h} fill="url(#journey-dns-grid)" />
    <path d={`M${portrait ? 60 : 108} ${portrait ? 165 : 116} h70`} stroke={amber} strokeWidth="4" />
    <text x={portrait ? 60 : 108} y={portrait ? 220 : 163} fill={mint}
      fontSize={portrait ? 22 : 21} letterSpacing="3" fontFamily="'Geist Variable',sans-serif">02 / FIND THE SERVICE</text>
    <text x={portrait ? 60 : 108} y={portrait ? 307 : 231} fontSize={portrait ? 56 : 57}
      fontFamily="'Geist Variable',sans-serif" fontWeight="550" fill={fg}>A name needs an address.</text>
    <text x={portrait ? 60 : 108} y={portrait ? 363 : 282} fill="#b9d2d1"
      fontSize={portrait ? 26 : 25} fontFamily="'Geist Variable',sans-serif">
      {portrait ? "DNS finds a service—not your friend's phone." : "DNS resolves the messaging service, not your friend's phone."}
    </text>
    {x.map((pos, i) => <g key={i}>
      <circle cx={pos} cy={headY - 36} r={i === 1 ? 22 : 15}
        fill={i === 1 ? amber : mint} fillOpacity={i === 1 ? 1 : .85} />
      <circle cx={pos} cy={headY - 36} r={i === 1 ? 36 : 28} stroke={i === 1 ? amber : mint}
        strokeWidth="1" fill="none" opacity=".45" />
      <text x={pos} y={headY + 10} fill={fg} fontSize={portrait ? 20 : 22}
        fontFamily="'Geist Variable',sans-serif" letterSpacing="1.8" fontWeight="650" textAnchor="middle">{laneName[i]}</text>
      <text x={pos} y={headY + 45} fill="#bed0d0" fontSize={portrait ? 16 : 19}
        fontFamily="'Geist Variable',sans-serif" textAnchor="middle">{detail[i]}</text>
      <path d={`M${pos} ${lineTop}V${lineBottom}`} stroke="#90b4b6"
        strokeWidth="1.4" strokeDasharray="5 10" opacity=".55" />
    </g>)}
    {settings.cachedDns ? <>
      <path d={`M${x[0] + 20} ${questionY} H${x[1] - 28}`}
        stroke={amber} strokeWidth="3.5" fill="none" markerEnd="url(#journey-dns-arrow)"
        strokeDasharray={`${(x[1] - x[0] - 48) * query} 4000`} opacity={active(0)} />
      {query > 0 && query < 1 ? <circle cx={moving(x[0] + 20, x[1] - 28, query)}
        cy={questionY} r="7" fill={amber} /> : null}
      <text x={(x[0]+x[1])/2} y={questionY - 29} textAnchor="middle"
        fill={fg} fontSize={portrait ? 20 : 22} fontFamily="'Geist Variable',sans-serif">1 · CHECK CACHE</text>
      <text x={x[1]} y={questionY + 66} textAnchor="middle" fill={amber}
        fontSize={portrait ? 21 : 23} fontFamily="'Geist Variable',sans-serif" fontWeight="600"
        opacity={active(1)}>{EXAMPLE_IP}</text>
      <path d={`M${x[1] - 28} ${responseY}H${x[0] + 20}`} stroke={mint} strokeWidth="3" fill="none" opacity={active(1)}
        strokeDasharray={`${(x[1] - x[0] - 48) * answer} 4000`} />
      {answer > 0 && answer < 1 ? <circle cx={moving(x[1] - 28, x[0] + 20, answer)}
        cy={responseY} r="7" fill={mint} /> : null}
      <text x={(x[0]+x[1])/2} y={responseY + 42} textAnchor="middle" fill={mint}
        fontSize={portrait ? 18 : 21} fontFamily="'Geist Variable',sans-serif" opacity={active(1)}>2 · REUSE ADDRESS</text>
    </> : <>
      <path d={`M${x[0] + 27} ${questionY} H${x[1] - 31}`}
        stroke={amber} strokeWidth="3.5" fill="none" markerEnd="url(#journey-dns-arrow)" opacity={active(0)} />
      <text x={(x[0]+x[1])/2} y={questionY - 38} fill={fg} textAnchor="middle"
        fontFamily="'Geist Variable',sans-serif" fontSize={portrait ? 18 : 21}>1 · WHAT IP FOR THIS NAME?</text>
      <text x={(x[0]+x[1])/2} y={questionY + 48} fill={amber}
        fontFamily="'Geist Variable',sans-serif" textAnchor="middle" fontSize={portrait ? 16 : 21}>{domain}</text>
      <path d={`M${x[1] - 32} ${responseY} H${x[0] + 28}`}
        stroke={mint} strokeWidth="3.5" fill="none" opacity={active(1)}
        strokeDasharray={`${(x[1] - x[0] - 60) * answer} 4000`} />
      {answer > 0 && answer < 1 ? <circle cx={moving(x[1] - 32, x[0] + 28, answer)}
        cy={responseY} r="7" fill={mint} /> : null}
      <text x={(x[0]+x[1])/2} y={responseY - 28} fill={mint} textAnchor="middle"
        fontFamily="'Geist Variable',sans-serif" fontSize={portrait ? 19 : 21} opacity={active(1)}>2 · RESPONSE: {EXAMPLE_IP}</text>
      <text x={x[1]} y={responseY + 68} fill="#b8cfce" textAnchor="middle"
        fontFamily="'Geist Variable',sans-serif" fontSize={portrait ? 17 : 19} opacity={active(1)}>Resolver may use cache / other DNS servers.</text>
    </>}
    <path d={`M${x[0] + 20} ${appY}H${x[2] - 36}`} stroke={amber}
      strokeWidth="4" fill="none" markerEnd="url(#journey-dns-arrow)"
      strokeDasharray={`${(x[2] - x[0] - 56) * connect} 4000`} opacity={active(2)} />
    {connect > 0 && connect < 1 ? <circle cx={moving(x[0] + 20, x[2] - 36, connect)}
      cy={appY} r="9" fill={amber} /> : null}
    <text x={(x[0]+x[2])/2} y={appY - 38} fontFamily="'Geist Variable',sans-serif"
      fontSize={portrait ? 22 : 23} fontWeight="600" fill={fg} textAnchor="middle" opacity={active(2)}>
      3 · CONNECT TO THE SERVICE
    </text>
    <text x={(x[0]+x[2])/2} y={appY + 54} fontFamily="'Geist Variable',sans-serif"
      fontSize={portrait ? 21 : 22} fill={mint} textAnchor="middle" opacity={active(3)}>
      This is not the recipient's phone.
    </text>
    <text x={portrait ? 60 : 108} y={h - (portrait ? 105 : 42)} fill="#a7c5c6"
      fontFamily="'Geist Variable',sans-serif" fontSize={portrait ? 20 : 17}>
      Example IP · 192.0.2.42 · DNS can occur before Send if the app already has a connection.
    </text>
  </svg>;
}
