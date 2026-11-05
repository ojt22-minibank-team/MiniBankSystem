
import { useTranslation } from "react-i18next";

import type { FAQTopic as FAQTopicType } from "../types/helpTypes";
import FAQItem from "./FAQItem";

interface FAQTopicProps {
  topic: FAQTopicType;
}

const FAQTopic = ({ topic }: FAQTopicProps) => {
  const { t } = useTranslation("help");

  return (
<div className="border-b border-gray-200 py-5 last:border-b-0 last:pb-0">      
    <h3 className="mb-2 text-base font-semibold text-gray-900">
        {t(topic.titleKey)}
      </h3>

      <div>
        {topic.items.map((item) => (
          <FAQItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default FAQTopic;
