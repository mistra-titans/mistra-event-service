import { accounts } from "../db/account"
import { ledger } from "../db/ledger"
import { db } from "./db"
import { and, eq, inArray } from "drizzle-orm"


export const replay = async (accnt_number: string): Promise<any> => {
  const total_amount = await db.transaction(async (tx) => {
    const logs = await db.select({ delta: ledger.delta, id: ledger.id }).from(ledger)
      .where(and(
        eq(ledger.account, accnt_number),
        eq(ledger.played, false)
      ))
    const total = logs.reduce((sum, { delta }) => sum + delta, 0);
    if (total == null || total == undefined) {
      throw new Error("Failed replaying")
    }
    const logIDs = logs.map(l => l.id)
    await tx.update(ledger).set({
      played: true
    }).where(inArray(ledger.id, logIDs))

    const balance = await tx.select({ balance: accounts.balance }).from(accounts)
      .where(eq(accounts.account_number, accnt_number)).limit(1)

    if (balance.length === 0) {
      throw new Error("This account cannot be replayed")
    }

    const [result] = (await tx.update(accounts).set({
      balance: balance[0].balance + total
    })
      .where(eq(accounts.account_number, accnt_number))
      .returning())
    return result
  })
  return total_amount;
}