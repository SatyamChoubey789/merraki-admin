"use client";
import { useState, useCallback } from "react";
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Typography, Paper, Tabs, Tab, Chip, Skeleton,
  Drawer, Divider, Avatar, LinearProgress,
} from "@mui/material";
import {
  DeleteRounded, DownloadRounded, FileDownloadRounded,
  MarkEmailReadRounded, TrendingUpRounded, PeopleRounded,
  EmailRounded, CloseRounded, InfoOutlined, SendRounded,
  BusinessRounded, BadgeRounded, FiberManualRecordRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import { alpha } from "@mui/material/styles";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import StatusChip from "@/components/ui/StatusChip";
import SearchBar from "@/components/ui/SearchBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";

const GOLD = "#C9A84C";

// ── Types — match DB schema from the test engine ──────────────────────────────
type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "rejected";

type PersonalityType =
  | "blindfolded_founder"
  | "hustler_rough_numbers"
  | "structured_operator"
  | "finance_savvy_builder"
  | "investor_ready_ceo";

interface SectionScore {
  dimension: string;
  label: string;
  score: number;
  max: number;
  percentage: number;
}

interface FounderLead {
  id: number;
  // Contact (from form)
  name: string;
  email: string;
  company: string;
  role: string;
  ip_address: string;
  // Test result (computed + stored)
  total_score: number;
  total_max: number;
  personality_type: PersonalityType;
  personality_title: string;
  personality_badge: string;
  personality_color: string;
  personality_description: string;
  section_scores: SectionScore[];        // stored as JSON column
  // Admin
  status: LeadStatus;
  notes: string;
  submitted_at: string;
  updated_at: string;
}

interface LeadStats {
  total: number;
  new_this_week: number;
  contacted: number;
  avg_score: number;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[] | null;
  pagination: {
    total: number; page: number; pages: number;
    limit: number; has_next: boolean; has_prev: boolean;
  };
}

interface EmailFormValues {
  subject: string;
  message: string;
}

// ── Personality meta ──────────────────────────────────────────────────────────
const PERSONALITY_META: Record<PersonalityType, { color: string; short: string }> = {
  blindfolded_founder:   { color: "#DC2626", short: "Blindfolded" },
  hustler_rough_numbers: { color: "#D97706", short: "Hustler" },
  structured_operator:   { color: "#CA8A04", short: "Structured" },
  finance_savvy_builder: { color: "#059669", short: "Finance-Savvy" },
  investor_ready_ceo:    { color: "#1D4ED8", short: "Investor-Ready" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function scoreColor(pct: number) {
  if (pct >= 75) return "#059669";
  if (pct >= 50) return "#D97706";
  return "#DC2626";
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }: {
  label: string; value: string | number; icon: React.ReactNode; accent?: string;
}) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: 2, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: alpha(accent ?? GOLD, 0.12), color: accent ?? GOLD,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: "1.35rem", fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.25 }}>{label}</Typography>
      </Box>
    </Paper>
  );
}

