// src/services/reportService.ts
import axiosInstance from "../lib/axios";
import type { TransactionReportRequest } from "../types/reports/TransactionReportRequest";
//import { TransactionReportRequest } from '../types/report.types';

export const reportService = {
  downloadTransactionReport: async (params: TransactionReportRequest) => {
    // API endpoint သည် Backend Controller တွင်ရေးထားသော လမ်းကြောင်းဖြစ်ရမည်
    const response = await axiosInstance.post(
      "/api/reports/transactions/pdf",
      params,
      {
        responseType: "blob", // PDF binary data လက်ခံရန် အရေးကြီးသည်
      },
    );

    // Blob မှတဆင့် File Download ပြုလုပ်ခြင်း
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    // Download လုပ်မည့် ဖိုင်အမည်သတ်မှတ်ခြင်း
    link.setAttribute(
      "download",
      `Transaction_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
