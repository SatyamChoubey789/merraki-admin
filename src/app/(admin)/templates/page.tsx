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
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  TrendingUpRounded,
  StarRounded,
  DownloadRounded,
  VisibilityRounded,
  GridViewRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm, Controller, Resolver, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

// ── Constants ──────────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const ROWS_PER_PAGE = 25;

// ── Types ─────────────────────────────────────────────────────────────────────
interface TemplateCategory {
  id: number;
  name: string;
  slug: string;
  color_hex: string;   // API field name
  icon_name: string;   // API field name
  is_active: boolean;
}

interface Template {
  id: number;
  slug: string;
  title: string;
  description: string;
  detailed_description: string;
  price_inr: number;
  category_id: number;
  category?: TemplateCategory;
  tags: string[] | null;
  status: "draft" | "active" | "inactive";
  is_featured: boolean;
  downloads_count: number;
  views_count: number;
  rating: number;
  rating_count: number;
  file_url: string;
  thumbnail_url?: string;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface CategoriesResponse {
  success: boolean;
  data: TemplateCategory[];
}

interface AnalyticsResponse {
  data: {
    topTemplates: Array<{ title: string; downloads: number }>;
  };
}

// ── Zod Schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z.string().optional(),
  description: z.string().min(5, "Description must be at least 5 characters"),
  detailed_description: z.string().optional(),
  price_inr: z.coerce.number().int("Must be a whole number").min(0, "Price must be 0 or more"),
  category_id: z.coerce.number().int().min(1, "Please select a category"),
  status: z.enum(["draft", "active", "inactive"]),
  is_featured: z.boolean().default(false),
  file_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  meta_title: z.string().max(70, "Keep under 70 characters").optional(),
  meta_description: z.string().max(160, "Keep under 160 characters").optional(),
  tags: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function formatCurrency(value: number): string {
  return `₹${(value / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ label, value, icon, color = GOLD }: StatCardProps) {
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
        <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.8 }}>
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2 }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { enqueueSnackbar } = useSnackbar();

  // UI state
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Data fetching
  const {
    data: templatesRes,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<Template>>(
    `/admin/templates?page=${page + 1}&limit=${ROWS_PER_PAGE}`,
  );

  const { data: analyticsRes } = useSWR<AnalyticsResponse>(
    tab === 1 ? "/admin/templates/analytics" : null,
  );

  const { data: categoriesRes } = useSWR<CategoriesResponse>("/admin/categories/templates");

  // Derived data
  const templates = templatesRes?.data ?? [];
  const total = templatesRes?.pagination?.total ?? 0;
  const categories = categoriesRes?.data ?? [];

  // Aggregate stats
  const totalDownloads = templates.reduce((sum, t) => sum + (t.downloads_count ?? 0), 0);
  const totalViews = templates.reduce((sum, t) => sum + (t.views_count ?? 0), 0);
  const featuredCount = templates.filter((t) => t.is_featured).length;

  // ── Form ────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      detailed_description: "",
      price_inr: 0,
      category_id: 0,
      status: "active",
      is_featured: false,
      file_url: "",
      meta_title: "",
      meta_description: "",
      tags: "",
    },
  });

  const watchedTitle = watch("title");

  const openCreate = useCallback(() => {
    reset({
      title: "",
      slug: "",
      description: "",
      detailed_description: "",
      price_inr: 0,
      category_id: 0,
      status: "active",
      is_featured: false,
      file_url: "",
      meta_title: "",
      meta_description: "",
      tags: "",
    });
    setEditTemplate(null);
    setFormOpen(true);
  }, [reset]);

  const openEdit = useCallback(
    (t: Template) => {
      reset({
        title: t.title,
        slug: t.slug,
        description: t.description,
        detailed_description: t.detailed_description ?? "",
        price_inr: t.price_inr,
        category_id: t.category_id,
        status: t.status,
        is_featured: t.is_featured,
        file_url: t.file_url ?? "",
        meta_title: t.meta_title ?? "",
        meta_description: t.meta_description ?? "",
        tags: t.tags?.join(", ") ?? "",
      });
      setEditTemplate(t);
      setFormOpen(true);
    },
    [reset],
  );

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    setSubmitLoading(true);
    try {
      const tagsArray = formData.tags
        ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const payload = {
        title: formData.title,
        slug: formData.slug?.trim() || toSlug(formData.title),
        description: formData.description,
        detailed_description: formData.detailed_description ?? "",
        price_inr: Number(formData.price_inr),
        category_id: Number(formData.category_id),
        status: formData.status,
        is_featured: formData.is_featured ?? false,
        file_url: formData.file_url ?? "",
        meta_title: formData.meta_title ?? "",
        meta_description: formData.meta_description ?? "",
        tags: tagsArray,
      };

      if (editTemplate) {
        await api.put(`/admin/templates/${editTemplate.id}`, payload);
        enqueueSnackbar("Template updated successfully", { variant: "success" });
      } else {
        await api.post("/admin/templates", payload);
        enqueueSnackbar("Template created successfully", { variant: "success" });
      }

      await mutate();
      setFormOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Save failed";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/templates/${deleteId}`);
      enqueueSnackbar("Template deleted", { variant: "success" });
      await mutate();
      setDeleteId(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Delete failed";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Table Columns ────────────────────────────────────────────────────────────
  const columns: Column<Template>[] = [
    {
      key: "title",
      label: "Template",
      render: (row) => {
        const cat = row.category ?? categories.find((c) => c.id === row.category_id);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {row.thumbnail_url ? (
              <Box
                component="img"
                src={row.thumbnail_url}
                alt={row.title}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  objectFit: "cover",
                  border: "1px solid rgba(255,255,255,0.08)",
                  flexShrink: 0,
                }}
              />
            ) : (
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
                  userSelect: "none",
                }}
              >
                {cat?.icon_name ?? "📄"}
              </Box>
            )}
            <Box minWidth={0}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 240,
                  }}
                >
                  {row.title}
                </Typography>
                {row.is_featured && (
                  <Tooltip title="Featured">
                    <StarRounded sx={{ fontSize: 13, color: GOLD, flexShrink: 0 }} />
                  </Tooltip>
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: "text.disabled",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 240,
                }}
              >
                /{row.slug}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      key: "category_id",
      label: "Category",
      render: (row) => {
        const cat = row.category ?? categories.find((c) => c.id === row.category_id);
        return cat ? (
          <Chip
            label={`${cat.icon_name} ${cat.name}`}
            size="small"
            sx={{
              background: alpha(cat.color_hex ?? GOLD, 0.12),
              color: cat.color_hex ?? GOLD,
              fontSize: "0.7rem",
              border: `1px solid ${alpha(cat.color_hex ?? GOLD, 0.25)}`,
              fontWeight: 500,
            }}
          />
        ) : (
          <Typography sx={{ fontSize: "0.75rem", color: "text.disabled" }}>—</Typography>
        );
      },
    },
    {
      key: "price_inr",
      label: "Price",
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: GOLD, fontSize: "0.875rem" }}>
          {row.price_inr === 0 ? (
            <Chip label="Free" size="small" sx={{ background: alpha("#4CAF50", 0.12), color: "#4CAF50", fontSize: "0.7rem", border: `1px solid ${alpha("#4CAF50", 0.25)}` }} />
          ) : (
            formatCurrency(row.price_inr)
          )}
        </Typography>
      ),
    },
    {
      key: "downloads_count",
      label: "Downloads",
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
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "created_at",
      label: "Added",
      render: (row) => (
        <Tooltip title={dayjs(row.created_at).format("MMM D, YYYY [at] h:mm A")}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
            {dayjs(row.created_at).format("MMM D, YYYY")}
          </Typography>
        </Tooltip>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          <Tooltip title="Edit template">
            <IconButton size="small" onClick={() => openEdit(row)} aria-label={`Edit ${row.title}`}>
              <EditRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete template">
            <IconButton
              size="small"
              onClick={() => setDeleteId(row.id)}
              aria-label={`Delete ${row.title}`}
              sx={{ "&:hover": { color: "#E05C5C", background: alpha("#E05C5C", 0.08) } }}
            >
              <DeleteRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Template Management"
      subtitle={isLoading ? "Loading…" : `${total.toLocaleString()} template${total !== 1 ? "s" : ""}`}
      actions={
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate}>
          Add Template
        </Button>
      }
    >
      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Total Templates"
            value={isLoading ? "—" : total.toLocaleString()}
            icon={<GridViewRounded />}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Total Downloads"
            value={isLoading ? "—" : totalDownloads.toLocaleString()}
            icon={<DownloadRounded />}
            color="#5C9BE0"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Total Views"
            value={isLoading ? "—" : totalViews.toLocaleString()}
            icon={<VisibilityRounded />}
            color="#7EC89A"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="Featured"
            value={isLoading ? "—" : featuredCount.toLocaleString()}
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

      {/* Templates Table */}
      {tab === 0 && (
        <DataTable
          columns={columns}
          rows={templates}
          loading={isLoading}
          page={page}
          rowsPerPage={ROWS_PER_PAGE}
          total={total}
          onPageChange={(newPage) => {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          getRowId={(r) => String(r.id)}
        />
      )}

      {/* Analytics Tab */}
      {tab === 1 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontSize: "1rem", fontWeight: 600 }}>
                Top Downloads
              </Typography>
              {analyticsRes ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={analyticsRes?.data?.topTemplates ?? []}
                    margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="title"
                      tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 12)}…` : v)}
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
                    <Bar dataKey="downloads" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={52} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={formOpen}
        onClose={() => !submitLoading && setFormOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: "90vh" } } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editTemplate ? `Edit: ${editTemplate.title}` : "Add New Template"}
        </DialogTitle>

        <DialogContent sx={{ overflow: "auto" }}>
          <Box
            component="form"
            id="tmpl-form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}
            noValidate
          >
            <Grid container spacing={2}>
              {/* Title */}
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  {...register("title", {
                    onChange: (e) => {
                      if (!editTemplate) {
                        setValue("slug", toSlug(e.target.value), { shouldDirty: true });
                      }
                    },
                  })}
                  label="Title *"
                  fullWidth
                  autoFocus
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
              </Grid>

              {/* Slug */}
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  {...register("slug")}
                  label="Slug"
                  fullWidth
                  placeholder="auto-generated"
                  helperText={
                    watchedTitle
                      ? `URL: /templates/${watch("slug") || toSlug(watchedTitle)}`
                      : "URL: /templates/{slug}"
                  }
                />
              </Grid>

              {/* Short Description */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("description")}
                  label="Short Description *"
                  fullWidth
                  multiline
                  rows={2}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              </Grid>

              {/* Detailed Description */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("detailed_description")}
                  label="Detailed Description"
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Shown on the template detail page"
                />
              </Grid>

              {/* Category */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small" error={!!errors.category_id}>
                  <InputLabel id="category-label">Category *</InputLabel>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} labelId="category-label" label="Category *">
                        {categories.length === 0 ? (
                          <MenuItem disabled value={0}>
                            No categories — create one first
                          </MenuItem>
                        ) : (
                          categories.map((cat) => (
                            <MenuItem key={cat.id} value={cat.id}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <span>{cat.icon_name}</span>
                                <span>{cat.name}</span>
                              </Box>
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    )}
                  />
                  {errors.category_id && (
                    <Typography sx={{ fontSize: "0.72rem", color: "error.main", mt: 0.5, ml: 1.75 }}>
                      {errors.category_id.message}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Price */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  {...register("price_inr")}
                  label="Price *"
                  type="number"
                  fullWidth
                  slotProps={{
                    htmlInput: { min: 0, step: 1 },
                    input: {
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    },
                  }}
                  error={!!errors.price_inr}
                  helperText={errors.price_inr?.message ?? "Set 0 for free"}
                />
              </Grid>

              {/* Status */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="status-label">Status</InputLabel>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} labelId="status-label" label="Status">
                        <MenuItem value="draft">Draft</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Featured */}
              <Grid size={{ xs: 12, sm: 2 }}>
                <Controller
                  name="is_featured"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value ?? false}
                          onChange={(e) => field.onChange(e.target.checked)}
                          sx={{
                            "& .MuiSwitch-thumb": { background: GOLD },
                            "& .Mui-checked + .MuiSwitch-track": { background: alpha(GOLD, 0.5) },
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <StarRounded sx={{ fontSize: 14, color: GOLD }} />
                          <Typography sx={{ fontSize: "0.8rem" }}>Featured</Typography>
                        </Box>
                      }
                      sx={{ mt: 0.5 }}
                    />
                  )}
                />
              </Grid>

              {/* File URL */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("file_url")}
                  label="Template File URL"
                  fullWidth
                  placeholder="https://storage.example.com/templates/file.pdf"
                  error={!!errors.file_url}
                  helperText={errors.file_url?.message ?? "Direct download link for this template"}
                />
              </Grid>

              {/* Tags */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("tags")}
                  label="Tags"
                  fullWidth
                  placeholder="resume, professional, clean"
                  helperText="Comma-separated — e.g. resume, ATS-friendly, modern"
                />
              </Grid>

              {/* SEO Section */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "text.disabled",
                    mt: 0.5,
                  }}
                >
                  SEO (Optional)
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  {...register("meta_title")}
                  label="Meta Title"
                  fullWidth
                  placeholder="Defaults to template title"
                  error={!!errors.meta_title}
                  helperText={errors.meta_title?.message ?? "Recommended: under 70 characters"}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  {...register("meta_description")}
                  label="Meta Description"
                  fullWidth
                  placeholder="Brief summary for search engines"
                  error={!!errors.meta_description}
                  helperText={errors.meta_description?.message ?? "Recommended: under 160 characters"}
                />
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
            disabled={submitLoading || (!isDirty && !!editTemplate)}
          >
            {submitLoading
              ? "Saving…"
              : editTemplate
                ? "Update Template"
                : "Create Template"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Template"
        message="This will permanently delete the template and cannot be undone. Are you sure?"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}