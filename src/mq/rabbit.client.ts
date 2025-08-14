import { Connection } from 'rabbitmq-client'
import type { Consumer, Publisher, Envelope, AsyncMessage } from 'rabbitmq-client';

interface RabbitConfig {
  url: string
  retryLow?: number
  retryHigh?: number
}

interface QueueOptions {
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

interface ExchangeOptions {
  durable?: boolean;
  autoDelete?: boolean;
  internal?: boolean;
  arguments?: Record<string, any>;
}


export class RabbitMQService {
  private rabbit: Connection;
  private publishers: Map<string, Publisher> = new Map();
  private consumers: Map<string, Consumer> = new Map();


  constructor(private config: RabbitConfig) {
    this.rabbit = new Connection({
      url: config.url,
      retryLow: config.retryLow || 1000,
      retryHigh: config.retryHigh || 3000
    })

    //Handle connections
    this.rabbit.on("connection", () => {
      console.log("Connected to RabbitMQ")
    })

    this.rabbit.on("error", (error) => {
      console.log("Error connection to RabbitMQ: ", error)
    })

    // this.rabbit.close()
  }

  async close(): Promise<void> {
    try {
      //close all consumers
      for (const [name, consumer] of this.consumers) {
        console.log(`closing consumer ${name}`)
        await consumer.close()
      }
      this.consumers.clear()

      //close all publishers
      for (const [name, publisher] of this.publishers) {
        console.log(`closing publisher ${name}`)
        await publisher.close()
      }
      this.publishers.clear()


      //close connection
      await this.rabbit.close();
      console.log("Rabbit connection terminated")

    } catch (error) {
      console.log("Error closing connection: ", error)
      throw error
    }
  }

  async getPublisher(
    publisherName: string = 'default',
    options: {
      maxAttempts?: number;
      confirm?: boolean;
      exchanges?: any[];
    } = {}
  ): Promise<Publisher> {
    if (this.publishers.has(publisherName)) {
      return this.publishers.get(publisherName)!
    }

    const publisher = this.rabbit.createPublisher({
      confirm: options.confirm ?? true,
      maxAttempts: options.maxAttempts ?? 3, // Set max retry attempts here
      exchanges: options.exchanges ?? []
    })

    this.publishers.set(publisherName, publisher)
    return publisher
  }

  //publish to queue
  async publishToQueue(queueName: string, message: any): Promise<void> {
    const publisher = await this.getPublisher()

    await publisher.send(queueName, message)
  }


  //declare an exchange
  async declareExchange(
    exchangeName: string,
    exchangeType: 'direct' | 'topic' | 'fanout' | 'headers' = 'direct',
    options: ExchangeOptions = {}
  ): Promise<void> {
    try {
      // Create a temporary publisher to declare the exchange
      const tempPublisher = this.rabbit.createPublisher({
        confirm: true,
        exchanges: [{
          exchange: exchangeName,
          type: exchangeType,
          durable: options.durable ?? true,
          autoDelete: options.autoDelete ?? false,
          internal: options.internal ?? false,
          arguments: options.arguments ?? {}
        }]
      });

      //send some dummy data
      await tempPublisher.send({ exchange: exchangeName, routingKey: '', mandatory: false }, Buffer.alloc(0));


      // The exchange gets declared when the publisher is created
      console.log(`Exchange '${exchangeName}' of type '${exchangeType}' declared successfully`);

      // Close the temporary publisher immediately
      await tempPublisher.close();
    } catch (error) {
      console.error(`Failed to declare exchange '${exchangeName}':`, error);
      throw error;
    }
  }

  //bind queue
  async bindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string = ''
  ): Promise<void> {
    try {
      // Create a temporary consumer with binding to establish the binding
      const tempConsumer = this.rabbit.createConsumer({
        queue: queueName,
        queueBindings: [{
          exchange: exchangeName,
          routingKey: routingKey
        }]
      }, async () => {
        // Empty handler
      });

      console.log(`Queue '${queueName}' bound to exchange '${exchangeName}' with routing key '${routingKey}'`);

      // Close the temporary consumer immediately
      await tempConsumer.close();
    } catch (error) {
      console.error(`Failed to bind queue '${queueName}' to exchange '${exchangeName}':`, error);
      throw error;
    }
  }


