"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="px-4 py-2 mt-4 rounded-md transition-all duration-300 font-['Playfair_Display'] font-semibold text-sm
                 bg-gray-100 text-gray-900 border border-gray-300 shadow-sm
                 hover:bg-gray-200
                 dark:bg-gray-800 dark:text-[#c9a96e] dark:border-[#c9a96e]/30 dark:hover:bg-gray-700"
    >
      {currentTheme === "dark" ? "☀️ Aydınlık" : "🌙 Karanlık"}
    </button>
  );
}
