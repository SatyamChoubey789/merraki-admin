"use client";
import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type KeyCombo = string; // e.g. "cmd+k", "g d", "?"

interface ShortcutMap {
  [combo: KeyCombo]: () => void;
}

/**
 * useKeyboardShortcuts
 *
 * Handles two types of shortcuts:
 * 1. Single key / modifier combos: "cmd+k", "escape", "?"
 * 2. Sequence shortcuts: "g d" (press G then D within 800ms)
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const pendingKey = useRef<string | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // Build the combo string
      let combo = "";
      if (meta) combo += "cmd+";
      if (shift) combo += "shift+";
      combo += key;

      // Check direct combos first
      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
        return;
      }

      // Check single key shortcuts (no modifiers)
      if (!meta && !shift && shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
        return;
      }

      // Sequence: if we have a pending key, check "pending key"
      if (pendingKey.current) {
        const seq = `${pendingKey.current} ${key}`;
        if (shortcuts[seq]) {
          e.preventDefault();
          if (pendingTimer.current) clearTimeout(pendingTimer.current);
          pendingKey.current = null;
          shortcuts[seq]();
          return;
        }
        // No match — start fresh with current key as new pending
        if (pendingTimer.current) clearTimeout(pendingTimer.current);
        pendingKey.current = null;
      }

      // Check if this key starts any sequence
      const startsSequence = Object.keys(shortcuts).some(
        (k) => k.includes(" ") && k.startsWith(key + " ")
      );
      if (startsSequence && !meta) {
        pendingKey.current = key;
        pendingTimer.current = setTimeout(() => {
          pendingKey.current = null;
        }, 800);
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, [handler]);
}

/**
 * useAppShortcuts — app-level shortcut wiring
 * Call once in AdminLayout
 */
export function useAppShortcuts(opts: {
  onOpenPalette: () => void;
  onOpenNotifications: () => void;
}) {
  const router = useRouter();

  useKeyboardShortcuts({
    // Command palette
    "cmd+k": opts.onOpenPalette,
    "/": opts.onOpenPalette,

    // Navigation sequences (G + letter)
    "g d": () => router.push("/dashboard"),
    "g u": () => router.push("/users"),
    "g o": () => router.push("/orders"),
    "g b": () => router.push("/blog"),
    "g c": () => router.push("/contacts"),
    "g n": () => router.push("/newsletter"),
    "g t": () => router.push("/templates"),

    // Create sequences
    "n b": () => router.push("/blog?new=1"),
    "n n": () => router.push("/newsletter?new=1"),

    // Notifications
    "cmd+shift+n": opts.onOpenNotifications,
  });
}