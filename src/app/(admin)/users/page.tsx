"use client";
import { useState, useCallback } from "react";
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Typography, Paper, Chip, Avatar, Switch,
  FormControlLabel, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow, Skeleton,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  AddRounded, DeleteRounded, VisibilityRounded, ShieldRounded,
  CheckCircleRounded, CancelRounded, AccessTimeRounded, AdminPanelSettingsRounded,
  PersonRounded, SupportAgentRounded, EditNoteRounded, LocalShippingRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import { alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "@/components/layout/PageWrapper";
import SearchBar from "@/components/ui/SearchBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";

dayjs.extend(relativeTime);

const MotionTableRow = motion(TableRow);
const GOLD = "#C9A84C";

// ── Types ─────────────────────────────────────────────────────────────────────
type Role = "super_admin" | "admin" | "content_manager" | "order_manager" | "support_staff";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  permissions: Record<string, unknown>;
  is_active: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  created_at: string;
  updated_at: string;
}

interface CreateUserForm {
  email: string;
  name: string;
  password: string;
  role: Role;
  is_active: boolean;
}

// ── Role config ────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  super_admin: {
    label: "Super Admin",
    color: GOLD,
    icon: <ShieldRounded sx={{ fontSize: 13 }} />,
    desc: "Full system access",
  },
  admin: {
    label: "Admin",
    color: "#4A8FD4",
    icon: <AdminPanelSettingsRounded sx={{ fontSize: 13 }} />,
    desc: "Administrative access",
  },
  content_manager: {
    label: "Content Manager",
    color: "#9B7FD4",
    icon: <EditNoteRounded sx={{ fontSize: 13 }} />,
    desc: "Blog & templates",
  },
  order_manager: {
    label: "Order Manager",
    color: "#4CAF82",
    icon: <LocalShippingRounded sx={{ fontSize: 13 }} />,
    desc: "Orders & fulfillment",
  },
  support_staff: {
    label: "Support Staff",
    color: "#E8A838",
    icon: <SupportAgentRounded sx={{ fontSize: 13 }} />,
    desc: "Customer support",
  },
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.admin;
  return (
    <Chip
      icon={<Box sx={{ color: `${cfg.color} !important`, display: "flex", ml: "6px !important" }}>{cfg.icon}</Box>}
      label={cfg.label}
      size="small"
      sx={{
        fontSize: "0.7rem", fontWeight: 600, height: 22,
        background: alpha(cfg.color, 0.1),
        color: cfg.color,
        border: `1px solid ${alpha(cfg.color, 0.25)}`,
        "& .MuiChip-icon": { color: cfg.color },
      }}
    />
  );
}

