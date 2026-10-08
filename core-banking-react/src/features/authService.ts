import axios from 'axios';

// Backend Server URL (လိုအပ်ပါက 42.156.32.114:4405 သို့မဟုတ် localhost:8080 သို့ ပြောင်းနိုင်ပါသည်)
const API_BASE_URL = 'http://localhost:8080';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username?: string;
  role?: string;
  fullName?: string;
}

/**
 * Staff Username/Password ဖြင့် Login ဝင်ရောက်ပြီး Token ရယူခြင်း
 */
export const loginStaff = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await axios.post<LoginResponse>(`${API_BASE_URL}/api/auth/login`, credentials);

  // Login အောင်မြင်ပါက JWT Token ကို Browser LocalStorage တွင် သိမ်းဆည်းခြင်း
  if (response.data && response.data.token) {
    localStorage.setItem('token', response.data.token);
    if (response.data.username) {
      localStorage.setItem('staff_user', JSON.stringify(response.data));
    }
  }

  return response.data;
};

/**
 * စနစ်မှ ထွက်ခွာခြင်း (Logout)
 */
export const logoutStaff = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('staff_user');
};