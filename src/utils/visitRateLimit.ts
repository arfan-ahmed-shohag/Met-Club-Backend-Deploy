import type { NextFunction, Request, Response } from "express";

// In-memory, per-IP limit for POST /stats/visit so a script can't inflate the
// visitor count. IPs live only in this process's memory (never in the DB) and
// are forgotten after the window or on restart. The limit is generous so many
// students behind one school/mobile IP are still counted.
export const VISIT_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;

const hits = new Map<string, { count: number; resetAt: number }>();

const isLoopback = (ip: string) =>
  ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) if (entry.resetAt <= now) hits.delete(ip);
}, WINDOW_MS).unref();

export const visitRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  // Without a real client IP (e.g. nginx not sending X-Forwarded-For) every
  // visitor would share one bucket, so don't limit rather than undercount.
  if (!ip || isLoopback(ip)) return next();

  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  if (entry.count >= VISIT_LIMIT) {
    res.status(429).json({ success: false, message: "Too many requests" });
    return;
  }
  entry.count++;
  next();
};
