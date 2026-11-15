import type { Meta, StoryObj } from "@storybook/react-vite";
import { AnimalYokai, Animals, Bestiary, CastLab, CastleTown, CrowdLab, Effects, EpisodePlayer, FaceLab, WardrobeLab, FolkWork, FolkYokai, FolktaleFilmPlayer, Giants, HeianCourt, Interiors, Kami, MaikoDance, MotifGallery, NightFerryPlayer, OiranProcession, OniFight, Parades, PrintersProof, Realms, SamuraiDuel, SamuraiKata, SceneEditor, SnowWomanFilmPlayer, Temples, Trees, Tsukumogami, Warriors, WomenGhosts } from "./ukiyoe-studio";

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
export const Worlds: Story = { name: "UKIYO1 · Realms", render: () => <Realms /> };
export const Episode: Story = { name: "UKIYO1 · Episodes", render: () => <EpisodePlayer /> };
export const Processions: Story = { name: "UKIYO1 · Parades", render: () => <Parades /> };
export const Objects: Story = { name: "UKIYO1 · Tsukumogami", render: () => <Tsukumogami /> };
export const Monsters: Story = { name: "UKIYO1 · Giants", render: () => <Giants /> };
export const Household: Story = { name: "UKIYO1 · Folk yōkai", render: () => <FolkYokai /> };
export const Court: Story = { name: "UKIYO1 · Heian court", render: () => <HeianCourt /> };
export const Forest: Story = { name: "UKIYO1 · Trees", render: () => <Trees /> };
export const BeastSpirits: Story = { name: "UKIYO1 · Animal yōkai", render: () => <AnimalYokai /> };
export const Sacred: Story = { name: "UKIYO1 · Temples", render: () => <Temples /> };
export const Fauna: Story = { name: "UKIYO1 · Animals", render: () => <Animals /> };
export const Bushi: Story = { name: "UKIYO1 · Warriors", render: () => <Warriors /> };
export const Gods: Story = { name: "UKIYO1 · Kami", render: () => <Kami /> };
export const Magic: Story = { name: "UKIYO1 · Effects", render: () => <Effects /> };
export const Work: Story = { name: "UKIYO1 · Folk work", render: () => <FolkWork /> };
export const Ghosts: Story = { name: "UKIYO1 · Women ghosts", render: () => <WomenGhosts /> };
export const Rooms: Story = { name: "UKIYO1 · Interiors", render: () => <Interiors /> };
export const Town: Story = { name: "UKIYO1 · Castle town", render: () => <CastleTown /> };
export const Oni: Story = { name: "UKIYO1 · Oni fight", render: () => <OniFight /> };
export const Duel: Story = { name: "UKIYO1 · Samurai duel", render: () => <SamuraiDuel /> };
export const Samurai: Story = { name: "UKIYO1 · Samurai kata", render: () => <SamuraiKata /> };
export const Maiko: Story = { name: "UKIYO1 · Maiko dance", render: () => <MaikoDance /> };
export const Oiran: Story = { name: "UKIYO1 · Oiran procession", render: () => <OiranProcession /> };
export const Wardrobe: Story = { name: "UKIYO1 · Wardrobe", render: () => <WardrobeLab /> };
export const Faces: Story = { name: "UKIYO1 · Faces", render: () => <FaceLab /> };
export const CastAndActions: Story = { name: "UKIYO1 · Cast & actions", render: () => <CastLab /> };
export const Motifs: Story = { name: "UKIYO1 · Motif library", render: () => <MotifGallery /> };
export const SceneJson: Story = { name: "UKIYO1 · Scene JSON editor", render: () => <SceneEditor /> };
