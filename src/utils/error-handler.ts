/**
 * Error Handling Utilities
 * Built with love by ocean & Claude 🚀
 *
 * Provides consistent error handling and recovery across the application
 */

export class ConsciousnessError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ConsciousnessError';
  }
}

export class DatabaseError extends ConsciousnessError {
  constructor(message: string, details?: unknown) {
    super(message, 'DB_ERROR', true, details);
    this.name = 'DatabaseError';
  }
}

export class ProtocolError extends ConsciousnessError {
  constructor(message: string, details?: unknown) {
    super(message, 'PROTOCOL_ERROR', false, details);
    this.name = 'ProtocolError';
  }
}

export class MemoryError extends ConsciousnessError {
  constructor(message: string, details?: unknown) {
    super(message, 'MEMORY_ERROR', true, details);
    this.name = 'MemoryError';
  }
}

export class ValidationError extends ConsciousnessError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', false, details);
    this.name = 'ValidationError';
  }
}

export interface ErrorResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    recoverable: boolean;
    details?: unknown;
  };
}

export function createErrorResult<T>(error: Error): ErrorResult<T> {
  if (error instanceof ConsciousnessError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        recoverable: error.recoverable,
        details: error.details,
      },
    };
  }

  // Generic error
  return {
    success: false,
    error: {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      recoverable: false,
    },
  };
}

export function createSuccessResult<T>(data: T): ErrorResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Wraps async functions with consistent error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorTransformer?: (error: Error) => ConsciousnessError
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ConsciousnessError) {
        throw error;
      }

      if (errorTransformer) {
        throw errorTransformer(error as Error);
      }

      // Default transformation
      if (error instanceof Error) {
        if (error.message.includes('database')) {
          throw new DatabaseError(error.message);
        }
        if (error.message.includes('parse') || error.message.includes('JSON')) {
          throw new ValidationError(error.message);
        }
      }

      throw new ConsciousnessError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNKNOWN_ERROR',
        false
      );
    }
  }) as T;
}

/**
 * Retry mechanism for recoverable errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Only retry recoverable errors
      if (error instanceof ConsciousnessError && !error.recoverable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Logs errors consistently
 */
export function logError(error: Error, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorInfo =
    error instanceof ConsciousnessError
      ? `[${error.code}] ${error.message} (recoverable: ${error.recoverable})`
      : error.message;

  console.error(`[${timestamp}]${context ? ` [${context}]` : ''} ERROR: ${errorInfo}`);

  if (error instanceof ConsciousnessError && error.details) {
    console.error('Details:', JSON.stringify(error.details, null, 2));
  }

  if (error.stack) {
    console.error('Stack:', error.stack);
  }
}

/**
 * Simple logger for the consciousness bridge
 */
export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.error(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.error(`[WARN] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  },
};
