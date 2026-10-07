import {
  Bell,
  Search,
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  User,
  Building2,
  WalletCards,
  CreditCard,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  getMyAccounts,
} from "../../features/customer-account/api/customerAccountApi";

import type {
  CustomerAccount,
} from "../../features/customer-account/types/accountTypes";

import {
  useAppSelector,
} from "../../lib/redux";

export default function Navbar() {
  const navigate = useNavigate();

  const profileMenuRef =
    useRef<HTMLDivElement | null>(null);

  const [accounts, setAccounts] =
    useState<CustomerAccount[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [isProfileMenuOpen, setIsProfileMenuOpen] =
    useState(false);

  /**
   * =========================================
   * PROFILE FROM REDUX
   * =========================================
   */
  const profile = useAppSelector(
    (state) => state.profile.profile
  );

  /**
   * =========================================
   * LOAD CUSTOMER ACCOUNTS
   * =========================================
   *
   * Profile information comes from Redux.
   * Accounts are loaded from the Customer
   * Account API because the Navbar needs
   * the latest account balances/statuses.
   */
  useEffect(() => {
    const loadAccounts =
      async () => {
        try {
          setLoading(true);

          const data =
            await getMyAccounts();

          setAccounts(data);
        } catch (error) {
          console.error(
            "Failed to load navbar accounts:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

    void loadAccounts();
  }, []);

  /**
   * =========================================
   * CLOSE PROFILE MENU ON OUTSIDE CLICK
   * =========================================
   */
  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent
    ) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [isProfileMenuOpen]);

  /**
   * =========================================
   * CLOSE PROFILE MENU WITH ESCAPE
   * =========================================
   */
  useEffect(() => {
    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener(
        "keydown",
        handleEscape
      );
    }

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isProfileMenuOpen]);

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
   * ACCOUNT FILTERING
   * =========================================
   */
  const savingsAccounts =
    accounts.filter(
      (account) =>
        account.accountCategory?.toUpperCase() ===
          "SAVINGS" ||
        account.accountType?.toUpperCase() ===
          "SAVINGS"
    );

  const currentAccounts =
    accounts.filter(
      (account) =>
        account.accountCategory?.toUpperCase() ===
          "CURRENT" ||
        account.accountType?.toUpperCase() ===
          "CURRENT"
    );

  /**
   * =========================================
   * NAVIGATION
   * =========================================
   */
  const handleProfileClick = () => {
    setIsProfileMenuOpen(false);
    navigate("/profile");
  };

  const handleAccountsClick = () => {
    setIsProfileMenuOpen(false);
    navigate("/accounts");
  };

  const handleSettingsClick = () => {
    setIsProfileMenuOpen(false);
    navigate("/settings");
  };

  const handleAccountClick = (
    accountNumber: string
  ) => {
    setIsProfileMenuOpen(false);

    /**
     * Your account detail API uses
     * accountNumber as the identifier.
     *
     * If your account detail route is
     * `/accounts/:accountNumber`, this
     * navigates directly to that account.
     */
    navigate(
      `/accounts/${encodeURIComponent(
        accountNumber
      )}`
    );
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);

    /**
     * Keep your existing authentication
     * logout implementation here.
     *
     * Do not clear Redux manually unless
     * your authentication flow requires it.
     */
    navigate("/");
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
            PROFILE + DROPDOWN
        ==================================== */}

        <div
          ref={profileMenuRef}
          className="relative"
        >
          {/* =================================
              PROFILE BUTTON
          ================================== */}

          <button
            type="button"
            aria-label="Open profile menu"
            aria-expanded={
              isProfileMenuOpen
            }
            onClick={() =>
              setIsProfileMenuOpen(
                (previous) =>
                  !previous
              )
            }
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
            {/* AVATAR */}

            <div className="relative shrink-0">

              {profile?.profileImageUrl ? (
                <img
                  src={
                    profile.profileImageUrl
                  }
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

            {/* CUSTOMER INFO */}

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

            {/* DROPDOWN ARROW */}

            <ChevronDown
              size={16}
              className={`
                text-slate-400
                transition-transform
                duration-200
                group-hover:text-slate-600
                ${
                  isProfileMenuOpen
                    ? "rotate-180"
                    : ""
                }
              `}
            />
          </button>

          {/* =================================
              PROFILE DROPDOWN
          ================================== */}

          {isProfileMenuOpen && (
            <div
              className="
                absolute right-0 top-[calc(100%+10px)]
                w-[360px]
                overflow-hidden
                rounded-2xl
                border border-slate-200
                bg-white
                shadow-xl shadow-slate-200/60
              "
            >
              {/* =============================
                  PROFILE HEADER
              ============================== */}

              <div
                className="
                  border-b border-slate-100
                  px-4 py-4
                "
              >
                <div className="flex items-center gap-3">

                  {profile?.profileImageUrl ? (
                    <img
                      src={
                        profile.profileImageUrl
                      }
                      alt={customerName}
                      className="
                        h-12 w-12
                        shrink-0
                        rounded-full
                        object-cover
                        ring-2 ring-slate-100
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex h-12 w-12
                        shrink-0
                        items-center justify-center
                        rounded-full
                        bg-[#08295C]
                        text-sm
                        font-bold
                        text-white
                      "
                    >
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isCompany ? (
                        <Building2
                          size={13}
                          className="text-slate-400"
                        />
                      ) : (
                        <User
                          size={13}
                          className="text-slate-400"
                        />
                      )}

                      <p
                        className="
                          truncate
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        {customerName}
                      </p>
                    </div>

                    <p
                      className="
                        mt-0.5
                        truncate
                        text-xs
                        text-slate-400
                      "
                    >
                      {profile?.customerCode ??
                        "No customer ID"}
                    </p>
                  </div>
                </div>
              </div>

              {/* =============================
                  MY ACCOUNTS
              ============================== */}

              <div className="px-4 py-3">

                <div className="mb-2 flex items-center justify-between">
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    My Accounts
                  </p>

                  <span
                    className="
                      rounded-full
                      bg-slate-100
                      px-2 py-0.5
                      text-[10px]
                      font-medium
                      text-slate-500
                    "
                  >
                    {accounts.length}
                  </span>
                </div>

                {/* ACCOUNT LIST */}

                <div className="space-y-2">

                  {loading ? (
                    <>
                      <AccountSkeleton />
                      <AccountSkeleton />
                    </>
                  ) : accounts.length === 0 ? (
                    <div
                      className="
                        rounded-xl
                        border border-dashed
                        border-slate-200
                        px-4 py-5
                        text-center
                      "
                    >
                      <WalletCards
                        size={20}
                        className="
                          mx-auto
                          mb-2
                          text-slate-300
                        "
                      />

                      <p
                        className="
                          text-xs
                          font-medium
                          text-slate-500
                        "
                      >
                        No accounts available
                      </p>
                    </div>
                  ) : (
                    <>
                      {savingsAccounts.map(
                        (account) => (
                          <AccountItem
                            key={
                              account.accountNumber
                            }
                            account={account}
                            icon={
                              <WalletCards
                                size={17}
                              />
                            }
                            onClick={() =>
                              handleAccountClick(
                                account.accountNumber
                              )
                            }
                          />
                        )
                      )}

                      {currentAccounts.map(
                        (account) => (
                          <AccountItem
                            key={
                              account.accountNumber
                            }
                            account={account}
                            icon={
                              <CreditCard
                                size={17}
                              />
                            }
                            onClick={() =>
                              handleAccountClick(
                                account.accountNumber
                              )
                            }
                          />
                        )
                      )}
                    </>
                  )}
                </div>

                {/* OTHER ACCOUNT TYPES */}

                {!loading &&
                  accounts.some(
                    (account) => {
                      const category =
                        account.accountCategory?.toUpperCase();

                      const type =
                        account.accountType?.toUpperCase();

                      return (
                        category !==
                          "SAVINGS" &&
                        category !==
                          "CURRENT" &&
                        type !==
                          "SAVINGS" &&
                        type !==
                          "CURRENT"
                      );
                    }
                  ) && (
                    <div className="mt-2 space-y-2">
                      {accounts
                        .filter(
                          (account) => {
                            const category =
                              account.accountCategory?.toUpperCase();

                            const type =
                              account.accountType?.toUpperCase();

                            return (
                              category !==
                                "SAVINGS" &&
                              category !==
                                "CURRENT" &&
                              type !==
                                "SAVINGS" &&
                              type !==
                                "CURRENT"
                            );
                          }
                        )
                        .map(
                          (account) => (
                            <AccountItem
                              key={
                                account.accountNumber
                              }
                              account={
                                account
                              }
                              icon={
                                <WalletCards
                                  size={17}
                                />
                              }
                              onClick={() =>
                                handleAccountClick(
                                  account.accountNumber
                                )
                              }
                            />
                          )
                        )}
                    </div>
                  )}
              </div>

              {/* =============================
                  VIEW ALL ACCOUNTS
              ============================== */}

              <div className="border-t border-slate-100 px-4 py-2">

                <button
                  type="button"
                  onClick={
                    handleAccountsClick
                  }
                  className="
                    flex w-full
                    items-center
                    justify-between
                    rounded-lg
                    px-2 py-2.5
                    text-left
                    text-xs
                    font-semibold
                    text-[#0878E8]
                    transition
                    hover:bg-blue-50
                  "
                >
                  <span>
                    View all accounts
                  </span>

                  <ExternalLink
                    size={14}
                  />
                </button>
              </div>

              {/* =============================
                  MENU ITEMS
              ============================== */}

              <div
                className="
                  border-t
                  border-slate-100
                  px-2 py-2
                "
              >
                <DropdownMenuItem
                  icon={
                    <User size={16} />
                  }
                  label="Profile"
                  onClick={
                    handleProfileClick
                  }
                />

                <DropdownMenuItem
                  icon={
                    <Settings size={16} />
                  }
                  label="Settings"
                  onClick={
                    handleSettingsClick
                  }
                />

                <DropdownMenuItem
                  icon={
                    <LogOut size={16} />
                  }
                  label="Log out"
                  danger
                  onClick={
                    handleLogout
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * =========================================
 * ACCOUNT ITEM
 * =========================================
 */
interface AccountItemProps {
  account: CustomerAccount;
  icon: React.ReactNode;
  onClick: () => void;
}

function AccountItem({
  account,
  icon,
  onClick,
}: AccountItemProps) {
  const accountLabel =
    getAccountLabel(account);

  const accountNumber =
    maskAccountNumber(
      account.accountNumber
    );

  const balance =
    formatMoney(
      account.currentBalance,
      account.currency
    );

  const status =
    account.status?.toUpperCase();

  const isActive =
    status === "ACTIVE";

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex w-full
        items-center gap-3
        rounded-xl
        border border-slate-100
        bg-slate-50/70
        px-3 py-3
        text-left
        transition
        hover:border-slate-200
        hover:bg-slate-100
      "
    >
      {/* ACCOUNT ICON */}

      <div
        className="
          flex h-9 w-9
          shrink-0
          items-center justify-center
          rounded-lg
          bg-white
          text-[#0878E8]
          shadow-sm
          ring-1 ring-slate-100
        "
      >
        {icon}
      </div>

      {/* ACCOUNT INFORMATION */}

      <div className="min-w-0 flex-1">

        <div className="flex items-center justify-between gap-2">

          <p
            className="
              text-xs
              font-semibold
              text-slate-700
            "
          >
            {accountLabel}
          </p>

          <span
            className={`
              shrink-0
              rounded-full
              px-1.5 py-0.5
              text-[9px]
              font-semibold
              ${
                isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }
            `}
          >
            {status ?? "UNKNOWN"}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">

          <p
            className="
              truncate
              text-[11px]
              font-medium
              text-slate-400
            "
          >
            {accountNumber}
          </p>

          <p
            className="
              shrink-0
              text-xs
              font-bold
              text-slate-800
            "
          >
            {balance}
          </p>
        </div>
      </div>

      <ChevronDown
        size={13}
        className="
          -rotate-90
          shrink-0
          text-slate-300
        "
      />
    </button>
  );
}

/**
 * =========================================
 * ACCOUNT SKELETON
 * =========================================
 */
function AccountSkeleton() {
  return (
    <div
      className="
        flex items-center gap-3
        rounded-xl
        border border-slate-100
        bg-slate-50/70
        px-3 py-3
      "
    >
      <div
        className="
          h-9 w-9
          animate-pulse
          rounded-lg
          bg-slate-200
        "
      />

      <div className="flex-1 space-y-2">
        <div
          className="
            h-3
            w-20
            animate-pulse
            rounded
            bg-slate-200
          "
        />

        <div
          className="
            h-2.5
            w-28
            animate-pulse
            rounded
            bg-slate-200
          "
        />
      </div>

      <div
        className="
          h-3
          w-16
          animate-pulse
          rounded
          bg-slate-200
        "
      />
    </div>
  );
}

/**
 * =========================================
 * DROPDOWN MENU ITEM
 * =========================================
 */
interface DropdownMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function DropdownMenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex w-full
        items-center gap-3
        rounded-lg
        px-3 py-2.5
        text-left
        text-xs
        font-medium
        transition
        ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
        }
      `}
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}

/**
 * =========================================
 * ACCOUNT LABEL
 * =========================================
 */
function getAccountLabel(
  account: CustomerAccount
): string {
  const category =
    account.accountCategory?.toUpperCase();

  const type =
    account.accountType?.toUpperCase();

  if (
    category === "SAVINGS" ||
    type === "SAVINGS"
  ) {
    return "Savings Account";
  }

  if (
    category === "CURRENT" ||
    type === "CURRENT"
  ) {
    return "Current Account";
  }

  if (
    category === "FIXED_DEPOSIT" ||
    type === "FIXED_DEPOSIT"
  ) {
    return "Fixed Deposit";
  }

  if (
    category === "SALARY" ||
    type === "SALARY"
  ) {
    return "Salary Account";
  }

  return (
    account.accountCategory ||
    account.accountType ||
    "Bank Account"
  );
}

/**
 * =========================================
 * MASK ACCOUNT NUMBER
 * =========================================
 */
function maskAccountNumber(
  accountNumber: string
): string {
  if (!accountNumber) {
    return "••••";
  }

  if (accountNumber.length <= 4) {
    return `•••• ${accountNumber}`;
  }

  return `•••• ${accountNumber.slice(-4)}`;
}

/**
 * =========================================
 * FORMAT MONEY
 * =========================================
 */
function formatMoney(
  value: number | null | undefined,
  currency?: string | null
): string {
  const amount = Number(value ?? 0);

  const formatted =
    new Intl.NumberFormat(
      "en-US",
      {
        maximumFractionDigits: 2,
      }
    ).format(amount);

  return `${currency ?? "MMK"} ${formatted}`;
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