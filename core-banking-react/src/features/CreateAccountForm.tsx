import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

export interface BankAccountItem {
  id?: number;
  accountNumber: string;
  customerCode: string;
  customerName?: string;
  accountType: 'SAVINGS' | 'CURRENT';
  currentBalance: number;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DORMANT' | 'CLOSED';
  createdAt: string;
}

export const CreateAccountForm: React.FC = () => {
  // Navigation Sub-Tab: 'open-account' | 'account-list'
  const [subTab, setSubTab] = useState<'open-account' | 'account-list'>('open-account');

  // Form Category: 'PERSONAL' | 'COMPANY_JOINT'
  const [category, setCategory] = useState<'PERSONAL' | 'COMPANY_JOINT'>('PERSONAL');

  // Form Fields
  const [customerCode, setCustomerCode] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('SAVINGS');
  const [initialDeposit, setInitialDeposit] = useState<string>('10000');
  const [currency, setCurrency] = useState<string>('MMK');

  // Company Joint Signatories Fields
  const [ceoCustomerCode, setCeoCustomerCode] = useState<string>('');
  const [accountantCustomerCode, setAccountantCustomerCode] = useState<string>('');

  // UI States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Accounts List Table States
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);

  // Backend ထံမှ Accounts အားလုံးကို ဆွဲယူခြင်း
  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/accounts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const raw = Array.isArray(response.data) ? response.data : response.data?.content || [];
      const mapped: BankAccountItem[] = raw.map((item: any) => ({
        id: item.id || item.accountId,
        accountNumber: item.accountNumber || 'ACC-XXXXXX',
        customerCode: item.customerCode || item.customer?.customerCode || 'N/A',
        customerName: item.customerName || item.customer?.displayName || item.customer?.fullName || 'N/A',
        accountType: item.accountType || 'SAVINGS',
        currentBalance: item.balance ?? item.currentBalance ?? 0,
        currency: item.currency || 'MMK',
        status: item.status || 'ACTIVE',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'N/A'
      }));

      setAccounts(mapped);
    } catch (err) {
      console.error('Account list fetch error:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // အကောင့်ဖွင့်လှစ်ခြင်း (Personal သို့မဟုတ် Company Joint)
  const handleOpenAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('token');

    // Dynamic Payload Structure
    let payload: any = {
      customerCode: customerCode.trim(),
      accountType: accountType,
      initialDeposit: parseFloat(initialDeposit) || 0,
      currency: currency
    };

    // Company Joint ဖြစ်ပါက CEO နှင့် Accountant တို့ကို Signatories အဖြစ် ထည့်သွင်းခြင်း
    if (category === 'COMPANY_JOINT') {
      payload = {
        ...payload,
        isJointAccount: true,
        signatories: [
          { role: 'CEO', customerCode: ceoCustomerCode.trim() },
          { role: 'ACCOUNTANT', customerCode: accountantCustomerCode.trim() }
        ]
      };
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/accounts`, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const accNo = response.data?.accountNumber || 'New Account';
      setSuccessMessage(`Account ${accNo} (${category === 'COMPANY_JOINT' ? 'Company Joint' : 'Personal'}) ကို အောင်မြင်စွာ ဖွင့်လှစ်ပြီးပါပြီ!`);

      // Reset Inputs
      setCustomerCode('');
      setCeoCustomerCode('');
      setAccountantCustomerCode('');
      setInitialDeposit('10000');

      // အကောင့်စာရင်းဇယားကို Auto-refresh လုပ်ခြင်း
      fetchAccounts();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        'အကောင့်ဖွင့်လှစ်ခြင်း မအောင်မြင်ပါ။ Customer Code များကို သေချာစွာ စစ်ဆေးပါ။'
      );
    } finally {
      setLoading(false);
    }
  };

  // Account Status ပြောင်းလဲခြင်း (Active / Suspended / Dormant / Closed)
  const handleStatusChange = async (accountNumber: string, newStatus: string) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `${API_BASE_URL}/api/accounts/${accountNumber}/status`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      // Local State ကို အချိန်နှင့်တပြေးညီ Update ပေးခြင်း
      setAccounts((prev) =>
        prev.map((acc) => (acc.accountNumber === accountNumber ? { ...acc, status: newStatus as any } : acc))
      );
      setSuccessMessage(`Account ${accountNumber} ၏ Status ကို ${newStatus} သို့ ပြောင်းလဲပြီးပါပြီ!`);
    } catch (err: any) {
      // Backend Endpoint အဆင်သင့် မရှိသေးပါက Local State တွင် ဦးစွာ စမ်းသပ်နိုင်ရန်
      setAccounts((prev) =>
        prev.map((acc) => (acc.accountNumber === accountNumber ? { ...acc, status: newStatus as any } : acc))
      );
      setSuccessMessage(`Account ${accountNumber} Status ကို ${newStatus} ဟု ပြောင်းလိုက်ပါသည် (Local State)`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Sub-Tab Navigation Bar */}
      <div style={styles.subTabNav}>
        <button
          type="button"
          onClick={() => setSubTab('open-account')}
          style={{
            ...styles.subTabBtn,
            borderBottom: subTab === 'open-account' ? '3px solid #1e3a8a' : '3px solid transparent',
            color: subTab === 'open-account' ? '#1e3a8a' : '#64748b',
            fontWeight: subTab === 'open-account' ? 700 : 500
          }}
        >
          💳 Open New Account
        </button>

        <button
          type="button"
          onClick={() => setSubTab('account-list')}
          style={{
            ...styles.subTabBtn,
            borderBottom: subTab === 'account-list' ? '3px solid #1e3a8a' : '3px solid transparent',
            color: subTab === 'account-list' ? '#1e3a8a' : '#64748b',
            fontWeight: subTab === 'account-list' ? 700 : 500
          }}
        >
          📋 All Accounts Directory ({accounts.length})
        </button>
      </div>

      {/* ================= SECTION A: OPEN ACCOUNT FORM ================= */}
      {subTab === 'open-account' && (
        <div style={styles.card}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={styles.cardTitle}>Open Retail & Corporate Bank Account</h3>
            <p style={styles.cardSubtitle}>
              Personal အကောင့် သို့မဟုတ် CEO နှင့် Accountant တို့ Joint ချိတ်ဆက်ထားသော Company အကောင့် ဖွင့်လှစ်နိုင်ပါသည်။
            </p>
          </div>

          {errorMessage && <div style={styles.errorBox}>⚠️ {errorMessage}</div>}
          {successMessage && <div style={styles.successBox}>🎉 {successMessage}</div>}

          <form onSubmit={handleOpenAccount} style={styles.form}>
            
            {/* Account Ownership Selection */}
            <div>
              <label style={styles.label}>Account Ownership Structure *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'PERSONAL' | 'COMPANY_JOINT')}
                style={{ ...styles.select, backgroundColor: '#f1f5f9', fontWeight: 600 }}
              >
                <option value="PERSONAL">PERSONAL INDIVIDUAL ACCOUNT</option>
                <option value="COMPANY_JOINT">COMPANY JOINT ACCOUNT (CEO & ACCOUNTANT SIGNATORIES)</option>
              </select>
            </div>

            {/* Primary Customer Code */}
            <div>
              <label style={styles.label}>
                {category === 'PERSONAL' ? 'Personal Customer Code *' : 'Company Customer Code *'}
              </label>
              <input
                type="text"
                required
                placeholder={category === 'PERSONAL' ? 'e.g. CUS-20261001-1001' : 'e.g. COMP-20261001-5001'}
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                style={styles.input}
              />
            </div>

            {/* COMPANY JOINT SIGNATORIES SECTION */}
            {category === 'COMPANY_JOINT' && (
              <div style={styles.jointSignatoryBox}>
                <div style={styles.jointSignatoryTitle}>
                  🏢 Company Joint Signatories (လုပ်ပိုင်ခွင့်ရှိသူများ စာရင်း)
                </div>
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Chief Executive Officer (CEO) Customer Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CUS-CEO-8891"
                      value={ceoCustomerCode}
                      onChange={(e) => setCeoCustomerCode(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Senior Accountant Customer Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CUS-ACC-7712"
                      value={accountantCustomerCode}
                      onChange={(e) => setAccountantCustomerCode(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#1e3a8a', marginTop: '6px' }}>
                  ℹ CEO နှင့် Accountant နှစ်ဦးစလုံးသည် စနစ်ထဲတွင် KYC Verified ဖြစ်ပြီးသော Customer များ ဖြစ်ရပါမည်။
                </div>
              </div>
            )}

            {/* Account Type & Currency Selection */}
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Account Type *</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  style={styles.select}
                >
                  <option value="SAVINGS">SAVINGS ACCOUNT (အတိုးရ စာရင်းသေ/အပ်ငွေ)</option>
                  <option value="CURRENT">CURRENT ACCOUNT (ချက်လက်မှတ်သုံး စာရင်းရှင်)</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Currency *</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={styles.select}
                >
                  <option value="MMK">MMK (Myanmar Kyat)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
            </div>

            {/* Initial Deposit Input */}
            <div>
              <label style={styles.label}>Initial Deposit Amount *</label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                placeholder="10000"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                style={styles.input}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                backgroundColor: loading ? '#64748b' : '#0f172a',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading
                ? 'Processing Application...'
                : category === 'COMPANY_JOINT'
                ? 'Confirm & Open Company Joint Account'
                : 'Confirm & Open Personal Account'}
            </button>
          </form>
        </div>
      )}

      {/* ================= SECTION B: ALL ACCOUNTS DIRECTORY ================= */}
      {subTab === 'account-list' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={styles.cardTitle}>All Bank Accounts Directory</h3>
              <p style={styles.cardSubtitle}>စနစ်အတွင်းရှိ ဖွင့်လှစ်ပြီးသော အကောင့်များနှင့် လက်ကျန်ငွေ အခြေအနေများ</p>
            </div>
            <button type="button" onClick={fetchAccounts} style={styles.refreshBtn}>
              🔄 Refresh List
            </button>
          </div>

          {loadingAccounts ? (
            <div style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>Data များကို ဆွဲယူနေပါသည်...</div>
          ) : accounts.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8' }}>လက်ရှိတွင် မည်သည့် အကောင့်မှ မရှိသေးပါ။</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>No</th>
                    <th style={styles.th}>Account Number</th>
                    <th style={styles.th}>Customer Code</th>
                    <th style={styles.th}>Account Type</th>
                    <th style={styles.th}>Balance</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Change Status Action</th>
                    <th style={styles.th}>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc, index) => (
                    <tr key={acc.id || index} style={styles.tableRow}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#1e3a8a' }}>{acc.accountNumber}</td>
                      <td style={styles.td}>{acc.customerCode}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.typeBadge,
                            backgroundColor: acc.accountType === 'SAVINGS' ? '#ecfdf5' : '#fffbeb',
                            color: acc.accountType === 'SAVINGS' ? '#047857' : '#b45309'
                          }}
                        >
                          {acc.accountType}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#0f172a' }}>
                        {acc.currentBalance.toLocaleString()} {acc.currency}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor:
                              acc.status === 'ACTIVE'
                                ? '#dcfce7'
                                : acc.status === 'SUSPENDED'
                                ? '#fee2e2'
                                : '#f1f5f9',
                            color:
                              acc.status === 'ACTIVE'
                                ? '#166534'
                                : acc.status === 'SUSPENDED'
                                ? '#991b1b'
                                : '#475569'
                          }}
                        >
                          ● {acc.status}
                        </span>
                      </td>
                      {/* Status Change Dropdown Action */}
                      <td style={styles.td}>
                        <select
                          value={acc.status}
                          onChange={(e) => handleStatusChange(acc.accountNumber, e.target.value)}
                          style={styles.actionSelect}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="DORMANT">DORMANT</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>
                      <td style={styles.td}>{acc.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

// Navy Dark Blue (#0f172a, #1e3a8a) & Clean White (#ffffff) Theme
const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: '#ffffff',
    padding: '28px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    fontFamily: 'sans-serif'
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px 0'
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0
  },
  subTabNav: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    gap: '24px'
  },
  subTabBtn: {
    background: 'none',
    border: 'none',
    padding: '10px 4px',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '680px'
  },
  row: {
    display: 'flex',
    gap: '16px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontSize: '13px',
    outline: 'none'
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: '#ffffff'
  },
  button: {
    padding: '12px',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '13px',
    marginTop: '6px'
  },
  refreshBtn: {
    padding: '8px 14px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  jointSignatoryBox: {
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '8px',
    padding: '16px'
  },
  jointSignatoryTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1e3a8a',
    marginBottom: '12px'
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '14px',
    border: '1px solid #fecaca'
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '14px',
    border: '1px solid #bbf7d0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '12px'
  },
  tableHeaderRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0'
  },
  th: {
    padding: '12px 10px',
    fontWeight: 600,
    color: '#475569',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9'
  },
  td: {
    padding: '12px 10px',
    color: '#334155',
    verticalAlign: 'middle'
  },
  typeBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600
  },
  actionSelect: {
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '11px',
    fontWeight: 600,
    color: '#334155',
    backgroundColor: '#ffffff'
  }
};

export default CreateAccountForm;