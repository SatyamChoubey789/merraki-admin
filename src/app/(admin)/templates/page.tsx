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
  Switch,
  FormControlLabel,
  Skeleton,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  TrendingUpRounded,
  DownloadRounded,
  VisibilityRounded,
  GridViewRounded,
  ExpandMoreRounded,
  UploadFileRounded,
  SearchRounded,
  StarRounded,
  NewReleasesRounded,
  EmojiEventsRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm, Controller } from "react-hook-form";
import dayjs from "dayjs";
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
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";
import { alpha } from "@mui/material/styles";

const GOLD = "#C9A84C";
const ROWS_PER_PAGE = 20;
interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  display_order: number;
}

interface Template {
  id: number;
  name: string; // Go uses "name" not "title"
  slug: string;
  tagline?: string;
  description: string;
  category_id?: number;
  category?: Category;
  price: number;
  sale_price?: number;
  is_on_sale: boolean;
  file_url?: string;
  file_size_mb?: number;
  file_format?: string;
  preview_url?: string;
  stock_quantity: number;
  is_unlimited_stock: boolean;
  status: "draft" | "active" | "archived";
  is_available: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  downloads_count: number;
  views_count: number;
  meta_title?: string;
  meta_description?: string;
  current_version: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// Handler response shape
interface TemplatesResponse {
  templates: Template[] | null;
  total: number;
  page: number;
  limit: number;
}

interface CategoriesResponse {
  categories: Category[] | null;
}

interface AnalyticsResponse {
  data?: {
    top_templates?: Array<{ name: string; downloads_count: number }>;
    total_downloads?: number;
    total_views?: number;
  } | null;
}

// ── Form type — maps directly to CreateTemplateRequest ────────────────────────
interface FormData {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category_id: number | "";
  price: number;
  sale_price?: number;
  is_on_sale: boolean;
  file_url: string;
  preview_url: string;
  file_format: string;
  stock_quantity: number;
  is_unlimited_stock: boolean;
  status: "draft" | "active" | "archived";
  is_available: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  meta_title: string;
  meta_description: string;
  current_version: string;
  tags: string; // comma-sep — sent via PUT /:id/tags after save
}

const DEFAULT_VALUES: FormData = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  category_id: "",
  price: 0,
  sale_price: 0,
  is_on_sale: false,
  file_url: "",
  preview_url: "",
  file_format: "",
  stock_quantity: 0,
  is_unlimited_stock: true,
  status: "draft",
  is_available: false,
  is_featured: false,
  is_bestseller: false,
  is_new: true,
  meta_title: "",
  meta_description: "",
  current_version: "1.0",
  tags: "",
};

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function formatINR(paise: number): string {
  return `$${paise.toLocaleString("en-IN")}`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color = GOLD,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        gap: 2,
        border: `1px solid ${alpha(color, 0.15)}`,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          background: alpha(color, 0.12),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          sx={{
            fontSize: "0.72rem",
            color: "text.disabled",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{ fontWeight: 700, fontSize: "1.2rem", lineHeight: 1.2 }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const {
    data: templatesRes,
    isLoading,
    mutate,
  } = useSWR<TemplatesResponse>(
    `/admin/templates?page=${page + 1}&limit=${ROWS_PER_PAGE}`,
  );

  const { data: categoriesRes } =
    useSWR<CategoriesResponse>("/admin/categories");

  const { data: analyticsRes, isLoading: analyticsLoading } =
    useSWR<AnalyticsResponse>(tab === 1 ? "/admin/templates/analytics" : null);

  const templates: Template[] = templatesRes?.templates ?? [];
  const total: number = templatesRes?.total ?? 0;
  const categories: Category[] = categoriesRes?.categories ?? [];

  const totalDownloads = templates.reduce(
    (s, t) => s + (t.downloads_count ?? 0),
    0,
  );
  const totalViews = templates.reduce((s, t) => s + (t.views_count ?? 0), 0);
  const featuredCount = templates.filter((t) => t.is_featured).length;

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: DEFAULT_VALUES });

  const watchedName = watch("name");
  const watchedSlug = watch("slug");
  const watchIsOnSale = watch("is_on_sale");
  const watchIsUnlimited = watch("is_unlimited_stock");

  const openCreate = useCallback(() => {
    reset(DEFAULT_VALUES);
    setEditTemplate(null);
    setFormOpen(true);
  }, [reset]);

  const openEdit = useCallback(
    (t: Template) => {
      reset({
        name: t.name,
        slug: t.slug,
        tagline: t.tagline ?? "",
        description: t.description,
        category_id: t.category_id ?? "",
        price: t.price,
        sale_price: t.sale_price ?? 0,
        is_on_sale: t.is_on_sale,
        file_url: t.file_url ?? "",
        preview_url: t.preview_url ?? "",
        file_format: t.file_format ?? "",
        stock_quantity: t.stock_quantity,
        is_unlimited_stock: t.is_unlimited_stock,
        status: t.status,
        is_available: t.is_available,
        is_featured: t.is_featured,
        is_bestseller: t.is_bestseller,
        is_new: t.is_new,
        meta_title: t.meta_title ?? "",
        meta_description: t.meta_description ?? "",
        current_version: t.current_version ?? "1.0",
        tags: "", // tags loaded separately if needed
      });
      setEditTemplate(t);
      setFormOpen(true);
    },
    [reset],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (formData: FormData) => {
    if (!formData.name.trim()) {
      enqueueSnackbar("Name is required", { variant: "warning" });
      return;
    }

    setSubmitLoading(true);
    try {
      const tagsArray = formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      // Payload matches Go CreateTemplateRequest exactly
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || toSlug(formData.name),
        tagline: formData.tagline || null,
        description: formData.description || null,
        category_id:
          formData.category_id !== "" ? Number(formData.category_id) : null,
        price: Number(formData.price),
        sale_price: formData.is_on_sale ? Number(formData.sale_price) : null,
        is_on_sale: formData.is_on_sale,
        file_url: formData.file_url || null,
        file_format: formData.file_format || null,
        preview_url: formData.preview_url || null,
        stock_quantity: Number(formData.stock_quantity),
        is_unlimited_stock: formData.is_unlimited_stock,
        status: formData.status,
        is_available: formData.is_available,
        is_featured: formData.is_featured,
        is_bestseller: formData.is_bestseller,
        is_new: formData.is_new,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        current_version: formData.current_version || "1.0",
      };

      let savedId: number;

      if (editTemplate) {
        await api.put(`/admin/templates/${editTemplate.id}`, payload);
        savedId = editTemplate.id;
        enqueueSnackbar("Template updated", { variant: "success" });
      } else {
        const res = await api.post<{ template: Template }>(
          "/admin/templates",
          payload,
        );
        savedId = res.data.template.id;
        enqueueSnackbar("Template created", { variant: "success" });
      }

      // Save tags separately via PUT /:id/tags
      if (tagsArray.length > 0 || editTemplate) {
        await api.put(`/admin/templates/${savedId}/tags`, { tags: tagsArray });
      }

      await mutate();
      setFormOpen(false);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Save failed", {
        variant: "error",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── File upload — POST /:id/upload-file (multipart) ───────────────────────
  const handleFileUpload = async (templateId: number, file: File) => {
    setUploadingFile(true);
    setUploadTarget(templateId);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/admin/templates/${templateId}/upload-file`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      enqueueSnackbar("File uploaded", { variant: "success" });
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Upload failed", {
        variant: "error",
      });
    } finally {
      setUploadingFile(false);
      setUploadTarget(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/templates/${deleteId}`);
      enqueueSnackbar("Template deleted", { variant: "success" });
      await mutate();
      setDeleteId(null);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Delete failed", {
        variant: "error",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: Column<Template>[] = [
    {
      key: "name",
      label: "Template",
      render: (row) => {
        const cat =
          row.category ?? categories.find((c) => c.id === row.category_id);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                background: alpha(GOLD, 0.1),
                border: `1px solid ${alpha(GOLD, 0.2)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "1.1rem",
              }}
            >
              📄
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  flexWrap: "nowrap",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: { xs: 140, sm: 220, md: 260 },
                  }}
                >
                  {row.name}
                </Typography>
                {row.is_featured && (
                  <Tooltip title="Featured">
                    <StarRounded
                      sx={{ fontSize: 13, color: GOLD, flexShrink: 0 }}
                    />
                  </Tooltip>
                )}
                {row.is_bestseller && (
                  <Tooltip title="Bestseller">
                    <EmojiEventsRounded
                      sx={{ fontSize: 13, color: "#E8A838", flexShrink: 0 }}
                    />
                  </Tooltip>
                )}
                {row.is_new && (
                  <Tooltip title="New">
                    <NewReleasesRounded
                      sx={{ fontSize: 13, color: "#4CAF82", flexShrink: 0 }}
                    />
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: "text.disabled",
                    fontFamily: "monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}
                >
                  /{row.slug}
                </Typography>
                {cat && (
                  <>
                    <Box
                      sx={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.2)",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: "text.secondary",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cat.name}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        );
      },
    },
    {
      key: "price_inr",
      label: "Price",
      render: (row) => (
        <Box>
          <Typography
            sx={{ fontWeight: 700, color: GOLD, fontSize: "0.875rem" }}
          >
            {row.price === 0 ? (
              <Chip
                label="Free"
                size="small"
                sx={{
                  background: alpha("#4CAF82", 0.12),
                  color: "#4CAF82",
                  fontSize: "0.68rem",
                }}
              />
            ) : (
              formatINR(row.price)
            )}
          </Typography>
          {row.is_on_sale && row.sale_price && (
            <Typography sx={{ fontSize: "0.7rem", color: "#4CAF82" }}>
              Sale: {formatINR(row.sale_price)}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "downloads_count",
      label: "Downloads",
      hideOnMobile: true,
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <DownloadRounded sx={{ fontSize: 13, color: "text.disabled" }} />
          <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
            {(row.downloads_count ?? 0).toLocaleString()}
          </Typography>
        </Box>
      ),
    },
    {
      key: "views_count",
      label: "Views",
      hideOnMobile: true,
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <VisibilityRounded sx={{ fontSize: 13, color: "text.disabled" }} />
          <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            {(row.views_count ?? 0).toLocaleString()}
          </Typography>
        </Box>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <StatusChip status={row.status} />
          {!row.is_available && (
            <Typography sx={{ fontSize: "0.65rem", color: "text.disabled" }}>
              Unavailable
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "file_url",
      label: "File",
      hideOnMobile: true,
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {row.file_url ? (
            <Chip
              label={row.file_format ?? "File"}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.67rem",
                background: alpha("#4CAF82", 0.1),
                color: "#4CAF82",
              }}
            />
          ) : (
            <Box component="label" sx={{ cursor: "pointer" }}>
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(row.id, f);
                }}
              />
              <Chip
                label={
                  uploadingFile && uploadTarget === row.id
                    ? "Uploading…"
                    : "Upload"
                }
                size="small"
                icon={<UploadFileRounded sx={{ fontSize: 12 }} />}
                sx={{
                  height: 20,
                  fontSize: "0.67rem",
                  background: alpha(GOLD, 0.08),
                  color: GOLD,
                  cursor: "pointer",
                  "&:hover": { background: alpha(GOLD, 0.16) },
                }}
              />
            </Box>
          )}
        </Box>
      ),
    },
    {
      key: "created_at",
      label: "Added",
      hideOnMobile: true,
      render: (row) => (
        <Typography
          sx={{
            fontSize: "0.82rem",
            color: "text.secondary",
            whiteSpace: "nowrap",
          }}
        >
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
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => setDeleteId(row.id)}
              sx={{ "&:hover": { color: "#E05C5C" } }}
            >
              <DeleteRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const topTemplates = Array.isArray(analyticsRes?.data?.top_templates)
    ? analyticsRes!.data!.top_templates!
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Templates"
      subtitle={
        isLoading
          ? "Loading…"
          : `${total.toLocaleString()} template${total !== 1 ? "s" : ""}`
      }
      actions={
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={openCreate}
          size="small"
        >
          Add Template
        </Button>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Total"
            value={isLoading ? "—" : total}
            icon={<GridViewRounded />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Downloads"
            value={isLoading ? "—" : totalDownloads.toLocaleString()}
            icon={<DownloadRounded />}
            color="#5C9BE0"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Views"
            value={isLoading ? "—" : totalViews.toLocaleString()}
            icon={<VisibilityRounded />}
            color="#7EC89A"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Featured"
            value={isLoading ? "—" : featuredCount}
            icon={<StarRounded />}
            color={GOLD}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Tab label="All Templates" />
          <Tab
            label="Analytics"
            icon={<TrendingUpRounded sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Table */}
      {tab === 0 && (
        <DataTable
          columns={columns}
          rows={templates}
          loading={isLoading}
          page={page}
          rowsPerPage={ROWS_PER_PAGE}
          total={total}
          onPageChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          getRowId={(r) => String(r.id)}
          emptyMessage="No templates yet — add your first one"
        />
      )}

      {/* Analytics */}
      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 3, fontSize: "1rem" }}>
            Top Downloads
          </Typography>
          {analyticsLoading ? (
            <Skeleton
              variant="rectangular"
              height={280}
              sx={{ borderRadius: 2 }}
            />
          ) : topTemplates.length === 0 ? (
            <Box
              sx={{
                height: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ color: "text.disabled" }}>
                No analytics data yet
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topTemplates}
                margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.04)"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) =>
                    v.length > 14 ? `${v.slice(0, 12)}…` : v
                  }
                />
                <YAxis
                  tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <RTooltip
                  contentStyle={{
                    background: "#1A2535",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar
                  dataKey="downloads_count"
                  fill={GOLD}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={52}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>
      )}

      {/* ── Create / Edit dialog ── */}
      <Dialog
        open={formOpen}
        onClose={() => !submitLoading && setFormOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: "92vh", borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          {editTemplate ? `Edit: ${editTemplate.name}` : "New Template"}
        </DialogTitle>

        <DialogContent sx={{ overflowY: "auto" }}>
          <Box
            component="form"
            id="tmpl-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 0, pt: 0.5 }}
          >
            <Grid container spacing={2}>
              {/* ── Basic info ── */}
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  {...register("name", { required: "Name is required" })}
                  label="Template Name *"
                  fullWidth
                  autoFocus
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  onChange={(e) => {
                    setValue("name", e.target.value);
                    if (!editTemplate)
                      setValue("slug", toSlug(e.target.value), {
                        shouldDirty: true,
                      });
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  {...register("slug")}
                  label="Slug"
                  fullWidth
                  placeholder="auto-generated"
                  helperText={`/templates/${watchedSlug || (watchedName ? toSlug(watchedName) : "…")}`}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("tagline")}
                  label="Tagline (optional)"
                  fullWidth
                  placeholder="One-line description shown in listings"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("description", {
                    required: "Description is required",
                  })}
                  label="Description *"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              </Grid>

              {/* ── Category + Status ── */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        value={field.value ?? ""}
                        label="Category"
                        onChange={(e) =>
                          field.onChange((e.target.value as any) || "")
                        }
                      >
                        <MenuItem value="">None</MenuItem>
                        {categories.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 6, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} label="Status">
                        <MenuItem value="draft">Draft</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="archived">Archived</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  {...register("current_version")}
                  label="Version"
                  fullWidth
                  size="small"
                  placeholder="1.0"
                />
              </Grid>

              {/* ── Pricing ── */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "text.disabled",
                    mt: 1,
                  }}
                >
                  Pricing
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  {...register("price")}
                  label="Price USD *"
                  type="number"
                  fullWidth
                  slotProps={{
                    htmlInput: { min: 0, step: 1 },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    },
                  }}
                  helperText="0 = free"
                />
              </Grid>

              

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="is_on_sale"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          size="small"
                          sx={{
                            "& .Mui-checked": { color: "#4CAF82" },
                            "& .Mui-checked + .MuiSwitch-track": {
                              background: alpha("#4CAF82", 0.4),
                            },
                          }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: "0.85rem" }}>
                          On Sale
                        </Typography>
                      }
                    />
                  )}
                />
              </Grid>

              {/* ── File ── */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "text.disabled",
                    mt: 1,
                  }}
                >
                  Files
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("file_url")}
                  label="File URL"
                  fullWidth
                  size="small"
                  placeholder="Cloudinary URL or external link"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  {...register("file_format")}
                  label="Format"
                  fullWidth
                  size="small"
                  placeholder="XLSX, PDF…"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("preview_url")}
                  label="Preview URL"
                  fullWidth
                  size="small"
                  placeholder="Preview image URL"
                />
              </Grid>

              {/* ── Flags ── */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "text.disabled",
                    mt: 1,
                  }}
                >
                  Flags
                </Typography>
              </Grid>
              {(
                [
                  "is_available",
                  "is_featured",
                  "is_bestseller",
                  "is_new",
                  "is_unlimited_stock",
                ] as const
              ).map((flagField) => (
                <Grid size={{ xs: 6, sm: 4 }} key={flagField}>
                  <Controller
                    name={flagField}
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.value ?? false}
                            onChange={(e) => field.onChange(e.target.checked)}
                            size="small"
                            sx={{
                              "& .Mui-checked": { color: GOLD },
                              "& .Mui-checked + .MuiSwitch-track": {
                                background: alpha(GOLD, 0.4),
                              },
                            }}
                          />
                        }
                        label={
                          <Typography
                            sx={{
                              fontSize: "0.82rem",
                              textTransform: "capitalize",
                            }}
                          >
                            {flagField.replace("is_", "").replace(/_/g, " ")}
                          </Typography>
                        }
                      />
                    )}
                  />
                </Grid>
              ))}

              {!watchIsUnlimited && (
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    {...register("stock_quantity")}
                    label="Stock Qty"
                    type="number"
                    fullWidth
                    size="small"
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </Grid>
              )}

              {/* ── Tags ── */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("tags")}
                  label="Tags"
                  fullWidth
                  size="small"
                  placeholder="resume, professional, ATS-friendly"
                  helperText="Comma-separated — saved via tags API"
                />
              </Grid>

              {/* ── SEO ── */}
              <Grid size={{ xs: 12 }}>
                <Accordion
                  sx={{
                    background: "transparent",
                    boxShadow: "none",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px !important",
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SearchRounded
                        sx={{ fontSize: 16, color: "text.secondary" }}
                      />
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        SEO (optional)
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <TextField
                      {...register("meta_title")}
                      label="Meta Title"
                      fullWidth
                      size="small"
                      helperText={`${(watch("meta_title") ?? "").length}/70`}
                    />
                    <TextField
                      {...register("meta_description")}
                      label="Meta Description"
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      helperText={`${(watch("meta_description") ?? "").length}/160`}
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setFormOpen(false)}
            variant="outlined"
            size="small"
            disabled={submitLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="tmpl-form"
            variant="contained"
            size="small"
            disabled={submitLoading}
          >
            {submitLoading
              ? "Saving…"
              : editTemplate
                ? "Update Template"
                : "Create Template"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Template"
        message="Permanently delete this template? This cannot be undone."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}
