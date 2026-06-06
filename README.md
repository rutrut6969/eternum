# Eternum Tabletop

Eternum Tabletop is a production-ready Next.js foundation for a dark fantasy, arcane-tech campaign manager and D&D-compatible rules engine. The governing architecture is:

**AI Suggestion -> Rules Engine Calculation -> DM Approval -> Saved Content**

AI helps players and DMs express creative ideas. The Eternum rules engine owns numbers, costs, tiers, balance notes, and campaign legality. Nothing becomes usable in a campaign until a DM approves it.

## Implemented

- Next.js App Router scaffold with TypeScript and TailwindCSS.
- Dark fantasy / arcane-tech public UI: landing page, rules page, library page, about page, login/register pages, dashboard, campaign manager, character workbench, approval queue, and dice roller.
- Mobile-first responsive layout pass across nav, public pages, auth forms, dashboards, campaign cards, character sheets, approval cards, library cards, and dice roll views.
- Prisma/PostgreSQL schema for users, auth sessions, campaigns, multi-role campaign members, invites, characters, character gameplay JSON, professions, backstory analysis, homebrew content, approvals, session notes, and dice rolls.
- NextAuth credentials configuration with Prisma adapter and password hashing.
- Account registration API and wired login/register forms with loading states, errors, and redirects.
- Protected dashboard routes using server-side session checks.
- Campaign CRUD foundation: authenticated users can create campaigns, campaign creators receive DM and Player roles, DMs can edit name, description, JSON settings, and archive campaigns.
- Campaign membership role arrays support DM, Player, Assistant DM, Spectator, and mixed-role users.
- Invite flow foundation: DMs create token invites and authenticated users can accept pending invites.
- Character creation foundation tied to campaigns, with gameplay data fields for inventory, learned spells, custom spells, crafted items, professions, magical disciplines, traits, flaws, affinities, tamed creatures, undead servants, and dice rolls.
- Mobile-friendly character sheet shell with mana/stamina calculations and gameplay data counters.
- AI backstory suggestions now persist into `BackstoryAnalysis` as pending DM review.
- DM backstory approval route and UI can approve, reject, or request edits. Approved suggestions apply profession levels, traits, flaws, magical affinities, and starting inventory.
- Server-side dice rolling API with visibility states: `dm_only`, `roller_and_dm`, `party_visible`, `public`.
- Dice roller UI uses the server-side dice API. DMs can view all campaign rolls and reveal hidden rolls; players only receive allowed rolls.
- Eternum rules modules for ability modifiers, mana, stamina, spell tiers, spell infusion, homebrew status, disciplines, necromancy branches, and professions.
- OpenAI integration helpers and API routes for backstory and custom spell suggestions.
- Open5e SRD integration helper for public D&D-compatible spell data.
- Vercel-ready project scripts and environment variable template.

## Partially Implemented

- Campaign CRUD is usable, but per-campaign detail pages, richer settings controls, member role editing, and true hard-delete workflows are still planned.
- Invite flow uses copyable tokens. Email delivery and invite landing pages are still planned.
- Character creation stores core identity and gameplay containers, but detailed inventory, spell, crafting, discipline, tamed creature, and undead servant editors are still planned.
- AI backstory approval applies common JSON fields, but suggestion shape validation and a more guided DM diff/preview UI are still planned.
- Dice rolls are filtered by campaign visibility, but real-time updates, advanced roll expressions, and per-roll audit views are still planned.
- Public library page is currently seeded with static examples while the public homebrew query UI is built.

## Known Issues

- npm scripts use direct Node entrypoints for Prisma and Next commands so Windows paths containing `&` do not break local development.
- No database migration has been generated yet; run `npm run db:push` after this pass or create the first migration once the schema is accepted.
- Auth currently uses credentials only. OAuth providers can be added later if desired.
- AI backstory analysis requires `OPENAI_API_KEY`; the rest of the dashboard still works without it.
- Campaign archive is a soft delete via `archivedAt`.
- Role editing UI is not yet exposed even though the schema supports multiple campaign roles.

## Next Recommended Steps

1. Run `npm run db:push` against the development database to apply the expanded schema.
2. Add member role editing and campaign invite landing pages.
3. Build detailed inventory, spellbook, crafting, discipline, tamed creature, and undead servant editors.
4. Add custom spell and item builders with rules-engine validation and approval persistence.
5. Build public library filtering/search over approved public homebrew.
6. Add tests for the rules engine, approval flows, invite flow, and dice visibility filtering.
7. Add realtime roll updates and richer campaign activity logs.

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

No new environment variables were added in this pass.

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
- [x] Login/register form wiring
- [x] Dashboard route protection
- [x] Campaign CRUD foundation
- [x] Multi-role campaign membership schema
- [x] Invite token creation and acceptance foundation
- [x] Character creation foundation
- [x] Character gameplay data containers
- [x] AI backstory persistence and DM approval foundation
- [x] Server-side dice roll foundation
- [x] Dice roll UI and visibility filtering foundation
- [x] DM reveal foundation for hidden rolls
- [x] Mobile-first responsiveness pass
- [x] Mana, stamina, spell tier, infusion, profession, and discipline rules modules
- [x] OpenAI integration foundation
- [x] Open5e SRD integration foundation
- [x] Public pages and dashboard shells
- [x] README tracker

### In Progress

- [ ] Campaign member role editing
- [ ] Campaign invite landing page and email delivery
- [ ] Character inventory/spell/crafting editors
- [ ] AI spell builder persistence
- [ ] Homebrew approval queue beyond backstory analysis

### Planned

- [ ] Homebrew item generator and rules validation
- [ ] Homebrew item image generation support
- [ ] Public library database search
- [ ] Session notes editor
- [ ] Realtime dice/activity updates
- [ ] Rules engine test suite
- [ ] Vercel deployment verification
