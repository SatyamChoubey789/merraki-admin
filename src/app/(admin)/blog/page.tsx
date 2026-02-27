"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Typography, Paper, Chip, Divider,
  Select, MenuItem, FormControl, InputLabel,
  Accordion, AccordionSummary, AccordionDetails, Switch, FormControlLabel,
  Skeleton,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  AddRounded, EditRounded, DeleteRounded, PublishRounded,
  ExpandMoreRounded, ImageRounded, SearchRounded,
  LinkRounded, TagRounded, StarRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm, Controller } from "react-hook-form";
import { alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import StatusChip from "@/components/ui/StatusChip";
import SearchBar from "@/components/ui/SearchBar";
import RichEditor from "@/components/editor/RichEditor";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";

const GOLD = "#C9A84C";

// ── Types (snake_case to match Go API) ────────────────────────────────────────
interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  featured_image_url?: string;  // response field name
  tags?: string[];
  status: "draft" | "published";
  meta_title?: string;
  meta_description?: string;
  views_count?: number;
  reading_time_minutes?: number;
  author_id?: number;
  is_featured?: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  success: boolean;
  data: BlogPost[] | null;
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface BlogFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;    // sent as cover_image, stored as featured_image_url
  is_featured: boolean;
  status: "draft" | "published";
  tags: string;           // comma-separated → string[] on submit
  meta_title: string;
  meta_description: string;
  og_image: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ── SEO Score ─────────────────────────────────────────────────────────────────
function SeoScore({ title, description, slug }: { title?: string; description?: string; slug?: string }) {
  const checks = [
    { label: "Title length (50–60 chars)", pass: (title?.length ?? 0) >= 50 && (title?.length ?? 0) <= 60 },
    { label: "Description (120–160 chars)", pass: (description?.length ?? 0) >= 120 && (description?.length ?? 0) <= 160 },
    { label: "Slug set", pass: !!slug?.trim() },
    { label: "No special chars in slug", pass: /^[a-z0-9-]*$/.test(slug ?? "") },
  ];
  const score = checks.filter((c) => c.pass).length;
  const color = score === 4 ? "#4CAF82" : score >= 2 ? GOLD : "#E05C5C";

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>SEO Score</Typography>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color }}>{score}/4</Typography>
      </Box>
      {checks.map((c) => (
        <Box key={c.label} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.6 }}>
          <Box sx={{
            width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
            background: c.pass ? alpha("#4CAF82", 0.15) : alpha("#E05C5C", 0.12),
            border: `1.5px solid ${c.pass ? "#4CAF82" : "#E05C5C"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: c.pass ? "#4CAF82" : "#E05C5C" }} />
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: c.pass ? "text.secondary" : "rgba(240,87,87,0.7)" }}>
            {c.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BlogPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState("");
  const [readingTime, setReadingTime] = useState(0);

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(0); }, []);

  // ── Data — correct endpoint: /admin/blog/posts ─────────────────────────────
  const { data, isLoading, mutate } = useSWR<PaginatedResponse>(
    `/admin/blog/posts?page=${page + 1}&limit=20` +
    (statusFilter ? `&status=${statusFilter}` : "") +
    (search ? `&search=${encodeURIComponent(search)}` : ""),
  );

  // null-safe: API returns null when empty
  const posts: BlogPost[] = data?.data ?? [];
  const total: number = data?.pagination?.total ?? 0;

  // ── Form ───────────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors, isDirty },
  } = useForm<BlogFormValues>({
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      cover_image: "",
      is_featured: false,
      status: "draft",
      tags: "",
      meta_title: "",
      meta_description: "",
      og_image: "",
    },
  });

  const watchTitle     = watch("title");
  const watchContent   = watch("content");
  const watchSlug      = watch("slug");
  const watchMetaTitle = watch("meta_title");
  const watchMetaDesc  = watch("meta_description");
  const watchCover     = watch("cover_image");
  const watchStatus    = watch("status");

  // Auto slug from title (create only)
  useEffect(() => {
    if (watchTitle && !editPost) setValue("slug", toSlug(watchTitle));
  }, [watchTitle, editPost, setValue]);

  // Cover preview
  useEffect(() => { setCoverPreview(watchCover ?? ""); }, [watchCover]);

  // Reading time
  useEffect(() => { setReadingTime(estimateReadingTime(watchContent ?? "")); }, [watchContent]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    reset({
      title: "", slug: "", excerpt: "", content: "",
      cover_image: "", is_featured: false, status: "draft",
      tags: "", meta_title: "", meta_description: "", og_image: "",
    });
    setEditPost(null);
    setFormOpen(true);
  }, [reset]);

  const openEdit = useCallback((post: BlogPost) => {
    reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      cover_image: post.featured_image_url ?? "",  // response uses featured_image_url
      is_featured: post.is_featured ?? false,
      status: post.status,
      tags: post.tags?.join(", ") ?? "",
      meta_title: post.meta_title ?? "",
      meta_description: post.meta_description ?? "",
      og_image: "",
    });
    setEditPost(post);
    setFormOpen(true);
  }, [reset]);

  const onSubmit = async (formData: BlogFormValues) => {
    setSubmitLoading(true);
    try {
      const payload = {
        title: formData.title,
        slug: formData.slug?.trim() || toSlug(formData.title),
        excerpt: formData.excerpt,
        content: formData.content,
        cover_image: formData.cover_image,
        is_featured: formData.is_featured,
        status: formData.status,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        og_image: formData.og_image,
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
    } catch {
      enqueueSnackbar("Save failed", { variant: "error" });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePublish = async (post: BlogPost) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      await api.put(`/admin/blog/posts/${post.id}`, {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        content: post.content ?? "",
        cover_image: post.featured_image_url ?? "",
        is_featured: post.is_featured ?? false,
        status: newStatus,
        tags: post.tags ?? [],
        meta_title: post.meta_title ?? "",
        meta_description: post.meta_description ?? "",
        og_image: "",
      });
      enqueueSnackbar(
        newStatus === "published" ? "Post published" : "Post unpublished",
        { variant: "success" },
      );
      await mutate();
    } catch {
      enqueueSnackbar("Failed to update status", { variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/blog/posts/${deleteId}`);
      enqueueSnackbar("Post deleted", { variant: "success" });
      setDeleteId(null);
      await mutate();
    } catch {
      enqueueSnackbar("Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
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
              sx={{ width: 48, height: 36, borderRadius: 1.5, objectFit: "cover", flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Box sx={{
              width: 48, height: 36, borderRadius: 1.5, flexShrink: 0,
              background: alpha(GOLD, 0.08), border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ImageRounded sx={{ fontSize: 16, color: "text.disabled" }} />
            </Box>
          )}
          <Box minWidth={0}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                {row.title}
              </Typography>
              {row.is_featured && (
                <Tooltip title="Featured">
                  <StarRounded sx={{ fontSize: 13, color: GOLD, flexShrink: 0 }} />
                </Tooltip>
              )}
            </Box>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.1 }}>
              /{row.slug}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: "reading_time_minutes",
      label: "Read",
      render: (row) => (
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
          {row.reading_time_minutes ?? estimateReadingTime(row.content ?? "")} min
        </Typography>
      ),
    },
    {
      key: "tags",
      label: "Tags",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {(row.tags ?? []).slice(0, 2).map((tag) => (
            <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: "0.68rem", background: alpha("#fff", 0.06) }} />
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
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            {row.published_at
              ? dayjs(row.published_at).format("MMM D, YYYY")
              : dayjs(row.created_at).format("MMM D, YYYY")}
          </Typography>
          {row.published_at && (
            <Typography sx={{ fontSize: "0.68rem", color: "#4CAF82" }}>Published</Typography>
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
              onClick={() => handlePublish(row)}
              sx={{ "&:hover": { color: row.status === "published" ? "#E8A838" : "#4CAF82" } }}
            >
              <PublishRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleteId(row.id)} sx={{ "&:hover": { color: "#E05C5C" } }}>
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
      title="Blog"
      subtitle={isLoading ? "Loading…" : `${total.toLocaleString()} post${total !== 1 ? "s" : ""}`}
      actions={
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate}>
          New Post
        </Button>
      }
    >
      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <SearchBar placeholder="Search posts…" onSearch={handleSearch} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            sx={{ borderRadius: 3 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="published">Published</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={posts}
          loading={false}
          page={page}
          rowsPerPage={20}
          total={total}
          onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          getRowId={(r) => String(r.id)}
          emptyMessage="No blog posts yet — create your first post"
        />
      )}

      {/* ── Editor Dialog ── */}
      <Dialog
        open={formOpen}
        onClose={() => !submitLoading && setFormOpen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: { maxWidth: 1100, height: "92vh", m: { xs: 1, sm: 2 }, display: "flex", flexDirection: "column" },
        }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 600 }}>
              {editPost ? `Edit: ${editPost.title}` : "New Blog Post"}
            </Typography>
            {readingTime > 0 && (
              <Chip
                label={`~${readingTime} min read`}
                size="small"
                sx={{ background: alpha(GOLD, 0.12), color: GOLD, border: `1px solid ${alpha(GOLD, 0.25)}` }}
              />
            )}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ overflow: "auto", flex: 1 }}>
          <Box component="form" id="blog-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Grid container spacing={3}>
              {/* Left: editor */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField
                    {...register("title", { required: "Title is required" })}
                    label="Post Title"
                    fullWidth
                    autoFocus
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    inputProps={{ style: { fontSize: "1.1rem", fontWeight: 600 } }}
                  />

                  <TextField
                    {...register("slug")}
                    label="URL Slug"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <Typography sx={{ color: "text.disabled", fontSize: "0.85rem", mr: 0.5 }}>/blog/</Typography>
                      ),
                    }}
                    helperText={
                      watchTitle
                        ? `Preview: /blog/${watchSlug || toSlug(watchTitle)}`
                        : "Auto-generated from title"
                    }
                  />

                  <TextField
                    {...register("excerpt")}
                    label="Excerpt"
                    fullWidth
                    multiline
                    rows={2}
                    helperText="Short description for post listings (120–160 chars recommended)"
                  />

                  <Box>
                    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1 }}>Content</Typography>
                    <Controller
                      name="content"
                      control={control}
                      render={({ field }) => (
                        <RichEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Write your blog post here…"
                          minHeight={400}
                        />
                      )}
                    />
                  </Box>
                </Box>
              </Grid>

              {/* Right: settings */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Publish settings */}
                  <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
                    <Typography sx={{ fontWeight: 600, mb: 2, fontSize: "0.875rem" }}>Publish Settings</Typography>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                          <InputLabel>Status</InputLabel>
                          <Select {...field} label="Status">
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="published">Published</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                    <Controller
                      name="is_featured"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                              size="small"
                              sx={{ "& .Mui-checked": { color: GOLD }, "& .Mui-checked + .MuiSwitch-track": { background: alpha(GOLD, 0.4) } }}
                            />
                          }
                          label={<Typography sx={{ fontSize: "0.84rem" }}>Featured post</Typography>}
                        />
                      )}
                    />
                  </Paper>

                  {/* Cover image */}
                  <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
                    <Typography sx={{ fontWeight: 600, mb: 1.5, fontSize: "0.875rem" }}>Cover Image</Typography>
                    <TextField
                      {...register("cover_image")}
                      label="Image URL"
                      fullWidth
                      size="small"
                      placeholder="https://…"
                      InputProps={{
                        startAdornment: <ImageRounded sx={{ fontSize: 16, mr: 0.75, color: "text.disabled" }} />,
                      }}
                    />
                    {coverPreview && (
                      <Box
                        component="img"
                        src={coverPreview}
                        sx={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 2, mt: 1.5 }}
                        onError={() => setCoverPreview("")}
                      />
                    )}
                  </Paper>

                  {/* Tags */}
                  <Paper sx={{ p: 2.5, borderRadius: 2.5 }}>
                    <Typography sx={{ fontWeight: 600, mb: 1.5, fontSize: "0.875rem" }}>Tags</Typography>
                    <TextField
                      {...register("tags")}
                      label="Tags"
                      fullWidth
                      size="small"
                      placeholder="react, tutorial, css"
                      helperText="Comma-separated"
                      InputProps={{
                        startAdornment: <TagRounded sx={{ fontSize: 16, mr: 0.75, color: "text.disabled" }} />,
                      }}
                    />
                  </Paper>

                  {/* SEO */}
                  <Paper sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                    <Accordion sx={{ background: "transparent", boxShadow: "none" }} defaultExpanded={false}>
                      <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ px: 2.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <SearchRounded sx={{ fontSize: 17, color: "text.secondary" }} />
                          <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>SEO Settings</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 2.5, pb: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
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
                          {...register("og_image")}
                          label="OG Image URL"
                          fullWidth
                          size="small"
                          placeholder="Social share image (defaults to cover)"
                          InputProps={{
                            startAdornment: <LinkRounded sx={{ fontSize: 16, mr: 0.75, color: "text.disabled" }} />,
                          }}
                        />
                        <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
                        <SeoScore
                          title={watchMetaTitle || watch("title")}
                          description={watchMetaDesc || watch("excerpt")}
                          slug={watchSlug}
                        />
                      </AccordionDetails>
                    </Accordion>
                  </Paper>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Button onClick={() => setFormOpen(false)} variant="outlined" size="small" disabled={submitLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="blog-form"
            variant="contained"
            size="small"
            disabled={submitLoading || (!isDirty && !!editPost)}
            startIcon={<PublishRounded sx={{ fontSize: 16 }} />}
          >
            {submitLoading ? "Saving…" : editPost ? "Update Post" : "Save Post"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Post"
        message="Permanently delete this blog post? This cannot be undone."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}