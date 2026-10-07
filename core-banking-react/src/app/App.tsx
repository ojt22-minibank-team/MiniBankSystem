import React, { useState } from 'react';
import axios from 'axios';
import StaffDashboard from '../features/StaffDashboard';

// App.css သည် src/ အောက်တွင် ရှိသဖြင့် app/ ထဲတွင် ./App.css ခေါ်ပါက error တက်ပါသည်
// ကျွန်ုပ်တို့သည် inline styling သုံးထားသဖြင့် App.css မလိုပါ

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Staff အသစ်ဖြင့် Login ဝင်ရောက်ခြင်း
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // Backend Localhost 8080 (သို့မဟုတ် သက်ဆိုင်ရာ Backend Port) သို့ ပို့ဆောင်ခြင်း
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password
      });

      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('staff_user', JSON.stringify(response.data));
        setToken(response.data.token);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 
        err.message || 
        'Username သို့မဟုတ် Password မှားယွင်းနေပါသည်'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('staff_user');
    setToken(null);
  };

  // ၁။ Token မရှိသေးပါက Staff Login Form ကို ပြသမည်
  if (!token) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🏦</div>
            <h2 style={styles.loginTitle}>CORE BANKING</h2>
            <span style={styles.loginSubtitle}>Staff Administration Portal</span>
          </div>

          {errorMsg && (
            <div style={styles.errorBox}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={styles.form}>
            <div>
              <label style={styles.label}>Staff Username</label>
              <input
                type="text"
                required
                placeholder="e.g. teller1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                backgroundColor: loading ? '#64748b' : '#0f172a',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          <div style={styles.footerText}>
            🔒 Authorized Bank Personnel Only.
          </div>
        </div>
      </div>
    );
  }

  // ၂။ Login အောင်မြင်ပါက Dashboard ကို ပြသမည်
  return (
    <div style={{ width: '100vw', minHeight: '100vh', margin: 0, padding: 0 }}>
      <StaffDashboard
        onLogout={handleLogout}
        staffName={username || 'Bank Officer'}
        staffRole="Staff"
      />
    </div>
  );
};

// Navy Dark Blue (#0f172a) & Clean White Theme
const styles: { [key: string]: React.CSSProperties } = {
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0f172a',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box'
  },
  loginCard: {
    width: '100%',
    maxWidth: '380px',
    padding: '36px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box'
  },
  loginTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px 0',
    letterSpacing: '0.5px'
  },
  loginSubtitle: {
    fontSize: '12px',
    color: '#64748b'
  },
  errorBox: {
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
  button: {
    padding: '12px',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '14px',
    marginTop: '6px'
  },
  footerText: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '11px',
    color: '#94a3b8'
  }
};

export default App;