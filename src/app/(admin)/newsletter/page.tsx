"use client";
import { useState, useCallback } from "react";
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Typography, Paper, Tabs, Tab, Chip, Skeleton,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  AddRounded, EditRounded, DeleteRounded, SendRounded, PeopleRounded,
  DownloadRounded, FileDownloadRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm, Controller } from "react-hook-form";
import dayjs from "dayjs";
import { alpha } from "@mui/material/styles";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import StatusChip from "@/components/ui/StatusChip";
import SearchBar from "@/components/ui/SearchBar";
import RichEditor from "@/components/editor/RichEditor";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";

const GOLD = "#C9A84C";

// ── Types (snake_case to match API) ───────────────────────────────────────────
interface NewsletterSubscriber {
  id: number;               // API returns number
  email: string;
  name: string;
  status: string;
  source: string;
  ip_address: string;
  subscribed_at: string;    // snake_case
}

interface Newsletter {
  id: number;
  subject: string;
  content?: string;
  status: "draft" | "scheduled" | "sent";
  recipient_count?: number;
  open_rate?: number;
  created_at: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[] | null;
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface NewsletterFormValues {
  subject: string;
  content: string;
  status: "draft" | "scheduled";
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewsletterPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const [nlPage, setNlPage] = useState(0);
  const [subPage, setSubPage] = useState(0);
  const [subSearch, setSubSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editNL, setEditNL] = useState<Newsletter | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sendConfirm, setSendConfirm] = useState<number | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteSubId, setDeleteSubId] = useState<number | null>(null);
  const [deleteSubLoading, setDeleteSubLoading] = useState(false);

  // Hoisted at top level — never inside JSX
  const handleSubSearch = useCallback((v: string) => { setSubSearch(v); setSubPage(0); }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: nlData, isLoading: nlLoading, mutate: mutateNL } =
    useSWR<PaginatedResponse<Newsletter>>(
      `/admin/newsletter?page=${nlPage + 1}&limit=25`,
    );

  const { data: subData, isLoading: subLoading, mutate: mutateSub } =
    useSWR<PaginatedResponse<NewsletterSubscriber>>(
      `/admin/newsletter/subscribers?page=${subPage + 1}&limit=25` +
      (subSearch ? `&search=${encodeURIComponent(subSearch)}` : ""),
    );

  const newsletters: Newsletter[] = nlData?.data ?? [];
  const subscribers: NewsletterSubscriber[] = subData?.data ?? [];
  const nlTotal = nlData?.pagination?.total ?? 0;
  const subTotal = subData?.pagination?.total ?? 0;

  // ── Form ───────────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, control, reset,
    formState: { errors },
  } = useForm<NewsletterFormValues>({
    defaultValues: { subject: "", content: "", status: "draft" },
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    reset({ subject: "", content: "", status: "draft" });
    setEditNL(null);
    setFormOpen(true);
  }, [reset]);

  const openEdit = useCallback((nl: Newsletter) => {
    reset({
      subject: nl.subject,
      content: nl.content ?? "",
      status: nl.status === "sent" ? "draft" : nl.status,
    });
    setEditNL(nl);
    setFormOpen(true);
  }, [reset]);

  const onSubmit = async (formData: NewsletterFormValues) => {
    setSubmitLoading(true);
    try {
      if (editNL) {
        await api.put(`/admin/newsletter/${editNL.id}`, formData);
        enqueueSnackbar("Newsletter updated", { variant: "success" });
      } else {
        await api.post("/admin/newsletter", formData);
        enqueueSnackbar("Newsletter created", { variant: "success" });
      }
      await mutateNL();
      setFormOpen(false);
    } catch {
      enqueueSnackbar("Save failed", { variant: "error" });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSend = async () => {
    if (!sendConfirm) return;
    setSendLoading(true);
    try {
      await api.post(`/admin/newsletter/${sendConfirm}/send`);
      enqueueSnackbar("Newsletter sent!", { variant: "success" });
      await mutateNL();
      setSendConfirm(null);
    } catch {
      enqueueSnackbar("Send failed", { variant: "error" });
    } finally {
      setSendLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/newsletter/${deleteId}`);
      enqueueSnackbar("Deleted", { variant: "success" });
      setDeleteId(null);
      await mutateNL();
    } catch {
      enqueueSnackbar("Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteSub = async () => {
    if (!deleteSubId) return;
    setDeleteSubLoading(true);
    try {
      await api.delete(`/admin/newsletter/subscribers/${deleteSubId}`);
      enqueueSnackbar("Subscriber removed", { variant: "success" });
      setDeleteSubId(null);
      await mutateSub();
    } catch {
      enqueueSnackbar("Failed to remove subscriber", { variant: "error" });
    } finally {
      setDeleteSubLoading(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async (format: "xlsx" | "pdf") => {
    setExportLoading(true);
    try {
      const response = await api.get(`/admin/newsletter/export?format=${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `subscribers_${dayjs().format("YYYY-MM-DD")}.${format}`);
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
  const nlColumns: Column<Newsletter>[] = [
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "0.875rem" }}>{row.subject}</Typography>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "recipient_count",
      label: "Recipients",
      render: (row) => (
        <Typography sx={{ fontWeight: 600 }}>
          {row.recipient_count?.toLocaleString() ?? "—"}
        </Typography>
      ),
    },
    {
      key: "open_rate",
      label: "Open Rate",
      render: (row) =>
        row.open_rate !== undefined ? (
          <Typography sx={{ color: "#4CAF82", fontWeight: 600 }}>{row.open_rate}%</Typography>
        ) : (
          <Typography sx={{ color: "text.disabled" }}>—</Typography>
        ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => (
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
          {dayjs(row.created_at).format("MMM D, YYYY")}
        </Typography>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          {row.status === "draft" && (
            <Tooltip title="Send Now">
              <IconButton
                size="small"
                onClick={() => setSendConfirm(row.id)}
                sx={{ "&:hover": { color: "#4CAF82" } }}
              >
                <SendRounded sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
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

  const subColumns: Column<NewsletterSubscriber>[] = [
    {
      key: "email",
      label: "Email",
      render: (row) => (
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>{row.email}</Typography>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <Typography sx={{ fontSize: "0.85rem", color: row.name ? "text.primary" : "text.disabled" }}>
          {row.name || "—"}
        </Typography>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "source",
      label: "Source",
      render: (row) => (
        <Chip
          label={row.source.replace("_", " ")}
          size="small"
          sx={{ fontSize: "0.68rem", background: alpha(GOLD, 0.08), color: "text.secondary", textTransform: "capitalize" }}
        />
      ),
    },
    {
      key: "subscribed_at",         // snake_case
      label: "Subscribed",
      render: (row) => (
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
          {dayjs(row.subscribed_at).format("MMM D, YYYY")}
        </Typography>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (row) => (
        <Tooltip title="Remove subscriber">
          <IconButton
            size="small"
            onClick={() => setDeleteSubId(row.id)}
            sx={{ "&:hover": { color: "#E05C5C", background: alpha("#E05C5C", 0.08) } }}
          >
            <DeleteRounded sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Newsletter"
      subtitle="Manage campaigns and subscribers"
      actions={
        tab === 0 ? (
          <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate}>
            New Newsletter
          </Button>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              {subTotal.toLocaleString()} subscriber{subTotal !== 1 ? "s" : ""}
            </Typography>
            <Tooltip title="Export as Excel">
              <IconButton
                size="small"
                onClick={() => handleExport("xlsx")}
                disabled={exportLoading}
                sx={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 1.5, "&:hover": { color: "#4CAF82" } }}
              >
                <FileDownloadRounded sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export as PDF">
              <IconButton
                size="small"
                onClick={() => handleExport("pdf")}
                disabled={exportLoading}
                sx={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 1.5, "&:hover": { color: GOLD } }}
              >
                <DownloadRounded sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )
      }
    >
      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Tab label="Newsletters" />
          <Tab
            label="Subscribers"
            icon={<PeopleRounded sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab 0 — Newsletters */}
      {tab === 0 && (
        <DataTable
          columns={nlColumns}
          rows={newsletters}
          loading={nlLoading}
          page={nlPage}
          rowsPerPage={25}
          total={nlTotal}
          onPageChange={setNlPage}
          getRowId={(r) => String(r.id)}
          emptyMessage="No newsletters yet — create your first campaign"
        />
      )}

      {/* Tab 1 — Subscribers */}
      {tab === 1 && (
        <>
          <Box sx={{ mb: 3 }}>
            <SearchBar placeholder="Search subscribers…" onSearch={handleSubSearch} />
          </Box>
          {subLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
          ) : (
            <DataTable
              columns={subColumns}
              rows={subscribers}
              loading={false}
              page={subPage}
              rowsPerPage={25}
              total={subTotal}
              onPageChange={setSubPage}
              getRowId={(r) => String(r.id)}
              emptyMessage="No subscribers found"
            />
          )}
        </>
      )}

      {/* Create / Edit dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !submitLoading && setFormOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: "90vh" } } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editNL ? `Edit: ${editNL.subject}` : "Create Newsletter"}
        </DialogTitle>
        <DialogContent sx={{ overflow: "auto" }}>
          <Box
            component="form"
            id="nl-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 9 }}>
                <TextField
                  {...register("subject", { required: "Subject is required" })}
                  label="Subject *"
                  fullWidth
                  autoFocus
                  error={!!errors.subject}
                  helperText={errors.subject?.message}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Status">
                        <MenuItem value="draft">Draft</MenuItem>
                        <MenuItem value="scheduled">Scheduled</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1 }}>
                  Email Content
                </Typography>
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <RichEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Write your email content…"
                      minHeight={350}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)} variant="outlined" size="small" disabled={submitLoading}>
            Cancel
          </Button>
          <Button type="submit" form="nl-form" variant="contained" size="small" disabled={submitLoading}>
            {submitLoading ? "Saving…" : editNL ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send confirmation */}
      <ConfirmDialog
        open={!!sendConfirm}
        title="Send Newsletter"
        message="Send this newsletter to all active subscribers? This cannot be undone."
        confirmLabel="Send Now"
        loading={sendLoading}
        onConfirm={handleSend}
        onClose={() => !sendLoading && setSendConfirm(null)}
      />

      {/* Delete newsletter confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Newsletter"
        message="Delete this newsletter permanently?"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />

      {/* Delete subscriber confirmation */}
      <ConfirmDialog
        open={!!deleteSubId}
        title="Remove Subscriber"
        message="Permanently remove this subscriber? They will no longer receive newsletters."
        loading={deleteSubLoading}
        onConfirm={handleDeleteSub}
        onClose={() => !deleteSubLoading && setDeleteSubId(null)}
      />
    </PageWrapper>
  );
}