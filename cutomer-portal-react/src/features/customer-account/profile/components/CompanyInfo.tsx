
import {
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import type * as React from "react";

import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from "../../types/profileTypes";

interface CompanyInfoProps {
  profile: CustomerProfile;
  formData: CustomerProfileUpdate;
  isEditing: boolean;

  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;

  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;

  isSaving: boolean;
}

export default function CompanyInfo({
  profile,
  formData,
  isEditing,
  onInputChange,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: CompanyInfoProps) {
  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "Not available";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatAddress = () => {
    const parts = [
      profile.address,
      profile.city,
      profile.stateRegion,
      profile.country,
    ].filter(Boolean);

    return parts.length > 0
      ? parts.join(", ")
      : "Not available";
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* ================================================================ */}
      {/* COMPANY INFORMATION                                             */}
      {/* ================================================================ */}

      <div className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">

        <ProfileField
          label="Customer ID"
          value={profile.customerCode}
        />

        <ProfileField
          label="Company Name"
          value={profile.companyName}
          icon={
            <Building2 size={16} />
          }
        />

        <ProfileField
          label="Company Email"
          value={profile.companyEmail}
          icon={
            <Mail size={16} />
          }
        />

        <ProfileField
          label="Company Phone"
          value={profile.companyPhone}
          icon={
            <Phone size={16} />
          }
        />

        <ProfileField
          label="Registration Number"
          value={
            profile.registrationNumber
          }
        />

        <ProfileField
          label="Tax ID"
          value={profile.taxId}
        />

        <ProfileField
          label="Business Type"
          value={profile.businessType}
          icon={
            <Building2 size={16} />
          }
        />

        <ProfileField
          label="Incorporation Date"
          value={formatDate(
            profile.incorporationDate
          )}
          icon={
            <CalendarDays size={16} />
          }
        />
      </div>

      {/* ================================================================ */}
      {/* ADDRESS                                                          */}
      {/* ================================================================ */}

      <div className="mt-6 border-t border-slate-100 pt-6">

        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
          <MapPin size={16} />

          <span>Address</span>
        </div>

        {!isEditing ? (
          <>
            <p className="text-base font-medium text-slate-800">
              {formatAddress()}
            </p>

            {/* EDIT PROFILE */}
            <button
              type="button"
              onClick={onEdit}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#0878E8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              Edit Profile
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* Address */}
              <div className="md:col-span-2">
                <label
                  htmlFor="company-address"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Address
                </label>

                <input
                  id="company-address"
                  name="address"
                  type="text"
                  value={
                    formData.address ?? ""
                  }
                  onChange={
                    onInputChange
                  }
                  placeholder="Enter company address"
                  autoComplete="street-address"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0878E8] focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* City */}
              <div>
                <label
                  htmlFor="company-city"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  City
                </label>

                <input
                  id="company-city"
                  name="city"
                  type="text"
                  value={
                    formData.city ?? ""
                  }
                  onChange={
                    onInputChange
                  }
                  placeholder="Enter city"
                  autoComplete="address-level2"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0878E8] focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* State / Region */}
              <div>
                <label
                  htmlFor="company-state-region"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  State / Region
                </label>

                <input
                  id="company-state-region"
                  name="stateRegion"
                  type="text"
                  value={
                    formData.stateRegion ??
                    ""
                  }
                  onChange={
                    onInputChange
                  }
                  placeholder="Enter state or region"
                  autoComplete="address-level1"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0878E8] focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* Country */}
              <div className="md:col-span-2">
                <label
                  htmlFor="company-country"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Country
                </label>

                <input
                  id="company-country"
                  name="country"
                  type="text"
                  value={
                    formData.country ?? ""
                  }
                  onChange={
                    onInputChange
                  }
                  placeholder="Enter country"
                  autoComplete="country-name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0878E8] focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* ========================================================== */}
            {/* ADDRESS ACTIONS                                             */}
            {/* ========================================================== */}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              {/* CANCEL */}
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              {/* SAVE */}
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0878E8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}

                {isSaving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Profile Field                                                              */
/* ========================================================================== */

interface ProfileFieldProps {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}

function ProfileField({
  label,
  value,
  icon,
}: ProfileFieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-500">
        {icon}

        <span>
          {label}
        </span>
      </div>

      <p className="text-sm font-semibold text-slate-800">
        {value ||
          "Not available"}
      </p>
    </div>
  );
}

