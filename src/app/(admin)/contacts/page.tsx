"use client";
import { useState, useCallback } from "react";
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  Divider,
  Avatar,
  Skeleton,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  VisibilityRounded,
  DeleteRounded,
  ReplyRounded,
  MarkEmailReadRounded,
  MailOutlineRounded,
  CheckCircleOutlineRounded,
  HourglassEmptyRounded,
  InboxRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import StatusChip from "@/components/ui/StatusChip";
import SearchBar from "@/components/ui/SearchBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";
import { alpha } from "@mui/material/styles";

dayjs.extend(relativeTime);

const GOLD = "#C9A84C";
const ROWS_PER_PAGE = 25;

const STATUS_OPTIONS = ["new", "in_progress", "resolved", "closed"] as const;
type ContactStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<ContactStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

// ── Types (snake_case to match Go API) ────────────────────────────────────────
interface ContactReply {
  id: number;
  message: string;
  sent_by: string;
  created_at: string;
}

interface Contact {
  id: number;              // API returns number
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactStatus;
  replies?: ContactReply[];
  created_at: string;      // snake_case
  updated_at: string;
}

interface PaginatedResponse {
  success: boolean;
  data: Contact[] | null;  // API returns null when empty
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface AnalyticsData {
  data: {
    total?: number;
    pending?: number;
    resolved?: number;
    avg_response_time?: string;
    by_status?: Array<{ status: string; count: number }>;
    monthly?: Array<{ month: string; count: number }>;
  };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, textAlign: "center", border: `1px solid ${alpha(color, 0.2)}`, background: `linear-gradient(135deg, ${alpha(color, 0.07)}, transparent)` }}>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 1, color, opacity: 0.7 }}>{icon}</Box>
      <Typography sx={{ fontSize: "1.8rem", fontFamily: '"DM Serif Display", serif', color, lineHeight: 1, mb: 0.5 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
    </Paper>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data, isLoading, mutate } = useSWR<PaginatedResponse>(
    `/admin/contacts?page=${page + 1}&limit=${rowsPerPage}` +
      (statusFilter ? `&status=${statusFilter}` : "") +
      (search ? `&search=${encodeURIComponent(search)}` : ""),
  );

  const { data: analyticsData } = useSWR<AnalyticsData>(
    tab === 1 ? "/admin/contacts/analytics" : null,
  );

  // null-safe: API returns null when no records
  const contacts: Contact[] = data?.data ?? [];
  const total: number = data?.pagination?.total ?? 0;

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleStatusChange = async (id: number, status: ContactStatus) => {
    setStatusLoading(true);
    try {
      await api.put(`/admin/contacts/${id}`, { status });
      enqueueSnackbar("Status updated", { variant: "success" });
      if (selectedContact?.id === id) {
        setSelectedContact((prev) => (prev ? { ...prev, status } : null));
      }
      await mutate();
    } catch {
      enqueueSnackbar("Failed to update status", { variant: "error" });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedContact || !replyMessage.trim()) {
      enqueueSnackbar("Reply message cannot be empty", { variant: "warning" });
      return;
    }
    setReplyLoading(true);
    try {
      await api.post(`/admin/contacts/${selectedContact.id}/reply`, {
        message: replyMessage,
      });
      enqueueSnackbar("Reply sent successfully", { variant: "success" });
      setReplyOpen(false);
      setReplyMessage("");
      if (selectedContact.status === "new") {
        await handleStatusChange(selectedContact.id, "in_progress");
      }
      await mutate();
    } catch {
      enqueueSnackbar("Failed to send reply", { variant: "error" });
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/contacts/${deleteId}`);
      enqueueSnackbar("Contact deleted", { variant: "success" });
      if (selectedContact?.id === deleteId) setSelectedContact(null);
      setDeleteId(null);
      await mutate();
    } catch {
      enqueueSnackbar("Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────────
  const columns: Column<Contact>[] = [
    {
      key: "name",
      label: "Contact",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: "0.78rem", fontWeight: 700, background: `linear-gradient(135deg, ${alpha(GOLD, 0.3)}, ${alpha(GOLD, 0.1)})`, color: GOLD, border: `1px solid ${alpha(GOLD, 0.2)}` }}>
            {row.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.3 }}>
              {row.name}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <Typography sx={{ fontSize: "0.85rem", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.subject}
        </Typography>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "created_at",            // ← was createdAt
      label: "Received",
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
            {dayjs(row.created_at).format("MMM D, YYYY")}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
            {dayjs(row.created_at).fromNow()}
          </Typography>
        </Box>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          <Tooltip title="View & Reply">
            <IconButton size="small" onClick={() => setSelectedContact(row)} sx={{ "&:hover": { color: GOLD } }}>
              <VisibilityRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {row.status === "new" && (
            <Tooltip title="Mark In Progress">
              <IconButton size="small" onClick={() => handleStatusChange(row.id, "in_progress")} sx={{ "&:hover": { color: "#4A8FD4" } }}>
                <MarkEmailReadRounded sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleteId(row.id)} sx={{ "&:hover": { color: "#E05C5C" } }}>
              <DeleteRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // ── Analytics helpers ─────────────────────────────────────────────────────────
  const analyticsStatus = analyticsData?.data?.by_status ?? [];   // ← was byStatus
  const analyticsMonthly = analyticsData?.data?.monthly ?? [];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Contact Management"
      subtitle={isLoading ? "Loading…" : `${total.toLocaleString()} submission${total !== 1 ? "s" : ""}`}
    >
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Tab label="All Contacts" />
          <Tab label="Analytics" />
        </Tabs>
      </Paper>

      {/* ── Tab 0: Table ── */}
      {tab === 0 && (
        <>
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <SearchBar
              placeholder="Search by name or email…"
              onSearch={handleSearch}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                sx={{ borderRadius: 3 }}
              >
                <MenuItem value="">All</MenuItem>
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <DataTable
            columns={columns}
            rows={contacts}
            loading={isLoading}
            page={page}
            rowsPerPage={rowsPerPage}
            total={total}
            onPageChange={setPage}
            onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(0); }}
            getRowId={(r) => String(r.id)}
            emptyMessage="No contacts found"
          />
        </>
      )}

      {/* ── Tab 1: Analytics ── */}
      {tab === 1 && (
        <Grid container spacing={2.5}>
          {/* Stat cards */}
          {[
            { label: "Total Received",    value: analyticsData?.data?.total ?? "—",                color: GOLD,       icon: <InboxRounded /> },
            { label: "Pending (New)",     value: analyticsData?.data?.pending ?? "—",              color: "#E8A838",  icon: <HourglassEmptyRounded /> },
            { label: "Resolved",          value: analyticsData?.data?.resolved ?? "—",             color: "#4CAF82",  icon: <CheckCircleOutlineRounded /> },
            { label: "Avg. Response Time",value: analyticsData?.data?.avg_response_time ?? "—",   color: "#4A8FD4",  icon: <MailOutlineRounded /> },
          ].map((s, i) => (
            <Grid size={{ xs: 6, md: 3 }} key={s.label}>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <StatCard {...s} />
              </motion.div>
            </Grid>
          ))}

          {/* By status chart */}
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5, fontSize: "1rem" }}>Contacts by Status</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", mb: 3 }}>Current breakdown</Typography>
                {analyticsData ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analyticsStatus}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                      <XAxis dataKey="status" tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.replace("_", " ")} />
                      <YAxis tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RTooltip contentStyle={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={52} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
                )}
              </Paper>
            </motion.div>
          </Grid>

          {/* Monthly trend chart */}
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5, fontSize: "1rem" }}>Monthly Volume</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", mb: 3 }}>Submissions over time</Typography>
                {analyticsData ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analyticsMonthly}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                      <XAxis dataKey="month" tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RTooltip contentStyle={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="count" fill="#4A8FD4" radius={[4, 4, 0, 0]} maxBarSize={52} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
                )}
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      )}

      {/* ── Contact Detail Dialog ── */}
      <Dialog open={!!selectedContact} onClose={() => setSelectedContact(null)} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: "85vh" } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, fontSize: "0.85rem", fontWeight: 700, background: `linear-gradient(135deg, ${alpha(GOLD, 0.3)}, ${alpha(GOLD, 0.1)})`, color: GOLD }}>
                {selectedContact?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>{selectedContact?.name}</Typography>
                <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{selectedContact?.email}</Typography>
              </Box>
            </Box>
            {selectedContact && <StatusChip status={selectedContact.status} />}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
          {selectedContact && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {/* Meta */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", mb: 0.5 }}>Phone</Typography>
                  <Typography sx={{ fontSize: "0.875rem" }}>{selectedContact.phone ?? "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", mb: 0.5 }}>Received</Typography>
                  <Typography sx={{ fontSize: "0.875rem" }}>
                    {dayjs(selectedContact.created_at).format("MMM D, YYYY [at] HH:mm")}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", mb: 0.5 }}>Time Ago</Typography>
                  <Typography sx={{ fontSize: "0.875rem" }}>{dayjs(selectedContact.created_at).fromNow()}</Typography>
                </Grid>
              </Grid>

              {/* Subject */}
              <Box>
                <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", mb: 0.5 }}>Subject</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: "0.95rem" }}>{selectedContact.subject}</Typography>
              </Box>

              {/* Message */}
              <Box sx={{ p: 2.5, borderRadius: 2.5, background: alpha("#fff", 0.025), border: "1px solid rgba(255,255,255,0.06)" }}>
                <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", mb: 1 }}>Message</Typography>
                <Typography sx={{ lineHeight: 1.8, fontSize: "0.9rem", color: "rgba(240,237,232,0.85)", whiteSpace: "pre-wrap" }}>
                  {selectedContact.message}
                </Typography>
              </Box>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

              {/* Status chips */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mr: 0.5 }}>Update status:</Typography>
                {STATUS_OPTIONS.map((s) => (
                  <Chip
                    key={s}
                    label={STATUS_LABELS[s]}
                    size="small"
                    onClick={() => handleStatusChange(selectedContact.id, s)}
                    disabled={statusLoading || selectedContact.status === s}
                    sx={{
                      cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, transition: "all 0.2s",
                      background: selectedContact.status === s ? alpha(GOLD, 0.2) : alpha("#fff", 0.05),
                      color: selectedContact.status === s ? GOLD : "text.secondary",
                      border: `1px solid ${selectedContact.status === s ? alpha(GOLD, 0.4) : "rgba(255,255,255,0.08)"}`,
                      "&:hover": { background: alpha(GOLD, 0.12), color: GOLD },
                    }}
                  />
                ))}
              </Box>

              {/* Reply history */}
              {(selectedContact.replies?.length ?? 0) > 0 && (
                <Box>
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, mb: 1.5, color: "text.secondary", letterSpacing: "0.04em" }}>
                    Reply History ({selectedContact.replies!.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {selectedContact.replies!.map((r) => (
                      <Box key={r.id} sx={{ p: 2, borderRadius: 2, background: alpha(GOLD, 0.05), border: `1px solid ${alpha(GOLD, 0.12)}` }}>
                        <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                          {r.message}
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 0.75 }}>
                          Sent by{" "}
                          <strong style={{ color: alpha(GOLD, 0.8) }}>{r.sent_by}</strong>
                          {" · "}
                          {dayjs(r.created_at).format("MMM D, YYYY [at] HH:mm")}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteId(selectedContact?.id ?? null)} variant="outlined" size="small" color="error" sx={{ borderRadius: 2, mr: "auto" }}>
            Delete
          </Button>
          <Button onClick={() => setSelectedContact(null)} variant="outlined" size="small" sx={{ borderRadius: 2 }}>
            Close
          </Button>
          <Button variant="contained" size="small" startIcon={<ReplyRounded sx={{ fontSize: 16 }} />} onClick={() => setReplyOpen(true)} sx={{ borderRadius: 2 }}>
            Reply
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reply Dialog ── */}
      <Dialog open={replyOpen} onClose={() => !replyLoading && setReplyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Reply to {selectedContact?.name}
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.25 }}>
            {selectedContact?.email}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={5}
            label="Your Reply"
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Write your reply here…"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setReplyOpen(false); setReplyMessage(""); }} variant="outlined" size="small" sx={{ borderRadius: 2 }} disabled={replyLoading}>
            Cancel
          </Button>
          <Button onClick={handleReply} variant="contained" size="small" disabled={replyLoading || !replyMessage.trim()} startIcon={<ReplyRounded sx={{ fontSize: 16 }} />} sx={{ borderRadius: 2 }}>
            {replyLoading ? "Sending…" : "Send Reply"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Contact"
        message="This will permanently delete the contact submission and all its replies. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}