// ✅ project ရဲ့ main api client ကို သုံးမည် (config/api.ts)
// - sessionStorage ကနေ accessToken ကို မှန်ကန်စွာ ယူပြီး
// - token refresh interceptor ပါဝင်သည်
import api from '../../../config/api';

import type { P2PTransferRequest, P2PTransferResponse } from '../types/transfer.types';

export const executeP2PTransfer = async (
  transferData: P2PTransferRequest
): Promise<P2PTransferResponse> => {
  // config/api.ts ရဲ့ baseURL = http://localhost:8080/api/customer
  // full URL = http://localhost:8080/api/customer/transfers/p2p
  //
  // Note: Idempotency-Key header ကို မပို့ဘဲ request body ထဲ
  // idempotencyKey field ထည့်ထားသည် — backend controller က
  // header မရှိရင် body field ကနေ fallback ယူမည်
  const response = await api.post<P2PTransferResponse>(
    '/transfers/p2p',
    transferData
  );
  return response.data;
};
