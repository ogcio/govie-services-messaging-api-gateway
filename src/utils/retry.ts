/**
 * Retry utility with exponential backoff and full jitter for transient errors.
 * Implements FR-032 and FR-039 from spec.
 */

export const TRANSIENT_STATUS_CODES = [502, 503, 504] as const;

export type TransientStatusCode = (typeof TRANSIENT_STATUS_CODES)[number];

export interface RetryableError extends Error {
  statusCode?: number;
  code?: string;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, delayMs: number, error: RetryableError) => void;
}

/**
 * Classifies error as retryable based on status code.
 * Only transient downstream errors (502, 503, 504, timeouts) are retryable.
 * All 4xx errors are non-retryable.
 */
export function isRetryableError(error: RetryableError): boolean {
  if (!error.statusCode) {
    // Network timeout errors without status code are retryable
    return error.code === "ETIMEDOUT" || error.code === "ECONNRESET";
  }

  // All 4xx are non-retryable
  if (error.statusCode >= 400 && error.statusCode < 500) {
    return false;
  }

  // Only specific 5xx are retryable
  return TRANSIENT_STATUS_CODES.includes(
    error.statusCode as TransientStatusCode,
  );
}

/**
 * Calculates delay with full jitter (±50% of nominal).
 * Nominal sequence: [100ms, 200ms, 400ms]
 */
function calculateDelay(attempt: number, baseDelayMs: number): number {
  // Exponential: 100ms * 2^attempt → [100, 200, 400]
  const nominalDelay = baseDelayMs * 2 ** attempt;

  // Full jitter: randomize within [50%, 150%] of nominal
  const minDelay = nominalDelay * 0.5;
  const maxDelay = nominalDelay * 1.5;

  return Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
}

/**
 * Executes function with retry logic for transient errors.
 * Max 3 attempts total (initial + 2 retries).
 * Cumulative nominal delay <1s.
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 100, onRetry } = options;

  let lastError: RetryableError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as RetryableError;

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxAttempts - 1 || !isRetryableError(lastError)) {
        throw lastError;
      }

      // Calculate and apply delay before retry
      const delayMs = calculateDelay(attempt, baseDelayMs);

      if (onRetry) {
        onRetry(attempt + 1, delayMs, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // TypeScript exhaustiveness - should never reach here
  throw new Error("Retry loop completed without result");
}
