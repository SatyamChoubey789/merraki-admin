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
  Grid,
  Chip,
  Skeleton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  DragIndicatorRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  ArticleRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { alpha } from "@mui/material";
import api from "@/lib/axios";
import PageWrapper from "@/components/layout/PageWrapper";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SearchBar from "@/components/ui/SearchBar";

const GOLD = "#C9A84C";

// ── Types matching Go backend ─────────────────────────────────────────────────
interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  post_count?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
}

const schema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().optional(),
  parent_id: z.coerce.number().optional().catch(undefined),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Category Card ─────────────────────────────────────────────────────────────
function CategoryCard({
  cat,
  allCats,
  onEdit,
  onDelete,
  onToggle,
}: {
  cat: BlogCategory;
  allCats: BlogCategory[];
  onEdit: (c: BlogCategory) => void;
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
        transition={{ duration: 0.2 }}
      >
        <Paper
          sx={{
            px: 2.5,
            py: 2,
            mb: 1.5,
            borderRadius: 3,
            background: cat.is_active
              ? alpha("#1A2535", 0.85)
              : alpha("#111827", 0.7),
            border: `1px solid ${cat.is_active ? alpha(GOLD, 0.15) : "rgba(255,255,255,0.05)"}`,
            opacity: cat.is_active ? 1 : 0.6,
            "&:hover": {
              border: `1px solid ${alpha(GOLD, 0.3)}`,
              boxShadow: `0 4px 20px ${alpha(GOLD, 0.08)}`,
            },
            transition: "all 0.2s",
            ml: cat.parent_id ? 3 : 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                cursor: "grab",
                color: "text.disabled",
                "&:active": { cursor: "grabbing" },
                "&:hover": { color: alpha(GOLD, 0.7) },
              }}
            >
              <DragIndicatorRounded sx={{ fontSize: 22 }} />
            </Box>

            <Box
              sx={{
                width: 32,
                height: 32,
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
                sx={{ fontSize: "0.75rem", fontWeight: 700, color: GOLD }}
              >
                {cat.display_order}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
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
                    fontSize: "0.73rem",
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
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "text.secondary",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 260,
                      }}
                    >
                      {cat.description}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

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
                {cat.post_count ?? 0}
              </Typography>
              <Typography sx={{ fontSize: "0.58rem", color: alpha(GOLD, 0.6) }}>
                posts
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 0.4, flexShrink: 0 }}>
              <Tooltip title={cat.is_active ? "Hide" : "Make visible"}>
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
                  sx={{ width: 30, height: 30 }}
                >
                  <EditRounded sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={
                  cat.post_count
                    ? `${cat.post_count} posts — cannot delete`
                    : "Delete"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={!!cat.post_count}
                    onClick={() => !cat.post_count && onDelete(cat.id)}
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function BlogCategoriesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editCat, setEditCat] = useState<BlogCategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [localCats, setLocalCats] = useState<BlogCategory[]>([]);

  // ✅ FIXED: Correct endpoint
  const { data, isLoading, mutate } = useSWR<ApiResponse<BlogCategory>>(
    "/admin/blog/categories",
    {
      onSuccess: (d) => {
        if (localCats.length === 0) setLocalCats(d?.data ?? []);
      },
    }
  );

  const allCats = localCats.length ? localCats : (data?.data ?? []);
  const filtered = search
    ? allCats.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug?.includes(search.toLowerCase())
      )
    : allCats;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", parent_id: undefined, is_active: true },
  });

  const openCreate = () => {
    reset({ name: "", description: "", is_active: true });
    setEditCat(null);
    setFormOpen(true);
  };

  const openEdit = (cat: BlogCategory) => {
    reset({
      name: cat.name,
      description: cat.description ?? "",
      parent_id: cat.parent_id ?? undefined,
      is_active: cat.is_active,
    });
    setEditCat(cat);
    setFormOpen(true);
  };

  // ✅ FIXED: Match backend API
  const onSubmit = async (values: FormData) => {
    setSubmitLoading(true);
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        parent_id: values.parent_id || undefined,
        is_active: values.is_active ?? true,
      };

      if (editCat) {
        await api.put(`/admin/blog/categories/${editCat.id}`, payload);
        enqueueSnackbar("Category updated", { variant: "success" });
      } else {
        await api.post("/admin/blog/categories", payload);
        enqueueSnackbar("Category created", { variant: "success" });
      }
      mutate();
      setLocalCats([]);
      setFormOpen(false);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? "Save failed", {
        variant: "error",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/blog/categories/${deleteId}`);
      enqueueSnackbar("Category deleted", { variant: "success" });
      setLocalCats((prev) => prev.filter((c) => c.id !== deleteId));
      mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? "Delete failed", {
        variant: "error",
      });
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const handleToggle = async (id: number, active: boolean) => {
    setLocalCats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: active } : c))
    );
    try {
      const cat = allCats.find((c) => c.id === id);
      if (cat) {
        await api.put(`/admin/blog/categories/${id}`, {
          ...cat,
          is_active: active,
        });
        enqueueSnackbar(active ? "Category visible" : "Category hidden", {
          variant: "success",
        });
      }
    } catch {
      enqueueSnackbar("Toggle failed", { variant: "error" });
      mutate();
    }
  };

  const handleReorder = async (newOrder: BlogCategory[]) => {
    const updated = newOrder.map((c, i) => ({ ...c, display_order: i + 1 }));
    setLocalCats(updated);

    try {
      // Update each category's display_order
      await Promise.all(
        updated.map((c) =>
          api.put(`/admin/blog/categories/${c.id}`, {
            ...c,
            display_order: c.display_order,
          })
        )
      );
    } catch {
      enqueueSnackbar("Reorder save failed", { variant: "warning" });
    }
  };

  const totalPosts = allCats.reduce((s, c) => s + (c.post_count ?? 0), 0);
  const activeCount = allCats.filter((c) => c.is_active).length;
  const topLevel = allCats.filter((c) => !c.parent_id).length;

  return (
    <PageWrapper
      title="Blog Categories"
      subtitle={`${allCats.length} categories · ${totalPosts} posts total`}
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
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total", value: allCats.length, color: GOLD },
          { label: "Active", value: activeCount, color: "#4CAF82" },
          { label: "Top-level", value: topLevel, color: "#4A8FD4" },
          { label: "Posts", value: totalPosts, color: "#9B59B6" },
        ].map((s, i) => (
          <Grid size={{ xs: 6, md: 3 }} key={s.label}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
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
                  {s.value}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                  {s.label}
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2 }}>
        <SearchBar
          placeholder="Search categories..."
          onSearch={useCallback((v: string) => setSearch(v), [])}
        />
      </Box>

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
            <ArticleRounded sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
            <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
              {search ? "No categories match" : "No categories yet"}
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

      {/* Form Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle>
          <Typography sx={{ fontWeight: 600 }}>
            {editCat ? "Edit Category" : "New Category"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="cat-form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 0.5 }}
          >
            <TextField
              {...register("name")}
              label="Category Name *"
              fullWidth
              autoFocus
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <TextField
              {...register("description")}
              label="Description"
              fullWidth
              multiline
              rows={2}
            />

            <Controller
              name="parent_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Parent Category</InputLabel>
                  <Select
                    {...field}
                    value={field.value ?? ""}
                    label="Parent Category"
                  >
                    <MenuItem value="">None</MenuItem>
                    {allCats
                      .filter((c) => !editCat || c.id !== editCat.id)
                      .filter((c) => !c.parent_id)
                      .map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Visible on blog"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            type="submit"
            form="cat-form"
            variant="contained"
            disabled={submitLoading}
          >
            {submitLoading ? "Saving…" : editCat ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Category"
        message="Permanently delete this category?"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </PageWrapper>
  );
}