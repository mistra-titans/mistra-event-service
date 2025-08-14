import 'dotenv/config'
import { RabbitMQService } from '../mq/rabbit.client'
import { RetryService } from '../retry/services.retry'
import { transactions } from '../db/transaction'
import { RetryScheduler } from '../retry/scheduler.retry'
import { db } from '../utils/db'
import { eq } from 'drizzle-orm'
import { ledger } from '../db/ledger'

export const rabbitMQ = new RabbitMQService({
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  retryLow: 1000,
  retryHigh: 3000
})

export async function initializeRabbitMQ() {
  // Wait for connection
  console.log('Connecting to Rabbitmq...')
  while (!rabbitMQ.isConnected) {
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  //declare exchange
  await rabbitMQ.declareExchange("transactions", "topic", {
    durable: true
  })
  console.log("Exchange ready")
}

export async function consumeTransactionMessage() {
  try {
    await rabbitMQ.createExchangeConsumer(
      "transactions",
      "transaction-consumer",
      "topic",
      "transaction.transfer.*",
      async (body, delivery) => {
        console.log(`Received Transaction message with routing key, "${delivery.routingKey}" and priority, "${delivery.priority}"`)
        console.log(`Routing Key: ${delivery.routingKey}`)
        console.log(`Priority: ${delivery.priority}`)

        //logic for request handling
        const _id = body
        console.log(_id)
        const [pendingTransaction] = await db.select().from(transactions).where(
          eq(transactions.id, _id)
        ).limit(1)

        const _pendingTransaction = await db.transaction(async (tx) => {
          // sender
          await tx.insert(ledger).values({
            currency: pendingTransaction.currency as "GHC",
            delta: -pendingTransaction.amount_base,
            user_id: pendingTransaction.user_id,
            transaction_id: pendingTransaction.id,
            account: pendingTransaction.sender_account,
            updated_at: new Date(),
          })
          await tx.insert(ledger).values({
            currency: pendingTransaction.currency as "GHC",
            delta: +pendingTransaction.amount_base,
            user_id: pendingTransaction.user_id,
            transaction_id: pendingTransaction.id,
            account: pendingTransaction.recipient_account,
            updated_at: new Date(),
          })

          await tx.update(transactions).set({ status: "COMPLETED" }).where(eq(transactions.id, pendingTransaction.id))
        })

        // TODO: double log into ledger
        // Sender
        // await tx.insert(ledger).values({
        //   currency: currency,
        //   delta: -amount,
        //   user_id: user.id,
        //   transaction_id: transaction[0].id,
        //   account: sender_account,
        //   updated_at: new Date(),
        // })
        // // Recipient
        // await tx.insert(ledger).values({
        //   currency: currency,
        //   delta: amount,
        //   user_id: user.id,
        //   transaction_id: transaction[0].id,
        //   account: recipient_account,
        //   updated_at: new Date(),
        // })
      },
      {
        exchangeOptions: {
          durable: true
        },
        queueOptions: {
          durable: true
        },
        qos: 1,
        noAck: false
      }
    )

    console.log(`Transaction consumer is active`)


  } catch (error) {
    console.log('Failed to start transaction consumer: ', error)
    throw error
  }
}

const INTVAL = 60000
export const retryService = new RetryService(db);
export const retryScheduler = new RetryScheduler(retryService, INTVAL)