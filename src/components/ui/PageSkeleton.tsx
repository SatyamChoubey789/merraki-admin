"use client";
import { Box, Skeleton, Grid } from "@mui/material";

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / cols}%`} height={20} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: "flex", gap: 2, mb: 1.5, alignItems: "center" }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} variant="rounded" width={`${100 / cols}%`} height={36} sx={{ borderRadius: 1.5 }} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function StatCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
        </Grid>
      ))}
    </Grid>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {Array.from({ length: fields }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
      ))}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <Skeleton variant="rounded" width={120} height={40} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" width={120} height={40} sx={{ borderRadius: 2 }} />
      </Box>
    </Box>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton variant="rounded" height={height} sx={{ borderRadius: 3 }} />;
}