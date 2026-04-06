"use client";

import * as React from "react";

const STORAGE_KEY = "theme";

export type ThemeName = "light" | "dark" | "system";

export type ThemeProviderProps = React.PropsWithChildren<{
  defaultTheme?: ThemeName;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}>;

type ThemeContextValue = {
  theme: ThemeName | undefined;
  setTheme: React.Dispatch<React.SetStateAction<ThemeName>>;
  resolvedTheme: "light" | "dark" | undefined;
  themes: string[];
  systemTheme: "light" | "dark" | undefined;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function systemPreference(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme: ThemeName, system: "light" | "dark"): "light" | "dark" {
  return theme === "system" ? system : theme;
}

function applyThemeClass(
  resolved: "light" | "dark",
  disableTransitionOnChange: boolean
) {
  const root = document.documentElement;
  let removeTransitionStyle: (() => void) | undefined;
  if (disableTransitionOnChange) {
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
      )
    );
    document.head.appendChild(style);
    removeTransitionStyle = () => {
      window.getComputedStyle(document.body);
      setTimeout(() => document.head.removeChild(style), 1);
    };
  }
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  removeTransitionStyle?.();
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  enableSystem = true,
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const themes = React.useMemo(
    () => (enableSystem ? (["light", "dark", "system"] as const) : (["light", "dark"] as const)),
    [enableSystem]
  );

  const [theme, setThemeState] = React.useState<ThemeName>(defaultTheme);
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark" | undefined>(
    undefined
  );
  const [mounted, setMounted] = React.useState(false);

  /** Bootstrap theme before browser paint — avoids a <script> in root layout (React 19 dev warning). */
  React.useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sys: "light" | "dark" = mq.matches ? "dark" : "light";
    setSystemTheme(sys);

    let nextTheme: ThemeName = defaultTheme;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
      if (
        stored &&
        (stored === "light" ||
          stored === "dark" ||
          (stored === "system" && enableSystem))
      ) {
        nextTheme = stored;
      }
    } catch {
      /* ignore */
    }
    setThemeState(nextTheme);
    applyThemeClass(resolve(nextTheme, sys), disableTransitionOnChange);
    setMounted(true);

    const onChange = () => setSystemTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [defaultTheme, enableSystem, disableTransitionOnChange]);

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      const v = e.newValue as ThemeName;
      if (v === "light" || v === "dark" || v === "system") setThemeState(v);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = React.useCallback((value: React.SetStateAction<ThemeName>) => {
    setThemeState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const resolvedTheme =
    mounted && systemTheme !== undefined
      ? resolve(theme, systemTheme)
      : undefined;

  React.useEffect(() => {
    if (!mounted || systemTheme === undefined) return;
    applyThemeClass(resolve(theme, systemTheme), disableTransitionOnChange);
  }, [theme, systemTheme, mounted, disableTransitionOnChange]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme: mounted ? theme : undefined,
      setTheme,
      resolvedTheme,
      themes: [...themes],
      systemTheme: enableSystem ? systemTheme : undefined,
    }),
    [theme, setTheme, resolvedTheme, themes, systemTheme, enableSystem, mounted]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Same general shape as `next-themes` for components in this app */
export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: undefined,
      setTheme: () => {},
      resolvedTheme: undefined,
      themes: [],
      systemTheme: undefined,
    };
  }
  return ctx;
}
