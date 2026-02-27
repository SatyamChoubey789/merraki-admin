"use client";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function PageWrapper({ title, subtitle, actions, children }: Props) {
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        maxWidth: 1600,
        width: "100%",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Page header */}
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            mb: { xs: 3, md: 4 },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: 0.5, fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.8rem" } }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ color: "text.secondary", fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                {subtitle}
              </Typography>
            )}
          </Box>

          {actions && (
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                flexWrap: "wrap",
                // On mobile, actions take full width and wrap
                width: { xs: "100%", sm: "auto" },
                "& .MuiButton-root": {
                  // Make buttons slightly smaller on mobile
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                },
              }}
            >
              {actions}
            </Box>
          )}
        </Box>

        {children}
      </motion.div>
    </Box>
  );
}