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
}

export default function CompanyInfo({
  profile,
  formData,
  isEditing,
  onInputChange,
}: CompanyInfoProps) {
  const formatDate = (
    date: string | null
  ) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (
      Number.isNaN(parsedDate.getTime())
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

      {/* Company Information */}

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
          icon={<Mail size={16} />}
        />

        <ProfileField
          label="Company Phone"
          value={profile.companyPhone}
          icon={<Phone size={16} />}
        />

        <ProfileField
          label="Registration Number"
          value={profile.registrationNumber}
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

      {/* Address */}

      <div className="mt-6 border-t border-slate-100 pt-6">

        {!isEditing ? (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <MapPin size={16} />

              <span>Address</span>
            </div>

            <p className="text-base font-medium text-slate-800">
              {formatAddress()}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <MapPin size={16} />

              <span>Address</span>
            </div>

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
                  value={formData.address ?? ""}
                  onChange={onInputChange}
                  placeholder="Enter company address"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
                  value={formData.city ?? ""}
                  onChange={onInputChange}
                  placeholder="Enter city"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
                    formData.stateRegion ?? ""
                  }
                  onChange={onInputChange}
                  placeholder="Enter state or region"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
                  value={formData.country ?? ""}
                  onChange={onInputChange}
                  placeholder="Enter country"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Profile Field
========================================================= */

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

        <span>{label}</span>
      </div>

      <p className="text-sm font-semibold text-slate-800">
        {value || "Not available"}
      </p>
    </div>
  );
}