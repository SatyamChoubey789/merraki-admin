"use client";
import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  Box, Drawer, Typography, IconButton, Divider, Avatar,
  Chip, Skeleton, Tooltip, Badge,
} from "@mui/material";
import {
  CloseRounded, ShoppingCartRounded, ContactMailRounded,
  PeopleRounded, EmailRounded, CheckCircleRounded,
  NotificationsRounded, RefreshRounded, DoneAllRounded,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { alpha } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import api from "@/lib/axios";

dayjs.extend(relativeTime);

const GOLD = "#C9A84C";
const DRAWER_W = 380;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  id: string;
  type: "order" | "contact" | "user" | "newsletter" | "system";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  meta?: Record<string, string | number>;
}

// ─── Icon + color per type ────────────────────────────────────────────────────
const TYPE_CONFIG = {
  order: {
    icon: <ShoppingCartRounded sx={{ fontSize: 16 }} />,
    color: "#C9A84C",
    bg: alpha("#C9A84C", 0.12),
  },
  contact: {
    icon: <ContactMailRounded sx={{ fontSize: 16 }} />,
    color: "#4A8FD4",
    bg: alpha("#4A8FD4", 0.12),
  },
  user: {
    icon: <PeopleRounded sx={{ fontSize: 16 }} />,
    color: "#4CAF82",
    bg: alpha("#4CAF82", 0.12),
  },
  newsletter: {
    icon: <EmailRounded sx={{ fontSize: 16 }} />,
    color: "#E8A838",
    bg: alpha("#E8A838", 0.12),
  },
  system: {
    icon: <NotificationsRounded sx={{ fontSize: 16 }} />,
    color: "#6B8CAE",
    bg: alpha("#6B8CAE", 0.12),
  },
};

