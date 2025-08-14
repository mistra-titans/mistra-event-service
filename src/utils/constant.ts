import { t } from "elysia";

const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;


export const QUERY_CONFIG = t.Object({
  page: t.Number({ default: 1 }),
  limit: t.Number({ default: 10 }),
  sort: t.Optional(t.String({ default: "created_at" })),
  order: t.Optional(t.Enum({ asc: "asc", desc: "desc" }, { default: "desc" })),
});

export const CURRENCY_EMUM = t.Enum({
  GHC: "GHC",
  USD: "USD",
  NGN: "NGN"
})

export const TRANSACTION_TYPE_ENUM = t.Enum({
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  TRANSFER: "TRANSFER",
  REFUND: "REFUND",
  SUBSCRIPTION: "SUBSCRIPTION"
})

export { PHONE_REGEX, EMAIL_REGEX, CURRENCY_REGEX };