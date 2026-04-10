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
  Tabs,
  Tab,
  Chip,
  Divider,
  Avatar,
  CircularProgress,
  Alert,
  AlertTitle,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  CheckRounded,
  CloseRounded,
  VisibilityRounded,
  DeleteRounded,
  EmailRounded,
  WarningAmberRounded,
  HourglassEmptyRounded,
  SendRounded,
  PaymentRounded,
  PersonRounded,
  VerifiedRounded,
  InventoryRounded,
  FileDownloadRounded,
  PaidRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { motion, AnimatePresence } from "framer-motion";
import { alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import PageWrapper from "@/components/layout/PageWrapper";
import DataTable, { Column } from "@/components/ui/DataTable";
import StatusChip from "@/components/ui/StatusChip";
import SearchBar from "@/components/ui/SearchBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";

dayjs.extend(relativeTime);
const GOLD = "#C9A84C";

// ── Types — exactly aligned to domain.Order + domain.OrderItem ────────────────

interface OrderItem {
  id: number;
  order_id: number;
  template_id: number;
  template_name: string;
  template_slug: string;
  template_version: string;
  price_usd_cents: number;       // FIX: was unit_price/subtotal — domain uses price_usd_cents
  file_url?: string;
  file_format?: string;
  file_size_mb?: number;
  download_count: number;
  last_downloaded_at?: string;
  created_at: string;
}

// domain.OrderStatus values
type OrderStatus =
  | "pending"
  | "payment_initiated"
  | "payment_processing"
  | "paid"
  | "admin_review"
  | "approved"
  | "rejected"
  | "failed"
  | "cancelled"
  | "refunded";

interface Order {
  id: number;
  order_number: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  customer_ip?: string;
  customer_country?: string;
  billing_name?: string;
  billing_email?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country: string;
  // FIX: all amounts in cents — domain fields
  subtotal_usd_cents: number;
  tax_amount_usd_cents: number;
  discount_amount_usd_cents: number;
  total_amount_usd_cents: number;
  payment_gateway: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  status: OrderStatus;
  admin_reviewed_by?: number;
  admin_reviewed_at?: string;
  admin_notes?: string;
  rejection_reason?: string;
  downloads_enabled: boolean;
  downloads_expires_at?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

// API response shapes — matched to handler returns
interface OrdersResponse {
  orders: Order[] | null;
  total: number;
  page: number;
  limit: number;
}

interface OrderDetailResponse {
  order: Order;
  transitions?: unknown[];
}

interface AnalyticsResponse {
  success: boolean;
  data?: {
    monthly?: Array<{ month: string; revenue: number; orders: number }>;
  } | null;
}

// ── Currency helpers — cents → display ───────────────────────────────────────
function centsToDisplay(cents: number): string {
  const usd = cents / 100;
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Verification checklist ────────────────────────────────────────────────────
interface VerificationChecks {
  paymentVerified: boolean;
  amountCorrect: boolean;
  userIdentityOk: boolean;
  noFraudFlags: boolean;
  itemsAvailable: boolean;
}

const CHECK_CONFIG: Record<
  keyof VerificationChecks,
  { label: string; icon: React.ReactNode; critical: boolean }
> = {
  paymentVerified: {
    label: "Payment transaction confirmed in gateway",
    icon: <PaymentRounded sx={{ fontSize: 15 }} />,
    critical: true,
  },
  amountCorrect: {
    label: "Paid amount matches the order total exactly",
    icon: <CheckRounded sx={{ fontSize: 15 }} />,
    critical: true,
  },
  userIdentityOk: {
    label: "Customer account is legitimate and active",
    icon: <PersonRounded sx={{ fontSize: 15 }} />,
    critical: true,
  },
  noFraudFlags: {
    label: "No fraud or chargeback risk detected",
    icon: <VerifiedRounded sx={{ fontSize: 15 }} />,
    critical: true,
  },
  itemsAvailable: {
    label: "All ordered templates are ready for download",
    icon: <InventoryRounded sx={{ fontSize: 15 }} />,
    critical: false,
  },
};

// ── Status helpers ────────────────────────────────────────────────────────────
function statusColor(status: OrderStatus): string {
  switch (status) {
    case "approved":   return "#4CAF82";
    case "paid":       return "#4A8FD4";
    case "admin_review": return "#E8A838";
    case "rejected":
    case "failed":
    case "cancelled":  return "#E05C5C";
    case "refunded":   return "#9B59B6";
    default:           return GOLD;
  }
}

// ── Mark as Paid Dialog ───────────────────────────────────────────────────────
function MarkPaidDialog({
  order,
  open,
  onClose,
  onSuccess,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [gatewayOrderID, setGatewayOrderID] = useState("");
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const handleSubmit = async () => {
    if (!gatewayOrderID.trim()) {
      enqueueSnackbar("Gateway Order ID is required", { variant: "warning" });
      return;
    }
    setLoading(true);
    try {
      // POST /admin/orders/:id/mark-paid
      await api.post(`/admin/orders/${order.id}/mark-paid`, {
        gateway_order_id: gatewayOrderID.trim(),
      });
      enqueueSnackbar("✅ Order marked as paid", { variant: "success" });
      setGatewayOrderID("");
      onSuccess();
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Failed to mark as paid", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 34, height: 34, borderRadius: "50%",
              background: alpha("#4A8FD4", 0.12),
              border: `1.5px solid ${alpha("#4A8FD4", 0.35)}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <PaidRounded sx={{ color: "#4A8FD4", fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>Mark Order as Paid</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {order.order_number} · {order.customer_name} ·{" "}
              {centsToDisplay(order.total_amount_usd_cents)}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.82rem" }}>
          This manually marks the order as paid and records the gateway order ID.
          Only use when payment was confirmed outside the normal flow.
        </Alert>
        <TextField
          fullWidth
          label="Gateway Order ID"
          value={gatewayOrderID}
          onChange={(e) => setGatewayOrderID(e.target.value)}
          placeholder="e.g. order_QkXp2b1234..."
          helperText="Razorpay order ID from the payment gateway dashboard"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button
          variant="contained"
          size="small"
          disabled={loading || !gatewayOrderID.trim()}
          startIcon={loading ? <CircularProgress size={12} /> : <PaidRounded />}
          onClick={handleSubmit}
          sx={{ background: "linear-gradient(135deg, #4A8FD4, #2E6DB4)" }}
        >
          {loading ? "Processing…" : "Mark as Paid"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Approval Dialog ───────────────────────────────────────────────────────────
function ApprovalDialog({
  order,
  open,
  onClose,
  onApproved,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState<VerificationChecks>({
    paymentVerified: false,
    amountCorrect: false,
    userIdentityOk: false,
    noFraudFlags: false,
    itemsAvailable: false,
  });
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const criticalKeys = (
    Object.keys(CHECK_CONFIG) as (keyof VerificationChecks)[]
  ).filter((k) => CHECK_CONFIG[k].critical);
  const allCriticalChecked = criticalKeys.every((k) => checks[k]);
  const checkCount = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;

  const handleApprove = async () => {
    if (!allCriticalChecked) {
      enqueueSnackbar("Complete all required checks first", { variant: "warning" });
      return;
    }
    setLoading(true);
    try {
      // POST /admin/orders/:id/approve
      await api.post(`/admin/orders/${order.id}/approve`, {
        notes: adminNotes || null,
      });
      enqueueSnackbar("✅ Order approved — confirmation email sent", { variant: "success" });
      onApproved();
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Approval failed", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: keyof VerificationChecks) =>
    setChecks((p) => ({ ...p, [key]: !p[key] }));

  const STEP_LABELS = ["Order Details", "Verify & Check", "Confirm & Send"];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: "92vh", borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 38, height: 38, borderRadius: "50%",
              background: alpha("#4CAF82", 0.12),
              border: `1.5px solid ${alpha("#4CAF82", 0.35)}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <CheckRounded sx={{ color: "#4CAF82", fontSize: 20 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>
              Approve Order #{order.order_number}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {order.customer_name} · {centsToDisplay(order.total_amount_usd_cents)} ·{" "}
              {order.customer_email}
            </Typography>
          </Box>
          <StatusChip status={order.status} />
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          {STEP_LABELS.map((label, i) => (
            <Box
              key={i}
              onClick={() =>
                (i < step || i === 1 || (i === 2 && allCriticalChecked)) &&
                setStep(i)
              }
              sx={{ flex: 1, cursor: "pointer" }}
            >
              <Box
                sx={{
                  height: 3, borderRadius: 2,
                  background: step >= i
                    ? step > i ? "#4CAF82" : GOLD
                    : "rgba(255,255,255,0.1)",
                  transition: "all 0.3s",
                }}
              />
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: step >= i ? (step > i ? "#4CAF82" : GOLD) : "text.disabled",
                  mt: 0.5,
                  fontWeight: step === i ? 600 : 400,
                }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ overflow: "auto" }}>
        <AnimatePresence mode="wait">
          {/* Step 0 — Order details */}
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Grid container spacing={2}>
                {/* Customer */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    sx={{
                      p: 2, borderRadius: 2,
                      background: alpha(GOLD, 0.04),
                      border: `1px solid ${alpha(GOLD, 0.15)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.67rem", fontWeight: 700, color: GOLD,
                        letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5,
                      }}
                    >
                      Customer
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 36, height: 36, fontWeight: 700,
                          background: alpha(GOLD, 0.2), color: GOLD, fontSize: "0.9rem",
                        }}
                      >
                        {order.customer_name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          {order.customer_name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.73rem", color: "text.secondary" }}>
                          {order.customer_email}
                        </Typography>
                      </Box>
                    </Box>
                    <Grid container spacing={1}>
                      {[
                        ["Phone", order.customer_phone ?? "—"],
                        ["Country", order.customer_country ?? "—"],
                        ["Order #", order.order_number],
                      ].map(([l, v]) => (
                        <Grid size={{ xs: 6 }} key={String(l)}>
                          <Typography
                            sx={{
                              fontSize: "0.65rem", color: "text.disabled",
                              textTransform: "uppercase", letterSpacing: "0.05em",
                            }}
                          >
                            {l}
                          </Typography>
                          <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                            {String(v)}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Payment — FIX: use *_usd_cents fields */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    sx={{
                      p: 2, borderRadius: 2,
                      background: alpha("#4A8FD4", 0.04),
                      border: `1px solid ${alpha("#4A8FD4", 0.18)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.67rem", fontWeight: 700, color: "#4A8FD4",
                        letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5,
                      }}
                    >
                      Payment
                    </Typography>
                    <Grid container spacing={1}>
                      {[
                        ["Total", centsToDisplay(order.total_amount_usd_cents)],
                        ["Subtotal", centsToDisplay(order.subtotal_usd_cents)],
                        ["Tax", centsToDisplay(order.tax_amount_usd_cents)],
                        ["Discount", centsToDisplay(order.discount_amount_usd_cents)],
                        ["Gateway", order.payment_gateway],
                        ["Gateway Order ID", order.gateway_order_id ?? "—"],
                        ["Gateway Payment ID", order.gateway_payment_id ?? "—"],
                        ["Status", order.status],
                      ].map(([l, v]) => (
                        <Grid size={{ xs: 6 }} key={String(l)}>
                          <Typography
                            sx={{
                              fontSize: "0.65rem", color: "text.disabled",
                              textTransform: "uppercase", letterSpacing: "0.05em",
                            }}
                          >
                            {l}
                          </Typography>
                          <Typography
                            sx={{ fontSize: "0.8rem", fontWeight: 500, wordBreak: "break-all" }}
                          >
                            {String(v)}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Items — FIX: use price_usd_cents, no quantity/unit_price */}
                <Grid size={{ xs: 12 }}>
                  <Typography
                    sx={{
                      fontSize: "0.7rem", fontWeight: 700, color: "text.secondary",
                      textTransform: "uppercase", letterSpacing: "0.06em", mb: 1,
                    }}
                  >
                    Ordered Templates
                  </Typography>
                  {(order.items ?? []).map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", p: 1.5, mb: 0.75, borderRadius: 2,
                        background: alpha("#fff", 0.03),
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <InventoryRounded sx={{ fontSize: 15, color: GOLD }} />
                        <Box>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                            {item.template_name}
                          </Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                            v{item.template_version} · {item.file_format ?? "—"}
                            {item.file_url && (
                              <Box component="span" sx={{ ml: 1, color: "#4CAF82" }}>
                                · File attached ✓
                              </Box>
                            )}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: GOLD }}>
                        {centsToDisplay(item.price_usd_cents)}
                      </Typography>
                    </Box>
                  ))}
                  <Box
                    sx={{
                      display: "flex", justifyContent: "space-between",
                      p: 1.5, borderRadius: 2,
                      background: alpha(GOLD, 0.06),
                      border: `1px solid ${alpha(GOLD, 0.2)}`, mt: 0.5,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600 }}>Total</Typography>
                    <Typography sx={{ fontWeight: 700, color: GOLD, fontSize: "1rem" }}>
                      {centsToDisplay(order.total_amount_usd_cents)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" size="small" onClick={() => setStep(1)}>
                  Continue to Verification →
                </Button>
              </Box>
            </motion.div>
          )}

          {/* Step 1 — Checklist */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {!allCriticalChecked && (
                <Alert
                  severity="warning"
                  icon={<WarningAmberRounded />}
                  sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.82rem" }}
                >
                  <AlertTitle sx={{ fontSize: "0.84rem" }}>
                    All required checks must be completed
                  </AlertTitle>
                  Verify payment and customer identity before approving.
                </Alert>
              )}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                    Verification progress
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.78rem", fontWeight: 700,
                      color: checkCount === totalChecks ? "#4CAF82" : GOLD,
                    }}
                  >
                    {checkCount}/{totalChecks}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(checkCount / totalChecks) * 100}
                  sx={{
                    height: 6, borderRadius: 3, background: alpha("#fff", 0.06),
                    "& .MuiLinearProgress-bar": {
                      background: checkCount === totalChecks
                        ? "linear-gradient(90deg, #4CAF82, #6EC99E)"
                        : `linear-gradient(90deg, ${GOLD}, #D4B96A)`,
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2.5 }}>
                {(Object.keys(CHECK_CONFIG) as (keyof VerificationChecks)[]).map((key) => {
                  const { label, icon, critical } = CHECK_CONFIG[key];
                  const checked = checks[key];
                  return (
                    <motion.div key={key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                      <Box
                        onClick={() => toggle(key)}
                        sx={{
                          display: "flex", alignItems: "center", gap: 1.5,
                          p: 1.5, borderRadius: 2, cursor: "pointer",
                          background: checked ? alpha("#4CAF82", 0.08) : alpha("#fff", 0.03),
                          border: `1px solid ${checked ? alpha("#4CAF82", 0.25) : "rgba(255,255,255,0.07)"}`,
                          transition: "all 0.18s",
                          "&:hover": { background: checked ? alpha("#4CAF82", 0.12) : alpha("#fff", 0.06) },
                        }}
                      >
                        <Box
                          sx={{
                            width: 22, height: 22, borderRadius: 1, flexShrink: 0,
                            background: checked ? "#4CAF82" : alpha("#fff", 0.06),
                            border: `1.5px solid ${checked ? "#4CAF82" : "rgba(255,255,255,0.2)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.18s",
                          }}
                        >
                          {checked && <CheckRounded sx={{ fontSize: 13, color: "#fff" }} />}
                        </Box>
                        <Box
                          sx={{
                            width: 28, height: 28, borderRadius: 1.5, flexShrink: 0,
                            background: alpha(checked ? "#4CAF82" : GOLD, 0.1),
                            color: checked ? "#4CAF82" : GOLD,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {icon}
                        </Box>
                        <Typography
                          sx={{ fontSize: "0.84rem", flex: 1, color: checked ? "#4CAF82" : "rgba(240,237,232,0.8)" }}
                        >
                          {label}
                        </Typography>
                        {critical && (
                          <Chip
                            label="Required"
                            size="small"
                            sx={{
                              height: 18, fontSize: "0.6rem", flexShrink: 0,
                              background: alpha("#E05C5C", 0.12), color: "#E05C5C",
                              border: `1px solid ${alpha("#E05C5C", 0.25)}`,
                            }}
                          />
                        )}
                      </Box>
                    </motion.div>
                  );
                })}
              </Box>

              <TextField
                label="Admin Notes (optional)"
                fullWidth
                multiline
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal note saved with the order…"
              />
              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                <Button variant="outlined" size="small" onClick={() => setStep(0)}>← Back</Button>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!allCriticalChecked}
                  onClick={() => setStep(2)}
                >
                  Review & Confirm →
                </Button>
              </Box>
            </motion.div>
          )}

          {/* Step 2 — Confirm */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Alert
                severity="info"
                icon={<EmailRounded />}
                sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.82rem" }}
              >
                <AlertTitle sx={{ fontSize: "0.84rem" }}>
                  Confirmation email sent automatically
                </AlertTitle>
                On approval, <strong>{order.customer_email}</strong> receives secure
                download links. Links expire in 30 days.
              </Alert>

              <Paper
                sx={{
                  borderRadius: 2, overflow: "hidden", mb: 2.5,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Box
                  sx={{
                    p: 1.75, background: alpha(GOLD, 0.08),
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {[
                    `FROM: noreply@merraki.com`,
                    `TO: ${order.customer_email}`,
                    `SUBJECT: ✅ Order ${order.order_number} Confirmed — Your downloads are ready`,
                  ].map((line) => (
                    <Typography
                      key={line}
                      sx={{ fontSize: "0.68rem", color: "text.disabled", lineHeight: 1.8 }}
                    >
                      {line}
                    </Typography>
                  ))}
                </Box>
                <Box sx={{ p: 2.5, background: alpha("#111827", 0.5) }}>
                  <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: "0.95rem", color: GOLD }}>
                    Order Confirmed! 🎉
                  </Typography>
                  <Typography sx={{ fontSize: "0.81rem", color: "text.secondary", mb: 2, lineHeight: 1.7 }}>
                    Hi {order.customer_name?.split(" ")[0]}, your order has been approved.
                    Here are your secure download links:
                  </Typography>
                  {(order.items ?? []).map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", p: 1.25, mb: 0.75, borderRadius: 1.5,
                        background: alpha(GOLD, 0.05), border: `1px solid ${alpha(GOLD, 0.15)}`,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <InventoryRounded sx={{ fontSize: 13, color: GOLD }} />
                        <Typography sx={{ fontSize: "0.8rem" }}>{item.template_name}</Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex", alignItems: "center", gap: 0.5,
                          px: 1.2, py: 0.4, borderRadius: 1, background: "#4CAF82",
                        }}
                      >
                        <FileDownloadRounded sx={{ fontSize: 11, color: "#fff" }} />
                        <Typography sx={{ fontSize: "0.67rem", color: "#fff", fontWeight: 600 }}>
                          Download
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", mt: 1.5 }}>
                    ⏳ Links expire in 30 days · Order: {order.order_number}
                  </Typography>
                </Box>
              </Paper>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="outlined" size="small" onClick={() => setStep(1)}>← Back</Button>
                <Button
                  variant="contained"
                  size="small"
                  disabled={loading || !allCriticalChecked}
                  startIcon={
                    loading
                      ? <CircularProgress size={14} sx={{ color: "#fff" }} />
                      : <SendRounded />
                  }
                  onClick={handleApprove}
                  sx={{
                    background: "linear-gradient(135deg, #4CAF82, #357A5E)",
                    "&:hover": { background: "linear-gradient(135deg, #5BC98F, #4CAF82)" },
                  }}
                >
                  {loading ? "Approving…" : "Approve & Send Email"}
                </Button>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [approvalOrder, setApprovalOrder] = useState<Order | null>(null);
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [markPaidOrder, setMarkPaidOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, []);

  // Endpoints match routes exactly:
  // GET /admin/orders          — all orders (tab 0)
  // GET /admin/orders/pending-review — pending only (tab 1)
  const allEndpoint =
    `/admin/orders?page=${page + 1}&limit=25` +
    (search ? `&email=${encodeURIComponent(search)}` : "") +
    (statusFilter ? `&status=${statusFilter}` : "");

  const pendingEndpoint = `/admin/orders/pending-review?page=${page + 1}&limit=25`;

  const { data, isLoading, mutate } = useSWR<OrdersResponse>(
    tab === 0 ? allEndpoint : tab === 1 ? pendingEndpoint : null,
    { refreshInterval: 30_000 },
  );

  const { data: analyticsRes, isLoading: analyticsLoading } =
    useSWR<AnalyticsResponse>(tab === 2 ? `/admin/orders/revenue-analytics` : null);

  const orders: Order[] = data?.orders ?? [];
  const total: number = data?.total ?? 0;

  const { data: pendingCountRes } = useSWR<OrdersResponse>(
    "/admin/orders/pending-review?page=1&limit=1",
    { refreshInterval: 30_000 },
  );
  const pendingCount = pendingCountRes?.total ?? 0;

  const handleMutate = useCallback(() => mutate(), [mutate]);

  // POST /admin/orders/:id/reject
  const handleReject = async () => {
    if (!rejectOrder || !rejectReason.trim()) {
      enqueueSnackbar("Rejection reason is required", { variant: "warning" });
      return;
    }
    setRejectLoading(true);
    try {
      await api.post(`/admin/orders/${rejectOrder.id}/reject`, { reason: rejectReason });
      enqueueSnackbar("Order rejected — customer notified by email", { variant: "info" });
      await mutate();
      setRejectOrder(null);
      setRejectReason("");
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Rejection failed", { variant: "error" });
    } finally {
      setRejectLoading(false);
    }
  };

  // DELETE /admin/orders/:id
  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/orders/${deleteId}`);
      enqueueSnackbar("Order deleted", { variant: "success" });
      setDeleteId(null);
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.error ?? "Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Columns — FIX: use total_amount_usd_cents ─────────────────────────────
  const columns: Column<Order>[] = [
    {
      key: "order_number",
      label: "Order",
      render: (row) => (
        <Typography
          sx={{ fontFamily: "monospace", fontSize: "0.82rem", color: GOLD, fontWeight: 600 }}
        >
          {row.order_number}
        </Typography>
      ),
    },
    {
      key: "customer_name",
      label: "Customer",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 30, height: 30, fontSize: "0.75rem", fontWeight: 700,
              background: alpha(GOLD, 0.15), color: GOLD, flexShrink: 0,
            }}
          >
            {row.customer_name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "0.84rem", fontWeight: 500,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {row.customer_name}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.72rem", color: "text.secondary",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {row.customer_email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "items",
      label: "Templates",
      hideOnMobile: true,
      render: (row) => (
        <Box>
          {(row.items ?? []).slice(0, 2).map((item) => (
            <Typography
              key={item.id}
              sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.5 }}
            >
              {item.template_name}
            </Typography>
          ))}
          {(row.items?.length ?? 0) > 2 && (
            <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
              +{(row.items?.length ?? 0) - 2} more
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "total_amount_usd_cents",
      label: "Amount",
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: "#4CAF82", fontSize: "0.875rem" }}>
          {centsToDisplay(row.total_amount_usd_cents)}
        </Typography>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
          <Chip
            label={row.status.replace(/_/g, " ")}
            size="small"
            sx={{
              height: 20, fontSize: "0.67rem", fontWeight: 600,
              textTransform: "capitalize",
              background: alpha(statusColor(row.status), 0.12),
              color: statusColor(row.status),
              border: `1px solid ${alpha(statusColor(row.status), 0.3)}`,
            }}
          />
          {row.status === "approved" && row.admin_reviewed_at && (
            <Typography
              sx={{
                fontSize: "0.63rem", color: "#4CAF82",
                display: "flex", alignItems: "center", gap: 0.3,
              }}
            >
              <EmailRounded sx={{ fontSize: 10 }} /> Email sent
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "created_at",
      label: "Date",
      hideOnMobile: true,
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", whiteSpace: "nowrap" }}>
            {dayjs(row.created_at).format("MMM D, YYYY")}
          </Typography>
          <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
            {dayjs(row.created_at).fromNow()}
          </Typography>
        </Box>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          {/* View — GET /admin/orders/:id */}
          <Tooltip title="View details">
            <IconButton
              size="small"
              onClick={async () => {
                setDetailLoading(true);
                try {
                  const res = await api.get<OrderDetailResponse>(`/admin/orders/${row.id}`);
                  setSelectedOrder(res.data.order);
                } catch {
                  setSelectedOrder(row);
                } finally {
                  setDetailLoading(false);
                }
              }}
            >
              {detailLoading ? (
                <CircularProgress size={13} />
              ) : (
                <VisibilityRounded sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Approve / Reject — only for admin_review or paid */}
          {(row.status === "admin_review" || row.status === "paid") && (
            <>
              <Tooltip title="Approve">
                <IconButton
                  size="small"
                  onClick={() => setApprovalOrder(row)}
                  sx={{ "&:hover": { color: "#4CAF82", background: alpha("#4CAF82", 0.1) } }}
                >
                  <CheckRounded sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton
                  size="small"
                  onClick={() => setRejectOrder(row)}
                  sx={{ "&:hover": { color: "#E05C5C", background: alpha("#E05C5C", 0.1) } }}
                >
                  <CloseRounded sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Mark as Paid — POST /admin/orders/:id/mark-paid — only for pending */}
          {row.status === "pending" && (
            <Tooltip title="Mark as Paid">
              <IconButton
                size="small"
                onClick={() => setMarkPaidOrder(row)}
                sx={{ "&:hover": { color: "#4A8FD4", background: alpha("#4A8FD4", 0.1) } }}
              >
                <PaidRounded sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Delete — DELETE /admin/orders/:id */}
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => setDeleteId(row.id)}
              sx={{ "&:hover": { color: "#E05C5C" } }}
            >
              <DeleteRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Order Management"
      subtitle={`${total} total orders${pendingCount > 0 ? ` · ${pendingCount} awaiting approval` : ""}`}
      actions={
        pendingCount > 0 ? (
          <Chip
            icon={<HourglassEmptyRounded sx={{ fontSize: 14 }} />}
            label={`${pendingCount} pending`}
            onClick={() => setTab(1)}
            sx={{
              background: alpha("#E8A838", 0.15), color: "#E8A838",
              border: `1px solid ${alpha("#E8A838", 0.35)}`,
              fontWeight: 600, cursor: "pointer",
            }}
          />
        ) : null
      }
    >
      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setPage(0); }}
          sx={{ px: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Tab label="All Orders" />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Pending Approval
                {pendingCount > 0 && (
                  <Chip
                    label={pendingCount}
                    size="small"
                    sx={{
                      height: 18, fontSize: "0.65rem",
                      background: alpha("#E8A838", 0.2), color: "#E8A838",
                    }}
                  />
                )}
              </Box>
            }
          />
          <Tab label="Analytics" />
        </Tabs>
      </Paper>

      {/* Filters */}
      {tab !== 2 && (
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <SearchBar placeholder="Search by email…" onSearch={handleSearch} />
          {tab === 0 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                sx={{ borderRadius: 3 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="payment_initiated">Payment Initiated</MenuItem>
                <MenuItem value="payment_processing">Payment Processing</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="admin_review">Admin Review</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="refunded">Refunded</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      )}

      {/* Table */}
      {tab !== 2 && (
        <DataTable
          columns={columns}
          rows={orders}
          loading={isLoading}
          page={page}
          rowsPerPage={25}
          total={total}
          onPageChange={setPage}
          getRowId={(r) => String(r.id)}
          emptyMessage={
            tab === 1
              ? "🎉 No pending orders — all caught up!"
              : "No orders found"
          }
        />
      )}

      {/* Analytics */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 0.5, fontSize: "1rem" }}>
            Revenue Over Time
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", mb: 3 }}>
            Monthly approved order revenue (USD)
          </Typography>
          {analyticsLoading ? (
            <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress size={32} sx={{ color: GOLD }} />
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={
                  Array.isArray(analyticsRes?.data?.monthly)
                    ? analyticsRes!.data!.monthly!
                    : []
                }
              >
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`
                  }
                />
                <RTooltip
                  contentStyle={{
                    background: "#1A2535",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    value != null ? centsToDisplay(value) : "$0.00",
                    name ?? "Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  fill="url(#revG)"
                  dot={{ fill: GOLD, r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Paper>
      )}

      {/* ── Order detail dialog — GET /admin/orders/:id ── */}
      <Dialog
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { maxHeight: "85vh", borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{selectedOrder?.order_number}</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                {dayjs(selectedOrder?.created_at).format("MMMM D, YYYY [at] HH:mm")}
              </Typography>
            </Box>
            {selectedOrder && (
              <Chip
                label={selectedOrder.status.replace(/_/g, " ")}
                size="small"
                sx={{
                  textTransform: "capitalize",
                  background: alpha(statusColor(selectedOrder.status), 0.12),
                  color: statusColor(selectedOrder.status),
                }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Grid container spacing={2}>
                {[
                  ["Customer", selectedOrder.customer_name],
                  ["Email", selectedOrder.customer_email],
                  ["Phone", selectedOrder.customer_phone ?? "—"],
                  // FIX: use total_amount_usd_cents
                  ["Total", centsToDisplay(selectedOrder.total_amount_usd_cents)],
                  ["Subtotal", centsToDisplay(selectedOrder.subtotal_usd_cents)],
                  ["Tax", centsToDisplay(selectedOrder.tax_amount_usd_cents)],
                  ["Gateway", selectedOrder.payment_gateway],
                  ["Payment ID", selectedOrder.gateway_payment_id ?? "—"],
                  ["Downloads", selectedOrder.downloads_enabled ? "Enabled" : "Disabled"],
                ].map(([l, v]) => (
                  <Grid size={{ xs: 6 }} key={String(l)}>
                    <Typography
                      sx={{
                        fontSize: "0.67rem", color: "text.disabled",
                        textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.25,
                      }}
                    >
                      {l}
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, wordBreak: "break-all" }}>
                      {String(v)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

              <Box>
                <Typography
                  sx={{
                    fontSize: "0.7rem", fontWeight: 700, color: "text.secondary",
                    textTransform: "uppercase", letterSpacing: "0.06em", mb: 1.5,
                  }}
                >
                  Templates ({selectedOrder.items?.length ?? 0})
                </Typography>
                {/* FIX: use price_usd_cents, removed quantity/unit_price */}
                {(selectedOrder.items ?? []).map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex", justifyContent: "space-between",
                      p: 1.5, mb: 0.75, borderRadius: 2,
                      background: alpha("#fff", 0.03),
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                        {item.template_name}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                        v{item.template_version} · {item.file_format ?? "—"}
                        {item.download_count > 0 && (
                          <Box component="span" sx={{ ml: 1, color: GOLD }}>
                            · {item.download_count} download{item.download_count !== 1 ? "s" : ""}
                          </Box>
                        )}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: GOLD, fontWeight: 700 }}>
                      {centsToDisplay(item.price_usd_cents)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Approval info — FIX: use admin_reviewed_at instead of approved_at */}
              {selectedOrder.status === "approved" && selectedOrder.admin_reviewed_at && (
                <Box
                  sx={{
                    p: 1.75, borderRadius: 2,
                    background: alpha("#4CAF82", 0.06),
                    border: `1px solid ${alpha("#4CAF82", 0.2)}`,
                  }}
                >
                  <Typography sx={{ fontSize: "0.78rem", color: "#4CAF82", fontWeight: 600, mb: 0.3 }}>
                    ✅ Approved {dayjs(selectedOrder.admin_reviewed_at).fromNow()}
                  </Typography>
                  {selectedOrder.admin_notes && (
                    <Typography sx={{ fontSize: "0.73rem", color: "text.secondary" }}>
                      Note: {selectedOrder.admin_notes}
                    </Typography>
                  )}
                  {selectedOrder.downloads_expires_at && (
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 0.4 }}>
                      Downloads expire:{" "}
                      {dayjs(selectedOrder.downloads_expires_at).format("MMM D, YYYY")}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Rejection info */}
              {selectedOrder.status === "rejected" && selectedOrder.rejection_reason && (
                <Box
                  sx={{
                    p: 1.75, borderRadius: 2,
                    background: alpha("#E05C5C", 0.06),
                    border: `1px solid ${alpha("#E05C5C", 0.2)}`,
                  }}
                >
                  <Typography sx={{ fontSize: "0.78rem", color: "#E05C5C", fontWeight: 600, mb: 0.3 }}>
                    ❌ Rejected
                    {selectedOrder.admin_reviewed_at && (
                      <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
                        {dayjs(selectedOrder.admin_reviewed_at).fromNow()}
                      </Box>
                    )}
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                    {selectedOrder.rejection_reason}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setSelectedOrder(null)} variant="outlined" size="small">
            Close
          </Button>
          {selectedOrder?.status === "pending" && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PaidRounded />}
              onClick={() => {
                setMarkPaidOrder(selectedOrder);
                setSelectedOrder(null);
              }}
              sx={{ borderColor: "#4A8FD4", color: "#4A8FD4" }}
            >
              Mark as Paid
            </Button>
          )}
          {(selectedOrder?.status === "admin_review" || selectedOrder?.status === "paid") && (
            <>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() => {
                  setRejectOrder(selectedOrder);
                  setSelectedOrder(null);
                }}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<CheckRounded />}
                onClick={async () => {
                  if (!selectedOrder) return;
                  if (!selectedOrder.items) {
                    try {
                      const res = await api.get<OrderDetailResponse>(`/admin/orders/${selectedOrder.id}`);
                      setApprovalOrder(res.data.order);
                    } catch {
                      setApprovalOrder(selectedOrder);
                    }
                  } else {
                    setApprovalOrder(selectedOrder);
                  }
                  setSelectedOrder(null);
                }}
                sx={{ background: "linear-gradient(135deg, #4CAF82, #357A5E)" }}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Approval dialog */}
      <ApprovalDialog
        order={approvalOrder}
        open={!!approvalOrder}
        onClose={() => setApprovalOrder(null)}
        onApproved={handleMutate}
      />

      {/* Mark as Paid dialog — POST /admin/orders/:id/mark-paid */}
      <MarkPaidDialog
        order={markPaidOrder}
        open={!!markPaidOrder}
        onClose={() => setMarkPaidOrder(null)}
        onSuccess={handleMutate}
      />

      {/* Reject dialog — POST /admin/orders/:id/reject */}
      <Dialog
        open={!!rejectOrder}
        onClose={() => { setRejectOrder(null); setRejectReason(""); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 34, height: 34, borderRadius: "50%",
                background: alpha("#E05C5C", 0.12),
                border: `1.5px solid ${alpha("#E05C5C", 0.35)}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <CloseRounded sx={{ color: "#E05C5C", fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>Reject Order</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                {rejectOrder?.order_number} · {rejectOrder?.customer_name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.82rem" }}>
            Customer will be notified by email. Provide a clear, professional reason.
          </Alert>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 1 }}>
            Quick templates:
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2.5 }}>
            {[
              "Payment could not be verified. Please contact support with proof of payment.",
              "Duplicate order detected. Your original order is still being processed.",
              "Paid amount does not match the order total. Please place a new order.",
              "Order flagged for review. Our team will contact you within 24 hours.",
            ].map((t) => (
              <Box
                key={t}
                onClick={() => setRejectReason(t)}
                sx={{
                  p: 1.25, borderRadius: 1.5, cursor: "pointer",
                  background: rejectReason === t ? alpha("#E05C5C", 0.08) : alpha("#fff", 0.03),
                  border: `1px solid ${rejectReason === t ? alpha("#E05C5C", 0.3) : "rgba(255,255,255,0.07)"}`,
                  transition: "all 0.15s",
                  "&:hover": { background: alpha("#E05C5C", 0.05) },
                }}
              >
                <Typography sx={{ fontSize: "0.79rem", color: "rgba(240,237,232,0.75)" }}>
                  {t}
                </Typography>
              </Box>
            ))}
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection reason (sent to customer)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Write a clear, professional reason…"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => { setRejectOrder(null); setRejectReason(""); }}
            variant="outlined"
            size="small"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            color="error"
            disabled={rejectLoading || !rejectReason.trim()}
            startIcon={rejectLoading ? <CircularProgress size={12} /> : <CloseRounded />}
            onClick={handleReject}
          >
            {rejectLoading ? "Rejecting…" : "Reject & Notify Customer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Order"
        message="Permanently delete this order? This cannot be undone."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}