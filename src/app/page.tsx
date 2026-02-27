"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Box, Button, Typography, Grid, Chip } from "@mui/material";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { alpha } from "@mui/material";
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
  ArrowForwardRounded,
  CheckRounded,
  AdminPanelSettingsRounded,
  TrendingUpRounded,
  SecurityRounded,
  SpeedRounded,
  AutoAwesomeRounded,
} from "@mui/icons-material";

const GOLD = "#C9A84C";
const NAVY = "#0D1B2A";

const features = [
  {
    icon: <DashboardRounded />,
    title: "Live Dashboard",
    desc: "Real-time platform stats, revenue charts, and admin activity logs in one commanding view.",
  },
  {
    icon: <PeopleRounded />,
    title: "User Management",
    desc: "Search, filter, update and moderate users with granular role-based access controls.",
  },
  {
    icon: <ShoppingCartRounded />,
    title: "Order Control",
    desc: "Approve or reject orders, track payment status, and dive into revenue analytics.",
  },
  {
    icon: <ArticleRounded />,
    title: "Blog & Content",
    desc: "Full Tiptap rich-text editor for creating, scheduling and publishing blog content.",
  },
  {
    icon: <AssignmentRounded />,
    title: "Assessments",
    desc: "Build multi-type test questions, export submissions, and view score analytics.",
  },
  {
    icon: <ContactMailRounded />,
    title: "Contact Hub",
    desc: "Triage support submissions, reply inline, and track resolution status end-to-end.",
  },
  {
    icon: <EmailRounded />,
    title: "Newsletter Engine",
    desc: "Craft campaigns, manage subscriber lists, send and track open rates.",
  },
  {
    icon: <LayersRounded />,
    title: "Template Store",
    desc: "Upload, price and manage digital templates with download analytics.",
  },
  {
    icon: <CalculateRounded />,
    title: "Calculator Insights",
    desc: "Deep analytics on every calculator tool — usage trends, sessions, and type breakdowns.",
  },
];

const stats = [
  { value: "9", label: "Modules" },
  { value: "40+", label: "API Endpoints" },
  { value: "100%", label: "Role-based" },
  { value: "∞", label: "Scalable" },
];

const pillars = [
  {
    icon: <SecurityRounded />,
    title: "Secure by Default",
    desc: "httpOnly cookies, session-based auth, and permission guards on every route.",
  },
  {
    icon: <SpeedRounded />,
    title: "Performance First",
    desc: "SWR smart caching, skeleton loaders, and optimistic UI updates throughout.",
  },
  {
    icon: <TrendingUpRounded />,
    title: "Analytics Everywhere",
    desc: "Every module surfaces actionable data — revenue, engagement, usage.",
  },
  {
    icon: <AutoAwesomeRounded />,
    title: "Refined Experience",
    desc: "Micro-animations, Framer Motion transitions, and a luxury design language.",
  },
];

