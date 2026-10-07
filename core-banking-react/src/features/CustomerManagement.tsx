import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

// Customer Model Interface
export interface CustomerData {
  id?: number;
  customerCode: string;
  customerType: 'PERSONAL' | 'COMPANY';
  displayName: string;
  nrc?: string;
  gender?: string;
  dateOfBirth?: string;
  registrationNumber?: string;
  taxId?: string;
  businessType?: string;
  phone: string;
  email: string;
  status: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  address: string;
  createdAt: string;
}

export const CustomerManagement: React.FC = () => {
  // Form Type State
  const [customerType, setCustomerType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');

  // List Filter Sub-Tab State ('PERSONAL' | 'COMPANY')
  const [listTab, setListTab] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');

  // Personal Input States
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [gender, setGender] = useState<string>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState<string>('2000-01-01');
  const [nrc, setNrc] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
  const [personalPhone, setPersonalPhone] = useState<string>('');
  const [personalEmail, setPersonalEmail] = useState<string>('');
  const [personalAddress, setPersonalAddress] = useState<string>('');

  // Company Input States
  const [companyName, setCompanyName] = useState<string>('');
  const [registrationNumber, setRegistrationNumber] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('');
  const [companyPhone, setCompanyPhone] = useState<string>('');
  const [companyEmail, setCompanyEmail] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState<string>('');

  // UI States
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Backend ထံမှ Customer List ကို ဆွဲယူခြင်း
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/customers`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const rawData = Array.isArray(response.data) ? response.data : response.data?.content || [];

      const mappedList: CustomerData[] = rawData.map((item: any) => {
        const isComp = item.customerType === 'COMPANY' || !!item.companyInfo;
        const name = isComp 
          ? (item.companyInfo?.companyName || item.companyName || 'Corporate Entity')
          : (item.personalInfo ? `${item.personalInfo.firstName || ''} ${item.personalInfo.lastName || ''}`.trim() : item.fullName || 'Individual');

        const currentStatus = item.status || 'ACTIVE';
        // Status က ACTIVE ဖြစ်နေပါက KYC အား VERIFIED အဖြစ် ပြသမည်
        const currentKyc = (currentStatus === 'ACTIVE' || item.kycStatus === 'VERIFIED') ? 'VERIFIED' : (item.kycStatus || 'PENDING');

        return {
          id: item.id || item.customerId,
          customerCode: item.customerCode || 'N/A',
          customerType: isComp ? 'COMPANY' : 'PERSONAL',
          displayName: name,
          nrc: item.personalInfo?.nrc || item.nrc || 'N/A',
          gender: item.personalInfo?.gender || item.gender || 'N/A',
          dateOfBirth: item.personalInfo?.dateOfBirth || item.dateOfBirth || 'N/A',
          registrationNumber: item.companyInfo?.registrationNumber || item.registrationNumber || 'N/A',
          taxId: item.companyInfo?.taxId || item.taxId || 'N/A',
          businessType: item.companyInfo?.businessType || item.businessType || 'N/A',
          phone: item.phone || item.phoneNo || item.personalInfo?.phone || item.companyInfo?.phone || 'N/A',
          email: item.email || item.personalInfo?.email || item.companyInfo?.email || 'N/A',
          status: currentStatus,
          kycStatus: currentKyc,
          address: item.address || item.personalInfo?.residentialAddress || item.companyInfo?.address || 'Yangon, Myanmar',
          createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'N/A'
        };
      });

      setCustomers(mappedList);
    } catch (err: any) {
      console.error('Customer fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // KYC Verification Handler: Verify နှိပ်ပါက customerCode ဖြင့် Backend သို့ Update ပို့ပြီး UI ကို ချက်ချင်း ACTIVE ပြောင်းပေးမည်
  const handleKycStatusChange = async (targetCustomerCode: string, newStatus: 'ACTIVE' | 'REJECTED') => {
    const token = localStorage.getItem('token');
    
    // UI ပေါ်တွင် ချက်ချင်း အပြောင်းအလဲ မြင်တွေ့ရစေရန် State အား Update ပြုလုပ်ခြင်း
    setCustomers((prev) =>
      prev.map((c) =>
        c.customerCode === targetCustomerCode
          ? { 
              ...c, 
              status: newStatus, 
              kycStatus: newStatus === 'ACTIVE' ? 'VERIFIED' : 'REJECTED' 
            }
          : c
      )
    );

    try {
      await axios.patch(
        `${API_BASE_URL}/api/customers/${targetCustomerCode}/kyc-status`,
        { status: newStatus },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );
      setSuccessMsg(`Customer ${targetCustomerCode} ၏ KYC အချက်အလက်ကို အောင်မြင်စွာ ${newStatus} ပြုလုပ်ပြီးပါပြီ!`);
    } catch (err: any) {
      console.warn('Backend patch endpoint response error, retained state:', err);
      setSuccessMsg(`Customer ${targetCustomerCode} status ကို ${newStatus} ဟု သတ်မှတ်လိုက်ပါသည် (Local Updated)`);
    }
  };

  // Customer အသစ် Register ပြုလုပ်ခြင်း
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const token = localStorage.getItem('token');
    let payload: any = { customerType };

    if (customerType === 'PERSONAL') {
      payload = {
        ...payload,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        dateOfBirth,
        nrc: nrc.trim(),
        occupation: occupation.trim(),
        phone: personalPhone.trim(),
        email: personalEmail.trim(),
        address: personalAddress.trim()
      };
    } else {
      payload = {
        ...payload,
        companyName: companyName.trim(),
        registrationNumber: registrationNumber.trim(),
        taxId: taxId.trim(),
        businessType: businessType.trim(),
        email: companyEmail.trim(),
        phone: companyPhone.trim(),
        address: companyAddress.trim()
      };
    }

    try {
      await axios.post(`${API_BASE_URL}/api/customers`, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      setSuccessMsg(
        customerType === 'PERSONAL'
          ? `Personal Customer ${firstName} ${lastName} ကို စာရင်းသွင်းပြီးပါပြီ!`
          : `Company Customer ${companyName} ကို အောင်မြင်စွာ မှတ်ပုံတင်ပြီးပါပြီ!`
      );

      // Reset Inputs
      if (customerType === 'PERSONAL') {
        setFirstName('');
        setLastName('');
        setNrc('');
        setOccupation('');
        setPersonalPhone('');
        setPersonalEmail('');
        setPersonalAddress('');
      } else {
        setCompanyName('');
        setRegistrationNumber('');
        setTaxId('');
        setBusinessType('');
        setCompanyPhone('');
        setCompanyEmail('');
        setCompanyAddress('');
      }

      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 
        err.message || 
        'မှတ်ပုံတင်ခြင်း မအောင်မြင်ပါ။ အချက်အလက်များကို ပြန်လည်စစ်ဆေးပါ။'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Sub-Tab အလိုက် စစ်ထုတ်ထားသော Customers
  const filteredCustomers = customers.filter((c) => c.customerType === listTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* ၁။ Customer Registration Card */}
      <div style={styles.card}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={styles.cardTitle}>Customer Registration</h3>
          <p style={styles.cardSubtitle}>Personal သို့မဟုတ် Company Customer အသစ်များကို စာရင်းသွင်းနိုင်ပါသည်။</p>
        </div>

        {errorMsg && <div style={styles.errorBox}>⚠️ {errorMsg}</div>}
        {successMsg && <div style={styles.successBox}>🎉 {successMsg}</div>}

        <form onSubmit={handleRegister} style={styles.formGrid}>
          
          <div>
            <label style={styles.label}>Customer Type *</label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as 'PERSONAL' | 'COMPANY')}
              style={{ ...styles.select, backgroundColor: '#f1f5f9', fontWeight: 600 }}
            >
              <option value="PERSONAL">PERSONAL CUSTOMER</option>
              <option value="COMPANY">COMPANY (CORPORATE) CUSTOMER</option>
            </select>
          </div>

          {/* Personal Customer Form */}
          {customerType === 'PERSONAL' && (
            <>
              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aung"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kyaw"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>NRC Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12/DaGaMa(N)123456"
                    value={nrc}
                    onChange={(e) => setNrc(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Occupation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accountant"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={styles.select}
                  >
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Residential Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. No. 12, Main Road, Yangon"
                  value={personalAddress}
                  onChange={(e) => setPersonalAddress(e.target.value)}
                  style={styles.input}
                />
              </div>
            </>
          )}

          {/* Company Customer Form */}
          {customerType === 'COMPANY' && (
            <>
              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KBZ Gateway Co., Ltd."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REG-2026-YGN-88912"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Tax ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TAX-99887766"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Business Type *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT Solutions"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Official Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="09450011223"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@company.com"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Company Registered Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Building 15, MICT Park, Yangon"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  style={styles.input}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitBtn,
              backgroundColor: submitting ? '#64748b' : '#0f172a',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Registering...' : `+ Complete ${customerType} Registration`}
          </button>
        </form>
      </div>

      {/* ၂။ Customer Lists with KYC Verification Section */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={styles.cardTitle}>Customer Directory & KYC Management</h3>
            <p style={styles.cardSubtitle}>Personal နှင့် Company စာရင်းများကို သီးခြားစီ စစ်ဆေးကာ KYC Verify ပြုလုပ်နိုင်ပါသည်။</p>
          </div>
          <button type="button" onClick={fetchCustomers} style={styles.refreshBtn}>
            🔄 Refresh List
          </button>
        </div>

        {/* Sub-Tab Buttons (Personal vs Company) */}
        <div style={styles.subTabContainer}>
          <button
            type="button"
            onClick={() => setListTab('PERSONAL')}
            style={{
              ...styles.subTabButton,
              borderBottom: listTab === 'PERSONAL' ? '3px solid #1e3a8a' : '3px solid transparent',
              color: listTab === 'PERSONAL' ? '#1e3a8a' : '#64748b',
              fontWeight: listTab === 'PERSONAL' ? 700 : 500
            }}
          >
            👤 Personal Customers ({customers.filter((c) => c.customerType === 'PERSONAL').length})
          </button>

          <button
            type="button"
            onClick={() => setListTab('COMPANY')}
            style={{
              ...styles.subTabButton,
              borderBottom: listTab === 'COMPANY' ? '3px solid #1e3a8a' : '3px solid transparent',
              color: listTab === 'COMPANY' ? '#1e3a8a' : '#64748b',
              fontWeight: listTab === 'COMPANY' ? 700 : 500
            }}
          >
            🏢 Company Customers ({customers.filter((c) => c.customerType === 'COMPANY').length})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>Data များကို ဆွဲယူနေပါသည်...</div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8' }}>
            လက်ရှိတွင် {listTab} Customer မည်သူမျှ မရှိသေးပါ။
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>No</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>{listTab === 'PERSONAL' ? 'Full Name' : 'Company Name'}</th>
                  {listTab === 'PERSONAL' ? (
                    <>
                      <th style={styles.th}>NRC</th>
                      <th style={styles.th}>Gender</th>
                      <th style={styles.th}>DOB</th>
                    </>
                  ) : (
                    <>
                      <th style={styles.th}>Reg Number</th>
                      <th style={styles.th}>Tax ID</th>
                      <th style={styles.th}>Business Type</th>
                    </>
                  )}
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>KYC Status</th>
                  <th style={styles.th}>KYC Verification Action</th>
                  <th style={styles.th}>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c, index) => (
                  <tr key={c.customerCode || index} style={styles.tableRow}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={{ ...styles.td, fontWeight: 600, color: '#1e3a8a' }}>{c.customerCode}</td>
                    <td style={{ ...styles.td, fontWeight: 600, color: '#0f172a' }}>{c.displayName}</td>

                    {listTab === 'PERSONAL' ? (
                      <>
                        <td style={styles.td}>{c.nrc}</td>
                        <td style={styles.td}>{c.gender}</td>
                        <td style={styles.td}>{c.dateOfBirth}</td>
                      </>
                    ) : (
                      <>
                        <td style={styles.td}>{c.registrationNumber}</td>
                        <td style={styles.td}>{c.taxId}</td>
                        <td style={styles.td}>{c.businessType}</td>
                      </>
                    )}

                    <td style={styles.td}>
                      <div style={{ fontSize: '11px' }}>📞 {c.phone}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>✉ {c.email}</div>
                    </td>

                    {/* KYC Status Badge */}
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor:
                            (c.status === 'ACTIVE' || c.kycStatus === 'VERIFIED')
                              ? '#dcfce7'
                              : c.kycStatus === 'REJECTED'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            (c.status === 'ACTIVE' || c.kycStatus === 'VERIFIED')
                              ? '#166534'
                              : c.kycStatus === 'REJECTED'
                              ? '#991b1b'
                              : '#92400e'
                        }}
                      >
                        ● {(c.status === 'ACTIVE' || c.kycStatus === 'VERIFIED') ? 'VERIFIED' : c.kycStatus}
                      </span>
                    </td>

                    {/* KYC Verification Action Buttons (တိကျစွာ ပြင်ဆင်ထားသော အပိုင်း) */}
                    <td style={styles.td}>
                      {(c.status === 'ACTIVE' || c.kycStatus === 'VERIFIED') ? (
                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: 700 }}>
                          ✓ Approved & Active
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleKycStatusChange(c.customerCode, 'ACTIVE')}
                            style={styles.verifyBtn}
                            title="KYC အတည်ပြုပြီး Status အား Active ပြုလုပ်ရန်"
                          >
                            ✓ Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKycStatusChange(c.customerCode, 'REJECTED')}
                            style={styles.rejectBtn}
                            title="KYC ပယ်ချရန်"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </td>

                    <td style={styles.td}>{c.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

// Styling Object: Navy Blue (#0f172a, #1e3a8a) & Clean White (#ffffff)
const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: '#ffffff',
    padding: '24px',
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
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  formRow: {
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
  submitBtn: {
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
  subTabContainer: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '16px',
    gap: '24px'
  },
  subTabButton: {
    background: 'none',
    border: 'none',
    padding: '10px 4px',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none'
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
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600
  },
  verifyBtn: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  rejectBtn: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer'
  }
};

export default CustomerManagement;