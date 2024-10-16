import Redis, { RedisOptions } from "ioredis";

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const getRedisClient = (redisUrl: string, redisOpts?: RedisOptions) => {
  const client = new Redis(redisUrl, {
    connectTimeout: 5_000,
    maxRetriesPerRequest: null,
    ...redisOpts,
  });
  return client;
};

export const redis = getRedisClient(REDIS_URL);

export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  { ttl = 60 * 60 * 24 }: { ttl?: number } = {}
) {
  return async () => {
    // const cached = await redis.get(key);
    // if (cached) {
    //   return JSON.parse(cached) as T;
    // }

    const result = await fetcher();

    await redis.setex(key, ttl, JSON.stringify(result));

    return result;
  };
}
