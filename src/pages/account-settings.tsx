import { useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { Field } from "../ui/field-input";
import { TextareaField } from "../ui/textarea";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { Tabs } from "../ui/tabs";
import { Surface } from "../ui/surface-card";
import { DropdownMenu } from "../ui/dropdown-menu";
import type { DropdownMenuEntry } from "../ui/dropdown-menu";
import { Progress } from "../ui/progress";
import { Dialog } from "../ui/dialog";
import { Popover } from "../ui/popover";
import { Tooltip, TooltipProvider } from "../ui/tooltip";
import { useToast } from "../ui/toast";
import {
  IconUser,
  IconBell,
  IconMail,
  IconClock,
  IconUsers,
  IconCreditCard,
  IconInfo,
  IconMore,
  IconLink,
  IconPlus,
} from "./shared/icons";

/** Card/section title used identically across both showcase pages. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-body font-medium tracking-body text-foreground">
      {children}
    </h2>
  );
}

function SectionHeadingWithIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <SectionTitle>{children}</SectionTitle>
    </div>
  );
}

function ProfilePanel() {
  const [displayName, setDisplayName] = useState("Alex Morgan");
  const [bio, setBio] = useState("");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("utc");
  const [showStatus, setShowStatus] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const nameError =
    nameTouched && displayName.trim() === "" ? "Display name is required." : undefined;

  return (
    <Surface
      header={<SectionTitle>Profile information</SectionTitle>}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button>Save changes</Button>
          <Button variant="outline">Reset</Button>
          <Button variant="outline" icon={<IconLink />} aria-label="Copy profile link">
            Copy link
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            onBlur={() => setNameTouched(true)}
            error={nameError}
            hint="This is how you appear to others."
            containerClassName="md:col-span-2"
          />
          <div className="md:col-span-2">
            <TextareaField
              label="Bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell us a little about yourself."
              hint={
                <span className="flex justify-between gap-4">
                  <span>A short introduction.</span>
                  <span className="tabular-nums">{bio.length} / 160</span>
                </span>
              }
              showCount={false}
              maxLength={160}
              autoResize
            />
          </div>
          <Select
            label="Language"
            options={[
              { value: "en", label: "English" },
              { value: "ja", label: "日本語" },
              { value: "es", label: "Español" },
            ]}
            value={language}
            onValueChange={(value) => setLanguage(value ?? "en")}
          />
          <Select
            label="Timezone"
            options={[
              { value: "utc", label: "UTC" },
              { value: "est", label: "Eastern Time" },
              { value: "jst", label: "Japan Standard Time" },
            ]}
            value={timezone}
            onValueChange={(value) => setTimezone(value ?? "utc")}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Checkbox
            label="Show online status"
            description="Let others see when you are active."
            checked={showStatus}
            onCheckedChange={setShowStatus}
          />
          <Switch
            label="Make profile public"
            description="Anyone can view your profile details."
            checked={publicProfile}
            onCheckedChange={setPublicProfile}
          />
        </div>
      </div>
    </Surface>
  );
}

function NotificationsPanel() {
  const [emailDigest, setEmailDigest] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [mentions, setMentions] = useState(true);
  const [replies, setReplies] = useState(true);
  const [announcements, setAnnouncements] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function handleSave() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast.show({
        type: "success",
        title: "Preferences saved",
        message: "Your notification settings were updated.",
      });
    }, 1200);
  }

  return (
    <Surface
      header={<SectionTitle>Notifications</SectionTitle>}
      footer={
        <Button isLoading={saving} loadingLabel="Saving preferences" onClick={handleSave}>
          Save preferences
        </Button>
      }
    >
      <div className="divide-y divide-border">
        <section className="pb-5">
          <div className="mb-4 flex items-center gap-2">
            <IconMail className="size-5 text-muted-foreground" />
            <h3 className="font-sans text-body-sm font-medium text-foreground">
              Email notifications
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            <Switch
              label="Weekly summary"
              description="A digest of activity from the past seven days."
              checked={emailDigest}
              onCheckedChange={setEmailDigest}
            />
            <Switch
              label="Product updates"
              description="News about features and improvements."
              checked={productUpdates}
              onCheckedChange={setProductUpdates}
            />
          </div>
        </section>

        <section className="py-5">
          <div className="mb-4 flex items-center gap-2">
            <IconBell className="size-5 text-muted-foreground" />
            <h3 className="font-sans text-body-sm font-medium text-foreground">
              In-app notifications
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            <Checkbox label="Mentions" checked={mentions} onCheckedChange={setMentions} />
            <Checkbox label="Replies" checked={replies} onCheckedChange={setReplies} />
            <Checkbox
              label="Announcements"
              checked={announcements}
              onCheckedChange={setAnnouncements}
            />
          </div>
        </section>

        <section className="pt-5">
          <div className="mb-4 flex items-center gap-2">
            <IconClock className="size-5 text-muted-foreground" />
            <h3 className="font-sans text-body-sm font-medium text-foreground">Digest options</h3>
            <Tooltip content="How often a single summary email is sent.">
              <IconButton variant="subtle" size="sm" aria-label="What is digest frequency?">
                <IconInfo />
              </IconButton>
            </Tooltip>
          </div>
          <div className="flex flex-col gap-4">
            <Select
              aria-label="Digest frequency"
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ]}
              value={frequency}
              onValueChange={(value) => setFrequency(value ?? "weekly")}
            />
            <Progress label="Summary completeness" progress={0.72} />
          </div>
        </section>
      </div>
    </Surface>
  );
}

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
};

const initialMembers: Member[] = [
  {
    id: "1",
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    role: "Owner",
    initials: "AM",
  },
  {
    id: "2",
    name: "山田 太郎",
    email: "taro.yamada@example.com",
    role: "閲覧者",
    initials: "山",
  },
  {
    id: "3",
    name:
      "A very long display name that must wrap gracefully within the available space, even on wide viewports where horizontal room is abundant and text would otherwise stay on one line",
    email: "long.name.that.wraps@example.com",
    role: "Editor",
    initials: "AL",
  },
];

function MembersPanel() {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const reducedMotion = useReducedMotion();

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((member) => member.id !== id));
  }

  function addMember() {
    setMembers((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "New member",
        email: "pending@example.com",
        role: "Viewer",
        initials: "NM",
      },
    ]);
  }

  return (
    <Surface
      header={<SectionTitle>People with access</SectionTitle>}
      footer={
        <Button icon={<IconPlus />} onClick={addMember}>
          Invite person
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          {members.length === 0 ? "No people have access." : `${members.length} people have access.`}
        </p>

        <AnimatePresence initial={false}>
          {members.map((member) => {
            const items: DropdownMenuEntry[] = [
              { label: "Edit role", onSelect: () => {} },
              { label: "Resend invite", onSelect: () => {} },
              { separator: true },
              {
                label: "Remove access",
                destructive: true,
                onSelect: () => removeMember(member.id),
              },
            ];

            return (
              <motion.div
                key={member.id}
                layout
                initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              >
                <Surface
                  className="rounded-control"
                  style={{ borderRadius: "var(--km-radius-md)" }}
                  header={
                    <div className="flex w-full min-w-0 items-center gap-2">
                      <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        <span className="text-body-sm font-medium">{member.initials}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-body font-medium text-foreground">
                          {member.name}
                        </p>
                        <p className="break-words text-body-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                      <span className="hidden shrink-0 rounded-control bg-subtle px-2 py-1 text-body-sm font-medium text-subtle-foreground sm:inline-flex">
                        {member.role}
                      </span>
                      <Tooltip content="Edit member">
                        <IconButton variant="outline" size="sm" aria-label="Edit member">
                          <IconUser className="size-4" />
                        </IconButton>
                      </Tooltip>
                      <DropdownMenu items={items} label="Member actions">
                        <IconButton variant="outline" size="sm" aria-label="Member options">
                          <IconMore className="size-4" />
                        </IconButton>
                      </DropdownMenu>
                    </div>
                  }
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {members.length === 0 && (
          <div className="py-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-subtle text-muted-foreground">
              <IconUsers className="size-6" />
            </div>
            <p className="mt-4 text-body font-medium text-foreground">No people yet</p>
            <p className="text-body-sm text-muted-foreground">Invite someone to get started.</p>
            <Button className="mt-4" variant="outline" icon={<IconPlus />} onClick={() => setMembers(initialMembers)}>
              Invite person
            </Button>
          </div>
        )}
      </div>
    </Surface>
  );
}

function UsagePanel() {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const toast = useToast();

  return (
    <div className="flex flex-col gap-6">
      <Surface
        header={
          <SectionHeadingWithIcon icon={<IconCreditCard className="size-5" />}>
            Current plan
          </SectionHeadingWithIcon>
        }
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Popover
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              label="Billing cycle details"
              content={
                <div className="max-w-xs space-y-2">
                  <p className="text-body">
                    Your billing cycle resets on the first of each month.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setPopoverOpen(false)}>
                    Close
                  </Button>
                </div>
              }
            >
              <Button variant="outline" size="sm">
                Billing cycle
              </Button>
            </Popover>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  toast.show({
                    type: "info",
                    title: "Payment updated",
                    message: "Your payment method was saved.",
                  })
                }
              >
                Update payment
              </Button>
              <Button
                variant="outline"
                className="text-danger hover:border-danger hover:text-danger focus-visible:ring-danger"
                style={{ color: "var(--km-text-danger)" }}
                onClick={() => setCancelOpen(true)}
              >
                Cancel plan
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-body text-muted-foreground">Plan</span>
            <span className="text-body font-medium text-foreground">Professional</span>
          </div>
          <Progress label="Storage used" progress={0.68} />
        </div>
      </Surface>

      <Dialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel plan?"
        description="This will remove access at the end of the current cycle."
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-muted-foreground">You can reactivate at any time.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep plan
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setCancelOpen(false);
                toast.show({
                  type: "error",
                  title: "Plan cancelled",
                  message: "Your plan will end on the next cycle.",
                });
              }}
            >
              Cancel plan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function AnimatedTabPanel({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Tabs.Panel value={value} className="mt-0">
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </Tabs.Panel>
  );
}

const tabLabels = ["Profile", "Notifications", "People", "Usage"];

export function AccountSettingsPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
          <div className="mx-auto max-w-5xl">
            <header className="mb-8 flex flex-col gap-1 sm:mb-10">
              <h1 className="font-serif text-heading font-normal tracking-heading text-foreground">
                Account settings
              </h1>
              <p className="text-body text-muted-foreground">
                Manage your preferences, people, and usage.
              </p>
            </header>

            <Tabs
              activeIndex={activeIndex}
              onChange={(index) => setActiveIndex(index ?? 0)}
              label="Settings sections"
            >
              <Tabs.List>
                {tabLabels.map((label, index) => (
                  <Tabs.Tab key={label} value={index}>
                    {label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              <AnimatePresence mode="wait" initial={false}>
                {activeIndex === 0 && (
                  <AnimatedTabPanel key="profile" value={0}>
                    <ProfilePanel />
                  </AnimatedTabPanel>
                )}
                {activeIndex === 1 && (
                  <AnimatedTabPanel key="notifications" value={1}>
                    <NotificationsPanel />
                  </AnimatedTabPanel>
                )}
                {activeIndex === 2 && (
                  <AnimatedTabPanel key="people" value={2}>
                    <MembersPanel />
                  </AnimatedTabPanel>
                )}
                {activeIndex === 3 && (
                  <AnimatedTabPanel key="usage" value={3}>
                    <UsagePanel />
                  </AnimatedTabPanel>
                )}
              </AnimatePresence>
            </Tabs>
          </div>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
