export type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  backoffMultiplier: 2,
  maxDelayMs: 30_000,
};

export function computeDelay(
  attempts: number,
  policy: Partial<RetryPolicy> = {}
): number {
  const p = { ...DEFAULT_RETRY_POLICY, ...policy };
  const multiplier = Math.pow(p.backoffMultiplier, Math.max(0, attempts - 1));
  const raw = p.baseDelayMs * multiplier;
  return Math.min(raw, p.maxDelayMs);
}

export function shouldRetry(
  attempts: number,
  maxAttempts = DEFAULT_RETRY_POLICY.maxAttempts
): boolean {
  return attempts < maxAttempts;
}