// ── Section Score Bar ─────────────────────────────────────────────────────────
function SectionBar({ section }: { section: SectionScore }) {
  const color = scoreColor(section.percentage);
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{section.label}</Typography>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color }}>
          {section.score}/{section.max}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={section.percentage}
        sx={{
          height: 6, borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
          "& .MuiLinearProgress-bar": { background: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

// ── Detail Side Panel ─────────────────────────────────────────────────────────
function LeadDetailPanel({ lead, open, onClose, onMarkContacted, onEmailOpen }: {
  lead: FounderLead | null;
  open: boolean;
  onClose: () => void;
  onMarkContacted: (lead: FounderLead) => void;
  onEmailOpen: (lead: FounderLead) => void;
}) {
  if (!lead) return null;

  const meta = PERSONALITY_META[lead.personality_type];
  const scorePct = Math.round((lead.total_score / lead.total_max) * 100);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 440, background: "background.paper" } } }}
    >
      {/* Header */}
      <Box sx={{
        p: 3, display: "flex", alignItems: "flex-start",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ width: 48, height: 48, fontWeight: 700, fontSize: "1rem", background: alpha(GOLD, 0.15), color: GOLD }}>
            {initials(lead.name)}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>{lead.name}</Typography>
            {lead.role && (
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                {lead.role}{lead.company ? ` · ${lead.company}` : ""}
              </Typography>
            )}
            <Box sx={{ mt: 0.5 }}><StatusChip status={lead.status} /></Box>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseRounded sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5, overflow: "auto" }}>

        {/* Personality Result */}
        <Box
          sx={{
            p: 2, borderRadius: 2,
            background: alpha(meta.color, 0.08),
            border: `1px solid ${alpha(meta.color, 0.2)}`,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
            <Box>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: "text.disabled", textTransform: "uppercase", mb: 0.25 }}>
                Personality Type
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: meta.color }}>
                {lead.personality_badge} {lead.personality_title}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: meta.color, lineHeight: 1 }}>
                {lead.total_score}
              </Typography>
              <Typography sx={{ fontSize: "0.68rem", color: "text.disabled" }}>
                / {lead.total_max} pts
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.5 }}>
            {lead.personality_description}
          </Typography>
          {/* Overall bar */}
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={scorePct}
              sx={{
                height: 8, borderRadius: 4,
                background: "rgba(255,255,255,0.06)",
                "& .MuiLinearProgress-bar": { background: meta.color, borderRadius: 4 },
              }}
            />
            <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 0.5, textAlign: "right" }}>
              {scorePct}% overall
            </Typography>
          </Box>
        </Box>

        {/* Section Scores */}
        {lead.section_scores?.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: "text.disabled", textTransform: "uppercase", mb: 1.5 }}>
              Section Breakdown
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {lead.section_scores.map((s) => (
                <SectionBar key={s.dimension} section={s} />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

        {/* Contact */}
        <Box>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: "text.disabled", textTransform: "uppercase", mb: 1.5 }}>
            Contact
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <EmailRounded sx={{ fontSize: 15, color: "text.disabled" }} />
              <Typography sx={{ fontSize: "0.85rem" }}>{lead.email}</Typography>
            </Box>
            {lead.company && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <BusinessRounded sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography sx={{ fontSize: "0.85rem" }}>{lead.company}</Typography>
              </Box>
            )}
            {lead.role && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <BadgeRounded sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography sx={{ fontSize: "0.85rem" }}>{lead.role}</Typography>
              </Box>
            )}
            {lead.ip_address && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <FiberManualRecordRounded sx={{ fontSize: 10, color: "text.disabled" }} />
                <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                  IP: {lead.ip_address}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

        {/* Meta */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>Submitted</Typography>
            <Typography sx={{ fontSize: "0.8rem" }}>{dayjs(lead.submitted_at).format("MMM D, YYYY · h:mm A")}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>Last updated</Typography>
            <Typography sx={{ fontSize: "0.8rem" }}>{dayjs(lead.updated_at).format("MMM D, YYYY")}</Typography>
          </Box>
        </Box>

        {/* Notes */}
        {lead.notes && (
          <>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <Box>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: "text.disabled", textTransform: "uppercase", mb: 1 }}>
                Notes
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.6 }}>
                {lead.notes}
              </Typography>
            </Box>
          </>
        )}

        <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

        {/* Actions */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Button fullWidth variant="contained" startIcon={<SendRounded />} onClick={() => onEmailOpen(lead)} size="small">
            Send Follow-up Email
          </Button>
          {lead.status !== "contacted" && lead.status !== "converted" && (
            <Button fullWidth variant="outlined" startIcon={<MarkEmailReadRounded />} onClick={() => onMarkContacted(lead)} size="small">
              Mark as Contacted
            </Button>
          )}
        </Box>

      </Box>
    </Drawer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FoundersLeadsPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [exportLoading, setExportLoading] = useState(false);

  // Panel
  const [panelLead, setPanelLead] = useState<FounderLead | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Email
  const [emailLead, setEmailLead] = useState<FounderLead | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(0); }, []);

  const tabStatuses: (LeadStatus | "all")[] = ["all", "new", "contacted", "qualified", "converted"];

  // ── Data ───────────────────────────────────────────────────────────────────
  const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";

  const { data: leadsData, isLoading: leadsLoading, mutate: mutateLeads } =
    useSWR<PaginatedResponse<FounderLead>>(
      `/admin/founder-leads?page=${page + 1}&limit=25${statusParam}${searchParam}`,
    );

  const { data: statsData, isLoading: statsLoading } =
    useSWR<{ success: boolean; data: LeadStats }>("/admin/founder-leads/stats");

  const leads: FounderLead[] = leadsData?.data ?? [];
  const total = leadsData?.pagination?.total ?? 0;
  const stats = statsData?.data;

  // ── Email form ─────────────────────────────────────────────────────────────
  const {
    register: regEmail, handleSubmit: handleEmailSubmit, reset: resetEmail,
    formState: { errors: emailErrors },
  } = useForm<EmailFormValues>({ defaultValues: { subject: "", message: "" } });

  const openEmailDialog = (lead: FounderLead) => {
    resetEmail({
      subject: `Your Founder Finance Test results — ${lead.name}`,
      message: `Hi ${lead.name.split(" ")[0]},\n\nThank you for completing the Founder Finance Test. Based on your results, you scored ${lead.total_score}/${lead.total_max} — ${lead.personality_title}.\n\nWe'd love to show you how Merraki can help you strengthen your financial systems.\n\nWould you be open to a quick 20-minute call this week?\n\nBest,\nThe Merraki Team`,
    });
    setEmailLead(lead);
    setPanelOpen(false);
  };

  const onSendEmail = async (formData: EmailFormValues) => {
    if (!emailLead) return;
    setEmailLoading(true);
    try {
      await api.post(`/admin/founder-leads/${emailLead.id}/email`, formData);
      enqueueSnackbar("Email sent", { variant: "success" });
      setEmailLead(null);
      await mutateLeads();
    } catch {
      enqueueSnackbar("Failed to send email", { variant: "error" });
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Mark contacted ─────────────────────────────────────────────────────────
  const handleMarkContacted = async (lead: FounderLead) => {
    try {
      await api.patch(`/admin/founder-leads/${lead.id}/status`, { status: "contacted" });
      enqueueSnackbar(`${lead.name} marked as contacted`, { variant: "success" });
      setPanelLead((prev) => prev?.id === lead.id ? { ...prev, status: "contacted" } : prev);
      await mutateLeads();
    } catch {
      enqueueSnackbar("Failed to update status", { variant: "error" });
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/founder-leads/${deleteId}`);
      enqueueSnackbar("Lead removed", { variant: "success" });
      setDeleteId(null);
      if (panelLead?.id === deleteId) setPanelOpen(false);
      await mutateLeads();
    } catch {
      enqueueSnackbar("Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async (format: "xlsx" | "pdf") => {
    setExportLoading(true);
    try {
      const response = await api.get(
        `/admin/founder-leads/export?format=${format}${statusParam}${searchParam}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `founder_leads_${dayjs().format("YYYY-MM-DD")}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      enqueueSnackbar(`Exported as ${format.toUpperCase()}`, { variant: "success" });
    } catch {
      enqueueSnackbar("Export failed", { variant: "error" });
    } finally {
      setExportLoading(false);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: Column<FounderLead>[] = [
    {
      key: "name",
      label: "Founder",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: "0.7rem", fontWeight: 700, background: alpha(GOLD, 0.12), color: GOLD }}>
            {initials(row.name)}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 500, fontSize: "0.875rem" }}>{row.name}</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{row.email}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "company",
      label: "Company",
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: "0.85rem", color: row.company ? "text.primary" : "text.disabled" }}>
            {row.company || "—"}
          </Typography>
          {row.role && (
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{row.role}</Typography>
          )}
        </Box>
      ),
    },
    {
      key: "personality_type",
      label: "Result",
      render: (row) => {
        const meta = PERSONALITY_META[row.personality_type];
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={`${row.personality_badge} ${meta.short}`}
              size="small"
              sx={{
                fontSize: "0.68rem", fontWeight: 600,
                background: alpha(meta.color, 0.1),
                color: meta.color,
              }}
            />
          </Box>
        );
      },
    },
    {
      key: "total_score",
      label: "Score",
      render: (row) => {
        const pct = Math.round((row.total_score / row.total_max) * 100);
        const color = scoreColor(pct);
        return (
          <Box sx={{ minWidth: 72 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color }}>
                {row.total_score}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
                /{row.total_max}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 4, borderRadius: 2,
                background: "rgba(255,255,255,0.06)",
                "& .MuiLinearProgress-bar": { background: color, borderRadius: 2 },
              }}
            />
          </Box>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "submitted_at",
      label: "Submitted",
      render: (row) => (
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
          {dayjs(row.submitted_at).format("MMM D, YYYY")}
        </Typography>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          <Tooltip title="View full results">
            <IconButton size="small" onClick={() => { setPanelLead(row); setPanelOpen(true); }}>
              <InfoOutlined sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Send follow-up email">
            <IconButton size="small" onClick={() => openEmailDialog(row)} sx={{ "&:hover": { color: "#5B8DEF" } }}>
              <EmailRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {row.status === "new" && (
            <Tooltip title="Mark as contacted">
              <IconButton size="small" onClick={() => handleMarkContacted(row)} sx={{ "&:hover": { color: "#4CAF82" } }}>
                <MarkEmailReadRounded sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete lead">
            <IconButton
              size="small"
              onClick={() => setDeleteId(row.id)}
              sx={{ "&:hover": { color: "#E05C5C", background: alpha("#E05C5C", 0.08) } }}
            >
              <DeleteRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Founders Test Leads"
      subtitle="Submissions from the Founder Personality Test"
      actions={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
            {total.toLocaleString()} lead{total !== 1 ? "s" : ""}
          </Typography>
          <Tooltip title="Export as Excel">
            <IconButton
              size="small" onClick={() => handleExport("xlsx")} disabled={exportLoading}
              sx={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 1.5, "&:hover": { color: "#4CAF82" } }}
            >
              <FileDownloadRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export as PDF">
            <IconButton
              size="small" onClick={() => handleExport("pdf")} disabled={exportLoading}
              sx={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 1.5, "&:hover": { color: GOLD } }}
            >
              <DownloadRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      {/* Stats Row */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ flex: 1, minWidth: 160, borderRadius: 3 }} />
          ))
        ) : (
          <>
            <StatCard label="Total Leads" value={stats?.total.toLocaleString() ?? "—"} icon={<PeopleRounded sx={{ fontSize: 20 }} />} />
            <StatCard label="New This Week" value={stats?.new_this_week ?? "—"} icon={<TrendingUpRounded sx={{ fontSize: 20 }} />} accent="#4CAF82" />
            <StatCard label="Contacted" value={stats?.contacted ?? "—"} icon={<MarkEmailReadRounded sx={{ fontSize: 20 }} />} accent="#5B8DEF" />
            <StatCard label="Avg. Score" value={stats?.avg_score ? `${stats.avg_score}/100` : "—"} icon={<TrendingUpRounded sx={{ fontSize: 20 }} />} accent={GOLD} />
          </>
        )}
      </Box>

      {/* Status Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setStatusFilter(tabStatuses[v]); setPage(0); }}
          sx={{ px: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {tabStatuses.map((s) => (
            <Tab key={s} label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} />
          ))}
        </Tabs>
      </Paper>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <SearchBar placeholder="Search by name, email, or company…" onSearch={handleSearch} />
      </Box>

      {/* Table */}
      {leadsLoading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={leads}
          loading={false}
          page={page}
          rowsPerPage={25}
          total={total}
          onPageChange={setPage}
          getRowId={(r) => String(r.id)}
          emptyMessage="No leads yet — test submissions will appear here automatically"
        />
      )}

      {/* Detail Side Panel */}
      <LeadDetailPanel
        lead={panelLead}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onMarkContacted={handleMarkContacted}
        onEmailOpen={openEmailDialog}
      />

      {/* Send Email Dialog */}
      <Dialog open={!!emailLead} onClose={() => !emailLoading && setEmailLead(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Send Email — {emailLead?.name}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="email-form"
            onSubmit={handleEmailSubmit(onSendEmail)}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
          >
            <TextField
              {...regEmail("subject", { required: "Subject is required" })}
              label="Subject *" fullWidth autoFocus
              error={!!emailErrors.subject} helperText={emailErrors.subject?.message}
            />
            <TextField
              {...regEmail("message", { required: "Message is required" })}
              label="Message *" fullWidth multiline minRows={7}
              error={!!emailErrors.message} helperText={emailErrors.message?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setEmailLead(null)} variant="outlined" size="small" disabled={emailLoading}>
            Cancel
          </Button>
          <Button type="submit" form="email-form" variant="contained" size="small" startIcon={<SendRounded />} disabled={emailLoading}>
            {emailLoading ? "Sending…" : "Send"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Remove Lead"
        message="Permanently delete this founder lead and their test results? This cannot be undone."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}