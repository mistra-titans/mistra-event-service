import { bigint, char, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./user";
import { accounts } from "./account";

export const TRANSACTION_STATUS = pgEnum('transaction_status', [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELED',
]);

export const TRANSACTION_TYPE = pgEnum('transaction_type', [
  'DEPOSIT',
  'WITHDRAWAL',
  'TRANSFER',
  'PAYMENT',
  'REFUND',
  'SUBSCRIPTION',
]);

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(), //transactionId
  user_id: uuid('user_id').notNull().references(() => users.id),
  amount_base: bigint('amount_base', { mode: 'number' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  recipient_account: varchar({ length: 14 }).references(() => accounts.account_number),
  sender_account: varchar({ length: 14 }).references(() => accounts.account_number),
  type: TRANSACTION_TYPE('type').notNull(),
  worker_type: varchar('worker_type', { length: 100 }),
  original_payload: jsonb('original_payload'),
  max_retries: integer('max_retries').default(5),
  attempt_count: integer('attempt_count').default(0),
  paystack_reference: text("paystack_reference"),
  next_retry_at: timestamp('next_retry_at'),
  last_error: text('last_error'),
  status: TRANSACTION_STATUS('status').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull(),
  dead_lettered_at: timestamp('dead_lettered_at')
});


export type Transaction = typeof transactions.$inferSelect