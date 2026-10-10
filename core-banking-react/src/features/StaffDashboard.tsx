import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CustomerManagement } from './CustomerManagement';
import { CreateAccountForm } from './CreateAccountForm';

const API_BASE_URL = 'http://localhost:8080';

interface StaffDashboardProps {
  onLogout: () => void;
  staffName?: string;
  staffRole?: string;
}

interface ComprehensiveMetrics {
  totalAccounts: number;
  totalCustomers: number;
  totalSavingsAccounts: number;
  totalCurrentAccounts: number;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onLogout,
  staffName = 'Bank Officer',
  staffRole = 'Staff'
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customer-mgmt' | 'account-mgmt'>('dashboard');

  // Dashboard Metrics State (သင်တောင်းဆိုထားသော ၄ မျိုး)
  const [metrics, setMetrics] = useState<ComprehensiveMetrics>({
    totalAccounts: 0,
    totalCustomers: 0,
    totalSavingsAccounts: 0,
    totalCurrentAccounts: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  // Backend ထံမှ Real Data စစ်စစ်များကို တွက်ချက်ရယူခြင်း
  const fetchLiveMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const token = localStorage.getItem('token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      const [accountsRes, customersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/accounts`, { headers: authHeader }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/customers`, { headers: authHeader }).catch(() => ({ data: [] }))
      ]);

      const accounts = Array.isArray(accountsRes.data) ? accountsRes.data : accountsRes.data?.content || [];
      const customers = Array.isArray(customersRes.data) ? customersRes.data : customersRes.data?.content || [];

      // Savings နှင့် Current စာရင်းများကို သီးခြား ခွဲခြားရေတွက်ခြင်း
      const savingsCount = accounts.filter(
        (acc: any) => acc.accountType === 'SAVINGS' || acc.accountType === 'SAVING'
      ).length;

      const currentCount = accounts.filter(
        (acc: any) => acc.accountType === 'CURRENT'
      ).length;

      setMetrics({
        totalAccounts: accounts.length,
        totalCustomers: customers.length,
        totalSavingsAccounts: savingsCount,
        totalCurrentAccounts: currentCount
      });
    } catch (err) {
      console.error('Metrics loading error:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
  }, [activeTab]);

