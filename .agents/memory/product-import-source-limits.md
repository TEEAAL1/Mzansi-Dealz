---
name: Product import source limits
description: Durable behavior for large external catalogue migrations and throttled Shopify sources.
---

Large public Shopify catalogues may expose thousands of sitemap URLs while rate-limiting product JSON and page requests from an automated crawler.

**Why:** Restarting a long crawl discards valid rows and can increase source throttling without improving the final catalogue.

**How to apply:** Keep accepted rows durable during crawling, use bounded concurrency and retries, filter inactive products before import, and prefer the existing local supplier image library for refreshes when direct Shopify product-page/JSON requests are throttled. Provide a protected finalize path that turns the accepted set into a reviewable CSV/import without claiming the full sitemap was processed.