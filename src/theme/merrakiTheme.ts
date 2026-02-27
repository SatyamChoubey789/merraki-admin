import { createTheme, alpha } from "@mui/material/styles";

/**
 * -----------------------------------
 * Palette Augmentation (gold color)
 * -----------------------------------
 */
declare module "@mui/material/styles" {
  interface Palette {
    gold: Palette["primary"];
  }
  interface PaletteOptions {
    gold?: PaletteOptions["primary"];
  }
}

/**
 * -----------------------------------
 * Core Brand Colors
 * -----------------------------------
 */
const NAVY = "#0D1B2A";
const GOLD = "#C9A84C";
const CHARCOAL = "#1A2535";
const SURFACE = "#111827";
const BORDER = "rgba(255,255,255,0.08)";

/**
 * -----------------------------------
 * Merraki Luxury Theme
 * -----------------------------------
 */
export const merrakiTheme = createTheme({
  palette: {
    mode: "dark",

    primary: {
      main: GOLD,
      light: "#D4B96A",
      dark: "#A8872E",
      contrastText: NAVY,
    },

    secondary: {
      main: "#6B8CAE",
      light: "#8FAEC8",
      dark: "#4A6B8A",
    },

    gold: {
      main: GOLD,
      light: "#D4B96A",
      dark: "#A8872E",
      contrastText: NAVY,
    },

    background: {
      default: NAVY,
      paper: CHARCOAL,
    },

    success: {
      main: "#4CAF82",
      light: "#6EC99E",
      dark: "#357A5E",
    },

    warning: {
      main: "#E8A838",
      light: "#F0C070",
      dark: "#B8832A",
    },

    error: {
      main: "#E05C5C",
      light: "#E88080",
      dark: "#B84040",
    },

    info: {
      main: "#4A8FD4",
      light: "#70AADC",
      dark: "#3370A8",
    },

    divider: BORDER,

    text: {
      primary: "#F0EDE8",
      secondary: "rgba(240,237,232,0.55)",
      disabled: "rgba(240,237,232,0.3)",
    },
  },

  /**
   * -----------------------------------
   * Typography
   * -----------------------------------
   */
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',

    h1: {
      fontFamily: '"DM Serif Display", Georgia, serif',
      fontWeight: 400,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: '"DM Serif Display", Georgia, serif',
      fontWeight: 400,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontFamily: '"DM Serif Display", Georgia, serif',
      fontWeight: 400,
      letterSpacing: "-0.01em",
    },
    h4: {
      fontFamily: '"DM Serif Display", Georgia, serif',
      fontWeight: 400,
    },
    h5: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
    h6: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 600,
    },

    subtitle1: {
      fontWeight: 500,
      letterSpacing: "0.02em",
    },

    subtitle2: {
      fontWeight: 500,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      fontSize: "0.7rem",
    },

    body1: {
      lineHeight: 1.7,
    },

    button: {
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "none",
    },

    caption: {
      letterSpacing: "0.06em",
      opacity: 0.6,
    },
  },

  shape: {
    borderRadius: 12,
  },

  /**
   * -----------------------------------
   * Component Overrides
   * -----------------------------------
   */
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: NAVY,
        },
        "*": {
          boxSizing: "border-box",
        },
        "::selection": {
          backgroundColor: alpha(GOLD, 0.3),
        },
        "::-webkit-scrollbar": {
          width: 6,
          height: 6,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: alpha(GOLD, 0.4),
          borderRadius: 4,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: alpha(GOLD, 0.7),
        },
      },
    },

    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${BORDER}`,
          backdropFilter: "blur(20px)",
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          letterSpacing: "0.03em",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
          "&:hover": {
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },

        contained: {
          background: `linear-gradient(135deg, ${GOLD} 0%, #A8872E 100%)`,
          color: NAVY,
          "&:hover": {
            background: `linear-gradient(135deg, #D4B96A 0%, ${GOLD} 100%)`,
            boxShadow: `0 8px 24px ${alpha(GOLD, 0.4)}`,
          },
        },

        outlined: {
          borderColor: alpha(GOLD, 0.4),
          color: GOLD,
          "&:hover": {
            borderColor: GOLD,
            background: alpha(GOLD, 0.08),
          },
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            background: alpha(NAVY, 0.5),
            "& fieldset": {
              borderColor: BORDER,
            },
            "&:hover fieldset": {
              borderColor: alpha(GOLD, 0.4),
            },
            "&.Mui-focused fieldset": {
              borderColor: GOLD,
            },
          },
          "& label.Mui-focused": {
            color: GOLD,
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: "0.72rem",
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(240,237,232,0.5)",
          borderBottom: `1px solid ${BORDER}`,
          background: alpha(NAVY, 0.8),
        },
        body: {
          borderBottom: `1px solid ${BORDER}`,
          fontSize: "0.875rem",
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background 0.15s ease",
          "&:hover": {
            background: alpha(GOLD, 0.04),
          },
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: "none",
          borderRight: `1px solid ${BORDER}`,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: "0.75rem",
          background: alpha(CHARCOAL, 0.95),
          backdropFilter: "blur(10px)",
          border: `1px solid ${BORDER}`,
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          background: alpha(GOLD, 0.1),
        },
        bar: {
          background: `linear-gradient(90deg, ${GOLD}, #D4B96A)`,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          letterSpacing: "0.02em",
          "&.Mui-selected": {
            color: GOLD,
            fontWeight: 600,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          background: GOLD,
          height: 2,
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "all 0.2s ease",
          "&:hover": {
            background: alpha(GOLD, 0.1),
            transform: "scale(1.05)",
          },
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "2px 6px",
          "&:hover": {
            background: alpha(GOLD, 0.08),
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});
