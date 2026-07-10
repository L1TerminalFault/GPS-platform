"use client";

import { useThemeStore } from "@/lib/theme";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentTheme } = useThemeStore();

  return (
    <div className="">
      <style suppressHydrationWarning>{`
        :root {
          --bg: ${currentTheme.bg};
          --fg: ${currentTheme.fg};
          --cardBg: ${currentTheme.cardBg};
          --accent: ${currentTheme.accent};
          --borderCol: ${currentTheme.borderCol};
        }
        
        body {
           ${currentTheme.bgImage 
              ? `background-image: url('${currentTheme.bgImage}');
                 background-size: cover;
                 background-position: center;
                 background-repeat: no-repeat;
                 background-attachment: fixed;` 
              : `background-color: var(--bg);`
            }
           color: var(--fg);
        }
      `}</style>
      {children}
    </div>
  );
}
