// import Redis from "ioredis";
// import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";

// const points = parseInt(process.env.RATE_LIMIT_POINTS || "100", 10);
// const duration = parseInt(process.env.RATE_LIMIT_DURATION || "60", 10);
// const blockDuration = parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || "60", 10);

// function getRedisConfig() {
//   if (process.env.REDIS_URL) return process.env.REDIS_URL;
//   const host = process.env.REDIS_HOST || "127.0.0.1";
//   const port = parseInt(process.env.REDIS_PORT || "6379", 10);
//   const password = process.env.REDIS_PASSWORD || undefined;
//   return { host, port, password };
// }

// function createMemoryLimiter() {
//   return {
//     limiter: new RateLimiterMemory({
//       keyPrefix: "rl_api",
//       points,
//       duration,
//       blockDuration,
//     }),
//     points,
//   };
// }

// function createRateLimiter() {
//   const redisUrl = process.env.REDIS_URL;
//   const redisHost = process.env.REDIS_HOST;

//   if (redisUrl || redisHost) {
//     try {
//       const redisConfig = getRedisConfig();
//       const redisClient =
//         typeof redisConfig === "string"
//           ? new Redis(redisConfig, { enableOfflineQueue: false })
//           : new Redis({ ...redisConfig, enableOfflineQueue: false });

//       redisClient.on("error", (err) => {
//         console.error("[RateLimit] Redis error:", err.message);
//       });

//       return {
//         limiter: new RateLimiterRedis({
//           storeClient: redisClient,
//           keyPrefix: "rl_api",
//           points,
//           duration,
//           blockDuration,
//         }),
//         points,
//       };
//     } catch (err) {
//       console.warn("[RateLimit] Redis init failed, using in-memory:", err.message);
//     }
//   }

//   return createMemoryLimiter();
// }

// const { limiter: rateLimiter, points: limitPoints } = createRateLimiter();

// /**
//  * Rate limit middleware. Limits by IP or by req.user._id if authenticated.
//  * Returns 429 Too Many Requests when limit exceeded.
//  */
// export const rateLimitMiddleware = (req, res, next) => {
//   const key = req.user?._id?.toString() || req.ip || req.socket?.remoteAddress || "unknown";

//   rateLimiter
//     .consume(key)
//     .then((rateLimiterRes) => {
//       res.setHeader("X-RateLimit-Limit", limitPoints);
//       res.setHeader("X-RateLimit-Remaining", rateLimiterRes.remainingPoints);
//       res.setHeader("X-RateLimit-Reset", Math.ceil(rateLimiterRes.msBeforeNext / 1000));
//       next();
//     })
//     .catch((rejRes) => {
//       if (rejRes instanceof Error) {
//         console.error("[RateLimit] Error:", rejRes.message);
//         return next();
//       }
//       const retryAfter = Math.ceil((rejRes.msBeforeNext || 60000) / 1000);
//       res.setHeader("Retry-After", retryAfter);
//       res.status(429).json({
//         success: false,
//         message: "Too many requests. Please try again later.",
//         retryAfter,
//       });
//     });
// };

// export default rateLimitMiddleware;