// ── User row ───────────────────────────────────────────────────────────────────
function UserRow({ user, onView, onDelete, index }: {
  user: AdminUser;
  onView: (u: AdminUser) => void;
  onDelete: (id: number) => void;
  index: number;
}) {
  const initials = user.name?.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.admin;

  return (
    <MotionTableRow
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      sx={{
        "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", py: 1.5, px: 2 },
        "&:hover td": { background: alpha("#fff", 0.018) },
        transition: "background 0.15s",
      }}
    >
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar sx={{ width: 36, height: 36, fontSize: "0.8rem", fontWeight: 700, background: `linear-gradient(135deg, ${alpha(cfg.color, 0.35)}, ${alpha(cfg.color, 0.15)})`, color: cfg.color, border: `1.5px solid ${alpha(cfg.color, 0.3)}` }}>
                {initials}
              </Avatar>
              <Box sx={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: user.is_active ? "#4CAF82" : "#666", border: "1.5px solid #0F1923" }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.3, color: "#F0EDE8" }}>
                {user.name}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
        </TableCell>

        <TableCell><RoleBadge role={user.role} /></TableCell>

        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
            {user.is_active ? (
              <CheckCircleRounded sx={{ fontSize: 14, color: "#4CAF82" }} />
            ) : (
              <CancelRounded sx={{ fontSize: 14, color: "#666" }} />
            )}
            <Typography sx={{ fontSize: "0.78rem", color: user.is_active ? "#4CAF82" : "text.disabled" }}>
              {user.is_active ? "Active" : "Inactive"}
            </Typography>
          </Box>
        </TableCell>

        <TableCell>
          {user.last_login_at ? (
            <Box>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                {dayjs(user.last_login_at).fromNow()}
              </Typography>
              <Typography sx={{ fontSize: "0.68rem", color: "text.disabled" }}>
                {user.last_login_ip}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ fontSize: "0.78rem", color: "text.disabled" }}>Never</Typography>
          )}
        </TableCell>

        <TableCell>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {dayjs(user.created_at).format("MMM D, YYYY")}
          </Typography>
        </TableCell>

        <TableCell align="right">
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
            <Tooltip title="View details">
              <IconButton size="small" onClick={() => onView(user)} sx={{ "&:hover": { color: GOLD } }}>
                <VisibilityRounded sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete admin">
              <IconButton size="small" onClick={() => onDelete(user.id)} sx={{ "&:hover": { color: "#E05C5C", background: alpha("#E05C5C", 0.08) } }}>
                <DeleteRounded sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </MotionTableRow>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const handleSearch = useCallback((v: string) => setSearch(v), []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading, mutate } = useSWR<{ success: boolean; data: AdminUser[] | null; pagination: { total: number } }>(
    `/admin/users` + (roleFilter ? `?role=${roleFilter}` : ""),
  );

  const allUsers: AdminUser[] = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  // Client-side search filter (API may not support search param)
  const users = search
    ? allUsers.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : allUsers;

  // ── Form ───────────────────────────────────────────────────────────────────
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateUserForm>({
    defaultValues: { role: "admin", is_active: true },
  });

  const watchRole = watch("role");
  const watchIsActive = watch("is_active");

  // ── Actions ────────────────────────────────────────────────────────────────
  const onCreateSubmit = async (formData: CreateUserForm) => {
    setCreateLoading(true);
    try {
      await api.post("/admin/users/create", {
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: formData.role,
        is_active: formData.is_active,
        permissions: formData.role === "super_admin" ? { all: true } : {},
      });
      enqueueSnackbar("Admin user created", { variant: "success" });
      reset({ role: "admin", is_active: true });
      setCreateOpen(false);
      await mutate();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      enqueueSnackbar(msg ?? "Failed to create user", { variant: "error" });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${deleteId}`);
      enqueueSnackbar("Admin user deleted", { variant: "success" });
      setDeleteId(null);
      if (detailUser?.id === deleteId) setDetailUser(null);
      await mutate();
    } catch {
      enqueueSnackbar("Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Role stats ─────────────────────────────────────────────────────────────
  const roleCounts = allUsers.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper
      title="Admin Users"
      subtitle={`${total} admin account${total !== 1 ? "s" : ""}`}
      actions={
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => { reset({ role: "admin", is_active: true }); setCreateOpen(true); }}>
          Add Admin
        </Button>
      }
    >
      {/* Stats row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={role}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Object.keys(ROLE_CONFIG).indexOf(role) * 0.06 }}>
              <Paper
                onClick={() => setRoleFilter(roleFilter === role ? "" : role)}
                sx={{
                  p: 1.75, borderRadius: 2.5, cursor: "pointer", transition: "all 0.2s",
                  border: `1px solid ${roleFilter === role ? alpha(cfg.color, 0.4) : alpha(cfg.color, 0.12)}`,
                  background: roleFilter === role ? alpha(cfg.color, 0.1) : alpha(cfg.color, 0.04),
                  "&:hover": { border: `1px solid ${alpha(cfg.color, 0.35)}`, background: alpha(cfg.color, 0.08) },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: 1.5, background: alpha(cfg.color, 0.15), color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {cfg.icon}
                  </Box>
                  <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, color: cfg.color, fontFamily: '"DM Serif Display", serif', lineHeight: 1 }}>
                    {roleCounts[role] ?? 0}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: cfg.color, letterSpacing: "0.04em" }}>
                  {cfg.label}
                </Typography>
                <Typography sx={{ fontSize: "0.62rem", color: "text.disabled", mt: 0.2 }}>
                  {cfg.desc}
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <SearchBar placeholder="Search by name or email…" onSearch={handleSearch} />
        {roleFilter && (
          <Chip
            label={`Role: ${ROLE_CONFIG[roleFilter]?.label}`}
            size="small"
            onDelete={() => setRoleFilter("")}
            sx={{ background: alpha(ROLE_CONFIG[roleFilter]?.color ?? GOLD, 0.12), color: ROLE_CONFIG[roleFilter]?.color ?? GOLD }}
          />
        )}
        <Typography sx={{ ml: "auto", fontSize: "0.8rem", color: "text.secondary" }}>
          {users.length} result{users.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Table size="small" sx={{ "& .MuiTableCell-root": { px: 2, py: 1.5 } }}>
          <TableHead>
            <TableRow sx={{ "& th": { borderBottom: "1px solid rgba(255,255,255,0.07)", background: alpha("#fff", 0.02), fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.secondary", py: 1.75 } }}>
              <TableCell>Admin</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton variant="text" width={j === 0 ? 180 : 100} /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: "center", py: 5 }}>
                  <PersonRounded sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
                  <Typography sx={{ color: "text.disabled", fontSize: "0.9rem" }}>No admin users found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, i) => (
                <UserRow key={user.id} user={user} index={i} onView={setDetailUser} onDelete={setDeleteId} />
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onClose={() => !createLoading && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: alpha(GOLD, 0.15), color: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AddRounded sx={{ fontSize: 20 }} />
            </Box>
            Create Admin User
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box component="form" id="create-admin-form" onSubmit={handleSubmit(onCreateSubmit)} noValidate>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("name", { required: "Name is required" })}
                  label="Full Name *"
                  fullWidth
                  autoFocus
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } })}
                  label="Email *"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register("password", { required: "Password is required", minLength: { value: 8, message: "Min 8 characters" } })}
                  label="Password *"
                  type="password"
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message ?? "Min 8 characters, include uppercase & numbers"}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Role *</InputLabel>
                  <Select
                    value={watchRole}
                    label="Role *"
                    onChange={(e) => setValue("role", e.target.value as Role)}
                  >
                    {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
                      <MenuItem key={role} value={role}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{ color: cfg.color, display: "flex" }}>{cfg.icon}</Box>
                          <Box>
                            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>{cfg.label}</Typography>
                            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{cfg.desc}</Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Role preview */}
              <Grid size={{ xs: 12 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={watchRole} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <Paper sx={{ p: 1.75, borderRadius: 2, background: alpha(ROLE_CONFIG[watchRole]?.color ?? GOLD, 0.06), border: `1px solid ${alpha(ROLE_CONFIG[watchRole]?.color ?? GOLD, 0.2)}` }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ color: ROLE_CONFIG[watchRole]?.color ?? GOLD, display: "flex" }}>
                          {ROLE_CONFIG[watchRole]?.icon}
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: ROLE_CONFIG[watchRole]?.color ?? GOLD }}>
                            {ROLE_CONFIG[watchRole]?.label}
                          </Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                            {watchRole === "super_admin" && "Full system access — permissions: { all: true }"}
                            {watchRole === "admin" && "Most admin features, cannot manage other super admins"}
                            {watchRole === "content_manager" && "Can manage blog posts, templates, and categories"}
                            {watchRole === "order_manager" && "Can view and manage orders and fulfilment"}
                            {watchRole === "support_staff" && "Can view contacts, orders, and respond to users"}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </motion.div>
                </AnimatePresence>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={watchIsActive}
                      onChange={(e) => setValue("is_active", e.target.checked)}
                      sx={{ "& .Mui-checked": { color: "#4CAF82" }, "& .Mui-checked + .MuiSwitch-track": { background: alpha("#4CAF82", 0.4) } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: "0.875rem" }}>Active account</Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>Inactive accounts cannot log in</Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} variant="outlined" size="small" disabled={createLoading}>Cancel</Button>
          <Button type="submit" form="create-admin-form" variant="contained" size="small" disabled={createLoading}>
            {createLoading ? "Creating…" : "Create Admin"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail dialog ── */}
      <Dialog open={!!detailUser} onClose={() => setDetailUser(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { maxHeight: "85vh" } }}>
        {detailUser && (
          <>
            <DialogTitle sx={{ pb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ width: 48, height: 48, fontWeight: 700, fontSize: "1rem", background: `linear-gradient(135deg, ${alpha(ROLE_CONFIG[detailUser.role]?.color ?? GOLD, 0.35)}, ${alpha(ROLE_CONFIG[detailUser.role]?.color ?? GOLD, 0.15)})`, color: ROLE_CONFIG[detailUser.role]?.color ?? GOLD, border: `2px solid ${alpha(ROLE_CONFIG[detailUser.role]?.color ?? GOLD, 0.3)}` }}>
                  {detailUser.name?.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>{detailUser.name}</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{detailUser.email}</Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                  <RoleBadge role={detailUser.role} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: detailUser.is_active ? "#4CAF82" : "#666" }} />
                    <Typography sx={{ fontSize: "0.7rem", color: detailUser.is_active ? "#4CAF82" : "text.disabled" }}>
                      {detailUser.is_active ? "Active" : "Inactive"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent>
              <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                {[
                  { label: "User ID", value: `#${detailUser.id}`, icon: <PersonRounded sx={{ fontSize: 14 }} /> },
                  { label: "Last Login IP", value: detailUser.last_login_ip ?? "—", icon: <AccessTimeRounded sx={{ fontSize: 14 }} /> },
                  { label: "Last Login", value: detailUser.last_login_at ? dayjs(detailUser.last_login_at).format("MMM D, YYYY HH:mm") : "Never", icon: <AccessTimeRounded sx={{ fontSize: 14 }} /> },
                  { label: "Member Since", value: dayjs(detailUser.created_at).format("MMM D, YYYY"), icon: <AccessTimeRounded sx={{ fontSize: 14 }} /> },
                ].map((item) => (
                  <Grid size={{ xs: 6 }} key={item.label}>
                    <Paper sx={{ p: 1.5, borderRadius: 2, background: alpha("#fff", 0.025), border: "1px solid rgba(255,255,255,0.06)" }}>
                      <Typography sx={{ fontSize: "0.65rem", color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 500, color: "#F0EDE8" }}>
                        {item.value}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Permissions */}
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1 }}>
                Permissions
              </Typography>
              <Paper sx={{ p: 1.75, borderRadius: 2, background: alpha("#fff", 0.02), border: "1px solid rgba(255,255,255,0.06)", fontFamily: "monospace" }}>
                {Object.keys(detailUser.permissions).length === 0 ? (
                  <Typography sx={{ fontSize: "0.78rem", color: "text.disabled" }}>No explicit permissions set</Typography>
                ) : (
                  Object.entries(detailUser.permissions).map(([key, val]) => (
                    <Box key={key} sx={{ display: "flex", justifyContent: "space-between", py: 0.4 }}>
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", fontFamily: "monospace" }}>{key}</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: val === true ? "#4CAF82" : GOLD, fontWeight: 600, fontFamily: "monospace" }}>
                        {String(val)}
                      </Typography>
                    </Box>
                  ))
                )}
              </Paper>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button variant="outlined" size="small" color="error" onClick={() => { setDeleteId(detailUser.id); setDetailUser(null); }} sx={{ mr: "auto" }}>
                Delete
              </Button>
              <Button onClick={() => setDetailUser(null)} variant="outlined" size="small">Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Admin User"
        message="Permanently delete this admin account? They will lose all access immediately."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}