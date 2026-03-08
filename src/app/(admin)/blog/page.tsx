"use client";
import { useState, useCallback, useEffect } from "react";
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
  Typography,
  Paper,
  Chip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Drawer,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { SelectChangeEvent } from "@mui/material/Select";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  PublishRounded,
  ExpandMoreRounded,
  ImageRounded,
  SearchRounded,
  TagRounded,
  AccessTimeRounded,
  PersonRounded,
  CloseRounded,
  TuneRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm, Controller } from "react-hook-form";
import { alpha } from "@mui/material";
import dayjs from "dayjs";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import StatusChip from "@/components/ui/StatusChip";
import SearchBar from "@/components/ui/SearchBar";
import RichEditor from "@/components/editor/RichEditor";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";
import { BlogAuthor, BlogCategory, BlogPost, PaginatedResponse } from "@/types";

const GOLD = "#C9A84C";

// ── Utils ─────────────────────────────────────────────────────────────────────
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ── SEO Score ─────────────────────────────────────────────────────────────────
function SeoScore({
  title,
  description,
  slug,
}: {
  title?: string;
  description?: string;
  slug?: string;
}) {
  const checks = [
    {
      label: "Title (50–60 chars)",
      pass: (title?.length ?? 0) >= 50 && (title?.length ?? 0) <= 60,
    },
    {
      label: "Description (120–160 chars)",
      pass:
        (description?.length ?? 0) >= 120 && (description?.length ?? 0) <= 160,
    },
    { label: "Slug is set", pass: !!slug?.trim() },
    { label: "Clean slug format", pass: /^[a-z0-9-]*$/.test(slug ?? "") },
  ];
  const score = checks.filter((c) => c.pass).length;
  const color = score === 4 ? "#4CAF82" : score >= 2 ? GOLD : "#E05C5C";

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
          SEO Score
        </Typography>
        <Box
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1,
            background: alpha(color, 0.12),
            border: `1px solid ${alpha(color, 0.3)}`,
          }}
        >
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color }}>
            {score}/4
          </Typography>
        </Box>
      </Box>
      {checks.map((c) => (
        <Box
          key={c.label}
          sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}
        >
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              flexShrink: 0,
              background: c.pass
                ? alpha("#4CAF82", 0.15)
                : alpha("#E05C5C", 0.1),
              border: `1.5px solid ${c.pass ? "#4CAF82" : "#E05C5C"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: c.pass ? "#4CAF82" : "#E05C5C",
              }}
            />
          </Box>
          <Typography
            sx={{
              fontSize: "0.74rem",
              color: c.pass ? "text.secondary" : alpha("#E05C5C", 0.8),
            }}
          >
            {c.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Form type ─────────────────────────────────────────────────────────────────
interface FormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  author_id: number | "";
  category_id: number | "";
  tags: string;
  meta_keywords: string;
  meta_title: string;
  meta_description: string;
  status: BlogPost["status"];
  published_at: string;
}

const DEFAULT_VALUES: FormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image_url: "",
  author_id: "",
  category_id: "",
  tags: "",
  meta_keywords: "",
  meta_title: "",
  meta_description: "",
  status: "draft",
  published_at: "",
};

// ── Sidebar panel (settings) ──────────────────────────────────────────────────
interface SidebarProps {
  control: ReturnType<typeof useForm<FormData>>["control"];
  register: ReturnType<typeof useForm<FormData>>["register"];
  watch: ReturnType<typeof useForm<FormData>>["watch"];
  authors: BlogAuthor[];
  categories: BlogCategory[];
  coverPreview: string;
  setCoverPreview: (v: string) => void;
}

function SettingsSidebar({
  control,
  register,
  watch,
  authors,
  categories,
  coverPreview,
  setCoverPreview,
}: SidebarProps) {
  const watchStatus = watch("status");
  const watchMetaTitle = watch("meta_title");
  const watchMetaDesc = watch("meta_description");
  const watchSlug = watch("slug");
  const watchTitle = watch("title");
  const watchExcerpt = watch("excerpt");
  const watchCover = watch("featured_image_url");

  useEffect(() => {
    setCoverPreview(watchCover ?? "");
  }, [watchCover, setCoverPreview]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Publish */}
      <Paper sx={{ p: 2, borderRadius: 2.5 }}>
        <Typography
          sx={{
            fontWeight: 600,
            mb: 2,
            fontSize: "0.82rem",
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Publish
        </Typography>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select {...field} label="Status">
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          )}
        />
        {watchStatus === "scheduled" && (
          <TextField
            {...register("published_at")}
            label="Publish at"
            type="datetime-local"
            fullWidth
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )}
      </Paper>

      {/* Author + Category */}
      <Paper sx={{ p: 2, borderRadius: 2.5 }}>
        <Typography
          sx={{
            fontWeight: 600,
            mb: 2,
            fontSize: "0.82rem",
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <PersonRounded sx={{ fontSize: 14 }} /> Author & Category
        </Typography>

        <Controller
          name="author_id"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Author</InputLabel>
              <Select
                {...field}
                value={field.value ?? ""}
                label="Author"
                onChange={(e) =>
                  field.onChange(e.target.value ? Number(e.target.value) : null)
                }
              >
                <MenuItem value="">None</MenuItem>
                {authors.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {a.avatar_url ? (
                        <Box
                          component="img"
                          src={a.avatar_url}
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Avatar
                          sx={{
                            width: 20,
                            height: 20,
                            fontSize: "0.55rem",
                            background: alpha(GOLD, 0.2),
                            color: GOLD,
                          }}
                        >
                          {a.name.charAt(0)}
                        </Avatar>
                      )}
                      <Typography sx={{ fontSize: "0.85rem" }}>
                        {a.name}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                {...field}
                value={field.value ?? ""}
                label="Category"
                onChange={(e) =>
                  field.onChange(e.target.value ? Number(e.target.value) : null)
                }
              >
                <MenuItem value="">None</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Paper>

      {/* Featured image */}
      <Paper sx={{ p: 2, borderRadius: 2.5 }}>
        <Typography
          sx={{
            fontWeight: 600,
            mb: 1.5,
            fontSize: "0.82rem",
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <ImageRounded sx={{ fontSize: 14 }} /> Featured Image
        </Typography>
        <TextField
          {...register("featured_image_url")}
          label="Image URL"
          fullWidth
          size="small"
          placeholder="https://..."
        />
        {coverPreview && (
          <Box
            component="img"
            src={coverPreview}
            alt="cover preview"
            sx={{
              width: "100%",
              height: 110,
              objectFit: "cover",
              borderRadius: 2,
              mt: 1.5,
              display: "block",
            }}
            onError={() => setCoverPreview("")}
          />
        )}
      </Paper>

      {/* Tags */}
      <Paper sx={{ p: 2, borderRadius: 2.5 }}>
        <Typography
          sx={{
            fontWeight: 600,
            mb: 1.5,
            fontSize: "0.82rem",
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <TagRounded sx={{ fontSize: 14 }} /> Tags
        </Typography>
        <TextField
          {...register("tags")}
          label="Tags"
          fullWidth
          size="small"
          placeholder="react, tutorial, design"
          helperText="Comma-separated"
        />
      </Paper>

      {/* SEO */}
      <Paper sx={{ borderRadius: 2.5, overflow: "hidden" }}>
        <Accordion
          sx={{ background: "transparent", boxShadow: "none" }}
          defaultExpanded={false}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreRounded />}
            sx={{ px: 2, minHeight: 48 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SearchRounded sx={{ fontSize: 15, color: "text.secondary" }} />
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                SEO
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails
            sx={{
              px: 2,
              pb: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              {...register("meta_title")}
              label="Meta Title"
              fullWidth
              size="small"
              helperText={`${(watchMetaTitle ?? "").length}/60 chars`}
            />
            <TextField
              {...register("meta_description")}
              label="Meta Description"
              fullWidth
              size="small"
              multiline
              rows={3}
              helperText={`${(watchMetaDesc ?? "").length}/160 chars`}
            />
            <TextField
              {...register("meta_keywords")}
              label="Meta Keywords"
              fullWidth
              size="small"
              placeholder="keyword1, keyword2"
              helperText="Comma-separated"
            />
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <SeoScore
              title={watchMetaTitle || watchTitle}
              description={watchMetaDesc || watchExcerpt}
              slug={watchSlug}
            />
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BlogPage() {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState("");
  const [readingTime, setReadingTime] = useState(0);

  const endpoint =
    `/admin/blog/posts?page=${page + 1}&limit=20` +
    (statusFilter ? `&status=${statusFilter}` : "") +
    (search ? `&search=${encodeURIComponent(search)}` : "");

  const { data, isLoading, mutate } =
    useSWR<PaginatedResponse<BlogPost>>(endpoint);
  const { data: authorsRes } = useSWR<{ success: boolean; data: BlogAuthor[] }>(
    "/admin/blog/authors",
  );
  const { data: categoriesRes } = useSWR<{
    success: boolean;
    data: BlogCategory[];
  }>("/admin/blog/categories");

  const posts: BlogPost[] = data?.data ?? [];
  const total: number = data?.pagination?.total ?? 0;
  const authors: BlogAuthor[] = authorsRes?.data ?? [];
  const categories: BlogCategory[] = categoriesRes?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: DEFAULT_VALUES });

  const watchTitle = watch("title");
  const watchContent = watch("content");
  const watchStatus = watch("status");

  // Auto-slug from title (only for new posts)
  useEffect(() => {
    if (watchTitle && !editPost) {
      setValue("slug", toSlug(watchTitle), { shouldDirty: false });
    }
  }, [watchTitle, editPost, setValue]);

  // Reading time
  useEffect(() => {
    setReadingTime(estimateReadingTime(watchContent ?? ""));
  }, [watchContent]);

  // ── Dialog open helpers ───────────────────────────────────────────────────
  const openCreate = () => {
    reset(DEFAULT_VALUES);
    setEditPost(null);
    setCoverPreview("");
    setFormOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      featured_image_url: post.featured_image_url ?? "",
      author_id: post.author_id ?? "",
      category_id: post.category_id ?? "",
      status: post.status,
      tags: post.tags?.join(", ") ?? "",
      meta_keywords: post.meta_keywords?.join(", ") ?? "",
      meta_title: post.meta_title ?? "",
      meta_description: post.meta_description ?? "",
      published_at: post.published_at
        ? dayjs(post.published_at).format("YYYY-MM-DDTHH:mm")
        : "",
    });
    setCoverPreview(post.featured_image_url ?? "");
    setEditPost(post);
    setFormOpen(true);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (formData: FormData) => {
    if (!formData.title?.trim() || formData.title.trim().length < 2) {
      enqueueSnackbar("Title is required (min 2 characters)", {
        variant: "warning",
      });
      return;
    }
    const rawContent = (formData.content ?? "").replace(/<[^>]*>/g, "").trim();
    if (!rawContent) {
      enqueueSnackbar("Content cannot be empty", { variant: "warning" });
      return;
    }

    setSubmitLoading(true);
    try {
      const splitCsv = (s: string) =>
        s
          ? s
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [];

      const payload = {
        title: formData.title.trim(),
        slug: formData.slug || toSlug(formData.title),
        excerpt: formData.excerpt || null,
        content: formData.content,
        featured_image_url: formData.featured_image_url || null,
        author_id:
          formData.author_id !== "" ? Number(formData.author_id) : null,
        category_id:
          formData.category_id !== "" ? Number(formData.category_id) : null,
        tags: splitCsv(formData.tags),
        meta_keywords: splitCsv(formData.meta_keywords),
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        status: formData.status,
        published_at:
          formData.status === "scheduled" && formData.published_at
            ? new Date(formData.published_at).toISOString()
            : formData.status === "published"
              ? (editPost?.published_at ?? new Date().toISOString())
              : null,
        reading_time_minutes: estimateReadingTime(formData.content),
      };

      if (editPost) {
        await api.put(`/admin/blog/posts/${editPost.id}`, payload);
        enqueueSnackbar("Post updated", { variant: "success" });
      } else {
        await api.post("/admin/blog/posts", payload);
        enqueueSnackbar("Post created", { variant: "success" });
      }
      await mutate();
      setFormOpen(false);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? "Save failed", {
        variant: "error",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Publish toggle ────────────────────────────────────────────────────────
  const handlePublishToggle = async (post: BlogPost) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      await api.put(`/admin/blog/posts/${post.id}`, {
        status: newStatus,
        published_at:
          newStatus === "published" ? new Date().toISOString() : null,
      });
      enqueueSnackbar(
        newStatus === "published" ? "Post published" : "Post unpublished",
        { variant: "success" },
      );
      await mutate();
    } catch {
      enqueueSnackbar("Status change failed", { variant: "error" });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/blog/posts/${deleteId}`);
      enqueueSnackbar("Post deleted", { variant: "success" });
      await mutate();
    } catch {
      enqueueSnackbar("Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: Column<BlogPost>[] = [
    {
      key: "title",
      label: "Post",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {row.featured_image_url ? (
            <Box
              component="img"
              src={row.featured_image_url}
              alt={row.title}
              sx={{
                width: 52,
                height: 38,
                borderRadius: 1.5,
                objectFit: "cover",
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Box
              sx={{
                width: 52,
                height: 38,
                borderRadius: 1.5,
                flexShrink: 0,
                background: alpha(GOLD, 0.06),
                border: "1px dashed rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ImageRounded sx={{ fontSize: 16, color: "text.disabled" }} />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: { xs: 160, sm: 260, md: "none" },
              }}
            >
              {row.title}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                mt: 0.2,
                flexWrap: "wrap",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "text.disabled",
                  fontFamily: "monospace",
                }}
              >
                /{row.slug}
              </Typography>
              {row.category && (
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
                    sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                  >
                    {row.category.name}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      key: "author_id",
      label: "Author",
      hideOnMobile: true,
      render: (row) => {
        const author =
          row.author ?? authors.find((a) => a.id === row.author_id);
        if (!author) {
          return (
            <Typography sx={{ fontSize: "0.75rem", color: "text.disabled" }}>
              —
            </Typography>
          );
        }
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {author.avatar_url ? (
              <Box
                component="img"
                src={author.avatar_url}
                alt={author.name}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: "0.6rem",
                  background: alpha(GOLD, 0.2),
                  color: GOLD,
                  flexShrink: 0,
                }}
              >
                {author.name.charAt(0)}
              </Avatar>
            )}
            <Typography sx={{ fontSize: "0.78rem" }}>{author.name}</Typography>
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
      key: "reading_time_minutes",
      label: "Read",
      hideOnMobile: true,
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AccessTimeRounded sx={{ fontSize: 12, color: "text.disabled" }} />
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {row.reading_time_minutes ?? estimateReadingTime(row.content ?? "")}{" "}
            min
          </Typography>
        </Box>
      ),
    },
    {
      key: "views_count",
      label: "Views",
      hideOnMobile: true,
      render: (row) => (
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
          {(row.views_count ?? 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      key: "tags",
      label: "Tags",
      hideOnMobile: true,
      render: (row) => (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            flexWrap: "nowrap",
            alignItems: "center",
          }}
        >
          {(row.tags ?? []).slice(0, 2).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.67rem",
                background: alpha("#fff", 0.06),
                maxWidth: 80,
              }}
            />
          ))}
          {(row.tags?.length ?? 0) > 2 && (
            <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
              +{(row.tags?.length ?? 0) - 2}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "created_at",
      label: "Date",
      hideOnMobile: true,
      render: (row) => (
        <Box>
          <Typography
            sx={{
              fontSize: "0.8rem",
              color: "text.secondary",
              whiteSpace: "nowrap",
            }}
          >
            {row.published_at
              ? dayjs(row.published_at).format("MMM D, YYYY")
              : dayjs(row.created_at).format("MMM D, YYYY")}
          </Typography>
          {row.status === "scheduled" && row.published_at && (
            <Typography sx={{ fontSize: "0.68rem", color: GOLD }}>
              Scheduled
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          <Tooltip title={row.status === "published" ? "Unpublish" : "Publish"}>
            <IconButton
              size="small"
              onClick={() => handlePublishToggle(row)}
              sx={{
                "&:hover": {
                  color: row.status === "published" ? "#E8A838" : "#4CAF82",
                },
              }}
            >
              <PublishRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => setDeleteId(row.id)}
              sx={{ "&:hover": { color: "#E05C5C" } }}
            >
              <DeleteRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // ── Shared sidebar props ──────────────────────────────────────────────────
  const sidebarProps: SidebarProps = {
    control,
    register,
    watch,
    authors,
    categories,
    coverPreview,
    setCoverPreview,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Blog Posts"
      subtitle={`${total} post${total !== 1 ? "s" : ""}`}
      actions={
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={openCreate}
          size="small"
        >
          New Post
        </Button>
      }
    >
      {/* Filters */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          mb: 3,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <SearchBar
            placeholder="Search posts..."
            onSearch={useCallback((v: string) => {
              setSearch(v);
              setPage(0);
            }, [])}
          />
        </Box>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            sx={{ borderRadius: 2.5 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <DataTable
        columns={columns}
        rows={posts}
        loading={isLoading}
        page={page}
        rowsPerPage={20}
        total={total}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
        emptyMessage="No blog posts yet — create your first one"
      />

      {/* ── Blog editor dialog ── */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth={false}
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            maxWidth: 1200,
            height: isMobile ? "100%" : "94vh",
            m: isMobile ? 0 : { xs: 1, sm: 2 },
            display: "flex",
            flexDirection: "column",
            borderRadius: isMobile ? 0 : 3,
          },
        }}
      >
        {/* Dialog header */}
        <DialogTitle
          sx={{
            pb: 1.5,
            pt: 2,
            px: { xs: 2, sm: 3 },
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.9rem", sm: "1rem" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {editPost ? `Edit: ${editPost.title}` : "New Blog Post"}
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {readingTime > 0 && (
                <Chip
                  label={`~${readingTime} min`}
                  size="small"
                  sx={{
                    background: alpha(GOLD, 0.1),
                    color: GOLD,
                    border: `1px solid ${alpha(GOLD, 0.25)}`,
                    fontSize: "0.68rem",
                  }}
                />
              )}
              <StatusChip status={watchStatus} />
              {isMobile && (
                <Tooltip title="Post settings">
                  <IconButton
                    size="small"
                    onClick={() => setSettingsOpen(true)}
                    sx={{
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 1.5,
                    }}
                  >
                    <TuneRounded sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton size="small" onClick={() => setFormOpen(false)}>
                <CloseRounded sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        {/* Dialog body */}
        <DialogContent
          sx={{
            overflow: "hidden",
            flex: 1,
            p: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            component="form"
            id="blog-form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Grid
              container
              sx={{ flex: 1, overflow: "hidden", height: "100%" }}
            >
              {/* ── Left: main content ── */}
              <Grid
                size={{ xs: 12, md: 8 }}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRight: { md: "1px solid rgba(255,255,255,0.06)" },
                  overflowY: "auto",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                }}
              >
                <TextField
                  {...register("title", {
                    required: "Title is required",
                    minLength: { value: 2, message: "Min 2 characters" },
                  })}
                  label="Post Title"
                  fullWidth
                  autoFocus={!isMobile}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  slotProps={{
                    htmlInput: {
                      style: { fontSize: "1.05rem", fontWeight: 600 },
                    },
                  }}
                />

                <TextField
                  {...register("slug")}
                  label="URL Slug"
                  fullWidth
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Typography
                          sx={{
                            color: "text.disabled",
                            fontSize: "0.8rem",
                            mr: 0.5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          /blog/
                        </Typography>
                      ),
                    },
                  }}
                  helperText="Auto-generated from title — edit to customise"
                />

                <TextField
                  {...register("excerpt")}
                  label="Excerpt"
                  fullWidth
                  multiline
                  rows={2}
                  helperText={`${(watch("excerpt") ?? "").length} chars · Shown in listings (120–160 recommended)`}
                />

                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1 }}
                  >
                    Content *
                  </Typography>
                  <Controller
                    name="content"
                    control={control}
                    rules={{ required: "Content is required" }}
                    render={({ field }) => (
                      <RichEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Write your blog post here..."
                        minHeight={isMobile ? 280 : 400}
                      />
                    )}
                  />
                  {errors.content && (
                    <Typography
                      sx={{ fontSize: "0.72rem", color: "error.main", mt: 0.5 }}
                    >
                      {errors.content.message}
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* ── Right: settings (desktop only) ── */}
              {!isMobile && (
                <Grid
                  size={{ md: 4 }}
                  sx={{ p: 2.5, overflowY: "auto", height: "100%" }}
                >
                  <SettingsSidebar {...sidebarProps} />
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>

        {/* Dialog footer */}
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            gap: 1,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <Button
            onClick={() => setFormOpen(false)}
            variant="outlined"
            size="small"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="blog-form"
            variant="contained"
            size="small"
            disabled={submitLoading}
            startIcon={<PublishRounded sx={{ fontSize: 15 }} />}
          >
            {submitLoading ? "Saving…" : editPost ? "Update Post" : "Save Post"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Mobile settings drawer ── */}
      <Drawer
        anchor="bottom"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px 16px 0 0",
            maxHeight: "85vh",
            background: "#0D1B2A",
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            pt: 2,
            pb: 0.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
            Post Settings
          </Typography>
          <IconButton size="small" onClick={() => setSettingsOpen(false)}>
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 2.5, pb: 3, overflowY: "auto" }}>
          <SettingsSidebar {...sidebarProps} />
        </Box>
      </Drawer>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Post"
        message="Permanently delete this blog post? This cannot be undone."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </PageWrapper>
  );
}
