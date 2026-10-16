import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccountSettingsPage } from "./account-settings";
import { ToastProvider } from "../ui/toast";

const meta = {
  title: "Pages/Account settings",
  component: AccountSettingsPage,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <ToastProvider position="top-end" timeout={5000}>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof AccountSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
