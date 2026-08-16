// Services can be temporarily unreachable while a local deployment is coming
// back up. Keep this policy deliberately narrow: authentication and feature
// availability errors need user/product handling, not a retry loop.
export const STARTUP_RETRY_BASE_DELAY_MS = 500;
export const STARTUP_RETRY_MAX_DELAY_MS = 2000;

export function isRetryableStartupError(error) {
  if (error?.code === 'ERR_CANCELED' || error?.name === 'AbortError') return false;

  const status = error?.response?.status;
  return status == null || (status >= 500 && status < 600);
}

export function getStartupRetryDelay(attempt) {
  return Math.min(
    STARTUP_RETRY_BASE_DELAY_MS * (Math.max(0, attempt) + 1),
    STARTUP_RETRY_MAX_DELAY_MS,
  );
}