  return (
    <div style={styles.container}>
      
      {/* ၁။ ဘယ်ဘက် Sidebar Menu (Navy Dark Blue Theme) */}
      <aside style={styles.sidebar}>
        
        {/* Brand Header */}
        <div style={styles.brandContainer}>
          <span style={{ fontSize: '26px' }}>🏦</span>
          <div>
            <h2 style={styles.brandTitle}>CORE BANKING</h2>
            <span style={styles.brandSubtitle}>Staff Administration</span>
          </div>
        </div>

        {/* Navigation with .menu-label design */}
        <nav style={styles.nav}>
          <div style={styles.menuLabel}>OVERVIEW</div>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            style={{
              ...styles.navButton,
              backgroundColor: activeTab === 'dashboard' ? '#1e3a8a' : 'transparent',
              fontWeight: activeTab === 'dashboard' ? 600 : 400
            }}
          >
            <span>📊</span> Dashboard
          </button>

          <div style={styles.menuLabel}>CUSTOMER MANAGEMENT</div>
          <button
            type="button"
            onClick={() => setActiveTab('customer-mgmt')}
            style={{
              ...styles.navButton,
              backgroundColor: activeTab === 'customer-mgmt' ? '#1e3a8a' : 'transparent',
              fontWeight: activeTab === 'customer-mgmt' ? 600 : 400
            }}
          >
            <span>👥</span> Customer Management
          </button>

          <div style={styles.menuLabel}>ACCOUNT MANAGEMENT</div>
          <button
            type="button"
            onClick={() => setActiveTab('account-mgmt')}
            style={{
              ...styles.navButton,
              backgroundColor: activeTab === 'account-mgmt' ? '#1e3a8a' : 'transparent',
              fontWeight: activeTab === 'account-mgmt' ? 600 : 400
            }}
          >
            <span>💳</span> Account Management
          </button>
        </nav>

        {/* Profile & Logout */}
        <div style={styles.profileBox}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{staffName}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{staffRole}</div>
          </div>
          <button type="button" onClick={onLogout} style={styles.logoutButton}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ၂။ ညာဘက် Main Content Area */}
      <main style={styles.main}>
        <header style={styles.topHeader}>
          <h1 style={styles.headerTitle}>
            {activeTab === 'dashboard' && 'Real-Time Overview'}
            {activeTab === 'customer-mgmt' && 'Customer Management (Personal & Corporate)'}
            {activeTab === 'account-mgmt' && 'Account Management & Operations'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: '#475569' }}>
            <span>🕒 {new Date().toLocaleDateString('en-GB')}</span>
            <span style={styles.statusPill}>● Live Connected</span>
          </div>
        </header>

        <div style={{ padding: '30px' }}>
          
          {/* DASHBOARD TAB (သင်တောင်းဆိုထားသော Metric Cards ၄ ခု) */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={styles.cardGrid}>
                
                {/* Card 1: Total Accounts */}
                <div style={{ ...styles.card, borderLeft: '4px solid #0f172a' }}>
                  <div style={styles.cardLabel}>Total Accounts</div>
                  <div style={styles.cardNumber}>
                    {loadingMetrics ? '...' : metrics.totalAccounts}
                  </div>
                  <div style={styles.cardNote}>All Core Banking Accounts</div>
                </div>

                {/* Card 2: Total Registered Customers */}
                <div style={{ ...styles.card, borderLeft: '4px solid #1e3a8a' }}>
                  <div style={styles.cardLabel}>Total Registered Customers</div>
                  <div style={styles.cardNumber}>
                    {loadingMetrics ? '...' : metrics.totalCustomers}
                  </div>
                  <div style={styles.cardNote}>Personal & Company Customers</div>
                </div>

                {/* Card 3: Total Savings Accounts */}
                <div style={{ ...styles.card, borderLeft: '4px solid #059669' }}>
                  <div style={styles.cardLabel}>Total Savings Accounts</div>
                  <div style={{ ...styles.cardNumber, color: '#059669' }}>
                    {loadingMetrics ? '...' : metrics.totalSavingsAccounts}
                  </div>
                  <div style={styles.cardNote}>Active Savings Deposits</div>
                </div>

                {/* Card 4: Total Current Accounts */}
                <div style={{ ...styles.card, borderLeft: '4px solid #d97706' }}>
                  <div style={styles.cardLabel}>Total Current Accounts</div>
                  <div style={{ ...styles.cardNumber, color: '#d97706' }}>
                    {loadingMetrics ? '...' : metrics.totalCurrentAccounts}
                  </div>
                  <div style={styles.cardNote}>Operational Check Accounts</div>
                </div>

              </div>

              {/* Quick Staff Navigation Panel */}
              <div style={styles.actionPanel}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 16px 0' }}>
                  Core Banking Operations
                </h3>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('customer-mgmt')}
                    style={styles.primaryBtn}
                  >
                    Manage Customers (KYC & Lists) →
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('account-mgmt')}
                    style={styles.secondaryBtn}
                  >
                    Manage Accounts (Open / Joint Account) →
                  </button>
                  <button
                    type="button"
                    onClick={fetchLiveMetrics}
                    style={styles.refreshBtn}
                  >
                    🔄 Refresh Real-Time Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOMER MANAGEMENT TAB */}
          {activeTab === 'customer-mgmt' && (
            <CustomerManagement />
          )}

          {/* ACCOUNT MANAGEMENT TAB */}
          {activeTab === 'account-mgmt' && (
            <CreateAccountForm />
          )}

        </div>
      </main>

    </div>
  );
};

// Navy Dark Blue & Clean White Styling Object
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#f8fafc',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box'
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
    boxSizing: 'border-box'
  },
  brandContainer: {
    padding: '24px 20px',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  brandTitle: {
    fontSize: '16px',
    fontWeight: 700,
    margin: 0,
    color: '#ffffff',
    letterSpacing: '0.5px'
  },
  brandSubtitle: {
    fontSize: '11px',
    color: '#94a3b8'
  },
  nav: {
    padding: '16px 12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  menuLabel: {
    fontSize: '11px',
    color: '#8290ad',
    margin: '18px 10px 7px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '6px',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left',
    transition: 'background-color 0.2s'
  },
  profileBox: {
    padding: '20px',
    borderTop: '1px solid #1e293b',
    backgroundColor: '#090d16'
  },
  logoutButton: {
    width: '100%',
    padding: '9px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },
  topHeader: {
    height: '64px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 32px'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0
  },
  statusPill: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '18px',
    marginBottom: '26px'
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '22px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  cardLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '6px',
    fontWeight: 600
  },
  cardNumber: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a'
  },
  cardNote: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '6px'
  },
  actionPanel: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  primaryBtn: {
    padding: '11px 18px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer'
  },
  secondaryBtn: {
    padding: '11px 18px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer'
  },
  refreshBtn: {
    padding: '11px 18px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer'
  }
};

export default StaffDashboard;