import { useState } from "react";
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
  IconUsers,
  IconCreditCard,
  IconInfo,
  IconMore,
  IconLink,
  IconPlus,
} from "./shared/icons";

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
    <div className="flex flex-col gap-5 pt-2">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
            hint="A short introduction."
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
        <div className="md:col-span-2">
          <Checkbox
            label="Show online status"
            description="Let others see when you are active."
            checked={showStatus}
            onCheckedChange={setShowStatus}
          />
        </div>
        <div className="md:col-span-2">
          <Switch
            label="Make profile public"
            description="Anyone can view your profile details."
            checked={publicProfile}
            onCheckedChange={setPublicProfile}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button>Save changes</Button>
        <Button variant="outline">Reset</Button>
        <Tooltip content="Copy profile link">
          <IconButton variant="outline" aria-label="Copy profile link">
            <IconLink />
          </IconButton>
        </Tooltip>
      </div>
    </div>
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
    <div className="flex flex-col gap-5 pt-2">
      <Surface header={<h3 className="font-medium">Email notifications</h3>}>
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
      </Surface>

      <Surface header={<h3 className="font-medium">In-app notifications</h3>}>
        <div className="flex flex-col gap-3">
          <Checkbox label="Mentions" checked={mentions} onCheckedChange={setMentions} />
          <Checkbox label="Replies" checked={replies} onCheckedChange={setReplies} />
          <Checkbox
            label="Announcements"
            checked={announcements}
            onCheckedChange={setAnnouncements}
          />
        </div>
      </Surface>

      <Surface
        header={
          <div className="flex items-center gap-2">
            <IconBell className="size-5 text-muted-foreground" />
            <h3 className="font-medium">Digest options</h3>
            <Tooltip content="How often a single summary email is sent.">
              <IconButton variant="subtle" size="sm" aria-label="What is digest frequency?">
                <IconInfo />
              </IconButton>
            </Tooltip>
          </div>
        }
      >
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
      </Surface>

      <div className="flex flex-wrap items-center gap-3">
        <Button isLoading={saving} loadingLabel="Saving preferences" onClick={handleSave}>
          Save preferences
        </Button>
      </div>
    </div>
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
    name: "A very long display name that must wrap gracefully within the available space",
    email: "long.name.that.wraps@example.com",
    role: "Editor",
    initials: "AL",
  },
];

function MembersPanel() {
  const [members, setMembers] = useState<Member[]>(initialMembers);

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((member) => member.id !== id));
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
          {members.length === 0 ? "No people have access." : `${members.length} people have access.`}
        </p>
        <Button
          icon={<IconPlus />}
          onClick={() =>
            setMembers((prev) => [
              ...prev,
              {
                id: String(Date.now()),
                name: "New member",
                email: "pending@example.com",
                role: "Viewer",
                initials: "NM",
              },
            ])
          }
        >
          Invite person
        </Button>
      </div>

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
          <Surface
            key={member.id}
            header={
              <div className="flex w-full min-w-0 items-center gap-3">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <span className="text-sm font-medium">{member.initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-foreground">{member.name}</p>
                  <p className="break-words text-[length:var(--km-type-size-sm)] text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-control bg-subtle px-2 py-1 text-[length:var(--km-type-size-sm)] font-medium text-subtle-foreground sm:inline-flex">
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
        );
      })}

      {members.length === 0 && (
        <Surface variant="ghost">
          <div className="py-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-subtle text-muted-foreground">
              <IconUsers className="size-6" />
            </div>
            <p className="mt-3 font-medium text-foreground">No people yet</p>
            <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
              Invite someone to get started.
            </p>
            <Button className="mt-4" icon={<IconPlus />} onClick={() => setMembers(initialMembers)}>
              Invite person
            </Button>
          </div>
        </Surface>
      )}
    </div>
  );
}

function UsagePanel() {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5 pt-2">
      <Surface
        header={
          <div className="flex items-center gap-2">
            <IconCreditCard className="size-5 text-muted-foreground" />
            <h3 className="font-medium">Current plan</h3>
          </div>
        }
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <Popover
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              label="Billing cycle details"
              content={
                <div className="max-w-xs space-y-3">
                  <p>Your billing cycle resets on the first of each month.</p>
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
                variant="outline"
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
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel plan
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium">Professional</span>
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
          <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
            You can reactivate at any time.
          </p>
          <div className="flex justify-end gap-3">
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

export function AccountSettingsPage() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-canvas p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Account settings</h1>
              <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
                Manage your preferences, people, and usage.
              </p>
            </div>
            <Button>Save changes</Button>
          </header>

          <Tabs defaultActiveIndex={0} label="Settings sections">
            <Tabs.List>
              <Tabs.Tab value={0}>Profile</Tabs.Tab>
              <Tabs.Tab value={1}>Notifications</Tabs.Tab>
              <Tabs.Tab value={2}>People</Tabs.Tab>
              <Tabs.Tab value={3}>Usage</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value={0}>
              <ProfilePanel />
            </Tabs.Panel>
            <Tabs.Panel value={1}>
              <NotificationsPanel />
            </Tabs.Panel>
            <Tabs.Panel value={2}>
              <MembersPanel />
            </Tabs.Panel>
            <Tabs.Panel value={3}>
              <UsagePanel />
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
