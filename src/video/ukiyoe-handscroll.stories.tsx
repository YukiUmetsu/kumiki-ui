import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bestiary, CastLab, CrowdLab, FolktaleFilmPlayer, MaikoDance, MotifGallery, NightFerryPlayer, OiranProcession, PrintersProof, SamuraiDuel, SamuraiKata, SceneEditor, SnowWomanFilmPlayer } from "./ukiyoe-studio";

const meta = {
  title: "Video Production/Film Looks/Ukiyo-e Handscroll",
  id: "video-ukiyoe-handscroll",
  component: NightFerryPlayer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof NightFerryPlayer>;
export default meta;

type Story = StoryObj<typeof NightFerryPlayer>;
export const NightFerry: Story = { name: "UKIYO1 · The Night Ferry (film)", render: () => <NightFerryPlayer /> };
export const PeachAndOni: Story = { name: "UKIYO1 · The Peach and the Oni (folktale film)", render: () => <FolktaleFilmPlayer /> };
export const SnowWoman: Story = { name: "UKIYO1 · The Snow Woman (yōkai film)", render: () => <SnowWomanFilmPlayer /> };
export const FolktaleBestiary: Story = { name: "UKIYO1 · Folktale bestiary", render: () => <Bestiary /> };
export const PrintersProofLab: Story = { name: "UKIYO1 · Printer's proof", render: () => <PrintersProof /> };
export const Crowds: Story = { name: "UKIYO1 · Crowds", render: () => <CrowdLab /> };
export const Duel: Story = { name: "UKIYO1 · Samurai duel", render: () => <SamuraiDuel /> };
export const Samurai: Story = { name: "UKIYO1 · Samurai kata", render: () => <SamuraiKata /> };
export const Maiko: Story = { name: "UKIYO1 · Maiko dance", render: () => <MaikoDance /> };
export const Oiran: Story = { name: "UKIYO1 · Oiran procession", render: () => <OiranProcession /> };
export const CastAndActions: Story = { name: "UKIYO1 · Cast & actions", render: () => <CastLab /> };
export const Motifs: Story = { name: "UKIYO1 · Motif library", render: () => <MotifGallery /> };
export const SceneJson: Story = { name: "UKIYO1 · Scene JSON editor", render: () => <SceneEditor /> };
