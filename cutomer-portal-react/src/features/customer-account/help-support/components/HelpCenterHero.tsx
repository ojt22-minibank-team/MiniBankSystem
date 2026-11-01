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
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08295C] via-[#0878E8] to-[#38A1F5] px-6 py-16 text-center sm:px-10 sm:py-20">

      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-[#08295C]/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-2xl">

        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t("hero.title")}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
          {t("hero.description")}
        </p>

        <div className="mx-auto mt-8 flex max-w-lg items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg shadow-blue-950/20 focus-within:ring-2 focus-within:ring-blue-200">

          <Search className="h-5 w-5 shrink-0 text-gray-500" />

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