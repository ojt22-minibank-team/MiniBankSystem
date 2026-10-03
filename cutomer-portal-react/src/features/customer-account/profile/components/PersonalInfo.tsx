import {
  BriefcaseBusiness,
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

interface PersonalInfoProps {
  profile: CustomerProfile;
  formData: CustomerProfileUpdate;
  isEditing: boolean;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

export default function PersonalInfo({
  profile,
  formData,
  isEditing,
  onInputChange,
}: PersonalInfoProps) {
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

      {/* Personal Information */}

      <div className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">

        <ProfileField
          label="Customer ID"
          value={profile.customerCode}
        />

        <ProfileField
          label="Full Name"
          value={[
            profile.firstName,
            profile.lastName,
          ]
            .filter(Boolean)
            .join(" ")}
        />

        <ProfileField
          label="Email"
          value={profile.email}
          icon={<Mail size={16} />}
        />

        <ProfileField
          label="Phone"
          value={profile.phone}
          icon={<Phone size={16} />}
        />

        <ProfileField
          label="Date of Birth"
          value={formatDate(
            profile.dateOfBirth
          )}
          icon={
            <CalendarDays size={16} />
          }
        />

        <ProfileField
          label="Gender"
          value={profile.gender}
        />

        <ProfileField
          label="NRC"
          value={profile.nrc}
        />

        <ProfileField
          label="Passport Number"
          value={profile.passportNumber}
        />

        <ProfileField
          label="Occupation"
          value={profile.occupation}
          icon={
            <BriefcaseBusiness size={16} />
          }
        />
      </div>

      {/* Address */}

      <AddressSection
        profile={profile}
        formData={formData}
        isEditing={isEditing}
        onInputChange={onInputChange}
        formatAddress={formatAddress}
      />
    </div>
  );
}

/* =========================================================
   Address
========================================================= */

interface AddressSectionProps {
  profile: CustomerProfile;
  formData: CustomerProfileUpdate;
  isEditing: boolean;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  formatAddress: () => string;
}

function AddressSection({
  formData,
  isEditing,
  onInputChange,
  formatAddress,
}: AddressSectionProps) {
  return (
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
                htmlFor="address"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Address
              </label>

              <input
                id="address"
                name="address"
                type="text"
                value={formData.address ?? ""}
                onChange={onInputChange}
                placeholder="Enter your address"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            {/* City */}

            <div>
              <label
                htmlFor="city"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                City
              </label>

              <input
                id="city"
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
                htmlFor="stateRegion"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                State / Region
              </label>

              <input
                id="stateRegion"
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
                htmlFor="country"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Country
              </label>

              <input
                id="country"
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