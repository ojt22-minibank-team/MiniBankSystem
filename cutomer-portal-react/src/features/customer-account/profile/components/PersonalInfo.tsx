
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Edit3,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import type { ChangeEvent, ReactNode } from "react";

// ပြင်ဆင်ချက်: English / Myanmar ဘာသာပြန်စာသားများ အသုံးပြုရန် import လုပ်ထားသည်။
import { useTranslation } from "react-i18next";

import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from "../types/profileTypes";

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
  // ပြင်ဆင်ချက်: UI စာသားများကို profile.json မှ ယူသုံးရန် hook ထည့်ထားသည်။
  const { t } = useTranslation("profile");

  const fullName =
    [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ") || t("notAvailable");

  const formatDate = (
    date: string | null
  ): string => {
    if (!date) {
      // ပြင်ဆင်ချက်: Hard-coded English အစား ဘာသာပြန် key ကို သုံးထားသည်။
      return t("notAvailable");
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    // မူလရက်စွဲ format ကို မပြောင်းဘဲ ထိန်းသိမ်းထားသည်။
    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
      : t("notAvailable");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ပြင်ဆင်ချက်: Section ခေါင်းစဉ်နှင့် ဖော်ပြချက်ကို translation keys ချိတ်ထားသည်။ */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h2 className="text-lg font-bold text-[#0A192F]">
            {t("personalInformation")}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {t("registeredPersonalDescription")}
          </p>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            {t("registeredInformation")}
          </div>
        )}
      </div>

      {/* REGISTERED INFORMATION */}
      <div className="px-6 py-6 sm:px-7">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProfileField
            label={t("customerId")}
            value={profile.customerCode}
            icon={<User size={17} />}
            accent
          />

          <ProfileField
            label={t("fullName")}
            value={fullName}
            icon={<User size={17} />}
          />

          <ProfileField
            label={t("emailAddress")}
            value={profile.email}
            icon={<Mail size={17} />}
          />

          <ProfileField
            label={t("phoneNumber")}
            value={profile.phone}
            icon={<Phone size={17} />}
          />

          <ProfileField
            label={t("dateOfBirth")}
            value={formatDate(profile.dateOfBirth)}
            icon={<CalendarDays size={17} />}
          />

          <ProfileField
            label={t("gender")}
            value={profile.gender}
            icon={<User size={17} />}
          />

          <ProfileField
            label={t("nrc")}
            value={profile.nrc}
            icon={<FileText size={17} />}
          />

          <ProfileField
            label={t("passportNumber")}
            value={profile.passportNumber}
            icon={<FileText size={17} />}
          />

          <ProfileField
            label={t("occupation")}
            value={profile.occupation}
            icon={<BriefcaseBusiness size={17} />}
          />
        </div>

        {/* ပြင်ဆင်ချက်: Address section သို့ လိုအပ်သော props များကို မူလအတိုင်း ပေးထားသည်။ */}
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
    </section>
  );
}

/* ================================================================
   ADDRESS SECTION
================================================================ */

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
  // ပြင်ဆင်ချက်: Address section ထဲက စာသားများကိုလည်း profile namespace မှ ယူသုံးသည်။
  const { t } = useTranslation("profile");

  return (
    <div className="mt-8 border-t border-slate-100 pt-7">
      {/* ADDRESS HEADER */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-[#00A3C4]">
              <MapPin size={18} />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">
                {t("address")}
              </h3>

              <p className="text-xs text-slate-500">
                {t("currentResidentialAddress")}
              </p>
            </div>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-[#00A3C4] transition hover:border-cyan-200 hover:bg-cyan-100 focus:outline-none focus:ring-4 focus:ring-cyan-100"
          >
            <Edit3 size={15} />
            {t("editAddress")}
          </button>
        )}
      </div>

      {/* VIEW MODE */}
      {!isEditing ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <MapPin
              size={18}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("currentAddress")}
              </p>

              <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                {formatAddress()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE */
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/30 p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              id="address"
              label={t("address")}
              value={formData.address ?? ""}
              placeholder={t("enterAddress")}
              onChange={onInputChange}
              fullWidth
            />

            <FormField
              id="city"
              label={t("city")}
              value={formData.city ?? ""}
              placeholder={t("enterCity")}
              onChange={onInputChange}
            />

            <FormField
              id="stateRegion"
              label={t("stateRegion")}
              value={formData.stateRegion ?? ""}
              placeholder={t("enterStateRegion")}
              onChange={onInputChange}
            />

            <FormField
              id="country"
              label={t("country")}
              value={formData.country ?? ""}
              placeholder={t("enterCountry")}
              onChange={onInputChange}
            />
          </div>

          {/* ပြင်ဆင်ချက်: Save / Cancel / Saving စာသားများကို ဘာသာပြန် key များနှင့် ချိတ်ထားသည်။ */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
            <p className="hidden text-xs text-slate-400 sm:block">
              {t("saveChangesNotice")}
            </p>

            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00A3C4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#00A3C4] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {t("save")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   FORM FIELD
================================================================ */

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
    <div className={fullWidth ? "md:col-span-2" : undefined}>
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
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#00A3C4] focus:ring-4 focus:ring-cyan-100"
      />
    </div>
  );
}

/* ================================================================
   READ-ONLY PROFILE FIELD
================================================================ */

interface ProfileFieldProps {
  label: string;
  value: string | null | undefined;
  icon?: ReactNode;
  accent?: boolean;
}

function ProfileField({
  label,
  value,
  icon,
  accent = false,
}: ProfileFieldProps) {
  // ပြင်ဆင်ချက်: Profile value မရှိသောအခါ လက်ရှိဘာသာစကားအလိုက် fallback ပြမည်။
  const { t } = useTranslation("profile");

  return (
    <div className="group rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-4 transition hover:border-slate-200 hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            accent
              ? "bg-cyan-50 text-[#00A3C4]"
              : "bg-white text-slate-400"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1.5 break-words text-sm font-semibold text-slate-800">
            {value || t("notAvailable")}
          </p>
        </div>
      </div>
    </div>
  );
}
