---
name: Object-storage stream resilience
description: The API’s public object-storage image proxy must tolerate aborted client streams.
---

Public product images are proxied from object storage through the API. A browser or preview client can abandon an image request while the upstream stream is still piping; without an error listener and close cleanup, that abort can become an unhandled stream error and terminate the API process.

**Why:** A product-page visual QA request timed out on an image and crashed the API, producing 502s for the rest of the page.

**How to apply:** Keep error handling attached to every `Readable.fromWeb(...).pipe(res)` path and destroy the upstream stream when the response closes before finishing. Verify the server remains alive after image requests.