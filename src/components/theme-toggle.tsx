"use client";

import { useEffect, useState } from "react";

import styles from "./theme-toggle.module.css";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("mh-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem("mh-theme");
    return storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : "light";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
      className={styles.toggle}
      onClick={toggleTheme}
      type="button"
    >
      <span className={styles.track}>
        <span className={styles.label}>
          {theme === "light" ? "Modo claro" : "Modo oscuro"}
        </span>
        <span className={styles.thumb}>{theme === "light" ? "☀" : "◐"}</span>
      </span>
    </button>
  );
}
