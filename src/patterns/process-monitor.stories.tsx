import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProcessMonitor } from "./process-monitor";
import type {
  ProcessMonitorProps,
  ProcessMonitorStage,
  ProcessMonitorStageStatus,
} from "./process-monitor";

const stages: ProcessMonitorStage[] = [
  { id: "prepare", label: "Prepare", description: "Collect the source files." },
  { id: "upload", label: "Upload", description: "Send the archive." },
  { id: "process", label: "Process", description: "Run the pipeline." },
  { id: "verify", label: "Verify", description: "Check the result." },
];

const runningStatus: Record<string, ProcessMonitorStageStatus> = {
  prepare: "done",
  upload: "active",
  process: "pending",
  verify: "pending",
};

const runningLog = [
  "Prepared 4 files.",
  "Uploading items… 32 of 128",
  "Uploading items… 64 of 128",
];

const failedStatus: Record<string, ProcessMonitorStageStatus> = {
  prepare: "done",
  upload: "failed",
  process: "pending",
  verify: "pending",
};

const failedLog = [
  "Prepared 4 files.",
  "Uploading items… 32 of 128",
  "Upload aborted: connection reset.",
];

const completedStatus: Record<string, ProcessMonitorStageStatus> = {
  prepare: "done",
  upload: "done",
  process: "done",
  verify: "done",
};

const completedLog = [
  "Prepared 4 files.",
  "Uploaded 128 items.",
  "Pipeline finished in 8.4s.",
  "Verification passed.",
];

const localizedLog = [
  "準備が完了しました。",
  "アップロードを開始します… 128 件のうち 32 件",
  "https://example.com/jobs/2026/quarterly-processing-run/output/manifest-with-a-very-long-name.json",
  "A very long single log line that must wrap across multiple lines instead of forcing horizontal overflow inside the log region.",
  "パイプラインの処理に成功しました。",
];

const meta = {
  title: "Application patterns/Process Monitor", id: "patterns-process-monitor",
  component: ProcessMonitor,
  parameters: { layout: "centered" },
  args: {
    stages,
    stageStatus: runningStatus,
    status: "running",
    progress: 0.5,
    logLines: runningLog,
    onCancel: () => {},
    onRetry: () => {},
    onDismiss: () => {},
  },
  render: (args) => (
    <div className="w-[44rem] max-w-full">
      <ProcessMonitor {...args} />
    </div>
  ),
} satisfies Meta<typeof ProcessMonitor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Indeterminate: Story = {
  args: {
    progress: undefined,
    stageStatus: { prepare: "done", upload: "active", process: "pending", verify: "pending" },
  },
};

export const Idle: Story = {
  args: {
    status: "idle",
    progress: undefined,
    stageStatus: {},
    logLines: [],
  },
};

export const Failed: Story = {
  args: {
    status: "failed",
    progress: 0.25,
    stageStatus: failedStatus,
    logLines: failedLog,
  },
};

export const Cancelled: Story = {
  args: {
    status: "cancelled",
    progress: 0.5,
    stageStatus: { prepare: "done", upload: "done", process: "skipped", verify: "skipped" },
    logLines: ["Prepared 4 files.", "Task stopped by the user."],
  },
};

export const Completed: Story = {
  args: {
    status: "completed",
    progress: 1,
    stageStatus: completedStatus,
    logLines: completedLog,
  },
};

export const LongAndLocalizedText: Story = {
  args: {
    title: "処理の状態",
    stageStatus: {
      prepare: "done",
      upload: "active",
      process: "pending",
      verify: "pending",
    },
    logLines: localizedLog,
    labels: { progressLabel: "進捗", logLabel: "タスクログ", cancel: "キャンセル" },
  },
  render: (args: ProcessMonitorProps) => (
    <div className="w-80 max-w-full">
      <ProcessMonitor {...args} />
    </div>
  ),
};
