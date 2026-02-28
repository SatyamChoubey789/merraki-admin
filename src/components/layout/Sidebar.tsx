"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  Chip,
  Drawer,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  DashboardRounded,
  PeopleRounded,
  ShoppingCartRounded,
  ArticleRounded,
  AssignmentRounded,
  ContactMailRounded,
  EmailRounded,
  LayersRounded,
  CalculateRounded,
  LogoutRounded,
  CategoryRounded,
  AccountCircleRounded,
  SettingsRounded,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import useSWR from "swr";
import api from "@/lib/axios";

const GOLD = "#C9A84C";
export const SIDEBAR_W = 256;

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  content_manager: "Content Mgr",
  order_manager: "Order Mgr",
  support_staff: "Support",
};
const ROLE_COLORS: Record<string, string> = {
  super_admin: GOLD,
  admin: "#4A8FD4",
  content_manager: "#9B7FD4",
  order_manager: "#4CAF82",
  support_staff: "#E8A838",
};

const NAV_GROUPS = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: <DashboardRounded />, href: "/dashboard" },
      { label: "Users", icon: <PeopleRounded />, href: "/users" },
      { label: "Orders", icon: <ShoppingCartRounded />, href: "/orders" },
      { label: "Blog", icon: <ArticleRounded />, href: "/blog" },
      {
        label: "Blog Categories",
        icon: <CategoryRounded />,
        href: "/blog/categories",
        permission: "blog",
      },
      {
        label: "Authors",
        icon: <PeopleRounded />,
        href: "/blog/authors",
        permission: "blog",
      },
      { label: "Tests", icon: <AssignmentRounded />, href: "/tests" },
      { label: "Contacts", icon: <ContactMailRounded />, href: "/contacts" },
      { label: "Newsletter", icon: <EmailRounded />, href: "/newsletter" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Templates", icon: <LayersRounded />, href: "/templates" },
      {
        label: "Template Categories",
        icon: <CategoryRounded />,
        href: "/template-categories",
      },
      {
        label: "Calculators",
        icon: <CalculateRounded />,
        href: "/calculators",
      },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", icon: <AccountCircleRounded />, href: "/profile" },
      { label: "Settings", icon: <SettingsRounded />, href: "/settings" },
    ],
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const { data: meData } = useSWR("/admin/auth/me");
  const admin = meData?.data?.admin;
  const roleColor = ROLE_COLORS[admin?.role ?? ""] ?? GOLD;
  const initials = (admin?.email ?? "A").charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[admin?.role ?? ""] ?? admin?.role ?? "Admin";

  const handleLogout = async () => {
    try {
      await api.post("/admin/auth/logout");
    } catch {
      /* ignore */
    }
    router.push("/login");
  };

  return (
    <Box
      sx={{
        width: SIDEBAR_W,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #091422 0%, #0D1B2A 100%)",
        borderRight: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 2.75, pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              flexShrink: 0,
              background: `linear-gradient(135deg, ${GOLD} 0%, #8B6914 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 20px ${alpha(GOLD, 0.3)}`,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                color: "#091422",
                fontSize: "1.1rem",
                fontFamily: '"DM Serif Display", serif',
                lineHeight: 1,
              }}
            >
              M
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "#F0EDE8",
                letterSpacing: "0.01em",
              }}
            >
              Merraki
            </Typography>
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: alpha(GOLD, 0.55),
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Admin Console
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.045)", mx: 2 }} />

      {/* Navigation */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: 1.5,
          py: 1.75,
          "&::-webkit-scrollbar": { width: 0 },
        }}
      >
        {NAV_GROUPS.map((group) => (
          <Box key={group.title} sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: "0.57rem",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.18)",
                px: 1.25,
                mb: 0.6,
              }}
            >
              {group.title}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (pathname?.startsWith(item.href + "/") && item.href !== "/");
                return (
                  <ListItem key={item.label} disablePadding sx={{ mb: 0.2 }}>
                    <Link
                      href={item.href}
                      style={{ textDecoration: "none", width: "100%" }}
                      onClick={onClose}
                    >
                      <ListItemButton
                        sx={{
                          borderRadius: 1.75,
                          px: 1.25,
                          py: 0.75,
                          position: "relative",
                          background: active
                            ? alpha(GOLD, 0.09)
                            : "transparent",
                          color: active ? GOLD : "rgba(240,237,232,0.45)",
                          transition: "all 0.15s",
                          "&:hover": {
                            background: alpha(GOLD, 0.06),
                            color: "rgba(240,237,232,0.8)",
                          },
                        }}
                      >
                        {active && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 3,
                              height: 18,
                              borderRadius: "0 3px 3px 0",
                              background: GOLD,
                              boxShadow: `0 0 10px ${alpha(GOLD, 0.6)}`,
                            }}
                          />
                        )}
                        <ListItemIcon
                          sx={{
                            color: "inherit",
                            minWidth: 32,
                            "& svg": { fontSize: 18 },
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: "0.84rem",
                            fontWeight: active ? 600 : 400,
                          }}
                        />
                      </ListItemButton>
                    </Link>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.045)", mx: 2 }} />

      {/* Footer: profile + logout */}
      <Box sx={{ p: 1.5, gap: 0.25, display: "flex", flexDirection: "column" }}>
        <Link
          href="/profile"
          style={{ textDecoration: "none" }}
          onClick={onClose}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              px: 1.25,
              py: 0.9,
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.15s",
              "&:hover": { background: alpha("#fff", 0.035) },
            }}
          >
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${alpha(roleColor, 0.4)}, ${alpha(roleColor, 0.12)})`,
                  color: roleColor,
                  border: `1.5px solid ${alpha(roleColor, 0.3)}`,
                }}
              >
                {initials}
              </Avatar>
              {/* Online dot */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#4CAF82",
                  border: "1.5px solid #091422",
                  boxShadow: `0 0 6px ${alpha("#4CAF82", 0.8)}`,
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  color: "#F0EDE8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1.4,
                }}
              >
                {admin?.email ?? "Loading…"}
              </Typography>
              <Chip
                label={roleLabel}
                size="small"
                sx={{
                  height: 14,
                  fontSize: "0.54rem",
                  fontWeight: 700,
                  mt: 0.2,
                  background: alpha(roleColor, 0.1),
                  color: alpha(roleColor, 0.85),
                  border: `1px solid ${alpha(roleColor, 0.2)}`,
                  "& .MuiChip-label": { px: 0.6, py: 0 },
                }}
              />
            </Box>
          </Box>
        </Link>

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            px: 1.25,
            py: 0.8,
            color: "rgba(240,237,232,0.28)",
            transition: "all 0.15s",
            "&:hover": { background: alpha("#E05C5C", 0.07), color: "#E05C5C" },
          }}
        >
          <ListItemIcon
            sx={{ color: "inherit", minWidth: 32, "& svg": { fontSize: 17 } }}
          >
            <LogoutRounded />
          </ListItemIcon>
          <ListItemText
            primary="Sign Out"
            primaryTypographyProps={{ fontSize: "0.84rem" }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );
}

export default function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  if (isMobile) {
    return (
      <Drawer
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            width: SIDEBAR_W,
            border: "none",
            background: "transparent",
          },
        }}
      >
        <SidebarContent onClose={onMobileClose} />
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        width: SIDEBAR_W,
        flexShrink: 0,
        display: { xs: "none", lg: "block" },
      }}
    >
      <Box sx={{ position: "sticky", top: 0, height: "100vh" }}>
        <SidebarContent />
      </Box>
    </Box>
  );
}
