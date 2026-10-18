/** Art-directed world annotations. No opaque card or generic three-box diagram.
 * Educational copy is adjacent to the real 3D objects; screen positions are
 * projected from the authored CC1 pose on the canonical MG1 frame.
 */
import { evaluateCameraPose3D } from "../../registry/motion/camera-pose-3d";
import { projectCameraBounds } from "../../registry/motion/camera-spatial";
import type { CompiledCinematicCamera } from "../../registry/motion/cinematic-camera-types";
import { JOURNEY_CHAPTERS, JOURNEY_POINTS, JOURNEY_ROUTE, JOURNEY_THEME } from "./journey-content";
import type { JourneyAspect, JourneySettings } from "./journey-content";

type ChapterId = (typeof JOURNEY_CHAPTERS)[number]["id"];

export interface JourneyConceptOverlayProps {
  chapter: ChapterId;
  frame: number;
  aspect: JourneyAspect;
  settings: JourneySettings;
  camera: CompiledCinematicCamera;
}

interface Fact { eyebrow: string; headline: string; detail: string; objectId: keyof typeof JOURNEY_POINTS }

function conceptAt(chapter: ChapterId, frame: number, settings: JourneySettings): Fact | null {
  const chapterInfo = JOURNEY_CHAPTERS.find(item => item.id === chapter);
  if (!chapterInfo) return null;
  const phase = Math.min(2, Math.floor(3 * (frame - chapterInfo.start) / (chapterInfo.end - chapterInfo.start)));
  if (chapter === "network") {
    const current = settings.selectedRouter as keyof typeof JOURNEY_POINTS;
    const index = JOURNEY_ROUTE.findIndex(id => id === current);
    const nextHop = index >= 0 && index + 1 < JOURNEY_ROUTE.length ? JOURNEY_ROUTE[index + 1] : "messaging service";
    const choices = [
      { eyebrow: "01 / ARRIVAL", headline: "Read the destination", detail: "An IP header carries a destination address, shown here as 192.0.2.42." },
      { eyebrow: "02 / FORWARDING LOOKUP", headline: "Choose an outgoing link", detail: `Example entry: 192.0.2.0/24 → ${nextHop.replace(/-/g, " ")}. Longest matching prefix wins.` },
      { eyebrow: "03 / NEXT HOP", headline: "Forward toward the service", detail: `The router forwards onto the outgoing link toward ${nextHop.replace(/-/g, " ")}.` },
    ];
    return { ...choices[phase], objectId: current };
  }
  if (chapter === "secure") return {
    eyebrow: "TRANSPORT BOUNDARY", headline: settings.protection === "end-to-end" ? "TLS + protected content" : "Encrypted in transit",
    detail: settings.protection === "end-to-end"
      ? "E2EE can protect content even from the service. TLS still covers each connection."
      : "TLS protects the device–service connection, not necessarily the message inside the service.",
    objectId: "gateway",
  };
  if (chapter === "server") return {
    eyebrow: "APPLICATION SERVICE", headline: phase === 0 ? "Receive" : phase === 1 ? "Process" : "Queue or deliver",
    detail: "These components illustrate software responsibilities, not a physical server layout.",
    objectId: "server",
  };
  if (chapter === "delivery") return {
    eyebrow: "APPLICATION DELIVERY", headline: settings.recipientOnline ? "Recipient connected" : "Recipient offline",
    detail: settings.recipientOnline ? "A delivery indicator is not a read receipt." : "The service can retain the message until the recipient reconnects.",
    objectId: "recipient",
  };
  return null;
}

