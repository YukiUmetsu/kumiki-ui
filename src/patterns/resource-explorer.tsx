// Showcase alias for the distributable pattern. The canonical implementation
// lives in registry/patterns so the published artifact is the single source of
// truth, mirroring the `src/ui/*` aliases for the core components.
export { ResourceExplorer } from "../../registry/patterns/resource-explorer";
export type {
  ResourceExplorerLabels,
  ResourceExplorerProps,
  ResourceItem,
  ResourceMoveDirection,
} from "../../registry/patterns/resource-explorer";
export { default } from "../../registry/patterns/resource-explorer";
