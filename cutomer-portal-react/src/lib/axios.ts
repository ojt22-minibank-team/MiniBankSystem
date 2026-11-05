import axios from 'axios';

// ၁။ Axios Instance ကို တည်ဆောက်ခြင်း
export const axiosInstance = axios.create({
  // Spring Boot backend ရဲ့ URL (Vite environment variable သုံးထားရင် import.meta.env.VITE_API_URL လို့ ပြောင်းနိုင်ပါတယ်)
  baseURL: 'http://localhost:8080', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// ၂။ Request Interceptor (API မပို့ခင်တိုင်း Token အလိုအလျောက် ထည့်ပေးရန်)
axiosInstance.interceptors.request.use(
  (config) => {
    // မှတ်ချက်: မိမိ project ရဲ့ utils/tokenStorage.ts ကနေ token ယူတဲ့ logic နဲ့ အစားထိုးနိုင်ပါတယ်။
    const token = localStorage.getItem('token'); // သို့မဟုတ် sessionStorage
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ၃။ Response Interceptor (Backend ကနေ Error ပြန်လာပါက Global Handle လုပ်ရန်)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 401 Unauthorized ဖြစ်ခဲ့ရင် (ဥပမာ - Token သက်တမ်းကုန်သွားရင်)
    if (error.response?.status === 401) {
      console.error('Unauthorized: Token may be expired or invalid.');
      // Token ကို ဖျက်ပြီး Login page ကို ပြန်ပို့တဲ့ logic ဒီမှာ ရေးနိုင်ပါတယ်။
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);