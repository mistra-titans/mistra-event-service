export interface RetryConfig {
  maxRetries: number,
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  circuitBreaker?: {
    threshold: number,
    timeout: number
  }
}

//hardcoded for now
// Retry configurations per worker type
export const RETRY_CONFIGS: Record<string, RetryConfig> = {
  'peer-to-peer': {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'RATE_LIMIT', 'TEMPORARY_FAILURE'],
    circuitBreaker: { 
      threshold: 10, 
      timeout: 120000 
    }
  },
  'subscription': {
    maxRetries: 3,
    initialDelay: 5000,
    maxDelay: 300000,
    backoffMultiplier: 3,
    retryableErrors: ['PAYMENT_GATEWAY_ERROR', 'TEMPORARY_FAILURE', 'RATE_LIMIT']
  },
  'retry-transactions': {
    maxRetries: 2,
    initialDelay: 10000,
    maxDelay: 600000,
    backoffMultiplier: 5,
    retryableErrors: ['DATABASE_TIMEOUT', 'EXTERNAL_SERVICE_ERROR']
  }
};

export interface MessageMetadata {
  transactionId: string;
  workerType: string;
  maxRetries: number;
  createdAt: Date;
  priority?: number;
  correlationId?: string;
}

// Enhanced message structure with retry metadata
export interface EnhancedMessage<T = any> {
  id: string;
  type: string;
  payload: T;
  metadata: MessageMetadata;
  timestamp: Date;
}