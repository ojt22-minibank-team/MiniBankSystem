import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MerchantPaymentAuthorize } from '../features/merchant-payment/pages/MerchantPaymentAuthorize';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Routes>
          <Route path="/merchant-checkout" element={<MerchantPaymentAuthorize />} />
          <Route path="*" element={<MerchantPaymentAuthorize />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
