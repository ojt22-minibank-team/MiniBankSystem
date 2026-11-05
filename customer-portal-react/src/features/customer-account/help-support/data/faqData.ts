import type { FAQTopic } from "../types/helpTypes";

export const FAQ_DATA: FAQTopic[] = [
  {
    id: "account-profile",
    titleKey: "faq.topics.accountProfile",
    items: [
      {
        id: "account",
        questionKey: "faq.account.question",
        answerKey: "faq.account.answer",
      },
      {
        id: "balance",
        questionKey: "faq.balance.question",
        answerKey: "faq.balance.answer",
      },
      {
        id: "profile",
        questionKey: "faq.profile.question",
        answerKey: "faq.profile.answer",
      },
    ],
  },
  {
    id: "login-security",
    titleKey: "faq.topics.loginSecurity",
    items: [
      {
        id: "login",
        questionKey: "faq.login.question",
        answerKey: "faq.login.answer",
      },
      {
        id: "transactionPin",
        questionKey: "faq.transactionPin.question",
        answerKey: "faq.transactionPin.answer",
      },
      {
        id: "pin",
        questionKey: "faq.pin.question",
        answerKey: "faq.pin.answer",
      },
    ],
  },
  {
    id: "settings-preferences",
    titleKey: "faq.topics.settingsPreferences",
    items: [
      {
        id: "language",
        questionKey: "faq.language.question",
        answerKey: "faq.language.answer",
      },
    ],
  },
  {
    id: "transfers-payments",
    titleKey: "faq.topics.transfersPayments",
    items: [
      {
        id: "transfer",
        questionKey: "faq.transfer.question",
        answerKey: "faq.transfer.answer",
      },
      {
        id: "accountTransfer",
        questionKey: "faq.accountTransfer.question",
        answerKey: "faq.accountTransfer.answer",
      },
    ],
  },
];