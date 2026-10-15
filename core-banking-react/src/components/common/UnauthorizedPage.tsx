import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import Button from './Button';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-6">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">403 - Access Denied</h1>
      <p className="mt-2 text-base text-gray-600 max-w-md">
        You do not have the required permissions or roles to view this module.
      </p>

      {user && (
        <div className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-xs text-gray-600">
          Signed in as <span className="font-semibold text-gray-900">{user.username}</span> | Current Roles:{' '}
          <span className="font-mono font-medium text-blue-600">
            {user.roles?.join(', ') || 'None'}
          </span>
        </div>
      )}

      <div className="mt-8 flex items-center gap-4">
        <Link to="/admin/dashboard">
          <Button variant="primary" size="md">
            Return to Dashboard
          </Button>
        </Link>
        <Button variant="secondary" size="md" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
