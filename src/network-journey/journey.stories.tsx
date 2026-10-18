/** One coherent educational production, exposed as chapter and investigation entry points. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NetworkJourneyDemo } from "./journey-demo";

const meta = {
  title: "Explainers/A Message's Journey",
  component: NetworkJourneyDemo,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A 90-second illustrated client–server messaging journey. One deterministic MG1 frame clock drives the 3D camera, motion and VT1 overlays. "
          + "This is an educational example, not a live network trace, packet simulation, or promise about every messaging application.",
      },
    },
  },
  decorators: [(Story) => <div className="min-h-screen bg-canvas"><Story /></div>],
} satisfies Meta<typeof NetworkJourneyDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteExperience: Story = {
  name: "01 · Complete experience",
  args: { initialChapter: "send" },
};
export const PortraitProduction: Story = {
  name: "02 · Portrait production (9:16)",
  args: { initialAspect: "portrait", initialChapter: "send" },
};
export const PressSend: Story = { name: "Lesson · Press Send", args: { initialChapter: "send", initialFrame: 102 } };
export const PhoneScreenDetail: Story = { name: "Visual QA · Phone and message screen", args: { initialFrame: 95 } };
export const StudioDetail: Story = { name: "Visual QA · 3D studio after Send", args: { initialFrame: 207 } };
export const HandoffDetail: Story = { name: "Visual QA · Crossfade at network handoff", args: { initialFrame: 215 } };
export const DnsLayoutDetail: Story = { name: "Visual QA · DNS annotated layout", args: { initialFrame: 400 } };

export const FindTheService: Story = { name: "Lesson · Find the service (DNS)", args: { initialChapter: "dns", initialFrame: 400 } };
export const ProtectTheConnection: Story = { name: "Lesson · TLS connection", args: { initialChapter: "secure" } };
export const MessageToPackets: Story = { name: "Lesson · Message to packets", args: { initialChapter: "packets", initialFrame: 850 } };
export const SevenOsiLayers: Story = { name: "Lesson · The seven OSI layers", args: { initialChapter: "packets", initialFrame: 1045 } };
export const AcrossRouters: Story = { name: "Lesson · Through routers", args: { initialChapter: "network" } };
export const MessagingService: Story = { name: "Lesson · Messaging service", args: { initialChapter: "server" } };
export const ReachRecipient: Story = { name: "Lesson · Recipient delivery", args: { initialChapter: "delivery" } };
export const WholeJourney: Story = { name: "Lesson · Complete network overview", args: { initialChapter: "overview" } };

export const CachedDns: Story = {
  name: "Investigate · Cached DNS",
  args: { initialChapter: "dns", initialFrame: 400, initialSettings: { cachedDns: true } },
  parameters: { docs: { description: { story: "A prior lookup or active connection may eliminate DNS work when Send is pressed." } } },
};
export const TlsVersusE2ee: Story = {
  name: "Investigate · TLS versus E2EE",
  args: { initialChapter: "secure", initialSettings: { protection: "end-to-end" } },
  parameters: { docs: { description: { story: "TLS protects client–service transport. Optional E2EE separately protects message contents from the service." } } },
};
export const IllustrativeLatency: Story = {
  name: "Investigate · Illustrative latency",
  args: { initialChapter: "delivery", initialSettings: { latencyMs: 360 } },
  parameters: { docs: { description: { story: "Changes the authored timeline, not measured or simulated network latency." } } },
};
export const RouterInspector: Story = {
  name: "Investigate · Router forwarding",
  args: { initialChapter: "network", initialSettings: { selectedRouter: "router-c" }, initialDirectorView: true },
};
export const DeliveryVersusRead: Story = {
  name: "Investigate · Delivered is not read",
  args: { initialChapter: "delivery" },
};
export const DirectorView: Story = {
  name: "Director · Camera and choreography",
  args: { initialChapter: "network", initialDirectorView: true },
};
export const DirectorPortrait: Story = {
  name: "Director · Portrait constraints",
  args: { initialChapter: "overview", initialAspect: "portrait", initialDirectorView: true },
};
export const ReducedMotion: Story = {
  name: "Accessibility · Reduced motion",
  args: { initialChapter: "packets", initialFrame: 1060, reducedMotion: true },
};
