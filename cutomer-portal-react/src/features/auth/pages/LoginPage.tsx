import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginCustomer } from "../../../services/authService";

function LoginPage() {
  const navigate = useNavigate();

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await loginCustomer({
        loginIdentifier: loginIdentifier,
        password: password,
      });

      console.log(response);

      if (response.otpRequired) {
        sessionStorage.setItem(
          "challengeGroupId",
          response.challengeGroupId
        );

        navigate("/otp");
      }

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h2>Customer Login</h2>

      <form onSubmit={handleLogin}>
        <div>
          <label>Customer ID or Account Number</label>

          <input
            type="text"
            value={loginIdentifier}
            onChange={(e) =>
              setLoginIdentifier(e.target.value)
            }
          />
        </div>

        <div>
          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />
        </div>

        <button type="submit">
          Login
        </button>
      </form>
    </div>
  );
}

export default LoginPage;