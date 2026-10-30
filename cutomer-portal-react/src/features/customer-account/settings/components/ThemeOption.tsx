import { Check, Monitor, Moon, Sun } from "lucide-react";

import type { ThemePreference } from "../types/settingsTypes";

interface ThemeOptionProps {
  value: ThemePreference;
  selected: boolean;
  onSelect: (theme: ThemePreference) => void;
}

const themeOptions = {
  light: {
    label: "Light",
    description: "A bright, clean interface",
    Icon: Sun,
  },
  dark: {
    label: "Dark",
    description: "Comfortable in low light",
    Icon: Moon,
  },
  system: {
    label: "System",
    description: "Follow your device settings",
    Icon: Monitor,
  },
} satisfies Record<
  ThemePreference,
  {
    label: string;
    description: string;
    Icon: typeof Sun;
  }
>;

export default function ThemeOption({
  value,
  selected,
  onSelect,
}: ThemeOptionProps) {
  const { label, description, Icon } = themeOptions[value];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={[
        "relative flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4] focus-visible:ring-offset-2",
        selected
          ? "border-[#00A3C4] bg-cyan-50/70 dark:border-blue-400 dark:bg-blue-950/40"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          selected
            ? "bg-cyan-100 text-[#00A3C4] dark:bg-blue-900 dark:text-blue-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        ].join(" ")}
      >
        <Icon size={20} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </span>
      </span>

      {selected && (
        <Check
          size={18}
          className="shrink-0 text-[#00A3C4] dark:text-blue-400"
          aria-hidden="true"
        />
      )}
    </button>
  );
}