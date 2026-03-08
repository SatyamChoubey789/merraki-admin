"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import { Box, IconButton, Divider, Tooltip, Chip } from "@mui/material";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Undo,
  Redo,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  TableChart,
  Highlight as HighlightIcon,
  VisibilityRounded,
  EditRounded,
  ViewColumnRounded,
} from "@mui/icons-material";
import { alpha } from "@mui/material";
import { useEffect, useState } from "react";

const GOLD = "#C9A84C";

interface Props {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

// ── Preview renderer ──────────────────────────────────────────────────────────
function PreviewPane({ html, minHeight }: { html: string; minHeight: number }) {
  return (
    <Box
      sx={{
        p: 2.5,
        minHeight,
        overflowY: "auto",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        background: alpha("#0A1520", 0.6),
        "& h1,& h2,& h3": {
          fontFamily: '"DM Serif Display", serif',
          color: "#F0EDE8",
          mt: 2,
          mb: 1,
        },
        "& h1": { fontSize: "1.8rem" },
        "& h2": { fontSize: "1.4rem" },
        "& h3": { fontSize: "1.15rem" },
        "& p": {
          lineHeight: 1.8,
          fontSize: "0.92rem",
          color: "#F0EDE8",
          mb: 1,
        },
        "& a": { color: GOLD, textDecoration: "underline" },
        "& blockquote": {
          borderLeft: `3px solid ${GOLD}`,
          pl: 2,
          ml: 0,
          color: "rgba(240,237,232,0.65)",
          fontStyle: "italic",
          my: 1,
        },
        "& code": {
          background: alpha(GOLD, 0.1),
          px: 0.8,
          py: 0.3,
          borderRadius: 1,
          fontSize: "0.85em",
          fontFamily: "monospace",
        },
        "& pre": {
          background: "#0D1B2A",
          p: 2,
          borderRadius: 2,
          "& code": { background: "none", p: 0 },
        },
        "& ul,& ol": { pl: 3, mb: 1 },
        "& li": { lineHeight: 1.8, fontSize: "0.92rem", color: "#F0EDE8" },
        "& table": {
          width: "100%",
          borderCollapse: "collapse",
          "& td,& th": { border: "1px solid rgba(255,255,255,0.1)", p: 1 },
          "& th": { background: alpha(GOLD, 0.08) },
        },
        "& mark": {
          background: alpha(GOLD, 0.3),
          color: "#F0EDE8",
          borderRadius: 2,
          px: 0.5,
        },
        "& img": { maxWidth: "100%", borderRadius: 8, my: 1 },
        "& strong": { color: "#F0EDE8", fontWeight: 700 },
        "& em": { color: "rgba(240,237,232,0.85)" },
        "& hr": {
          border: "none",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          my: 2,
        },
      }}
      dangerouslySetInnerHTML={{
        __html:
          html ||
          '<p style="color:rgba(255,255,255,0.2);font-size:0.88rem">Preview will appear here…</p>',
      }}
    />
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────
export default function RichEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  minHeight = 300,
}: Props) {
  // mode: "write" | "preview" | "split"
  const [mode, setMode] = useState<"write" | "preview" | "split">("write");
  const [html, setHtml] = useState(value ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: { style: "max-width: 100%; border-radius: 8px;" },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value ?? "",
    onUpdate: ({ editor }) => {
      const h = editor.getHTML();
      setHtml(h);
      onChange?.(h);
    },
  });

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value);
      setHtml(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const toolBtn = (
    active: boolean,
    action: () => void,
    label: string,
    icon: React.ReactNode,
  ) => (
    <Tooltip title={label} key={label}>
      <IconButton
        onClick={action}
        size="small"
        sx={{
          borderRadius: 1.5,
          p: 0.7,
          width: 32,
          height: 32,
          color: active ? GOLD : "rgba(240,237,232,0.5)",
          background: active ? alpha(GOLD, 0.12) : "transparent",
          "&:hover": { background: alpha(GOLD, 0.1), color: GOLD },
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  const modeBtn = (m: typeof mode, label: string, icon: React.ReactNode) => (
    <Tooltip title={label} key={m}>
      <IconButton
        onClick={() => setMode(m)}
        size="small"
        sx={{
          borderRadius: 1.5,
          p: 0.7,
          width: 30,
          height: 30,
          color: mode === m ? GOLD : "rgba(240,237,232,0.35)",
          background: mode === m ? alpha(GOLD, 0.12) : "transparent",
          border:
            mode === m
              ? `1px solid ${alpha(GOLD, 0.3)}`
              : "1px solid transparent",
          "&:hover": { color: GOLD, background: alpha(GOLD, 0.08) },
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  const showEditor = mode === "write" || mode === "split";
  const showPreview = mode === "preview" || mode === "split";

  return (
    <Box
      sx={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 2.5,
        overflow: "hidden",
        "&:focus-within": { borderColor: GOLD },
        transition: "border-color 0.2s",
        background: alpha("#0D1B2A", 0.5),
      }}
    >
      {/* ── Toolbar ── */}
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          display: "flex",
          flexWrap: "wrap",
          gap: 0.4,
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: alpha("#111827", 0.8),
        }}
      >
        {/* Formatting */}
        {toolBtn(
          editor.isActive("bold"),
          () => editor.chain().focus().toggleBold().run(),
          "Bold",
          <FormatBold sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive("italic"),
          () => editor.chain().focus().toggleItalic().run(),
          "Italic",
          <FormatItalic sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive("underline"),
          () => editor.chain().focus().toggleUnderline().run(),
          "Underline",
          <FormatUnderlined sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive("strike"),
          () => editor.chain().focus().toggleStrike().run(),
          "Strikethrough",
          <StrikethroughS sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive("highlight"),
          () => editor.chain().focus().toggleHighlight().run(),
          "Highlight",
          <HighlightIcon sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive("code"),
          () => editor.chain().focus().toggleCode().run(),
          "Inline Code",
          <Code sx={{ fontSize: 17 }} />,
        )}

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 0.3 }}
        />

        {([1, 2, 3] as const).map((level) =>
          toolBtn(
            editor.isActive("heading", { level }),
            () => editor.chain().focus().toggleHeading({ level }).run(),
            `Heading ${level}`,
            <Box
              sx={{
                fontSize: "0.68rem",
                fontWeight: 800,
                width: 17,
                lineHeight: 1,
              }}
            >
              H{level}
            </Box>,
          ),
        )}

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 0.3 }}
        />

        {toolBtn(
          editor.isActive("bulletList"),
          () => editor.chain().focus().toggleBulletList().run(),
          "Bullet List",
          <FormatListBulleted sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive("orderedList"),
          () => editor.chain().focus().toggleOrderedList().run(),
          "Ordered List",
          <FormatListNumbered sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive("blockquote"),
          () => editor.chain().focus().toggleBlockquote().run(),
          "Blockquote",
          <FormatQuote sx={{ fontSize: 17 }} />,
        )}

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 0.3 }}
        />

        {toolBtn(
          editor.isActive({ textAlign: "left" }),
          () => editor.chain().focus().setTextAlign("left").run(),
          "Align Left",
          <FormatAlignLeft sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive({ textAlign: "center" }),
          () => editor.chain().focus().setTextAlign("center").run(),
          "Align Center",
          <FormatAlignCenter sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          editor.isActive({ textAlign: "right" }),
          () => editor.chain().focus().setTextAlign("right").run(),
          "Align Right",
          <FormatAlignRight sx={{ fontSize: 17 }} />,
        )}

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 0.3 }}
        />

        {toolBtn(
          false,
          () => {
            const url = window.prompt("Link URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          },
          "Insert Link",
          <LinkIcon sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          false,
          () => {
            const url = window.prompt("Image URL:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          },
          "Insert Image",
          <ImageIcon sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          false,
          () => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
          "Insert Table",
          <TableChart sx={{ fontSize: 17 }} />,
        )}

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 0.3 }}
        />

        {toolBtn(
          false,
          () => editor.chain().focus().undo().run(),
          "Undo",
          <Undo sx={{ fontSize: 17 }} />,
        )}
        {toolBtn(
          false,
          () => editor.chain().focus().redo().run(),
          "Redo",
          <Redo sx={{ fontSize: 17 }} />,
        )}

        {/* ── Mode toggle (pushed right) ── */}
        <Box
          sx={{ ml: "auto", display: "flex", gap: 0.4, alignItems: "center" }}
        >
          <Chip
            label={`~${Math.max(
              1,
              Math.ceil(
                html
                  .replace(/<[^>]*>/g, "")
                  .trim()
                  .split(/\s+/).length / 200,
              ),
            )} min`}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.62rem",
              background: alpha(GOLD, 0.08),
              color: alpha(GOLD, 0.6),
            }}
          />
          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 0.3 }}
          />
          {modeBtn(
            "write",
            "Write mode",
            <EditRounded sx={{ fontSize: 15 }} />,
          )}
          {modeBtn(
            "split",
            "Split view",
            <ViewColumnRounded sx={{ fontSize: 15 }} />,
          )}
          {modeBtn(
            "preview",
            "Preview mode",
            <VisibilityRounded sx={{ fontSize: 15 }} />,
          )}
        </Box>
      </Box>

      {/* ── Content area ── */}
      <Box sx={{ display: "flex", minHeight }}>
        {/* Editor pane */}
        {showEditor && (
          <Box
            sx={{
              flex: 1,
              "& .ProseMirror": {
                p: 2.5,
                minHeight,
                outline: "none",
                lineHeight: 1.8,
                fontSize: "0.92rem",
                color: "#F0EDE8",
                "& h1,& h2,& h3": {
                  fontFamily: '"DM Serif Display", serif',
                  color: "#F0EDE8",
                  mt: 2,
                  mb: 1,
                },
                "& h1": { fontSize: "1.8rem" },
                "& h2": { fontSize: "1.4rem" },
                "& h3": { fontSize: "1.15rem" },
                "& p.is-editor-empty:first-of-type::before": {
                  color: "rgba(240,237,232,0.2)",
                  content: "attr(data-placeholder)",
                  float: "left",
                  height: 0,
                  pointerEvents: "none",
                },
                "& a": { color: GOLD, textDecoration: "underline" },
                "& blockquote": {
                  borderLeft: `3px solid ${GOLD}`,
                  pl: 2,
                  ml: 0,
                  color: "rgba(240,237,232,0.65)",
                  fontStyle: "italic",
                },
                "& code": {
                  background: alpha(GOLD, 0.1),
                  px: 0.8,
                  py: 0.3,
                  borderRadius: 1,
                  fontSize: "0.85em",
                  fontFamily: "monospace",
                },
                "& pre": {
                  background: "#0D1B2A",
                  p: 2,
                  borderRadius: 2,
                  "& code": { background: "none", p: 0 },
                },
                "& ul,& ol": { pl: 3 },
                "& table": {
                  width: "100%",
                  borderCollapse: "collapse",
                  "& td,& th": {
                    border: "1px solid rgba(255,255,255,0.1)",
                    p: 1,
                  },
                  "& th": { background: alpha(GOLD, 0.08) },
                },
                "& mark": {
                  background: alpha(GOLD, 0.3),
                  color: "#F0EDE8",
                  borderRadius: 2,
                  px: 0.5,
                },
                "& img": { maxWidth: "100%", borderRadius: 8, my: 1 },
              },
            }}
          >
            <EditorContent editor={editor} />
          </Box>
        )}

        {/* Preview pane */}
        {showPreview && (
          <Box sx={{ flex: 1 }}>
            <PreviewPane html={html} minHeight={minHeight} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
