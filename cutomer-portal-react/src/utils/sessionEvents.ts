export const SESSION_TIMEOUT_EVENT =
  "minibank:session-timeout";


export interface SessionTimeoutDetail {
  message?: string;
}


export const dispatchSessionTimeout = (
  message?: string
) => {

  window.dispatchEvent(
    new CustomEvent<SessionTimeoutDetail>(
      SESSION_TIMEOUT_EVENT,
      {
        detail: {
          message,
        },
      }
    )
  );

};