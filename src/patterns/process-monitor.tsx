// Showcase alias for the distributable pattern. The canonical implementation
// lives in registry/patterns so the published artifact is the single source of
// truth.
export { ProcessMonitor } from "../../registry/patterns/process-monitor";
export type {
  ProcessMonitorProps,
  ProcessMonitorStage,
  ProcessMonitorStageStatus,
  ProcessMonitorStatus,
  ProcessMonitorLabels,
} from "../../registry/patterns/process-monitor";
export { default } from "../../registry/patterns/process-monitor";
