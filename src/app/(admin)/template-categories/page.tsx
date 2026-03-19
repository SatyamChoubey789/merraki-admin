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
  Typography,
  Paper,
  Chip,
  Skeleton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  DragIndicatorRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  CategoryRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { alpha } from "@mui/material/styles";
import api from "@/lib/axios";
import PageWrapper from "@/components/layout/PageWrapper";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SearchBar from "@/components/ui/SearchBar";

const GOLD = "#C9A84C";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  display_order: number;
  is_active: boolean;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
  // Joined — may be included by backend
  template_count?: number;
}

// Handler returns: { "categories": Category[] }
interface ApiResponse {
  categories: Category[] | null;
}

interface FormValues {
  name: string;
  slug: string;
  description: string;
  meta_title: string;
  meta_description: string;
  is_active: boolean;
}

const DEFAULT_FORM: FormValues = {
  name: "",
  slug: "",
  description: "",
  meta_title: "",
  meta_description: "",
  is_active: true,
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

// ── Category row card ─────────────────────────────────────────────────────────
function CategoryCard({
  cat,
  allCats,
  onEdit,
  onDelete,
  onToggle,
}: {
  cat: Category;
  allCats: Category[];
  onEdit: (c: Category) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const parent = cat.parent_id
    ? allCats.find((c) => c.id === cat.parent_id)
    : null;

  return (
    <Reorder.Item value={cat} id={String(cat.id)} style={{ listStyle: "none" }}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
      >
        <Paper
          sx={{
            px: 2.5,
            py: 2,
            mb: 1.5,
            borderRadius: 3,
            background: cat.is_active
              ? alpha("#1A2535", 0.9)
              : alpha("#111827", 0.7),
            border: `1px solid ${cat.is_active ? alpha(GOLD, 0.18) : "rgba(255,255,255,0.05)"}`,
            opacity: cat.is_active ? 1 : 0.6,
            transition: "all 0.2s",
            "&:hover": {
              border: `1px solid ${alpha(GOLD, 0.35)}`,
              boxShadow: `0 4px 20px ${alpha(GOLD, 0.08)}`,
            },
            // Indent child categories visually
            ml: cat.parent_id ? 4 : 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Drag handle */}
            <Box
              sx={{
                cursor: "grab",
                color: "text.disabled",
                flexShrink: 0,
                "&:active": { cursor: "grabbing" },
                "&:hover": { color: alpha(GOLD, 0.7) },
              }}
            >
              <DragIndicatorRounded sx={{ fontSize: 22 }} />
            </Box>

            {/* Order badge */}
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1.5,
                flexShrink: 0,
                background: alpha(GOLD, 0.08),
                border: `1px solid ${alpha(GOLD, 0.18)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{ fontSize: "0.72rem", fontWeight: 700, color: GOLD }}
              >
                {cat.display_order}
              </Typography>
            </Box>

            {/* Name + meta */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 0.3,
                  flexWrap: "wrap",
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  {cat.name}
                </Typography>
                {parent && (
                  <Chip
                    label={`↳ ${parent.name}`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.62rem",
                      background: alpha("#4A8FD4", 0.1),
                      color: "#4A8FD4",
                    }}
                  />
                )}
                {!cat.is_active && (
                  <Chip
                    label="Hidden"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      background: alpha("#888", 0.1),
                      color: "#888",
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    color: "text.disabled",
                    fontFamily: "monospace",
                  }}
                >
                  /{cat.slug}
                </Typography>
                {cat.description && (
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
                        fontSize: "0.74rem",
                        color: "text.secondary",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: { xs: 140, sm: 260 },
                      }}
                    >
                      {cat.description}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            {/* Template count — shown if backend provides it */}
            {cat.template_count !== undefined && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  flexShrink: 0,
                  background: alpha(GOLD, 0.08),
                  border: `1px solid ${alpha(GOLD, 0.18)}`,
                  textAlign: "center",
                }}
              >
                <Typography
                  sx={{ fontSize: "0.82rem", fontWeight: 700, color: GOLD }}
                >
                  {cat.template_count}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.58rem", color: alpha(GOLD, 0.6) }}
                >
                  templates
                </Typography>
              </Box>
            )}

            {/* Actions */}
            <Box sx={{ display: "flex", gap: 0.4, flexShrink: 0 }}>
              <Tooltip
                title={
                  cat.is_active ? "Hide from storefront" : "Show on storefront"
                }
              >
                <IconButton
                  size="small"
                  onClick={() => onToggle(cat.id, !cat.is_active)}
                  sx={{
                    width: 30,
                    height: 30,
                    color: cat.is_active ? "#4CAF82" : "text.disabled",
                    "&:hover": {
                      background: alpha("#4CAF82", 0.1),
                      color: "#4CAF82",
                    },
                  }}
                >
                  {cat.is_active ? (
                    <VisibilityRounded sx={{ fontSize: 15 }} />
                  ) : (
                    <VisibilityOffRounded sx={{ fontSize: 15 }} />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={() => onEdit(cat)}
                  sx={{
                    width: 30,
                    height: 30,
                    "&:hover": { color: GOLD, background: alpha(GOLD, 0.08) },
                  }}
                >
                  <EditRounded sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={
                  cat.template_count
                    ? `${cat.template_count} templates — reassign first`
                    : "Delete"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={!!cat.template_count}
                    onClick={() => !cat.template_count && onDelete(cat.id)}
                    sx={{
                      width: 30,
                      height: 30,
                      "&:hover": {
                        color: "#E05C5C",
                        background: alpha("#E05C5C", 0.08),
                      },
                    }}
                  >
                    <DeleteRounded sx={{ fontSize: 15 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      </motion.div>
    </Reorder.Item>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TemplateCategoriesPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [localCats, setLocalCats] = useState<Category[]>([]);
  const [reorderSaving, setReorderSaving] = useState(false);

  // ── Data — GET /admin/categories ──────────────────────────────────────────
  const { data, isLoading, mutate } = useSWR<ApiResponse>("/admin/categories", {
    onSuccess: (d) => {
      if (localCats.length === 0) {
        setLocalCats(d?.categories ?? []);
      }
    },
  });

  const allCats: Category[] = localCats.length
    ? localCats
    : (data?.categories ?? []);

  const filtered = search
    ? allCats.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : allCats;

  const activeCount = allCats.filter((c) => c.is_active).length;
  const topLevelCount = allCats.filter((c) => !c.parent_id).length;

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_FORM });

  const watchedName = watch("name");
  const watchedSlug = watch("slug");
  const watchedIsActive = watch("is_active");

  const openCreate = useCallback(() => {
    reset(DEFAULT_FORM);
    setEditCat(null);
    setFormOpen(true);
  }, [reset]);

  const openEdit = useCallback(
    (cat: Category) => {
      reset({
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? "",
        meta_title: cat.meta_title ?? "",
        meta_description: cat.meta_description ?? "",
        is_active: cat.is_active,
      });
      setEditCat(cat);
      setFormOpen(true);
    },
    [reset],
  );

  // ── Submit — POST /admin/categories or PUT /admin/categories/:id ──────────
  const onSubmit = async (values: FormValues) => {
    setSubmitLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim() || toSlug(values.name),
        description: values.description || null,
        meta_title: values.meta_title || null,
        meta_description: values.meta_description || null,
        is_active: values.is_active,
        display_order: editCat
          ? editCat.display_order
          : Math.max(0, ...allCats.map((c) => c.display_order)) + 1,
      };

      if (editCat) {
        await api.put(`/admin/categories/${editCat.id}`, payload);
        enqueueSnackbar("Category updated", { variant: "success" });
      } else {
        await api.post("/admin/categories", payload);
        enqueueSnackbar("Category created", { variant: "success" });
      }

      setLocalCats([]);
      await mutate();
      setFormOpen(false);
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? "Save failed";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Delete — DELETE /admin/categories/:id ─────────────────────────────────
  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/categories/${deleteId}`);
      enqueueSnackbar("Category deleted", { variant: "success" });
      setLocalCats((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Delete failed", {
        variant: "error",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Toggle visibility — PUT /admin/categories/:id ─────────────────────────
  // Backend has no dedicated toggle endpoint — use the update endpoint
  const handleToggle = async (id: number, active: boolean) => {
    setLocalCats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: active } : c)),
    );
    try {
      const cat = allCats.find((c) => c.id === id);
      if (!cat) return;
      await api.put(`/admin/categories/${id}`, {
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? null,
        meta_title: cat.meta_title ?? null,
        meta_description: cat.meta_description ?? null,
        display_order: cat.display_order,
        is_active: active,
      });
      enqueueSnackbar(active ? "Category visible" : "Category hidden", {
        variant: "success",
      });
    } catch {
      // Revert optimistic update
      setLocalCats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !active } : c)),
      );
      enqueueSnackbar("Toggle failed", { variant: "error" });
    }
  };

  // ── Reorder — no dedicated endpoint, save display_order per item ──────────
  const handleReorder = async (newOrder: Category[]) => {
    const updated = newOrder.map((c, i) => ({ ...c, display_order: i + 1 }));
    setLocalCats(updated);
    setReorderSaving(true);
    try {
      await Promise.all(
        updated.map((c) =>
          api.put(`/admin/categories/${c.id}`, {
            name: c.name,
            slug: c.slug,
            description: c.description ?? null,
            meta_title: c.meta_title ?? null,
            meta_description: c.meta_description ?? null,
            display_order: c.display_order,
            is_active: c.is_active,
          }),
        ),
      );
    } catch {
      enqueueSnackbar("Reorder save failed", { variant: "warning" });
    } finally {
      setReorderSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Template Categories"
      subtitle={
        isLoading
          ? "Loading…"
          : `${allCats.length} categor${allCats.length !== 1 ? "ies" : "y"}`
      }
      actions={
        <Button
          variant="contained"
          size="small"
          startIcon={<AddRounded />}
          onClick={openCreate}
        >
          New Category
        </Button>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total", value: allCats.length, color: GOLD },
          { label: "Active", value: activeCount, color: "#4CAF82" },
          {
            label: "Hidden",
            value: allCats.length - activeCount,
            color: "#6B8CAE",
          },
          { label: "Top-level", value: topLevelCount, color: "#4A8FD4" },
        ].map((s, i) => (
          <Grid size={{ xs: 6, md: 3 }} key={s.label}>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  textAlign: "center",
                  background: alpha(s.color, 0.05),
                  border: `1px solid ${alpha(s.color, 0.18)}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.75rem",
                    fontFamily: '"DM Serif Display", serif',
                    color: s.color,
                    lineHeight: 1,
                    mb: 0.4,
                  }}
                >
                  {isLoading ? "—" : s.value}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                >
                  {s.label}
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Search + hint */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <SearchBar
          placeholder="Search categories…"
          onSearch={useCallback((v: string) => setSearch(v), [])}
        />
        <Typography
          sx={{
            fontSize: "0.72rem",
            color: "text.disabled",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          <DragIndicatorRounded sx={{ fontSize: 14 }} />
          {reorderSaving ? "Saving order…" : "Drag to reorder"}
        </Typography>
      </Box>

      {/* List */}
      <Paper sx={{ borderRadius: 3, p: 2.5 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={72}
              sx={{ borderRadius: 3, mb: 1.5 }}
            />
          ))
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 10, textAlign: "center" }}>
            <CategoryRounded
              sx={{ fontSize: 48, color: "text.disabled", mb: 2 }}
            />
            <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
              {search ? "No categories match your search" : "No categories yet"}
            </Typography>
            {!search && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddRounded />}
                onClick={openCreate}
              >
                Create first category
              </Button>
            )}
          </Box>
        ) : (
          <Reorder.Group
            axis="y"
            values={filtered}
            onReorder={handleReorder}
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            <AnimatePresence>
              {filtered.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  allCats={allCats}
                  onEdit={openEdit}
                  onDelete={setDeleteId}
                  onToggle={handleToggle}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </Paper>

      {/* ── Create / Edit dialog ── */}
      <Dialog
        open={formOpen}
        onClose={() => !submitLoading && setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Typography sx={{ fontWeight: 600 }}>
            {editCat ? `Edit: ${editCat.name}` : "New Category"}
          </Typography>
          <Typography
            sx={{ fontSize: "0.74rem", color: "text.secondary", mt: 0.25 }}
          >
            {editCat ? `/${editCat.slug}` : "Appears in the template browser"}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box
            component="form"
            id="cat-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 0.5 }}
          >
            {/* Name */}
            <TextField
              {...register("name", { required: "Name is required" })}
              label="Category Name *"
              fullWidth
              autoFocus
              error={!!errors.name}
              helperText={
                errors.name?.message ?? "Slug is auto-generated from name"
              }
              onChange={(e) => {
                setValue("name", e.target.value);
                if (!editCat) {
                  setValue("slug", toSlug(e.target.value), {
                    shouldDirty: true,
                  });
                }
              }}
            />

            {/* Slug */}
            <TextField
              {...register("slug")}
              label="Slug"
              fullWidth
              size="small"
              placeholder="auto-generated"
              helperText={`URL: /templates/${watchedSlug || (watchedName ? toSlug(watchedName) : "{slug}")}`}
            />

            {/* Description */}
            <TextField
              {...register("description")}
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              placeholder="Short description shown to users"
            />

            {/* SEO */}
            <TextField
              {...register("meta_title")}
              label="Meta Title (optional)"
              fullWidth
              size="small"
              helperText={`${(watch("meta_title") ?? "").length}/200 chars`}
            />
            <TextField
              {...register("meta_description")}
              label="Meta Description (optional)"
              fullWidth
              size="small"
              multiline
              rows={2}
            />

            {/* Active toggle */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.75,
                borderRadius: 2,
                background: alpha("#fff", 0.03),
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Box>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  Visible on storefront
                </Typography>
                <Typography
                  sx={{ fontSize: "0.73rem", color: "text.secondary" }}
                >
                  Category shows in template browser and filters
                </Typography>
              </Box>
              <Switch
                checked={watchedIsActive}
                onChange={(e) => setValue("is_active", e.target.checked)}
                sx={{
                  "& .Mui-checked": { color: GOLD },
                  "& .Mui-checked + .MuiSwitch-track": {
                    background: alpha(GOLD, 0.45),
                  },
                }}
              />
            </Box>
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
            form="cat-form"
            variant="contained"
            size="small"
            disabled={submitLoading}
          >
            {submitLoading
              ? "Saving…"
              : editCat
                ? "Update Category"
                : "Create Category"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Category"
        message="Permanently delete this category? Templates in it will become uncategorised."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}
