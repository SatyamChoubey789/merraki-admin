"use client";
import { Box, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";
import { alpha } from "@mui/material";
import { ReactNode } from "react";

const GOLD = "#C9A84C";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  size?: "sm" | "md" | "lg";
}

export default function EmptyState({ icon, title, description, action, size = "md" }: Props) {
  const sizes = {
    sm: { py: 4, iconSize: 36, titleSize: "0.9rem", descSize: "0.78rem" },
    md: { py: 8, iconSize: 48, titleSize: "1rem", descSize: "0.85rem" },
    lg: { py: 12, iconSize: 60, titleSize: "1.2rem", descSize: "0.9rem" },
  };
  const s = sizes[size];

  return (
    <Box sx={{ py: s.py, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 2 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Box
          sx={{
            width: s.iconSize * 1.8, height: s.iconSize * 1.8,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(GOLD, 0.1)} 0%, transparent 70%)`,
            border: `1px dashed ${alpha(GOLD, 0.2)}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: alpha(GOLD, 0.4),
            "& svg": { fontSize: s.iconSize },
          }}
        >
          {icon}
        </Box>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <Typography sx={{ fontWeight: 600, fontSize: s.titleSize, color: "rgba(240,237,232,0.6)", mb: 0.5 }}>{title}</Typography>
        {description && (
          <Typography sx={{ fontSize: s.descSize, color: "rgba(240,237,232,0.3)", maxWidth: 300 }}>{description}</Typography>
        )}
      </motion.div>
      {action && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Button variant="outlined" size="small" onClick={action.onClick} sx={{ mt: 1, borderRadius: 2 }}>
            {action.label}
          </Button>
        </motion.div>
      )}
    </Box>
  );
}