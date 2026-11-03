export const SESSION_TIMEOUT_EVENT =
  "minibank:session-timeout";


export interface SessionTimeoutDetail {
  message?: string;
  sourceGeneration: number;
  invalidatedGeneration: number;
}


export const dispatchSessionTimeout = (
  message: string | undefined,
  sourceGeneration: number,
  invalidatedGeneration: number
) => {

  window.dispatchEvent(
    new CustomEvent<SessionTimeoutDetail>(
      SESSION_TIMEOUT_EVENT,
      {
        detail: {
          message,
          sourceGeneration,
          invalidatedGeneration,
        },
      }
    )
  );

};
