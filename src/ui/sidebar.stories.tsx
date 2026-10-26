import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sidebar } from "./sidebar";
import { Button } from "./button";

const meta = {
  title: "Navigation and layout/Sidebar", id: "components-sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
  args: { "aria-label": "Sidebar" },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const STROKE = 1.75;

function iconProps(className = "size-full") {
  return {
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

function IconHome() {
  return (
    <svg {...iconProps()}>
      <path d="M3 9.5 10 3l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.5Z" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg {...iconProps()}>
      <path d="M3 11 5 4h10l2 7v5H3v-5Z" />
      <path d="M3 11h4l1 2h4l1-2h4" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg {...iconProps()}>
      <path d="M3 5h5l2 2h7v9H3V5Z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg {...iconProps()}>
      <path d="M3 16V4" />
      <path d="M7 16v-5" />
      <path d="M11 16V8" />
      <path d="M15 16v-3" />
      <path d="M3 16h14" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg {...iconProps()}>
      <circle cx="7" cy="7" r="3" />
      <path d="M2 17v-1a5 5 0 0 1 10 0v1" />
      <path d="M14 5.5a3 3 0 0 1 0 5.5" />
      <path d="M15 17v-1a4 4 0 0 0-1-2.6" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg {...iconProps()}>
      <path d="M3 6h14" />
      <path d="M3 14h14" />
      <circle cx="7" cy="6" r="2" />
      <circle cx="13" cy="14" r="2" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg {...iconProps()}>
      <circle cx="10" cy="10" r="7" />
      <path d="M8 8a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.8" />
      <path d="M10 14h.01" />
    </svg>
  );
}

function IconMark() {
  return (
    <svg {...iconProps("size-full")}>
      <path d="M6 3h8l-2 7 2 7H6l2-7-2-7Z" />
    </svg>
  );
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="inline-flex size-5 items-center justify-center">
      {children}
    </span>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-subtle p-1.5 text-foreground"
      >
        <IconMark />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">Kumiki</span>
      <Sidebar.Toggle />
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[640px] bg-canvas p-4">
      {children}
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-6 py-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Preview area
        </p>
        <p className="max-w-md text-sm text-foreground">
          The rail is layout-only. Page content stays in the consumer&apos;s own shell, and links
          are plain anchors so routing stays outside the component.
        </p>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <Frame>
      <Sidebar>
        <Sidebar.Header>
          <Brand />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Item href="/dashboard" icon={<Glyph><IconHome /></Glyph>}>
            Dashboard
          </Sidebar.Item>
          <Sidebar.Item href="/inbox" icon={<Glyph><IconInbox /></Glyph>}>
            Inbox
          </Sidebar.Item>
          <Sidebar.Item href="/projects" icon={<Glyph><IconFolder /></Glyph>}>
            Projects
          </Sidebar.Item>
          <Sidebar.Item href="/reports" icon={<Glyph><IconChart /></Glyph>}>
            Reports
          </Sidebar.Item>
          <Sidebar.Item href="/settings" icon={<Glyph><IconSliders /></Glyph>}>
            Settings
          </Sidebar.Item>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <li className="px-3 text-xs text-muted-foreground">Signed in as A. Rivera</li>
        </Sidebar.Footer>
      </Sidebar>
    </Frame>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <Frame>
      <Sidebar defaultCollapsed aria-label="Collapsed navigation">
        <Sidebar.Header>
          <Sidebar.Toggle />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Item href="/dashboard" icon={<Glyph><IconHome /></Glyph>}>
            Dashboard
          </Sidebar.Item>
          <Sidebar.Item href="/inbox" icon={<Glyph><IconInbox /></Glyph>}>
            Inbox
          </Sidebar.Item>
          <Sidebar.Item href="/projects" icon={<Glyph><IconFolder /></Glyph>}>
            Projects
          </Sidebar.Item>
          <Sidebar.Item href="/reports" active icon={<Glyph><IconChart /></Glyph>}>
            Reports
          </Sidebar.Item>
          <Sidebar.Item href="/settings" icon={<Glyph><IconSliders /></Glyph>}>
            Settings
          </Sidebar.Item>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <li className="inline-flex size-8 items-center justify-center rounded-full bg-surface-subtle text-xs font-medium text-foreground">
            AR
          </li>
        </Sidebar.Footer>
      </Sidebar>
    </Frame>
  ),
};

export const WithActiveItem: Story = {
  render: () => (
    <Frame>
      <Sidebar aria-label="Project navigation">
        <Sidebar.Header>
          <Brand />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Item href="/dashboard" icon={<Glyph><IconHome /></Glyph>}>
            Dashboard
          </Sidebar.Item>
          <Sidebar.Item href="/inbox" icon={<Glyph><IconInbox /></Glyph>}>
            Inbox
          </Sidebar.Item>
          <Sidebar.Item href="/reports" active icon={<Glyph><IconChart /></Glyph>}>
            Reports
          </Sidebar.Item>
          <Sidebar.Item href="/settings" icon={<Glyph><IconSliders /></Glyph>}>
            Settings
          </Sidebar.Item>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <li className="px-3 text-xs text-muted-foreground">
            The current page carries <code>aria-current=&quot;page&quot;</code>, a filled surface
            and a leading marker.
          </li>
        </Sidebar.Footer>
      </Sidebar>
    </Frame>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Frame>
      <Sidebar aria-label="Workspace navigation">
        <Sidebar.Header>
          <Brand />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Group label="Workspace">
            <Sidebar.Item href="/dashboard" active icon={<Glyph><IconHome /></Glyph>}>
              Dashboard
            </Sidebar.Item>
            <Sidebar.Item href="/inbox" icon={<Glyph><IconInbox /></Glyph>}>
              Inbox
            </Sidebar.Item>
            <Sidebar.Item href="/projects" icon={<Glyph><IconFolder /></Glyph>}>
              Projects
            </Sidebar.Item>
          </Sidebar.Group>
          <Sidebar.Group label="Insights">
            <Sidebar.Item href="/reports" icon={<Glyph><IconChart /></Glyph>}>
              Reports
            </Sidebar.Item>
            <Sidebar.Item href="/members" icon={<Glyph><IconUsers /></Glyph>}>
              Members
            </Sidebar.Item>
          </Sidebar.Group>
          <Sidebar.Group label="Account">
            <Sidebar.Item href="/settings" icon={<Glyph><IconSliders /></Glyph>}>
              Settings
            </Sidebar.Item>
            <Sidebar.Item href="/help" icon={<Glyph><IconHelp /></Glyph>}>
              Help
            </Sidebar.Item>
          </Sidebar.Group>
        </Sidebar.Nav>
      </Sidebar>
    </Frame>
  ),
};

export const WithHeaderFooter: Story = {
  render: () => (
    <Frame>
      <Sidebar aria-label="Account navigation">
        <Sidebar.Header>
          <Brand />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Item href="/dashboard" icon={<Glyph><IconHome /></Glyph>}>
            Dashboard
          </Sidebar.Item>
          <Sidebar.Item href="/members" icon={<Glyph><IconUsers /></Glyph>}>
            Members
          </Sidebar.Item>
          <Sidebar.Item href="/settings" icon={<Glyph><IconSliders /></Glyph>}>
            Settings
          </Sidebar.Item>
          <Sidebar.Item href="/help" icon={<Glyph><IconHelp /></Glyph>}>
            Help
          </Sidebar.Item>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <li className="flex min-w-0 items-center gap-2 px-1">
            <span
              aria-hidden="true"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-xs font-medium text-foreground"
            >
              AR
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">Avery Rivera</p>
              <p className="truncate text-xs text-muted-foreground">avery@example.com</p>
            </div>
          </li>
        </Sidebar.Footer>
      </Sidebar>
    </Frame>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <Frame>
      <Sidebar aria-label="Billing navigation">
        <Sidebar.Header>
          <Brand />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Item href="/billing" active icon={<Glyph><IconChart /></Glyph>}>
            Billing
          </Sidebar.Item>
          <Sidebar.Item href="/invoices" icon={<Glyph><IconFolder /></Glyph>}>
            Invoices
          </Sidebar.Item>
          <Sidebar.Item href="/audit" disabled icon={<Glyph><IconSliders /></Glyph>}>
            Audit log
          </Sidebar.Item>
          <Sidebar.Item href="/help" icon={<Glyph><IconHelp /></Glyph>}>
            Help
          </Sidebar.Item>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <li className="px-3 text-xs text-muted-foreground">
            Audit log is unavailable on the current plan.
          </li>
        </Sidebar.Footer>
      </Sidebar>
    </Frame>
  ),
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [collapsed, setCollapsed] = useState(false);
      return (
        <div className="flex h-[640px] bg-canvas p-4">
          <Sidebar
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            aria-label="Controlled navigation"
          >
            <Sidebar.Header>
              {collapsed ? (
                <Sidebar.Toggle />
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-subtle p-1.5 text-foreground"
                  >
                    <IconMark />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    Kumiki
                  </span>
                  <Sidebar.Toggle />
                </div>
              )}
            </Sidebar.Header>
            <Sidebar.Nav>
              <Sidebar.Item href="/dashboard" icon={<Glyph><IconHome /></Glyph>}>
                Dashboard
              </Sidebar.Item>
              <Sidebar.Item href="/inbox" icon={<Glyph><IconInbox /></Glyph>}>
                Inbox
              </Sidebar.Item>
              <Sidebar.Item href="/projects" active icon={<Glyph><IconFolder /></Glyph>}>
                Projects
              </Sidebar.Item>
              <Sidebar.Item href="/settings" icon={<Glyph><IconSliders /></Glyph>}>
                Settings
              </Sidebar.Item>
            </Sidebar.Nav>
          </Sidebar>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-3 px-6 py-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Controlled state
            </p>
            <p className="text-sm text-foreground">
              collapsed:{" "}
              <span data-testid="sidebar-collapsed" className="font-medium">
                {String(collapsed)}
              </span>
            </p>
            <Button variant="outline" size="sm" onClick={() => setCollapsed((value) => !value)}>
              Toggle from page
            </Button>
          </div>
        </div>
      );
    }
    return <Example />;
  },
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <Frame>
      <Sidebar defaultCollapsed={false} aria-label="ワークスペースのナビゲーション" className="w-72">
        <Sidebar.Header>
          <Brand />
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Group label="ワークスペース">
            <Sidebar.Item href="/overview" icon={<Glyph><IconHome /></Glyph>}>
              概要とプロジェクトの説明
            </Sidebar.Item>
            <Sidebar.Item href="/activity" active icon={<Glyph><IconInbox /></Glyph>}>
              アクティビティタイムライン
            </Sidebar.Item>
            <Sidebar.Item href="/members" icon={<Glyph><IconUsers /></Glyph>}>
              メンバーと権限の管理
            </Sidebar.Item>
          </Sidebar.Group>
          <Sidebar.Group label="分析と請求">
            <Sidebar.Item href="/analytics" icon={<Glyph><IconChart /></Glyph>}>
              分析レポートとエクスポート設定（四半期ごと）
            </Sidebar.Item>
            <Sidebar.Item href="/billing" icon={<Glyph><IconFolder /></Glyph>}>
              Abrechnungsübersicht für internationale Zusammenarbeit
            </Sidebar.Item>
          </Sidebar.Group>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <li className="px-3 text-xs text-muted-foreground">
            長いラベルは省略記号で切り詰め、リンクのアクセシブルな名前はそのまま保持します。
          </li>
        </Sidebar.Footer>
      </Sidebar>
    </Frame>
  ),
};
