---
name: Custom domain deployment split
description: The public custom domain and Replit deployment are separate delivery paths that must both be updated.
---

The custom domain `www.mzansidealz.com` is served by a separate Vercel deployment, while the Replit `.replit.app` URL is served by the Replit artifact deployment. A Replit Publish does not automatically replace a stale Vercel frontend, and a GitHub push does not activate the Replit deployment.

**Why:** A checkout UI change was visible on the Replit URL but the custom domain continued serving an older bundle until the repository and deployment paths were compared directly.

**How to apply:** For customer-facing frontend changes, push the verified branch to GitHub for Vercel, verify the custom-domain bundle, and separately prompt the user to Publish the Replit artifact. Keep backend payment return URLs canonicalized to `www.mzansidealz.com`. Production catalogue data and image assets also need an explicit production import and persistent storage; development rows and ignored local uploads do not appear in the published API automatically. For catalogue branding migrations, add an API response compatibility guard as well as normalizing future writes, then publish before auditing both domains.