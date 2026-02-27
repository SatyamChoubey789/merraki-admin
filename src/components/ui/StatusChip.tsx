"use client";
import { Chip } from "@mui/material";
import { alpha } from "@mui/material";

const STATUS_COLORS: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  active: {
    bg: alpha("#4CAF82", 0.12),
    color: "#4CAF82",
    border: alpha("#4CAF82", 0.3),
  },
  inactive: {
    bg: alpha("#888", 0.12),
    color: "#999",
    border: alpha("#888", 0.3),
  },
  banned: {
    bg: alpha("#E05C5C", 0.12),
    color: "#E05C5C",
    border: alpha("#E05C5C", 0.3),
  },
  pending: {
    bg: alpha("#E8A838", 0.12),
    color: "#E8A838",
    border: alpha("#E8A838", 0.3),
  },
  approved: {
    bg: alpha("#4CAF82", 0.12),
    color: "#4CAF82",
    border: alpha("#4CAF82", 0.3),
  },
  rejected: {
    bg: alpha("#E05C5C", 0.12),
    color: "#E05C5C",
    border: alpha("#E05C5C", 0.3),
  },
  completed: {
    bg: alpha("#4A8FD4", 0.12),
    color: "#4A8FD4",
    border: alpha("#4A8FD4", 0.3),
  },
  paid: {
    bg: alpha("#4CAF82", 0.12),
    color: "#4CAF82",
    border: alpha("#4CAF82", 0.3),
  },
  unpaid: {
    bg: alpha("#E8A838", 0.12),
    color: "#E8A838",
    border: alpha("#E8A838", 0.3),
  },
  refunded: {
    bg: alpha("#6B8CAE", 0.12),
    color: "#6B8CAE",
    border: alpha("#6B8CAE", 0.3),
  },
  draft: { bg: alpha("#888", 0.12), color: "#aaa", border: alpha("#888", 0.3) },
  published: {
    bg: alpha("#4CAF82", 0.12),
    color: "#4CAF82",
    border: alpha("#4CAF82", 0.3),
  },
  archived: {
    bg: alpha("#6B8CAE", 0.12),
    color: "#6B8CAE",
    border: alpha("#6B8CAE", 0.3),
  },
  sent: {
    bg: alpha("#4CAF82", 0.12),
    color: "#4CAF82",
    border: alpha("#4CAF82", 0.3),
  },
  scheduled: {
    bg: alpha("#4A8FD4", 0.12),
    color: "#4A8FD4",
    border: alpha("#4A8FD4", 0.3),
  },
  new: {
    bg: alpha("#C9A84C", 0.12),
    color: "#C9A84C",
    border: alpha("#C9A84C", 0.3),
  },
  in_progress: {
    bg: alpha("#4A8FD4", 0.12),
    color: "#4A8FD4",
    border: alpha("#4A8FD4", 0.3),
  },
  resolved: {
    bg: alpha("#4CAF82", 0.12),
    color: "#4CAF82",
    border: alpha("#4CAF82", 0.3),
  },
  closed: {
    bg: alpha("#888", 0.12),
    color: "#888",
    border: alpha("#888", 0.3),
  },
};

interface Props {
  status: string;
  size?: "small" | "medium";
}

export default function StatusChip({ status, size = "small" }: Props) {
  const style = STATUS_COLORS[status] ?? {
    bg: alpha("#888", 0.12),
    color: "#aaa",
    border: alpha("#888", 0.3),
  };
  return (
    <Chip
      label={status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      size={size}
      sx={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontWeight: 600,
        fontSize: "0.68rem",
        letterSpacing: "0.04em",
        height: 22,
      }}
    />
  );
}
