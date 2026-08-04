---
name: Payment provider readiness
description: Yoco and PayFast are implemented behind server-side configuration gates; checkout must stay unavailable until credentials and webhook verification secrets exist.
---

Payment checkout intentionally refuses to create orders when no configured gateway is available. Yoco requires its secret key and webhook subscription secret; PayFast requires merchant credentials. Never restore demo credentials or silently fall back to sandbox accounts.

**Why:** The original checkout used hardcoded PayFast sandbox values, which could send real customer flows into an invalid or unsafe payment path.

**How to apply:** Configure provider secrets through the environment-secrets flow, verify webhook URLs/signatures, enable the gateway in admin payment settings, and only then publish live payments.