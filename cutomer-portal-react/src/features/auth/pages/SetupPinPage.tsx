import { useState } from "react";

import {
  setupTransactionPin
} from "../../../services/authService";

import {
  saveTokens
} from "../../../utils/tokenStorage";

function SetupPinPage() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetupPin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (!pin || !confirmPin) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      setError("PIN must be exactly 6 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    const challengeGroupId =
      sessionStorage.getItem("challengeGroupId");

    if (!challengeGroupId) {
      setError(
        "Login session is missing. Please login again."
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await setupTransactionPin({
          challengeGroupId: challengeGroupId,
          pin: pin,
          confirmPin: confirmPin,
        });

      

      if (
        response.accessToken &&
        response.refreshToken
      ) {
        saveTokens(
          response.accessToken,
          response.refreshToken
        );
      }

      sessionStorage.removeItem(
        "challengeGroupId"
      );

      console.log(
        "First login security setup completed successfully."
      );

    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "PIN setup failed."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Setup Transaction PIN</h2>

      <p>
        Please create your 6-digit transaction PIN.
      </p>

      <form onSubmit={handleSetupPin}>

        <div>
          <label>Transaction PIN</label>

          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) =>
              setPin(
                e.target.value.replace(/\D/g, "")
              )
            }
            placeholder="Enter 6-digit PIN"
          />
        </div>

        <div>
          <label>Confirm PIN</label>

          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(
                e.target.value.replace(/\D/g, "")
              )
            }
            placeholder="Confirm 6-digit PIN"
          />
        </div>

        {error && (
          <p>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Setting PIN..."
            : "Setup PIN"}
        </button>

      </form>
    </div>
  );
}

export default SetupPinPage;