# MaintainIQ

MaintainIQ is a role-aware Next.js application for reporting, triaging, assigning, working, and resolving maintenance issues. Server-side services enforce access control, workflow transitions, asset relevance, validation, and actor-attributed ticket history.

## Prerequisites

- Node.js **20.20.2** (or another Node.js 20 release supported by the lockfile)
- npm 9 or later
- PostgreSQL 14 or later
- An Anthropic API key for reporter ticket triage

## Environment setup

1. Copy `.env.example` to a local `.env` file.
2. Request the deployment values below from the deployer. Do not commit credentials or `.env`.
3. Set `DATABASE_URL` to a non-production PostgreSQL database before running migrations or seeding.
4. Set `AUTH_SECRET` to a high-entropy secret and `AUTH_URL` to the local application URL, such as `http://localhost:3000`.
5. Set the Anthropic variables to enable reporter triage. Without `ANTHROPIC_API_KEY`, reporter ticket creation returns a controlled service-unavailable response.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by Prisma. |
| `AUTH_SECRET` | Server-side Auth.js session-signing secret. |
| `AUTH_URL` | Canonical URL used by Auth.js. |
| `ANTHROPIC_API_KEY` | Server-only Anthropic API credential. |
| `ANTHROPIC_MODEL` | Optional deployment-selected Anthropic model; defaults to `claude-3-5-haiku-latest`. |
| `ANTHROPIC_TIMEOUT_MS` | Optional Claude request timeout in milliseconds; defaults to `15000`. |
| `TEST_DATABASE_URL` | Optional isolated PostgreSQL database for future database-backed integration tests. |

## Local development

On a standard local or CI filesystem:

```bash
npm ci
npx prisma generate
npm run prisma:validate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one seeded development-only account:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@maintainiq.demo` | `MaintainIQDemo!2026` |
| Technician | `technician@maintainiq.demo` | `MaintainIQDemo!2026` |
| Reporter | `reporter@maintainiq.demo` | `MaintainIQDemo!2026` |

`prisma/seed.ts` is idempotent for these demo users and representative assets. Do not use the demo password outside a development-only database.

## Demo workflow

1. Sign in as the **Reporter** and submit a factual issue with title, description, and location.
2. Confirm the returned ticket shows the server-derived AI recommendation and a reused or newly created relevant asset.
3. Sign in as the **Administrator**, review the ticket queue, assign it to the seeded Technician, and optionally override issue type or priority with a review note.
4. Sign in as the **Technician**, start assigned work, add a work note, and resolve the in-progress ticket with a non-empty resolution note.
5. Reopen the ticket as the Reporter or Administrator to confirm the ticket history retains creation, triage, assignment, work, and resolution actions with their actors.

## Quality and release validation

Run the deterministic checks non-interactively on a standard local or CI filesystem:

```bash
CI=true npm ci
npx prisma generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

When a non-production PostgreSQL database is available, also validate persistence and the seeded demo data:

```bash
npm run prisma:migrate
npm run prisma:seed
```

The current automated Vitest suite covers validation boundaries, strict AI recommendation parsing, Claude JSON-fence cleanup, role/ownership guards, location-relevant asset resolution, workflow transitions, required resolution notes, and actor-attributed history persistence calls.

Browser E2E tests are intentionally local/CI-only. Run a seeded role-switching browser walkthrough in an environment with a standard symlink-capable filesystem and a configured non-production database.

### Kavia workspace validation

The persistent Kavia workspace does not reliably support project-local `node_modules`. For dependency-based commands, copy the current source to a fresh standard filesystem location such as `/tmp/maintainiq-run`, then install and validate there:

```bash
cp -a MaintainIQ /tmp/maintainiq-run
cd /tmp/maintainiq-run
CI=true npm ci
npx prisma generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

Do not use symlinked executables for cloud validation in the persistent workspace. Browser E2E remains excluded from that cloud path.
