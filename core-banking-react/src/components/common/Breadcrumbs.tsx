import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customer Management',
  new: 'Create New',
  edit: 'Edit Details',
  accounts: 'Account Services',
  corporate: 'Corporate Accounts',
  deposit: 'Counter Deposit',
  status: 'Status Management',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center text-xs font-medium text-slate-500 py-1" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1.5 md:space-x-2">
        <li className="inline-flex items-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-slate-500 hover:text-blue-700 transition-colors"
          >
            <Home className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Home
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const label = routeLabels[value] || (value.startsWith('CUST-') || value.startsWith('ACC-') ? value : value);

          return (
            <li key={to} className="inline-flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-1 shrink-0" />
              {isLast ? (
                <span className="text-slate-800 font-semibold">{label}</span>
              ) : (
                <Link
                  to={to}
                  className="text-slate-500 hover:text-blue-700 transition-colors"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
