"use client";
import { useState } from "react";
import Link from "next/link";
import { Box, TextField, Button, Typography, Alert } from "@mui/material";
import { ArrowBackRounded, EmailRounded } from "@mui/icons-material";
import { InputAdornment as MuiInputAdornment } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { alpha } from "@mui/material";
import { AdminPanelSettings, CheckCircleRounded } from "@mui/icons-material";
import api from "@/lib/axios";

const GOLD = "#C9A84C";
const NAVY = "#0D1B2A";

const schema = z.object({ email: z.string().email("Valid email required") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
  setLoading(true);
  setError("");

  try {
    const res = await api.post("/admin/auth/change-password", data);

    // Backend should always return 200 even if email doesn't exist
    setSent(true);

  } catch (err: any) {
    const message =
      err?.response?.data?.message ||
      "Could not send reset email. Please try again.";

    setError(message);
  } finally {
    setLoading(false);
  }
};

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(ellipse at 30% 50%, ${alpha(GOLD, 0.06)} 0%, transparent 55%), ${NAVY}`,
        p: 3,
      }}
    >
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
          <pattern id="fp" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(201,168,76,0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#fp)" />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "100%",
          maxWidth: 400,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 5 }}>
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
              fontSize: "1.05rem",
            }}
          >
            Merraki Admin
          </Typography>
        </Box>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: alpha("#4CAF82", 0.12),
                    border: `1px solid ${alpha("#4CAF82", 0.3)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <CheckCircleRounded sx={{ fontSize: 28, color: "#4CAF82" }} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: "1.6rem",
                    mb: 1,
                  }}
                >
                  Check your inbox
                </Typography>
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.88rem",
                    mb: 4,
                    lineHeight: 1.7,
                  }}
                >
                  If that email is registered, you&apos;ll receive a password
                  reset link shortly.
                </Typography>
                <Button
                  component={Link}
                  href="/login"
                  variant="outlined"
                  startIcon={<ArrowBackRounded />}
                  sx={{ borderRadius: 2 }}
                >
                  Back to Sign In
                </Button>
              </Box>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Typography variant="h4" sx={{ mb: 0.5, fontSize: "1.7rem" }}>
                Reset password
              </Typography>
              <Typography
                sx={{ color: "text.secondary", mb: 4, fontSize: "0.88rem" }}
              >
                Enter your admin email and we&apos;ll send a reset link.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
              >
                <TextField
                  {...register("email")}
                  label="Email address"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  InputProps={{
                    startAdornment: (
                      <MuiInputAdornment position="start">
                        <EmailRounded
                          sx={{ fontSize: 18, color: "text.disabled" }}
                        />
                      </MuiInputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </Box>

              <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button
                  component={Link}
                  href="/login"
                  startIcon={<ArrowBackRounded sx={{ fontSize: 15 }} />}
                  size="small"
                  sx={{
                    color: "text.disabled",
                    fontSize: "0.82rem",
                    "&:hover": { color: GOLD },
                  }}
                >
                  Back to sign in
                </Button>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Box>
  );
}
