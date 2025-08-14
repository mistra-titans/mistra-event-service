import { bigint, char, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./user";
import { accounts } from "./account";
import { CURRENCY } from "./currency";

export const SUBSCRIPTION_INTERVAL = pgEnum("subscription_interval", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const SUBSCRIPTION_STATUS = pgEnum('transaction_status', [
  'PENDING',
  'ACCEPTED',
  'FAILED',
  'CANCELED',
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  bearer_account: char('bearer_account', { length: 14 }).notNull().references(() => accounts.account_number),
  amount: bigint("amount", {mode: "number"}).notNull(),
  currency: CURRENCY("currency").notNull(),
  interval: SUBSCRIPTION_INTERVAL("interval").notNull(),
  status: SUBSCRIPTION_STATUS("status").notNull().default("PENDING"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull(),
})