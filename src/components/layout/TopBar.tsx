"use client";

import {
  Box,
  Typography,
  IconButton,
  Badge,
  Tooltip,
  Breadcrumbs,
  Link as MuiLink,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  NotificationsRounded,
  RefreshRounded,
  MenuRounded,
  SearchRounded,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { alpha } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useNotificationCount } from "./Notificationcenter";

const GOLD = "#C9A84C";

const CRUMB_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  orders: "Orders",
  blog: "Blog",
  tests: "Tests",
  contacts: "Contacts",
  newsletter: "Newsletter",
  templates: "Templates",
  calculators: "Calculators",
};

interface TopBarProps {
  onMenuClick: () => void;
  onPaletteOpen: () => void;
  onNotifOpen: () => void;
}

export default function TopBar({
  onMenuClick,
  onPaletteOpen,
  onNotifOpen,
}: TopBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  // Remove empty + remove "admin"
  const parts = pathname
    .split("/")
    .filter(Boolean)
    .filter((p) => p !== "admin");

  const unreadCount = useNotificationCount();

  // Dynamic page title
  useEffect(() => {
    const last = parts[parts.length - 1];
    if (last) {
      document.title = `${CRUMB_MAP[last] ?? last} | Admin`;
    } else {
      document.title = "Admin";
    }
  }, [parts]);

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{
        height: 60,
        px: { xs: 2, sm: 3 },
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: alpha("#111827", 0.85),
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* LEFT SECTION */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 0,
          flex: 1,
        }}
      >
        {isMobile && (
          <IconButton
            onClick={onMenuClick}
            size="small"
            sx={{
              mr: 0.5,
              color: "rgba(240,237,232,0.6)",
              "&:hover": { color: GOLD, background: alpha(GOLD, 0.08) },
            }}
          >
            <MenuRounded sx={{ fontSize: 22 }} />
          </IconButton>
        )}

        {!isSmall && (
          <Breadcrumbs
            sx={{
              "& .MuiBreadcrumbs-separator": {
                color: "rgba(255,255,255,0.2)",
              },
            }}
          >
            <MuiLink
              component={Link}
              href="/admin/dashboard"
              underline="hover"
              sx={{ color: "text.secondary", fontSize: "0.82rem" }}
            >
              Home
            </MuiLink>

            {parts.map((p, i) => {
              const isLast = i === parts.length - 1;
              return (
                <Typography
                  key={p}
                  sx={{
                    fontSize: "0.82rem",
                    fontWeight: isLast ? 600 : 400,
                    color: isLast ? "#F0EDE8" : "text.secondary",
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                  }}
                >
                  {CRUMB_MAP[p] ?? p}
                </Typography>
              );
            })}
          </Breadcrumbs>
        )}
      </Box>

      {/* CENTER — Command Palette Trigger */}
      <Box
        onClick={onPaletteOpen}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 0.8,
          background: alpha("#fff", 0.04),
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 2.5,
          cursor: "pointer",
          minWidth: { xs: 140, sm: 240 },
          transition: "all 0.2s",
          "&:hover": {
            background: alpha(GOLD, 0.07),
            borderColor: alpha(GOLD, 0.25),
          },
        }}
      >
        <SearchRounded
          sx={{ fontSize: 16, color: "rgba(240,237,232,0.35)" }}
        />
        <Typography
          sx={{
            fontSize: "0.82rem",
            color: "rgba(240,237,232,0.3)",
            flex: 1,
          }}
        >
          {isSmall ? "Search..." : "Search or jump to..."}
        </Typography>

        {!isSmall && (
          <Box
            sx={{
              display: "flex",
              gap: 0.4,
              alignItems: "center",
              px: 0.8,
              py: 0.2,
              borderRadius: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontFamily: "monospace",
                color: "rgba(240,237,232,0.3)",
              }}
            >
              ⌘K
            </Typography>
          </Box>
        )}
      </Box>

      {/* RIGHT SECTION */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {!isMobile && (
          <Tooltip title="Refresh data">
            <IconButton
              size="small"
              sx={{
                color: "rgba(240,237,232,0.4)",
                "&:hover": { color: "#F0EDE8" },
              }}
              onClick={() => router.refresh()}
            >
              <RefreshRounded sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip
          title={`Notifications${
            unreadCount > 0 ? ` (${unreadCount} unread)` : ""
          }`}
        >
          <IconButton
            size="small"
            onClick={onNotifOpen}
            sx={{
              color: "rgba(240,237,232,0.6)",
              "&:hover": { color: GOLD },
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.6rem",
                  height: 16,
                  minWidth: 16,
                  background: "#E05C5C",
                },
              }}
            >
              <NotificationsRounded sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}