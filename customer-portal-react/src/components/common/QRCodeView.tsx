import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeViewProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  className?: string;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 140,
  bgColor = "#FFFFFF",
  fgColor = "#000000",
  className = "",
}) => {
  if (!value) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-slate-100 rounded-xl text-[10px] text-slate-400 font-mono"
      >
        QR Unavailable
      </div>
    );
  }

  return (
    <div
      className={`inline-block p-2 rounded-2xl bg-white shadow-sm border border-slate-100 ${className}`}
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level="M"
        marginSize={4}
      />
    </div>
  );
};
