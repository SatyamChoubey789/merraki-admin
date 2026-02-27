"use client";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TablePagination, CircularProgress, Typography, Checkbox, useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { alpha } from "@mui/material";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
  /** Hide column on mobile if true */
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  page?: number;
  rowsPerPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rpp: number) => void;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectAll?: (checked: boolean) => void;
  onSelectRow?: (id: string, checked: boolean) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns, rows, loading,
  page = 0, rowsPerPage = 10, total = 0,
  onPageChange, onRowsPerPageChange, onRowClick,
  selectable, selected = [], onSelectAll, onSelectRow, getRowId,
  emptyMessage = "No data found",
}: Props<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Filter out mobile-hidden columns on small screens
  const visibleColumns = isMobile
    ? columns.filter((c) => !c.hideOnMobile)
    : columns;

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      {/* Horizontal scroll wrapper — critical for mobile */}
      <TableContainer sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Table stickyHeader sx={{ minWidth: isMobile ? 320 : 600 }}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  <Checkbox
                    size="small"
                    checked={rows.length > 0 && selected.length === rows.length}
                    indeterminate={selected.length > 0 && selected.length < rows.length}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    sx={{ color: "rgba(255,255,255,0.3)", "&.Mui-checked": { color: "#C9A84C" } }}
                  />
                </TableCell>
              )}
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? "left"}
                  sx={{
                    width: col.width,
                    whiteSpace: "nowrap",
                    px: { xs: 1.5, sm: 2 },
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            <AnimatePresence mode="wait">
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                    sx={{ textAlign: "center", py: 8, border: "none" }}
                  >
                    <CircularProgress size={36} sx={{ color: "#C9A84C" }} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                    sx={{ textAlign: "center", py: 8, border: "none" }}
                  >
                    <Typography sx={{ color: "text.disabled", fontSize: "0.9rem" }}>
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => {
                  const id = getRowId?.(row) ?? String(i);
                  const isSelected = selected.includes(id);
                  return (
                    <motion.tr
                      key={id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      style={{
                        cursor: onRowClick ? "pointer" : "default",
                        background: isSelected ? alpha("#C9A84C", 0.06) : "transparent",
                      }}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={(e) => onSelectRow?.(id, e.target.checked)}
                            sx={{ color: "rgba(255,255,255,0.3)", "&.Mui-checked": { color: "#C9A84C" } }}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          align={col.align ?? "left"}
                          sx={{
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            px: { xs: 1.5, sm: 2 },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? "")}
                        </TableCell>
                      ))}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </TableContainer>

      {onPageChange && (
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => onPageChange(p)}
          onRowsPerPageChange={(e) => onRowsPerPageChange?.(parseInt(e.target.value, 10))}
          rowsPerPageOptions={isMobile ? [10, 25] : [10, 25, 50, 100]}
          // Hide rows-per-page selector on very small screens
          labelRowsPerPage={isMobile ? "" : "Rows:"}
          sx={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontSize: "0.8rem",
              color: "text.secondary",
            },
            "& .MuiTablePagination-select": {
              display: isMobile ? "none" : "block",
            },
            "& .MuiTablePagination-selectLabel": {
              display: isMobile ? "none" : "block",
            },
          }}
        />
      )}
    </Paper>
  );
}