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
- Unique username system with normalized lowercase storage, Prisma uniqueness, live debounced availability checks, and server-side duplicate protection.
- Registration password rules with live checklist feedback and server-side enforcement.
- Email validation service abstraction with `none`, ZeroBounce, and Abstract provider options.
- Email verification prep fields on users for future verification-link workflows.
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
- Character gameplay editors for inventory, learned spells, custom spells, crafted items, profession progress, magical disciplines, traits, flaws, affinities, tamed creatures, and undead servants.
- Inventory items can be added to character-owned inventory with name, type, rarity, quantity, description, equipped state, image URL, and source.
- SRD spell search endpoint converts Open5e spell data into Eternum spell cards with tier, mana cost, casting time, range, duration, save/attack text, and infusion options.
- Basic learn/remove spell flows through character-owned learned spell data.
- Custom spell AI route now persists generated suggestions as draft/pending homebrew with rules-engine mana/tier/concentration/infusion metadata.
- Homebrew item builder supports manual and AI-assisted item drafts with rarity, stats/body, crafting/profession requirements, attunement, balance notes, image prompt, image alt text, and generated-by-AI metadata.
- Image storage foundation is prepared through `imageUrl`, `imagePrompt`, `imageAltText`, `generatedByAi`, and Blob token configuration.
- Homebrew approval queue now supports custom spells, custom items, crafted-item style content, and publish requests with approve private, approve public, reject, request edits, and archive actions.
- Publish-to-public flow allows authors to request public publication after private approval and lets DMs confirm publication.
- Public library is database-backed and only shows `APPROVED_PUBLIC` content with `PUBLIC_LIBRARY` visibility.
- Public library filters include content type, rarity, discipline, profession requirement, creator, campaign source, and name/description search.
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
- Email verification links are prepared at the schema level but not required yet.
- Gameplay editors are functional JSON-backed editors; richer dedicated item/spell/taming/undead forms and validation are still planned.
- Spellbook SRD import depends on Open5e availability at runtime.
- Homebrew item power validation is basic rarity heuristic validation, not a full balance simulator yet.
- Blob/image upload is not implemented yet; the schema and env setup are ready for storing Blob URLs.

## Known Issues

- npm scripts use direct Node entrypoints for Prisma and Next commands so Windows paths containing `&` do not break local development.
- No database migration has been generated yet; run `npm run db:push` after this pass or create the first migration once the schema is accepted.
- Auth currently uses credentials only. OAuth providers can be added later if desired.
- AI backstory analysis requires `OPENAI_API_KEY`; the rest of the dashboard still works without it.
- Campaign archive is a soft delete via `archivedAt`.
- Role editing UI is not yet exposed even though the schema supports multiple campaign roles.
- Existing development databases with users may need a migration/backfill strategy before making `username` required in production.
- Existing development databases need `npm run db:push` after this pass to add homebrew metadata columns.
- Public library profession filtering currently filters JSON requirements in application code after fetching approved public records.

## Next Recommended Steps

1. Run `npm run db:push` against the development database to apply the expanded schema.
2. Add Blob upload endpoints/UI for item images using `BLOB_READ_WRITE_TOKEN`.
3. Add email verification link issuance and require verified email before subscriptions or public launch.
4. Add member role editing and campaign invite landing pages.
5. Upgrade gameplay editors with richer domain-specific validation and edit-in-place flows.
6. Add tests for auth validation, rules engine, approval flows, homebrew publishing, invite flow, and dice visibility filtering.
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
- `EMAIL_VERIFICATION_PROVIDER`: `none`, `zerobounce`, or `abstract`. Defaults to `none`.
- `EMAIL_VERIFICATION_API_KEY`: API key for ZeroBounce or Abstract when enabled.
- `BLOB_READ_WRITE_TOKEN`: Future Vercel Blob token for item image uploads. Image URL fields work without upload support.

With `EMAIL_VERIFICATION_PROVIDER=none`, registration only performs normal email format validation. With ZeroBounce or Abstract enabled, registration rejects invalid, disposable, or risky emails before account creation.

## Account Rules

Usernames:

- 3-24 characters.
- Letters, numbers, and underscores only.
- No spaces.
- Stored as normalized lowercase `username` for uniqueness.
- Optional `displayUsername` preserves chosen casing for future UI use.

Passwords:

- Minimum 8 characters.
- At least 1 uppercase letter.
- At least 1 number.
- At least 1 symbol.

Email:

- Format is validated client-side and server-side.
- Optional provider verification can be enabled with `EMAIL_VERIFICATION_PROVIDER`.
- Email verification tokens and expiry fields are present, but verification links are not required yet.
- Verification links should be required before subscriptions, paid features, public publishing, or public launch.

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
- [x] Unique username schema and availability API
- [x] Live debounced username availability checks
- [x] Server-side username, email, and password validation
- [x] Password requirements checklist
- [x] Optional email verification provider abstraction
- [x] Email verification schema prep
- [x] Dashboard route protection
- [x] Campaign CRUD foundation
- [x] Multi-role campaign membership schema
- [x] Invite token creation and acceptance foundation
- [x] Character creation foundation
- [x] Character gameplay data containers
- [x] Character gameplay editors
- [x] Inventory item editor foundation
- [x] Profession progress editor
- [x] SRD spell search and Eternum spell conversion
- [x] Basic learn/remove spell flow
- [x] AI backstory persistence and DM approval foundation
- [x] AI custom spell persistence
- [x] Manual and AI homebrew item builder foundation
- [x] Homebrew rules metadata for spells/items
- [x] Homebrew approval queue beyond backstory
- [x] Publish-to-public request and DM confirmation flow
- [x] Public library database search and filters
- [x] Image storage metadata foundation
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
- [ ] Email verification link issuance and required verification gate
- [ ] Campaign invite landing page and email delivery
- [ ] Blob image upload endpoint/UI
- [ ] Rich spellbook and item detail editors
- [ ] Advanced homebrew balance validation

### Planned

- [ ] Session notes editor
- [ ] Realtime dice/activity updates
- [ ] Auth validation test suite
- [ ] Homebrew workflow test suite
- [ ] Rules engine test suite
- [ ] Homebrew item image generation support
- [ ] Vercel deployment verification
