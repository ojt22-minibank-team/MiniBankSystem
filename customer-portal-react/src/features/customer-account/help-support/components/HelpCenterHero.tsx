
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HelpCenterHeroProps {
  search: string;
  onSearchChange: (value: string) => void;
}

const HelpCenterHero = ({
  search,
  onSearchChange,
}: HelpCenterHeroProps) => {
  const { t } = useTranslation("help");

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08295C] via-[#0878E8] to-[#38A1F5] px-5 py-9 text-center sm:px-8 sm:py-11">

      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[#08295C]/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-2xl">

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {t("hero.title")}
        </h1>

        <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-white/85 sm:text-sm">
          {t("hero.description")}
        </p>

        <div className="mx-auto mt-5 flex max-w-md items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-md shadow-blue-950/20 focus-within:ring-2 focus-within:ring-blue-200">

          <Search className="h-4 w-4 shrink-0 text-gray-500" />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder={t("hero.searchPlaceholder")}
            aria-label={t("hero.searchPlaceholder")}
            className="w-full border-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0"
          />

        </div>

      </div>
    </section>
  );
};

export default HelpCenterHero;
