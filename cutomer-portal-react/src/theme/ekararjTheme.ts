/**
 * EKARAJ BANK - UI Theme Design System
 * Extracted directly from the official Ekaraj Bank logo and Platinum card design.
 *
 * Core Color Dimensions:
 * 1. Deep Royal Navy   - Prestigious midnight banking depth (#0A192F, #060E1A)
 * 2. Metallic Cyan     - Vibrant 3D 'EB' monogram & futuristic line art (#00A3C4, #06B6D4)
 * 3. Royal Sapphire    - Rich blue jewel facets of the royal crown (#1E40AF, #2563EB)
 * 4. Luxury Crown Gold - Warm polished gold crown trim & geometric card lines (#D4AF37, #E5C378)
 * 5. Brushed Platinum  - Sleek metallic silver steel card surface (#E2E8F0, #CBD5E1)
 */

export const EKARAJ_COLORS = {
  // Deep Royal Navy (Dark backgrounds, primary headings, sidebar, dark mode surfaces)
  navy: {
    50: "#F0F4FA",
    100: "#D9E3F1",
    200: "#B3C8E3",
    300: "#85A8D3",
    400: "#5483C0",
    500: "#2B5FA7",
    600: "#1E4785",
    700: "#153564",
    800: "#0F2445",
    900: "#0A192F", // Brand Primary Dark / Sidebar
    950: "#060E1A", // Brand Deep Midnight
  },

  // Metallic Cyan / Ocean Teal (Hero 'EB' monogram, active links, primary action highlights)
  cyan: {
    50: "#ECFEFF",
    100: "#CFFAFE",
    200: "#A5F3FC",
    300: "#67E8F9",
    400: "#22D3EE",
    500: "#06B6D4",
    600: "#00A3C4", // Primary Action Cyan
    700: "#0891B2",
    800: "#0E7490",
    900: "#155E75",
    950: "#083344",
  },

  // Royal Sapphire Blue (Crown body facets, trusted banking elements)
  sapphire: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF", // Crown Sapphire Blue
    900: "#1E3A8A",
    950: "#172554",
  },

  // Luxury Crown Gold (Crown points, card geometric accent lines, VIP badges)
  gold: {
    50: "#FEFCE8",
    100: "#FEF9C3",
    200: "#FEF08A",
    300: "#FDE047",
    400: "#E5C378", // Champagne Gold Accent
    500: "#D4AF37", // Crown Polished Gold
    600: "#C59A27",
    700: "#B38A20",
    800: "#856414",
    900: "#59420B",
    950: "#332504",
  },

  // Brushed Platinum / Silver Steel (Card face, light borders, subtle metallic sheen)
  platinum: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0", // Card Brushed Silver Mid
    300: "#CBD5E1", // Card Border / Bevel
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },
} as const;

/**
 * Gradients directly matching the Ekaraj Bank card & brand assets
 */
export const EKARAJ_GRADIENTS = {
  // The exact brushed platinum card surface
  cardPlatinum: "linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 35%, #E2E8F0 70%, #CBD5E1 100%)",

  // Deep Royal Navy card variation
  cardSapphireNavy: "linear-gradient(135deg, #0A192F 0%, #0F2A52 50%, #173B6F 100%)",

  // Titanium Champagne Gold card variation
  cardGold: "linear-gradient(135deg, #FFFBEB 0%, #FDF4D4 30%, #E8CD85 70%, #C9A44B 100%)",

  // Obsidian Dark card variation
  cardObsidian: "linear-gradient(135deg, #18202F 0%, #0F1724 60%, #060A10 100%)",

  // Primary action button gradient (Navy to Sapphire with Cyan glow)
  btnPrimary: "linear-gradient(135deg, #0A192F 0%, #153969 100%)",

  // High-visibility action button gradient (Metallic Cyan)
  btnCyan: "linear-gradient(135deg, #00A3C4 0%, #0891B2 50%, #0284C7 100%)",

  // Royal Gold button gradient
  btnGold: "linear-gradient(135deg, #E5C378 0%, #D4AF37 50%, #B38A20 100%)",

  // Hero total balance card background
  totalBalanceNavy: "linear-gradient(135deg, #0A192F 0%, #102A54 50%, #193E78 100%)",
} as const;

/**
 * Standard button class styles to use across pages
 */
export const BUTTON_STYLES = {
  // Main brand button (Royal Navy with subtle cyan hover glow)
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A192F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#153564] hover:shadow-md hover:shadow-cyan-900/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",

  // High-priority action button (Metallic Cyan gradient)
  cyan:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00A3C4] to-[#0284C7] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-cyan-500/25 transition-all hover:from-[#0891B2] hover:to-[#0369A1] hover:shadow-md hover:shadow-cyan-500/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",

  // Luxury Gold action button
  gold:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5C378] via-[#D4AF37] to-[#B38A20] px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm shadow-amber-500/20 transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",

  // Secondary outline button
  outline:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0A192F] shadow-2xs transition-all hover:border-[#00A3C4] hover:bg-cyan-50/50 hover:text-[#00A3C4] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",

  // Ghost icon button
  ghost:
    "inline-flex items-center justify-center rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#00A3C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4]",
} as const;

export default EKARAJ_COLORS;

export const EKARARJ_COLORS = EKARAJ_COLORS;
export const EKARARJ_GRADIENTS = EKARAJ_GRADIENTS;
