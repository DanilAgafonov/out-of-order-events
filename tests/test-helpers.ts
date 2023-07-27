import { scheduler } from "node:timers/promises";

export async function runAsyncWithRetries(
  fn: () => Promise<void>,
  retriesLeft = 3,
  interval = 200,
): Promise<void> {
  try {
    return await fn();
  } catch (error) {
    await scheduler.wait(interval);
    if (retriesLeft === 0) {
      throw error;
    }
    return await runAsyncWithRetries(fn, --retriesLeft, interval);
  }
}
