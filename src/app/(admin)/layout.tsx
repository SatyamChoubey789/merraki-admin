"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { alpha } from "@mui/material";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import CommandPalette from "@/components/layout/CommandPalette";
import NotificationCenter from "@/components/layout/Notificationcenter";
import { useAppShortcuts } from "@/hooks/useKeyboardShortcuts";
import api from "@/lib/axios";


const GOLD = "#C9A84C";

function LoadingScreen() {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0D1B2A",
        zIndex: 9999,
        gap: 3,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "13px",
            background: `linear-gradient(135deg, ${GOLD}, #A8872E)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 28px ${alpha(GOLD, 0.4)}`,
            fontFamily: '"DM Serif Display", serif',
            fontSize: "1.5rem",
            color: "#0D1B2A",
          }}
        >
          M
        </Box>
      </motion.div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: `2px solid ${alpha(GOLD, 0.15)}`,
          borderTop: `2px solid ${GOLD}`,
        }}
      />

      <Typography
        sx={{
          color: alpha(GOLD, 0.45),
          fontSize: "0.65rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        Checking session...
      </Typography>
    </Box>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // 🔐 AUTH CHECK
  useEffect(() => {
    const verifySession = async () => {
      try {
        await api.get("/admin/auth/me");
      } catch (err: any) {
        if (!redirected.current) {
          redirected.current = true;

          router.replace(
            `/login?reason=session_expired&from=${encodeURIComponent(
              pathname
            )}`
          );
        }
      } finally {
        setCheckingAuth(false);
      }
    };

    verifySession();
  }, [pathname, router]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openNotif = useCallback(() => setNotifOpen(true), []);

  useAppShortcuts({
    onOpenPalette: openPalette,
    onOpenNotifications: openNotif,
  });

  if (checkingAuth) return <LoadingScreen />;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: "#0D1B2A" }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflowX: "hidden",
        }}
      >
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          onPaletteOpen={openPalette}
          onNotifOpen={openNotif}
        />

        <Box component="main" sx={{ flex: 1, overflowY: "auto" }}>
          {children}
        </Box>
      </Box>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
      <NotificationCenter
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </Box>
  );
}