export function JourneyConceptOverlay({ chapter, frame, aspect, settings, camera }: JourneyConceptOverlayProps) {
  const fact = conceptAt(chapter, frame, settings);
  if (!fact) return null;
  const portrait = aspect === "portrait", width = portrait ? 900 : 1600, height = portrait ? 1600 : 900;
  const coords = JOURNEY_POINTS[fact.objectId];
  const pose = evaluateCameraPose3D(camera.timeline, frame);
  const bounds = { min: [coords[0] - .3, coords[1] - .3, coords[2] - .3] as [number, number, number],
    max: [coords[0] + .3, coords[1] + .3, coords[2] + .3] as [number, number, number] };
  const projected = projectCameraBounds(pose, bounds, width / height).rect;
  const anchorX = (projected.x + projected.width / 2) * width;
  const anchorY = (projected.y + projected.height / 2) * height;
  const routeIndex = chapter === "network" ? JOURNEY_ROUTE.findIndex(id => id === fact.objectId) : -1;
  const nextId = routeIndex >= 0 ? JOURNEY_ROUTE[routeIndex + 1] : undefined;
  const nextWorld = nextId ? JOURNEY_POINTS[nextId] : null;
  const nextProjected = nextWorld ? projectCameraBounds(pose, {
    min: [nextWorld[0] - .2, nextWorld[1] - .2, nextWorld[2] - .2],
    max: [nextWorld[0] + .2, nextWorld[1] + .2, nextWorld[2] + .2],
  }, width / height).rect : null;
  const nextX = nextProjected ? (nextProjected.x + nextProjected.width / 2) * width : 0;
  const nextY = nextProjected ? (nextProjected.y + nextProjected.height / 2) * height : 0;
  const nextVisible = Boolean(nextProjected) && Number.isFinite(nextX) && Number.isFinite(nextY) &&
    nextX > width * .06 && nextX < width * .94 && nextY > height * .10 && nextY < height * .89;
  // Draw a leader only when the real target is plausibly on-screen.
  const onScreen = Number.isFinite(anchorX) && Number.isFinite(anchorY) &&
    anchorX > width * .07 && anchorX < width * .93 && anchorY > height * .13 && anchorY < height * .86;
  // Screen-edge editorial annotation, not a panel over the 3D subject.
  const x = portrait ? 66 : 1080, y = portrait ? 360 : 238;
  const labelX = portrait ? 68 : 1084;
  const labelWidth = portrait ? 700 : 438;
  const leadX = portrait ? x + 75 : x;
  const leadY = y + 92;
  const fg = JOURNEY_THEME.pale, accent = JOURNEY_THEME.message;
  return <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`}
    width="100%" height="100%" data-network-annotation={chapter}
    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <path d={`M${labelX},${y - 23} h64`} stroke={accent} strokeWidth="3" />
    <text x={labelX} y={y + 12} fontSize={portrait ? 22 : 18} letterSpacing="2.3"
      fill={accent} fontFamily="'Geist Variable', sans-serif" fontWeight="650">{fact.eyebrow}</text>
    <text x={labelX} y={y + 58} fontSize={portrait ? 35 : 31}
      fill={fg} fontFamily="'Geist Variable', sans-serif" fontWeight="560">{fact.headline}</text>
    <foreignObject x={labelX} y={y + 69} width={labelWidth} height={portrait ? 130 : 112}>
      <div xmlns="http://www.w3.org/1999/xhtml" style={{
        font: `${portrait ? 24 : 21}px/1.35 -apple-system, BlinkMacSystemFont, sans-serif`,
        color: "#d3e2e1", maxWidth: "100%",
        textShadow: "0 2px 16px #122a30",
      }}>{fact.detail}</div>
    </foreignObject>
    {onScreen ? <>
      <path d={`M${leadX},${leadY} L${anchorX},${anchorY}`} stroke={accent}
        strokeWidth="1.6" strokeDasharray="6 7" opacity=".75" fill="none" />
      <circle cx={anchorX} cy={anchorY} r="14" stroke={accent} strokeWidth="1.8" fill="none" opacity=".95" />
      <circle cx={anchorX} cy={anchorY} r="3.6" fill={accent} />
    </> : null}
    {chapter === "network" && onScreen && nextVisible && frame >= 1530 ? <>
      <path d={`M${anchorX} ${anchorY} L${nextX} ${nextY}`}
        stroke={accent} strokeWidth="4" opacity=".80" strokeDasharray="10 9" fill="none" />
      <circle cx={nextX} cy={nextY} r="11" stroke={accent} strokeWidth="2" fill="none" />
    </> : null}
    {chapter === "network" ? <text x={labelX} y={y + (portrait ? 213 : 191)}
      fill={JOURNEY_THEME.muted} fontSize={portrait ? 19 : 16} letterSpacing="1.1"
      fontFamily="'Geist Variable', sans-serif">EXAMPLE ROUTE · NOT A LIVE TRACE</text> : null}
  </svg>;
}
