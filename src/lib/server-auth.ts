import crypto from "crypto";

/**
 * Constant-time string matching using SHA-256 hashes.
 * Ensures fixed 32-byte buffers to eliminate length-leak timing attacks
 * and prevent RangeError from crypto.timingSafeEqual length mismatches.
 */
export function timingSafeMatch(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * True when the request carries `secret` as `Authorization: Bearer <secret>`
 * or in the named custom header. Query-string secrets are deliberately not
 * accepted: they end up in access logs, proxies and browser history.
 */
export function hasSecret(req: Request, secret: string, headerName: string): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const bearer = bearerMatch ? bearerMatch[1].trim() : "";
  const custom = req.headers.get(headerName)?.trim() ?? "";

  return timingSafeMatch(bearer, secret) || timingSafeMatch(custom, secret);
}

/**
 * Best-effort client IP, hashed so raw addresses are never stored. Behind
 * Vercel and most proxies the first x-forwarded-for entry is the client.
 */
export function clientKey(req: Request, salt = process.env.RATE_LIMIT_SALT ?? ""): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
