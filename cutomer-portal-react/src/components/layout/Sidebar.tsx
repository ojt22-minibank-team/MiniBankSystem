import {
  LayoutDashboard,
  WalletCards,
  ArrowLeftRight,
  History,
  Users,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Building2,
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




// ======================================================
// MAIN MENU
// ======================================================

const mainMenuItems = [
  {
    labelKey: "navigation.dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    labelKey: "navigation.accounts",
    path: "/accounts",
    icon: WalletCards,
  },
  {
    labelKey: "navigation.transfer",
    path: "/transfer",
    icon: ArrowLeftRight,
  },
  {
    labelKey: "navigation.transactionHistory",
    path: "/transaction",
    icon: History,
  },
  {
    labelKey: "navigation.accountStatement",
    path: "/statements",
    icon: FileText,
  },
  {
    labelKey: "navigation.beneficiaries",
    path: "/beneficiaries",
    icon: Users,
  },
  {
    labelKey: "navigation.announcements",
    path: "/announcements",
    icon: Megaphone,
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
  },
  {
    labelKey: "navigation.settings",
    path: "/settings",
    icon: Settings,
  },
  {
    labelKey: "navigation.support",
    path: "/support",
    icon: HelpCircle,
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
        border-slate-200
        bg-white
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
          border-slate-100
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
              bg-[#08295C]
              text-white
              shadow-sm
            "
          >

            <Building2
              size={21}
              strokeWidth={2.2}
            />

          </div>


          {/* Brand */}

          <div className="min-w-0">

            <h1
              className="
                text-[17px]
                font-bold
                tracking-tight
                text-[#08295C]
              "
            >
              MiniBank
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
              text-slate-400
            "
          >
            {t("navigation.banking")}
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
                              bg-[#EAF3FF]
                              font-semibold
                              text-[#0878E8]
                            `

                            : `
                              font-medium
                              text-slate-600
                              hover:bg-slate-50
                              hover:text-[#08295C]
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
                                  bg-[#0878E8]
                                  text-white
                                  shadow-sm
                                `

                                : `
                                  bg-slate-100
                                  text-slate-500
                                  group-hover:bg-slate-200
                                  group-hover:text-[#08295C]
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
                            truncate
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
                              text-[#0878E8]
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
              text-slate-400
            "
          >
            {t("navigation.account")}
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
                              bg-[#EAF3FF]
                              font-semibold
                              text-[#0878E8]
                            `

                            : `
                              font-medium
                              text-slate-600
                              hover:bg-slate-50
                              hover:text-[#08295C]
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
                                  bg-[#0878E8]
                                  text-white
                                  shadow-sm
                                `

                                : `
                                  bg-slate-100
                                  text-slate-500
                                  group-hover:bg-slate-200
                                  group-hover:text-[#08295C]
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
                              text-[#0878E8]
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
          LOGOUT
      ====================================================== */}

      <div
        className="
          shrink-0
          border-t
          border-slate-100
          p-4
        "
      >

        <button
          type="button"

          // Logout button click
          onClick={
            handleLogout
          }

          // Logout လုပ်နေတုန်း
          // ထပ်နှိပ်မရအောင်
          disabled={
            loggingOut
          }

          className="
            group
            flex
            w-full
            items-center
            gap-3
            rounded-xl
            px-3
            py-2.5
            text-sm
            font-medium
            text-slate-500
            transition-all
            duration-200

            hover:bg-red-50
            hover:text-red-600

            focus:outline-none
            focus:ring-2
            focus:ring-red-200

            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >

          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-slate-100
              transition-colors
              duration-200

              group-hover:bg-red-100
            "
          >

            <LogOut
              size={17}
            />

          </div>


          <span>

            {
              loggingOut
                ? t("navigation.loggingOut")
              : t("navigation.logout")
              }
            

          </span>

        </button>

      </div>

    </aside>

  );

}
