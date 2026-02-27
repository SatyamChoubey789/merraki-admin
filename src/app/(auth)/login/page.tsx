"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  AdminPanelSettings,
  ArrowBackRounded,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { alpha } from "@mui/material";
import api from "@/lib/axios";

const GOLD = "#C9A84C";
const NAVY = "#0D1B2A";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Minimum 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  // ✅ Use Next.js hook — works on both server and client, no hydration mismatch
  const searchParams = useSearchParams();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // ✅ Mount flag so session-expired alert only renders client-side
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sessionExpired = searchParams.get("reason") === "session_expired";
  const fromPath = searchParams.get("from");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
  setLoading(true);
  setError("");

  try {
    await api.post("/admin/auth/login", {
      email: data.email,
      password: data.password,
    });

    router.push(fromPath ? decodeURIComponent(fromPath) : "/dashboard");

  } catch (err: any) {
    setError(
      err?.response?.data?.message ||
      "Invalid email or password"
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        background: `radial-gradient(ellipse at 20% 50%, ${alpha(GOLD, 0.06)} 0%, transparent 55%),
                     radial-gradient(ellipse at 80% 20%, rgba(74,143,212,0.06) 0%, transparent 55%),
                     ${NAVY}`,
        overflow: "hidden",
      }}
    >
      {/* Grid background */}
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <defs>
          <pattern id="lg" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(201,168,76,0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lg)" />
      </svg>

      {/* Animated orbs */}
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 15, repeat: Infinity }}
        style={{
          position: "fixed",
          top: "10%",
          left: "10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(GOLD, 0.07)} 0%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 20, 0] }}
        transition={{ duration: 20, repeat: Infinity, delay: 4 }}
        style={{
          position: "fixed",
          bottom: "15%",
          right: "8%",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,143,212,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Back link */}
      <Box sx={{ position: "fixed", top: 24, left: 24, zIndex: 10 }}>
        <Button
          component={Link}
          href="/"
          startIcon={<ArrowBackRounded sx={{ fontSize: 16 }} />}
          size="small"
          sx={{
            color: "rgba(240,237,232,0.5)",
            fontSize: "0.8rem",
            "&:hover": { color: GOLD, background: alpha(GOLD, 0.08) },
            borderRadius: 2,
          }}
        >
          Back to home
        </Button>
      </Box>

      {/* Left decorative panel */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "45%",
          flexDirection: "column",
          justifyContent: "center",
          px: 8,
          position: "relative",
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                background: `linear-gradient(135deg, ${GOLD}, #A8872E)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 6px 20px ${alpha(GOLD, 0.4)}`,
              }}
            >
              <AdminPanelSettings sx={{ color: NAVY, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: "1.15rem",
                }}
              >
                Merraki
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.12em",
                  color: alpha(GOLD, 0.7),
                }}
              >
                ADMIN PANEL
              </Typography>
            </Box>
          </Box>

          <Typography
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: "2.8rem",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              mb: 2,
            }}
          >
            Welcome
            <br />
            back, admin.
          </Typography>
          <Typography
            sx={{
              color: "rgba(240,237,232,0.4)",
              lineHeight: 1.8,
              maxWidth: 340,
              fontSize: "0.9rem",
            }}
          >
            Sign in to access the Merraki platform dashboard, manage users,
            orders, content and more.
          </Typography>

          <Box
            sx={{
              mt: 5,
              p: 2.5,
              borderRadius: 3,
              background: alpha("#1A2535", 0.6),
              border: `1px solid ${alpha(GOLD, 0.15)}`,
              backdropFilter: "blur(20px)",
              maxWidth: 320,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                color: alpha(GOLD, 0.7),
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                mb: 1.5,
                fontWeight: 600,
              }}
            >
              Quick access
            </Typography>
            {[
              { label: "Dashboard", desc: "Live stats & analytics" },
              { label: "Orders", desc: "Approve & manage orders" },
              { label: "Blog", desc: "Publish content" },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 500 }}>
                  {item.label}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.78rem", color: "text.disabled" }}
                >
                  {item.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, sm: 5 },
          position: "relative",
          zIndex: 1,
          borderLeft: { md: "1px solid rgba(255,255,255,0.05)" },
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 400 }}
        >
          {/* Mobile logo */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              gap: 1.5,
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${GOLD}, #A8872E)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AdminPanelSettings sx={{ color: NAVY, fontSize: 18 }} />
            </Box>
            <Typography
              sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: "1.1rem",
              }}
            >
              Merraki Admin
            </Typography>
          </Box>

          <Typography variant="h4" sx={{ mb: 0.5, fontSize: "1.7rem" }}>
            Sign in
          </Typography>
          <Typography
            sx={{ color: "text.secondary", mb: 4, fontSize: "0.88rem" }}
          >
            Enter your credentials to access the panel
          </Typography>

          {/* ✅ Session expired notice — only renders after mount (client-only) */}
          {mounted && sessionExpired && !error && (
            <Alert
              severity="info"
              sx={{ mb: 3, borderRadius: 2, fontSize: "0.82rem" }}
            >
              Your session expired. Please sign in again.
            </Alert>
          )}

          {/* Error alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
          >
            <TextField
              {...register("email")}
              label="Email address"
              type="email"
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            <TextField
              {...register("password")}
              label="Password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPass(!showPass)}
                      edge="end"
                      size="small"
                    >
                      {showPass ? (
                        <VisibilityOff sx={{ fontSize: 18 }} />
                      ) : (
                        <Visibility sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 1, py: 1.5, fontSize: "0.95rem", borderRadius: 2 }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: NAVY }} />
              ) : (
                "Sign In"
              )}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
              component={Link}
              href="/forgot-password"
              size="small"
              sx={{
                color: "text.disabled",
                fontSize: "0.8rem",
                "&:hover": { color: GOLD },
              }}
            >
              Forgot password?
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.83rem", color: "text.disabled" }}>
              Need an account?{" "}
              <Box
                component={Link}
                href="/register"
                sx={{
                  color: GOLD,
                  textDecoration: "none",
                  fontWeight: 600,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Request access
              </Box>
            </Typography>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
}
