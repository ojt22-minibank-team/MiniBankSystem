import React, { useState } from 'react';
import { loginStaff } from './authService';

export interface StaffLoginProps {
  onLoginSuccess: () => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      // Backend API သို့ ချိတ်ဆက်၍ Login ဝင်ရောက်ခြင်း
      await loginStaff({ username, password });
      // အောင်မြင်ပါက Parent Component (App.tsx) သို့ အကြောင်းကြားပြီး Dashboard သို့ ကူးပြောင်းစေခြင်း
      onLoginSuccess();
    } catch (err: any) {
      const errorText =
        err.response?.data?.message ||
        err.message ||
        'Username သို့မဟုတ် Password မှားယွင်းနေပါသည်';
      setErrorMessage(errorText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* Core Banking Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>🏦</div>
          <h2 style={styles.title}>CORE BANKING</h2>
          <span style={styles.subtitle}>Staff Administration Portal</span>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div style={styles.errorAlert}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label}>Staff Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g. teller1"
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              backgroundColor: loading ? '#64748b' : '#0f172a',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <div style={styles.footerNote}>
          🔒 Authorized Bank Personnel Only. All access is logged.
        </div>
      </div>
    </div>
  );
};

// Navy Dark Blue (#0f172a, #1e3a8a) & Clean White (#ffffff) Inline Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0f172a', // Navy Dark Blue
    fontFamily: 'sans-serif',
    boxSizing: 'border-box'
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    padding: '36px',
    backgroundColor: '#ffffff', // Clean White
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box'
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px 0',
    letterSpacing: '0.5px'
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748b'
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px',
    border: '1px solid #fecaca'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
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
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontSize: '14px',
    outline: 'none'
  },
  submitButton: {
    padding: '12px',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '14px',
    marginTop: '6px',
    transition: 'background-color 0.2s'
  },
  footerNote: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '11px',
    color: '#94a3b8'
  }
};

export default StaffLogin;