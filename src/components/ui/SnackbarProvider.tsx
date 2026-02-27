"use client";
import { SnackbarProvider as NotiSnackbar, MaterialDesignContent } from "notistack";
import { styled } from "@mui/material/styles";
import { alpha } from "@mui/material";

const StyledContent = styled(MaterialDesignContent)(({ theme }) => ({
  "&.notistack-MuiContent-success": {
    background: alpha(theme.palette.success.dark, 0.95),
    backdropFilter: "blur(20px)",
    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
    borderRadius: 12,
    fontFamily: theme.typography.fontFamily,
  },
  "&.notistack-MuiContent-error": {
    background: alpha(theme.palette.error.dark, 0.95),
    backdropFilter: "blur(20px)",
    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
    borderRadius: 12,
    fontFamily: theme.typography.fontFamily,
  },
  "&.notistack-MuiContent-warning": {
    background: alpha(theme.palette.warning.dark, 0.95),
    backdropFilter: "blur(20px)",
    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
    borderRadius: 12,
    fontFamily: theme.typography.fontFamily,
  },
  "&.notistack-MuiContent-info": {
    background: alpha("#1A2535", 0.97),
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontFamily: theme.typography.fontFamily,
  },
}));

export default function SnackbarProvider({ children }: { children: React.ReactNode }) {
  return (
    <NotiSnackbar
      maxSnack={4}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      Components={{ success: StyledContent, error: StyledContent, warning: StyledContent, info: StyledContent }}
    >
      {children}
    </NotiSnackbar>
  );
}