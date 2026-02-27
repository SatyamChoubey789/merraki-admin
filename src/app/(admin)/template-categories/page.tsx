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
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  DragIndicatorRounded,
  VisibilityRounded,
  VisibilityOffRounded,
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

// ── Constants ──────────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";

const PRESET_COLORS = [
  "#C9A84C", "#4CAF82", "#4A8FD4", "#E05C5C", "#E8A838",
  "#9B59B6", "#1ABC9C", "#E91E63", "#FF5722", "#00BCD4",
  "#6B8CAE", "#C97E4C", "#3F51B5", "#009688", "#795548",
];

const PRESET_ICONS = [
  "📄", "📊", "💼", "🎨", "📝", "📋", "🖼️", "📈", "💡", "🔧",
  "📱", "🎯", "🏆", "💰", "📌", "🌐", "✉️", "📦", "⚡", "🔖",
  "💎", "🎓", "🏢", "🛒", "🎭", "📐", "🖋️", "🗂️", "📸", "🎬",
];

// ── Types (aligned to actual API response) ────────────────────────────────────
interface TemplateCategory {
  id: number;           // API: number, not string
  name: string;
  slug: string;
  description?: string;
  color_hex: string;    // API field name (not `color`)
  icon_name: string;    // API field name (not `icon`) — text identifier e.g. "briefcase"
  templates_count: number; // API field name (not `templateCount`)
  display_order: number;   // API field name (not `sortOrder`)
  is_active: boolean;      // API field name (not `isActive`)
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  data: TemplateCategory[];
}

interface FormValues {
  name: string;
  slug: string;
  description: string;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ── Icon map: icon_name string → emoji ────────────────────────────────────────
// The API stores icon_name as a text key (e.g. "briefcase"). We map those to
// emojis for display; when creating/editing we let the admin pick an emoji
// and store it as icon_name directly (emojis are valid icon_name values).
const ICON_NAME_TO_EMOJI: Record<string, string> = {
  briefcase: "💼",
  calculator: "📊",
  presentation: "🎯",
  "file-text": "📄",
  chart: "📈",
  money: "💰",
  legal: "⚖️",
  globe: "🌐",
  star: "⭐",
  box: "📦",
};

// Reverse map — used when sending icon back to the API
const EMOJI_TO_ICON_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(ICON_NAME_TO_EMOJI).map(([k, v]) => [v, k]),
);

