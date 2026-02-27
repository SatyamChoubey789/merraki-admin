"use client";
import { useState } from "react";
import {
  Box, Typography, TextField, Button, Avatar, Chip,
  CircularProgress, IconButton, InputAdornment, Tooltip, Skeleton, Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  LockRounded, Visibility, VisibilityOff, LogoutRounded,
  ComputerRounded, SmartphoneRounded, DevicesRounded, DeleteRounded,
  WifiRounded, AccessTimeRounded, CheckRounded,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";

dayjs.extend(relativeTime);

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#D4B96A";
const NAVY = "#0A1628";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin",
  content_manager: "Content Manager", order_manager: "Order Manager", support_staff: "Support Staff",
};
const ROLE_COLORS: Record<string, string> = {
  super_admin: GOLD, admin: "#4A8FD4", content_manager: "#9B7FD4",
  order_manager: "#4CAF82", support_staff: "#E8A838",
};

interface Session {
  id: number;
  admin_id: number;
  device_name: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}
interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// ── Password strength ─────────────────────────────────────────────────────────
const PW_CHECKS = [
  { label: "8+ chars",    test: (p: string) => p.length >= 8 },
  { label: "Uppercase",   test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase",   test: (p: string) => /[a-z]/.test(p) },
  { label: "Number",      test: (p: string) => /[0-9]/.test(p) },
  { label: "Symbol",      test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = PW_CHECKS.filter((c) => c.test(password)).length;
  const colors = ["", "#E05C5C", "#E05C5C", "#E8A838", GOLD, "#4CAF82"];
  const labels = ["", "Very weak", "Weak", "Fair", "Good", "Strong"];
  const col = colors[score];

  return (
    <Box sx={{ mt: 1.75 }}>
      <Box sx={{ display: "flex", gap: 0.75, mb: 1.25 }}>
        {[1,2,3,4,5].map((i) => (
          <motion.div key={i} style={{ flex: 1 }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.04 }}>
            <Box sx={{
              height: 4, borderRadius: 4,
              background: i <= score ? col : alpha("#fff", 0.07),
              transition: "background 0.4s ease",
              transformOrigin: "left",
            }} />
          </motion.div>
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {PW_CHECKS.map((c) => {
            const ok = c.test(password);
            return (
              <Box key={c.label} sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                <Box sx={{
                  width: 14, height: 14, borderRadius: "50%",
                  background: ok ? "#4CAF82" : alpha("#fff", 0.08),
                  border: `1px solid ${ok ? "#4CAF82" : alpha("#fff", 0.12)}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.25s",
                }}>
                  {ok && <CheckRounded sx={{ fontSize: 9, color: "#fff" }} />}
                </Box>
                <Typography sx={{ fontSize: "0.65rem", color: ok ? "rgba(240,237,232,0.65)" : "rgba(240,237,232,0.2)", transition: "color 0.25s" }}>
                  {c.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
        {score > 0 && (
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: col }}>{labels[score]}</Typography>
        )}
      </Box>
    </Box>
  );
}

// ── Device icon ────────────────────────────────────────────────────────────────
function DeviceIcon({ ua }: { ua: string }) {
  const l = ua.toLowerCase();
  if (l.includes("mobile") || l.includes("android") || l.includes("iphone")) return <SmartphoneRounded sx={{ fontSize: 16 }} />;
  if (l.includes("postman") || l.includes("curl") || l.includes("python") || l.includes("http")) return <DevicesRounded sx={{ fontSize: 16 }} />;
  return <ComputerRounded sx={{ fontSize: 16 }} />;
}

// ── Session row ───────────────────────────────────────────────────────────────
function SessionRow({ session, isCurrent, onRevoke, revoking, index }: {
  session: Session; isCurrent: boolean;
  onRevoke: (id: number) => void; revoking: boolean; index: number;
}) {
  const expired = dayjs(session.expires_at).isBefore(dayjs());

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <Box sx={{
        display: "flex", alignItems: "center", gap: 2, px: 2.5, py: 2,
        borderRadius: 2.5, position: "relative", overflow: "hidden",
        background: isCurrent
          ? `linear-gradient(135deg, ${alpha(GOLD, 0.07)}, ${alpha(GOLD, 0.02)})`
          : alpha("#fff", 0.02),
        border: `1px solid ${isCurrent ? alpha(GOLD, 0.18) : "rgba(255,255,255,0.05)"}`,
        transition: "all 0.2s",
        "&:hover": { background: isCurrent ? alpha(GOLD, 0.09) : alpha("#fff", 0.04) },
      }}>
        {/* Left accent line for current session */}
        {isCurrent && (
          <Box sx={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
            background: `linear-gradient(180deg, ${GOLD}, ${alpha(GOLD, 0.2)})`,
            borderRadius: "3px 0 0 3px",
          }} />
        )}

        {/* Icon */}
        <Box sx={{
          width: 40, height: 40, borderRadius: 2, flexShrink: 0,
          background: isCurrent ? alpha(GOLD, 0.1) : alpha("#fff", 0.04),
          color: isCurrent ? GOLD : "rgba(240,237,232,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${isCurrent ? alpha(GOLD, 0.15) : "rgba(255,255,255,0.04)"}`,
        }}>
          <DeviceIcon ua={session.user_agent} />
        </Box>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
            <Typography sx={{ fontSize: "0.84rem", fontWeight: 600, color: isCurrent ? "#F0EDE8" : "rgba(240,237,232,0.7)" }}>
              {session.device_name || "Unknown client"}
            </Typography>
            {isCurrent && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: "#4CAF82", boxShadow: `0 0 6px #4CAF82` }} />
                <Typography sx={{ fontSize: "0.63rem", color: "#4CAF82", fontWeight: 700 }}>CURRENT</Typography>
              </Box>
            )}
            {expired && !isCurrent && (
              <Chip label="expired" size="small" sx={{ height: 15, fontSize: "0.58rem", background: alpha("#E05C5C", 0.1), color: "#E05C5C", "& .MuiChip-label": { px: 0.6 } }} />
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <WifiRounded sx={{ fontSize: 11, color: "text.disabled" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontFamily: "monospace" }}>{session.ip_address}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <AccessTimeRounded sx={{ fontSize: 11, color: "text.disabled" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{dayjs(session.created_at).fromNow()}</Typography>
            </Box>
            <Typography sx={{ fontSize: "0.7rem", color: expired ? "#E05C5C" : "rgba(240,237,232,0.25)" }}>
              {expired ? "Expired" : `Expires ${dayjs(session.expires_at).fromNow()}`}
            </Typography>
          </Box>
        </Box>

        {/* Revoke */}
        {!isCurrent && (
          <Tooltip title="Revoke this session" placement="left">
            <IconButton
              size="small" disabled={revoking}
              onClick={() => onRevoke(session.id)}
              sx={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 1.5,
                color: "rgba(240,237,232,0.25)", border: "1px solid rgba(255,255,255,0.06)",
                transition: "all 0.15s",
                "&:hover": { color: "#E05C5C", background: alpha("#E05C5C", 0.08), borderColor: alpha("#E05C5C", 0.2) },
              }}
            >
              {revoking ? <CircularProgress size={12} /> : <DeleteRounded sx={{ fontSize: 14 }} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </motion.div>
  );
}

// ── Password field ─────────────────────────────────────────────────────────────
function PwField({ show, onToggle, ...props }: { show: boolean; onToggle: () => void } & React.ComponentProps<typeof TextField>) {
  return (
    <TextField
      {...props}
      type={show ? "text" : "password"}
      InputProps={{
        startAdornment: <InputAdornment position="start"><LockRounded sx={{ fontSize: 16, color: alpha("#fff", 0.2) }} /></InputAdornment>,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={onToggle} tabIndex={-1} sx={{ color: alpha("#fff", 0.25) }}>
              {show ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
      <Box sx={{
        borderRadius: 3, overflow: "hidden",
        background: alpha("#fff", 0.022),
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(4px)",
      }}>
        {children}
      </Box>
    </motion.div>
  );
}

function SectionTitle({ label, sub }: { label: string; sub: string }) {
  return (
    <Box sx={{ px: 3, pt: 3, pb: 2.5, borderBottom: "1px solid rgba(255,255,255,0.045)" }}>
      <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#F0EDE8", mb: 0.2 }}>{label}</Typography>
      <Typography sx={{ fontSize: "0.73rem", color: "rgba(240,237,232,0.35)" }}>{sub}</Typography>
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revokeAllLoading, setRevokeAllLoading] = useState(false);

  const { data: meData, isLoading: meLoading } = useSWR("/admin/auth/me");
  const { data: sessData, isLoading: sessLoading, mutate: mutateSess } = useSWR("/admin/auth/sessions");

  const admin = meData?.data?.admin;
  const sessions: Session[] = sessData?.data?.sessions ?? [];
  const roleColor = ROLE_COLORS[admin?.role ?? ""] ?? GOLD;
  const roleLabel = ROLE_LABELS[admin?.role ?? ""] ?? admin?.role ?? "Admin";
  const initials = (admin?.email ?? "A").charAt(0).toUpperCase();
  const activeSessions = sessions.filter((s) => s.is_active).length;

  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<PasswordForm>();
  const watchNew = watch("new_password", "");

  const onPasswordSubmit = async (data: PasswordForm) => {
    if (data.new_password !== data.confirm_password) {
      setError("confirm_password", { message: "Passwords don't match" });
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/admin/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      enqueueSnackbar("Password changed — redirecting to login", { variant: "success" });
      reset();
      setTimeout(() => router.push("/login"), 1400);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes("incorrect") || msg?.includes("INVALID_PASSWORD")) {
        setError("current_password", { message: "Incorrect password" });
      } else {
        enqueueSnackbar(msg ?? "Failed to change password", { variant: "error" });
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    setRevokingId(sessionId);
    try {
      await api.delete(`/admin/auth/sessions/${sessionId}`);
      enqueueSnackbar("Session revoked", { variant: "success" });
      await mutateSess();
    } catch { enqueueSnackbar("Failed to revoke", { variant: "error" }); }
    finally { setRevokingId(null); }
  };

  const handleRevokeAll = async () => {
    setRevokeAllLoading(true);
    try {
      await api.delete("/admin/auth/sessions");
      enqueueSnackbar("All sessions revoked", { variant: "success" });
      setTimeout(() => router.push("/login"), 1200);
    } catch { enqueueSnackbar("Failed", { variant: "error" }); }
    finally { setRevokeAllLoading(false); setRevokeAllOpen(false); }
  };

  return (
    <PageWrapper title="" subtitle="">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <Box sx={{
          position: "relative", borderRadius: 4, overflow: "hidden", mb: 4,
          background: `linear-gradient(135deg, ${alpha(NAVY, 0.95)} 0%, #0F1E35 50%, ${alpha(NAVY, 0.98)} 100%)`,
          border: `1px solid ${alpha(GOLD, 0.15)}`,
          p: { xs: 3, md: 4 },
        }}>
          {/* Decorative gold grid */}
          <Box sx={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: `
              linear-gradient(${alpha(GOLD, 0.6)} 1px, transparent 1px),
              linear-gradient(90deg, ${alpha(GOLD, 0.6)} 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }} />
          {/* Gold glow orb */}
          <Box sx={{
            position: "absolute", top: -60, right: -60, width: 260, height: 260,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(GOLD, 0.12)} 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
            {/* Avatar */}
            {meLoading ? (
              <Skeleton variant="circular" width={76} height={76} />
            ) : (
              <Box sx={{ position: "relative", flexShrink: 0 }}>
                <Avatar sx={{
                  width: 76, height: 76, fontSize: "1.9rem", fontWeight: 800,
                  background: `linear-gradient(135deg, ${alpha(roleColor, 0.5)}, ${alpha(roleColor, 0.15)})`,
                  color: roleColor,
                  border: `2px solid ${alpha(roleColor, 0.4)}`,
                  boxShadow: `0 0 40px ${alpha(roleColor, 0.25)}, inset 0 0 20px ${alpha(roleColor, 0.05)}`,
                  fontFamily: '"DM Serif Display", serif',
                }}>
                  {initials}
                </Avatar>
                <Box sx={{
                  position: "absolute", bottom: 3, right: 3, width: 13, height: 13,
                  borderRadius: "50%", background: "#4CAF82", border: `2px solid ${NAVY}`,
                  boxShadow: `0 0 8px ${alpha("#4CAF82", 0.9)}`,
                }} />
              </Box>
            )}

            {/* Identity */}
            <Box sx={{ flex: 1, minWidth: 180 }}>
              {meLoading ? (
                <>
                  <Skeleton width={180} height={28} sx={{ mb: 0.5 }} />
                  <Skeleton width={220} height={18} />
                </>
              ) : (
                <>
                  <Typography sx={{
                    fontSize: "1.4rem", fontWeight: 800, color: "#F0EDE8", lineHeight: 1.2, mb: 0.5,
                    fontFamily: '"DM Serif Display", serif',
                  }}>
                    {admin?.email?.split("@")[0] ?? "—"}
                  </Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.45)", mb: 1.25, fontFamily: "monospace" }}>
                    {admin?.email}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip label={roleLabel} size="small" sx={{
                      height: 22, fontSize: "0.68rem", fontWeight: 700,
                      background: alpha(roleColor, 0.12), color: roleColor,
                      border: `1px solid ${alpha(roleColor, 0.3)}`,
                    }} />
                    <Chip label={`ID #${admin?.id}`} size="small" sx={{
                      height: 22, fontSize: "0.68rem", fontFamily: "monospace",
                      background: alpha("#fff", 0.05), color: "rgba(240,237,232,0.4)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }} />
                  </Box>
                </>
              )}
            </Box>

            {/* Quick stats */}
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {[
                { label: "Active Sessions", value: sessLoading ? "…" : String(activeSessions), color: "#4CAF82" },
                { label: "Total Sessions", value: sessLoading ? "…" : String(sessions.length), color: GOLD },
              ].map((stat) => (
                <Box key={stat.label} sx={{
                  px: 2.5, py: 1.5, borderRadius: 2.5, textAlign: "center", minWidth: 90,
                  background: alpha(stat.color, 0.07),
                  border: `1px solid ${alpha(stat.color, 0.18)}`,
                }}>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: stat.color, lineHeight: 1, fontFamily: '"DM Serif Display", serif' }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{ fontSize: "0.62rem", color: "rgba(240,237,232,0.35)", mt: 0.3, letterSpacing: "0.06em" }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <Grid container spacing={3}>
        {/* Password */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Section delay={0.1}>
            <SectionTitle label="Change Password" sub="Forces sign-out of all active sessions" />
            <Box sx={{ p: 3 }}>
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2, fontSize: "0.78rem", "& .MuiAlert-message": { lineHeight: 1.6 } }}>
                On success you'll be redirected to login — all sessions are revoked by the server.
              </Alert>
              <Box component="form" onSubmit={handleSubmit(onPasswordSubmit)} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
                <PwField
                  {...register("current_password", { required: "Required" })}
                  label="Current Password"
                  show={show.current}
                  onToggle={() => setShow((p) => ({ ...p, current: !p.current }))}
                  fullWidth autoComplete="current-password"
                  error={!!errors.current_password}
                  helperText={errors.current_password?.message}
                />
                <Box>
                  <PwField
                    {...register("new_password", { required: "Required", minLength: { value: 8, message: "Min 8 characters" } })}
                    label="New Password"
                    show={show.new}
                    onToggle={() => setShow((p) => ({ ...p, new: !p.new }))}
                    fullWidth autoComplete="new-password"
                    error={!!errors.new_password}
                    helperText={errors.new_password?.message}
                  />
                  <StrengthBar password={watchNew} />
                </Box>
                <PwField
                  {...register("confirm_password", { required: "Required" })}
                  label="Confirm New Password"
                  show={show.confirm}
                  onToggle={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
                  fullWidth autoComplete="new-password"
                  error={!!errors.confirm_password}
                  helperText={errors.confirm_password?.message}
                />
                <Button
                  type="submit" variant="contained" disabled={pwLoading}
                  startIcon={pwLoading ? <CircularProgress size={15} sx={{ color: "inherit" }} /> : <LockRounded />}
                  sx={{ borderRadius: 2, alignSelf: "flex-start", mt: 0.5 }}
                >
                  {pwLoading ? "Changing…" : "Change Password"}
                </Button>
              </Box>
            </Box>
          </Section>
        </Grid>

        {/* Sessions */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Section delay={0.15}>
            <Box sx={{ px: 3, pt: 3, pb: 2.5, borderBottom: "1px solid rgba(255,255,255,0.045)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#F0EDE8", mb: 0.2 }}>Active Sessions</Typography>
                <Typography sx={{ fontSize: "0.73rem", color: "rgba(240,237,232,0.35)" }}>
                  {sessLoading ? "Loading…" : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} · ${activeSessions} active`}
                </Typography>
              </Box>
              <Button
                variant="outlined" color="error" size="small"
                onClick={() => setRevokeAllOpen(true)}
                startIcon={<LogoutRounded sx={{ fontSize: 15 }} />}
                sx={{ borderRadius: 2, fontSize: "0.75rem" }}
              >
                Revoke All
              </Button>
            </Box>

            <Box sx={{ p: 2.5 }}>
              {sessLoading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                  {[1,2,3].map((i) => (
                    <Skeleton key={i} variant="rounded" height={68} sx={{ borderRadius: 2.5 }} />
                  ))}
                </Box>
              ) : sessions.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 5 }}>
                  <DevicesRounded sx={{ fontSize: 36, color: "rgba(255,255,255,0.1)", mb: 1 }} />
                  <Typography sx={{ color: "rgba(240,237,232,0.25)", fontSize: "0.875rem" }}>No sessions found</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <AnimatePresence>
                    {sessions.map((session, i) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        index={i}
                        isCurrent={i === 0}
                        revoking={revokingId === session.id}
                        onRevoke={handleRevokeSession}
                      />
                    ))}
                  </AnimatePresence>
                </Box>
              )}
            </Box>
          </Section>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={revokeAllOpen}
        title="Revoke All Sessions"
        message="This immediately signs you out of all devices including this one. You will be redirected to the login page."
        confirmLabel="Revoke All & Sign Out"
        loading={revokeAllLoading}
        onConfirm={handleRevokeAll}
        onClose={() => !revokeAllLoading && setRevokeAllOpen(false)}
      />
    </PageWrapper>
  );
}