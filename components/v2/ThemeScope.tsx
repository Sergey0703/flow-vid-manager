"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "v2-theme";

export default function ThemeScope({ children }: { children: React.ReactNode }) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(localStorage.getItem(THEME_KEY) === "light");
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) setIsLight(e.newValue === "light");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Navigation writes to localStorage — poll for changes within the same tab
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLight(localStorage.getItem(THEME_KEY) === "light");
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`v2-scope${isLight ? " v2-light" : ""}`}>
      {children}
    </div>
  );
}
