---
name: Admin session security
description: Durable authentication constraints for the MzansiDealz admin surface.
---

Admin authentication is intentionally cookie-based: the browser receives an HTTP-only signed session cookie and a separate readable CSRF cookie, while the client automatically sends credentials and the CSRF header for mutations.

**Why:** The previous password-as-token flow stored the admin password in localStorage and caused protected product saves to fail when the token was missing or stale.

**How to apply:** Keep all admin writes behind `requireAdmin`, preserve the CSRF check for POST/PUT/PATCH/DELETE, and configure production CORS origins so the published frontend domain is approved.