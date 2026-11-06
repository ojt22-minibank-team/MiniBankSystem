import { useEffect } from "react";

import { useAppSelector } from "../../lib/redux";
import { saveTheme } from "../../features/customer-account/settings/utils/ThemeStorage";

export default function ThemeProvider() {
  const theme = useAppSelector((state) => state.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );

    const applyTheme = () => {
      const isDark =
        theme === "dark" ||
        (theme === "system" && mediaQuery.matches);

      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme();
      }
    };

    applyTheme();
    saveTheme(theme);

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange,
      );
    };
  }, [theme]);

  return null;
}