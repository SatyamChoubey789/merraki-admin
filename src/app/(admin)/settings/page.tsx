"use client";
import { useState, useEffect } from "react";
import {
  Box, Paper, Typography, TextField, Button, Switch, Chip, Alert,
  Select, MenuItem, FormControl, InputLabel, Skeleton, CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  SaveRounded, TuneRounded, StorageRounded, MailRounded,
  WarningAmberRounded, LanguageRounded,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useSnackbar } from "notistack";
import useSWR from "swr";
import PageWrapper from "@/components/layout/PageWrapper";
import api from "@/lib/axios";

const GOLD = "#C9A84C";

// ── Types (flexible — whatever the backend returns) ────────────────────────────
interface SiteSettings {
  site_name?: string;
  site_url?: string;
  contact_email?: string;
  timezone?: string;
  currency?: string;
  maintenance_mode?: boolean;
  debug_mode?: boolean;
  allow_registration?: boolean;
  smtp_host?: string;
  smtp_port?: string | number;
  smtp_user?: string;
  smtp_from?: string;
  max_file_size_mb?: number;
  allowed_file_types?: string;
  items_per_page?: number;
  [key: string]: unknown;
}

// ── Reusable toggle row ────────────────────────────────────────────────────────
function ToggleRow({ label, desc, checked, onChange, warning }: {
  label: string; desc: string; checked: boolean;
  onChange: (v: boolean) => void; warning?: boolean;
}) {
  return (
    <Box sx={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      px: 2, py: 1.75, borderRadius: 2, transition: "all 0.2s",
      background: checked && warning ? alpha("#E05C5C", 0.07) : alpha("#fff", 0.02),
      border: `1px solid ${checked && warning ? alpha("#E05C5C", 0.2) : "rgba(255,255,255,0.05)"}`,
    }}>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>{label}</Typography>
          {warning && checked && (
            <Chip label="ACTIVE" size="small" sx={{
              height: 16, fontSize: "0.58rem", fontWeight: 700,
              background: alpha("#E05C5C", 0.15), color: "#E05C5C",
              "& .MuiChip-label": { px: 0.75 },
            }} />
          )}
        </Box>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.2 }}>{desc}</Typography>
      </Box>
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        sx={{
          "& .Mui-checked .MuiSwitch-thumb": { background: warning ? "#E05C5C" : GOLD },
          "& .Mui-checked + .MuiSwitch-track": { background: `${warning ? alpha("#E05C5C", 0.4) : alpha(GOLD, 0.4)} !important` },
        }}
      />
    </Box>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 2, background: alpha(GOLD, 0.1), color: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#F0EDE8" }}>{title}</Typography>
        <Typography sx={{ fontSize: "0.74rem", color: "text.secondary" }}>{desc}</Typography>
      </Box>
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [localSettings, setLocalSettings] = useState<SiteSettings>({});

  const { data, isLoading, mutate } = useSWR<{ success: boolean; data: SiteSettings }>("/admin/settings");

  // Sync fetched data into local state once
  useEffect(() => {
    if (data?.data) {
      setLocalSettings(data.data);
      setDirty(false);
    }
  }, [data]);

  const update = (key: keyof SiteSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", localSettings);
      enqueueSnackbar("Settings saved", { variant: "success" });
      await mutate();
      setDirty(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      enqueueSnackbar(msg ?? "Failed to save settings", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const s = localSettings;

  return (
    <PageWrapper
      title="Settings"
      subtitle="Platform configuration"
      actions={
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={15} sx={{ color: "inherit" }} /> : <SaveRounded />}
          disabled={saving || !dirty}
          onClick={handleSave}
          sx={{ borderRadius: 2, position: "relative" }}
        >
          {saving ? "Saving…" : dirty ? "Save Changes" : "Saved"}
        </Button>
      }
    >
      {/* Unsaved changes banner */}
      {dirty && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert
            severity="warning"
            icon={<WarningAmberRounded />}
            sx={{ mb: 3, borderRadius: 2.5, fontSize: "0.82rem" }}
            action={
              <Button size="small" color="inherit" onClick={() => { setLocalSettings(data?.data ?? {}); setDirty(false); }}>
                Discard
              </Button>
            }
          >
            You have unsaved changes.
          </Alert>
        </motion.div>
      )}

      <Grid container spacing={3}>
        {/* ── General ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <SectionHeader icon={<TuneRounded sx={{ fontSize: 19 }} />} title="General" desc="Core platform settings" />

              {isLoading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {[1,2,3,4].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField label="Site Name" value={s.site_name ?? ""} onChange={(e) => update("site_name", e.target.value)} fullWidth />
                  <TextField label="Site URL" value={s.site_url ?? ""} onChange={(e) => update("site_url", e.target.value)} fullWidth placeholder="https://merraki.com" />
                  <TextField label="Contact Email" value={s.contact_email ?? ""} onChange={(e) => update("contact_email", e.target.value)} fullWidth type="email" />
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Timezone</InputLabel>
                      <Select value={s.timezone ?? "Asia/Kolkata"} label="Timezone" onChange={(e) => update("timezone", e.target.value)}>
                        <MenuItem value="Asia/Kolkata">Asia/Kolkata (IST)</MenuItem>
                        <MenuItem value="UTC">UTC</MenuItem>
                        <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                        <MenuItem value="Europe/London">Europe/London (GMT)</MenuItem>
                        <MenuItem value="Asia/Singapore">Asia/Singapore (SGT)</MenuItem>
                        <MenuItem value="Asia/Dubai">Asia/Dubai (GST)</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel>Currency</InputLabel>
                      <Select value={s.currency ?? "INR"} label="Currency" onChange={(e) => update("currency", e.target.value)}>
                        <MenuItem value="INR">INR ₹</MenuItem>
                        <MenuItem value="USD">USD $</MenuItem>
                        <MenuItem value="EUR">EUR €</MenuItem>
                        <MenuItem value="GBP">GBP £</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <TextField
                    label="Results Per Page"
                    type="number"
                    value={s.items_per_page ?? 20}
                    onChange={(e) => update("items_per_page", parseInt(e.target.value))}
                    fullWidth
                    slotProps={{ htmlInput: { min: 5, max: 100, step: 5 } }}
                  />
                </Box>
              )}
            </Paper>
          </motion.div>
        </Grid>

        {/* ── System toggles ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <SectionHeader icon={<LanguageRounded sx={{ fontSize: 19 }} />} title="System" desc="Platform behaviour and access" />

              {isLoading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {[1,2,3].map((i) => <Skeleton key={i} variant="rounded" height={64} />)}
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                  <ToggleRow
                    label="Maintenance Mode"
                    desc="Take the public site offline for maintenance"
                    checked={!!s.maintenance_mode}
                    onChange={(v) => update("maintenance_mode", v)}
                    warning
                  />
                  <ToggleRow
                    label="Debug Mode"
                    desc="Enable verbose error logging and stack traces"
                    checked={!!s.debug_mode}
                    onChange={(v) => update("debug_mode", v)}
                    warning
                  />
                  <ToggleRow
                    label="Allow Registration"
                    desc="Let new users sign up on the platform"
                    checked={s.allow_registration !== false}
                    onChange={(v) => update("allow_registration", v)}
                  />
                </Box>
              )}

              {s.maintenance_mode && !isLoading && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <Alert severity="error" sx={{ mt: 2, borderRadius: 2, fontSize: "0.78rem" }}>
                    ⚠️ Maintenance mode is ON — the public site is offline.
                  </Alert>
                </motion.div>
              )}
            </Paper>
          </motion.div>
        </Grid>

        {/* ── Email / SMTP ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <SectionHeader icon={<MailRounded sx={{ fontSize: 19 }} />} title="Email / SMTP" desc="Outgoing email configuration" />

              {isLoading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {[1,2,3,4].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField label="SMTP Host" value={s.smtp_host ?? ""} onChange={(e) => update("smtp_host", e.target.value)} fullWidth placeholder="smtp.example.com" />
                    <TextField label="SMTP Port" value={s.smtp_port ?? ""} onChange={(e) => update("smtp_port", e.target.value)} sx={{ width: 120, flexShrink: 0 }} placeholder="587" />
                  </Box>
                  <TextField label="SMTP Username" value={s.smtp_user ?? ""} onChange={(e) => update("smtp_user", e.target.value)} fullWidth autoComplete="off" />
                  <TextField label="From Email" value={s.smtp_from ?? ""} onChange={(e) => update("smtp_from", e.target.value)} fullWidth placeholder="noreply@merraki.com" />
                </Box>
              )}
            </Paper>
          </motion.div>
        </Grid>

        {/* ── Storage / uploads ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <SectionHeader icon={<StorageRounded sx={{ fontSize: 19 }} />} title="Storage & Uploads" desc="File upload constraints" />

              {isLoading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {[1,2].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Max File Size (MB)"
                    type="number"
                    value={s.max_file_size_mb ?? 10}
                    onChange={(e) => update("max_file_size_mb", parseInt(e.target.value))}
                    fullWidth
                    slotProps={{ htmlInput: { min: 1, max: 500 } }}
                    helperText="Maximum allowed upload size per file"
                  />
                  <TextField
                    label="Allowed File Types"
                    value={s.allowed_file_types ?? ""}
                    onChange={(e) => update("allowed_file_types", e.target.value)}
                    fullWidth
                    placeholder="pdf,docx,pptx,xlsx,zip"
                    helperText="Comma-separated list of allowed extensions"
                  />
                </Box>
              )}
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* Sticky save bar at bottom on mobile */}
      {dirty && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100 }}>
          <Paper sx={{
            px: 2.5, py: 1.5, borderRadius: 3, alignItems: "center", gap: 2,
            background: alpha("#0D1B2A", 0.95), backdropFilter: "blur(12px)",
            border: `1px solid ${alpha(GOLD, 0.25)}`, boxShadow: `0 8px 32px ${alpha(GOLD, 0.15)}`,
            display: { xs: "flex", md: "none" },
          }}>
            <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Unsaved changes</Typography>
            <Button variant="contained" size="small" onClick={handleSave} disabled={saving} sx={{ borderRadius: 2 }}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Paper>
        </motion.div>
      )}
    </PageWrapper>
  );
}