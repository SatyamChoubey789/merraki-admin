"use client";
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initial;
    } catch { return initial; }
  });

  const set = (v: T) => {
    setValue(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(v));
    }
  };

  return [value, set];
}