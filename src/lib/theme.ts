import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = {
  id: string;
  name: string;
  bg: string;
  fg: string;
  cardBg: string;
  accent: string;
  borderCol: string;
  bgImage?: string; // local custom background image (base64)
};

export const defaultThemes: Theme[] = [
  {
    id: "default-dark",
    name: "Default Dark",
    bg: "#0a0a0a",
    fg: "#ededed",
    cardBg: "rgba(255, 255, 255, 0.05)",
    accent: "rgba(255, 255, 255, 0.1)",
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "light",
    name: "Light Clean",
    bg: "#f3f4f6", // tailwind gray-100
    fg: "#111827", // tailwind gray-900
    cardBg: "#ffffff",
    accent: "rgba(0, 0, 0, 0.05)",
    borderCol: "rgba(0, 0, 0, 0.1)",
  },
  {
    id: "midnight",
    name: "Midnight Blue",
    bg: "#0f172a", // slate-900
    fg: "#f8fafc",
    cardBg: "rgba(255, 255, 255, 0.05)",
    accent: "#3b82f6", // blue-500
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "forest",
    name: "Deep Forest",
    bg: "#064e3b", // emerald-900
    fg: "#ecfdf5",
    cardBg: "rgba(255, 255, 255, 0.1)",
    accent: "#10b981", // emerald-500
    borderCol: "rgba(255, 255, 255, 0.15)",
  },
  {
    id: "sunset",
    name: "Warm Sunset",
    bg: "#451a03", // orange-950
    fg: "#fff7ed", // orange-50
    cardBg: "rgba(255, 255, 255, 0.08)",
    accent: "#f97316", // orange-500
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "dracula",
    name: "Dracula",
    bg: "#282a36",
    fg: "#f8f8f2",
    cardBg: "rgba(255, 255, 255, 0.05)",
    accent: "#ff79c6",
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "synthwave",
    name: "Synthwave",
    bg: "#1a1a2e",
    fg: "#e2e8f0",
    cardBg: "rgba(255, 255, 255, 0.05)",
    accent: "#f9a8d4",
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "oceanic",
    name: "Oceanic",
    bg: "#000B18",
    fg: "#e0f2fe",
    cardBg: "rgba(255, 255, 255, 0.06)",
    accent: "#0ea5e9",
    borderCol: "rgba(255, 255, 255, 0.15)",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    bg: "#000000",
    fg: "#ffffff",
    cardBg: "rgba(255, 255, 255, 0.1)",
    accent: "#6b7280",
    borderCol: "rgba(255, 255, 255, 0.2)",
  },
  {
    id: "coffee",
    name: "Coffee",
    bg: "#2e1e12",
    fg: "#fdf8f5",
    cardBg: "rgba(255, 255, 255, 0.06)",
    accent: "#d97706",
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "rose",
    name: "Rose Water",
    bg: "#4c0519",
    fg: "#ffe4e6",
    cardBg: "rgba(255, 255, 255, 0.08)",
    accent: "#fb7185",
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "neon-cyan",
    name: "Neon Cyan",
    bg: "#020617",
    fg: "#cffafe",
    cardBg: "rgba(255, 255, 255, 0.03)",
    accent: "#06b6d4",
    borderCol: "rgba(255, 255, 255, 0.08)",
  },
  {
    id: "royal-blue",
    name: "Royal Blue",
    bg: "#1e3a8a",
    fg: "#dbeafe",
    cardBg: "rgba(0, 0, 0, 0.15)",
    accent: "#60a5fa",
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "hacker",
    name: "Hacker Terminal",
    bg: "#000000",
    fg: "#4ade80",
    cardBg: "rgba(0, 255, 0, 0.05)",
    accent: "#22c55e",
    borderCol: "rgba(34, 197, 94, 0.2)",
  },
  {
    id: "sakura",
    name: "Sakura Blossom",
    bg: "#fdf2f8",
    fg: "#831843",
    cardBg: "#ffffff",
    accent: "#f472b6",
    borderCol: "rgba(0, 0, 0, 0.05)",
  },
];

type ThemeStore = {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  updateCustomColor: (color: string) => void;
  updateCustomBackgroundImage: (b64: string) => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      currentTheme: defaultThemes[6], // current theme is default
      setTheme: (theme) => set({ currentTheme: theme }),
      updateCustomColor: (bg) => {
        const t = get().currentTheme;
        set({
          currentTheme: {
            ...t,
            id: "custom",
            name: "Custom",
            bg,
            // Strip any bgImage if we pick a pure color manually through this
            bgImage: undefined,
          },
        });
      },
      updateCustomBackgroundImage: (b64) => {
        const t = get().currentTheme;
        // ensure we don't store insanely massive files that break local storage limit
        // though typically it might be 5MB limit
        set({
          currentTheme: {
            ...t,
            id: "custom-img",
            name: "Custom Image",
            bgImage: b64,
          },
        });
      },
    }),
    {
      name: "slkdlskdfj-theme-storage",
    }
  )

