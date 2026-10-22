import { useNavigate } from "react-router-dom";
import { logoutCorporate } from "../api/auth";
import CorporateAuthCard from "../components/CorporateAuthCard";
import { CorporateNotice, CorporateSubmit } from "../components/CorporateForm";
import { useCorporateAction } from "../hooks/useCorporateAction";

export default function CorporateAuthSuccessPage() {
  const navigate = useNavigate();
  const action = useCorporateAction();
  return <CorporateAuthCard title="Corporate authentication successful" description="Corporate Dashboard integration is pending.">
    <p className="mb-6 text-sm leading-6 text-slate-500">You have securely signed in to Corporate Banking.</p>
    <form onSubmit={event => {
      event.preventDefault();
      void action.run(async () => {
        if (await logoutCorporate()) await navigate("/corporate/login", { replace: true });
      });
    }} className="space-y-5"><CorporateNotice error message={action.error} /><CorporateSubmit busy={action.busy}>Corporate Logout</CorporateSubmit></form>
  </CorporateAuthCard>;
}
