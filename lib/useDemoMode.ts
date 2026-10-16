"use client";

import { useEffect, useState } from "react";

const KEY = "demoMode";
const EVENT = "demo-mode-change";

// Shared across the header toggle and the dashboard via localStorage + a window event.
export function useDemoMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setOn(localStorage.getItem(KEY) === "1");
      } catch {
        // Storage blocked: stay off.
      }
    };
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const set = (next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      // Storage blocked: only this component flips.
    }
    setOn(next);
    window.dispatchEvent(new Event(EVENT));
  };

  return [on, set] as const;
}
