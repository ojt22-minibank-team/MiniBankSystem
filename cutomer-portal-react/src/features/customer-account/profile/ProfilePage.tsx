import {
  Camera,
  Mail,
  Phone,
  MapPin,
  BriefcaseBusiness,
  CalendarDays,
  User,
  ShieldCheck,
  Building2,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
} from "../api/profileApi";

import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from "../types/profileTypes";

export default function ProfilePage() {
  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [form, setForm] =
    useState<CustomerProfileUpdate>({
      email: "",
      phone: "",
      occupation: "",
      address: "",
      city: "",
      stateRegion: "",
      country: "",
      companyPhone: "",
      companyEmail: "",
    });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const data = await getMyProfile();

      setProfile(data);

      setForm({
        email: data.email ?? "",
        phone: data.phone ?? "",
        occupation: data.occupation ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        stateRegion: data.stateRegion ?? "",
        country: data.country ?? "",
        companyPhone: data.companyPhone ?? "",
        companyEmail: data.companyEmail ?? "",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updatedProfile =
        await updateMyProfile(form);

      setProfile(updatedProfile);

      setForm({
        email: updatedProfile.email ?? "",
        phone: updatedProfile.phone ?? "",
        occupation:
          updatedProfile.occupation ?? "",
        address:
          updatedProfile.address ?? "",
        city: updatedProfile.city ?? "",
        stateRegion:
          updatedProfile.stateRegion ?? "",
        country:
          updatedProfile.country ?? "",
        companyPhone:
          updatedProfile.companyPhone ?? "",
        companyEmail:
          updatedProfile.companyEmail ?? "",
      });

      setSuccess(
        "Profile updated successfully."
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const updatedProfile =
        await uploadProfileImage(file);

      setProfile(updatedProfile);

      setSuccess(
        "Profile image updated successfully."
      );
    } catch (err) {
      console.error(err);
      setError(
        "Failed to upload profile image."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-700">
          {error || "Profile could not be loaded."}
        </p>
      </div>
    );
  }

  const fullName =
    `${profile.firstName ?? ""} ${profile.lastName ?? ""}`
      .trim() || "Customer";

  const initials =
    `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`
      .toUpperCase() || "CU";

  const isCompany =
    profile.customerType === "COMPANY" ||
    profile.customerType === "CORPORATE";

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your personal information and
          contact details.
        </p>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-medium text-emerald-700">
            {success}
          </p>
        </div>
      )}

      {/* PROFILE HEADER CARD */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="h-28 bg-[#08295C]" />

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div className="flex items-end gap-4">

              {/* PROFILE IMAGE */}
              <div className="relative">
                {profile.profileImageUrl ? (
                  <img
                    src={profile.profileImageUrl}
                    alt={fullName}
                    className="
                      h-24 w-24 rounded-2xl
                      border-4 border-white
                      object-cover shadow-md
                    "
                  />
                ) : (
                  <div
                    className="
                      flex h-24 w-24 items-center
                      justify-center rounded-2xl
                      border-4 border-white
                      bg-slate-100
                      text-2xl font-bold
                      text-[#08295C]
                      shadow-md
                    "
                  >
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={uploading}
                  className="
                    absolute -bottom-2 -right-2
                    flex h-9 w-9 items-center
                    justify-center rounded-full
                    border-2 border-white
                    bg-[#0878E8]
                    text-white shadow-md
                    transition hover:bg-blue-700
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  <Camera size={16} />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* NAME */}
              <div className="pb-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {fullName}
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500">
                    {profile.customerCode}
                  </span>

                  <span className="text-slate-300">
                    •
                  </span>

                  <span className="text-sm font-medium text-blue-700">
                    {profile.customerType}
                  </span>
                </div>
              </div>
            </div>

            {/* STATUS */}
            <div className="flex items-center gap-2 pb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              <span className="text-sm font-semibold text-emerald-700">
                {profile.status}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PROFILE FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* PERSONAL INFORMATION */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
                <User size={19} />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Personal Information
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  Your registered personal information.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">

            <ReadOnlyField
              label="First Name"
              value={profile.firstName}
            />

            <ReadOnlyField
              label="Last Name"
              value={profile.lastName}
            />

            <ReadOnlyField
              label="Date of Birth"
              value={profile.dateOfBirth}
              icon={<CalendarDays size={16} />}
            />

            <ReadOnlyField
              label="Gender"
              value={profile.gender}
            />

            <ReadOnlyField
              label="NRC"
              value={profile.nrc}
            />

            <ReadOnlyField
              label="Passport Number"
              value={profile.passportNumber}
            />

            <EditableField
              label="Occupation"
              name="occupation"
              value={form.occupation}
              onChange={handleChange}
              icon={<BriefcaseBusiness size={16} />}
            />

          </div>
        </section>

        {/* CONTACT */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
                <Phone size={19} />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Contact Information
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  Update your contact details.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">

            <EditableField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              icon={<Mail size={16} />}
            />

            <EditableField
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              icon={<Phone size={16} />}
            />

          </div>
        </section>

        {/* ADDRESS */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
                <MapPin size={19} />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Address
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  Manage your registered address.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">

            <div className="md:col-span-2">
              <EditableTextarea
                label="Address"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <EditableField
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
            />

            <EditableField
              label="State / Region"
              name="stateRegion"
              value={form.stateRegion}
              onChange={handleChange}
            />

            <EditableField
              label="Country"
              name="country"
              value={form.country}
              onChange={handleChange}
            />

          </div>
        </section>

        {/* COMPANY */}
        {isCompany && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
                  <Building2 size={19} />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Company Information
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Registered company information.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">

              <ReadOnlyField
                label="Company Name"
                value={profile.companyName}
              />

              <ReadOnlyField
                label="Registration Number"
                value={profile.registrationNumber}
              />

              <ReadOnlyField
                label="Tax ID"
                value={profile.taxId}
              />

              <ReadOnlyField
                label="Business Type"
                value={profile.businessType}
              />

              <ReadOnlyField
                label="Incorporation Date"
                value={profile.incorporationDate}
              />

              <EditableField
                label="Company Phone"
                name="companyPhone"
                value={form.companyPhone}
                onChange={handleChange}
              />

              <EditableField
                label="Company Email"
                name="companyEmail"
                type="email"
                value={form.companyEmail}
                onChange={handleChange}
              />

            </div>
          </section>
        )}

        {/* SAVE */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="
              inline-flex items-center gap-2
              rounded-xl bg-[#08295C]
              px-6 py-3 text-sm font-semibold
              text-white shadow-sm
              transition hover:bg-[#061f46]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <ShieldCheck size={17} />

            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =====================================================
   READ ONLY FIELD
===================================================== */

interface ReadOnlyFieldProps {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
}

function ReadOnlyField({
  label,
  value,
  icon,
}: ReadOnlyFieldProps) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        {icon}
        {label}
      </label>

      <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
        {value || "—"}
      </div>
    </div>
  );
}

/* =====================================================
   EDITABLE FIELD
===================================================== */

interface EditableFieldProps {
  label: string;
  name: keyof CustomerProfileUpdate;
  value: string;
  type?: string;
  icon?: React.ReactNode;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

function EditableField({
  label,
  name,
  value,
  type = "text",
  icon,
  onChange,
}: EditableFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"
      >
        {icon}
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="
          h-11 w-full rounded-xl
          border border-slate-200
          bg-white px-4 text-sm
          text-slate-700 outline-none
          transition
          placeholder:text-slate-400
          focus:border-[#0878E8]
          focus:ring-4 focus:ring-blue-50
        "
      />
    </div>
  );
}

/* =====================================================
   EDITABLE TEXTAREA
===================================================== */

interface EditableTextareaProps {
  label: string;
  name: keyof CustomerProfileUpdate;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
}

function EditableTextarea({
  label,
  name,
  value,
  onChange,
}: EditableTextareaProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-semibold text-slate-500"
      >
        {label}
      </label>

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="
          w-full resize-none rounded-xl
          border border-slate-200
          bg-white px-4 py-3
          text-sm text-slate-700
          outline-none transition
          focus:border-[#0878E8]
          focus:ring-4 focus:ring-blue-50
        "
      />
    </div>
  );
}