  //publish to exchange
  async publishToExchange(
    publisherName: string,
    exchangeName: string,
    routingKey: string,
    message: any,
    options: Partial<Envelope> = {}): Promise<void> {
    const publisher = await this.getPublisher(publisherName)

    await publisher.send({
      exchange: exchangeName,
      routingKey: routingKey,
      ...options
    }, message)
  }




  //create consumer for queue
  async createQueueConsumer(
    consumerName: string,
    queueName: string,
    handler: (message: any, envelope: any) => Promise<void>,
    options: {
      queueOptions?: QueueOptions;
      qos?: number;
      noAck?: boolean;
    } = {}
  ): Promise<Consumer> {
    if (this.consumers.has(consumerName)) {
      throw new Error(`Consumer ${consumerName} already exists`)
    }

    const consumer = this.rabbit.createConsumer({
      queue: queueName,
      queueOptions: {
        durable: true,
        ...options.queueOptions
      },
      qos: options.qos ? { prefetchCount: options.qos } : undefined,
      noAck: options.noAck ?? false
    },
      async (message) => {
        try {
          let parsedBody = message.body
          if (typeof parsedBody === 'string') {
            try {
              parsedBody = JSON.parse(parsedBody)
            } catch {
              parsedBody = message.body
            }
          }

          await handler(parsedBody, message)
        } catch (error) {
          console.log(`Error in consumer ${consumerName}: ${error}`)
          throw error
        }
      })

    this.consumers.set(consumerName, consumer)
    console.log(`Consumer ${consumerName} for queue ${queueName} created successfully`)
    return consumer
  }

  //create consumer for exchange

  async createExchangeConsumer(
    exchangeName: string,
    consumerName: string,
    exchangeType: string,
    routingKey: string,
    handler: (body: any, delivery: AsyncMessage) => Promise<void>,
    options: {
      queueOptions?: QueueOptions,
      exchangeOptions?: ExchangeOptions,
      qos?: number;
      noAck?: boolean;
    } = {}
  ): Promise<Consumer> {
    if (this.consumers.has(consumerName)) {
      throw new Error(`Consumer '${consumerName}' already exists`);
    }

    const consumer = this.rabbit.createConsumer(
      {
        queue: `${exchangeName}.${routingKey}`,
        queueOptions: {
          ...options.queueOptions,
        },
        exchanges: [{
          exchange: exchangeName,
          type: exchangeType,
          ...options.exchangeOptions
        }],
        queueBindings: [{
          exchange: exchangeName,
          routingKey
        }],
        qos: options.qos ? { prefetchCount: options.qos } : undefined,
        noAck: options.noAck ?? false
      },
      async (delivery: AsyncMessage) => {
        try {
          let parsedBody = delivery.body
          if (typeof parsedBody === 'string') {
            try {
              parsedBody = JSON.parse(parsedBody)
            } catch {
              parsedBody = delivery.body
            }
          }

          await handler(parsedBody, delivery);
        } catch (error) {
          console.log(`Error in exchange consumer ${consumerName}: ${error}`)
          throw error
        }
      }
    )
    this.consumers.set(consumerName, consumer)
    console.log(`Consumer ${consumerName} for exchange ${exchangeName} added successfully`)
    return consumer
  }


  // Get consumer by name
  getConsumer(name: string): Consumer | undefined {
    return this.consumers.get(name);
  }

  // Get publisher by name
  getPublisherByName(name: string): Publisher | undefined {
    return this.publishers.get(name);
  }

  // List all consumers
  getConsumerNames(): string[] {
    return Array.from(this.consumers.keys());
  }

  // List all publishers
  getPublisherNames(): string[] {
    return Array.from(this.publishers.keys());
  }

  // Check if connection is ready
  get isConnected(): boolean {
    return this.rabbit.ready;
  }

}

