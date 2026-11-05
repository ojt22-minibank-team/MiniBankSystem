
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { FAQ_DATA } from "../data/faqData";
import FAQTopic from "./FAQTopic";

interface FAQSectionProps {
  search: string;
}

const FAQSection = ({ search }: FAQSectionProps) => {
  const { t } = useTranslation("help");

  const filteredTopics = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return FAQ_DATA;
    }

    return FAQ_DATA.map((topic) => ({
      ...topic,
      items: topic.items.filter((item) => {
        const question = t(item.questionKey);
        const answer = t(item.answerKey);

        return (
          question.toLowerCase().includes(searchText) ||
          answer.toLowerCase().includes(searchText)
        );
      }),
    })).filter(
      (topic) =>
        topic.items.length > 0 ||
        t(topic.titleKey).toLowerCase().includes(searchText),
    );
  }, [search, t]);

  return (
    <section className="w-full py-10">
      <div className="w-full">
        {filteredTopics.length > 0 ? (
          filteredTopics.map((topic) => (
            <FAQTopic key={topic.id} topic={topic} />
          ))
        ) : (
          <div className="rounded-xl bg-gray-50 px-6 py-10 text-center">
            <p className="font-semibold text-gray-700">
              {t("faq.noResults")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FAQSection;
