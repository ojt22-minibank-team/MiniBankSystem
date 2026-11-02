interface CrownProps {
  className?: string;
  size?: number;
}

/**
 * Official Ekaraj Bank 3D Crown Logo
 * Extracted directly from the official brand assets uploaded by the user.
 * Featuring Sapphire Blue jewel facets, polished 3D Royal Gold trim, and metallic cyan horns.
 */
export function EkarajCrown({ className = "", size = 44 }: CrownProps) {
  return (
    <img
      src="/ekaraj-crown-transparent.png"
      alt="Ekaraj Bank Crown"
      style={{ width: size, height: "auto" }}
      className={`shrink-0 object-contain drop-shadow-md select-none inline-block ${className}`}
      loading="eager"
    />
  );
}

// Backwards-compatibility alias
export { EkarajCrown as EkararjCrown };

/**
 * 3D Metallic Cyan 'EB' Monogram
 * Exactly matching the beveled chrome cyan monogram in the reference image.
 */
export function EbMonogram({
  className = "",
  size = 38,
}: {
  className?: string;
  size?: number;
}) {
  const height = Math.round((size * 26) / 38);

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 68 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-sm ${className}`}
      aria-label="EB Monogram"
    >
      <defs>
        {/* Metallic Cyan Gradient */}
        <linearGradient id="ebCyanBevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="25%" stopColor="#22D3EE" />
          <stop offset="60%" stopColor="#00A3C4" />
          <stop offset="90%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>

        <linearGradient id="ebCyanHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#A5F3FC" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0891B2" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Letter 'E' */}
      <path
        d="M 5 6 L 31 6 L 31 13 L 14 13 L 14 19 L 28 19 L 28 26 L 14 26 L 14 33 L 32 33 L 32 40 L 5 40 Z"
        fill="url(#ebCyanBevel)"
        stroke="#0A192F"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Letter 'E' Specular Highlight */}
      <path
        d="M 6 7 L 30 7 L 30 11 L 15 11 L 15 20 L 27 20 L 27 24 L 15 24 L 15 34 L 31 34 L 31 38 L 6 38 Z"
        stroke="url(#ebCyanHighlight)"
        strokeWidth="0.75"
        fill="none"
      />

      {/* Letter 'B' */}
      <path
        d="M 36 6 L 53 6 C 58 6, 63 9, 63 15 C 63 19, 60 22, 56 23 C 61 24, 64 27, 64 32 C 64 38, 59 40, 53 40 L 36 40 Z M 44 12 L 44 20 L 51 20 C 54 20, 56 18, 56 16 C 56 14, 54 12, 51 12 Z M 44 26 L 44 34 L 52 34 C 55 34, 57 32, 57 30 C 57 28, 55 26, 52 26 Z"
        fill="url(#ebCyanBevel)"
        stroke="#0A192F"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Letter 'B' Specular Highlight */}
      <path
        d="M 37 7 L 52 7 C 56 7, 61 10, 61 15 C 61 18, 59 21, 55 22 C 59 23, 62 26, 62 31 C 62 36, 57 39, 52 39 L 37 39 Z"
        stroke="url(#ebCyanHighlight)"
        strokeWidth="0.75"
        fill="none"
      />
    </svg>
  );
}

/**
 * Contactless indicator waves
 */
export function ContactlessWaves({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="26"
      viewBox="0 0 22 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`opacity-70 drop-shadow-xs ${className}`}
      aria-label="Contactless"
    >
      <path
        d="M 4 19 C 8 16.5, 8 9.5, 4 7"
        stroke="#475569"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M 10 22 C 16 18, 16 8, 10 4"
        stroke="#475569"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M 16 25 C 24 19.5, 24 6.5, 16 1"
        stroke="#475569"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Embossed Crown Watermark for Bank Cards
 * Replaces linear patterns with luxury 3D embossed watermark crowns
 */
export function CrownEmbossedWatermark({
  className = "",
  theme = "platinum",
}: {
  className?: string;
  theme?: "platinum" | "navy" | "gold" | "obsidian";
}) {
  const isLightMode = theme === "platinum" || theme === "gold";

  // Highlight and shadow colors for 3D metallic stamped embossing
  const highlightStroke = isLightMode
    ? "rgba(255, 255, 255, 0.7)"
    : "rgba(255, 255, 255, 0.22)";
  const shadowStroke = isLightMode
    ? "rgba(15, 23, 42, 0.2)"
    : "rgba(0, 0, 0, 0.55)";

  const highlightFill = isLightMode
    ? "rgba(255, 255, 255, 0.06)"
    : "rgba(255, 255, 255, 0.03)";

  return (
    <div
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. Large 3D Official Crown Watermark in the Right / Center Background */}
      <div className="absolute -right-6 -bottom-6 sm:-right-4 sm:-bottom-4 pointer-events-none select-none">
        <img
          src="/ekaraj-crown-transparent.png"
          alt=""
          aria-hidden="true"
          className={`h-48 w-48 sm:h-56 sm:w-56 object-contain pointer-events-none ${
            theme === "platinum"
              ? "opacity-[0.14] contrast-125 brightness-95 filter drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
              : theme === "navy"
                ? "opacity-[0.16] brightness-125 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                : theme === "gold"
                  ? "opacity-[0.18] contrast-125 brightness-105 filter drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
                  : "opacity-[0.12] brightness-150 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          }`}
        />
      </div>

      {/* 2. Embossed SVG Watermark Crown Silhouettes */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 360 220"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Reusable Embossed Crown Symbol */}
          <g id="embossedCrownMotif">
            {/* Shadow path (debossed bottom/right) */}
            <path
              d="M 12 40 L 20 54 L 32 30 L 44 54 L 52 40 L 50 60 Q 32 65 14 60 Z"
              stroke={shadowStroke}
              strokeWidth="1.2"
              fill={highlightFill}
              transform="translate(0, 0.8)"
            />
            {/* Highlight path (embossed top/left) */}
            <path
              d="M 12 40 L 20 54 L 32 30 L 44 54 L 52 40 L 50 60 Q 32 65 14 60 Z"
              stroke={highlightStroke}
              strokeWidth="1.2"
              fill="none"
              transform="translate(0, -0.6)"
            />
            {/* Crown base band */}
            <path
              d="M 14 62 Q 32 67 50 62"
              stroke={highlightStroke}
              strokeWidth="1.5"
            />
            <path
              d="M 14 64 Q 32 69 50 64"
              stroke={shadowStroke}
              strokeWidth="1"
            />
          </g>
        </defs>

        {/* Floating subtle embossed watermark crowns */}
        {/* Crown 1: Upper center */}
        <use href="#embossedCrownMotif" x="145" y="-10" transform="scale(0.85)" opacity="0.65" />
        {/* Crown 2: Lower left background */}
        <use href="#embossedCrownMotif" x="25" y="70" transform="scale(0.7)" opacity="0.5" />
        {/* Crown 3: Center background */}
        <use href="#embossedCrownMotif" x="200" y="65" transform="scale(0.9)" opacity="0.55" />
        {/* Crown 4: Upper right edge */}
        <use href="#embossedCrownMotif" x="310" y="8" transform="scale(0.75)" opacity="0.45" />
      </svg>
    </div>
  );
}

/**
 * Official Geometric Lines pattern for Bank Cards
 * Using the official 2D card lines SVG
 */
export function CardGeometricLines({
  className = "",
  theme: _theme = "platinum",
}: {
  className?: string;
  theme?: "platinum" | "navy" | "gold" | "obsidian";
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden select-none ${className}`}
    >
      <img
        src="/card-geometric-lines.svg"
        alt="EKARAJ Bank Geometric Lines"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/**
 * Complete Ekaraj Bank Logo Lockup
 */
interface LogoLockupProps {
  variant?: "horizontal" | "stacked" | "cardHeader" | "compact";
  textMode?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
  showSubtitle?: boolean;
}

export default function EkarajLogo({
  variant = "horizontal",
  textMode = "dark",
  size = "md",
  className = "",
  showSubtitle = true,
}: LogoLockupProps) {
  const isLightText = textMode === "light";

  if (variant === "cardHeader") {
    return (
      <div className={`flex items-center justify-between w-full ${className}`}>
        {/* Left: EB Monogram + EKARAJ BANK */}
        <div className="flex items-center gap-2.5">
          <EbMonogram size={36} />
          <div>
            <h3
              className={`font-black tracking-wider leading-none text-base sm:text-lg select-none ${
                isLightText
                  ? "text-white drop-shadow-sm"
                  : "text-[#0A192F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
              }`}
            >
              EKARAJ BANK
            </h3>
          </div>
        </div>

        {/* Right: Official Crown Logo */}
        <EkarajCrown size={46} />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A192F] shadow-sm ring-1 ring-[#00A3C4]/30">
          <EkarajCrown size={30} />
        </div>
        <div className="min-w-0">
          <span
            className={`block text-base font-extrabold tracking-tight leading-tight ${
              isLightText ? "text-white" : "text-[#0A192F]"
            }`}
          >
            EKARAJ BANK
          </span>
          {showSubtitle && (
            <span className="block text-[10px] font-medium text-slate-400">
              Customer Portal
            </span>
          )}
        </div>
      </div>
    );
  }

  const crownSize = size === "lg" ? 42 : size === "sm" ? 28 : 34;
  const textSize = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-[16px]";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A192F] to-[#153564] shadow-sm ring-1 ring-white/10 p-1">
        <EkarajCrown size={crownSize} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-extrabold tracking-tight leading-none ${textSize} ${
              isLightText ? "text-white" : "text-[#0A192F]"
            }`}
          >
            EKARAJ BANK
          </span>
        </div>
        {showSubtitle && (
          <p className="mt-0.5 text-[11px] font-medium text-slate-400 leading-none">
            Customer Portal
          </p>
        )}
      </div>
    </div>
  );
}

export { EkarajLogo as EkararjLogo };
