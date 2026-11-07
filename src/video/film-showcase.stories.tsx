import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilmCard, FilmGallery } from "../../registry/video/film-gallery";
import type { GalleryFilm } from "../../registry/video/film-gallery";
import { CATALOG_FILMS } from "../catalog/catalog-films";

const media = import.meta.glob("./assets/film-showcase/*.{mp4,jpg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const films: GalleryFilm[] = CATALOG_FILMS.map(film => ({ id: film.id, title: film.title, summary: film.summary, keywords: film.keywords, meta: film.meta, portrait: film.portrait,
  src: media[`./assets/film-showcase/${film.id}.mp4`], poster: media[`./assets/film-showcase/${film.id}.jpg`] }));
const page = { padding: 24, font: "16px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #f6f4ed)", background: "var(--km-surface-canvas, #102133)", minHeight: "100vh", boxSizing: "border-box" } as const;
function Wall() { return <div style={page}><FilmGallery films={films} /></div>; }
const One = ({ id }: { id: string }) => <div style={{ ...page, display: "grid", justifyItems: "center" }}><FilmCard film={films.find(film => film.id === id)!} style={{ width: "min(100%, 960px)" }} /></div>;

const meta = { title: "Showcases/Films", id: "showcases-films", component: Wall, tags: ["showcase", "video"], parameters: { layout: "fullscreen" } } satisfies Meta<typeof Wall>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Gallery: Story = {};
export const TheDrop: Story = { render: () => <One id="the-drop" /> };
export const TheDropVertical: Story = { render: () => <One id="the-drop-vertical" /> };
export const PlasterValley: Story = { render: () => <One id="plaster-valley" /> };
export const WhereWaterBegins: Story = { render: () => <One id="where-water-begins" /> };
export const BillingGap: Story = { render: () => <One id="billing-gap" /> };
