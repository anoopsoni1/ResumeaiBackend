// import Redis from "ioredis";
// import { RateLimiterRedis } from "rate-limiter-flexible";
// // Redis client - use REDIS_URL or REDIS_HOST + REDIS_PORT from env
// const getRedisConfig = () => {
//   if (process.env.REDIS_URL) {
//     return process.env.REDIS_URL;
//   }
//   const host = process.env.REDIS_HOST || "127.0.0.1";
//   const port = parseInt(process.env.REDIS_PORT || "6379", 10);
//   const password = process.env.REDIS_PASSWORD || undefined;
//   return { host, port, password };
// };

// const redisConfig = getRedisConfig();
// const redisClient =
//   typeof redisConfig === "string"
//     ? new Redis(redisConfig, { enableOfflineQueue: false })
//     : new Redis({
//         ...redisConfig,
//         enableOfflineQueue: false,
//       });

// // Optional: handle Redis errors so app doesn't crash if Redis is down
// redisClient.on("error", (err) => {
//   console.error("Rate limiter Redis client error:", err.message);
// });

// const rateLimiter = new RateLimiterRedis({
//   storeClient: redisClient,
//   keyPrefix: "rl_api",
//   points: parseInt(process.env.RATE_LIMIT_POINTS || "100", 10), // requests
//   duration: parseInt(process.env.RATE_LIMIT_DURATION || "60", 10), // per N seconds (default: 100 req/min)
//   blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || "60", 10), // block for N seconds when exceeded
// });

// /**
//  * Rate limit middleware using Redis.
//  * Limits by IP (or by req.user._id if authenticated).
//  * Returns 429 Too Many Requests when limit exceeded.
//  */
// export const rateLimitMiddleware = (req, res, next) => {
//   const key = req.user?._id?.toString() || req.ip || req.socket?.remoteAddress || "unknown";

//   rateLimiter
//     .consume(key)
//     .then((rateLimiterRes) => {
//       // Optional: set rate limit headers on response
//       res.setHeader("X-RateLimit-Limit", rateLimiter.points);
//       res.setHeader("X-RateLimit-Remaining", rateLimiterRes.remainingPoints);
//       res.setHeader("X-RateLimit-Reset", Math.ceil(rateLimiterRes.msBeforeNext / 1000));
//       next();
//     })
//     .catch((rejRes) => {
//       if (rejRes instanceof Error) {
//         console.error("Rate limiter error:", rejRes);
//         return next(); // allow request if Redis/limiter fails
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
