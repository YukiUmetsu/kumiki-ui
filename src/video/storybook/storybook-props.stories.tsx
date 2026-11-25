import type { Meta, StoryObj } from "@storybook/react-vite";
import { handoverBench, payBench, putDownBench, scanBench } from "./story-benches";
import { RigOverlay, StoryBench, StoryPage } from "./story-page";

const meta: Meta = { title: "Video production/Japanese Retro Watercolor/Props", id: "video-storybook-props", parameters: { layout: "fullscreen" } };
export default meta;
const handover = handoverBench(), down = putDownBench(), scan = scanBench(), pay = payBench();
export const Handover: StoryObj = { name: "A bag from hand to hand", render: () => <StoryPage title="A bag from hand to hand" about="The bag hangs from its handles and swings behind the hand that moves it."><StoryBench film={handover} /></StoryPage> };
export const HandoverRig: StoryObj = { name: "A bag from hand to hand, with the rig", render: () => <StoryPage title="A bag from hand to hand"><StoryBench film={handover}>{f => <RigOverlay frame={f} film={handover} />}</StoryBench></StoryPage> };
export const PutDown: StoryObj = { name: "A rice ball on a counter", render: () => <StoryPage title="A rice ball on a counter"><StoryBench film={down} /></StoryPage> };
/** Both arms come over the counter from behind it. What of the own body lies in front of an arm stays in front of it. */
export const Scan: StoryObj = { name: "Scanning at the counter", render: () => <StoryPage title="Scanning at the counter"><StoryBench film={scan} /></StoryPage> };
export const ScanRig: StoryObj = { name: "Scanning at the counter, with the rig", render: () => <StoryPage title="Scanning at the counter"><StoryBench film={scan}>{f => <RigOverlay frame={f} film={scan} names={false} />}</StoryBench></StoryPage> };
export const Pay: StoryObj = { name: "Coins into the change machine", render: () => <StoryPage title="Coins into the change machine" about="A coin goes behind the lip of the slot. Sizes: 22.6 mm for 100 yen, 21 mm for 50 yen."><StoryBench film={pay} /></StoryPage> };
