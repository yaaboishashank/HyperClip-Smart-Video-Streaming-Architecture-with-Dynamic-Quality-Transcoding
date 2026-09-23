import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-toggle" aria-label="Appearance">
      <button
        aria-label="Light mode"
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
      >
        <Sun size={16} />
        <span>Light</span>
      </button>
      <button
        aria-label="Dark mode"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
      >
        <Moon size={16} />
        <span>Dark</span>
      </button>
    </div>
  );
}
