// src/features/reports/TransactionReport.tsx
import React, { useState } from 'react';
import { reportService } from '../../../services/ReportService';
import type { TransactionReportRequest } from '../../../types/reports/TransactionReportRequest';
// import { reportService } from '../../../services/reportService';
// import { TransactionReportRequest } from '../../types/report.types';

export const TransactionReport = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    transactionType: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Backend သို့ ပို့မည့် Data ကို ပြင်ဆင်ခြင်း
      const requestData: TransactionReportRequest = {
        fromDate: formData.fromDate ? new Date(formData.fromDate).toISOString() : new Date().toISOString(),
        toDate: formData.toDate ? new Date(formData.toDate).toISOString() : new Date().toISOString(),
        transactionType: formData.transactionType || undefined,
        limit: 100 // Default limit 
      };

      await reportService.downloadTransactionReport(requestData);
      
    } catch (error) {
      console.error('Failed to download report', error);
      alert('Report ထုတ်ရာတွင် အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-2xl font-bold mb-4">Transaction Report</h2>
      
      <form onSubmit={handleDownload} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label>From Date</label>
            <input 
              type="datetime-local" 
              name="fromDate" 
              value={formData.fromDate} 
              onChange={handleChange} 
              className="border p-2 rounded"
              required 
            />
          </div>
          <div className="flex flex-col">
            <label>To Date</label>
            <input 
              type="datetime-local" 
              name="toDate" 
              value={formData.toDate} 
              onChange={handleChange} 
              className="border p-2 rounded"
              required 
            />
          </div>
          <div className="flex flex-col">
            <label>Type</label>
            <select 
              name="transactionType" 
              value={formData.transactionType} 
              onChange={handleChange}
              className="border p-2 rounded"
            >
              <option value="">All Types</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAW">Withdraw</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-fit"
        >
          {loading ? 'Generating PDF...' : 'Download PDF Report'}
        </button>
      </form>
    </div>
  );
};