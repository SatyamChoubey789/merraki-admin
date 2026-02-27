"use client";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { Box } from "@mui/material";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showTooltip?: boolean;
}

export default function Sparkline({
  data,
  color = "#C9A84C",
  height = 40,
  showTooltip = false,
}: SparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <Box sx={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={`spark-${color.replace("#", "")}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showTooltip && (
            <Tooltip
              contentStyle={{
                background: "#1A2535",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 11,
                padding: "4px 8px",
              }}
              itemStyle={{ color: color }}
              formatter={(value?: number, name?: string) => {
                return [value?.toLocaleString() ?? "", name ?? ""];
              }}
              labelFormatter={() => ""}
            />
          )}
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color.replace("#", "")})`}
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
