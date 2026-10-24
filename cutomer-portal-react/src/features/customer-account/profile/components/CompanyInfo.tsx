
import {
  Building2,
  CalendarDays,
  Check,
  Edit3,
  FileText,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import type * as React from "react";

// ပြောင်းထားသည် - ဘာသာပြန်စနစ်ကို အသုံးပြုရန် import ထည့်ထားသည်။
import { useTranslation } from "react-i18next";

import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from "../types/profileTypes";

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
  // ပြောင်းထားသည် - profile namespace ထဲက ဘာသာပြန်စာသားတွေကို ရယူသည်။
  const { t } = useTranslation("profile");

  const formatDate = (date: string | null): string => {
    if (!date) {
      // ပြောင်းထားသည် - Not available ကို translation key ဖြင့် အစားထိုးသည်။
      return t("notAvailable");
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    // မူရင်းရက်စွဲပုံစံကို မပြောင်းထားပါ။
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

    // ပြောင်းထားသည် - လိပ်စာမရှိလျှင် ဘာသာပြန်စာသားကို ပြသည်။
    return parts.length > 0
      ? parts.join(", ")
      : t("notAvailable");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* မူရင်း section layout ကို ထိန်းထားပြီး ခေါင်းစဉ်များကို ဘာသာပြန်ထားသည်။ */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h2 className="text-lg font-bold text-[#08295C]">
            {t("companyInformation")}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {t("registeredCompanyDescription")}
          </p>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            {t("registeredInformation")}
          </div>
        )}
      </div>

      {/* ပြောင်းထားသည် - Company field label အားလုံးကို translation key ဖြင့် ပြောင်းထားသည်။ */}
      <div className="px-6 py-6 sm:px-7">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProfileField
            label={t("customerId")}
            value={profile.customerCode}
            icon={<Building2 size={17} />}
            accent
          />

          <ProfileField
            label={t("companyName")}
            value={profile.companyName}
            icon={<Building2 size={17} />}
          />

          <ProfileField
            label={t("companyEmail")}
            value={profile.companyEmail}
            icon={<Mail size={17} />}
          />

          <ProfileField
            label={t("companyPhone")}
            value={profile.companyPhone}
            icon={<Phone size={17} />}
          />

          <ProfileField
            label={t("registrationNumber")}
            value={profile.registrationNumber}
            icon={<FileText size={17} />}
          />

          <ProfileField
            label={t("taxId")}
            value={profile.taxId}
            icon={<FileText size={17} />}
          />

          <ProfileField
            label={t("businessType")}
            value={profile.businessType}
            icon={<Building2 size={17} />}
          />

          <ProfileField
            label={t("incorporationDate")}
            value={formatDate(profile.incorporationDate)}
            icon={<CalendarDays size={17} />}
          />
        </div>

        {/* မူရင်း AddressSection component နှင့် props များကို မပြောင်းထားပါ။ */}
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
   လိပ်စာကြည့်ရှုခြင်းနှင့် ပြင်ဆင်ခြင်းအပိုင်း
================================================================ */

interface AddressSectionProps {
  formData: CustomerProfileUpdate;
  isEditing: boolean;

  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement>
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
  // ပြောင်းထားသည် - ဒီ child component ထဲတွင်လည်း translation ကို ချိတ်ထားသည်။
  const { t } = useTranslation("profile");

  return (
    <div className="mt-8 border-t border-slate-100 pt-7">
      {/* ပြောင်းထားသည် - လိပ်စာခေါင်းစဉ်နှင့် Edit ခလုတ်စာသားကို ဘာသာပြန်ထားသည်။ */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0878E8]">
            <MapPin size={18} />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800">
              {t("address")}
            </h3>

            <p className="text-xs text-slate-500">
              {t("businessAddressDescription")}
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-[#0878E8] transition hover:border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-50"
          >
            <Edit3 size={15} />
            {t("editAddress")}
          </button>
        )}
      </div>

      {/* VIEW MODE - ပြောင်းထားသည် - လိပ်စာ label ကို ဘာသာပြန်ထားသည်။ */}
      {!isEditing ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <MapPin
              size={18}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("currentBusinessAddress")}
              </p>

              <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                {formatAddress()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE - မူရင်းပြင်ဆင်မှု logic ကို ထိန်းထားသည်။ */
        <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              id="address"
              label={t("address")}
              value={formData.address ?? ""}
              placeholder={t("enterCompanyAddress")}
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

          {/* ပြောင်းထားသည် - Save/Cancel နှင့် saving status စာသားများကို ဘာသာပြန်ထားသည်။ */}
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0878E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
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
   Form input တစ်ခုချင်းစီကို ပြသပေးသည့် reusable component
================================================================ */

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;

  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
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
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0878E8] focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

/* ================================================================
   PROFILE FIELD
   မှတ်ပုံတင်ထားသော ကုမ္ပဏီအချက်အလက်များကို ပြသသည့် component
================================================================ */

interface ProfileFieldProps {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  accent?: boolean;
}

function ProfileField({
  label,
  value,
  icon,
  accent = false,
}: ProfileFieldProps) {
  // ပြောင်းထားသည် - တန်ဖိုးမရှိသော field များအတွက် ဘာသာပြန်စာသား သုံးရန်။
  const { t } = useTranslation("profile");

  return (
    <div className="group rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-4 transition hover:border-slate-200 hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            accent
              ? "bg-blue-50 text-[#0878E8]"
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
