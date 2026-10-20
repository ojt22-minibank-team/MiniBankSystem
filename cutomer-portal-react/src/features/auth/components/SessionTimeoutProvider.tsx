import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  clearTokens,
  hasTokens,
} from "../../../utils/tokenStorage";

import {
  keepSessionAlive,
} from "../../../services/authService";

import {
  SESSION_TIMEOUT_EVENT,
  type SessionTimeoutDetail,
} from "../../../utils/sessionEvents";

import SessionTimeoutModal
  from "./SessionTimeoutModal";

import { isIndividualLogoutInProgress } from "../hooks/useIndividualLogout";


interface SessionTimeoutProviderProps {
  children: ReactNode;
}


// 5 minutes
const IDLE_TIMEOUT_MS =
  5 * 60 * 1000;


// Keep-alive API ကို
// max 1 minute မှာ တစ်ခါပဲခေါ်မယ်
const KEEP_ALIVE_THROTTLE_MS =
  60 * 1000;


function SessionTimeoutProvider({
  children,
}: SessionTimeoutProviderProps) {

  const navigate =
    useNavigate();


  const [
    timedOut,
    setTimedOut,
  ] = useState(false);


  const [
    timeoutMessage,
    setTimeoutMessage,
  ] = useState(
    "Your session has expired after 5 minutes of inactivity."
  );


  const idleTimerRef =
    useRef<number | null>(
      null
    );


  const lastKeepAliveRef =
    useRef(0);

  const keepAliveInFlightRef = useRef(false);
  const expiredRef = useRef(false);


  // ======================================================
  // SHOW TIMEOUT
  // ======================================================

  const showTimeout =
    useCallback(
      (
        message?: string
      ) => {

        expiredRef.current = true;
        if (idleTimerRef.current !== null) {
          window.clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }

        setTimeoutMessage(
          message ||
          "Your session has expired after 5 minutes of inactivity."
        );


        // Browser ထဲက authentication
        // tokens တွေရှင်းမယ်
        clearTokens();


        setTimedOut(
          true
        );

      },
      []
    );


  // ======================================================
  // RESET 5-MIN TIMER
  // ======================================================

  const resetIdleTimer =
    useCallback(
      () => {

        if (
          timedOut ||
          !hasTokens()
        ) {
          return;
        }


        if (
          idleTimerRef.current
          !== null
        ) {

          window.clearTimeout(
            idleTimerRef.current
          );

        }


        idleTimerRef.current =
          window.setTimeout(
            () => {

              if (!hasTokens() || isIndividualLogoutInProgress()) return;

              showTimeout(
                "Your session has expired after 5 minutes of inactivity."
              );

            },
            IDLE_TIMEOUT_MS
          );

      },
      [
        timedOut,
        showTimeout,
      ]
    );


  // ======================================================
  // KEEP ALIVE
  // ======================================================

  const sendKeepAliveIfNeeded =
    useCallback(
      async () => {

        if (
          !hasTokens() ||
          expiredRef.current ||
          isIndividualLogoutInProgress() ||
          keepAliveInFlightRef.current
        ) {
          return;
        }


        const now =
          Date.now();


        // 60 seconds မပြည့်သေးရင်
        // API ထပ်မခေါ်
        if (
          now -
          lastKeepAliveRef.current
          <
          KEEP_ALIVE_THROTTLE_MS
        ) {

          return;

        }


        // Throttle attempts, including failures, before starting the request.
        lastKeepAliveRef.current = now;
        keepAliveInFlightRef.current = true;


        try {

          await keepSessionAlive();

        } catch {

          // SESSION_EXPIRED ဖြစ်ရင်
          // api.ts interceptor က
          // timeout event trigger လုပ်မယ်.
        } finally {
          keepAliveInFlightRef.current = false;
        }

      },
      []
    );


  // ======================================================
  // USER ACTIVITY
  // ======================================================

  useEffect(() => {

    if (
      timedOut
    ) {
      return;
    }


    const handleActivity =
      () => {

        if (
          !hasTokens() ||
          expiredRef.current ||
          isIndividualLogoutInProgress()
        ) {
          return;
        }


        resetIdleTimer();


        void sendKeepAliveIfNeeded();

      };


    // Page စရောက်တဲ့အချိန်
    // timer စမယ်
    resetIdleTimer();


    // Capture also sees non-bubbling scroll events inside Dashboard containers.
    const activityEvents = [
      "pointerdown", "click", "keydown", "input", "scroll", "touchstart",
    ];
    for (const event of activityEvents) {
      window.addEventListener(event, handleActivity, {
        passive: true,
        capture: true,
      });
    }


    return () => {

      if (
        idleTimerRef.current
        !== null
      ) {

        window.clearTimeout(
          idleTimerRef.current
        );

      }


      for (const event of activityEvents) {
        window.removeEventListener(event, handleActivity, true);
      }

    };

  }, [
    timedOut,
    resetIdleTimer,
    sendKeepAliveIfNeeded,
  ]);


  // ======================================================
  // BACKEND SESSION EXPIRED
  // ======================================================

  useEffect(() => {

    const handleSessionTimeout =
      (
        event: Event
      ) => {

        const timeoutEvent =
          event as
            CustomEvent<
              SessionTimeoutDetail
            >;


        showTimeout(
          timeoutEvent
            .detail
            ?.message
        );

      };


    window.addEventListener(
      SESSION_TIMEOUT_EVENT,
      handleSessionTimeout
    );


    return () => {

      window.removeEventListener(
        SESSION_TIMEOUT_EVENT,
        handleSessionTimeout
      );

    };

  }, [
    showTimeout,
  ]);


  // ======================================================
  // LOGIN AGAIN
  // ======================================================

  const handleLoginAgain =
    () => {

      clearTokens();


      sessionStorage.removeItem(
        "challengeGroupId"
      );

      sessionStorage.removeItem(
        "maskedEmail"
      );

      sessionStorage.removeItem(
        "pinResetChallengeGroupId"
      );

      sessionStorage.removeItem(
        "pinResetMaskedEmail"
      );

      sessionStorage.removeItem(
        "verifiedPinResetChallengeGroupId"
      );


      setTimedOut(
        false
      );


      navigate(
        "/login",
        {
          replace: true,
        }
      );

    };


  return (

    <>

      {children}


      <SessionTimeoutModal
        open={timedOut}
        message={timeoutMessage}
        onLoginAgain={
          handleLoginAgain
        }
      />

    </>

  );

}


export default SessionTimeoutProvider;