function resolveIcon(icon_name: string): string {
  // If icon_name is already an emoji (multi-byte char), return as-is
  if ([...icon_name].length <= 2 && icon_name.charCodeAt(0) > 255) return icon_name;
  return ICON_NAME_TO_EMOJI[icon_name] ?? "📄";
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Box>
      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mb: 1, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Colour
      </Typography>
      <Box sx={{ display: "flex", gap: 0.7, flexWrap: "wrap", mb: 1.5 }}>
        {PRESET_COLORS.map((c) => (
          <Box
            key={c}
            onClick={() => onChange(c)}
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
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          placeholder="#C9A84C"
          sx={{ width: 130, "& .MuiOutlinedInput-root": { fontSize: "0.8rem" } }}
        />
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
          <Box
            key={icon}
            onClick={() => onChange(icon)}
            sx={{
              width: 38, height: 38, borderRadius: 2, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.15rem",
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

function CategoryCard({
  cat,
  onEdit,
  onDelete,
  onToggle,
}: {
  cat: TemplateCategory;
  onEdit: (c: TemplateCategory) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const emoji = resolveIcon(cat.icon_name);

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
            px: 2.5, py: 2, mb: 1.5, borderRadius: 3,
            background: cat.is_active ? alpha("#1A2535", 0.85) : alpha("#111827", 0.7),
            border: `1px solid ${cat.is_active ? alpha(cat.color_hex, 0.22) : "rgba(255,255,255,0.05)"}`,
            opacity: cat.is_active ? 1 : 0.6,
            transition: "all 0.25s",
            "&:hover": {
              border: `1px solid ${alpha(cat.color_hex, 0.4)}`,
              boxShadow: `0 6px 28px ${alpha(cat.color_hex, 0.12)}`,
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Drag handle */}
            <Box sx={{ cursor: "grab", color: "text.disabled", "&:active": { cursor: "grabbing" }, "&:hover": { color: alpha(cat.color_hex, 0.7) } }}>
              <DragIndicatorRounded sx={{ fontSize: 22 }} />
            </Box>

            {/* Icon badge */}
            <Box sx={{
              width: 46, height: 46, borderRadius: 2.5, flexShrink: 0,
              fontSize: "1.45rem",
              background: `linear-gradient(135deg, ${alpha(cat.color_hex, 0.28)}, ${alpha(cat.color_hex, 0.08)})`,
              border: `1.5px solid ${alpha(cat.color_hex, 0.35)}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px ${alpha(cat.color_hex, 0.18)}`,
            }}>
              {emoji}
            </Box>

            {/* Name + slug + description */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 0.4 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{cat.name}</Typography>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: cat.color_hex, boxShadow: `0 0 8px ${alpha(cat.color_hex, 0.8)}` }} />
                {!cat.is_active && (
                  <Chip label="Hidden" size="small" sx={{ height: 18, fontSize: "0.6rem", background: alpha("#888", 0.1), color: "#888" }} />
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "0.73rem", color: "text.disabled", fontFamily: "monospace" }}>
                  /{cat.slug}
                </Typography>
                {cat.description && (
                  <>
                    <Box sx={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                      {cat.description}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            {/* Template count badge */}
            <Box sx={{
              px: 1.5, py: 0.5, borderRadius: 2, flexShrink: 0,
              background: alpha(cat.color_hex, 0.1),
              border: `1px solid ${alpha(cat.color_hex, 0.22)}`,
              textAlign: "center",
            }}>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: cat.color_hex }}>
                {cat.templates_count ?? 0}
              </Typography>
              <Typography sx={{ fontSize: "0.58rem", color: alpha(cat.color_hex, 0.6) }}>
                templates
              </Typography>
            </Box>

            {/* Sort order badge */}
            <Box sx={{
              width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
              background: alpha("#fff", 0.04), border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.disabled" }}>
                {cat.display_order}
              </Typography>
            </Box>

            {/* Actions */}
            <Box sx={{ display: "flex", gap: 0.4, flexShrink: 0 }}>
              <Tooltip title={cat.is_active ? "Hide from storefront" : "Show on storefront"}>
                <IconButton
                  size="small"
                  onClick={() => onToggle(cat.id, !cat.is_active)}
                  sx={{ width: 30, height: 30, color: cat.is_active ? "#4CAF82" : "text.disabled", "&:hover": { background: alpha("#4CAF82", 0.1), color: "#4CAF82" } }}
                >
                  {cat.is_active ? <VisibilityRounded sx={{ fontSize: 15 }} /> : <VisibilityOffRounded sx={{ fontSize: 15 }} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={() => onEdit(cat)}
                  sx={{ width: 30, height: 30, "&:hover": { color: GOLD, background: alpha(GOLD, 0.08) } }}
                >
                  <EditRounded sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={cat.templates_count ? `${cat.templates_count} templates — reassign first` : "Delete"}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => !cat.templates_count && onDelete(cat.id)}
                    disabled={!!cat.templates_count}
                    sx={{ width: 30, height: 30, "&:hover": { color: "#E05C5C", background: alpha("#E05C5C", 0.08) } }}
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
  const [editCat, setEditCat] = useState<TemplateCategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(GOLD);
  const [selectedIcon, setSelectedIcon] = useState("📄");
  const [localCats, setLocalCats] = useState<TemplateCategory[]>([]);
  const [reorderSaving, setReorderSaving] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    "/admin/categories/templates",
    {
      onSuccess: (d) => {
        // Only seed local state on first load; after that local state owns order
        if (localCats.length === 0) setLocalCats(d?.data ?? []);
      },
    },
  );

  const allCats: TemplateCategory[] = localCats.length ? localCats : (data?.data ?? []);

  const filtered = search
    ? allCats.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : allCats;

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalTemplates = allCats.reduce((s, c) => s + (c.templates_count ?? 0), 0);
  const activeCount = allCats.filter((c) => c.is_active).length;

  // ── Form ─────────────────────────────────────────────────────────────────────
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: "", slug: "", description: "" },
  });

  const watchedName = watch("name");

  const openCreate = useCallback(() => {
    reset({ name: "", slug: "", description: "" });
    setSelectedColor(GOLD);
    setSelectedIcon("📄");
    setEditCat(null);
    setFormOpen(true);
  }, [reset]);

  const openEdit = useCallback((cat: TemplateCategory) => {
    reset({ name: cat.name, slug: cat.slug, description: cat.description ?? "" });
    setSelectedColor(cat.color_hex);
    setSelectedIcon(resolveIcon(cat.icon_name));
    setEditCat(cat);
    setFormOpen(true);
  }, [reset]);

  const onSubmit = async (values: FormValues) => {
    setSubmitLoading(true);
    try {
      // Send color_hex and icon_name to match API field names
      const nextOrder = editCat
        ? editCat.display_order
        : Math.max(0, ...allCats.map((c) => c.display_order)) + 1;

      const payload = {
        name: values.name,
        slug: values.slug?.trim() || toSlug(values.name),
        description: values.description,
        color_hex: selectedColor,
        icon_name: EMOJI_TO_ICON_NAME[selectedIcon] ?? selectedIcon,
        display_order: nextOrder,
      };
      if (editCat) {
        await api.put(`/admin/categories/templates/${editCat.id}`, payload);
        enqueueSnackbar("Category updated", { variant: "success" });
      } else {
        await api.post("/admin/categories/templates", payload);
        enqueueSnackbar("Category created", { variant: "success" });
      }
      setLocalCats([]);
      await mutate();
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
      await api.delete(`/admin/categories/templates/${deleteId}`);
      enqueueSnackbar("Category deleted", { variant: "success" });
      setLocalCats((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
      await mutate();
    } catch {
      enqueueSnackbar("Delete failed — reassign templates first", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggle = async (id: number, active: boolean) => {
    // Optimistic update
    setLocalCats((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: active } : c)));
    try {
      await api.patch(`/admin/categories/templates/${id}/toggle`, { is_active: active });
      enqueueSnackbar(active ? "Category visible" : "Category hidden", { variant: "success" });
    } catch {
      enqueueSnackbar("Toggle failed", { variant: "error" });
      // Revert on failure
      setLocalCats((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !active } : c)));
    }
  };

  const handleReorder = async (newOrder: TemplateCategory[]) => {
    setLocalCats(newOrder);
    setReorderSaving(true);
    try {
      await api.post("/admin/categories/templates/reorder", {
        order: newOrder.map((c, i) => ({ id: c.id, display_order: i + 1 })),
      });
    } catch {
      enqueueSnackbar("Reorder save failed", { variant: "warning" });
    } finally {
      setReorderSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Template Categories"
      subtitle={
        isLoading
          ? "Loading…"
          : `${allCats.length} categor${allCats.length !== 1 ? "ies" : "y"} · ${totalTemplates} templates assigned`
      }
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
          { label: "Templates", value: totalTemplates, color: "#4A8FD4" },
        ].map((s, i) => (
          <Grid size={{ xs: 6, md: 3 }} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Paper sx={{ p: 2, borderRadius: 2.5, textAlign: "center", background: alpha(s.color, 0.05), border: `1px solid ${alpha(s.color, 0.18)}` }}>
                <Typography sx={{ fontSize: "1.75rem", fontFamily: '"DM Serif Display", serif', color: s.color, lineHeight: 1, mb: 0.4 }}>
                  {isLoading ? "—" : s.value}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{s.label}</Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Search + reorder hint */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
        <SearchBar
          placeholder="Search categories…"
          onSearch={useCallback((v: string) => setSearch(v), [])}
        />
        <Typography sx={{ fontSize: "0.73rem", color: "text.disabled", display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          <DragIndicatorRounded sx={{ fontSize: 14 }} />
          {reorderSaving ? "Saving order…" : "Drag to reorder · auto-saved"}
        </Typography>
      </Box>

      {/* Category list */}
      <Paper sx={{ borderRadius: 3, p: 2.5 }}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={78} sx={{ borderRadius: 3, mb: 1.5 }} />
          ))
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 10, textAlign: "center" }}>
            <Box sx={{ fontSize: "3rem", mb: 2 }}>📂</Box>
            <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
              {search ? "No categories match your search" : "No categories yet"}
            </Typography>
            {!search && (
              <Button variant="outlined" size="small" startIcon={<AddRounded />} onClick={openCreate}>
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
                  onEdit={openEdit}
                  onDelete={setDeleteId}
                  onToggle={handleToggle}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </Paper>

      {/* Create / Edit dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !submitLoading && setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
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
              <Typography sx={{ fontWeight: 600 }}>
                {editCat ? `Edit: ${editCat.name}` : "New Category"}
              </Typography>
              <Typography sx={{ fontSize: "0.74rem", color: "text.secondary" }}>
                Visible to users on the storefront
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box
            component="form"
            id="cat-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 0.5 }}
          >
            <TextField
              {...register("name", { required: "Name is required" })}
              label="Category Name *"
              fullWidth
              autoFocus
              error={!!errors.name}
              helperText={errors.name?.message ?? "Slug is auto-generated from name"}
              {...register("name", {
                required: "Name is required",
                onChange: (e) => {
                  if (!editCat) {
                    setValue("slug", toSlug(e.target.value), { shouldDirty: true });
                  }
                },
              })}
            />
            <TextField
              {...register("slug")}
              label="Slug"
              fullWidth
              placeholder="auto-generated"
              helperText={
                watchedName
                  ? `URL: /templates/${watch("slug") || toSlug(watchedName)}`
                  : "URL: /templates/{slug}"
              }
            />
            <TextField
              {...register("description")}
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              placeholder="Short description shown to users"
            />
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <ColorPicker value={selectedColor} onChange={setSelectedColor} />
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

            {/* Live preview */}
            <Box sx={{
              p: 2, borderRadius: 2.5,
              background: alpha(selectedColor, 0.05),
              border: `1px solid ${alpha(selectedColor, 0.2)}`,
              display: "flex", alignItems: "center", gap: 2,
            }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2, fontSize: "1.4rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: alpha(selectedColor, 0.18),
                border: `1.5px solid ${alpha(selectedColor, 0.4)}`,
              }}>
                {selectedIcon}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, color: selectedColor, fontSize: "0.88rem" }}>
                  Live Preview
                </Typography>
                <Typography sx={{ fontSize: "0.74rem", color: "text.secondary" }}>
                  How it appears in the template browser
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)} variant="outlined" size="small" disabled={submitLoading}>
            Cancel
          </Button>
          <Button type="submit" form="cat-form" variant="contained" size="small" disabled={submitLoading}>
            {submitLoading ? "Saving…" : editCat ? "Update Category" : "Create Category"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Category"
        message="Permanently delete this category? Templates using it will need to be reassigned."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}