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

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  templateId: string;
  templateTitle: string;
  templateCategory: string;
  price: number;
  fileUrl?: string;
}

interface Order {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userJoinedAt?: string;
  userTotalOrders?: number;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  paymentStatus: "paid" | "unpaid" | "refunded";
  paymentMethod?: string;
  transactionId?: string;
  paymentVerifiedAt?: string;
  items: OrderItem[];
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  emailSentAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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
    label: "User account is legitimate and active",
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
      enqueueSnackbar("Complete all required checks first", {
        variant: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      await api.post(`/admin/orders/${order.orderId}/approve`, {
        notes: adminNotes,
        checks,
      });
      enqueueSnackbar("✅ Order approved — confirmation email sent to user", {
        variant: "success",
      });
      onApproved();
      onClose();
    } catch (e: unknown) {
      enqueueSnackbar(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Approval failed",
        { variant: "error" },
      );
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
      PaperProps={{ sx: { maxHeight: "92vh" } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: alpha("#4CAF82", 0.12),
              border: `1.5px solid ${alpha("#4CAF82", 0.35)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckRounded sx={{ color: "#4CAF82", fontSize: 20 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>
              Approve Order #{order.orderId?.slice(-8).toUpperCase()}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {order.userName} · ₹{order.amount?.toLocaleString()} ·{" "}
              {order.userEmail}
            </Typography>
          </Box>
          <StatusChip status={order.paymentStatus} />
        </Box>
        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          {STEP_LABELS.map((label, i) => (
            <Box
              key={i}
              onClick={() =>
                (i < step ||
                  (i === 1 && step === 0) ||
                  (i === 2 && allCriticalChecked)) &&
                setStep(i)
              }
              sx={{ flex: 1, cursor: "pointer" }}
            >
              <Box
                sx={{
                  height: 3,
                  borderRadius: 2,
                  background:
                    step >= i
                      ? step > i
                        ? "#4CAF82"
                        : GOLD
                      : "rgba(255,255,255,0.1)",
                  transition: "all 0.3s",
                }}
              />
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color:
                    step >= i ? (step > i ? "#4CAF82" : GOLD) : "text.disabled",
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
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: alpha(GOLD, 0.04),
                      border: `1px solid ${alpha(GOLD, 0.15)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.67rem",
                        fontWeight: 700,
                        color: GOLD,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        mb: 1.5,
                      }}
                    >
                      Customer
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 1.5,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontWeight: 700,
                          background: alpha(GOLD, 0.2),
                          color: GOLD,
                          fontSize: "0.9rem",
                        }}
                      >
                        {order.userName?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography
                          sx={{ fontWeight: 600, fontSize: "0.9rem" }}
                        >
                          {order.userName}
                        </Typography>
                        <Typography
                          sx={{ fontSize: "0.73rem", color: "text.secondary" }}
                        >
                          {order.userEmail}
                        </Typography>
                      </Box>
                    </Box>
                    <Grid container spacing={1}>
                      {[
                        ["Phone", order.userPhone ?? "—"],
                        [
                          "Member since",
                          order.userJoinedAt
                            ? dayjs(order.userJoinedAt).format("MMM YYYY")
                            : "—",
                        ],
                        ["Total orders", order.userTotalOrders ?? 0],
                        ["User ID", `…${order.userId?.slice(-6)}`],
                      ].map(([l, v]) => (
                        <Grid size={{ xs: 6 }} key={String(l)}>
                          <Typography
                            sx={{
                              fontSize: "0.65rem",
                              color: "text.disabled",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {l}
                          </Typography>
                          <Typography
                            sx={{ fontSize: "0.8rem", fontWeight: 500 }}
                          >
                            {String(v)}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: alpha(
                        order.paymentStatus === "paid" ? "#4CAF82" : "#E05C5C",
                        0.04,
                      ),
                      border: `1px solid ${alpha(order.paymentStatus === "paid" ? "#4CAF82" : "#E05C5C", 0.18)}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.67rem",
                          fontWeight: 700,
                          color:
                            order.paymentStatus === "paid"
                              ? "#4CAF82"
                              : "#E05C5C",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        Payment
                      </Typography>
                      <StatusChip status={order.paymentStatus} />
                    </Box>
                    <Grid container spacing={1}>
                      {[
                        ["Amount", `₹${order.amount?.toLocaleString()}`],
                        ["Method", order.paymentMethod ?? "—"],
                        ["Transaction ID", order.transactionId ?? "—"],
                        [
                          "Verified at",
                          order.paymentVerifiedAt
                            ? dayjs(order.paymentVerifiedAt).format(
                                "DD MMM HH:mm",
                              )
                            : "Not verified",
                        ],
                      ].map(([l, v]) => (
                        <Grid size={{ xs: 6 }} key={String(l)}>
                          <Typography
                            sx={{
                              fontSize: "0.65rem",
                              color: "text.disabled",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {l}
                          </Typography>
                          <Typography
                            sx={{ fontSize: "0.8rem", fontWeight: 500 }}
                          >
                            {String(v)}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      mb: 1,
                    }}
                  >
                    Ordered Templates
                  </Typography>
                  {order.items?.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1.5,
                        mb: 0.75,
                        borderRadius: 2,
                        background: alpha("#fff", 0.03),
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <InventoryRounded sx={{ fontSize: 15, color: GOLD }} />
                        <Box>
                          <Typography
                            sx={{ fontSize: "0.85rem", fontWeight: 500 }}
                          >
                            {item.templateTitle}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              color: "text.secondary",
                            }}
                          >
                            {item.templateCategory}
                            {item.fileUrl && (
                              <Box
                                component="span"
                                sx={{ ml: 1, color: "#4CAF82" }}
                              >
                                · File attached ✓
                              </Box>
                            )}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: GOLD }}>
                        ₹{item.price?.toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 2,
                      background: alpha(GOLD, 0.06),
                      border: `1px solid ${alpha(GOLD, 0.2)}`,
                      mt: 0.5,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600 }}>Total</Typography>
                    <Typography
                      sx={{ fontWeight: 700, color: GOLD, fontSize: "1rem" }}
                    >
                      ₹{order.amount?.toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setStep(1)}
                >
                  Continue to Verification →
                </Button>
              </Box>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
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
                  Verify payment and user identity before approving.
                </Alert>
              )}
              <Box sx={{ mb: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.75,
                  }}
                >
                  <Typography
                    sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                  >
                    Verification progress
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
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
                    height: 6,
                    borderRadius: 3,
                    background: alpha("#fff", 0.06),
                    "& .MuiLinearProgress-bar": {
                      background:
                        checkCount === totalChecks
                          ? "linear-gradient(90deg, #4CAF82, #6EC99E)"
                          : `linear-gradient(90deg, ${GOLD}, #D4B96A)`,
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mb: 2.5,
                }}
              >
                {(
                  Object.keys(CHECK_CONFIG) as (keyof VerificationChecks)[]
                ).map((key) => {
                  const { label, icon, critical } = CHECK_CONFIG[key];
                  const checked = checks[key];
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Box
                        onClick={() => toggle(key)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          cursor: "pointer",
                          background: checked
                            ? alpha("#4CAF82", 0.08)
                            : alpha("#fff", 0.03),
                          border: `1px solid ${checked ? alpha("#4CAF82", 0.25) : "rgba(255,255,255,0.07)"}`,
                          transition: "all 0.18s",
                          "&:hover": {
                            background: checked
                              ? alpha("#4CAF82", 0.12)
                              : alpha("#fff", 0.06),
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: 1,
                            flexShrink: 0,
                            background: checked
                              ? "#4CAF82"
                              : alpha("#fff", 0.06),
                            border: `1.5px solid ${checked ? "#4CAF82" : "rgba(255,255,255,0.2)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.18s",
                          }}
                        >
                          {checked && (
                            <CheckRounded
                              sx={{ fontSize: 13, color: "#fff" }}
                            />
                          )}
                        </Box>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1.5,
                            flexShrink: 0,
                            background: alpha(checked ? "#4CAF82" : GOLD, 0.1),
                            color: checked ? "#4CAF82" : GOLD,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {icon}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "0.84rem",
                            flex: 1,
                            color: checked
                              ? "#4CAF82"
                              : "rgba(240,237,232,0.8)",
                          }}
                        >
                          {label}
                        </Typography>
                        {critical && (
                          <Chip
                            label="Required"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.6rem",
                              flexShrink: 0,
                              background: alpha("#E05C5C", 0.12),
                              color: "#E05C5C",
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
                placeholder="Internal note visible in order history..."
              />
              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setStep(0)}
                >
                  ← Back
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!allCriticalChecked}
                  onClick={() => setStep(2)}
                >
                  Review Email →
                </Button>
              </Box>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
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
                On approval, <strong>{order.userEmail}</strong> receives
                download links for all purchased templates. Links expire in 48
                hours.
              </Alert>
              <Paper
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  mb: 2.5,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Box
                  sx={{
                    p: 1.75,
                    background: alpha(GOLD, 0.08),
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {[
                    `FROM: noreply@merraki.com`,
                    `TO: ${order.userEmail}`,
                    `SUBJECT: ✅ Order #${order.orderId?.slice(-8).toUpperCase()} Confirmed — Your downloads are ready`,
                  ].map((line) => (
                    <Typography
                      key={line}
                      sx={{
                        fontSize: "0.68rem",
                        color: "text.disabled",
                        lineHeight: 1.8,
                      }}
                    >
                      {line}
                    </Typography>
                  ))}
                </Box>
                <Box sx={{ p: 2.5, background: alpha("#111827", 0.5) }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      mb: 0.5,
                      fontSize: "0.95rem",
                      color: GOLD,
                    }}
                  >
                    Order Confirmed! 🎉
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.81rem",
                      color: "text.secondary",
                      mb: 2,
                      lineHeight: 1.7,
                    }}
                  >
                    Hi {order.userName?.split(" ")[0]}, your order has been
                    approved and verified. Here are your secure download links:
                  </Typography>
                  {order.items?.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1.25,
                        mb: 0.75,
                        borderRadius: 1.5,
                        background: alpha(GOLD, 0.05),
                        border: `1px solid ${alpha(GOLD, 0.15)}`,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <InventoryRounded sx={{ fontSize: 13, color: GOLD }} />
                        <Typography sx={{ fontSize: "0.8rem" }}>
                          {item.templateTitle}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 1.2,
                          py: 0.4,
                          borderRadius: 1,
                          background: "#4CAF82",
                        }}
                      >
                        <FileDownloadRounded
                          sx={{ fontSize: 11, color: "#fff" }}
                        />
                        <Typography
                          sx={{
                            fontSize: "0.67rem",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          Download
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  <Typography
                    sx={{ fontSize: "0.7rem", color: "text.disabled", mt: 1.5 }}
                  >
                    ⏳ Download links expire in 48 hours · Order ID:{" "}
                    {order.orderId}
                  </Typography>
                </Box>
              </Paper>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setStep(1)}
                >
                  ← Back
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  disabled={loading || !allCriticalChecked}
                  startIcon={
                    loading ? (
                      <CircularProgress size={14} sx={{ color: "#fff" }} />
                    ) : (
                      <SendRounded />
                    )
                  }
                  onClick={handleApprove}
                  sx={{
                    background: "linear-gradient(135deg, #4CAF82, #357A5E)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #5BC98F, #4CAF82)",
                    },
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
        <Button onClick={onClose} variant="outlined" size="small">
          Cancel
        </Button>
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
  const [paymentFilter, setPaymentFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [approvalOrder, setApprovalOrder] = useState<Order | null>(null);
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ✅ Hoisted at top level — never inside JSX
  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, []);

  const endpoint =
    tab === 1
      ? `/admin/orders/pending?page=${page + 1}&limit=25`
      : `/admin/orders?page=${page + 1}&limit=25` +
        (search ? `&email=${encodeURIComponent(search)}` : "") +
        (statusFilter ? `&status=${statusFilter}` : "") +
        (paymentFilter ? `&payment=${paymentFilter}` : "");

  const { data, isLoading, mutate } = useSWR(endpoint, {
    refreshInterval: 30_000,
  });
  const { data: analyticsData } = useSWR(
    tab === 2 ? "/admin/orders/revenue-analytics" : null,
  );

  const orders: Order[] = data?.data ?? [];
  const total: number = data?.pagination?.total ?? 0;
  const pendingCount: number = data?.pagination?.pendingCount ?? 0;

  const handleReject = async () => {
    if (!rejectOrder || !rejectReason.trim()) {
      enqueueSnackbar("Reason required", { variant: "warning" });
      return;
    }
    setRejectLoading(true);
    try {
      await api.post(`/admin/orders/${rejectOrder.orderId}/reject`, {
        reason: rejectReason,
      });
      enqueueSnackbar("Order rejected — user notified by email", {
        variant: "info",
      });
      await mutate();
      setRejectOrder(null);
      setRejectReason("");
    } catch {
      enqueueSnackbar("Rejection failed", { variant: "error" });
    } finally {
      setRejectLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/orders/${deleteId}`);
      enqueueSnackbar("Order deleted", { variant: "success" });
      setDeleteId(null);
      await mutate();
    } catch {
      enqueueSnackbar("Delete failed", { variant: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<Order>[] = [
    {
      key: "orderId",
      label: "Order ID",
      render: (row) => (
        <Typography
          sx={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: GOLD,
            fontWeight: 600,
          }}
        >
          #{row.orderId?.slice(-8).toUpperCase()}
        </Typography>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 30,
              height: 30,
              fontSize: "0.75rem",
              fontWeight: 700,
              background: alpha(GOLD, 0.15),
              color: GOLD,
            }}
          >
            {row.userName?.charAt(0)}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: "0.84rem", fontWeight: 500 }}>
              {row.userName}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
              {row.userEmail}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "items",
      label: "Templates",
      render: (row) => (
        <Box>
          {row.items?.slice(0, 2).map((item) => (
            <Typography
              key={item.id}
              sx={{
                fontSize: "0.78rem",
                color: "text.secondary",
                lineHeight: 1.5,
              }}
            >
              {item.templateTitle}
            </Typography>
          ))}
          {(row.items?.length ?? 0) > 2 && (
            <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
              +{row.items.length - 2} more
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: "#4CAF82" }}>
          ₹{row.amount?.toLocaleString()}
        </Typography>
      ),
    },
    {
      key: "paymentStatus",
      label: "Payment",
      render: (row) => <StatusChip status={row.paymentStatus} />,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
          <StatusChip status={row.status} />
          {row.status === "approved" && row.emailSentAt && (
            <Typography
              sx={{
                fontSize: "0.63rem",
                color: "#4CAF82",
                display: "flex",
                alignItems: "center",
                gap: 0.3,
              }}
            >
              <EmailRounded sx={{ fontSize: 10 }} /> Email sent
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {dayjs(row.createdAt).format("MMM D, YYYY")}
          </Typography>
          <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
            {dayjs(row.createdAt).fromNow()}
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
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => setSelectedOrder(row)}>
              <VisibilityRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          {row.status === "pending" && (
            <>
              <Tooltip title="Approve order">
                <IconButton
                  size="small"
                  onClick={() => setApprovalOrder(row)}
                  sx={{
                    "&:hover": {
                      color: "#4CAF82",
                      background: alpha("#4CAF82", 0.1),
                    },
                  }}
                >
                  <CheckRounded sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject order">
                <IconButton
                  size="small"
                  onClick={() => setRejectOrder(row)}
                  sx={{
                    "&:hover": {
                      color: "#E05C5C",
                      background: alpha("#E05C5C", 0.1),
                    },
                  }}
                >
                  <CloseRounded sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
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
            sx={{
              background: alpha("#E8A838", 0.15),
              color: "#E8A838",
              border: `1px solid ${alpha("#E8A838", 0.35)}`,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => setTab(1)}
          />
        ) : null
      }
    >
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setPage(0);
          }}
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
                      height: 18,
                      fontSize: "0.65rem",
                      background: alpha("#E8A838", 0.2),
                      color: "#E8A838",
                    }}
                  />
                )}
              </Box>
            }
          />
          <Tab label="Revenue Analytics" />
        </Tabs>
      </Paper>

      {/* Filters — only on tabs 0 and 1 */}
      {tab !== 2 && (
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          {/* ✅ handleSearch defined at top level */}
          <SearchBar
            placeholder="Search by email or name…"
            onSearch={handleSearch}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={{ borderRadius: 3 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Payment</InputLabel>
            <Select
              value={paymentFilter}
              label="Payment"
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(0);
              }}
              sx={{ borderRadius: 3 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="unpaid">Unpaid</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {tab !== 2 && (
        <DataTable
          columns={columns}
          rows={orders}
          loading={isLoading}
          page={page}
          rowsPerPage={25}
          total={total}
          onPageChange={setPage}
          getRowId={(r) => r.id}
          emptyMessage={
            tab === 1
              ? "🎉 No pending orders — all caught up!"
              : "No orders found"
          }
        />
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 0.5, fontSize: "1rem" }}>
            Revenue Over Time
          </Typography>
          <Typography
            sx={{ color: "text.secondary", fontSize: "0.8rem", mb: 3 }}
          >
            Monthly approved order revenue
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData?.data?.monthly ?? []}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="4 4"
              />
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
                tickFormatter={(v) => `₹${v / 1000}K`}
              />
              <RTooltip
                contentStyle={{
                  background: "#1A2535",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value: number | undefined) =>
                  value == null
                    ? ["₹0", "Revenue"]
                    : [`₹${value.toLocaleString("en-IN")}`, "Revenue"]
                }
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
        </Paper>
      )}

      {/* Detail dialog */}
      <Dialog
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { maxHeight: "85vh" } }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 600 }}>
                Order #{selectedOrder?.orderId?.slice(-8).toUpperCase()}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                {dayjs(selectedOrder?.createdAt).format(
                  "MMMM D, YYYY [at] HH:mm",
                )}
              </Typography>
            </Box>
            {selectedOrder && <StatusChip status={selectedOrder.status} />}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Grid container spacing={2}>
                {[
                  ["Customer", selectedOrder.userName],
                  ["Email", selectedOrder.userEmail],
                  ["Phone", selectedOrder.userPhone ?? "—"],
                  ["Amount", `₹${selectedOrder.amount?.toLocaleString()}`],
                  ["Payment", selectedOrder.paymentStatus],
                  ["Transaction", selectedOrder.transactionId ?? "—"],
                ].map(([l, v]) => (
                  <Grid size={{ xs: 6 }} key={String(l)}>
                    <Typography
                      sx={{
                        fontSize: "0.67rem",
                        color: "text.disabled",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        mb: 0.25,
                      }}
                    >
                      {l}
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      {String(v)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    mb: 1.5,
                  }}
                >
                  Templates
                </Typography>
                {selectedOrder.items?.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      p: 1.5,
                      mb: 0.75,
                      borderRadius: 2,
                      background: alpha("#fff", 0.03),
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                        {item.templateTitle}
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.72rem", color: "text.secondary" }}
                      >
                        {item.templateCategory}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: GOLD, fontWeight: 700 }}>
                      ₹{item.price?.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {selectedOrder.status === "approved" &&
                selectedOrder.approvedAt && (
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      background: alpha("#4CAF82", 0.06),
                      border: `1px solid ${alpha("#4CAF82", 0.2)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.78rem",
                        color: "#4CAF82",
                        fontWeight: 600,
                        mb: 0.3,
                      }}
                    >
                      ✅ Approved {dayjs(selectedOrder.approvedAt).fromNow()}
                    </Typography>
                    {selectedOrder.approvedBy && (
                      <Typography
                        sx={{ fontSize: "0.73rem", color: "text.secondary" }}
                      >
                        by {selectedOrder.approvedBy}
                      </Typography>
                    )}
                    {selectedOrder.emailSentAt && (
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          color: "text.secondary",
                          mt: 0.4,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.4,
                        }}
                      >
                        <EmailRounded sx={{ fontSize: 11 }} />
                        Confirmation email sent at{" "}
                        {dayjs(selectedOrder.emailSentAt).format("HH:mm")}
                      </Typography>
                    )}
                  </Box>
                )}
              {selectedOrder.status === "rejected" &&
                selectedOrder.rejectionReason && (
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      background: alpha("#E05C5C", 0.06),
                      border: `1px solid ${alpha("#E05C5C", 0.2)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.78rem",
                        color: "#E05C5C",
                        fontWeight: 600,
                        mb: 0.3,
                      }}
                    >
                      ❌ Rejected
                    </Typography>
                    <Typography
                      sx={{ fontSize: "0.82rem", color: "text.secondary" }}
                    >
                      {selectedOrder.rejectionReason}
                    </Typography>
                  </Box>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setSelectedOrder(null)}
            variant="outlined"
            size="small"
          >
            Close
          </Button>
          {selectedOrder?.status === "pending" && (
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
                onClick={() => {
                  setApprovalOrder(selectedOrder);
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

      <ApprovalDialog
        order={approvalOrder}
        open={!!approvalOrder}
        onClose={() => setApprovalOrder(null)}
        onApproved={() => mutate()}
      />

      {/* Reject dialog */}
      <Dialog
        open={!!rejectOrder}
        onClose={() => {
          setRejectOrder(null);
          setRejectReason("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: alpha("#E05C5C", 0.12),
                border: `1.5px solid ${alpha("#E05C5C", 0.35)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CloseRounded sx={{ color: "#E05C5C", fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>Reject Order</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                #{rejectOrder?.orderId?.slice(-8).toUpperCase()} ·{" "}
                {rejectOrder?.userName}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert
            severity="warning"
            sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.82rem" }}
          >
            User will be notified by email. Provide a clear, professional
            reason.
          </Alert>
          <Typography
            sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 1 }}
          >
            Quick templates:
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              mb: 2.5,
            }}
          >
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
                  p: 1.25,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  background:
                    rejectReason === t
                      ? alpha("#E05C5C", 0.08)
                      : alpha("#fff", 0.03),
                  border: `1px solid ${rejectReason === t ? alpha("#E05C5C", 0.3) : "rgba(255,255,255,0.07)"}`,
                  transition: "all 0.15s",
                  "&:hover": {
                    background: alpha("#E05C5C", 0.05),
                    borderColor: alpha("#E05C5C", 0.15),
                  },
                }}
              >
                <Typography
                  sx={{ fontSize: "0.79rem", color: "rgba(240,237,232,0.75)" }}
                >
                  {t}
                </Typography>
              </Box>
            ))}
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection reason (sent to user)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Write a clear, professional reason…"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => {
              setRejectOrder(null);
              setRejectReason("");
            }}
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
            startIcon={
              rejectLoading ? <CircularProgress size={12} /> : <CloseRounded />
            }
            onClick={handleReject}
          >
            {rejectLoading ? "Rejecting…" : "Reject & Notify User"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Order"
        message="Permanently delete this order? This cannot be undone."
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteId(null)}
      />
    </PageWrapper>
  );
}
