import {
  Navigate,
  Outlet,
} from "react-router-dom";

import {
  hasTokens,
} from "../../../utils/tokenStorage";


function ProtectedRoute() {

  const authenticated = hasTokens();

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}


export default ProtectedRoute;