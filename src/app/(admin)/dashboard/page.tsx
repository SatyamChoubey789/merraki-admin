"use client";
import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Skeleton,
  Avatar,
  Tabs,
  Tab,
  Tooltip,
} from "@mui/material";
import { Grid } from "@mui/material";
import {
  PeopleRounded,
  ShoppingCartRounded,
  AttachMoneyRounded,
  HourglassEmptyRounded,
  ArticleRounded,
  LayersRounded,
  FiberManualRecordRounded,
} from "@mui/icons-material";
import useSWR from "swr";
import { motion } from "framer-motion";
import { alpha } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Bar,
  ComposedChart,
  Line,
} from "recharts";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/ui/StatCard";
import { DashboardStats, ActivityLog } from "@/types";

dayjs.extend(relativeTime);

const GOLD = "#C9A84C";
const PIE_COLORS = [GOLD, "#4CAF82", "#E05C5C", "#4A8FD4", "#E8A838"];

// ─── Revenue heatmap cell ─────────────────────────────────────────────────────
function HeatCell({
  value,
  max,
  date,
}: {
  value: number;
  max: number;
  date: string;
}) {
  const intensity = max > 0 ? value / max : 0;
  const bg =
    intensity === 0
      ? alpha("#fff", 0.04)
      : intensity < 0.25
        ? alpha(GOLD, 0.15)
        : intensity < 0.5
          ? alpha(GOLD, 0.3)
          : intensity < 0.75
            ? alpha(GOLD, 0.55)
            : alpha(GOLD, 0.85);

  return (
    <Tooltip
      title={`${dayjs(date).format("MMM D")}: ₹${value.toLocaleString()}`}
      placement="top"
    >
      <Box
        sx={{
          width: { xs: 10, sm: 14 },
          height: { xs: 10, sm: 14 },
          borderRadius: 0.5,
          background: bg,
          border: `1px solid ${alpha("#fff", 0.04)}`,
          transition: "transform 0.15s",
          cursor: "default",
          "&:hover": { transform: "scale(1.3)", zIndex: 1 },
        }}
      />
    </Tooltip>
  );
}

