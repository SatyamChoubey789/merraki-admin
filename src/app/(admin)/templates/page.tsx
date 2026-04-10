"use client";
import { useState, useCallback, useRef } from "react";
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
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  CircularProgress,
  Avatar,
  Stack,
  LinearProgress,
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
  ImageRounded,
  FeaturedPlayListRounded,
  LocalOfferRounded,
  CloseRounded,
  OpenInNewRounded,
  CheckCircleRounded,
  ArchiveRounded,
  PublishRounded,
  DraftsTwoTone,
  AddPhotoAlternateRounded,
  DeleteOutlineRounded,
  LayersRounded,
  InfoOutlined,
  FilterListRounded,
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

// ─── Theme constants ───────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const GREEN = "#4CAF82";
const BLUE = "#5C9BE0";
const RED = "#E05C5C";

const ROWS_PER_PAGE = 20;

// ─── Domain types (aligned with Go domain.Template) ────────────────────────────
interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  display_order: number;
}

interface TemplateImage {
  id: number;
  template_id: number;
  url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
}

interface TemplateFeature {
  id: number;
  template_id: number;
  title: string;
  description?: string;
  display_order: number;
}

/** Mirrors domain.Template JSON tags exactly */
interface Template {
  id: number;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  category_id?: number;
  category?: Category;
  // ── price is stored as USD cents in DB ──
  price_usd_cents: number;
  sale_price_usd_cents?: number;
  file_url?: string;
  file_size_mb?: number;
  file_format?: string;
  preview_url?: string;
  status: "draft" | "active" | "archived";
  downloads_count: number;
  views_count: number;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  current_version: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  // Relations (from TemplateWithRelations)
  images?: TemplateImage[];
  features?: TemplateFeature[];
  tags?: string[];
}

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

// ─── Form type — matches CreateTemplateRequest exactly ─────────────────────────
interface FormData {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category_id: number | "";
  /** UI: USD dollars — converted to cents before sending */
  price_usd: number;
  /** UI: USD dollars — converted to cents before sending */
  sale_price_usd: number;
  has_sale_price: boolean;
  file_url: string;
  preview_url: string;
  file_format: string;
  status: "draft" | "active" | "archived";
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  current_version: string;
  tags: string;
}

const DEFAULT_VALUES: FormData = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  category_id: "",
  price_usd: 0,
  sale_price_usd: 0,
  has_sale_price: false,
  file_url: "",
  preview_url: "",
  file_format: "",
  status: "draft",
  is_featured: false,
  is_bestseller: false,
  is_new: true,
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  current_version: "1.0",
  tags: "",
};

function toSlug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim()
    .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

/**
 * Proxies any external image URL through images.weserv.nl so that
 * Unsplash, Google Drive thumbnails, Dropbox previews, etc. all load
 * without CORS / hot-linking blocks.
 * Local blob: and data: URLs are passed through unchanged.
 */
