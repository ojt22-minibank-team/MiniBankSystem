import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  changeFirstLoginPassword
} from "../../../services/authService";

function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChangePassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    // 1. Empty check
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    // 2. Passwords must match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 3. Get challengeGroupId saved during login
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
        await changeFirstLoginPassword({
          challengeGroupId: challengeGroupId,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        });

      console.log(response);

      // Password change success
      navigate("/first-login/setup-pin");

    } catch (error: any) {

      setError(
        error.response?.data?.message ||
        "Password change failed."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Change Temporary Password</h2>

      <p>
        Please create a new password before continuing.
      </p>

      <form onSubmit={handleChangePassword}>

        <div>
          <label>New Password</label>

          <input
            type="password"
            value={newPassword}
            onChange={(e) =>
              setNewPassword(e.target.value)
            }
            placeholder="Enter new password"
          />
        </div>

        <div>
          <label>Confirm Password</label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            placeholder="Confirm new password"
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
            ? "Changing..."
            : "Change Password"}
        </button>

      </form>
    </div>
  );
}

export default ChangePasswordPage;