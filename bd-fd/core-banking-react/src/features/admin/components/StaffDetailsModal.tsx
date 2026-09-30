import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import type { StaffResponse } from '../../../types/api.types';
import { formatDateTime } from '../../../utils/formatDate';

interface StaffDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffResponse | null;
  onEdit?: (staff: StaffResponse) => void;
  onChangeRole?: (staff: StaffResponse) => void;
  onResetPassword?: (staff: StaffResponse) => void;
}

export default function StaffDetailsModal({
  isOpen,
  onClose,
  staff,
  onEdit,
  onChangeRole,
  onResetPassword,
}: StaffDetailsModalProps) {
  if (!staff) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Account Details"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(staff);
                }}
              >
                Edit Info
              </Button>
            )}
            {onChangeRole && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onChangeRole(staff);
                }}
              >
                Change Role
              </Button>
            )}
            {onResetPassword && staff.status !== 'DEACTIVATED' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onResetPassword(staff);
                }}
              >
                Reset Password
              </Button>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {/* Profile Card Header */}
        <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white shrink-0">
            {staff.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {staff.fullName || staff.username}
            </h3>
            <p className="text-xs text-gray-500 font-mono">Staff No: {staff.staffNo}</p>
          </div>
          <span
            className={[
              'rounded-full px-2.5 py-1 text-xs font-semibold shrink-0',
              staff.status === 'ACTIVE'
                ? 'bg-green-100 text-green-700'
                : staff.status === 'SUSPENDED'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700',
            ].join(' ')}
          >
            {staff.status}
          </span>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
          <div>
            <span className="block text-xs font-medium text-gray-500">Username</span>
            <span className="font-medium text-gray-800">{staff.username}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Staff ID (UUID)</span>
            <span className="font-mono text-xs text-gray-600 truncate block" title={staff.staffId}>
              {staff.staffId}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Email Address</span>
            <span className="font-medium text-gray-800">{staff.email || '—'}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Phone Number</span>
            <span className="font-medium text-gray-800">{staff.phone || '—'}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Must Change Password</span>
            <span
              className={[
                'inline-block rounded px-2 py-0.5 text-xs font-medium',
                staff.mustChangePassword
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-600',
              ].join(' ')}
            >
              {staff.mustChangePassword ? 'Yes (Next Login)' : 'No'}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Last Login</span>
            <span className="text-gray-800">{formatDateTime(staff.lastLoginAt)}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Created At</span>
            <span className="text-gray-800">{formatDateTime(staff.createdAt)}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500">Updated At</span>
            <span className="text-gray-800">{formatDateTime(staff.updatedAt)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