function proxyImg(url: string): string {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  // Already a weserv proxy — don't double-wrap
  if (url.includes("wsrv.nl") || url.includes("images.weserv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&output=webp`;
}

/**
 * PreviewImagePicker — lets the user either:
 *   1. Paste any URL (Unsplash, Drive, CDN, etc.) — shown with CORS proxy
 *   2. Pick a local file — converted to a data-URL and stored as preview_url
 *      (caller should upload the file and swap in the CDN URL later)
 */
function PreviewImagePicker({
  value,
  onChange,
  onFileSelect,
  uploading,
}: {
  value: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: File) => void;
  uploading?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  const proxied = proxyImg(value);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {/* URL input with inline upload button */}
      <TextField
        value={value}
        onChange={(e) => { onChange(e.target.value); setImgError(false); }}
        label="Preview Image URL"
        fullWidth
        size="small"
        placeholder="https://images.unsplash.com/… or any image link"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Upload image file instead">
                  <IconButton
                    size="small"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    sx={{ color: GOLD }}
                  >
                    {uploading
                      ? <CircularProgress size={14} sx={{ color: GOLD }} />
                      : <UploadFileRounded sx={{ fontSize: 17 }} />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          // Show instant local preview via blob URL
          const blobUrl = URL.createObjectURL(file);
          onChange(blobUrl);
          setImgError(false);
          onFileSelect?.(file);
          // Reset so same file can be re-selected
          e.target.value = "";
        }}
      />

      {/* Live preview */}
      {value && (
        <Box sx={{
          position: "relative",
          width: "100%",
          height: 160,
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${imgError ? alpha(RED, 0.4) : alpha(GOLD, 0.2)}`,
          background: alpha("#000", 0.2),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {!imgError ? (
            <img
              src={proxied}
              alt="preview"
              onError={() => setImgError(true)}
              onLoad={() => setImgError(false)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Box sx={{ textAlign: "center", px: 2 }}>
              <ImageRounded sx={{ fontSize: 28, color: alpha(RED, 0.5), mb: 0.5 }} />
              <Typography sx={{ fontSize: "0.72rem", color: alpha(RED, 0.8) }}>
                Can't load this URL
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: "text.disabled", mt: 0.25 }}>
                Try uploading the file directly ↑
              </Typography>
            </Box>
          )}

          {/* Clear button */}
          <IconButton
            size="small"
            onClick={() => { onChange(""); setImgError(false); }}
            sx={{
              position: "absolute", top: 4, right: 4,
              background: alpha("#000", 0.55),
              "&:hover": { background: alpha(RED, 0.7) },
            }}
          >
            <CloseRounded sx={{ fontSize: 13, color: "#fff" }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

function centsToUSD(cents: number) { return cents / 100; }
function usdToCents(usd: number) { return Math.round(usd * 100); }
function fmtUSD(cents: number) {
  if (cents === 0) return "Free";
  return `$${centsToUSD(cents).toFixed(2)}`;
}

// ─── Mini components ────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = GOLD, loading }: {
  label: string; value: string | number; icon: React.ReactNode;
  color?: string; loading?: boolean;
}) {
  return (
    <Paper sx={{
      p: 2.5, borderRadius: 3, display: "flex", alignItems: "center", gap: 2,
      border: `1px solid ${alpha(color, 0.18)}`,
      background: `linear-gradient(135deg, ${alpha(color, 0.04)}, transparent)`,
      transition: "border-color 0.2s",
      "&:hover": { borderColor: alpha(color, 0.35) },
    }}>
      <Box sx={{
        width: 46, height: 46, borderRadius: 2.5,
        background: alpha(color, 0.13),
        display: "flex", alignItems: "center", justifyContent: "center",
        color, flexShrink: 0,
      }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </Typography>
        {loading
          ? <Skeleton width={60} height={28} />
          : <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2 }}>{value}</Typography>}
      </Box>
    </Paper>
  );
}

function StatusBadge({ status }: { status: Template["status"] }) {
  const map = {
    active: { color: GREEN, label: "Active", icon: <CheckCircleRounded sx={{ fontSize: 11 }} /> },
    draft: { color: "#8B8FA8", label: "Draft", icon: <DraftsTwoTone sx={{ fontSize: 11 }} /> },
    archived: { color: "#6B7280", label: "Archived", icon: <ArchiveRounded sx={{ fontSize: 11 }} /> },
  };
  const { color, label, icon } = map[status];
  return (
    <Chip
      size="small"
      icon={icon as any}
      label={label}
      sx={{
        height: 22, fontSize: "0.68rem", fontWeight: 600,
        background: alpha(color, 0.13), color,
        border: `1px solid ${alpha(color, 0.25)}`,
        "& .MuiChip-icon": { color, ml: 0.5 },
      }}
    />
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Detail drawer
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // File upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  // Images sub-panel (inside detail drawer)
  const [imageLoading, setImageLoading] = useState(false);
  const [newImageURL, setNewImageURL] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");

  // Features sub-panel
  const [featureLoading, setFeatureLoading] = useState(false);
  const [newFeatureTitle, setNewFeatureTitle] = useState("");
  const [newFeatureDesc, setNewFeatureDesc] = useState("");

  // Status quick-patch
  const [patchingId, setPatchingId] = useState<number | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: templatesRes, isLoading, mutate } =
    useSWR<TemplatesResponse>(`/admin/templates?page=${page + 1}&limit=${ROWS_PER_PAGE}`);

  const { data: categoriesRes } = useSWR<CategoriesResponse>("/admin/categories");

  // Load detail template with full relations when drawer opens
  const { data: detailRes, mutate: mutateDetail } = useSWR<{ template: Template }>(
    detailTemplate ? `/admin/templates/${detailTemplate.id}` : null
  );

  const { data: analyticsRes, isLoading: analyticsLoading } =
    useSWR<AnalyticsResponse>(tab === 1 ? "/admin/templates/analytics" : null);

  const templates: Template[] = templatesRes?.templates ?? [];
  const total = templatesRes?.total ?? 0;
  const categories: Category[] = categoriesRes?.categories ?? [];
  const fullDetail = detailRes?.template ?? detailTemplate;

  const totalDownloads = templates.reduce((s, t) => s + t.downloads_count, 0);
  const totalViews = templates.reduce((s, t) => s + t.views_count, 0);
  const featuredCount = templates.filter((t) => t.is_featured).length;
  const activeCount = templates.filter((t) => t.status === "active").length;

  // ── Form ──────────────────────────────────────────────────────────────────────
  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } =
    useForm<FormData>({ defaultValues: DEFAULT_VALUES });

  const watchedName = watch("name");
  const watchedSlug = watch("slug");
  const watchHasSale = watch("has_sale_price");
  const watchMeta = watch(["meta_title", "meta_description"]);

  const openCreate = useCallback(() => {
    reset(DEFAULT_VALUES);
    setEditTemplate(null);
    setFormOpen(true);
  }, [reset]);

  const openEdit = useCallback((t: Template) => {
    reset({
      name: t.name,
      slug: t.slug,
      tagline: t.tagline ?? "",
      description: t.description,
      category_id: t.category_id ?? "",
      price_usd: centsToUSD(t.price_usd_cents),
      sale_price_usd: t.sale_price_usd_cents ? centsToUSD(t.sale_price_usd_cents) : 0,
      has_sale_price: !!t.sale_price_usd_cents,
      file_url: t.file_url ?? "",
      preview_url: t.preview_url ?? "",
      file_format: t.file_format ?? "",
      status: t.status,
      is_featured: t.is_featured,
      is_bestseller: t.is_bestseller,
      is_new: t.is_new,
      meta_title: t.meta_title ?? "",
      meta_description: t.meta_description ?? "",
      meta_keywords: (t.meta_keywords ?? []).join(", "),
      current_version: t.current_version ?? "1.0",
      tags: (t.tags ?? []).join(", "),
    });
    setEditTemplate(t);
    setFormOpen(true);
  }, [reset]);

  const openDetail = useCallback((t: Template) => {
    setDetailTemplate(t);
    setDetailOpen(true);
  }, []);

  // ── Submit (Create / Update) ──────────────────────────────────────────────────
  const onSubmit = async (fd: FormData) => {
    if (!fd.name.trim()) { enqueueSnackbar("Name is required", { variant: "warning" }); return; }

    setSubmitLoading(true);
    try {
      const tagsArray = fd.tags ? fd.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const keywordsArray = fd.meta_keywords ? fd.meta_keywords.split(",").map((k) => k.trim()).filter(Boolean) : [];

      // Build payload matching Go CreateTemplateRequest exactly
      const payload = {
        name: fd.name.trim(),
        slug: fd.slug.trim() || toSlug(fd.name),
        tagline: fd.tagline || null,
        description: fd.description || null,
        category_id: fd.category_id !== "" ? Number(fd.category_id) : null,
        price_usd_cents: usdToCents(Number(fd.price_usd)),
        sale_price_usd_cents: fd.has_sale_price && fd.sale_price_usd ? usdToCents(Number(fd.sale_price_usd)) : null,
        file_url: fd.file_url || null,
        file_format: fd.file_format || null,
        preview_url: fd.preview_url || null,
        status: fd.status,
        is_featured: fd.is_featured,
        is_bestseller: fd.is_bestseller,
        is_new: fd.is_new,
        meta_title: fd.meta_title || null,
        meta_description: fd.meta_description || null,
        meta_keywords: keywordsArray,
        current_version: fd.current_version || "1.0",
      };

      let savedId: number;

      if (editTemplate) {
        await api.put(`/admin/templates/${editTemplate.id}`, payload);
        savedId = editTemplate.id;
        enqueueSnackbar("Template updated", { variant: "success" });
      } else {
        const res = await api.post<{ template: Template }>("/admin/templates", payload);
        savedId = res.data.template.id;
        enqueueSnackbar("Template created", { variant: "success" });
      }

      // Tags via PUT /:id/tags
      await api.put(`/admin/templates/${savedId}/tags`, { tags: tagsArray });

      await mutate();
      setFormOpen(false);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Save failed", { variant: "error" });
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Quick status patch (PATCH /:id) ───────────────────────────────────────────
  const patchStatus = async (id: number, status: Template["status"]) => {
    setPatchingId(id);
    try {
      await api.patch(`/admin/templates/${id}`, { status });
      enqueueSnackbar(`Status → ${status}`, { variant: "success" });
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Update failed", { variant: "error" });
    } finally {
      setPatchingId(null);
    }
  };

  // ── Quick featured/new/bestseller toggle (PATCH /:id) ────────────────────────
  const patchFlag = async (id: number, field: "is_featured" | "is_new" | "is_bestseller", val: boolean) => {
    try {
      await api.patch(`/admin/templates/${id}`, { [field]: val });
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Update failed", { variant: "error" });
    }
  };

  // ── File upload (POST /:id/upload-file) ───────────────────────────────────────
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
      await mutateDetail();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Upload failed", { variant: "error" });
    } finally {
      setUploadingFile(false);
      setUploadTarget(null);
    }
  };

  // ── Preview image upload — used by PreviewImagePicker in the form ────────────
  // When the user is editing an existing template we can upload immediately.
  // When creating a new template there's no id yet, so we keep the blob: URL
  // and the form submits it as preview_url; the server should handle/ignore blobs.
  // In practice the admin can also just use a CDN URL after uploading elsewhere.
  const handlePreviewFileSelect = async (file: File) => {
    if (!editTemplate) {
      // No id yet — keep blob URL (already set by picker); nothing else to do.
      return;
    }
    setUploadingPreview(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<{ file_url: string }>(
        `/admin/templates/${editTemplate.id}/upload-file`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // Swap the blob URL for the real CDN URL
      setValue("preview_url", res.data.file_url, { shouldDirty: true });
      enqueueSnackbar("Preview image uploaded", { variant: "success" });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Preview upload failed", { variant: "error" });
    } finally {
      setUploadingPreview(false);
    }
  };

  // ── Images (POST /:id/images, DELETE /images/:id) ─────────────────────────────
  const handleAddImage = async () => {
    if (!fullDetail || !newImageURL.trim()) return;
    setImageLoading(true);
    try {
      await api.post(`/admin/templates/${fullDetail.id}/images`, {
        url: newImageURL.trim(),
        alt_text: newImageAlt.trim() || null,
        display_order: (fullDetail.images?.length ?? 0) + 1,
        is_primary: (fullDetail.images?.length ?? 0) === 0,
      });
      setNewImageURL("");
      setNewImageAlt("");
      enqueueSnackbar("Image added", { variant: "success" });
      await mutateDetail();
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Failed to add image", { variant: "error" });
    } finally {
      setImageLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    setImageLoading(true);
    try {
      await api.delete(`/admin/templates/images/${imageId}`);
      enqueueSnackbar("Image removed", { variant: "success" });
      await mutateDetail();
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Failed to delete image", { variant: "error" });
    } finally {
      setImageLoading(false);
    }
  };

  // ── Features (POST /:id/features, DELETE /features/:id) ───────────────────────
  const handleAddFeature = async () => {
    if (!fullDetail || !newFeatureTitle.trim()) return;
    setFeatureLoading(true);
    try {
      await api.post(`/admin/templates/${fullDetail.id}/features`, {
        title: newFeatureTitle.trim(),
        description: newFeatureDesc.trim() || null,
        display_order: (fullDetail.features?.length ?? 0) + 1,
      });
      setNewFeatureTitle("");
      setNewFeatureDesc("");
      enqueueSnackbar("Feature added", { variant: "success" });
      await mutateDetail();
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Failed to add feature", { variant: "error" });
    } finally {
      setFeatureLoading(false);
    }
  };

  const handleDeleteFeature = async (featureId: number) => {
    setFeatureLoading(true);
    try {
      await api.delete(`/admin/templates/features/${featureId}`);
      enqueueSnackbar("Feature removed", { variant: "success" });
      await mutateDetail();
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Failed to delete feature", { variant: "error" });
    } finally {
      setFeatureLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/templates/${deleteId}`);
      enqueueSnackbar("Template deleted", { variant: "success" });
      await mutate();
      setDeleteId(null);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────────
  const columns: Column<Template>[] = [
    {
      key: "name",
      label: "Template",
      render: (row) => {
        const cat = row.category ?? categories.find((c) => c.id === row.category_id);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42, height: 42, borderRadius: 2,
                background: row.preview_url ? "transparent" : alpha(GOLD, 0.09),
                border: `1px solid ${alpha(GOLD, 0.18)}`,
                overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {row.preview_url
                ? <img src={proxyImg(row.preview_url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Typography sx={{ fontSize: "1.1rem" }}>📄</Typography>}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "nowrap" }}>
                <Typography
                  sx={{
                    fontWeight: 600, fontSize: "0.875rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: { xs: 130, sm: 200, md: 250 },
                    cursor: "pointer",
                    "&:hover": { color: GOLD },
                    transition: "color 0.15s",
                  }}
                  onClick={() => openDetail(row)}
                >
                  {row.name}
                </Typography>
                {row.is_featured && (
                  <Tooltip title="Featured">
                    <StarRounded sx={{ fontSize: 13, color: GOLD, flexShrink: 0, cursor: "pointer" }}
                      onClick={() => patchFlag(row.id, "is_featured", false)} />
                  </Tooltip>
                )}
                {row.is_bestseller && (
                  <Tooltip title="Bestseller">
                    <EmojiEventsRounded sx={{ fontSize: 13, color: "#E8A838", flexShrink: 0 }} />
                  </Tooltip>
                )}
                {row.is_new && (
                  <Tooltip title="New">
                    <NewReleasesRounded sx={{ fontSize: 13, color: GREEN, flexShrink: 0 }} />
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", fontFamily: "monospace", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  /{row.slug}
                </Typography>
                {cat && (
                  <>
                    <Box sx={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", whiteSpace: "nowrap" }}>
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
      key: "price_usd_cents",
      label: "Price",
      render: (row) => (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: row.price_usd_cents === 0 ? GREEN : GOLD }}>
            {fmtUSD(row.price_usd_cents)}
          </Typography>
          {row.sale_price_usd_cents && (
            <Typography sx={{ fontSize: "0.7rem", color: GREEN }}>
              Sale: {fmtUSD(row.sale_price_usd_cents)}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <StatusBadge status={row.status} />
          {row.status !== "active" && (
            <Tooltip title="Set Active">
              <Chip
                label="Publish"
                size="small"
                icon={patchingId === row.id ? <CircularProgress size={9} /> as any : <PublishRounded sx={{ fontSize: 11 }} /> as any}
                onClick={() => patchStatus(row.id, "active")}
                sx={{
                  height: 18, fontSize: "0.62rem", cursor: "pointer",
                  background: alpha(GREEN, 0.1), color: GREEN,
                  "&:hover": { background: alpha(GREEN, 0.2) },
                  "& .MuiChip-icon": { color: GREEN },
                }}
              />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      key: "downloads_count",
      label: "DL / Views",
      hideOnMobile: true,
      render: (row) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <DownloadRounded sx={{ fontSize: 12, color: "text.disabled" }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{row.downloads_count.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <VisibilityRounded sx={{ fontSize: 12, color: "text.disabled" }} />
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{row.views_count.toLocaleString()}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "file_url",
      label: "File",
      hideOnMobile: true,
      render: (row) => (
        row.file_url ? (
          <Chip
            label={row.file_format ?? "File"}
            size="small"
            sx={{ height: 20, fontSize: "0.67rem", background: alpha(GREEN, 0.1), color: GREEN }}
          />
        ) : (
          <Box component="label" sx={{ cursor: "pointer" }}>
            <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(row.id, f); }} />
            <Chip
              label={uploadingFile && uploadTarget === row.id ? "Uploading…" : "Upload"}
              size="small"
              icon={<UploadFileRounded sx={{ fontSize: 11 }} />}
              sx={{
                height: 20, fontSize: "0.67rem", cursor: "pointer",
                background: alpha(GOLD, 0.08), color: GOLD,
                "&:hover": { background: alpha(GOLD, 0.16) },
              }}
            />
          </Box>
        )
      ),
    },
    {
      key: "relations",
      label: "Content",
      hideOnMobile: true,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.75 }}>
          <Tooltip title={`${row.images?.length ?? 0} images`}>
            <Chip
              size="small"
              icon={<ImageRounded sx={{ fontSize: 11 }} />}
              label={row.images?.length ?? 0}
              onClick={() => openDetail(row)}
              sx={{ height: 20, fontSize: "0.67rem", cursor: "pointer", background: alpha(BLUE, 0.1), color: BLUE, "& .MuiChip-icon": { color: BLUE } }}
            />
          </Tooltip>
          <Tooltip title={`${row.features?.length ?? 0} features`}>
            <Chip
              size="small"
              icon={<FeaturedPlayListRounded sx={{ fontSize: 11 }} />}
              label={row.features?.length ?? 0}
              onClick={() => openDetail(row)}
              sx={{ height: 20, fontSize: "0.67rem", cursor: "pointer", background: alpha(GOLD, 0.08), color: GOLD, "& .MuiChip-icon": { color: GOLD } }}
            />
          </Tooltip>
          {(row.tags?.length ?? 0) > 0 && (
            <Tooltip title={(row.tags ?? []).join(", ")}>
              <Chip
                size="small"
                icon={<LocalOfferRounded sx={{ fontSize: 11 }} />}
                label={row.tags?.length}
                sx={{ height: 20, fontSize: "0.67rem", background: alpha(GREEN, 0.1), color: GREEN, "& .MuiChip-icon": { color: GREEN } }}
              />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      key: "created_at",
      label: "Added",
      hideOnMobile: true,
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", whiteSpace: "nowrap" }}>
            {dayjs(row.created_at).format("MMM D, YYYY")}
          </Typography>
          <Typography sx={{ fontSize: "0.68rem", color: "text.disabled" }}>
            v{row.current_version}
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
          <Tooltip title="View Details">
            <IconButton size="small" onClick={() => openDetail(row)} sx={{ "&:hover": { color: BLUE } }}>
              <InfoOutlined sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleteId(row.id)} sx={{ "&:hover": { color: RED } }}>
              <DeleteRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const topTemplates = Array.isArray(analyticsRes?.data?.top_templates)
    ? analyticsRes!.data!.top_templates! : [];

  // ─── Render ────────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Templates"
      subtitle={isLoading ? "Loading…" : `${total.toLocaleString()} template${total !== 1 ? "s" : ""}`}
      actions={
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} size="small">
          Add Template
        </Button>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total", value: isLoading ? "—" : total, icon: <GridViewRounded />, color: GOLD },
          { label: "Active", value: isLoading ? "—" : activeCount, icon: <CheckCircleRounded />, color: GREEN },
          { label: "Downloads", value: isLoading ? "—" : totalDownloads.toLocaleString(), icon: <DownloadRounded />, color: BLUE },
          { label: "Featured", value: isLoading ? "—" : featuredCount, icon: <StarRounded />, color: GOLD },
        ].map((s) => (
          <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
            <StatCard {...s} loading={isLoading} />
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Tab label="All Templates" />
          <Tab label="Analytics" icon={<TrendingUpRounded sx={{ fontSize: 16 }} />} iconPosition="start" />
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
          onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          getRowId={(r) => String(r.id)}
          emptyMessage="No templates yet — add your first one"
        />
      )}

      {/* Analytics */}
      {tab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 3, fontSize: "1rem" }}>Top Downloads</Typography>
          {analyticsLoading ? (
            <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
          ) : topTemplates.length === 0 ? (
            <Box sx={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ color: "text.disabled" }}>No analytics data yet</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topTemplates} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                <XAxis dataKey="name" tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 12)}…` : v} />
                <YAxis tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip
                  contentStyle={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="downloads_count" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CREATE / EDIT DIALOG
      ═════════════════════════════════════════════════════════════════════════*/}
      <Dialog
        open={formOpen}
        onClose={() => !submitLoading && setFormOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: "92vh", borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{editTemplate ? `Edit: ${editTemplate.name}` : "New Template"}</span>
          <IconButton size="small" onClick={() => setFormOpen(false)} disabled={submitLoading}>
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ overflowY: "auto" }}>
          <Box
            component="form"
            id="tmpl-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ pt: 0.5 }}
          >
            <Grid container spacing={2}>

              {/* ── Basic info ── */}
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "text.disabled", mb: 1 }}>
                  Basic Info
                </Typography>
              </Grid>

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
                    if (!editTemplate) setValue("slug", toSlug(e.target.value), { shouldDirty: true });
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
                  label="Tagline"
                  fullWidth
                  placeholder="One-line description shown in listings"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("description", { required: "Description is required" })}
                  label="Description *"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              </Grid>

              {/* ── Category + Status + Version ── */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} value={field.value ?? ""} label="Category"
                        onChange={(e) => field.onChange((e.target.value as any) || "")}>
                        <MenuItem value="">None</MenuItem>
                        {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
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
                <TextField {...register("current_version")} label="Version" fullWidth size="small" placeholder="1.0" />
              </Grid>

              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

              {/* ── Pricing ── */}
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "text.disabled", mb: 1 }}>
                  Pricing (USD)
                </Typography>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  {...register("price_usd")}
                  label="Price *"
                  type="number"
                  fullWidth
                  slotProps={{
                    htmlInput: { min: 0, step: 0.01 },
                    input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                  }}
                  helperText="0 = free"
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 9 }} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Controller
                  name="has_sale_price"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} size="small" />}
                      label={<Typography sx={{ fontSize: "0.85rem" }}>Sale Price</Typography>}
                    />
                  )}
                />
                {watchHasSale && (
                  <TextField
                    {...register("sale_price_usd")}
                    label="Sale Price"
                    type="number"
                    size="small"
                    sx={{ width: 140 }}
                    slotProps={{
                      htmlInput: { min: 0, step: 0.01 },
                      input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                    }}
                  />
                )}
              </Grid>

              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

              {/* ── Files ── */}
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "text.disabled", mb: 1 }}>
                  Files
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField {...register("file_url")} label="File URL" fullWidth size="small" placeholder="Cloudinary URL or external link" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField {...register("file_format")} label="Format" fullWidth size="small" placeholder="XLSX, PDF…" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="preview_url"
                  control={control}
                  render={({ field }) => (
                    <PreviewImagePicker
                      value={field.value}
                      onChange={field.onChange}
                      onFileSelect={handlePreviewFileSelect}
                      uploading={uploadingPreview}
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

              {/* ── Flags ── */}
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "text.disabled", mb: 1 }}>
                  Flags
                </Typography>
              </Grid>

              {(["is_featured", "is_bestseller", "is_new"] as const).map((f) => (
                <Grid size={{ xs: 6, sm: 4 }} key={f}>
                  <Controller
                    name={f}
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.value ?? false}
                            onChange={(e) => field.onChange(e.target.checked)}
                            size="small"
                            sx={{ "& .Mui-checked": { color: GOLD }, "& .Mui-checked + .MuiSwitch-track": { background: alpha(GOLD, 0.4) } }}
                          />
                        }
                        label={<Typography sx={{ fontSize: "0.82rem", textTransform: "capitalize" }}>{f.replace("is_", "").replace(/_/g, " ")}</Typography>}
                      />
                    )}
                  />
                </Grid>
              ))}

              {/* ── Tags & Keywords ── */}
              <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("tags")}
                  label="Tags"
                  fullWidth
                  size="small"
                  placeholder="resume, professional, ATS"
                  helperText="Comma-separated"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("meta_keywords")}
                  label="Meta Keywords"
                  fullWidth
                  size="small"
                  placeholder="resume template, word, editable"
                  helperText="Comma-separated"
                />
              </Grid>

              {/* ── SEO ── */}
              <Grid size={{ xs: 12 }}>
                <Accordion sx={{ background: "transparent", boxShadow: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px !important" }}>
                  <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SearchRounded sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>SEO (optional)</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      {...register("meta_title")}
                      label="Meta Title"
                      fullWidth
                      size="small"
                      helperText={`${watchMeta[0]?.length ?? 0}/70`}
                    />
                    <TextField
                      {...register("meta_description")}
                      label="Meta Description"
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      helperText={`${watchMeta[1]?.length ?? 0}/160`}
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>

            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)} variant="outlined" size="small" disabled={submitLoading}>Cancel</Button>
          <Button type="submit" form="tmpl-form" variant="contained" size="small" disabled={submitLoading}>
            {submitLoading ? "Saving…" : editTemplate ? "Update Template" : "Create Template"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DETAIL DRAWER — images / features / tags / quick info
      ═════════════════════════════════════════════════════════════════════════*/}
      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        PaperProps={{ sx: { width: { xs: "100vw", sm: 480 }, p: 0, background: "#0F1923" } }}
      >
        {fullDetail && (
          <Box sx={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <Box sx={{
              p: 2.5, borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "flex-start", gap: 1.5,
              background: alpha(GOLD, 0.04),
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <StatusBadge status={fullDetail.status} />
                  <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>v{fullDetail.current_version}</Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3 }}>{fullDetail.name}</Typography>
                {fullDetail.tagline && (
                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.5 }}>{fullDetail.tagline}</Typography>
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: GOLD }}>
                    {fmtUSD(fullDetail.price_usd_cents)}
                  </Typography>
                  {fullDetail.sale_price_usd_cents && (
                    <Typography sx={{ fontSize: "0.8rem", color: GREEN }}>Sale: {fmtUSD(fullDetail.sale_price_usd_cents)}</Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => { setDetailOpen(false); openEdit(fullDetail); }}>
                    <EditRounded sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={() => setDetailOpen(false)}>
                  <CloseRounded sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Quick stats */}
            <Box sx={{ px: 2.5, py: 1.5, display: "flex", gap: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { icon: <DownloadRounded sx={{ fontSize: 14 }} />, value: fullDetail.downloads_count.toLocaleString(), label: "downloads" },
                { icon: <VisibilityRounded sx={{ fontSize: 14 }} />, value: fullDetail.views_count.toLocaleString(), label: "views" },
              ].map((s) => (
                <Box key={s.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ color: "text.disabled" }}>{s.icon}</Box>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>{s.label}</Typography>
                </Box>
              ))}
              {fullDetail.published_at && (
                <Box sx={{ ml: "auto" }}>
                  <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
                    Published {dayjs(fullDetail.published_at).format("MMM D, YYYY")}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Tags */}
            {(fullDetail.tags ?? []).length > 0 && (
              <Box sx={{ px: 2.5, py: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {(fullDetail.tags ?? []).map((tag) => (
                  <Chip key={tag} label={tag} size="small"
                    icon={<LocalOfferRounded sx={{ fontSize: 11 }} />}
                    sx={{ height: 22, fontSize: "0.7rem", background: alpha(GREEN, 0.1), color: GREEN, "& .MuiChip-icon": { color: GREEN } }}
                  />
                ))}
              </Box>
            )}

            {/* ── Images section ── */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ImageRounded sx={{ fontSize: 16, color: BLUE }} />
                  <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>Images</Typography>
                  <Chip label={fullDetail.images?.length ?? 0} size="small"
                    sx={{ height: 18, fontSize: "0.65rem", background: alpha(BLUE, 0.12), color: BLUE }} />
                </Box>
              </Box>

              {/* Image grid */}
              {(fullDetail.images ?? []).length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                  {(fullDetail.images ?? []).map((img) => (
                    <Box key={img.id} sx={{
                      position: "relative", width: 80, height: 80, borderRadius: 1.5,
                      overflow: "hidden", border: `1px solid ${alpha(BLUE, img.is_primary ? 0.6 : 0.15)}`,
                      flexShrink: 0,
                    }}>
                      <img src={proxyImg(img.url)} alt={img.alt_text ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      {img.is_primary && (
                        <Box sx={{ position: "absolute", top: 2, left: 2, background: alpha(BLUE, 0.8), borderRadius: 0.5, px: 0.5 }}>
                          <Typography sx={{ fontSize: "0.55rem", color: "#fff" }}>Primary</Typography>
                        </Box>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteImage(img.id)}
                        sx={{
                          position: "absolute", top: 2, right: 2,
                          background: alpha("#000", 0.6), width: 20, height: 20,
                          "&:hover": { background: alpha(RED, 0.8) },
                        }}
                      >
                        <CloseRounded sx={{ fontSize: 11, color: "#fff" }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Add image */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                  value={newImageURL}
                  onChange={(e) => setNewImageURL(e.target.value)}
                  label="Image URL"
                  fullWidth
                  size="small"
                  placeholder="https://…"
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    label="Alt text"
                    fullWidth
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddImage}
                    disabled={imageLoading || !newImageURL.trim()}
                    startIcon={imageLoading ? <CircularProgress size={12} /> : <AddPhotoAlternateRounded sx={{ fontSize: 14 }} />}
                    sx={{ flexShrink: 0, borderColor: alpha(BLUE, 0.4), color: BLUE, "&:hover": { borderColor: BLUE } }}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* ── Features section ── */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <FeaturedPlayListRounded sx={{ fontSize: 16, color: GOLD }} />
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>Features</Typography>
                <Chip label={fullDetail.features?.length ?? 0} size="small"
                  sx={{ height: 18, fontSize: "0.65rem", background: alpha(GOLD, 0.12), color: GOLD }} />
              </Box>

              {(fullDetail.features ?? []).length > 0 && (
                <List dense disablePadding sx={{ mb: 1.5 }}>
                  {(fullDetail.features ?? []).map((feat) => (
                    <ListItem
                      key={feat.id}
                      disablePadding
                      sx={{
                        py: 0.75, px: 1.5, mb: 0.5, borderRadius: 1.5,
                        background: alpha(GOLD, 0.04),
                        border: `1px solid ${alpha(GOLD, 0.1)}`,
                      }}
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => handleDeleteFeature(feat.id)}
                          sx={{ "&:hover": { color: RED } }}>
                          <DeleteOutlineRounded sx={{ fontSize: 14 }} />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={<Typography sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{feat.title}</Typography>}
                        secondary={feat.description && (
                          <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>{feat.description}</Typography>
                        )}
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Add feature */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                  value={newFeatureTitle}
                  onChange={(e) => setNewFeatureTitle(e.target.value)}
                  label="Feature title"
                  fullWidth
                  size="small"
                  placeholder="ATS-friendly format"
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    value={newFeatureDesc}
                    onChange={(e) => setNewFeatureDesc(e.target.value)}
                    label="Description (optional)"
                    fullWidth
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddFeature}
                    disabled={featureLoading || !newFeatureTitle.trim()}
                    startIcon={featureLoading ? <CircularProgress size={12} /> : <AddRounded sx={{ fontSize: 14 }} />}
                    sx={{ flexShrink: 0, borderColor: alpha(GOLD, 0.4), color: GOLD, "&:hover": { borderColor: GOLD } }}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* ── File upload ── */}
            <Box sx={{ px: 2.5, py: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <LayersRounded sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>Template File</Typography>
              </Box>
              {fullDetail.file_url ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 2, background: alpha(GREEN, 0.06), border: `1px solid ${alpha(GREEN, 0.2)}` }}>
                  <CheckCircleRounded sx={{ fontSize: 18, color: GREEN }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: GREEN }}>File uploaded</Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fullDetail.file_format ?? ""}{fullDetail.file_size_mb ? ` · ${fullDetail.file_size_mb.toFixed(1)} MB` : ""}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box
                  component="label"
                  sx={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                    p: 2.5, borderRadius: 2, border: `2px dashed ${alpha(GOLD, 0.25)}`,
                    cursor: "pointer", "&:hover": { borderColor: alpha(GOLD, 0.5), background: alpha(GOLD, 0.03) },
                    transition: "all 0.2s",
                  }}
                >
                  <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(fullDetail.id, f); }} />
                  <UploadFileRounded sx={{ fontSize: 28, color: alpha(GOLD, 0.5) }} />
                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>Click to upload template file</Typography>
                  {uploadingFile && uploadTarget === fullDetail.id && (
                    <LinearProgress sx={{ width: "100%", borderRadius: 1 }} />
                  )}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Delete confirm */}
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