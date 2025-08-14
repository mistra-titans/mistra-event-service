import Elysia from "elysia";
import { swagger } from '@elysiajs/swagger'
import { consumeTransactionMessage, initializeRabbitMQ, rabbitMQ } from "./service/rabbit";
import { transactionRouter } from "./router/transactions";

const app = new Elysia()

app.use(swagger({
  documentation: {
    info: {
      title: "Mistra Event Service",
      description: "API documentation for Mistra Event Service",
      version: "1.0.0",
    }
  }
}))

app.get('/', () => 'HI')
app.use(transactionRouter)

async function startApp() {
  try {
    // Initialize RabbitMQ first
    await initializeRabbitMQ()
    await consumeTransactionMessage()

    // Start server
    app.listen(4000, () => {
      console.log('🚀 Server running on http://localhost:4000')
    })
  } catch (error) {
    console.error('Failed to start app:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  await rabbitMQ.close()
  process.exit(0)
})

startApp()