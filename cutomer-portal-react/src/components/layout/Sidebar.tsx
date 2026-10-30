import {
  LayoutDashboard,
  WalletCards,
  Send,
  Clock,
  Users,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Megaphone,
  FileText,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

import {
  useEffect,
  useSyncExternalStore,
} from "react";

import { useTranslation } from "react-i18next";
import { isIndividualLogoutInProgress, useIndividualLogout } from "../../features/auth/hooks/useIndividualLogout";
import { getAuthenticationGeneration, subscribeToAuthenticationChanges } from "../../utils/tokenStorage";
import { useAppDispatch ,useAppSelector } from "../../lib/redux";
import { fetchAnnouncements } from "../../features/customer-account/announcements/store/announcementSlice";
import { EkarajCrown } from "../common/EkarajLogo";




// ======================================================
// MAIN MENU
// ======================================================

const mainMenuItems = [
  {
    labelKey: "navigation.dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    labelKey: "navigation.accounts",
    path: "/accounts",
    icon: WalletCards,
    iconColor: "text-violet-600",
    bgColor: "bg-violet-50",
  },
  {
    labelKey: "navigation.transfer",
    path: "/transfer",
    icon: Send,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    labelKey: "navigation.transactionHistory",
    path: "/transaction",
    icon: Clock,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    labelKey: "navigation.accountStatement",
    path: "/statements",
    icon: FileText,
    iconColor: "text-sky-600",
    bgColor: "bg-sky-50",
  },
  {
    labelKey: "navigation.beneficiaries",
    path: "/beneficiaries",
    icon: Users,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    labelKey: "navigation.announcements",
    path: "/announcements",
    icon: Megaphone,
    iconColor: "text-rose-600",
    bgColor: "bg-rose-50",
  },
] as const;


// ======================================================
// ACCOUNT MENU
// ======================================================

const accountMenuItems = [
  {
    labelKey: "navigation.profile",
    path: "/profile",
    icon: User,
    iconColor: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    labelKey: "navigation.settings",
    path: "/settings",
    icon: Settings,
    iconColor: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  {
    labelKey: "navigation.support",
    path: "/support",
    icon: HelpCircle,
    iconColor: "text-teal-600",
    bgColor: "bg-teal-50",
  },
] as const;


// ======================================================
// SIDEBAR
// ======================================================

export default function Sidebar() {

  const handleLogout = useIndividualLogout();
  // A previous session's pending logout must not disable this session's button.
  useSyncExternalStore(subscribeToAuthenticationChanges, getAuthenticationGeneration);
  const loggingOut = isIndividualLogoutInProgress();

   const dispatch = useAppDispatch();

  const { t } = useTranslation("common");
    useEffect(() => {
    void dispatch(fetchAnnouncements());
  }, [dispatch]);

  // Redux ထဲက မဖတ်ရသေးတဲ့ announcement အရေအတွက်ကိုတွက်မယ်။
  const unreadAnnouncementCount = useAppSelector((state) =>
    state.announcements.announcements.filter(
      (announcement) => !announcement.isRead,
    ).length,
  );


  // ====================================================
  // UI
  // ====================================================

  return (

    <aside
      className="
        fixed
        left-0
        top-0
        z-30
        flex
        h-screen
        w-64
        flex-col
        border-r
        border-slate-200 dark:border-slate-800
        bg-white dark:bg-[#0A192F]
        transition-colors duration-200
      "
    >

      {/* =====================================================
          BRAND
      ====================================================== */}

      <div
        className="
          flex
          h-20
          shrink-0
          items-center
          border-b
          border-slate-100 dark:border-slate-800
          px-6
        "
      >

        <div className="flex items-center gap-3">

          {/* Bank Logo */}

          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-gradient-to-br from-[#0A192F] to-[#153564]
              text-white
              shadow-sm
              ring-1 ring-white/10
            "
          >

            <EkarajCrown
              size={28}
            />

          </div>


          {/* Brand */}

          <div className="min-w-0">

            <h1
              className="
                text-[16px]
                font-extrabold
                tracking-tight
                text-[#0A192F] dark:text-white
              "
            >
              EKARAJ BANK
            </h1>

            <p
              className="
                text-[11px]
                font-medium
                text-slate-400
              "
            >
              {t("customerPortal")}
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav
        className="
          flex-1
          overflow-y-auto
          px-4
          py-6
        "
      >

        {/* =================================================
            MAIN NAVIGATION
        ================================================= */}

        <div className="mb-7">

          <p
            className="
              mb-3
              px-3
              text-[10px]
              font-bold
              uppercase
              tracking-[0.12em]
              text-slate-400 dark:text-slate-500
            "
          >
            {t("navigation.banking", { defaultValue: "Banking" })}
          </p>


          <div className="space-y-1">

            {mainMenuItems.map(
              (item) => {

                const Icon =
                  item.icon;


                return (

                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({
                      isActive,
                    }) =>
                      `
                        group
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        px-3
                        py-2.5
                        text-sm
                        transition-all
                        duration-200
                        ${
                          isActive

                            ? `
                              bg-cyan-50/80 dark:bg-cyan-950/50
                              font-semibold
                              text-[#00A3C4]
                            `

                            : `
                              font-medium
                              text-slate-600 dark:text-slate-300
                              hover:bg-slate-50 dark:hover:bg-slate-800/70
                              hover:text-[#0A192F] dark:hover:text-white
                            `
                        }
                      `
                    }
                  >

                    {({
                      isActive,
                    }) => (

                      <>

                        {/* Icon */}

                        <div
                          className={`
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            transition-all
                            duration-200

                            ${
                              isActive

                                ? `
                                  bg-gradient-to-r from-[#00A3C4] to-[#0284C7]
                                  text-white
                                  shadow-sm
                                  shadow-cyan-500/20
                                `

                                : `
                                  ${item.bgColor}
                                  ${item.iconColor}
                                  group-hover:scale-105
                                `
                            }
                          `}
                        >

                          <Icon
                            size={17}
                            strokeWidth={
                              isActive
                                ? 2.3
                                : 2
                            }
                          />

                        </div>


                        {/* Label */}

                        <span
                          className="
                            flex-1
                            truncate text-[13.5px] leading-tight
                          "
                        >
                          {t(item.labelKey)}
                        </span>

                                         {/* Announcements unread count badge */}
                        {item.path === "/announcements" &&
                          unreadAnnouncementCount > 0 && (
                            <span
                              aria-label={`${unreadAnnouncementCount} unread announcements`}
                              className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-white"
                            >
                              {unreadAnnouncementCount > 99
                                ? "99+"
                                : unreadAnnouncementCount}
                            </span>
                          )}

                        {/* Active Indicator */}

                        {isActive && (

                          <ChevronRight
                            size={15}
                            strokeWidth={2.5}
                            className="
                              shrink-0
                              text-[#00A3C4]
                            "
                          />

                        )}

                      </>

                    )}

                  </NavLink>

                );

              }
            )}

          </div>

        </div>


        {/* =================================================
            ACCOUNT NAVIGATION
        ================================================= */}

        <div>

          <p
            className="
              mb-3
              px-3
              text-[10px]
              font-bold
              uppercase
              tracking-[0.12em]
              text-slate-400 dark:text-slate-500
            "
          >
            {t("navigation.account", { defaultValue: "Account" })}
          </p>


          <div className="space-y-1">

            {accountMenuItems.map(
              (item) => {

                const Icon =
                  item.icon;


                return (

                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({
                      isActive,
                    }) =>
                      `
                        group
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        px-3
                        py-2.5
                        text-sm
                        transition-all
                        duration-200

                        ${
                          isActive

                            ? `
                              bg-cyan-50/80 dark:bg-cyan-950/50
                              font-semibold
                              text-[#00A3C4]
                            `

                            : `
                              font-medium
                              text-slate-600 dark:text-slate-300
                              hover:bg-slate-50 dark:hover:bg-slate-800/70
                              hover:text-[#0A192F] dark:hover:text-white
                            `
                        }
                      `
                    }
                  >

                    {({
                      isActive,
                    }) => (

                      <>

                        <div
                          className={`
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            transition-all
                            duration-200

                            ${
                              isActive

                                ? `
                                  bg-gradient-to-r from-[#00A3C4] to-[#0284C7]
                                  text-white
                                  shadow-sm
                                  shadow-cyan-500/20
                                `

                                : `
                                  ${item.bgColor}
                                  ${item.iconColor}
                                  group-hover:scale-105
                                `
                            }
                          `}
                        >

                          <Icon
                            size={17}
                            strokeWidth={
                              isActive
                                ? 2.3
                                : 2
                            }
                          />

                        </div>


                        <span
                          className="
                            flex-1
                            truncate
                          "
                        >
                          {t(item.labelKey)}
                        </span>


                        {isActive && (

                          <ChevronRight
                            size={15}
                            strokeWidth={2.5}
                            className="
                              shrink-0
                              text-[#00A3C4]
                            "
                          />

                        )}

                      </>

                    )}

                  </NavLink>

                );

              }
            )}

          </div>

        </div>

      </nav>


      {/* =====================================================
          LOGOUT (Modern Card Design)
      ====================================================== */}

      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 p-3.5">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="group relative flex w-full items-center justify-between rounded-2xl border border-red-100/80 dark:border-red-950/60 bg-gradient-to-r from-red-50/60 via-rose-50/40 to-slate-50/60 dark:from-red-950/20 dark:via-rose-950/15 dark:to-slate-900/40 p-2.5 transition-all duration-200 hover:border-red-200 dark:hover:border-red-900/80 hover:from-red-100/70 hover:to-rose-100/50 dark:hover:from-red-950/40 dark:hover:to-rose-950/30 hover:shadow-xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon Box */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100/80 dark:bg-red-950/80 text-red-600 dark:text-red-400 shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:bg-red-600 group-hover:text-white">
              <LogOut size={16} strokeWidth={2.2} />
            </div>

            {/* Labels */}
            <div className="text-left min-w-0">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors group-hover:text-red-700 dark:group-hover:text-red-300">
                {loggingOut ? t("navigation.loggingOut") : t("navigation.logout")}
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 group-hover:text-red-500/80">
                End active session
              </p>
            </div>
          </div>

          {/* Right Indicator */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-400">
            <ChevronRight size={14} strokeWidth={2.5} />
          </div>
        </button>
      </div>
    </aside>
  );
}
