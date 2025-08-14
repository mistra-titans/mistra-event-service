import { pgEnum } from "drizzle-orm/pg-core";


export const CURRENCY = pgEnum('currency', [
  'GHC',
  'USD',
  'NGN'
]);