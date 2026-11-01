export interface FAQItem {
  id: string;
  questionKey: string;
  answerKey: string;
}

export interface FAQTopic {
  id: string;
  titleKey: string;
  items: FAQItem[];
}