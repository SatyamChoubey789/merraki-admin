"use client";
import { Box, Paper, Typography, Skeleton } from "@mui/material";
import useSWR from "swr";
import { motion } from "framer-motion";
import { alpha } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/ui/StatCard";
import {
  CalculateRounded,
  TrendingUpRounded,
  PeopleRounded,
  AccessTimeRounded,
} from "@mui/icons-material";
import Grid from "@mui/material/Grid";

const GOLD = "#C9A84C";
const PIE_COLORS = [GOLD, "#4CAF82", "#4A8FD4", "#E8A838", "#6B8CAE"];

export default function CalculatorsPage() {
  const { data, isLoading } = useSWR("admin/calculators/analytics");
  const analytics = data?.data ?? {};

  return (
    <PageWrapper
      title="Calculator Analytics"
      subtitle="Usage analytics for all calculators"
    >
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          {
            title: "Total Uses",
            value: analytics.totalUses?.toLocaleString() ?? "—",
            icon: <CalculateRounded />,
            color: GOLD,
            delay: 0,
          },
          {
            title: "Unique Users",
            value: analytics.uniqueUsers?.toLocaleString() ?? "—",
            icon: <PeopleRounded />,
            color: "#4CAF82",
            delay: 0.08,
          },
          {
            title: "Avg. Session",
            value: analytics.avgSessionTime ?? "—",
            icon: <AccessTimeRounded />,
            color: "#4A8FD4",
            delay: 0.16,
          },
          {
            title: "Growth",
            value: analytics.growth ? `${analytics.growth}%` : "—",
            icon: <TrendingUpRounded />,
            color: "#E8A838",
            delay: 0.24,
          },
        ].map((s) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={s.title}>
            {isLoading ? (
              <Skeleton
                variant="rounded"
                height={130}
                sx={{ borderRadius: 3 }}
              />
            ) : (
              <StatCard
                title={s.title}
                value={s.value}
                icon={s.icon}
                color={s.color}
                delay={s.delay}
              />
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 0.5, fontSize: "1rem" }}>
                Daily Usage
              </Typography>
              <Typography
                sx={{ color: "text.secondary", fontSize: "0.8rem", mb: 3 }}
              >
                Calculator uses over time
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={analytics.dailyUsage ?? []}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.04)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1A2535",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="uses"
                    stroke={GOLD}
                    strokeWidth={2}
                    fill="url(#cg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <Typography variant="h6" sx={{ mb: 3, fontSize: "1rem" }}>
                By Calculator Type
              </Typography>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={analytics.byType ?? []}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {(analytics.byType ?? []).map((_: unknown, i: number) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1A2535",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <Box
                sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}
              >
                {(analytics.byType ?? []).map(
                  (item: { type: string; count: number }, i: number) => (
                    <Box
                      key={item.type}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <Typography
                          sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                        >
                          {item.type}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                        {item.count}
                      </Typography>
                    </Box>
                  ),
                )}
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontSize: "1rem" }}>
                Usage by Calculator
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.byCalculator ?? []} layout="vertical">
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.04)"
                    strokeDasharray="4 4"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "rgba(240,237,232,0.4)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "rgba(240,237,232,0.5)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1A2535",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="uses" fill={GOLD} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </PageWrapper>
  );
}
