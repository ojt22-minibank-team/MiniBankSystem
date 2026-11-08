import { AlertTriangle, Clock } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export default function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogoutNow,
}: SessionTimeoutModalProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onStayLoggedIn}
      title="Inactivity Warning"
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onLogoutNow}
            className="text-xs"
          >
            Sign Out Now
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onStayLoggedIn}
            className="text-xs btn-liquid-gold"
          >
            Stay Signed In
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-2 space-y-4">
        <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
          <AlertTriangle className="h-7 w-7 stroke-[2.2]" />
        </div>

        <div className="space-y-1.5">
          <h4 className="text-base font-bold text-slate-900">
            Session Expiring Soon
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
            You have been inactive for an extended period. For core banking security, your session will automatically terminate in:
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono text-lg font-black tracking-widest shadow-sm">
          <Clock className="h-5 w-5 text-amber-600" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </Modal>
  );
}