// ─── Conversion funnel bar ────────────────────────────────────────────────────
function FunnelBar({
  label,
  value,
  max,
  color,
  pct,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  pct?: number;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.7)" }}>
          {label}
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
            {value.toLocaleString()}
          </Typography>
          {pct !== undefined && (
            <Typography
              sx={{
                fontSize: "0.7rem",
                color: pct > 20 ? "#4CAF82" : "text.disabled",
              }}
            >
              {pct}%
            </Typography>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          height: 6,
          borderRadius: 3,
          background: alpha("#fff", 0.06),
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.7)})`,
            borderRadius: 3,
          }}
        />
      </Box>
    </Box>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [chartTab, setChartTab] = useState(0);

  // Poll dashboard data every 60s
  const { data: statsRes, isLoading: statsLoading } = useSWR(
    "/admin/dashboard/stats",
    { refreshInterval: 60_000 },
  );
  const { data: activityRes, isLoading: activityLoading } = useSWR(
    "/admin/dashboard/activity",
    { refreshInterval: 30_000 },
  );

  const stats = statsRes?.data as DashboardStats | undefined;
  const activity = activityRes?.data?.activities as ActivityLog[] | undefined;

  // Generate heatmap data (last 12 weeks = 84 days)
  const heatData: { date: string; value: number }[] =
    stats?.dailyRevenue ??
    Array.from({ length: 84 }, (_, i) => ({
      date: dayjs()
        .subtract(83 - i, "day")
        .format("YYYY-MM-DD"),
      value: 0,
    }));
  const heatMax = Math.max(...heatData.map((d) => d.value), 1);

  // Funnel data
  const funnel = stats?.conversionFunnel ?? {
    visitors: 0,
    signups: 0,
    testCompleted: 0,
    purchased: 0,
  };

  // Sparklines per stat (last 7 days)
  const sparklines = stats?.sparklines ?? {};

  return (
    <PageWrapper title="Dashboard" subtitle="Platform overview live data">
      {/* ── KPI Cards ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          {
            title: "Total Users",
            value: stats?.totalUsers ?? 0,
            icon: <PeopleRounded />,
            color: GOLD,
            trend: stats?.userGrowth,
            delay: 0,
            sparkline: sparklines.users,
            subtitle: `${stats?.activeUsers ?? 0} active today`,
          },
          {
            title: "Total Orders",
            value: stats?.totalOrders ?? 0,
            icon: <ShoppingCartRounded />,
            color: "#4A8FD4",
            trend: 8,
            delay: 0.07,
            sparkline: sparklines.orders,
            subtitle: `${stats?.pendingOrders ?? 0} pending approval`,
          },
          {
            title: "Revenue",
            value: stats?.totalRevenue ?? 0,
            icon: <AttachMoneyRounded />,
            color: "#4CAF82",
            trend: stats?.revenueGrowth,
            delay: 0.14,
            sparkline: sparklines.revenue,
            prefix: "₹",
            animate: true,
          },
          {
            title: "Pending Orders",
            value: stats?.pendingOrders ?? 0,
            icon: <HourglassEmptyRounded />,
            color: "#E8A838",
            trend: -3,
            delay: 0.21,
            sparkline: sparklines.pending,
          },
          {
            title: "Blog Posts",
            value: stats?.totalBlogPosts ?? 0,
            icon: <ArticleRounded />,
            color: "#6B8CAE",
            delay: 0.28,
            sparkline: sparklines.posts,
          },
          {
            title: "Templates",
            value: stats?.totalTemplates ?? 0,
            icon: <LayersRounded />,
            color: "#C97E4C",
            delay: 0.35,
            sparkline: sparklines.templates,
          },
        ].map((s) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={s.title}>
            {statsLoading ? (
              <Skeleton
                variant="rounded"
                height={160}
                sx={{ borderRadius: 3 }}
              />
            ) : (
              <StatCard {...s} />
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* ── Revenue chart ── */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                      Revenue Analytics
                    </Typography>
                    <Typography
                      sx={{ color: "text.secondary", fontSize: "0.8rem" }}
                    >
                      Monthly performance with order volume overlay
                    </Typography>
                  </Box>
                  <Tabs
                    value={chartTab}
                    onChange={(_, v) => setChartTab(v)}
                    sx={{
                      minHeight: 32,
                      "& .MuiTab-root": {
                        minHeight: 32,
                        py: 0.5,
                        px: 1.5,
                        fontSize: "0.75rem",
                      },
                    }}
                  >
                    <Tab label="Revenue" />
                    <Tab label="Orders" />
                    <Tab label="Both" />
                  </Tabs>
                </Box>
              </Box>

              <Box sx={{ px: 1, pb: 2 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={stats?.monthlyRevenue ?? []}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#4A8FD4"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#4A8FD4"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.04)"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="rev"
                      tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v / 1000}K`}
                    />
                    {(chartTab === 1 || chartTab === 2) && (
                      <YAxis
                        yAxisId="ord"
                        orientation="right"
                        tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                    )}
                    <RTooltip
                      contentStyle={{
                        background: "#1A2535",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                      formatter={(value?: number, name?: string) => {
                        return [value?.toLocaleString() ?? "", name ?? ""];
                      }}
                    />
                    {(chartTab === 0 || chartTab === 2) && (
                      <Area
                        yAxisId="rev"
                        type="monotone"
                        dataKey="revenue"
                        stroke={GOLD}
                        strokeWidth={2}
                        fill="url(#revGrad)"
                        dot={{ fill: GOLD, r: 3 }}
                        activeDot={{ r: 5, fill: GOLD }}
                      />
                    )}
                    {(chartTab === 1 || chartTab === 2) && (
                      <Bar
                        yAxisId="ord"
                        dataKey="orders"
                        fill={alpha("#4A8FD4", 0.5)}
                        radius={[2, 2, 0, 0]}
                      />
                    )}
                    {chartTab === 2 && (
                      <Line
                        yAxisId="ord"
                        type="monotone"
                        dataKey="orders"
                        stroke="#4A8FD4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* ── Orders by status ── */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            style={{ height: "100%" }}
          >
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" sx={{ mb: 0.5, fontSize: "1rem" }}>
                Orders by Status
              </Typography>
              <Typography
                sx={{ color: "text.secondary", fontSize: "0.8rem", mb: 2 }}
              >
                Current distribution
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                <PieChart width={160} height={160}>
                  <Pie
                    data={stats?.ordersByStatus ?? []}
                    dataKey="count"
                    nameKey="status"
                    cx={80}
                    cy={80}
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    label={({ index }) => {
                      return PIE_COLORS[(index ?? 0) % PIE_COLORS.length];
                    }}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "#1A2535",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.75,
                  mt: "auto",
                }}
              >
                {(stats?.ordersByStatus ?? []).map((s, i) => (
                  <Box
                    key={s.status}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <FiberManualRecordRounded
                        sx={{
                          fontSize: 10,
                          color: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          color: "text.secondary",
                          textTransform: "capitalize",
                        }}
                      >
                        {s.status}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                        {s.count}
                      </Typography>
                      {stats?.totalOrders && (
                        <Typography
                          sx={{ fontSize: "0.7rem", color: "text.disabled" }}
                        >
                          {Math.round((s.count / stats.totalOrders) * 100)}%
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* ── Revenue heatmap ── */}
        <Grid size={{ xs: 12, md: 7 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
          >
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 0.5, fontSize: "1rem" }}>
                Revenue Heatmap
              </Typography>
              <Typography
                sx={{ color: "text.secondary", fontSize: "0.8rem", mb: 2.5 }}
              >
                Daily revenue — last 12 weeks
              </Typography>

              {/* Day labels */}
              <Box
                sx={{
                  display: "flex",
                  gap: 0.4,
                  mb: 0.5,
                  pl: { xs: 0, sm: "28px" },
                }}
              >
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <Typography
                    key={i}
                    sx={{
                      width: { xs: 10, sm: 14 },
                      fontSize: "0.6rem",
                      color: "rgba(240,237,232,0.25)",
                      textAlign: "center",
                    }}
                  >
                    {d}
                  </Typography>
                ))}
              </Box>

              <Box sx={{ display: "flex", gap: 0.4, overflowX: "auto" }}>
                {/* Week columns */}
                {Array.from({ length: 12 }, (_, week) => (
                  <Box
                    key={week}
                    sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}
                  >
                    {Array.from({ length: 7 }, (_, day) => {
                      const idx = week * 7 + day;
                      const item = heatData[idx];
                      if (!item)
                        return (
                          <Box
                            key={day}
                            sx={{
                              width: { xs: 10, sm: 14 },
                              height: { xs: 10, sm: 14 },
                            }}
                          />
                        );
                      return (
                        <HeatCell
                          key={day}
                          value={item.value}
                          max={heatMax}
                          date={item.date}
                        />
                      );
                    })}
                  </Box>
                ))}
              </Box>

              {/* Legend */}
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 2 }}
              >
                <Typography
                  sx={{ fontSize: "0.65rem", color: "text.disabled", mr: 0.5 }}
                >
                  Less
                </Typography>
                {[0, 0.15, 0.3, 0.55, 0.85].map((op) => (
                  <Box
                    key={op}
                    sx={{
                      width: { xs: 10, sm: 14 },
                      height: { xs: 10, sm: 14 },
                      borderRadius: 0.5,
                      background:
                        op === 0 ? alpha("#fff", 0.04) : alpha(GOLD, op),
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  />
                ))}
                <Typography
                  sx={{ fontSize: "0.65rem", color: "text.disabled", ml: 0.5 }}
                >
                  More
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* ── Conversion funnel ── */}
        <Grid size={{ xs: 12, md: 5 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <Typography variant="h6" sx={{ mb: 0.5, fontSize: "1rem" }}>
                Conversion Funnel
              </Typography>
              <Typography
                sx={{ color: "text.secondary", fontSize: "0.8rem", mb: 3 }}
              >
                Visitor → Purchase pipeline
              </Typography>

              {[
                {
                  label: "Visitors",
                  value: funnel.visitors,
                  color: "#6B8CAE",
                  pct: undefined,
                },
                {
                  label: "Signups",
                  value: funnel.signups,
                  color: GOLD,
                  pct: funnel.visitors
                    ? Math.round((funnel.signups / funnel.visitors) * 100)
                    : 0,
                },
                {
                  label: "Test Completed",
                  value: funnel.testCompleted,
                  color: "#4A8FD4",
                  pct: funnel.signups
                    ? Math.round((funnel.testCompleted / funnel.signups) * 100)
                    : 0,
                },
                {
                  label: "Purchased",
                  value: funnel.purchased,
                  color: "#4CAF82",
                  pct: funnel.testCompleted
                    ? Math.round(
                        (funnel.purchased / funnel.testCompleted) * 100,
                      )
                    : 0,
                },
              ].map((step) => (
                <FunnelBar
                  key={step.label}
                  label={step.label}
                  value={step.value}
                  max={funnel.visitors || 1}
                  color={step.color}
                  pct={step.pct}
                />
              ))}

              {/* Overall conversion rate */}
              <Box
                sx={{
                  mt: 2.5,
                  p: 1.5,
                  borderRadius: 2,
                  background: alpha(GOLD, 0.06),
                  border: `1px solid ${alpha(GOLD, 0.15)}`,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                >
                  Overall conversion rate
                </Typography>
                <Typography
                  sx={{ fontSize: "0.8rem", fontWeight: 700, color: GOLD }}
                >
                  {funnel.visitors
                    ? `${((funnel.purchased / funnel.visitors) * 100).toFixed(1)}%`
                    : "—"}
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* ── Live activity feed ── */}
        <Grid size={{ xs: 12 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2.5,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ mb: 0.25, fontSize: "1rem" }}>
                    Live Activity Feed
                  </Typography>
                  <Typography
                    sx={{ color: "text.secondary", fontSize: "0.8rem" }}
                  >
                    Latest admin actions — auto-refreshes every 30s
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    component={motion.div}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#4CAF82",
                      boxShadow: "0 0 8px #4CAF82",
                    }}
                  />
                  <Typography sx={{ fontSize: "0.72rem", color: "#4CAF82" }}>
                    LIVE
                  </Typography>
                </Box>
              </Box>

              <Box>
                {activityLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <Box key={i} sx={{ display: "flex", gap: 2, py: 1.5 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="60%" height={16} />
                          <Skeleton
                            variant="text"
                            width="40%"
                            height={13}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </Box>
                    ))
                  : activity?.map((log, i) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            py: 1.5,
                            px: 2,
                            borderRadius: 2,
                            transition: "background 0.2s",
                            "&:hover": { background: alpha("#fff", 0.03) },
                            borderBottom:
                              activity && i < activity.length - 1
                                ? "1px solid rgba(255,255,255,0.04)"
                                : "none",
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 30,
                              height: 30,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: `linear-gradient(135deg, ${alpha(GOLD, 0.25)}, ${alpha(GOLD, 0.1)})`,
                              color: GOLD,
                              flexShrink: 0,
                            }}
                          >
                            {log.adminName?.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{ fontSize: "0.84rem", lineHeight: 1.4 }}
                            >
                              <Box
                                component="span"
                                sx={{ fontWeight: 600, color: "#F0EDE8" }}
                              >
                                {log.adminName}
                              </Box>{" "}
                              <Box
                                component="span"
                                sx={{ color: "text.secondary" }}
                              >
                                {log.action}
                              </Box>{" "}
                              <Box
                                component="span"
                                sx={{ fontWeight: 500, color: GOLD }}
                              >
                                {log.resource}
                              </Box>
                            </Typography>
                            {log.ip && (
                              <Typography
                                sx={{
                                  fontSize: "0.68rem",
                                  color: "text.disabled",
                                  mt: 0.2,
                                }}
                              >
                                IP: {log.ip}
                              </Typography>
                            )}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              color: "text.disabled",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {dayjs(log.timestamp).fromNow()}
                          </Typography>
                        </Box>
                      </motion.div>
                    ))}
              </Box>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </PageWrapper>
  );
}
