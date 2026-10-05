
import {
  BriefcaseBusiness,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import type {
  ChangeEvent,
  ReactNode,
} from "react";

import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from "../../types/profileTypes";

interface PersonalInfoProps {
  profile: CustomerProfile;
  formData: CustomerProfileUpdate;
  isEditing: boolean;

  onInputChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;

  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function PersonalInfo({
  profile,
  formData,
  isEditing,
  onInputChange,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: PersonalInfoProps) {
  const fullName =
    [
      profile.firstName,
      profile.lastName,
    ]
      .filter(Boolean)
      .join(" ") || "Not available";

  const formatDate = (
    date: string | null
  ): string => {
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

  const formatAddress = (): string => {
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
      {/* =====================================================
          REGISTERED PERSONAL INFORMATION
          These fields are read-only.
      ====================================================== */}

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
        <ProfileField
          label="Customer ID"
          value={profile.customerCode}
        />

        <ProfileField
          label="Full Name"
          value={fullName}
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

      {/* =====================================================
          ADDRESS
      ====================================================== */}

      <AddressSection
        formData={formData}
        isEditing={isEditing}
        onInputChange={onInputChange}
        formatAddress={formatAddress}
        onEdit={onEdit}
        onCancel={onCancel}
        onSave={onSave}
        isSaving={isSaving}
      />
    </div>
  );
}

/* ============================================================
   ADDRESS SECTION
============================================================ */

interface AddressSectionProps {
  formData: CustomerProfileUpdate;
  isEditing: boolean;

  onInputChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;

  formatAddress: () => string;

  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
}

function AddressSection({
  formData,
  isEditing,
  onInputChange,
  formatAddress,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: AddressSectionProps) {
  return (
    <div className="mt-7 border-t border-slate-100 pt-6">
      {/* ADDRESS HEADER */}

      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
        <MapPin size={16} />

        <span>Address</span>
      </div>

      {/* =====================================================
          VIEW MODE
      ====================================================== */}

      {!isEditing ? (
        <>
          <p className="text-sm font-semibold leading-6 text-slate-800">
            {formatAddress()}
          </p>

          {/* FULL WIDTH EDIT BUTTON */}

          <button
            type="button"
            onClick={onEdit}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#0878E8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            Edit Profile
          </button>
        </>
      ) : (
        /* ===================================================
           EDIT MODE
        ==================================================== */

        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* ADDRESS */}

            <FormField
              id="address"
              label="Address"
              value={formData.address}
              placeholder="Enter your address"
              onChange={onInputChange}
              fullWidth
            />

            {/* CITY */}

            <FormField
              id="city"
              label="City"
              value={formData.city}
              placeholder="Enter city"
              onChange={onInputChange}
            />

            {/* STATE / REGION */}

            <FormField
              id="stateRegion"
              label="State / Region"
              value={formData.stateRegion}
              placeholder="Enter state or region"
              onChange={onInputChange}
            />

            {/* COUNTRY */}

            <FormField
              id="country"
              label="Country"
              value={formData.country}
              placeholder="Enter country"
              onChange={onInputChange}
            />
          </div>

          {/* =================================================
              ACTION BUTTONS
          ================================================== */}

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
              className="rounded-xl bg-[#0878E8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   FORM FIELD
============================================================ */

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;

  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;

  fullWidth?: boolean;
}

function FormField({
  id,
  label,
  value,
  placeholder,
  onChange,
  fullWidth = false,
}: FormFieldProps) {
  return (
    <div
      className={
        fullWidth
          ? "md:col-span-2"
          : undefined
      }
    >
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0878E8] focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

/* ============================================================
   READ-ONLY PROFILE FIELD
============================================================ */

interface ProfileFieldProps {
  label: string;
  value:
    | string
    | null
    | undefined;
  icon?: ReactNode;
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
