import type { ColorValue, Rect } from "../../registry/motion/types";
import type { VisualElement, VisualScene } from "../../registry/motion/visual-transformation-types";
import type { DirectorTransformation } from "../../registry/motion/director-types";
import type { CameraTargetRegistry, CompiledCinematicCamera } from "../../registry/motion/cinematic-camera-types";
import { evaluateCameraPose3D } from "../../registry/motion/camera-pose-3d";
import { projectCameraBounds } from "../../registry/motion/camera-spatial";
import { JOURNEY_THEME } from "./journey-content";
import type { JourneyAspect, JourneySettings } from "./journey-content";

const ink = (hex: string): ColorValue => ({ space: "srgb", r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), alpha: 1 });
const rect = (id: string, layout: Rect, color = JOURNEY_THEME.teal): VisualElement => ({ id, semanticId: id, layout, fill: ink(color), content: { kind: "shape", bounds: { x: 0, y: 0, width: 100, height: 100 }, shape: { contours: [{ closed: true, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] }] } } });
/** Authored shape construction, not a raw debug rectangle. VT1 still owns the morph. */
const shapeBadge = (id: string, layout: Rect, color: string, kind: "capsule" | "dot"): VisualElement => {
  const radius = kind === "dot" ? 43 : 19;
  const centers = kind === "dot"
    ? [[50, 50, 0, Math.PI * 2]] as const
    : [[100 - radius, radius, -Math.PI / 2, 0], [100 - radius, 100 - radius, 0, Math.PI / 2],
      [radius, 100 - radius, Math.PI / 2, Math.PI], [radius, radius, Math.PI, 3 * Math.PI / 2]] as const;
  const points = centers.flatMap(([cx, cy, begin, end]) =>
    Array.from({ length: kind === "dot" ? 33 : 6 }, (_, i) => {
      const phase = i / (kind === "dot" ? 32 : 5);
      const angle = begin + (end - begin) * phase;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    }));
  return { id, semanticId: id, layout, fill: ink(color),
    content: { kind: "shape", bounds: { x: 0, y: 0, width: 100, height: 100 },
      shape: { contours: [{ closed: true, points }] } } };
};
const label = (id: string, text: string, x: number, y: number, width: number, size = 24): VisualElement => ({ id, semanticId: id, fill: ink(JOURNEY_THEME.pale), content: { kind: "text", text, bounds: { x, y, width, height: size * 2.6 }, fontFamily: "'Geist Variable', sans-serif", fontSize: size, lineHeight: 1.4 } });
const edge = (id: string, a: Rect, b: Rect): VisualElement => ({ id, semanticId: id, fill: { ...ink(JOURNEY_THEME.route), alpha: 0 }, stroke: ink(JOURNEY_THEME.teal), strokeWidth: 3, content: { kind: "svg-path", bounds: { x: 0, y: 0, width: 1600, height: 1600 }, d: `M${a.x + a.width / 2},${a.y + a.height / 2} L${b.x + b.width / 2},${b.y + b.height / 2}` } });

