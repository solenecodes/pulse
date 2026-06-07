# Pulse

Pulse is a fictional premium energy drink storefront built for a Codex hackathon demo. It includes a polished ecommerce UI, authentication, persistent carts, seeded products, meaningful tests, and a server-side Codex SDK workflow for product managers.

## Stack

- Next.js, React, and TypeScript for the app and API routes.
- Tailwind CSS for styling.
- Prisma with SQLite for local persistence.
- Zod for API input validation.
- Vitest for unit tests.
- `@openai/codex-sdk` for the product-manager Codex feature.
- Local Codex skills in `.codex/skills` for project-specific build guidance.

## Requirements

- Node.js 20 or newer.
- npm.
- An OpenAI API key is optional. Without it, the Codex feature returns a local fallback response instead of running the SDK.

## Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Keep the default SQLite database URL for a local demo:

```text
DATABASE_URL="file:./prisma/dev.db"
```

Set `AUTH_SECRET` to any long random string. Set `OPENAI_API_KEY` if you want the Codex SDK route to run against the API.

Create and seed the local database:

```bash
npm run db:setup
```

Start the development server:

```bash
npm run dev
```

Then open the local URL printed by Next.js, usually `http://localhost:3000`.

## Demo Accounts

Product manager account, with Codex access:

```text
pm@pulse.test
password123
```

Client account, without Codex access:

```text
client@pulse.test
password123
```

## Useful Commands

```bash
npm run dev
npm run build
npm run test
npm run prisma:seed
npm run db:setup
```

## Project Notes

- Login uses server-side API routes and an HTTP-only session cookie.
- Persistence is handled by Prisma models for users, sessions, products, cart items, and Codex actions.
- The product-manager Codex panel calls `/api/codex`, which validates the request, checks the user role, records Codex action history, and calls `lib/codex.ts`.
- Tests cover product filtering, Zod schemas, password hashing, and Codex fallback behavior.
- Generated folders such as `node_modules`, `.next`, local SQLite databases, and `.env` are intentionally not included. They are recreated during setup.
