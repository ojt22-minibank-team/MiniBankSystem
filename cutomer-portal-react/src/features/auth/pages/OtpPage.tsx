import { useState } from "react";
import { verifyOtp } from "../../../services/authService";
import { useNavigate } from "react-router-dom";
import { saveTokens } from "../../../utils/tokenStorage";

function OtpPage() {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const handleVerifyOtp = async () => {
    const challengeGroupId =
      sessionStorage.getItem("challengeGroupId");

    if (!challengeGroupId) {
      console.log("challengeGroupId not found");
      return;
    }

    try {
      const response = await verifyOtp({
        challengeGroupId: challengeGroupId,
        otp: otp,
      });

      console.log(response);

      if (
        response.accessToken &&
        response.refreshToken
      ) {
        saveTokens(
          response.accessToken,
          response.refreshToken
        );

        sessionStorage.removeItem(
          "challengeGroupId"
        );

        console.log("Login security flow completed successfully.");
      }

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h2>Verify OTP</h2>

      <p>
        Enter the 6-digit OTP sent to your registered email.
      </p>

      <input
        type="text"
        maxLength={6}
        value={otp}
        onChange={(e) =>
          setOtp(e.target.value)
        }
        placeholder="Enter OTP"
      />

      <button onClick={handleVerifyOtp}>
        Verify OTP
      </button>
    </div>
  );
}

export default OtpPage;