// Animated grid background
function GridBackground() {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(201,168,76,0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Radial vignette */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, transparent 40%, ${NAVY} 90%)`,
        }}
      />
    </Box>
  );
}

// Floating orbs
function Orbs() {
  return (
    <>
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed",
          top: "8%",
          left: "5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(GOLD, 0.07)} 0%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
        style={{
          position: "fixed",
          top: "30%",
          right: "3%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(74,143,212,0.07) 0%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, 40, 0] }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 6,
        }}
        style={{
          position: "fixed",
          bottom: "10%",
          left: "25%",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(GOLD, 0.05)} 0%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </>
  );
}

// Scroll-triggered section wrapper
function Section({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Feature card
function FeatureCard({
  icon,
  title,
  desc,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.07,
        ease: [0.16, 1, 0.3, 1],
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          height: "100%",
          background: hovered
            ? `linear-gradient(135deg, ${alpha(GOLD, 0.1)} 0%, ${alpha("#1A2535", 0.8)} 100%)`
            : alpha("#1A2535", 0.6),
          border: `1px solid ${hovered ? alpha(GOLD, 0.3) : "rgba(255,255,255,0.06)"}`,
          backdropFilter: "blur(20px)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "default",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${alpha(GOLD, 0.15)} 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            mb: 2,
            background: hovered
              ? `linear-gradient(135deg, ${alpha(GOLD, 0.25)}, ${alpha(GOLD, 0.1)})`
              : alpha(GOLD, 0.1),
            border: `1px solid ${alpha(GOLD, hovered ? 0.4 : 0.2)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: GOLD,
            transition: "all 0.3s ease",
            boxShadow: hovered ? `0 4px 16px ${alpha(GOLD, 0.25)}` : "none",
            "& svg": { fontSize: 20 },
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontWeight: 600,
            mb: 0.75,
            fontSize: "0.95rem",
            color: "#F0EDE8",
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.82rem",
            color: "rgba(240,237,232,0.5)",
            lineHeight: 1.7,
          }}
        >
          {desc}
        </Typography>
      </Box>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${NAVY} 0%, #091422 100%)`,
        color: "#F0EDE8",
        fontFamily: '"DM Sans", sans-serif',
        overflowX: "hidden",
      }}
    >
      <GridBackground />
      <Orbs />

      {/* NAV */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 3, md: 6 },
            py: 2,
            background: alpha("#0D1B2A", 0.8),
            backdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${GOLD} 0%, #A8872E 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 14px ${alpha(GOLD, 0.35)}`,
              }}
            >
              <AdminPanelSettingsRounded
                sx={{ color: "#0D1B2A", fontSize: 18 }}
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: "1.05rem",
                  lineHeight: 1,
                  color: "#F0EDE8",
                }}
              >
                Merraki
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.58rem",
                  letterSpacing: "0.12em",
                  color: alpha(GOLD, 0.7),
                  lineHeight: 1,
                }}
              >
                ADMIN PANEL
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              size="small"
              sx={{
                borderColor: alpha(GOLD, 0.35),
                color: "rgba(240,237,232,0.8)",
                borderRadius: 2,
                px: 2.5,
                py: 0.8,
                fontSize: "0.82rem",
                "&:hover": {
                  borderColor: GOLD,
                  color: GOLD,
                  background: alpha(GOLD, 0.06),
                },
              }}
            >
              Sign In
            </Button>
            <Button
              component={Link}
              href="/register"
              variant="contained"
              size="small"
              sx={{
                background: `linear-gradient(135deg, ${GOLD} 0%, #A8872E 100%)`,
                color: "#0D1B2A",
                borderRadius: 2,
                px: 2.5,
                py: 0.8,
                fontSize: "0.82rem",
                fontWeight: 700,
                boxShadow: `0 4px 16px ${alpha(GOLD, 0.35)}`,
                "&:hover": {
                  background: `linear-gradient(135deg, #D4B96A 0%, ${GOLD} 100%)`,
                  boxShadow: `0 6px 24px ${alpha(GOLD, 0.5)}`,
                },
              }}
            >
              Get Access
            </Button>
          </Box>
        </Box>
      </motion.div>

      {/* HERO */}
      <Box
        ref={heroRef}
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          px: { xs: 3, md: 6 },
          pt: 10,
          position: "relative",
          zIndex: 1,
        }}
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Chip
              icon={
                <AutoAwesomeRounded
                  sx={{
                    fontSize: "14px !important",
                    color: `${GOLD} !important`,
                  }}
                />
              }
              label="Production-Grade Admin Infrastructure"
              size="small"
              sx={{
                mb: 4,
                background: alpha(GOLD, 0.1),
                color: GOLD,
                border: `1px solid ${alpha(GOLD, 0.3)}`,
                fontWeight: 600,
                fontSize: "0.72rem",
                letterSpacing: "0.05em",
                px: 1,
                py: 0.3,
                height: 28,
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Typography
              sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: { xs: "2.8rem", sm: "4rem", md: "5.5rem" },
                fontWeight: 400,
                lineHeight: 1.08,
                mb: 1,
                color: "#F0EDE8",
                letterSpacing: "-0.02em",
              }}
            >
              The Command Center
            </Typography>
            <Typography
              sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: { xs: "2.8rem", sm: "4rem", md: "5.5rem" },
                fontWeight: 400,
                lineHeight: 1.08,
                mb: 3,
                background: `linear-gradient(135deg, ${GOLD} 20%, #D4B96A 50%, #A8872E 80%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              for Merraki
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <Typography
              sx={{
                fontSize: { xs: "1rem", md: "1.2rem" },
                color: "rgba(240,237,232,0.55)",
                maxWidth: 560,
                mx: "auto",
                mb: 5,
                lineHeight: 1.75,
              }}
            >
              A unified admin panel with 9 modules, 40+ API endpoints, real-time
              analytics, role-based access, and a design language built for
              professionals.
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Button
              component={Link}
              href="/register"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRounded />}
              sx={{
                background: `linear-gradient(135deg, ${GOLD} 0%, #A8872E 100%)`,
                color: "#0D1B2A",
                fontWeight: 700,
                px: 4,
                py: 1.5,
                borderRadius: 2.5,
                fontSize: "0.95rem",
                boxShadow: `0 8px 32px ${alpha(GOLD, 0.4)}`,
                "&:hover": {
                  background: `linear-gradient(135deg, #D4B96A 0%, ${GOLD} 100%)`,
                  boxShadow: `0 12px 40px ${alpha(GOLD, 0.55)}`,
                  transform: "translateY(-2px)",
                },
              }}
            >
              Request Access
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              size="large"
              sx={{
                borderColor: alpha("#F0EDE8", 0.2),
                color: "rgba(240,237,232,0.75)",
                px: 4,
                py: 1.5,
                borderRadius: 2.5,
                fontSize: "0.95rem",
                "&:hover": {
                  borderColor: alpha(GOLD, 0.5),
                  color: GOLD,
                  background: alpha(GOLD, 0.06),
                  transform: "translateY(-2px)",
                },
              }}
            >
              Sign In
            </Button>
          </motion.div>

          {/* Stat row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: { xs: 3, md: 5 },
                mt: 8,
                pt: 6,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                flexWrap: "wrap",
              }}
            >
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1, duration: 0.4 }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      sx={{
                        fontFamily: '"DM Serif Display", serif',
                        fontSize: "2.2rem",
                        color: GOLD,
                        lineHeight: 1,
                        mb: 0.3,
                      }}
                    >
                      {s.value}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "rgba(240,237,232,0.4)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {s.label}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </motion.div>
      </Box>

      {/* FEATURES GRID */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          px: { xs: 3, md: 8 },
          py: { xs: 8, md: 12 },
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        <Section>
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <Chip
              label="Modules"
              size="small"
              sx={{
                mb: 2,
                background: alpha(GOLD, 0.1),
                color: GOLD,
                border: `1px solid ${alpha(GOLD, 0.2)}`,
                fontSize: "0.7rem",
                letterSpacing: "0.08em",
              }}
            />
            <Typography
              sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: { xs: "2rem", md: "3rem" },
                mb: 1.5,
                letterSpacing: "-0.02em",
              }}
            >
              Every tool you need
            </Typography>
            <Typography
              sx={{
                color: "rgba(240,237,232,0.45)",
                maxWidth: 500,
                mx: "auto",
                lineHeight: 1.75,
                fontSize: "0.95rem",
              }}
            >
              Nine purpose-built modules covering every dimension of platform
              management.
            </Typography>
          </Box>
        </Section>

        <Grid container spacing={2.5}>
          {features.map((f, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
              <FeatureCard
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                index={i}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* PILLARS */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          px: { xs: 3, md: 8 },
          py: { xs: 8, md: 10 },
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        <Section>
          <Box
            sx={{
              borderRadius: 4,
              p: { xs: 4, md: 6 },
              background: `linear-gradient(135deg, ${alpha("#1A2535", 0.9)} 0%, ${alpha("#111827", 0.9)} 100%)`,
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(30px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Accent line */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: "10%",
                right: "10%",
                height: 1,
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
              }}
            />

            <Box sx={{ textAlign: "center", mb: 6 }}>
              <Typography
                sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: { xs: "1.8rem", md: "2.5rem" },
                  letterSpacing: "-0.02em",
                }}
              >
                Built on four pillars
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {pillars.map((p, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={p.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                  >
                    <Box sx={{ textAlign: "center" }}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          mx: "auto",
                          mb: 2,
                          background: `radial-gradient(circle, ${alpha(GOLD, 0.15)}, ${alpha(GOLD, 0.05)})`,
                          border: `1px solid ${alpha(GOLD, 0.25)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: GOLD,
                          "& svg": { fontSize: 22 },
                        }}
                      >
                        {p.icon}
                      </Box>
                      <Typography
                        sx={{ fontWeight: 600, mb: 1, fontSize: "0.95rem" }}
                      >
                        {p.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.82rem",
                          color: "rgba(240,237,232,0.45)",
                          lineHeight: 1.7,
                        }}
                      >
                        {p.desc}
                      </Typography>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Section>
      </Box>

      {/* ACCESS LEVELS */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          px: { xs: 3, md: 8 },
          py: { xs: 8, md: 10 },
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        <Section>
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: { xs: "1.8rem", md: "2.5rem" },
                letterSpacing: "-0.02em",
                mb: 1,
              }}
            >
              Role-based access
            </Typography>
            <Typography
              sx={{ color: "rgba(240,237,232,0.45)", fontSize: "0.95rem" }}
            >
              Granular permissions for every team member
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {[
              {
                role: "Super Admin",
                color: GOLD,
                perms: [
                  "All modules",
                  "Admin management",
                  "System settings",
                  "Full data access",
                ],
                badge: "Full Control",
              },
              {
                role: "Admin",
                color: "#4A8FD4",
                perms: [
                  "Users & Orders",
                  "Blog & Newsletter",
                  "Contacts & Templates",
                  "Analytics views",
                ],
                badge: "Standard",
              },
              {
                role: "Editor",
                color: "#4CAF82",
                perms: [
                  "Blog management",
                  "Newsletter drafts",
                  "Template uploads",
                  "Read analytics",
                ],
                badge: "Content",
              },
              {
                role: "Viewer",
                color: "#6B8CAE",
                perms: [
                  "Dashboard read",
                  "Analytics read",
                  "No write access",
                  "Report exports",
                ],
                badge: "Read Only",
              },
            ].map((r, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={r.role}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background: alpha("#1A2535", 0.7),
                      border: `1px solid ${alpha(r.color, 0.2)}`,
                      backdropFilter: "blur(20px)",
                      transition: "border-color 0.3s",
                      "&:hover": { borderColor: alpha(r.color, 0.5) },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                        {r.role}
                      </Typography>
                      <Chip
                        label={r.badge}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.6rem",
                          background: alpha(r.color, 0.15),
                          color: r.color,
                          border: `1px solid ${alpha(r.color, 0.3)}`,
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.9,
                      }}
                    >
                      {r.perms.map((p) => (
                        <Box
                          key={p}
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <CheckRounded sx={{ fontSize: 13, color: r.color }} />
                          <Typography
                            sx={{
                              fontSize: "0.78rem",
                              color: "rgba(240,237,232,0.6)",
                            }}
                          >
                            {p}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Section>
      </Box>

      {/* CTA */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          px: { xs: 3, md: 8 },
          pb: 16,
          pt: 4,
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        <Section>
          <Box
            sx={{
              borderRadius: 4,
              p: { xs: 5, md: 8 },
              background: `linear-gradient(135deg, ${alpha(GOLD, 0.1)} 0%, ${alpha("#1A2535", 0.8)} 50%, ${alpha("#4A8FD4", 0.08)} 100%)`,
              border: `1px solid ${alpha(GOLD, 0.2)}`,
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 1,
                background: `linear-gradient(90deg, transparent, ${alpha(GOLD, 0.4)}, transparent)`,
              }}
            />

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ display: "inline-block", marginBottom: 24 }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  mx: "auto",
                  background: `linear-gradient(135deg, ${GOLD} 0%, #A8872E 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 8px 32px ${alpha(GOLD, 0.45)}`,
                }}
              >
                <AdminPanelSettingsRounded
                  sx={{ color: "#0D1B2A", fontSize: 30 }}
                />
              </Box>
            </motion.div>

            <Typography
              sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: { xs: "2rem", md: "3rem" },
                mb: 2,
                letterSpacing: "-0.02em",
              }}
            >
              Ready to take control?
            </Typography>
            <Typography
              sx={{
                color: "rgba(240,237,232,0.5)",
                maxWidth: 460,
                mx: "auto",
                mb: 5,
                lineHeight: 1.75,
                fontSize: "0.95rem",
              }}
            >
              Create your admin account and manage the Merraki platform from a
              single, powerful dashboard.
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                component={Link}
                href="/register"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardRounded />}
                sx={{
                  background: `linear-gradient(135deg, ${GOLD} 0%, #A8872E 100%)`,
                  color: "#0D1B2A",
                  fontWeight: 700,
                  px: 4.5,
                  py: 1.6,
                  borderRadius: 2.5,
                  fontSize: "0.95rem",
                  boxShadow: `0 8px 32px ${alpha(GOLD, 0.45)}`,
                  "&:hover": {
                    background: `linear-gradient(135deg, #D4B96A 0%, ${GOLD} 100%)`,
                    boxShadow: `0 12px 40px ${alpha(GOLD, 0.6)}`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                Create Account
              </Button>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: alpha(GOLD, 0.3),
                  color: GOLD,
                  px: 4.5,
                  py: 1.6,
                  borderRadius: 2.5,
                  fontSize: "0.95rem",
                  "&:hover": {
                    borderColor: GOLD,
                    background: alpha(GOLD, 0.08),
                    transform: "translateY(-2px)",
                  },
                }}
              >
                Sign In Instead
              </Button>
            </Box>
          </Box>
        </Section>
      </Box>

      {/* FOOTER */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          px: { xs: 3, md: 8 },
          py: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "8px",
              background: `linear-gradient(135deg, ${GOLD}, #A8872E)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AdminPanelSettingsRounded
              sx={{ color: "#0D1B2A", fontSize: 14 }}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: "0.95rem",
              color: "rgba(240,237,232,0.6)",
            }}
          >
            Merraki Admin
          </Typography>
        </Box>
        <Typography
          sx={{ fontSize: "0.78rem", color: "rgba(240,237,232,0.3)" }}
        >
          © {new Date().getFullYear()} Merraki. Restricted access — authorised
          administrators only.
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            component={Link}
            href="/login"
            size="small"
            sx={{
              color: "rgba(240,237,232,0.4)",
              fontSize: "0.78rem",
              "&:hover": { color: GOLD },
            }}
          >
            Sign In
          </Button>
          <Button
            component={Link}
            href="/register"
            size="small"
            sx={{
              color: "rgba(240,237,232,0.4)",
              fontSize: "0.78rem",
              "&:hover": { color: GOLD },
            }}
          >
            Register
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
