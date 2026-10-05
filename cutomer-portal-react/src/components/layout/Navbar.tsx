import {
  Bell,
  Search,
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  User,
  Building2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { getMyAccounts } from "../../features/customer-account/api/customerAccountApi";
import type { CustomerAccount } from "../../features/customer-account/types/accountTypes";

import { getMyProfile } from "../../features/customer-account/api/profileApi";
import type { CustomerProfile } from "../../features/customer-account/types/profileTypes";

import {
  PROFILE_UPDATED_EVENT,
} from "../../features/customer-account/profile/ProfilePage";

export default function Navbar() {
  const navigate = useNavigate();

  const [account, setAccount] =
    useState<CustomerAccount | null>(
      null
    );

  const [profile, setProfile] =
    useState<CustomerProfile | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  /**
   * =========================================
   * INITIAL NAVBAR DATA
   * =========================================
   */
  useEffect(() => {
    const loadNavbarData =
      async () => {
        try {
          const [
            accounts,
            customerProfile,
          ] = await Promise.all([
            getMyAccounts(),
            getMyProfile(),
          ]);

          setAccount(
            accounts[0] ?? null
          );

          setProfile(
            customerProfile
          );
        } catch (error) {
          console.error(
            "Failed to load navbar data:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

    void loadNavbarData();
  }, []);

  /**
   * =========================================
   * PROFILE UPDATE EVENT
   * =========================================
   *
   * ProfilePage sends the updated profile
   * through CustomEvent.detail.
   *
   * Navbar updates immediately without
   * making another GET /profile request.
   */
  useEffect(() => {
    const handleProfileUpdated = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<CustomerProfile>;

      if (!customEvent.detail) {
        return;
      }

      setProfile(
        customEvent.detail
      );
    };

    window.addEventListener(
      PROFILE_UPDATED_EVENT,
      handleProfileUpdated
    );

    return () => {
      window.removeEventListener(
        PROFILE_UPDATED_EVENT,
        handleProfileUpdated
      );
    };
  }, []);

  /**
   * =========================================
   * CUSTOMER TYPE
   * =========================================
   */
  const customerType =
    profile?.customerType?.toUpperCase();

  const isCompany =
    customerType === "COMPANY" ||
    customerType === "CORPORATE";

  /**
   * =========================================
   * CUSTOMER NAME
   * =========================================
   */
  const customerName =
    isCompany
      ? profile?.companyName ||
        "Company Customer"
      : [
          profile?.firstName,
          profile?.lastName,
        ]
          .filter(Boolean)
          .join(" ") ||
        "Customer";

  /**
   * =========================================
   * AVATAR INITIALS
   * =========================================
   */
  const initials =
    isCompany
      ? getCompanyInitials(
          profile?.companyName
        )
      : getPersonalInitials(
          profile?.firstName,
          profile?.lastName
        );

  /**
   * =========================================
   * GO TO PROFILE
   * =========================================
   */
  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <header
      className="
        fixed left-64 right-0 top-0 z-20
        flex h-20 items-center justify-between
        border-b border-slate-200
        bg-white px-8
      "
    >
      {/* =====================================
          SEARCH
      ====================================== */}

      <div className="flex items-center">
        <div className="relative w-[360px]">
          <Search
            size={18}
            className="
              pointer-events-none
              absolute left-3.5 top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            type="search"
            placeholder="Search accounts or transactions"
            aria-label="Search accounts or transactions"
            className="
              h-10 w-full rounded-xl
              border border-slate-200
              bg-slate-50
              pl-10 pr-4
              text-sm text-slate-700
              placeholder:text-slate-400
              outline-none
              transition-all duration-200
              hover:border-slate-300
              focus:border-[#0878E8]
              focus:bg-white
              focus:ring-4 focus:ring-blue-50
            "
          />
        </div>
      </div>

      {/* =====================================
          RIGHT SECTION
      ====================================== */}

      <div className="flex items-center gap-2">

        {/* ===================================
            HELP
        ==================================== */}

        <button
          type="button"
          aria-label="Help and Support"
          className="
            flex h-10 w-10
            items-center justify-center
            rounded-xl
            text-slate-500
            transition
            hover:bg-slate-50
            hover:text-[#08295C]
            focus:outline-none
            focus:ring-2
            focus:ring-blue-100
          "
        >
          <HelpCircle size={19} />
        </button>

        {/* ===================================
            NOTIFICATIONS
        ==================================== */}

        <button
          type="button"
          aria-label="Notifications"
          className="
            relative flex h-10 w-10
            items-center justify-center
            rounded-xl
            text-slate-500
            transition
            hover:bg-slate-50
            hover:text-[#08295C]
            focus:outline-none
            focus:ring-2
            focus:ring-blue-100
          "
        >
          <Bell size={19} />

          <span
            className="
              absolute right-2 top-2
              h-2 w-2
              rounded-full
              bg-red-500
              ring-2 ring-white
            "
          />
        </button>

        {/* ===================================
            DIVIDER
        ==================================== */}

        <div className="mx-3 h-8 w-px bg-slate-200" />

        {/* ===================================
            SECURITY
        ==================================== */}

        <div className="hidden items-center gap-2 xl:flex">
          <div
            className="
              flex h-8 w-8
              items-center justify-center
              rounded-lg
              bg-emerald-50
            "
          >
            <ShieldCheck
              size={16}
              className="text-emerald-600"
            />
          </div>

          <div className="leading-tight">
            <p
              className="
                text-[10px]
                font-medium
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              Security
            </p>

            <p
              className="
                text-xs
                font-semibold
                text-emerald-600
              "
            >
              Protected
            </p>
          </div>
        </div>

        {/* ===================================
            CUSTOMER PROFILE
        ==================================== */}

        <button
          type="button"
          aria-label="Open profile"
          onClick={handleProfileClick}
          className="
            group ml-3
            flex items-center gap-3
            rounded-xl
            p-1.5 pr-2.5
            transition
            hover:bg-slate-50
            focus:outline-none
            focus:ring-2
            focus:ring-blue-100
          "
        >
          {/* =================================
              AVATAR
          ================================== */}

          <div className="relative shrink-0">

            {profile?.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={customerName}
                className="
                  h-10 w-10
                  rounded-full
                  object-cover
                  ring-2 ring-slate-100
                "
              />
            ) : (
              <div
                className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-full
                  bg-[#08295C]
                  text-sm
                  font-bold
                  text-white
                  ring-2 ring-slate-100
                "
              >
                {loading
                  ? "..."
                  : initials}
              </div>
            )}

            {/* ONLINE INDICATOR */}

            <span
              className="
                absolute bottom-0 right-0
                h-2.5 w-2.5
                rounded-full
                bg-emerald-500
                ring-2 ring-white
              "
            />
          </div>

          {/* =================================
              CUSTOMER INFO
          ================================== */}

          <div className="hidden min-w-0 text-left sm:block">

            <div className="flex items-center gap-1.5">

              {isCompany ? (
                <Building2
                  size={12}
                  className="
                    shrink-0
                    text-slate-400
                  "
                />
              ) : (
                <User
                  size={12}
                  className="
                    shrink-0
                    text-slate-400
                  "
                />
              )}

              <p
                className="
                  max-w-[150px]
                  truncate
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                {loading
                  ? "Loading..."
                  : customerName}
              </p>
            </div>

            <p
              className="
                mt-0.5
                max-w-[150px]
                truncate
                text-[11px]
                font-medium
                text-slate-400
              "
            >
              {profile?.customerCode ??
                "No customer ID"}
            </p>
          </div>

          {/* =================================
              DROPDOWN / NAVIGATION ICON
          ================================== */}

          <ChevronDown
            size={16}
            className="
              text-slate-400
              transition-transform
              duration-200
              group-hover:text-slate-600
            "
          />
        </button>
      </div>
    </header>
  );
}

/**
 * =========================================
 * PERSONAL INITIALS
 * =========================================
 */
function getPersonalInitials(
  firstName:
    | string
    | null
    | undefined,
  lastName:
    | string
    | null
    | undefined
): string {
  const initials = [
    firstName,
    lastName,
  ]
    .filter(
      (
        value
      ): value is string =>
        Boolean(value?.trim())
    )
    .map(
      (value) =>
        value
          .trim()
          .charAt(0)
    )
    .join("");

  return (
    initials
      .slice(0, 2)
      .toUpperCase() ||
    "CU"
  );
}

/**
 * =========================================
 * COMPANY INITIALS
 * =========================================
 */
function getCompanyInitials(
  companyName:
    | string
    | null
    | undefined
): string {
  if (!companyName?.trim()) {
    return "CO";
  }

  const words =
    companyName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  /**
   * Single-word company name
   *
   * Example:
   * Apple -> AP
   */
  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  /**
   * Multiple-word company name
   *
   * Example:
   * ABC Trading Company -> AT
   */
  return words
    .slice(0, 2)
    .map(
      (word) =>
        word.charAt(0)
    )
    .join("")
    .toUpperCase();
}