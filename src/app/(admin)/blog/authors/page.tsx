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
  Avatar,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import {
  AddRounded,
  EditRounded,
  DeleteRounded,
  PersonRounded,
  ArticleRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { alpha } from "@mui/material";
import dayjs from "dayjs";
import api from "@/lib/axios";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SearchBar from "@/components/ui/SearchBar";

const GOLD = "#C9A84C";

// ── Types matching Go backend ─────────────────────────────────────────────────
interface BlogAuthor {
  id: number;
  admin_id?: number;
  name: string;
  slug: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  social_links?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
    instagram?: string;
    github?: string;
    [key: string]: string | undefined;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  post_count?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
}

// ── Form schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  bio: z.string().optional(),
  avatar_url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  social_twitter: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  social_linkedin: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  social_website: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  social_github: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Author Avatar Component ───────────────────────────────────────────────────
function AuthorAvatar({
  author,
  size = 40,
}: {
  author: Pick<BlogAuthor, "name" | "avatar_url">;
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
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${alpha(GOLD, 0.3)}, ${alpha(
          GOLD,
          0.1
        )})`,
        color: GOLD,
        border: `2px solid ${alpha(GOLD, 0.25)}`,
        fontWeight: 700,
      }}
    >
      {author.name?.charAt(0).toUpperCase()}
    </Avatar>
  );
}

// ── Social Links Component ────────────────────────────────────────────────────
const SOCIAL_ICONS: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  twitter: { label: "Twitter / X", icon: "𝕏", color: "#1DA1F2" },
  linkedin: { label: "LinkedIn", icon: "in", color: "#0077B5" },
  website: { label: "Website", icon: "🌐", color: "#4CAF82" },
  github: { label: "GitHub", icon: "⌥", color: "#E8A838" },
};

function SocialLinks({ links }: { links?: BlogAuthor["social_links"] }) {
  if (!links || Object.keys(links).length === 0) {
    return (
      <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
        —
      </Typography>
    );
  }

  const active = Object.entries(links).filter(([, v]) => v);
  if (active.length === 0) {
    return (
      <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      {active.map(([key, url]) => {
        const meta = SOCIAL_ICONS[key] ?? {
          label: key,
          icon: "🔗",
          color: GOLD,
        };
        return (
          <Box
            key={key}
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={meta.label}
            sx={{
              width: 24,
              height: 24,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: alpha(meta.color, 0.12),
              color: meta.color,
              border: `1px solid ${alpha(meta.color, 0.25)}`,
              textDecoration: "none",
              fontSize: "0.65rem",
              fontWeight: 700,
              "&:hover": { background: alpha(meta.color, 0.25) },
            }}
          >
            {meta.icon}
          </Box>
        );
      })}
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BlogAuthorsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editAuthor, setEditAuthor] = useState<BlogAuthor | null>(null);
  const [viewAuthor, setViewAuthor] = useState<BlogAuthor | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // ✅ FIXED: Correct endpoint - non-paginated for dropdown use
  const { data, isLoading, mutate } = useSWR<ApiResponse<BlogAuthor>>(
    `/admin/blog/authors${search ? `?search=${encodeURIComponent(search)}` : ""}`
  );

  const authors: BlogAuthor[] = data?.data ?? [];
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
      social_twitter: "",
      social_linkedin: "",
      social_website: "",
      social_github: "",
      is_active: true,
    },
  });

  const avatarUrl = watch("avatar_url");
  const authorName = watch("name");

  const openCreate = () => {
    reset({
      name: "",
      email: "",
      bio: "",
      avatar_url: "",
      social_twitter: "",
      social_linkedin: "",
      social_website: "",
      social_github: "",
      is_active: true,
    });
    setEditAuthor(null);
    setFormOpen(true);
  };

  const openEdit = (a: BlogAuthor) => {
    reset({
      name: a.name,
      email: a.email ?? "",
      bio: a.bio ?? "",
      avatar_url: a.avatar_url ?? "",
      social_twitter: a.social_links?.twitter ?? "",
      social_linkedin: a.social_links?.linkedin ?? "",
      social_website: a.social_links?.website ?? "",
      social_github: a.social_links?.github ?? "",
      is_active: a.is_active,
    });
    setEditAuthor(a);
    setFormOpen(true);
  };

  // ✅ FIXED: Match backend API structure
  const onSubmit = async (formData: FormData) => {
    setSubmitLoading(true);
    try {
      // Build social_links object (only non-empty values)
      const social_links: Record<string, string> = {};
      if (formData.social_twitter)
        social_links.twitter = formData.social_twitter;
      if (formData.social_linkedin)
        social_links.linkedin = formData.social_linkedin;
      if (formData.social_website)
        social_links.website = formData.social_website;
      if (formData.social_github) social_links.github = formData.social_github;

      const payload = {
        name: formData.name,
        email: formData.email || undefined,
        bio: formData.bio || undefined,
        avatar_url: formData.avatar_url || undefined,
        social_links:
          Object.keys(social_links).length > 0 ? social_links : undefined,
        is_active: formData.is_active ?? true,
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
      await api.delete(`/admin/blog/authors/${deleteId}`);
      enqueueSnackbar("Author deleted", { variant: "success" });
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? "Delete failed", {
        variant: "error",
      });
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (author: BlogAuthor) => {
    try {
      await api.put(`/admin/blog/authors/${author.id}`, {
        ...author,
        is_active: !author.is_active,
      });
      enqueueSnackbar(
        !author.is_active ? "Author activated" : "Author deactivated",
        { variant: "success" }
      );
      await mutate();
    } catch {
      enqueueSnackbar("Toggle failed", { variant: "error" });
    }
  };

  const filteredAuthors = search
    ? authors.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.email?.toLowerCase().includes(search.toLowerCase()) ||
          a.slug.includes(search.toLowerCase())
      )
    : authors;

  const columns: Column<BlogAuthor>[] = [
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
              {row.email ?? "—"}
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
      hideOnMobile: true,
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
      key: "social_links",
      label: "Links",
      hideOnMobile: true,
      render: (row) => <SocialLinks links={row.social_links} />,
    },
    {
      key: "created_at",
      label: "Added",
      hideOnMobile: true,
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
      subtitle={`${authors.length} authors · ${totalPosts} posts written`}
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
          { label: "Total Authors", value: authors.length, color: GOLD },
          { label: "Active", value: activeCount, color: "#4CAF82" },
          {
            label: "Inactive",
            value: authors.length - activeCount,
            color: "#6B8CAE",
          },
          { label: "Posts Written", value: totalPosts, color: "#4A8FD4" },
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

      <Box sx={{ mb: 3 }}>
        <SearchBar
          placeholder="Search authors by name or email..."
          onSearch={useCallback((v: string) => setSearch(v), [])}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={filteredAuthors}
        loading={isLoading}
        page={0}
        rowsPerPage={filteredAuthors.length}
        total={filteredAuthors.length}
        onPageChange={() => {}}
        getRowId={(r) => String(r.id)}
        emptyMessage="No authors yet — create the first one"
      />

      {/* Create / Edit Dialog */}
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
                name: authorName || "A",
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
                  : "Will be shown on blog posts"}
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
                  label="Email"
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
              placeholder="Short bio shown on posts and author profile page"
            />

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
                  author={{ name: authorName || "A", avatar_url: avatarUrl }}
                  size={36}
                />
                <Typography
                  sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                >
                  Avatar preview
                </Typography>
              </Box>
            )}

            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Social Links
            </Typography>
            <Grid container spacing={2}>
              {[
                {
                  field: "social_twitter" as const,
                  label: "Twitter / X",
                  placeholder: "https://twitter.com/username",
                  color: "#1DA1F2",
                },
                {
                  field: "social_linkedin" as const,
                  label: "LinkedIn",
                  placeholder: "https://linkedin.com/in/...",
                  color: "#0077B5",
                },
                {
                  field: "social_website" as const,
                  label: "Website",
                  placeholder: "https://yoursite.com",
                  color: "#4CAF82",
                },
                {
                  field: "social_github" as const,
                  label: "GitHub",
                  placeholder: "https://github.com/username",
                  color: "#E8A838",
                },
              ].map(({ field, label, placeholder, color }) => (
                <Grid size={{ xs: 12, sm: 6 }} key={field}>
                  <TextField
                    {...register(field)}
                    label={label}
                    fullWidth
                    size="small"
                    placeholder={placeholder}
                    error={!!errors[field]}
                    helperText={errors[field]?.message}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: color,
                              mr: 1,
                            }}
                          />
                        ),
                      },
                    }}
                  />
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

            <FormControlLabel
              control={
                <Switch
                  {...register("is_active")}
                  defaultChecked={editAuthor?.is_active ?? true}
                />
              }
              label="Active — posts by this author are publicly visible"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setFormOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            type="submit"
            form="author-form"
            variant="contained"
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

      {/* View Author Dialog */}
      <Dialog
        open={!!viewAuthor}
        onClose={() => setViewAuthor(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        {viewAuthor && (
          <>
            <Box
              sx={{
                height: 72,
                background: `linear-gradient(135deg, ${alpha(
                  GOLD,
                  0.2
                )}, ${alpha("#4A8FD4", 0.12)})`,
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
                {viewAuthor.email && (
                  <Typography
                    sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                  >
                    {viewAuthor.email}
                  </Typography>
                )}
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <Chip
                    label={viewAuthor.is_active ? "Active" : "Inactive"}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      background: alpha(
                        viewAuthor.is_active ? "#4CAF82" : "#888",
                        0.12
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
                    mb: 0.75,
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

              {viewAuthor.social_links &&
                Object.keys(viewAuthor.social_links).length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "text.disabled",
                        textTransform: "uppercase",
                        mb: 1,
                      }}
                    >
                      Social Links
                    </Typography>
                    <SocialLinks links={viewAuthor.social_links} />
                  </Box>
                )}

              <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
                Added {dayjs(viewAuthor.created_at).format("MMMM D, YYYY")}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button
                onClick={() => {
                  handleToggleActive(viewAuthor);
                  setViewAuthor(null);
                }}
                variant="outlined"
                size="small"
              >
                {viewAuthor.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setViewAuthor(null)}
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
                Edit
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Author"
        message="Permanently delete this author? All their posts will need a new author assigned."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </PageWrapper>
  );
}