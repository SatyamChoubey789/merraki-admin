"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Dialog,
  InputBase,
  Divider,
  Chip,
} from "@mui/material";
import {
  DashboardRounded,
  PeopleRounded,
  ShoppingCartRounded,
  ArticleRounded,
  AssignmentRounded,
  ContactMailRounded,
  EmailRounded,
  LayersRounded,
  CalculateRounded,
  AddRounded,
  SearchRounded,
  AccessTimeRounded,
  TrendingUpRounded,
  SettingsRounded,
  LogoutRounded,
  KeyboardRounded,
  CategoryRounded,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { alpha } from "@mui/material";

const GOLD = "#C9A84C";

// ─── Command definitions ─────────────────────────────────────────────────────
interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string[];
  group: "navigate" | "create" | "action" | "recent";
  action: () => void;
  keywords?: string;
}

const RECENT_KEY = "merraki_recent_commands";
const MAX_RECENT = 5;

function saveRecent(id: string) {
  if (typeof window === "undefined") return;
  const existing: string[] = JSON.parse(
    localStorage.getItem(RECENT_KEY) ?? "[]",
  );
  const updated = [id, ...existing.filter((i) => i !== id)].slice(
    0,
    MAX_RECENT,
  );
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
}

// ─── Fuzzy match ─────────────────────────────────────────────────────────────
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  // Check if all chars appear in order
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const result: React.ReactNode[] = [];
  let lastIdx = 0;
  let qi = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (ti > lastIdx) result.push(text.slice(lastIdx, ti));
      result.push(
        <Box component="span" key={ti} sx={{ color: GOLD, fontWeight: 700 }}>
          {text[ti]}
        </Box>,
      );
      lastIdx = ti + 1;
      qi++;
    }
  }
  if (lastIdx < text.length) result.push(text.slice(lastIdx));
  return result;
}

