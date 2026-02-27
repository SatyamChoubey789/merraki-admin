"use client";
import { useState } from "react";
import {
  Drawer, Box, Typography, IconButton, Divider, Avatar,
  Chip, Button, Tooltip
} from "@mui/material";
import {
  CloseRounded, CheckCircleRounded, ErrorRounded,
  InfoRounded, WarningRounded, DoneAllRounded,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { alpha } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const GOLD = "#C9A84C";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: string;
}

// Mock notifications — in production, fetch from /api/admin/notifications
const MOCK_NOTIFS: Notification[] = [
  { id: "1", type: "warning", title: "Pending Orders", message: "12 orders are awaiting approval", time: new Date(Date.now() - 5 * 60000).toISOString(), read: false, category: "Orders" },
  { id: "2", type: "success", title: "Newsletter Sent", message: "Campaign #45 delivered to 2,340 subscribers", time: new Date(Date.now() - 30 * 60000).toISOString(), read: false, category: "Newsletter" },
  { id: "3", type: "info", title: "New User Registered", message: "priya.sharma@example.com created an account", time: new Date(Date.now() - 2 * 3600000).toISOString(), read: true, category: "Users" },
  { id: "4", type: "error", title: "Payment Failed", message: "Order #MRK-2891 payment could not be processed", time: new Date(Date.now() - 5 * 3600000).toISOString(), read: true, category: "Orders" },
  { id: "5", type: "success", title: "Template Published", message: "\"Professional Resume v2\" is now live", time: new Date(Date.now() - 24 * 3600000).toISOString(), read: true, category: "Templates" },
  { id: "6", type: "info", title: "Blog Post Scheduled", message: "\"Design Trends 2025\" scheduled for tomorrow 9 AM", time: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), read: true, category: "Blog" },
];

const TYPE_CONFIG = {
  success: { icon: <CheckCircleRounded />, color: "#4CAF82" },
  error: { icon: <ErrorRounded />, color: "#E05C5C" },
  warning: { icon: <WarningRounded />, color: "#E8A838" },
  info: { icon: <InfoRounded />, color: "#4A8FD4" },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsDrawer({ open, onClose }: Props) {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const dismiss = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 380,
          background: alpha("#111827", 0.98),
          backdropFilter: "blur(40px)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
        },
      }}
      BackdropProps={{ sx: { backdropFilter: "blur(4px)", background: "rgba(13,27,42,0.5)" } }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Notifications</Typography>
              {unread > 0 && (
                <Chip
                  label={unread}
                  size="small"
                  sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, background: alpha(GOLD, 0.2), color: GOLD, border: `1px solid ${alpha(GOLD, 0.3)}` }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: "0.75rem", color: "text.disabled" }}>{notifs.length} total</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {unread > 0 && (
              <Tooltip title="Mark all read">
                <IconButton size="small" onClick={markAllRead}>
                  <DoneAllRounded sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={onClose}>
              <CloseRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Notifications List */}
        <Box sx={{ flex: 1, overflowY: "auto", py: 1.5 }}>
          <AnimatePresence>
            {notifs.length === 0 ? (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <Typography sx={{ color: "text.disabled", fontSize: "0.88rem" }}>No notifications</Typography>
              </Box>
            ) : (
              notifs.map((notif, i) => {
                const cfg = TYPE_CONFIG[notif.type];
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <Box
                      onClick={() => markRead(notif.id)}
                      sx={{
                        mx: 1.5, mb: 1, p: 2, borderRadius: 2.5,
                        background: !notif.read
                          ? `linear-gradient(135deg, ${alpha(cfg.color, 0.08)}, ${alpha("#1A2535", 0.6)})`
                          : alpha("#1A2535", 0.3),
                        border: `1px solid ${!notif.read ? alpha(cfg.color, 0.2) : "rgba(255,255,255,0.04)"}`,
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.2s ease",
                        "&:hover": { background: alpha("#1A2535", 0.7), borderColor: alpha(cfg.color, 0.25) },
                      }}
                    >
                      {/* Unread dot */}
                      {!notif.read && (
                        <Box
                          sx={{
                            position: "absolute", top: 12, right: 12,
                            width: 7, height: 7, borderRadius: "50%",
                            background: cfg.color,
                            boxShadow: `0 0 6px ${alpha(cfg.color, 0.6)}`,
                          }}
                        />
                      )}

                      <Box sx={{ display: "flex", gap: 1.5, pr: !notif.read ? 2 : 0 }}>
                        <Box
                          sx={{
                            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                            background: alpha(cfg.color, 0.12),
                            border: `1px solid ${alpha(cfg.color, 0.25)}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: cfg.color, "& svg": { fontSize: 16 },
                          }}
                        >
                          {cfg.icon}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3 }}>
                            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: !notif.read ? "#F0EDE8" : "rgba(240,237,232,0.7)" }}>
                              {notif.title}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: "0.78rem", color: "rgba(240,237,232,0.45)", lineHeight: 1.5, mb: 1 }}>
                            {notif.message}
                          </Typography>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Chip label={notif.category} size="small" sx={{ height: 16, fontSize: "0.6rem", background: alpha(cfg.color, 0.1), color: cfg.color, fontWeight: 600 }} />
                            <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
                              {dayjs(notif.time).fromNow()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Box
                        component="button"
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); dismiss(notif.id); }}
                        sx={{
                          position: "absolute", top: 8, right: 8,
                          width: 18, height: 18, borderRadius: "50%",
                          background: "transparent", border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          opacity: 0, transition: "opacity 0.2s",
                          color: "rgba(255,255,255,0.3)",
                          ".MuiBox-root:hover > &": { opacity: 1 },
                          "&:hover": { color: "#E05C5C" },
                        }}
                      >
                        <CloseRounded sx={{ fontSize: 12 }} />
                      </Box>
                    </Box>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2, color: "text.secondary", borderColor: "rgba(255,255,255,0.1)", "&:hover": { borderColor: alpha(GOLD, 0.4), color: GOLD } }}
            onClick={() => setNotifs([])}
          >
            Clear all notifications
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}