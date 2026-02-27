"use client";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { WarningAmberRounded } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { alpha } from "@mui/material";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: "error" | "warning" | "success" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = "error",
  loading,
  onConfirm,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={onClose}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            component: motion.div,
            initial: { opacity: 0, scale: 0.9, y: 20 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.9, y: 20 },
            transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: alpha("#E05C5C", 0.15),
                  border: `1px solid ${alpha("#E05C5C", 0.3)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WarningAmberRounded sx={{ color: "#E05C5C", fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                {title}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: "0.9rem",
                lineHeight: 1.7,
              }}
            >
              {message}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button
              onClick={onClose}
              variant="outlined"
              size="small"
              sx={{ borderRadius: "10px" }}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              variant="contained"
              size="small"
              color={confirmColor}
              disabled={loading}
              sx={{
                borderRadius: "10px",
                background:
                  confirmColor === "error"
                    ? "linear-gradient(135deg, #E05C5C, #B84040)"
                    : undefined,
              }}
            >
              {loading ? "Processing..." : confirmLabel}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
