---
name: pulse-qa
description: Use when checking the Pulse app for assignment readiness, UI regressions, category behavior, auth, persistence, or test coverage.
---

# Pulse QA

Verify the assignment requirements without over-expanding the product.

Checks:
- Category tabs filter products correctly.
- Login creates a server session cookie.
- Cart actions require auth and persist with Prisma.
- Codex SDK route exists and records Codex actions.
- Footer and current hero remain visually intact.
