"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  AdminPanelSettings,
  PersonRounded,
  EmailRounded,
  LockRounded,
  BadgeRounded,
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckRounded,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { alpha } from "@mui/material";
import api from "@/lib/axios";

const GOLD = "#C9A84C";
const NAVY = "#0D1B2A";

const step1Schema = z.object({
  name: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
});

const step2Schema = z
  .object({
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[0-9]/, "Must contain a number")
      .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const step3Schema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
  reason: z.string().min(20, "Please provide at least 20 characters"),
  inviteCode: z.string().optional(),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

const steps = ["Identity", "Security", "Access"];

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ chars", pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
    { label: "Special", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["#E05C5C", "#E8A838", "#E8A838", GOLD, "#4CAF82"];

  return (
    <Box sx={{ mt: 1 }}>
      <LinearProgress
        variant="determinate"
        value={(score / 4) * 100}
        sx={{
          mb: 1,
          height: 3,
          borderRadius: 2,
          background: alpha("#fff", 0.08),
          "& .MuiLinearProgress-bar": {
            background: colors[score],
            borderRadius: 2,
            transition: "all 0.4s ease",
          },
        }}
      />
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {checks.map((c) => (
          <Box
            key={c.label}
            sx={{ display: "flex", alignItems: "center", gap: 0.4 }}
          >
            <CheckRounded
              sx={{
                fontSize: 11,
                color: c.pass ? "#4CAF82" : "rgba(255,255,255,0.2)",
              }}
            />
            <Typography
              sx={{
                fontSize: "0.68rem",
                color: c.pass
                  ? "rgba(240,237,232,0.7)"
                  : "rgba(255,255,255,0.3)",
              }}
            >
              {c.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [watchedPassword, setWatchedPassword] = useState("");

  // Step data accumulation
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);
  const [step2Data, setStep2Data] = useState<Step2 | null>(null);

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });
  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { role: "editor" },
  });

  const handleStep1 = (data: Step1) => {
    setStep1Data(data);
    setCurrentStep(1);
  };
  const handleStep2 = (data: Step2) => {
    setStep2Data(data);
    setCurrentStep(2);
  };

  const handleStep3 = async (data: Step3) => {
    if (!step1Data || !step2Data) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: step1Data.name,
        email: step1Data.email,
        password: step2Data.password,
        role: data.role,
        reason: data.reason,
        inviteCode: data.inviteCode,
      };
      await api.post("/api/auth/register", payload);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Registration failed. Please try again.",
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
        background: `radial-gradient(ellipse at 25% 40%, ${alpha(GOLD, 0.07)} 0%, transparent 55%), radial-gradient(ellipse at 75% 60%, rgba(74,143,212,0.06) 0%, transparent 55%), ${NAVY}`,
      }}
    >
      {/* Left panel — decorative */}
      <Box
        sx={{
          display: { xs: "none", lg: "flex" },
          width: "42%",
          flexDirection: "column",
          justifyContent: "center",
          px: 8,
          position: "relative",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}
      >
        {/* Grid */}
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <defs>
            <pattern
              id="g2"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="rgba(201,168,76,0.05)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g2)" />
        </svg>
        <Box
          sx={{
            position: "absolute",
            top: "20%",
            left: "30%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(GOLD, 0.1)} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 6 }}>
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
                  fontSize: "1.1rem",
                  color: "#F0EDE8",
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
              mb: 2,
              letterSpacing: "-0.02em",
            }}
          >
            Join the
            <br />
            <Box
              component="span"
              sx={{
                background: `linear-gradient(135deg, ${GOLD}, #D4B96A)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              command center
            </Box>
          </Typography>

          <Typography
            sx={{
              color: "rgba(240,237,232,0.45)",
              lineHeight: 1.8,
              mb: 6,
              fontSize: "0.9rem",
              maxWidth: 340,
            }}
          >
            Request access to the Merraki admin panel and manage the entire
            platform from one powerful, unified interface.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              "Full-featured dashboard & analytics",
              "9 management modules",
              "Role-based permission system",
              "Real-time data & activity logs",
              "Tiptap rich content editor",
            ].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: alpha(GOLD, 0.15),
                      border: `1px solid ${alpha(GOLD, 0.3)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CheckRounded sx={{ fontSize: 12, color: GOLD }} />
                  </Box>
                  <Typography
                    sx={{ fontSize: "0.85rem", color: "rgba(240,237,232,0.6)" }}
                  >
                    {item}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </motion.div>
      </Box>

      {/* Right panel — form */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, sm: 5 },
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 460 }}
        >
          {/* Mobile logo */}
          <Box
            sx={{
              display: { xs: "flex", lg: "none" },
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

          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ mb: 0.5, fontSize: "1.7rem" }}>
              Create account
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.88rem" }}>
              Step {currentStep + 1} of 3 — {steps[currentStep]}
            </Typography>
          </Box>

          {/* Stepper */}
          <Box sx={{ display: "flex", gap: 1, mb: 5 }}>
            {steps.map((s, i) => (
              <Box key={s} sx={{ flex: 1 }}>
                <Box
                  sx={{
                    height: 3,
                    borderRadius: 2,
                    background:
                      i <= currentStep
                        ? `linear-gradient(90deg, ${GOLD}, #A8872E)`
                        : "rgba(255,255,255,0.08)",
                    transition: "background 0.4s ease",
                    mb: 0.8,
                    boxShadow:
                      i <= currentStep ? `0 0 8px ${alpha(GOLD, 0.4)}` : "none",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    color: i <= currentStep ? GOLD : "rgba(255,255,255,0.25)",
                    fontWeight: i === currentStep ? 600 : 400,
                    letterSpacing: "0.04em",
                  }}
                >
                  {s}
                </Typography>
              </Box>
            ))}
          </Box>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: alpha("#4CAF82", 0.15),
                        border: `1px solid ${alpha("#4CAF82", 0.4)}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 3,
                      }}
                    >
                      <CheckRounded sx={{ fontSize: 30, color: "#4CAF82" }} />
                    </Box>
                  </motion.div>
                  <Typography
                    sx={{
                      fontFamily: '"DM Serif Display", serif',
                      fontSize: "1.6rem",
                      mb: 1,
                    }}
                  >
                    Account created!
                  </Typography>
                  <Typography
                    sx={{ color: "text.secondary", fontSize: "0.88rem" }}
                  >
                    Your request has been submitted. You&apos;ll be redirected
                    to sign in shortly.
                  </Typography>
                </Box>
              </motion.div>
            ) : (
              <>
                {/* STEP 1 */}
                {currentStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Box
                      component="form"
                      onSubmit={form1.handleSubmit(handleStep1)}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2.5,
                      }}
                    >
                      <TextField
                        {...form1.register("name")}
                        label="Full Name"
                        placeholder="Alexandra Chen"
                        fullWidth
                        error={!!form1.formState.errors.name}
                        helperText={form1.formState.errors.name?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonRounded
                                sx={{ fontSize: 18, color: "text.disabled" }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        {...form1.register("email")}
                        label="Email Address"
                        type="email"
                        placeholder="admin@merraki.com"
                        fullWidth
                        error={!!form1.formState.errors.email}
                        helperText={form1.formState.errors.email?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailRounded
                                sx={{ fontSize: 18, color: "text.disabled" }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        endIcon={<ArrowForwardRounded />}
                        sx={{ mt: 1, py: 1.5, borderRadius: 2 }}
                      >
                        Continue
                      </Button>
                    </Box>
                  </motion.div>
                )}

                {/* STEP 2 */}
                {currentStep === 1 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Box
                      component="form"
                      onSubmit={form2.handleSubmit(handleStep2)}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2.5,
                      }}
                    >
                      <Box>
                        <TextField
                          {...form2.register("password")}
                          label="Password"
                          type={showPass ? "text" : "password"}
                          fullWidth
                          error={!!form2.formState.errors.password}
                          helperText={form2.formState.errors.password?.message}
                          onChange={(e) => {
                            form2.setValue("password", e.target.value);
                            setWatchedPassword(e.target.value);
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockRounded
                                  sx={{ fontSize: 18, color: "text.disabled" }}
                                />
                              </InputAdornment>
                            ),
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
                        {watchedPassword && (
                          <PasswordStrength password={watchedPassword} />
                        )}
                      </Box>
                      <TextField
                        {...form2.register("confirmPassword")}
                        label="Confirm Password"
                        type={showConfirm ? "text" : "password"}
                        fullWidth
                        error={!!form2.formState.errors.confirmPassword}
                        helperText={
                          form2.formState.errors.confirmPassword?.message
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockRounded
                                sx={{ fontSize: 18, color: "text.disabled" }}
                              />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowConfirm(!showConfirm)}
                                edge="end"
                                size="small"
                              >
                                {showConfirm ? (
                                  <VisibilityOff sx={{ fontSize: 18 }} />
                                ) : (
                                  <Visibility sx={{ fontSize: 18 }} />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="large"
                          fullWidth
                          startIcon={<ArrowBackRounded />}
                          onClick={() => setCurrentStep(0)}
                          sx={{ borderRadius: 2, py: 1.5 }}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          fullWidth
                          endIcon={<ArrowForwardRounded />}
                          sx={{ borderRadius: 2, py: 1.5 }}
                        >
                          Continue
                        </Button>
                      </Box>
                    </Box>
                  </motion.div>
                )}

                {/* STEP 3 */}
                {currentStep === 2 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Box
                      component="form"
                      onSubmit={form3.handleSubmit(handleStep3)}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2.5,
                      }}
                    >
                      <FormControl fullWidth size="small">
                        <InputLabel>Requested Role</InputLabel>
                        <Controller
                          name="role"
                          control={form3.control}
                          render={({ field }) => (
                            <Select {...field} label="Requested Role">
                              <MenuItem value="admin">
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <BadgeRounded
                                    sx={{ fontSize: 16, color: "#4A8FD4" }}
                                  />
                                  <Box>
                                    <Typography sx={{ fontSize: "0.85rem" }}>
                                      Admin
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        color: "text.secondary",
                                      }}
                                    >
                                      Full management access
                                    </Typography>
                                  </Box>
                                </Box>
                              </MenuItem>
                              <MenuItem value="editor">
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <BadgeRounded
                                    sx={{ fontSize: 16, color: "#4CAF82" }}
                                  />
                                  <Box>
                                    <Typography sx={{ fontSize: "0.85rem" }}>
                                      Editor
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        color: "text.secondary",
                                      }}
                                    >
                                      Content & templates
                                    </Typography>
                                  </Box>
                                </Box>
                              </MenuItem>
                              <MenuItem value="viewer">
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <BadgeRounded
                                    sx={{ fontSize: 16, color: "#6B8CAE" }}
                                  />
                                  <Box>
                                    <Typography sx={{ fontSize: "0.85rem" }}>
                                      Viewer
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        color: "text.secondary",
                                      }}
                                    >
                                      Read-only access
                                    </Typography>
                                  </Box>
                                </Box>
                              </MenuItem>
                            </Select>
                          )}
                        />
                      </FormControl>

                      <TextField
                        {...form3.register("reason")}
                        label="Why do you need access?"
                        placeholder="Briefly describe your role and why you need admin access..."
                        multiline
                        rows={3}
                        fullWidth
                        error={!!form3.formState.errors.reason}
                        helperText={form3.formState.errors.reason?.message}
                      />

                      <TextField
                        {...form3.register("inviteCode")}
                        label="Invite Code (optional)"
                        placeholder="Enter if you have one"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography
                                sx={{
                                  fontSize: "0.82rem",
                                  color: "text.disabled",
                                }}
                              >
                                #
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="large"
                          fullWidth
                          startIcon={<ArrowBackRounded />}
                          onClick={() => setCurrentStep(1)}
                          sx={{ borderRadius: 2, py: 1.5 }}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          fullWidth
                          disabled={loading}
                          sx={{ borderRadius: 2, py: 1.5 }}
                        >
                          {loading ? (
                            <CircularProgress size={20} sx={{ color: NAVY }} />
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </Box>
                    </Box>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>

          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.83rem", color: "text.disabled" }}>
              Already have an account?{" "}
              <Box
                component={Link}
                href="/login"
                sx={{
                  color: GOLD,
                  textDecoration: "none",
                  fontWeight: 600,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Sign in
              </Box>
            </Typography>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
}
