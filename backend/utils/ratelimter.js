export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function withRateLimit(fn, retries = 3) {
  try {
    return await fn();
  } catch (err) {
    if (err.response?.status === 429 && retries > 0) {
      const wait = Number(err.response.headers["retry-after"] || 60) * 1000;
      await sleep(wait);
      return withRateLimit(fn, retries - 1);
    }
    throw err;
  }
}