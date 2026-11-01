import { ChevronDown, CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { FAQItem as FAQItemType } from "../types/helpTypes";

interface FAQItemProps {
  item: FAQItemType;
}

const FAQItem = ({ item }: FAQItemProps) => {
  const { t } = useTranslation("help");

  return (
    <details className="group border-b border-gray-100 py-4 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-gray-800 transition-colors hover:text-blue-700 sm:text-base [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <CircleHelp className="h-4 w-4 shrink-0 text-blue-600" />
          <span>{t(item.questionKey)}</span>
        </span>

        <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <p className="mt-3 pr-8 text-sm leading-7 text-gray-600">
        {t(item.answerKey)}
      </p>
    </details>
  );
};

export default FAQItem;