import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const DEFAULT_API_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_API_MAX_REQUESTS = 1_200;

const positiveInteger = (rawValue: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(rawValue ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const apiRateLimiter = rateLimit({
  windowMs: positiveInteger(process.env.API_RATE_LIMIT_WINDOW_MS, DEFAULT_API_WINDOW_MS),
  limit: positiveInteger(process.env.API_RATE_LIMIT_MAX_REQUESTS, DEFAULT_API_MAX_REQUESTS),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ? ipKeyGenerator(req.ip) : 'unknown-ip',
  skip: (req) => req.path === '/health',
  message: {
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please wait and try again.',
  },
});
