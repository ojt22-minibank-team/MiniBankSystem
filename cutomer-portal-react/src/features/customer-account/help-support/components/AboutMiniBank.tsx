
import { Landmark, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const AboutMiniBank = () => {
  const { t } = useTranslation("help");

  const features = [
    {
      icon: Landmark,
      title: t("about.features.banking.title"),
      description: t("about.features.banking.description"),
    },
    {
      icon: ShieldCheck,
      title: t("about.features.security.title"),
      description: t("about.features.security.description"),
    },
    {
      icon: Users,
      title: t("about.features.customer.title"),
      description: t("about.features.customer.description"),
    },
  ];

  return (
    <section className="border-t border-gray-200 py-12">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {t("about.title")}
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-500">
          {t("about.description")}
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#0878E8]">
              <Icon size={22} />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AboutMiniBank;