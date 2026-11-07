export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://42.156.32.114:8092";

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/api/auth/login",
    VERIFY_OTP: "/api/auth/verify-otp",
    RESEND_OTP: "/api/auth/resend-otp",
    LOGOUT: "/api/auth/logout",
    REFRESH: "/api/auth/refresh",
    STAFF_PASSWORD_SETUP_COMPLETE: "/api/auth/staff-password-setup/complete",
  },

  // Admin — (requires ADMIN role)
  ADMIN: {
    // Dashboard
    DASHBOARD_SUMMARY: "/api/admin/dashboard/summary",

    // Staff Management
    STAFF: "/api/admin/staff",
    STAFF_ROLES: "/api/admin/staff/roles",
    STAFF_BY_ID: (id: string) => `/api/admin/staff/${id}`,
    STAFF_DEACTIVATE: (id: string) => `/api/admin/staff/${id}/deactivate`,
    STAFF_RESET_PASSWORD: (id: string) =>
      `/api/admin/staff/${id}/reset-password`,
    STAFF_RESEND_SETUP_LINK: (id: string) =>
      `/api/admin/staff/${id}/password-setup-link`,
    STAFF_ROLE: (id: string) => `/api/admin/staff/${id}/role`,

    // Announcements
    ANNOUNCEMENTS: "/api/admin/announcements",
    ANNOUNCEMENT_BY_ID: (id: number) => `/api/admin/announcements/${id}`,
    ANNOUNCEMENT_DEACTIVATE: (id: number) =>
      `/api/admin/announcements/${id}/deactivate`,
    ANNOUNCEMENT_SOFT_DELETE: (id: number) =>
      `/api/admin/announcements/${id}/soft-delete`,
    ANNOUNCEMENT_BULK_SOFT_DELETE_EXPIRED:
      "/api/admin/announcements/bulk-soft-delete-expired",

    // System Rules Configuration
    SYSTEM_RULES: {
      PARAMETERS: "/api/admin/system-rules/parameters",
      PARAMETER_BY_KEY: (key: string) =>
        `/api/admin/system-rules/parameters/${encodeURIComponent(key)}`,
      FEES: "/api/admin/system-rules/fees",
      FEE_BY_ID: (id: number) => `/api/admin/system-rules/fees/${id}`,
      FEE_ACTIVATE: (id: number) =>
        `/api/admin/system-rules/fees/${id}/activate`,
      FEE_DEACTIVATE: (id: number) =>
        `/api/admin/system-rules/fees/${id}/deactivate`,
    },
  },

  // Customers
  CUSTOMERS: "/api/customers",
  CUSTOMER_BY_CODE: (code: string) => `/api/customers/${code}`,

  // Accounts
  ACCOUNTS: "/api/accounts",
  ACCOUNT_BY_NUMBER: (num: string) => `/api/accounts/${num}`,
  ACCOUNTS_BY_CUSTOMER: (code: string) => `/api/accounts/customer/${code}`,
  ACCOUNT_STATUS: (num: string) => `/api/accounts/${num}/status`,

  // Transfers
  TRANSFER_P2P: "/api/transfers/p2p",

  // Staff Profile
  STAFF_PROFILE: {
    ME: "/api/staff/profile",
    CHANGE_PASSWORD: "/api/staff/profile/change-password",
  },

  // Over-the-Counter (OTC) Transactions
  OTC: {
    DEPOSIT: "/api/transactions/otc/deposit",
    WITHDRAW: "/api/transactions/otc/withdraw",
    PARAMETERS: "/api/transactions/otc/parameters",
    CHECK_REFERENCE: "/api/transactions/otc/check-reference",
    ACCOUNT_LIMITS: "/api/transactions/otc/account-limits",
    CALCULATE_FEE: "/api/transactions/otc/calculate-fee",
  },

  // Teller Operations
  TELLER: {
    DAILY_CASH_SUMMARY: "/api/v1/teller/daily-cash-summary",
  },

  // Announcements (active, for authenticated staff / all)
  ANNOUNCEMENTS: "/api/announcements",

  // Staff Audit Trail Logs
  AUDIT_LOGS: {
    BASE: "/api/v1/staff/audit-logs",
    BY_ID: (id: number | string) => `/api/v1/staff/audit-logs/${id}`,
  },

  // Staff Transaction Management & Details
  STAFF_TRANSACTIONS: {
    BASE: "/api/v1/staff/transactions",
    BY_IDENTIFIER: (id: string) =>
      `/api/v1/staff/transactions/detail/${encodeURIComponent(id)}`,
    STATS: "/api/v1/staff/transactions/stats",
    FLAG: (transactionId: string) =>
      `/api/v1/staff/transactions/${transactionId}/flag`,
    OVERRIDE: (transactionId: string) =>
      `/api/v1/staff/transactions/${transactionId}/override`,
    REVIEW_QUEUE: "/api/v1/staff/transactions/review-queue",
    REVIEW_HISTORY: (transactionId: string) =>
      `/api/v1/staff/transactions/${transactionId}/review-history`,
  },
} as const;

// localStorage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "cb_access_token",
  REFRESH_TOKEN: "cb_refresh_token",
  USERNAME: "cb_username",
  ROLES: "cb_roles",
  STAFF_PROFILE: "cb_staff_profile",
} as const;
