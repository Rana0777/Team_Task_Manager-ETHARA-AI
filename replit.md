# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/api-server exec tsx src/seed.ts` — reseed demo data

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Team Task Manager (`artifacts/task-manager`)

A complete role-based team task manager. Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind. Backend: `artifacts/api-server` (Express, JWT, bcrypt, Drizzle/Postgres) under `/api`.

Features:

- Email/password auth with JWT (admin/member roles).
- Dashboard: stat cards, overdue tasks, my tasks, recent tasks, status breakdown.
- Projects: list/create (admin), detail with inline edit, members management, task table with status filters, task creation, delete with confirm.
- Task detail modal: admins edit all fields; members can change status of tasks assigned to them.
- Users page (admin only).

Demo accounts (created by `seed.ts`):

- `admin@demo.com` / `admin123`
- `alice@demo.com` / `member123`
- `bob@demo.com` / `member123`

JWT signing key: `JWT_SECRET` env var, falls back to `SESSION_SECRET`.
