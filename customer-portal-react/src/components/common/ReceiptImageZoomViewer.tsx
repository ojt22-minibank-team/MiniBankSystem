import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";

interface ReceiptImageZoomViewerProps {
  src: string;
  alt?: string;
  className?: string;
}

export const ReceiptImageZoomViewer: React.FC<ReceiptImageZoomViewerProps> = ({
  src,
  alt = "Receipt Preview",
  className = "",
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // Reset zoom when src changes
  useEffect(() => {
    setZoom(1);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [src]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(2.5, +(prev + 0.35).toFixed(2)));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => {
      const next = Math.max(1, +(prev - 0.35).toFixed(2));
      if (next === 1 && containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      return next;
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(1);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const toggleZoom = () => {
    setZoom((prev) => {
      const next = prev === 1 ? 1.75 : 1;
      if (next === 1 && containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      return next;
    });
  };

  // Mouse Drag to Pan (up and down)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    setIsDraggingState(true);
    startYRef.current = e.pageY;
    scrollTopRef.current = containerRef.current.scrollTop;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const deltaY = e.pageY - startYRef.current;
    if (Math.abs(deltaY) > 4) {
      hasDraggedRef.current = true;
    }
    containerRef.current.scrollTop = scrollTopRef.current - deltaY;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDraggingState(false);
  };

  const handleContainerClick = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    toggleZoom();
  };

  // Touchpad pinch-to-zoom (ctrlKey + wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom((prev) => Math.min(2.5, Math.max(1, +(prev + delta).toFixed(2))));
    }
  };

  return (
    <div
      className={`relative group mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/95 overflow-hidden shadow-2xs ${className}`}
      onWheel={handleWheel}
    >
      {/* Floating Zoom Controls Bar */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-0.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xs">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] font-bold text-slate-600 px-1 select-none min-w-[34px] text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 2.5}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {zoom > 1 && (
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border-l border-slate-200 ml-0.5 cursor-pointer"
            title="Reset to Normal View"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Floating Active Hint Badge */}
      {zoom > 1 && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 py-1 px-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium rounded-lg pointer-events-none select-none shadow-xs animate-in fade-in">
          <Move className="w-3 h-3 text-cyan-400" />
          <span>အပေါ်အောက် ဆွဲကြည့်ပါ</span>
        </div>
      )}

      {/* Zoomable & Scrollable Container (Scrollbar completely hidden: no bulky scrollbar) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleContainerClick}
        className={`w-full max-h-56 sm:max-h-64 overflow-y-auto overflow-x-hidden p-2 flex flex-col items-center select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          zoom > 1
            ? isDraggingState
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-zoom-in"
        }`}
        style={{ scrollBehavior: isDraggingState ? "auto" : "smooth" }}
      >
        <div
          className="flex justify-center transition-all duration-200 ease-out origin-top"
          style={{
            width: zoom > 1 ? `${Math.round(zoom * 100)}%` : "100%",
            maxWidth: zoom > 1 ? "none" : "100%",
          }}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className={`w-auto object-contain rounded-xl shadow-2xs pointer-events-none transition-all duration-200 ${
              zoom === 1 ? "max-h-52" : "h-auto max-w-none"
            }`}
            style={{
              width: zoom > 1 ? `${Math.round(zoom * 100)}%` : undefined,
            }}
          />
        </div>
      </div>

      {/* Subtle Hint Bar at bottom */}
      <div className="py-1 px-2 bg-slate-100/70 border-t border-slate-200/60 text-[10px] text-slate-500 text-center select-none flex items-center justify-center gap-1">
        {zoom > 1 ? (
          <span>👆 Mouse ဖြင့် ဖိဆွဲ၍ဖြစ်စေ၊ Scroll လှည့်၍ဖြစ်စေ အပေါ်အောက် အပြည့် ကြည့်နိုင်ပါသည်</span>
        ) : (
          <span>🔍 ပုံကို နှိပ်၍ Zoom ချဲ့ကြည့်နိုင်ပါသည် (သို့မဟုတ် အပေါ်မှ +/- ကို သုံးပါ)</span>
        )}
      </div>
    </div>
  );
};