// ─── Notification item ────────────────────────────────────────────────────────
function NotifItem({
  notif,
  onMarkRead,
  onNavigate,
  index,
}: {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onNavigate: (url?: string) => void;
  index: number;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <Box
        onClick={() => {
          onMarkRead(notif.id);
          onNavigate(notif.actionUrl);
        }}
        sx={{
          display: "flex", gap: 1.5, px: 2.5, py: 2,
          cursor: notif.actionUrl ? "pointer" : "default",
          position: "relative",
          background: notif.read ? "transparent" : alpha(GOLD, 0.03),
          transition: "background 0.2s",
          "&:hover": { background: alpha("#fff", 0.03) },
        }}
      >
        {/* Unread dot */}
        {!notif.read && (
          <Box
            sx={{
              position: "absolute", left: 10, top: "50%",
              transform: "translateY(-50%)",
              width: 6, height: 6, borderRadius: "50%",
              background: GOLD,
              boxShadow: `0 0 8px ${alpha(GOLD, 0.6)}`,
            }}
          />
        )}

        {/* Icon */}
        <Box
          sx={{
            width: 34, height: 34, borderRadius: "10px",
            background: cfg.bg,
            border: `1px solid ${alpha(cfg.color, 0.2)}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: cfg.color, flexShrink: 0,
          }}
        >
          {cfg.icon}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.825rem",
              fontWeight: notif.read ? 400 : 600,
              color: notif.read ? "rgba(240,237,232,0.7)" : "#F0EDE8",
              lineHeight: 1.4,
            }}
          >
            {notif.title}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.775rem",
              color: "rgba(240,237,232,0.45)",
              mt: 0.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {notif.body}
          </Typography>
          <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 0.5 }}>
            {dayjs(notif.createdAt).fromNow()}
          </Typography>
        </Box>

        {/* Mark read */}
        {!notif.read && (
          <Tooltip title="Mark read" placement="left">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
              sx={{
                alignSelf: "flex-start", mt: 0.25, flexShrink: 0,
                color: "rgba(240,237,232,0.2)",
                "&:hover": { color: GOLD, background: alpha(GOLD, 0.1) },
              }}
            >
              <CheckCircleRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Poll every 30s
  const { data, isLoading, mutate } = useSWR(
    "/admin/dashboard/notifications",
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  const notifications: Notification[] = data?.data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = filter === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  const handleMarkRead = useCallback(async (id: string) => {
    // Optimistic update
    mutate(
      (prev: { data: Notification[] } | undefined) => ({
        ...prev,
        data: prev?.data?.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ) ?? [],
      }),
      false
    );
    try {
      await api.patch(`/admin/dashboard/notifications/${id}/read`);
    } catch {
      mutate(); // revert on error
    }
  }, [mutate]);

  const handleMarkAllRead = useCallback(async () => {
    mutate(
      (prev: { data: Notification[] } | undefined) => ({
        ...prev,
        data: prev?.data?.map((n) => ({ ...n, read: true })) ?? [],
      }),
      false
    );
    try {
      await api.post("/admin/notifications/read-all");
    } catch {
      mutate();
    }
  }, [mutate]);

  const handleNavigate = useCallback((url?: string) => {
    if (url) {
      window.location.href = url;
      onClose();
    }
  }, [onClose]);

  // Group by type for the summary chips
  const typeCounts = notifications.reduce<Record<string, number>>((acc, n) => {
    if (!n.read) acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "90vw", sm: DRAWER_W },
          background: "rgba(17,24,39,0.98)",
          backdropFilter: "blur(40px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-16px 0 60px rgba(0,0,0,0.5)",
        },
      }}
      BackdropProps={{
        sx: {
          backdropFilter: "blur(4px)",
          background: "rgba(13,27,42,0.5)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5, py: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          position: "sticky", top: 0,
          background: "rgba(17,24,39,0.98)",
          backdropFilter: "blur(20px)",
          zIndex: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 34, height: 34, borderRadius: "10px",
              background: alpha(GOLD, 0.12),
              border: `1px solid ${alpha(GOLD, 0.2)}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", height: 15, minWidth: 15 } }}
            >
              <NotificationsRounded sx={{ fontSize: 18, color: GOLD }} />
            </Badge>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
              Notifications
            </Typography>
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 0.5 }}>
          {unreadCount > 0 && (
            <Tooltip title="Mark all read">
              <IconButton
                size="small"
                onClick={handleMarkAllRead}
                sx={{ color: "text.secondary", "&:hover": { color: GOLD } }}
              >
                <DoneAllRounded sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={() => mutate()}
              sx={{ color: "text.secondary", "&:hover": { color: "#F0EDE8" } }}
            >
              <RefreshRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "text.secondary", "&:hover": { color: "#F0EDE8" } }}
          >
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Type summary chips */}
      {Object.keys(typeCounts).length > 0 && (
        <Box
          sx={{
            px: 2.5, py: 1.5,
            display: "flex", gap: 1, flexWrap: "wrap",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {Object.entries(typeCounts).map(([type, count]) => {
            const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.system;
            return (
              <Chip
                key={type}
                label={`${count} ${type}`}
                size="small"
                sx={{
                  fontSize: "0.68rem", height: 22,
                  background: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${alpha(cfg.color, 0.25)}`,
                  textTransform: "capitalize",
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Filter tabs */}
      <Box
        sx={{
          display: "flex", gap: 0,
          mx: 2.5, my: 1.5,
          background: alpha("#fff", 0.04),
          borderRadius: 2, p: 0.4,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {(["all", "unread"] as const).map((f) => (
          <Box
            key={f}
            onClick={() => setFilter(f)}
            sx={{
              flex: 1, py: 0.7, textAlign: "center",
              borderRadius: 1.5, cursor: "pointer",
              transition: "all 0.2s",
              background: filter === f ? alpha(GOLD, 0.15) : "transparent",
              color: filter === f ? GOLD : "text.secondary",
              fontSize: "0.78rem", fontWeight: filter === f ? 600 : 400,
              textTransform: "capitalize",
            }}
          >
            {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
          </Box>
        ))}
      </Box>

      {/* Notifications list */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1.5, px: 2.5, py: 2 }}>
              <Skeleton variant="rounded" width={34} height={34} sx={{ borderRadius: "10px", flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={16} />
                <Skeleton variant="text" width="90%" height={14} sx={{ mt: 0.5 }} />
                <Skeleton variant="text" width="30%" height={12} sx={{ mt: 0.5 }} />
              </Box>
            </Box>
          ))
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: "50%",
                background: alpha(GOLD, 0.08),
                display: "flex", alignItems: "center", justifyContent: "center",
                mx: "auto", mb: 2,
              }}
            >
              <NotificationsRounded sx={{ color: alpha(GOLD, 0.4), fontSize: 26 }} />
            </Box>
            <Typography sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </Typography>
          </Box>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((n, i) => (
              <Box key={n.id}>
                <NotifItem
                  notif={n}
                  onMarkRead={handleMarkRead}
                  onNavigate={handleNavigate}
                  index={i}
                />
                <Divider sx={{ borderColor: "rgba(255,255,255,0.04)", mx: 2 }} />
              </Box>
            ))}
          </AnimatePresence>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2.5, py: 2,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
          Auto-refreshes every 30s · ⌘⇧N to open
        </Typography>
      </Box>
    </Drawer>
  );
}

// ─── Hook to get unread count for TopBar badge ────────────────────────────────
export function useNotificationCount() {
  const { data } = useSWR("/admin/dashboard/notifications", {
    refreshInterval: 30_000,
  });
  const notifications: Notification[] = data?.data.data ?? [];
  return notifications.filter((n) => !n.read).length;
}