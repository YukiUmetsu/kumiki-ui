import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentCatalog } from "./component-catalog";

const meta={
  title:"Discover/Unified Component Catalog",
  component:ComponentCatalog,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof ComponentCatalog>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Browse:Story={};
