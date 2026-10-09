import { P2PTransferForm } from "../components/P2PTransferForm";

export default function TransferPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Transfer &amp; Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Send money securely to any account
        </p>
      </div>
      <P2PTransferForm />
    </div>
  );
}
