import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LOCATION_STATES, LocationPin2D } from "../../registry/domains/location-pin-2d";
import type { LocationState } from "../../registry/domains/location-pin-2d";

// Illustrative coordinates in open ocean; the street grid is abstract and places nothing real.
const COORDS = { lat: 12.3456, lon: 65.4321 };
const CAPTIONS: Record<LocationState, string> = {
  tagged: "Photo metadata carries an exact point.",
  approximate: "A shared area, with the exact point removed.",
  stripped: "The location tag was removed before sharing.",
};

const page = (dark: boolean): CSSProperties => ({ padding: 20, borderRadius: 16, background: dark ? "#182332" : "#f4f6f9", color: dark ? "#edf3fc" : "#243347", font: "15px/1.5 Geist, Inter, system-ui, sans-serif", display: "grid", gap: 20 });
const row: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 };
const note: CSSProperties = { margin: 0, fontSize: 13, opacity: 0.75 };

function StatesDemo({ dark = false }: { dark?: boolean }) {
  return <div style={page(dark)}>
    <div style={row}>
      {LOCATION_STATES.map(state => <figure key={state} style={{ margin: 0, display: "grid", gap: 4 }}>
        <LocationPin2D state={state} lat={state === "stripped" ? undefined : COORDS.lat} lon={state === "stripped" ? undefined : COORDS.lon}
          theme={dark ? "midnight" : "paper"} width={240} height={200} />
        <figcaption style={note}>{CAPTIONS[state]}</figcaption>
      </figure>)}
    </div>
  </div>;
}

const meta = { title: "Privacy and files/Location Pin", id: "domains-location-pin", component: LocationPin2D, parameters: { layout: "padded" }, tags: ["autodocs"],
  args: { state: "tagged", lat: COORDS.lat, lon: COORDS.lon } } satisfies Meta<typeof LocationPin2D>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = { render: () => <StatesDemo /> };
export const DarkTheme: Story = { name: "Dark theme", render: () => <StatesDemo dark /> };