// ─── Command Palette ─────────────────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent on open
  useEffect(() => {
    if (open) {
      setRecentIds(loadRecent());
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const navigate = useCallback(
    (id: string, href: string) => {
      saveRecent(id);
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  // All commands
  const allCommands = useMemo<Command[]>(
    () => [
      // Navigate
      {
        id: "nav-dashboard",
        label: "Dashboard",
        description: "Overview & analytics",
        icon: <DashboardRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        shortcut: ["G", "D"],
        action: () => navigate("nav-dashboard", "/dashboard"),
        keywords: "home stats",
      },
      {
        id: "nav-users",
        label: "Users",
        description: "Manage user accounts",
        icon: <PeopleRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        shortcut: ["G", "U"],
        action: () => navigate("nav-users", "/users"),
        keywords: "people accounts",
      },
      {
        id: "nav-orders",
        label: "Orders",
        description: "View & approve orders",
        icon: <ShoppingCartRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        shortcut: ["G", "O"],
        action: () => navigate("nav-orders", "/orders"),
        keywords: "purchases payments",
      },
      {
        id: "nav-blog",
        label: "Blog",
        description: "Manage blog posts",
        icon: <ArticleRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        shortcut: ["G", "B"],
        action: () => navigate("nav-blog", "/blog"),
        keywords: "posts articles",
      },
      {
        id: "nav-tests",
        label: "Tests",
        description: "Assessments & questions",
        icon: <AssignmentRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        action: () => navigate("nav-tests", "/tests"),
        keywords: "quiz assessment",
      },
      {
        id: "nav-contacts",
        label: "Contacts",
        description: "Support submissions",
        icon: <ContactMailRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        shortcut: ["G", "C"],
        action: () => navigate("nav-contacts", "/contacts"),
        keywords: "support messages",
      },
      {
        id: "nav-newsletter",
        label: "Newsletter",
        description: "Campaigns & subscribers",
        icon: <EmailRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        shortcut: ["G", "N"],
        action: () => navigate("nav-newsletter", "/newsletter"),
        keywords: "email campaigns",
      },
      {
        id: "nav-templates",
        label: "Templates",
        description: "Digital product templates",
        icon: <LayersRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        action: () => navigate("nav-templates", "/templates"),
        keywords: "files downloads",
      },
      {
        id: "nav-template-categories",
        label: "Template Categories",
        description: "Manage template categories",
        icon: <CategoryRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        action: () =>
          navigate("nav-template-categories", "/template-categories"),
        keywords: "categories templates",
      },
      {
        id: "nav-calculators",
        label: "Calculators",
        description: "Usage analytics",
        icon: <CalculateRounded sx={{ fontSize: 18 }} />,
        group: "navigate",
        action: () => navigate("nav-calculators", "/calculators"),
        keywords: "tools usage",
      },
      // Create
      {
        id: "create-blog",
        label: "New Blog Post",
        description: "Open blog editor",
        icon: <AddRounded sx={{ fontSize: 18 }} />,
        group: "create",
        shortcut: ["N", "B"],
        action: () => navigate("create-blog", "/blog?new=1"),
        keywords: "write article",
      },
      {
        id: "create-nl",
        label: "New Newsletter",
        description: "Create campaign",
        icon: <AddRounded sx={{ fontSize: 18 }} />,
        group: "create",
        shortcut: ["N", "N"],
        action: () => navigate("create-nl", "/newsletter?new=1"),
        keywords: "email send",
      },
      {
        id: "create-template",
        label: "New Template",
        description: "Upload template",
        icon: <AddRounded sx={{ fontSize: 18 }} />,
        group: "create",
        action: () => navigate("create-template", "/templates?new=1"),
        keywords: "upload file",
      },
      // Actions
      {
        id: "action-analytics",
        label: "View Analytics",
        description: "Revenue & growth",
        icon: <TrendingUpRounded sx={{ fontSize: 18 }} />,
        group: "action",
        action: () => navigate("action-analytics", "/dashboard"),
        keywords: "charts graphs",
      },
      {
        id: "action-shortcuts",
        label: "Keyboard Shortcuts",
        description: "View all shortcuts",
        icon: <KeyboardRounded sx={{ fontSize: 18 }} />,
        group: "action",
        shortcut: ["?"],
        action: () => {
          onClose();
        },
      },
      {
        id: "action-logout",
        label: "Logout",
        description: "Sign out of admin",
        icon: <LogoutRounded sx={{ fontSize: 18 }} />,
        group: "action",
        action: () => {
          onClose();
        },
        keywords: "sign out",
      },
    ],
    [navigate, onClose],
  );

  // Filtered + grouped results
  const { filtered, groups } = useMemo(() => {
    const q = query.trim();
    const matches = allCommands.filter((cmd) =>
      fuzzyMatch(
        cmd.label + " " + (cmd.description ?? "") + " " + (cmd.keywords ?? ""),
        q,
      ),
    );

    if (q) {
      return { filtered: matches, groups: null };
    }

    // No query: show recents first, then navigate group
    const recentCmds = recentIds
      .map((id) => allCommands.find((c) => c.id === id))
      .filter(Boolean) as Command[];
    const navCmds = allCommands.filter((c) => c.group === "navigate");
    const createCmds = allCommands.filter((c) => c.group === "create");

    return {
      filtered: [...recentCmds, ...navCmds, ...createCmds].slice(0, 12),
      groups: {
        recent: recentCmds.length,
        navigate: navCmds.length,
        create: createCmds.length,
      },
    };
  }, [query, allCommands, recentIds]);

  // Reset active index on results change
  useEffect(() => setActiveIdx(0), [filtered.length, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[activeIdx]?.action();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIdx, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // Group label helper
  const getGroupLabel = (idx: number): string | null => {
    if (query.trim() || !groups) return null;
    if (idx === 0 && groups.recent > 0) return "Recent";
    if (idx === groups.recent && groups.navigate > 0) return "Navigate";
    if (idx === groups.recent + groups.navigate && groups.create > 0)
      return "Create";
    return null;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: 580,
          borderRadius: 3,
          background: "rgba(17,24,39,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(40px)",
          boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${alpha(GOLD, 0.1)}`,
          overflow: "hidden",
          m: { xs: 2, sm: 4 },
          mt: { xs: "15vh", sm: "20vh" },
        },
      }}
      BackdropProps={{
        sx: {
          backdropFilter: "blur(6px)",
          background: "rgba(13,27,42,0.6)",
        },
      }}
      TransitionComponent={motion.div as never}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Search input */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2.5,
                py: 2,
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <SearchRounded
                sx={{ color: alpha(GOLD, 0.7), fontSize: 22, flexShrink: 0 }}
              />
              <InputBase
                inputRef={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands, pages, actions..."
                fullWidth
                sx={{
                  fontSize: "1rem",
                  color: "#F0EDE8",
                  "& input::placeholder": {
                    color: "rgba(240,237,232,0.3)",
                    fontSize: "0.95rem",
                  },
                }}
              />
              {query && (
                <Box
                  onClick={() => setQuery("")}
                  sx={{
                    cursor: "pointer",
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: "0.7rem",
                    color: "text.disabled",
                    border: "1px solid rgba(255,255,255,0.1)",
                    "&:hover": { color: "#F0EDE8" },
                    flexShrink: 0,
                  }}
                >
                  Clear
                </Box>
              )}
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  flexShrink: 0,
                  fontSize: "0.7rem",
                  color: "text.disabled",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                ESC
              </Box>
            </Box>

            {/* Results */}
            <Box
              ref={listRef}
              sx={{ maxHeight: 380, overflowY: "auto", py: 1 }}
            >
              {filtered.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography
                    sx={{ color: "text.disabled", fontSize: "0.9rem" }}
                  >
                    No results for &ldquo;{query}&rdquo;
                  </Typography>
                </Box>
              ) : (
                filtered.map((cmd, idx) => {
                  const groupLabel = getGroupLabel(idx);
                  const isActive = idx === activeIdx;

                  return (
                    <Box key={cmd.id}>
                      {groupLabel && (
                        <Typography
                          sx={{
                            px: 3,
                            pt: idx === 0 ? 1 : 2,
                            pb: 0.5,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "rgba(240,237,232,0.3)",
                          }}
                        >
                          {groupLabel}
                        </Typography>
                      )}
                      <Box
                        data-idx={idx}
                        onClick={() => {
                          cmd.action();
                          saveRecent(cmd.id);
                        }}
                        onMouseEnter={() => setActiveIdx(idx)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mx: 1.5,
                          px: 2,
                          py: 1.25,
                          borderRadius: 2,
                          cursor: "pointer",
                          background: isActive
                            ? alpha(GOLD, 0.1)
                            : "transparent",
                          border: `1px solid ${isActive ? alpha(GOLD, 0.2) : "transparent"}`,
                          transition: "all 0.1s ease",
                        }}
                      >
                        {/* Icon */}
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1.5,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isActive
                              ? alpha(GOLD, 0.15)
                              : "rgba(255,255,255,0.05)",
                            color: isActive ? GOLD : "rgba(240,237,232,0.5)",
                            transition: "all 0.1s ease",
                          }}
                        >
                          {cmd.icon}
                        </Box>

                        {/* Label + description */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              fontWeight: isActive ? 600 : 400,
                              color: isActive
                                ? "#F0EDE8"
                                : "rgba(240,237,232,0.8)",
                            }}
                          >
                            {highlightMatch(cmd.label, query)}
                          </Typography>
                          {cmd.description && (
                            <Typography
                              sx={{
                                fontSize: "0.72rem",
                                color: "rgba(240,237,232,0.35)",
                                mt: 0.1,
                              }}
                            >
                              {cmd.description}
                            </Typography>
                          )}
                        </Box>

                        {/* Shortcut badges */}
                        {cmd.shortcut && (
                          <Box
                            sx={{ display: "flex", gap: 0.4, flexShrink: 0 }}
                          >
                            {cmd.shortcut.map((key) => (
                              <Box
                                key={key}
                                sx={{
                                  px: 0.8,
                                  py: 0.2,
                                  borderRadius: 0.8,
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  background: "rgba(255,255,255,0.07)",
                                  color: "rgba(240,237,232,0.5)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  minWidth: 20,
                                  textAlign: "center",
                                }}
                              >
                                {key}
                              </Box>
                            ))}
                          </Box>
                        )}

                        {/* Recent icon */}
                        {!query && recentIds.includes(cmd.id) && (
                          <AccessTimeRounded
                            sx={{
                              fontSize: 14,
                              color: "rgba(240,237,232,0.25)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* Footer */}
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <Box
              sx={{
                px: 3,
                py: 1.25,
                display: "flex",
                gap: 2.5,
                alignItems: "center",
              }}
            >
              {[
                ["↑↓", "navigate"],
                ["↵", "select"],
                ["esc", "close"],
              ].map(([key, label]) => (
                <Box
                  key={key}
                  sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                >
                  <Box
                    sx={{
                      px: 0.8,
                      py: 0.2,
                      borderRadius: 0.8,
                      fontSize: "0.65rem",
                      fontFamily: "monospace",
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(240,237,232,0.4)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {key}
                  </Box>
                  <Typography
                    sx={{ fontSize: "0.7rem", color: "rgba(240,237,232,0.3)" }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ ml: "auto" }}>
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    color: "rgba(240,237,232,0.2)",
                    letterSpacing: "0.05em",
                  }}
                >
                  MERRAKI ADMIN
                </Typography>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
