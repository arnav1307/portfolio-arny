"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  /** false until mounted — gate theme-dependent UI on this to avoid SSR mismatch. */
  ready: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Theme is eye-toggle driven only (NOT system preference) per design spec.
 * The pre-paint script in layout.tsx sets <html data-theme> BEFORE hydration so
 * the colors never flash. But the server HTML has no data-theme (it can't read
 * localStorage), so React's first client render MUST also assume "light" to
 * match the server markup — otherwise any theme-dependent text/class (e.g. the
 * toggle button label) hydration-mismatches.
 *
 * So: state starts "light" (matches server), then an effect reads the real
 * value the pre-paint script applied and corrects it post-mount. `ready` lets
 * consumers hold theme-dependent UI until that sync happened.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    // Reading a browser-only fact (the pre-paint theme) after mount is the
    // sanctioned setState-in-effect case; one disable covers the pair.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
    setReady(true);
  }, []);

  // Side-effect only (DOM attr + storage) — no setState here.
  const persist = useCallback((next: Theme) => {
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage blocked — theme still applies for the session */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <ThemeContext.Provider value={{ theme, ready, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
