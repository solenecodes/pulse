# Pulse

Pulse is a fictional premium energy drink storefront built for a Copilot hackathon demo. It includes a polished ecommerce UI, authentication, persistent carts, seeded products, meaningful tests, and a server-side Copilot SDK workflow for product managers.

## Stack

- Next.js, React, and TypeScript for the app and API routes.
- Tailwind CSS for styling.
- Prisma with SQLite for local persistence.
- Zod for API input validation.
- Vitest for unit tests.
- `@openai/copilot-sdk` for the product-manager Copilot feature.
- Local Copilot skills in `.copilot/skills` for project-specific build guidance.

## Requirements

- Node.js 20 or newer.
- npm.
- An OpenAI API key is optional. Without it, the Copilot feature returns a local fallback response instead of running the SDK.

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

Set `AUTH_SECRET` to any long random string.

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

Product manager account, with Copilot access:

```text
pm@pulse.test
password123
```

Client account, without Copilot access:

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
- Persistence is handled by Prisma models for users, sessions, products, cart items, and Copilot actions.
- The product-manager Copilot panel calls `/api/copilot`, which validates the request, checks the user role, records Copilot action history, and calls `lib/copilot.ts`.
- Tests cover product filtering, Zod schemas, password hashing, and Copilot fallback behavior.
- Generated folders such as `node_modules`, `.next`, local SQLite databases, and `.env` are intentionally not included. They are recreated during setup.
