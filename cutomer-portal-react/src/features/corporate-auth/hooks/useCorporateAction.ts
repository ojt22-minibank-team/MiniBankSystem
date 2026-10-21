import { useRef, useState } from "react";
import { corporateErrorMessage } from "../api/client";

export function useCorporateAction() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (failure) { setError(corporateErrorMessage(failure)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return { busy, error, setError, run };
}
