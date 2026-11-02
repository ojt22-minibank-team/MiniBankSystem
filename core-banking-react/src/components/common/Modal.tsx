import { type ReactNode, useEffect } from 'react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Liquid Backdrop */}
      <div
        className="absolute inset-0 bg-[#0F0B24]/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Liquid Glass Panel with Specular Rim */}
      <div
        className={[
          'relative z-10 w-full rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_24px_70px_-15px_rgba(30,27,75,0.3)] specular-rim overflow-hidden transition-all duration-300',
          sizeClasses[size],
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-950/10 px-6 py-4.5 bg-gradient-to-r from-purple-50/40 via-white/50 to-amber-50/20">
          <h2 id="modal-title" className="text-lg font-black text-[#1E1B4B] tracking-tight">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
            className="!p-1.5 rounded-full hover:bg-purple-950/10 text-zinc-500 hover:text-zinc-900"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-3 border-t border-purple-950/10 bg-purple-50/20 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
