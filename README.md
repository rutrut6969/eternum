# Eternum Tabletop

Eternum Tabletop is a production-ready Next.js foundation for a dark fantasy, arcane-tech campaign manager and D&D-compatible rules engine. The governing architecture is:

**AI Suggestion -> Rules Engine Calculation -> DM Approval -> Saved Content**

AI helps players and DMs express creative ideas. The Eternum rules engine owns numbers, costs, tiers, balance notes, and campaign legality. Nothing becomes usable in a campaign until a DM approves it.

## Implemented

- Next.js App Router scaffold with TypeScript and TailwindCSS.
- Dark fantasy / arcane-tech public UI: landing page, rules page, library page, about page, login/register shells, dashboard shells.
- Prisma/PostgreSQL schema for users, auth sessions, campaigns, members, invites, characters, professions, backstory analysis, homebrew content, approvals, session notes, and dice rolls.
- NextAuth credentials configuration with Prisma adapter and password hashing.
- Account registration API.
- Server-side dice rolling API with visibility states: `dm_only`, `roller_and_dm`, `party_visible`, `public`.
- Eternum rules modules for ability modifiers, mana, stamina, spell tiers, spell infusion, homebrew status, disciplines, necromancy branches, and professions.
- OpenAI integration helpers and API routes for backstory and custom spell suggestions.
- Open5e SRD integration helper for public D&D-compatible spell data.
- Vercel-ready project scripts and environment variable template.

## Partially Implemented

- Login/register pages are styled shells; client-side form submission still needs wiring to NextAuth and the registration API.
- Dashboard pages are structural shells backed by schema design, not full CRUD workflows yet.
- AI routes return structured suggestions, but persistence into approval queues is planned for the next pass.
- Dice rolls are generated and persisted server-side, but reveal and query endpoints still need UI and authorization filtering.
- Public library page is currently seeded with static examples while the public homebrew query UI is built.

## Known Issues

- npm scripts use direct Node entrypoints for Prisma and Next commands so Windows paths containing `&` do not break local development.
- No database migration has been generated yet; use `prisma db push` for early development or create the first migration once the initial schema is accepted.
- Auth currently uses credentials only. OAuth providers can be added later if desired.
- Authorization checks need to be tightened around campaign membership and DM-only actions as CRUD routes are added.

## Next Recommended Steps

1. Install dependencies and generate the Prisma client.
2. Wire login and registration forms to real client actions.
3. Implement campaign CRUD, invite acceptance, membership roles, and DM/player campaign dashboards.
4. Persist AI backstory suggestions into `BackstoryAnalysis` and route them through DM approval.
5. Add custom spell and item builders with rules-engine validation and approval persistence.
6. Build public library filtering/search over approved public homebrew.
7. Add tests for the rules engine and dice parser.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string.
- `NEXTAUTH_URL`: Local or deployed app URL.
- `NEXTAUTH_SECRET`: Long random secret for NextAuth.
- `OPENAI_API_KEY`: Enables AI-assisted backstory, spell, and item workflows.
- `OPENAI_MODEL`: Defaults to `gpt-4o-mini`.
- `OPEN5E_BASE_URL`: Defaults to `https://api.open5e.com/v1`.

## Database

Development push:

```bash
npm run db:push
```

Migration workflow:

```bash
npx prisma migrate dev --name initial_schema
npm run prisma:deploy
```

Production should use a managed PostgreSQL database such as Neon, Supabase, Render, Railway, or Vercel Postgres.

## Deployment

The app is prepared for Vercel but not yet linked.

1. Create or link a Vercel project.
2. Add the environment variables listed above.
3. Ensure the production PostgreSQL database is reachable.
4. Run migrations with `npm run prisma:deploy`.
5. Deploy through Vercel Git integration or the Vercel CLI.

Do not run deployment watch commands until the Vercel project is linked.

## Git Workflow Notes

- Commit meaningful milestones with clear messages.
- Push to `rutrut6969/eternum` after remote configuration.
- Keep this README updated after each meaningful implementation pass.
- Avoid mixing large unrelated refactors into feature commits.

## Implementation Checklist

### Completed

- [x] Project scaffold
- [x] TypeScript, Next.js, TailwindCSS setup
- [x] Prisma schema foundation
- [x] Authentication setup foundation
- [x] Server-side dice roll foundation
- [x] Mana, stamina, spell tier, infusion, profession, and discipline rules modules
- [x] OpenAI integration foundation
- [x] Open5e SRD integration foundation
- [x] Public pages and dashboard shells
- [x] README tracker

### In Progress

- [ ] Campaign dashboard CRUD
- [ ] Character builder and backstory approval workflow
- [ ] Login/register client form wiring
- [ ] DM approval queue UI
- [ ] Dice reveal and visibility query UI

### Planned

- [ ] AI spell builder persistence
- [ ] Homebrew item generator and rules validation
- [ ] Homebrew item image generation support
- [ ] Public library database search
- [ ] Campaign invite acceptance flow
- [ ] Session notes editor
- [ ] Rules engine test suite
- [ ] Vercel deployment verification
