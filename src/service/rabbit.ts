import 'dotenv/config'
import { RabbitMQService } from '../mq/rabbit.client'

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

        console.log(JSON.stringify(body))
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