/** Three honest VT1 handoffs; 3D itself stays in the existing viewport. */
export function createJourneyGraphics(aspect: JourneyAspect, camera: CompiledCinematicCamera, targets: CameraTargetRegistry, settings: JourneySettings) {
  const portrait = aspect === "portrait", width = portrait ? 900 : 1600, height = portrait ? 1600 : 900;
  const projected = (id: string, frame: number): Rect => {
    const pose = evaluateCameraPose3D(camera.timeline, frame), measured = projectCameraBounds(pose, targets.sample(id, frame).bounds, width / height).rect;
    return { x: measured.x * width, y: measured.y * height, width: Math.max(8, measured.width * width), height: Math.max(8, measured.height * height) };
  };
  const mapBox = (index: number): Rect => portrait ? { x: 210, y: 400 + index * 215, width: 480, height: 100 } : { x: 190 + index * 490, y: 410, width: 260, height: 100 };
  const dnsLabels = ["Your device", settings.cachedDns ? "Cached address" : "DNS resolver", "Messaging service"];
  const dnsIds = ["sender", settings.cachedDns ? "cache" : "resolver", "server"];
  const dns: VisualScene = { id: "journey-dns-map", elements: [
    ...dnsIds.map((id, i) => rect(id, mapBox(i), i === 1 ? JOURNEY_THEME.message : JOURNEY_THEME.teal)),
    ...dnsLabels.map((copy, i) => label(`dns-label-${i}`, copy, mapBox(i).x, mapBox(i).y + 126, mapBox(i).width, portrait ? 29 : 25)),
    edge("dns-request", mapBox(0), mapBox(1)), edge("dns-address", mapBox(1), mapBox(2)),
    label("dns-name", settings.domain.length > 38 ? `${settings.domain.slice(0, 35)}…` : settings.domain, portrait ? 150 : 190, portrait ? 315 : 325, portrait ? 620 : 1100, portrait ? 30 : 32),
    label("dns-answer", settings.cachedDns ? "Previously resolved\nNo new lookup" : "192.0.2.42\nIllustrative address", mapBox(2).x, mapBox(2).y - (portrait ? 70 : 90), mapBox(2).width, 23),
  ] };
  const phone: VisualScene = { id: "journey-phone-map", elements: dnsIds.map(id => rect(id, projected(id === "cache" ? "sender" : id, 225), id === "sender" ? JOURNEY_THEME.metal : JOURNEY_THEME.teal)) };
  const messageFrame = 840, messageBounds = projected("hero-packet", messageFrame);
  const card = { x: Math.max(width * .15, Math.min(width * .6, messageBounds.x - 130)), y: height * .45, width: portrait ? 430 : 420, height: 132 };
  const message: VisualScene = { id: "journey-message-card", elements: [shapeBadge("message", card, "#247f77", "capsule"), label("message-copy", "Meet at six?", card.x + 32, card.y + 42, card.width - 64, 35)] };
  const packetIds = Array.from({ length: 12 }, (_, i) => `piece-${i}`);
  const packets: VisualScene = { id: "journey-packet-field", elements: packetIds.map((id, i) => {
    const destination = projected(i === 0 ? "hero-packet" : "gateway", 930);
    return shapeBadge(id, { x: Math.max(width * .13, Math.min(width * .82, destination.x)) + (i % 4 - 1.5) * 38, y: height * .49 + (Math.floor(i / 4) - 1) * 38, width: 22, height: 22 }, i % 3 === 0 ? JOURNEY_THEME.message : JOURNEY_THEME.teal, "dot");
  }) };
  const summaryIds = ["sender", "router-a", "server", "router-e", "recipient"];
  const summaryBoxes = summaryIds.map((_, i): Rect => portrait ? { x: 210, y: 330 + i * 195, width: 480, height: 90 } : { x: 115 + i * 295, y: 405, width: 190, height: 110 });
  const summaryNames = ["Your device", "Network", "Messaging\nservice", "Network", settings.recipientOnline ? "Recipient" : "Recipient\nOffline"];
  const network: VisualScene = { id: "journey-projected-world", elements: summaryIds.map(id => rect(id, projected(id, 2540), id === "server" ? JOURNEY_THEME.message : JOURNEY_THEME.teal)) };
  const overview: VisualScene = { id: "journey-overview-map", elements: [
    ...summaryIds.map((id, i) => rect(id, summaryBoxes[i], id === "server" ? JOURNEY_THEME.message : JOURNEY_THEME.teal)),
    ...summaryNames.map((copy, i) => label(`overview-label-${i}`, copy, summaryBoxes[i].x, summaryBoxes[i].y + (portrait ? 108 : 140), summaryBoxes[i].width + 20, portrait ? 27 : 25)),
    ...summaryIds.slice(1).map((id, i) => edge(`overview-link-${id}`, summaryBoxes[i], summaryBoxes[i + 1])),
  ] };
  const transformations: DirectorTransformation[] = [
    { kind: "transformation", id: "phone-to-network", at: 210, durationFrames: 40, fromScene: phone.id, toScene: dns.id, strategy: "shared-element" },
    { kind: "transformation", id: "message-to-packets", at: 840, durationFrames: 40, fromScene: message.id, toScene: packets.id, mappings: [{ id: "split-message", kind: "one-to-many", from: "message", to: packetIds as [string, ...string[]], semanticId: "message", strategy: "particle-handoff", particles: { count: 48, seed: 19, radius: 4, arc: 100 } }] },
    { kind: "transformation", id: "network-to-infographic", at: 2540, durationFrames: 40, fromScene: network.id, toScene: overview.id, strategy: "shared-element" },
  ];
  return { scenes: [phone, dns, message, packets, network, overview], transformations, width, height };
}
