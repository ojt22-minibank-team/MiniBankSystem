import { Outlet } from "react-router-dom";
import CorporateSessionTimeoutProvider from "./CorporateSessionTimeoutProvider";

export default function CorporateProtectedRoute() {
  return <CorporateSessionTimeoutProvider><Outlet /></CorporateSessionTimeoutProvider>;
}
