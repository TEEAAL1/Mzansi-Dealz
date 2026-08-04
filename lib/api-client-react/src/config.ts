/**
 * API base URL configuration for production deployments.
 *
 * In local development (Replit), the API is served on the same origin
 * via the shared proxy, so relative paths like `/api/...` work fine.
 *
 * When the frontend is deployed to a separate host (e.g. Vercel),
 * set `VITE_API_BASE_URL` to the actual API server origin.
 */

declare const VITE_API_BASE_URL: string | undefined;
const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL: string | undefined =
  typeof apiBaseUrl === "string" && apiBaseUrl.trim().length > 0
    ? apiBaseUrl.trim().replace(/\/$/, "")
    : undefined;

/**
 * Prepends the configured API base URL to a relative path when needed.
 */
export function apiUrl(path: string): string {
  if (API_BASE_URL && path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
}

/**
 * Same as apiUrl but for the uploads endpoint.
 */
export function uploadUrl(path: string): string {
  return apiUrl(path);
}
