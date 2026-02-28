"use client";
import { useState, useCallback } from "react";
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Typography, Paper, Grid, Chip, Skeleton, Divider,
} from "@mui/material";
import {
  AddRounded, EditRounded, DeleteRounded, DragIndicatorRounded,
  VisibilityRounded, VisibilityOffRounded, ArticleRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { alpha } from "@mui/material";
import api from "@/lib/axios";
import PageWrapper from "@/components/layout/PageWrapper";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SearchBar from "@/components/ui/SearchBar";

const GOLD = "#C9A84C";

const PRESET_COLORS = [
  "#C9A84C", "#4CAF82", "#4A8FD4", "#E05C5C", "#E8A838",
  "#9B59B6", "#1ABC9C", "#E91E63", "#FF5722", "#00BCD4",
  "#6B8CAE", "#C97E4C", "#3F51B5", "#009688", "#795548",
];

const PRESET_ICONS = [
  "📝", "💡", "🌍", "🔬", "🎨", "💼", "📊", "🚀", "🎓", "❤️",
  "🔧", "📱", "🌱", "🏆", "🎯", "📰", "💰", "🧠", "🎭", "🔖",
  "✈️", "🍕", "🏋️", "🎬", "📸", "🎵", "🌸", "⚡", "🦋", "🌊",
];

// ── Types ──────────────────────────────────────────────────────────────────────
interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  post_count?: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface FormValues {
  name: string;
  description: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Box>
      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mb: 1, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Colour
      </Typography>
      <Box sx={{ display: "flex", gap: 0.7, flexWrap: "wrap", mb: 1.5 }}>
        {PRESET_COLORS.map((c) => (
          <Box key={c} onClick={() => onChange(c)}
            sx={{
              width: 28, height: 28, borderRadius: 1.5, cursor: "pointer", background: c,
              border: value === c ? "2.5px solid #fff" : "2.5px solid transparent",
              boxShadow: value === c ? `0 0 0 2px ${c}` : `0 2px 6px ${alpha(c, 0.3)}`,
              transition: "all 0.15s",
              "&:hover": { transform: "scale(1.2)" },
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ width: 22, height: 22, borderRadius: 1, background: value, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
        <TextField value={value} onChange={(e) => onChange(e.target.value)} size="small"
          placeholder="#C9A84C" sx={{ width: 130, "& .MuiOutlinedInput-root": { fontSize: "0.8rem" } }} />
      </Box>
    </Box>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (i: string) => void }) {
  return (
    <Box>
      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mb: 1, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Icon
      </Typography>
      <Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap" }}>
        {PRESET_ICONS.map((icon) => (
          <Box key={icon} onClick={() => onChange(icon)}
            sx={{
              width: 38, height: 38, borderRadius: 2, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem",
              background: value === icon ? alpha(GOLD, 0.22) : alpha("#fff", 0.04),
              border: `1.5px solid ${value === icon ? alpha(GOLD, 0.55) : "rgba(255,255,255,0.08)"}`,
              transition: "all 0.15s",
              "&:hover": { background: alpha(GOLD, 0.12), transform: "scale(1.1)" },
            }}
          >
            {icon}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function CategoryCard({ cat, onEdit, onDelete, onToggle }: {
  cat: BlogCategory;
  onEdit: (c: BlogCategory) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  return (
    <Reorder.Item value={cat} id={String(cat.id)} style={{ listStyle: "none" }}>
      <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
        <Paper sx={{
          px: 2.5, py: 2, mb: 1.5, borderRadius: 3,
          background: cat.is_active ? alpha("#1A2535", 0.85) : alpha("#111827", 0.7),
          border: `1px solid ${cat.is_active ? alpha(cat.color, 0.22) : "rgba(255,255,255,0.05)"}`,
          opacity: cat.is_active ? 1 : 0.6, transition: "all 0.25s",
          "&:hover": { border: `1px solid ${alpha(cat.color, 0.4)}`, boxShadow: `0 6px 28px ${alpha(cat.color, 0.12)}` },
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ cursor: "grab", color: "text.disabled", "&:active": { cursor: "grabbing" }, "&:hover": { color: alpha(cat.color, 0.7) } }}>
              <DragIndicatorRounded sx={{ fontSize: 22 }} />
            </Box>

            <Box sx={{
              width: 46, height: 46, borderRadius: 2.5, flexShrink: 0, fontSize: "1.45rem",
              background: `linear-gradient(135deg, ${alpha(cat.color, 0.28)}, ${alpha(cat.color, 0.08)})`,
              border: `1.5px solid ${alpha(cat.color, 0.35)}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px ${alpha(cat.color, 0.18)}`,
            }}>
              {cat.icon}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 0.4 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{cat.name}</Typography>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, boxShadow: `0 0 8px ${alpha(cat.color, 0.8)}` }} />
                {!cat.is_active && <Chip label="Hidden" size="small" sx={{ height: 18, fontSize: "0.6rem", background: alpha("#888", 0.1), color: "#888" }} />}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "0.73rem", color: "text.disabled", fontFamily: "monospace" }}>/{cat.slug}</Typography>
                {cat.description && (
                  <>
                    <Box sx={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                      {cat.description}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 2, flexShrink: 0, background: alpha(cat.color, 0.1), border: `1px solid ${alpha(cat.color, 0.22)}`, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: cat.color }}>{cat.post_count ?? 0}</Typography>
              <Typography sx={{ fontSize: "0.58rem", color: alpha(cat.color, 0.6) }}>posts</Typography>
            </Box>

            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, flexShrink: 0, background: alpha("#fff", 0.04), border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.disabled" }}>{cat.sort_order}</Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 0.4, flexShrink: 0 }}>
              <Tooltip title={cat.is_active ? "Hide from blog" : "Show on blog"}>
                <IconButton size="small" onClick={() => onToggle(cat.id, !cat.is_active)}
                  sx={{ width: 30, height: 30, color: cat.is_active ? "#4CAF82" : "text.disabled", "&:hover": { background: alpha("#4CAF82", 0.1), color: "#4CAF82" } }}>
                  {cat.is_active ? <VisibilityRounded sx={{ fontSize: 15 }} /> : <VisibilityOffRounded sx={{ fontSize: 15 }} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(cat)}
                  sx={{ width: 30, height: 30, "&:hover": { color: GOLD, background: alpha(GOLD, 0.08) } }}>
                  <EditRounded sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={cat.post_count ? `${cat.post_count} posts — reassign first` : "Delete"}>
                <span>
                  <IconButton size="small" onClick={() => !cat.post_count && onDelete(cat.id)}
                    disabled={!!cat.post_count}
                    sx={{ width: 30, height: 30, "&:hover": { color: "#E05C5C", background: alpha("#E05C5C", 0.08) } }}>
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BlogCategoriesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editCat, setEditCat] = useState<BlogCategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(GOLD);
  const [selectedIcon, setSelectedIcon] = useState("📝");
  const [localCats, setLocalCats] = useState<BlogCategory[]>([]);
  const [reorderSaving, setReorderSaving] = useState(false);

  const { data, isLoading, mutate } = useSWR<{ success: boolean; data: BlogCategory[] }>(
    "/admin/blog/categories",
    { onSuccess: (d) => { if (localCats.length === 0) setLocalCats(d?.data ?? []); } }
  );

  const allCats = localCats.length ? localCats : (data?.data ?? []);
  const filtered = search
    ? allCats.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug?.toLowerCase().includes(search.toLowerCase()))
    : allCats;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: "", description: "" },
  });

  const openCreate = () => {
    reset({ name: "", description: "" });
    setSelectedColor(GOLD);
    setSelectedIcon("📝");
    setEditCat(null);
    setFormOpen(true);
  };

  const openEdit = (cat: BlogCategory) => {
    reset({ name: cat.name, description: cat.description ?? "" });
    setSelectedColor(cat.color);
    setSelectedIcon(cat.icon);
    setEditCat(cat);
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitLoading(true);
    try {
      const payload = { ...values, color: selectedColor, icon: selectedIcon };
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
    } catch {
      enqueueSnackbar("Save failed", { variant: "error" });
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
    } catch {
      enqueueSnackbar("Delete failed — reassign posts first", { variant: "error" });
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const handleToggle = async (id: number, active: boolean) => {
    setLocalCats((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: active } : c)));
    try {
      await api.patch(`/admin/blog/categories/${id}/toggle`, { is_active: active });
      enqueueSnackbar(active ? "Category visible" : "Category hidden", { variant: "success" });
    } catch {
      enqueueSnackbar("Toggle failed", { variant: "error" });
      mutate();
    }
  };

  const handleReorder = async (newOrder: BlogCategory[]) => {
    setLocalCats(newOrder);
    setReorderSaving(true);
    try {
      await api.post("/admin/blog/categories/reorder", {
        order: newOrder.map((c, i) => ({ id: c.id, sort_order: i + 1 })),
      });
    } catch {
      enqueueSnackbar("Reorder save failed", { variant: "warning" });
    } finally {
      setReorderSaving(false);
    }
  };

  const totalPosts = allCats.reduce((s, c) => s + (c.post_count ?? 0), 0);
  const activeCount = allCats.filter((c) => c.is_active).length;

  return (
    <PageWrapper
      title="Blog Categories"
      subtitle={`${allCats.length} categories · ${totalPosts} posts total`}
      actions={
        <Button variant="contained" size="small" startIcon={<AddRounded />} onClick={openCreate}>
          New Category
        </Button>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total", value: allCats.length, color: GOLD },
          { label: "Active", value: activeCount, color: "#4CAF82" },
          { label: "Hidden", value: allCats.length - activeCount, color: "#6B8CAE" },
          { label: "Posts", value: totalPosts, color: "#4A8FD4" },
        ].map((s, i) => (
          <Grid size={{ xs: 6, md: 3 }} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Paper sx={{ p: 2, borderRadius: 2.5, textAlign: "center", background: alpha(s.color, 0.05), border: `1px solid ${alpha(s.color, 0.18)}` }}>
                <Typography sx={{ fontSize: "1.75rem", fontFamily: '"DM Serif Display", serif', color: s.color, lineHeight: 1, mb: 0.4 }}>{s.value}</Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{s.label}</Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <SearchBar placeholder="Search categories..." onSearch={useCallback((v: string) => setSearch(v), [])} />
        <Typography sx={{ fontSize: "0.73rem", color: "text.disabled", display: "flex", alignItems: "center", gap: 0.5 }}>
          <DragIndicatorRounded sx={{ fontSize: 14 }} />
          {reorderSaving ? "Saving order…" : "Drag to reorder · auto-saved"}
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 3, p: 2.5 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={78} sx={{ borderRadius: 3, mb: 1.5 }} />
          ))
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 10, textAlign: "center" }}>
            <ArticleRounded sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
            <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
              {search ? "No categories match" : "No blog categories yet"}
            </Typography>
            {!search && (
              <Button variant="outlined" size="small" startIcon={<AddRounded />} onClick={openCreate}>
                Create first category
              </Button>
            )}
          </Box>
        ) : (
          <Reorder.Group axis="y" values={filtered} onReorder={handleReorder} style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <AnimatePresence>
              {filtered.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} onEdit={openEdit} onDelete={setDeleteId} onToggle={handleToggle} />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </Paper>

      {/* Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{
              width: 42, height: 42, borderRadius: 2, fontSize: "1.3rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, ${alpha(selectedColor, 0.28)}, ${alpha(selectedColor, 0.08)})`,
              border: `1.5px solid ${alpha(selectedColor, 0.45)}`,
              transition: "all 0.2s",
            }}>
              {selectedIcon}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{editCat ? "Edit Category" : "New Blog Category"}</Typography>
              <Typography sx={{ fontSize: "0.74rem", color: "text.secondary" }}>Shown on blog listing and post pages</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box component="form" id="cat-form" onSubmit={handleSubmit(onSubmit)} sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 0.5 }}>
            <TextField
              {...register("name", { required: "Name is required" })}
              label="Category Name"
              fullWidth
              autoFocus
              error={!!errors.name}
              helperText={errors.name?.message ?? "Slug auto-generated from name"}
            />
            <TextField
              {...register("description")}
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              placeholder="Short description shown on category pages"
            />
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <ColorPicker value={selectedColor} onChange={setSelectedColor} />
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
            <Box sx={{ p: 2, borderRadius: 2.5, background: alpha(selectedColor, 0.05), border: `1px solid ${alpha(selectedColor, 0.2)}`, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center", background: alpha(selectedColor, 0.18), border: `1.5px solid ${alpha(selectedColor, 0.4)}` }}>
                {selectedIcon}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, color: selectedColor, fontSize: "0.88rem" }}>Live Preview</Typography>
                <Typography sx={{ fontSize: "0.74rem", color: "text.secondary" }}>How it looks on the blog</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)} variant="outlined" size="small">Cancel</Button>
          <Button type="submit" form="cat-form" variant="contained" size="small" disabled={submitLoading}>
            {submitLoading ? "Saving…" : editCat ? "Update" : "Create Category"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Category"
        message="Permanently delete this category? Posts using it will need reassignment."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </PageWrapper>
  );
}