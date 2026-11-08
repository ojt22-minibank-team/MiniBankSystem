import {
  type ReactNode,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../lib/redux';
import { forceLogout, broadcastLogout } from '../../features/auth/authSlice';
import { clearBankingMemoryCache } from '../../hooks/useBankingData';
import SessionTimeoutModal from '../../components/common/SessionTimeoutModal';

interface SessionTimeoutProviderProps {
  children: ReactNode;
  /** Total idle timeout before automatic forced logout (default: 10 minutes) */
  timeoutMs?: number;
  /** Time window before logout during which the warning modal is shown (default: 2 minutes) */
  warningMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_WARNING_MS = 2 * 60 * 1000; // 2 minutes warning countdown
const THROTTLE_ACTIVITY_MS = 1000; // 1 second activity throttle

export default function SessionTimeoutProvider({
  children,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
}: SessionTimeoutProviderProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.floor(warningMs / 1000),
  );

  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottleRef = useRef<number>(0);
  const isWarningOpenRef = useRef<boolean>(false);

  // Sync ref with state
  useEffect(() => {
    isWarningOpenRef.current = isWarningOpen;
  }, [isWarningOpen]);

  const handleLogout = useCallback(() => {
    setIsWarningOpen(false);
    clearBankingMemoryCache();
    broadcastLogout();
    dispatch(forceLogout());
    navigate('/login?reason=idle_timeout', { replace: true });
  }, [dispatch, navigate]);

  const handleStayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarningOpen(false);
    setRemainingSeconds(Math.floor(warningMs / 1000));
  }, [warningMs]);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current > THROTTLE_ACTIVITY_MS) {
      lastThrottleRef.current = now;
      lastActivityRef.current = now;
      if (isWarningOpenRef.current) {
        setIsWarningOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsWarningOpen(false);
      return;
    }

    lastActivityRef.current = Date.now();

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
    ];

    const onActivity = () => {
      // Don't silently dismiss the modal on passive mousemove if warning modal is already showing;
      // user must explicitly click "Stay Signed In".
      if (!isWarningOpenRef.current) {
        recordActivity();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const warningThreshold = timeoutMs - warningMs;

      if (elapsed >= timeoutMs) {
        handleLogout();
      } else if (elapsed >= warningThreshold) {
        const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setRemainingSeconds(remaining);
        setIsWarningOpen(true);
      } else {
        if (isWarningOpenRef.current) {
          setIsWarningOpen(false);
        }
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
    };
  }, [isAuthenticated, timeoutMs, warningMs, recordActivity, handleLogout]);

  return (
    <>
      {children}
      {isAuthenticated && (
        <SessionTimeoutModal
          isOpen={isWarningOpen}
          remainingSeconds={remainingSeconds}
          onStayLoggedIn={handleStayLoggedIn}
          onLogoutNow={handleLogout}
        />
      )}
    </>
  );
}
