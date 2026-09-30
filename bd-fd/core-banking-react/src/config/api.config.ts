// Backend base URL — Spring Boot runs on port 8080
export const API_BASE_URL = 'http://localhost:8080';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },

  // Admin — (requires ADMIN role)
  ADMIN: {
    // Staff Management
    STAFF: '/api/admin/staff',
    STAFF_BY_ID: (id: string) => `/api/admin/staff/${id}`,
    STAFF_DEACTIVATE: (id: string) => `/api/admin/staff/${id}/deactivate`,
    STAFF_RESET_PASSWORD: (id: string) => `/api/admin/staff/${id}/reset-password`,
    STAFF_ROLE: (id: string) => `/api/admin/staff/${id}/role`,

    // Announcements
    ANNOUNCEMENTS: '/api/admin/announcements',
    ANNOUNCEMENT_BY_ID: (id: number) => `/api/admin/announcements/${id}`,
    ANNOUNCEMENT_DEACTIVATE: (id: number) => `/api/admin/announcements/${id}/deactivate`,

    // System Rules Configuration
    SYSTEM_RULES: {
      PARAMETERS: '/api/admin/system-rules/parameters',
      PARAMETER_BY_KEY: (key: string) => `/api/admin/system-rules/parameters/${encodeURIComponent(key)}`,
      FEES: '/api/admin/system-rules/fees',
      FEE_BY_ID: (id: number) => `/api/admin/system-rules/fees/${id}`,
      FEE_ACTIVATE: (id: number) => `/api/admin/system-rules/fees/${id}/activate`,
      FEE_DEACTIVATE: (id: number) => `/api/admin/system-rules/fees/${id}/deactivate`,
    },
  },

  // Customers (public)
  CUSTOMERS: '/api/customers',
  CUSTOMER_BY_CODE: (code: string) => `/api/customers/${code}`,

  // Accounts
  ACCOUNTS: '/api/accounts',
  ACCOUNT_BY_NUMBER: (num: string) => `/api/accounts/${num}`,
  ACCOUNTS_BY_CUSTOMER: (code: string) => `/api/accounts/customer/${code}`,

  // Transfers
  TRANSFER_P2P: '/api/transfers/p2p',

  // Announcements (active, for authenticated staff)
  ANNOUNCEMENTS: '/api/announcements',
} as const;

// localStorage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cb_access_token',
  REFRESH_TOKEN: 'cb_refresh_token',
  USERNAME: 'cb_username',
  ROLES: 'cb_roles',
} as const;
