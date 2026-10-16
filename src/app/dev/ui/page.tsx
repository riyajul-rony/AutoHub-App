"use client";

import React, { useState } from "react";
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  Dialog,
  Dropdown,
  ToastProvider,
  useToast,
  Skeleton,
  EmptyState,
  PageHeader,
  ThemeToggle,
} from "@/components/ui";
import {
  Send,
  Plus,
  Trash2,
  MoreVertical,
  Mail,
  Users,
  Search,
  Sparkles,
  Inbox,
  CheckCircle,
} from "lucide-react";

export default function DevUiPage() {
  return (
    <ToastProvider>
      <DevUiContent />
    </ToastProvider>
  );
}

function DevUiContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkedBox, setCheckedBox] = useState(true);
  const [switchVal, setSwitchVal] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-text p-4 sm:p-8 max-w-6xl mx-auto space-y-10">
      {/* Top Header with Theme Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text">AutoHub Design System</h1>
            <Badge variant="accent" size="sm">
              Phase 1 Showcase
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Linear & Notion-inspired minimal SaaS tokens. Default Light theme with WCAG AA compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">Toggle Theme:</span>
          <ThemeToggle />
        </div>
      </div>

      {/* 1. Typography & Tokens */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
          1. Typography & Color Tokens
        </h2>
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded border border-border bg-surface">
                <span className="font-semibold block text-text">--text</span>
                <span className="text-text-muted">Primary content text</span>
              </div>
              <div className="p-3 rounded border border-border bg-surface">
                <span className="font-semibold block text-text-muted">--text-muted</span>
                <span className="text-text-subtle">Secondary / labels</span>
              </div>
              <div className="p-3 rounded border border-border bg-surface">
                <span className="font-semibold block text-text-subtle">--text-subtle</span>
                <span className="text-text-subtle">Captions / borders</span>
              </div>
              <div className="p-3 rounded border border-border bg-primary text-primary-text">
                <span className="font-semibold block">--primary</span>
                <span className="opacity-80">Solid high-contrast</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2 text-xs">
              <span className="text-text font-normal">Inter Regular 400</span>
              <span className="text-text-muted font-medium">Inter Medium 500</span>
              <span className="text-text font-semibold">Inter SemiBold 600</span>
              <code className="text-xs bg-bg-subtle px-1.5 py-0.5 rounded border border-border font-mono text-text">
                monospace-code-id-1234
              </code>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. Buttons */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
          2. Buttons (Heights: 32px sm, 36px md, 40px lg)
        </h2>
        <Card>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="md">
                Primary Button
              </Button>
              <Button variant="secondary" size="md">
                Secondary Button
              </Button>
              <Button variant="ghost" size="md">
                Ghost Button
              </Button>
              <Button variant="danger" size="md">
                Danger Button
              </Button>
              <Button variant="primary" size="md" icon={<Send className="w-4 h-4" />}>
                With Icon
              </Button>
              <Button variant="primary" size="md" loading>
                Loading
              </Button>
              <Button variant="secondary" size="md" disabled>
                Disabled
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/50">
              <Button variant="secondary" size="sm">
                Small (32px)
              </Button>
              <Button variant="secondary" size="md">
                Medium (36px)
              </Button>
              <Button variant="secondary" size="lg">
                Large (40px)
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. Form Inputs & Selects */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
          3. Form Controls (Light & Dark Readable Selects)
        </h2>
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Work Email"
                placeholder="name@company.com"
                icon={<Mail className="w-4 h-4" strokeWidth={1.5} />}
                helperText="We'll never share your email."
              />
              <Select label="Automation Module" defaultValue="outreach">
                <option value="leads">Lead Generation & Places</option>
                <option value="social">Social Media Auto-Publish</option>
                <option value="outreach">Cold Email Outreach</option>
                <option value="followup">Smart Follow-up Sequences</option>
              </Select>
              <Input
                label="API Key (Error State)"
                placeholder="sk-live-..."
                error="Invalid API key provided"
                defaultValue="sk-invalid-key"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Textarea
                label="Campaign Prompt / Description"
                placeholder="Write your email sequence instructions..."
                rows={3}
              />
              <div className="space-y-3 pt-4">
                <Checkbox
                  checked={checkedBox}
                  onChange={(e) => setCheckedBox(e.target.checked)}
                  label="Enable automatic email warmup"
                  description="Gradually ramp sending volume up to 25 emails per day."
                />
                <Switch
                  checked={switchVal}
                  onChange={(e) => setSwitchVal(e.target.checked)}
                  label="Maintenance Mode"
                  description="Lock platform access for non-admin accounts."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Badges */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
          4. Semantic Badges (WCAG AA Contrast)
        </h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant="neutral" dot>
              Draft
            </Badge>
            <Badge variant="accent" dot>
              In Progress
            </Badge>
            <Badge variant="success" dot>
              Active / Published
            </Badge>
            <Badge variant="warning" dot>
              Past Due / Trial
            </Badge>
            <Badge variant="danger" dot>
              Suspended / Failed
            </Badge>
            <Badge variant="neutral" size="sm">
              Small 20px
            </Badge>
            <Badge variant="accent" size="md" icon={<Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />}>
              AI Generated
            </Badge>
          </CardContent>
        </Card>
      </section>

      {/* 5. Data Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
          5. Data Table (Sticky Header, 44px Row Height, Responsive Scroll)
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Sent / Leads</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">SaaS Growth Outreach Q4</TableCell>
              <TableCell>
                <Badge variant="success" dot size="sm">
                  Sending
                </Badge>
              </TableCell>
              <TableCell className="text-text-muted">SMTP / Google</TableCell>
              <TableCell className="font-mono text-xs">1,420 / 2,000</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Dentists in Austin, TX</TableCell>
              <TableCell>
                <Badge variant="neutral" dot size="sm">
                  Queued
                </Badge>
              </TableCell>
              <TableCell className="text-text-muted">Google Places</TableCell>
              <TableCell className="font-mono text-xs">0 / 450</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Weekly LinkedIn Post Trigger</TableCell>
              <TableCell>
                <Badge variant="accent" dot size="sm">
                  Scheduled
                </Badge>
              </TableCell>
              <TableCell className="text-text-muted">LinkedIn API</TableCell>
              <TableCell className="font-mono text-xs">4 / 12</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* 6. Tabs, Dialog, Dropdown & Toast */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
          6. Interactive Overlays & Notifications
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Overlays & Interactive Components</CardTitle>
            <CardDescription>
              Test tabs, dialog confirmation, dropdown menu, and toast notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Tabs
              activeId={activeTab}
              onChange={setActiveTab}
              items={[
                { id: "overview", label: "Overview", count: 12 },
                { id: "leads", label: "Leads", count: 85 },
                { id: "campaigns", label: "Campaigns" },
                { id: "settings", label: "Settings" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="danger" size="md" onClick={() => setDialogOpen(true)}>
                Open Confirm Dialog
              </Button>

              <Dropdown
                trigger={
                  <Button variant="secondary" size="md" icon={<MoreVertical className="w-4 h-4" />}>
                    More Actions
                  </Button>
                }
                items={[
                  { id: "edit", label: "Edit Campaign", onClick: () => {} },
                  { id: "export", label: "Export to CSV", onClick: () => {} },
                  { id: "delete", label: "Delete Permanently", variant: "danger", onClick: () => {} },
                ]}
              />

              <Button
                variant="secondary"
                size="md"
                onClick={() =>
                  toast({
                    title: "Lead Export Completed",
                    description: "500 verified business leads exported to Google Sheets.",
                    type: "success",
                  })
                }
              >
                Trigger Success Toast
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() =>
                  toast({
                    title: "Worker Rate Limit Hit",
                    description: "OpenAI rate limit exceeded, job requeued in 60s.",
                    type: "error",
                  })
                }
              >
                Trigger Error Toast
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 7. Skeleton & EmptyState */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-subtle">
          7. Loading Skeletons & Clean Empty State
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Loading Skeleton</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2 justify-end">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>

          <EmptyState
            icon={<Inbox className="w-5 h-5" strokeWidth={1.5} />}
            title="No outreach campaigns yet"
            description="Create your first cold email sequence to start connecting with verified leads."
            actionLabel="New Campaign"
            actionIcon={<Plus className="w-4 h-4" strokeWidth={1.5} />}
            onAction={() => {}}
          />
        </div>
      </section>

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Suspend User Account?"
        description="This action will instantly invalidate all active browser sessions, halt pending campaigns, and block user sign-in."
        confirmLabel="Suspend User"
        confirmVariant="danger"
        onConfirm={() => {
          setDialogOpen(false);
          toast({
            title: "User Suspended",
            description: "Account terminated and sessions wiped.",
            type: "warning",
          });
        }}
      />
    </div>
  );
}
