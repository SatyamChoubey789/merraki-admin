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
  Avatar,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  PersonRounded,
  LinkRounded,
  ArticleRounded,
} from "@mui/icons-material";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import TwitterIcon from "@mui/icons-material/Twitter";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { alpha } from "@mui/material";
import dayjs from "dayjs";
import api from "@/lib/axios";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SearchBar from "@/components/ui/SearchBar";

const GOLD = "#C9A84C";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Author {
  id: number;
  name: string;
  slug: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  website_url?: string;
  post_count?: number;
  is_active: boolean;
  created_at: string;
}

const schema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  bio: z.string().optional(),
  avatar_url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  twitter_url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  linkedin_url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  website_url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Avatar Preview ─────────────────────────────────────────────────────────────
function AuthorAvatar({
  author,
  size = 40,
}: {
  author: Pick<Author, "name" | "avatar_url">;
  size?: number;
}) {
  if (author.avatar_url) {
    return (
      <Box
        component="img"
        src={author.avatar_url}
        alt={author.name}
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: `2px solid ${alpha(GOLD, 0.3)}`,
          flexShrink: 0,
        }}
        onError={(e: any) => {
          e.target.style.display = "none";
        }}
      />
    );
  }
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontWeight: 700,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${alpha(GOLD, 0.3)}, ${alpha(GOLD, 0.12)})`,
        color: GOLD,
        border: `2px solid ${alpha(GOLD, 0.25)}`,
        flexShrink: 0,
      }}
    >
      {author.name?.charAt(0).toUpperCase()}
    </Avatar>
  );
}

// ── Social link icon map ───────────────────────────────────────────────────────
function SocialLinks({ author }: { author: Author }) {
  const links = [
    {
      url: author.twitter_url,
      icon: <TwitterIcon sx={{ fontSize: 13 }} />,
      color: "#1DA1F2",
    },
    {
      url: author.linkedin_url,
      icon: <LinkedInIcon sx={{ fontSize: 13 }} />,
      color: "#0077B5",
    },
    {
      url: author.website_url,
      icon: <LinkRounded sx={{ fontSize: 13 }} />,
      color: "#4CAF82",
    },
  ].filter((l) => l.url);

  if (links.length === 0)
    return (
      <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
        No links
      </Typography>
    );

  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      {links.map((l, i) => (
        <Box
          key={i}
          component="a"
          href={l.url!}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: alpha(l.color, 0.12),
            color: l.color,
            border: `1px solid ${alpha(l.color, 0.25)}`,
            textDecoration: "none",
            "&:hover": { background: alpha(l.color, 0.2) },
          }}
        >
          {l.icon}
        </Box>
      ))}
    </Box>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BlogAuthorsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editAuthor, setEditAuthor] = useState<Author | null>(null);
  const [viewAuthor, setViewAuthor] = useState<Author | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");

  const { data, isLoading, mutate } = useSWR<{
    success: boolean;
    data: Author[];
    pagination: { total: number; page: number; limit: number };
  }>(
    `/admin/blog/authors?page=${page + 1}&limit=25${search ? `&search=${encodeURIComponent(search)}` : ""}`,
  );

  const authors: Author[] = data?.data ?? [];
  const total: number = data?.pagination?.total ?? 0;
  const activeCount = authors.filter((a) => a.is_active).length;
  const totalPosts = authors.reduce((s, a) => s + (a.post_count ?? 0), 0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      avatar_url: "",
      twitter_url: "",
      linkedin_url: "",
      website_url: "",
      is_active: true,
    },
  });

  const avatarUrl = watch("avatar_url");

  const openCreate = () => {
    reset({
      name: "",
      email: "",
      bio: "",
      avatar_url: "",
      twitter_url: "",
      linkedin_url: "",
      website_url: "",
      is_active: true,
    });
    setAvatarPreview("");
    setEditAuthor(null);
    setFormOpen(true);
  };

  const openEdit = (a: Author) => {
    reset({
      name: a.name,
      email: a.email,
      bio: a.bio ?? "",
      avatar_url: a.avatar_url ?? "",
      twitter_url: a.twitter_url ?? "",
      linkedin_url: a.linkedin_url ?? "",
      website_url: a.website_url ?? "",
      is_active: a.is_active,
    });
    setAvatarPreview(a.avatar_url ?? "");
    setEditAuthor(a);
    setFormOpen(true);
  };

  const onSubmit = async (formData: FormData) => {
    setSubmitLoading(true);
    try {
      const payload = {
        ...formData,
        avatar_url: formData.avatar_url || null,
        twitter_url: formData.twitter_url || null,
        linkedin_url: formData.linkedin_url || null,
        website_url: formData.website_url || null,
      };
      if (editAuthor) {
        await api.put(`/admin/blog/authors/${editAuthor.id}`, payload);
        enqueueSnackbar("Author updated", { variant: "success" });
      } else {
        await api.post("/admin/blog/authors", payload);
        enqueueSnackbar("Author created", { variant: "success" });
      }
      await mutate();
      setFormOpen(false);
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message ?? "Save failed", {
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
      await api.delete(`/admin/blog/authors/${deleteId}`);
      enqueueSnackbar("Author deleted", { variant: "success" });
      await mutate();
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message ??
          "Delete failed — reassign posts first",
        { variant: "error" },
      );
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (author: Author) => {
    try {
      await api.patch(`/admin/blog/authors/${author.id}/toggle`, {
        is_active: !author.is_active,
      });
      enqueueSnackbar(
        author.is_active ? "Author deactivated" : "Author activated",
        { variant: "success" },
      );
      await mutate();
    } catch {
      enqueueSnackbar("Toggle failed", { variant: "error" });
    }
  };

  const columns: Column<Author>[] = [
    {
      key: "name",
      label: "Author",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <AuthorAvatar author={row} size={38} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                {row.name}
              </Typography>
              {!row.is_active && (
                <Chip
                  label="Inactive"
                  size="small"
                  sx={{
                    height: 17,
                    fontSize: "0.6rem",
                    background: alpha("#888", 0.1),
                    color: "#888",
                  }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "slug",
      label: "Slug",
      render: (row) => (
        <Typography
          sx={{
            fontSize: "0.76rem",
            fontFamily: "monospace",
            color: "text.disabled",
          }}
        >
          /{row.slug}
        </Typography>
      ),
    },
    {
      key: "bio",
      label: "Bio",
      render: (row) => (
        <Typography
          sx={{
            fontSize: "0.78rem",
            color: "text.secondary",
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.bio || "—"}
        </Typography>
      ),
    },
    {
      key: "post_count",
      label: "Posts",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <ArticleRounded sx={{ fontSize: 14, color: GOLD }} />
          <Typography sx={{ fontWeight: 700, color: GOLD }}>
            {row.post_count ?? 0}
          </Typography>
        </Box>
      ),
    },
    {
      key: "social",
      label: "Links",
      render: (row) => <SocialLinks author={row} />,
    },
    {
      key: "created_at",
      label: "Joined",
      render: (row) => (
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
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
          <Tooltip title="View profile">
            <IconButton size="small" onClick={() => setViewAuthor(row)}>
              <PersonRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              row.post_count
                ? `${row.post_count} posts — reassign first`
                : "Delete"
            }
          >
            <span>
              <IconButton
                size="small"
                disabled={!!row.post_count}
                onClick={() => !row.post_count && setDeleteId(row.id)}
                sx={{
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
      ),
    },
  ];

  return (
    <PageWrapper
      title="Blog Authors"
      subtitle={`${total} authors · ${totalPosts} posts written`}
      actions={
        <Button
          variant="contained"
          size="small"
          startIcon={<AddRounded />}
          onClick={openCreate}
        >
          New Author
        </Button>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total Authors", value: total, color: GOLD },
          { label: "Active", value: activeCount, color: "#4CAF82" },
          { label: "Inactive", value: total - activeCount, color: "#6B8CAE" },
          { label: "Posts Written", value: totalPosts, color: "#4A8FD4" },
        ].map((s, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={s.label}>
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
                  {s.value}
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

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          placeholder="Search authors by name or email..."
          onSearch={useCallback((v: string) => {
            setSearch(v);
            setPage(0);
          }, [])}
        />
      </Box>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={authors}
        loading={isLoading}
        page={page}
        rowsPerPage={25}
        total={total}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
        emptyMessage="No authors yet — create the first one"
      />

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <AuthorAvatar
              author={{
                name: watch("name") || "A",
                avatar_url: avatarUrl || undefined,
              }}
              size={44}
            />
            <Box>
              <Typography sx={{ fontWeight: 600 }}>
                {editAuthor ? "Edit Author" : "New Author"}
              </Typography>
              <Typography sx={{ fontSize: "0.74rem", color: "text.secondary" }}>
                {editAuthor
                  ? `Editing ${editAuthor.name}`
                  : "Will appear on blog posts"}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="author-form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("name")}
                  label="Full Name *"
                  fullWidth
                  autoFocus
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("email")}
                  label="Email *"
                  fullWidth
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
            </Grid>

            <TextField
              {...register("bio")}
              label="Bio"
              fullWidth
              multiline
              rows={3}
              placeholder="Short bio shown on blog posts and author profile page"
            />

            {/* Avatar URL with live preview */}
            <Box>
              <TextField
                {...register("avatar_url")}
                label="Avatar URL"
                fullWidth
                placeholder="https://example.com/avatar.jpg"
                error={!!errors.avatar_url}
                helperText={errors.avatar_url?.message ?? "Direct image URL"}
              />
              {avatarUrl && (
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    background: alpha(GOLD, 0.04),
                    border: `1px solid ${alpha(GOLD, 0.15)}`,
                  }}
                >
                  <AuthorAvatar
                    author={{
                      name: watch("name") || "A",
                      avatar_url: avatarUrl,
                    }}
                    size={36}
                  />
                  <Typography
                    sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                  >
                    Avatar preview
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Social links */}
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Social Links (optional)
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  {...register("twitter_url")}
                  label="Twitter / X"
                  fullWidth
                  size="small"
                  placeholder="https://twitter.com/username"
                  error={!!errors.twitter_url}
                  helperText={errors.twitter_url?.message}
                  InputProps={{
                    startAdornment: (
                      <TwitterIcon
                        sx={{ fontSize: 16, color: "#1DA1F2", mr: 0.5 }}
                      />
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  {...register("linkedin_url")}
                  label="LinkedIn"
                  fullWidth
                  size="small"
                  placeholder="https://linkedin.com/in/..."
                  error={!!errors.linkedin_url}
                  helperText={errors.linkedin_url?.message}
                  InputProps={{
                    startAdornment: (
                      <LinkedInIcon
                        sx={{ fontSize: 16, color: "#0077B5", mr: 0.5 }}
                      />
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  {...register("website_url")}
                  label="Website"
                  fullWidth
                  size="small"
                  placeholder="https://yoursite.com"
                  error={!!errors.website_url}
                  helperText={errors.website_url?.message}
                  InputProps={{
                    startAdornment: (
                      <LinkRounded
                        sx={{ fontSize: 16, color: "#4CAF82", mr: 0.5 }}
                      />
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  {...register("is_active")}
                  defaultChecked={editAuthor?.is_active ?? true}
                  sx={{
                    "& .MuiSwitch-thumb": { background: GOLD },
                    "& .Mui-checked + .MuiSwitch-track": {
                      background: alpha(GOLD, 0.5),
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.85rem" }}>
                  Active — posts by this author are publicly visible
                </Typography>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setFormOpen(false)}
            variant="outlined"
            size="small"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="author-form"
            variant="contained"
            size="small"
            disabled={submitLoading}
          >
            {submitLoading
              ? "Saving…"
              : editAuthor
                ? "Update Author"
                : "Create Author"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View Author Profile Dialog ────────────────────────────────────────── */}
      <Dialog
        open={!!viewAuthor}
        onClose={() => setViewAuthor(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        {viewAuthor && (
          <>
            {/* Header banner */}
            <Box
              sx={{
                height: 80,
                background: `linear-gradient(135deg, ${alpha(GOLD, 0.25)}, ${alpha("#4A8FD4", 0.15)})`,
                position: "relative",
              }}
            />
            <DialogContent sx={{ pt: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  mt: "-36px",
                  mb: 2.5,
                }}
              >
                <Box
                  sx={{ p: 0.5, borderRadius: "50%", background: "#0D1B2A" }}
                >
                  <AuthorAvatar author={viewAuthor} size={72} />
                </Box>
                <Typography
                  sx={{ fontWeight: 700, fontSize: "1.1rem", mt: 1.5 }}
                >
                  {viewAuthor.name}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 0.5 }}
                >
                  {viewAuthor.email}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <Chip
                    label={viewAuthor.is_active ? "Active" : "Inactive"}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      background: alpha(
                        viewAuthor.is_active ? "#4CAF82" : "#888",
                        0.12,
                      ),
                      color: viewAuthor.is_active ? "#4CAF82" : "#888",
                    }}
                  />
                  <Chip
                    label={`${viewAuthor.post_count ?? 0} posts`}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      background: alpha(GOLD, 0.1),
                      color: GOLD,
                    }}
                  />
                </Box>
              </Box>

              {viewAuthor.bio && (
                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    background: alpha("#fff", 0.03),
                    border: "1px solid rgba(255,255,255,0.07)",
                    mb: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      color: "text.secondary",
                      lineHeight: 1.7,
                    }}
                  >
                    {viewAuthor.bio}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    mb: 1,
                  }}
                >
                  Slug
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    fontFamily: "monospace",
                    color: GOLD,
                  }}
                >
                  /{viewAuthor.slug}
                </Typography>
              </Box>

              <SocialLinks author={viewAuthor} />

              <Typography
                sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 2 }}
              >
                Added {dayjs(viewAuthor.created_at).format("MMMM D, YYYY")}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button
                onClick={() => setViewAuthor(null)}
                variant="outlined"
                size="small"
              >
                Close
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  openEdit(viewAuthor);
                  setViewAuthor(null);
                }}
              >
                Edit Author
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Author"
        message="Permanently delete this author? All posts by them will need a new author assigned."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </PageWrapper>
  );
}
