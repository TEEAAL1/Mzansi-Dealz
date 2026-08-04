import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "mzansi_admin_session";
export const ADMIN_CSRF_COOKIE = "mzansi_admin_csrf";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_ADMIN_PASSWORD_HASH =
  "$2b$12$UyXx0O752ftqWMABkkybX.sJF5JPLPaFh4Q2QFjCyueMv5Gopjn.u";
const revokedSessions = new Set<string>();

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function cookieSameSite(): "lax" | "none" {
  return isProduction() ? "none" : "lax";
}

function passwordHash() {
  return process.env.ADMIN_PASSWORD_HASH ?? DEFAULT_ADMIN_PASSWORD_HASH;
}

let configuredPasswordHash: Promise<string> | undefined;

function activePasswordHash() {
  if (process.env.ADMIN_PASSWORD_HASH) {
    return Promise.resolve(process.env.ADMIN_PASSWORD_HASH);
  }

  if (process.env.ADMIN_PASSWORD) {
    configuredPasswordHash ??= bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    return configuredPasswordHash;
  }

  return Promise.resolve(passwordHash());
}

function cleanupSessions() {
  // Session expiry is checked from the signed cookie payload.
}

function sameSecret(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export async function verifyAdminPassword(password: string) {
  return bcrypt.compare(password, await activePasswordHash());
}

export function createAdminSession(res: Response) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const sessionId = `${expiresAt}.${randomBytes(32).toString("hex")}`;
  const csrfToken = randomBytes(32).toString("hex");
  revokedSessions.delete(sessionId);

  const cookieOptions = {
    path: "/",
    maxAge: SESSION_TTL_MS,
    secure: isProduction(),
    sameSite: cookieSameSite(),
  } as const;

  res.cookie(ADMIN_SESSION_COOKIE, sessionId, {
    ...cookieOptions,
    httpOnly: true,
    signed: true,
  });
  res.cookie(ADMIN_CSRF_COOKIE, csrfToken, {
    ...cookieOptions,
    httpOnly: false,
  });

  return csrfToken;
}

export function destroyAdminSession(req: Request, res: Response) {
  const sessionId = req.signedCookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
  if (sessionId) revokedSessions.add(sessionId);
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
  res.clearCookie(ADMIN_CSRF_COOKIE, { path: "/" });
}

export function hasAdminSession(req: Request) {
  const sessionId = req.signedCookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
  if (!sessionId) return false;
  const [expiresAt, randomPart] = sessionId.split(".");
  return Boolean(
    randomPart &&
      /^\d+$/.test(expiresAt) &&
      Number(expiresAt) > Date.now() &&
      !revokedSessions.has(sessionId),
  );
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!hasAdminSession(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const csrfCookie = req.cookies?.[ADMIN_CSRF_COOKIE] as string | undefined;
    const csrfHeader = req.get("x-csrf-token");
    if (!csrfCookie || !csrfHeader || !sameSecret(csrfCookie, csrfHeader)) {
      res.status(403).json({ error: "Invalid CSRF token" });
      return;
    }
  }

  next();
}