import { Transaction } from "../db/transaction";
import { RetryService } from "./services.retry";

export class RetryScheduler {
  private isRunning = false
  private workers = new Map<string, (Payload: any) => Promise<void>>();
  private intervalId?: NodeJS.Timeout


  constructor(
    private retryService: RetryService,
    private intervalMs = 60000,
  ) { }

  //register workers
  registerWorker(workerType: string, handler: (payload: any) => Promise<void>): void {
    this.workers.set(workerType, handler);
    console.log(`Registered retry handler for worker type: ${workerType}`);
  }

  //start scheduler
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`Retry Scheduler is already running`)
      return
    }

    this.isRunning = true
    console.log(`Starting Retry Scheduler...`)

    await this.processRetries();

    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.processRetries();
      }
    }, this.intervalMs);
  }


  //stop the scheduler
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log('Stopping retry scheduler...');
  }

  //process retries
  private async processRetries(): Promise<void> {
    try {
      const dueRetries = await this.retryService.getDueRetries(50)

      if (dueRetries.length === 0) {
        console.log('Nothing to process')
        return
      }

      const concurrency = 10
      console.log(`Processing ${dueRetries.length} due retries`);
      for (let i = 0; i < dueRetries.length; i += concurrency) {
        const batch = dueRetries.slice(i, i + concurrency);
        await Promise.all(
          batch.map(retry => this.processRetry(retry).catch(error =>
            console.error(`Error processing retry ${retry.id}:`, error)
          ))
        )
      }
    } catch (error) {
      console.error(' Error processing retries:', error);
    }
  }

  private async processRetry(retry: Transaction): Promise<void> {
    const worker = this.workers.get(retry.worker_type!)

    if (!worker) {
      console.error(`No worker registered for type: ${retry.worker_type}`)
      return
    }

    try {
      console.log(`Retrying transaction ${retry.id}, attempt ${Number(retry.attempt_count) + 1}/${retry.max_retries}`)

      const payload = typeof retry.original_payload === "string"
        ? JSON.parse(retry.original_payload)
        : retry.original_payload;
      await worker(payload)
      await this.retryService.updateRetryAttempt(retry.id, true)
    } catch (error) {
      console.error(`Retry failed for transaction ${retry.id}: `, error)
      const isRetryable = this.retryService.isRetryableError(retry.worker_type!, error as Error);

      if (!isRetryable) {
        console.log(`Non-retryable error for ${retry.id}, sending to dead letter`);
      }
      await this.retryService.updateRetryAttempt(retry.id, false, error as Error);

    }
  }

}
