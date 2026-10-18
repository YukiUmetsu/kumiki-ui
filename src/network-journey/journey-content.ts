export const JOURNEY_FPS = { num: 30, den: 1 };
export const JOURNEY_FRAMES = 2700;
export const JOURNEY_CHAPTERS = [
  { id: "send", title: "Press Send", start: 0, end: 240, headline: "A small message. A remarkable journey.", caption: "You tap Send. The app has a message to deliver.", explanation: "We follow a typical client–server messaging service. This is an illustrated fresh-connection path; many apps already have a connection open.", target: "sender" },
  { id: "dns", title: "Find the destination", start: 240, end: 540, headline: "First, find the service.", caption: "DNS helps turn a service name into a network address.", explanation: "Your device may already have the answer cached. Otherwise a resolver finds an address for the messaging service. DNS does not locate the recipient's phone.", target: "resolver" },
  { id: "secure", title: "Protect the connection", start: 540, end: 840, headline: "A protected path to the service.", caption: "TLS protects data in transit between your device and the server.", explanation: "TLS authenticates the server and encrypts transport. The service can normally read the message body unless the app separately implements end-to-end encryption.", target: "gateway" },
  { id: "packets", title: "Make room for packets", start: 840, end: 1260, headline: "One message. Many pieces in motion.", caption: "Application data is carried in transport data and network packets.", explanation: "The glowing pieces are a conceptual view of data, not a literal one-to-one mapping of words to packets. Headers and encrypted transport data travel too.", target: "hero-packet" },
  { id: "network", title: "Across the internet", start: 1260, end: 1710, headline: "Each router chooses the next hop.", caption: "Routers forward packets using network addresses and forwarding tables.", explanation: "The route is illustrative. Real paths depend on network policy and current forwarding information; routers do not need to know the complete message or its recipient account.", target: "router-b" },
  { id: "server", title: "At the messaging server", start: 1710, end: 2100, headline: "The service knows where it belongs.", caption: "The server processes the request and routes the message to its recipient.", explanation: "Authentication, queues, persistence and notifications vary by service. Here the layers show receiving, processing and delivery responsibilities, not a literal machine layout.", target: "server" },
  { id: "delivery", title: "Reach the recipient", start: 2100, end: 2460, headline: "Another connection. The same message.", caption: "The service delivers the message through the recipient's connection.", explanation: "The recipient may be connected already. Offline delivery, retries, acknowledgements and what “delivered” means depend on the application.", target: "recipient" },
  { id: "overview", title: "The big picture", start: 2460, end: 2700, headline: "A whole network, behind one tap.", caption: "Device → network → messaging service → network → recipient.", explanation: "Names help find services, protected connections carry data, routers move packets, and the application coordinates delivery. Distances and timing here are designed for explanation.", target: "network" },
] as const;
export type JourneyLesson = "complete" | "dns" | "secure" | "packets" | "routers" | "delivery" | "camera" | "motion" | "director";
export type JourneyAspect = "landscape" | "portrait";
export interface JourneySettings { latencyMs: number; domain: string; cachedDns: boolean; protection: "tls" | "end-to-end"; selectedRouter: string }
export const DEFAULT_JOURNEY: JourneySettings = { latencyMs: 120, domain: "messages.example.test", cachedDns: false, protection: "tls", selectedRouter: "router-b" };
export const JOURNEY_THEME = { background: "#14252f", raised: "#1d3640", pale: "#edf2eb", muted: "#b4cacc", teal: "#72c7bd", route: "#376b72", message: "#edbb7e", metal: "#b8ccce" };
export const JOURNEY_POINTS = {
  sender: [-14, 2.8, 5], resolver: [-9, 2.1, -4], gateway: [-8, 1.8, 3],
  "router-a": [-3, 2, 0], "router-b": [3, 3, -5], "router-c": [9, 2, -1],
  server: [15, 2.8, -5], "router-d": [17, 2.7, 3], "router-e": [21, 2.2, 4], recipient: [27, 2.8, 5],
} as const;
export const JOURNEY_ROUTE = ["sender", "gateway", "router-a", "router-b", "router-c", "server", "router-d", "router-e", "recipient"] as const;
export const journeyChapterAt = (frame: number) => JOURNEY_CHAPTERS.find(chapter => frame >= chapter.start && frame < chapter.end) ?? JOURNEY_CHAPTERS[7];
export const journeyDeliveryFrame = (latencyMs: number) => 2430 + Math.round((latencyMs - 120) * .15);
