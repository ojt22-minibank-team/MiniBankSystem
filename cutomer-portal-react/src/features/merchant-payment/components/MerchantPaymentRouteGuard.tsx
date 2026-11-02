import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasTokens } from '../../../utils/tokenStorage';

export const MerchantPaymentRouteGuard: React.FC = () => {
  const location = useLocation();
  const authenticated = hasTokens();

  if (!authenticated) {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    if (token) {
      const returnUrl = `/checkout?token=${encodeURIComponent(token)}`;
      sessionStorage.setItem('redirectUrl', returnUrl);
      sessionStorage.setItem('paymentToken', token);
    }

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default MerchantPaymentRouteGuard;
