import { bigint, boolean, char, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./user";
import { accounts } from "./account";
import { CURRENCY } from "./currency";
import { transactions } from "./transaction";

export const PAYMENT_METHOD = pgEnum("payment_method", [
  "LINK",
  "VCARD",
]);

export const PAYMENT_STATUS = pgEnum("payment_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "EXPIRED",
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  payer_account: char("payer_account", { length: 14 }).references(() => accounts.account_number),
  recipient_account: char("recipient_account", { length: 14 }).references(() => accounts.account_number),
  transaction_id: uuid("transaction_id").references(() => transactions.id),
  amount: bigint("amount", { mode: "number" }).notNull(),
  currency: CURRENCY("currency").notNull(),
  method: PAYMENT_METHOD("method").notNull(),
  link_token: char("link_token", { length: 43 }).unique(),
  vcard_data: text("vcard_data"),
  status: PAYMENT_STATUS("status").notNull().default("PENDING"),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull(),
  used: boolean("used").notNull().default(false),
})