import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FurnitureSheet, FurnitureShowcase, RoomLibrary } from "../../registry/anatomy/furn-react";

const page: CSSProperties = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "#f3efe8", color: "#26211d", font: "15px/1.45 system-ui, sans-serif" };
const h2: CSSProperties = { margin: 0, font: "700 20px system-ui" };
const muted: CSSProperties = { margin: 0, color: "#5b524b", font: "13px/1.5 system-ui", maxWidth: 900 };

const meta = { title: "Video production/Art Foundations/Interiors and Furniture", id: "video-furniture", component: FurnitureSheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof FurnitureSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The body's measurements, clearances, bed sizes, every piece with its construction and checks, and the period rooms. */
export const Sheet: Story = { render: () => <div style={page}><h2 style={h2}>Interiors and furniture (INTERIOR1)</h2><p style={muted}>Furniture is built round the body: seats about 45 cm, tables about 75 cm, 25–30 cm between them, counters about 90 cm. Each piece below has its period, its construction and the details that make it read.</p><FurnitureSheet /></div> };
/** Every piece alone on a parchment studio cove, built at its measured size. */
export const Furniture: Story = { name: "Furniture (53 pieces)", render: () => <div style={page}><h2 style={h2}>Furniture across periods and cultures</h2><p style={muted}>From an oak settle and a Windsor chair to Ming horseshoe chairs, a Japanese staircase chest, Thonet's bentwood and Bauhaus steel; church furnishings (pew, pulpit, reredos, font, eagle lectern, corona); Japanese pieces (andon, hibachi, kotatsu, gold byōbu); and contemporary pieces. Each is a function (<code>buildFurniture(b, id)</code>) that any scene can place.</p><FurnitureShowcase /></div> };
/** Sixteen rooms, furnished from the piece library and lit by their windows, fires and lamps. */
export const Rooms: Story = { name: "Painted rooms (16)", render: () => <div style={page}><h2 style={h2}>Painted rooms</h2><p style={muted}>Period rooms with their joinery; a Gothic nave with rib vaults and stained glass; Japanese shoin, tea and irori rooms; Japandi, library and cottage-kitchen rooms. Light comes through windows (stained glass in coloured pools, paper soft), and from fires, candles and lamps by colour temperature.</p><RoomLibrary /></div> };
