import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MerchantCheckout } from '../features/merchant-payment/MerchantCheckout';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Routes>
          <Route path="/merchant-checkout" element={<MerchantCheckout />} />
          <Route path="*" element={<MerchantCheckout />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
