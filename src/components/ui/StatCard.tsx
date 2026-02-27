"use client";
import { useEffect, useRef, useState } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import { alpha } from "@mui/material";
import { TrendingUp, TrendingDown, Remove } from "@mui/icons-material";
import { ReactNode } from "react";
import Sparkline from "./Sparkline";

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  trend?: number; // % change
  subtitle?: string;
  delay?: number;
  sparkline?: number[]; // last 7 data points
  prefix?: string; // e.g. "₹"
  suffix?: string; // e.g. "K"
  animate?: boolean; // animate counter
}

// Animated number counter
function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const duration = 1000;

  useEffect(() => {
    const start = performance.now();
    startRef.current = start;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </>
  );
}

export default function StatCard({
  title,
  value,
  icon,
  color = "#C9A84C",
  trend,
  subtitle,
  delay = 0,
  sparkline,
  prefix = "",
  suffix = "",
  animate = true,
}: Props) {
  const numericValue = typeof value === "number" ? value : null;

  const TrendIcon =
    trend === undefined || trend === 0
      ? Remove
      : trend > 0
        ? TrendingUp
        : TrendingDown;
  const trendColor =
    trend === undefined
      ? "text.disabled"
      : trend > 0
        ? "#4CAF82"
        : trend < 0
          ? "#E05C5C"
          : "text.disabled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      style={{ height: "100%" }}
    >
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 3,
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(26,37,53,0.9) 0%, rgba(17,24,39,0.9) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "box-shadow 0.3s ease",
          "&:hover": { boxShadow: `0 8px 32px ${alpha(color, 0.2)}` },
        }}
      >
        {/* Background glow */}
        <Box
          sx={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(color, 0.12)} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Top row: icon + trend */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1.5,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${alpha(color, 0.2)}, ${alpha(color, 0.08)})`,
              border: `1px solid ${alpha(color, 0.25)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: color,
              "& svg": { fontSize: 20 },
            }}
          >
            {icon}
          </Box>

          {trend !== undefined && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.4,
                px: 1.2,
                py: 0.4,
                borderRadius: 8,
                background: alpha(
                  trend > 0 ? "#4CAF82" : trend < 0 ? "#E05C5C" : "#888",
                  0.1,
                ),
                border: `1px solid ${alpha(trend > 0 ? "#4CAF82" : trend < 0 ? "#E05C5C" : "#888", 0.2)}`,
              }}
            >
              <TrendIcon sx={{ fontSize: 12, color: trendColor }} />
              <Typography
                sx={{ fontSize: "0.7rem", fontWeight: 700, color: trendColor }}
              >
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Value */}
        <Typography
          variant="h3"
          sx={{
            fontSize: "1.9rem",
            fontFamily: '"DM Serif Display", serif',
            color: "#F0EDE8",
            lineHeight: 1,
            mb: 0.4,
          }}
        >
          {animate && numericValue !== null ? (
            <AnimatedNumber
              value={numericValue}
              prefix={prefix}
              suffix={suffix}
            />
          ) : (
            value
          )}
        </Typography>

        {/* Title */}
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "rgba(240,237,232,0.4)",
          }}
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.3 }}
          >
            {subtitle}
          </Typography>
        )}

        {/* Sparkline at bottom */}
        {sparkline && sparkline.length > 1 && (
          <Box sx={{ mt: "auto", pt: 1.5, mx: -0.5 }}>
            <Sparkline data={sparkline} color={color} height={36} showTooltip />
          </Box>
        )}
      </Paper>
    </motion.div>
  );
}
