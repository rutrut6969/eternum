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
- Resend-based email verification links with 24-hour secure tokens, branded email copy, `/verify-email`, and resend support.
- Email verification feature gates for campaign creation and public homebrew publishing.
- Account email status UI with a resend verification button.
- Protected dashboard routes using server-side session checks.
- Campaign CRUD foundation: authenticated users can create campaigns, campaign creators receive DM and Player roles, DMs can edit name, description, JSON settings, and archive campaigns.
- Campaign membership role arrays support DM, Player, Assistant DM, Spectator, and mixed-role users.
- Invite flow foundation: DMs create token invites and authenticated users can accept pending invites.
- Campaign invite landing page at `/invite/[token]` with campaign preview, DM name, role offer, auth return links, and expired/used/invalid states.
- DM-only campaign member role editor with multi-role support and final-DM safety protection.
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
- Blob image upload endpoint and mobile upload UI for homebrew images using `BLOB_READ_WRITE_TOKEN`.
- Image storage foundation is prepared through `imageUrl`, `imagePrompt`, `imageAltText`, `generatedByAi`, and Blob token configuration.
- Homebrew images render on item/homebrew cards, approval cards, character inventory cards, and public library cards.
- Homebrew approval queue now supports custom spells, custom items, crafted-item style content, and publish requests with approve private, approve public, reject, request edits, and archive actions.
- Publish-to-public flow allows authors to request public publication after private approval and lets DMs confirm publication.
- Public library is database-backed and only shows `APPROVED_PUBLIC` content with `PUBLIC_LIBRARY` visibility.
- Public library filters include content type, rarity, discipline, profession requirement, creator, campaign source, and name/description search.
- Validation utilities cover email token generation/expiry, invite token status, member role safety, and Blob upload type/size checks.
- Campaign session infrastructure with planned, active, completed, and archived session states.
- DM session controls for create, start, end, and archive.
- Players can view campaign sessions and session history from the campaign dashboard.
- Campaign activity log model and feed for character creation, updates, dice rolls, session events, notes, homebrew approvals/publications, loot, profession gains, spell learning, item crafting, and affinity gains.
- Session/campaign/character note model with markdown body storage and visibility modes for DM-only, campaign-shared, and character-private notes.
- Server-side event bus abstraction with `eventBus.publish()` and `eventBus.subscribe()` for future realtime updates.
- Campaign timeline UI combining sessions, notes, activity, homebrew events, and character milestones.
- VTT foundation schema and placeholder UI for maps, map layers, tokens, combat encounters, and initiative entries.
- Character milestone tracking for profession levels, learned spells, crafted items, affinity gains, loot awards, and notable achievements.
- True campaign dashboard at `/dashboard/campaigns/[campaignId]` with active session, recent activity, members, characters, notes, homebrew awaiting approval, session history, timeline, and VTT data placeholders.
- Vitest test setup with coverage for session transitions, timeline generation, milestone generation, invite token handling, member role safety, upload validation, and email token expiry.
- Eternum rules modules for ability modifiers, mana, stamina, spell tiers, spell infusion, homebrew status, disciplines, necromancy branches, and professions.
- OpenAI integration helpers and API routes for backstory and custom spell suggestions.
- Open5e SRD integration helper for public D&D-compatible spell data.
- Vercel-ready project scripts and environment variable template.

## Partially Implemented

- Campaign CRUD is usable, but per-campaign detail pages, richer settings controls, and true hard-delete workflows are still planned.
- Invite flow has landing pages and token acceptance, but email delivery for invites is still planned.
- Character creation stores core identity and gameplay containers, but detailed inventory, spell, crafting, discipline, tamed creature, and undead servant editors are still planned.
- AI backstory approval applies common JSON fields, but suggestion shape validation and a more guided DM diff/preview UI are still planned.
- Dice rolls are filtered by campaign visibility, but real-time updates, advanced roll expressions, and per-roll audit views are still planned.
- Email verification is required for campaign creation and public publishing, but not yet required for every account action.
- Gameplay editors are functional JSON-backed editors; richer dedicated item/spell/taming/undead forms and validation are still planned.
- Spellbook SRD import depends on Open5e availability at runtime.
- Homebrew item power validation is basic rarity heuristic validation, not a full balance simulator yet.
- Blob upload supports direct user-uploaded images, but AI image generation is still planned.
- Session notes support markdown storage and mobile display, but there is no rich markdown editor or sanitizer yet.
- Activity feed is persisted and displayed, but realtime delivery is still only an abstraction.
- VTT data models and placeholder APIs exist, but map rendering, dynamic lighting, drag/drop tokens, and combat UI are intentionally not implemented.
- Campaign session dashboard is functional, but recurring scheduling/calendar integrations are not implemented.

## Known Issues

- npm scripts use direct Node entrypoints for Prisma and Next commands so Windows paths containing `&` do not break local development.
- No database migration has been generated yet; run `npm run db:push` after this pass or create the first migration once the schema is accepted.
- Auth currently uses credentials only. OAuth providers can be added later if desired.
- AI backstory analysis requires `OPENAI_API_KEY`; the rest of the dashboard still works without it.
- Campaign archive is a soft delete via `archivedAt`.
- Existing development databases with users may need a migration/backfill strategy before making `username` required in production.
- Existing development databases need `npm run db:push` after this pass to add homebrew metadata columns.
- Public library profession filtering currently filters JSON requirements in application code after fetching approved public records.
- Resend requires a verified sending domain for production email delivery.
- If `RESEND_API_KEY` is missing, registration still creates the account but verification email sending reports the configuration issue.
- Blob image upload requires `BLOB_READ_WRITE_TOKEN`; otherwise upload requests return a configuration error.
- Resend verification support is preserved, but production delivery is temporarily optional because sending-domain setup is limited.
- Legacy `SessionNote` remains in the schema for compatibility while new notes use `CampaignNote`.
- Session/activity/VTT schema changes require another `npm run db:push` on development databases.

## Next Recommended Steps

1. Run `npm run db:push` against the development database to apply the expanded schema.
2. Add realtime transport behind `eventBus` for activity, dice, and session updates.
3. Add full VTT map renderer, token movement, encounter UI, and dynamic lighting later.
4. Add invite email delivery after Resend production domain delivery is ready.
5. Upgrade gameplay editors with richer domain-specific validation and edit-in-place flows.
6. Add route-level database tests for session APIs, notes, activity creation, and VTT records.
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
- `RESEND_API_KEY`: Required to send verification emails.
- `EMAIL_FROM`: Sender address for Resend, for example `noreply@eternumtabletop.com`.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token for homebrew image uploads. Image URL fields work without upload support.

`EMAIL_VERIFICATION_PROVIDER` and `EMAIL_VERIFICATION_API_KEY` have been deprecated in favor of Resend verification links.

No new environment variables were added in this pass.

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
- Registration generates a 24-hour verification token.
- Resend sends a branded link to `${NEXTAUTH_URL}/verify-email?token=TOKEN`.
- Verified email is required before campaign creation and public homebrew publishing.
- Verification should also gate subscriptions, paid features, Discord integration, and other public launch surfaces.

## Resend Setup

1. Create a Resend account.
2. Verify the sending domain for `EMAIL_FROM`, such as `eternumtabletop.com`.
3. Set `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXTAUTH_URL` in local and production environments.
4. Register a test account and use the dashboard resend button if the first email fails.

Production Resend delivery is temporarily optional while the sending domain is limited. Keep the verification support configured where possible, but do not block local gameplay testing on production email delivery.

## Blob Image Upload Setup

1. Create or connect a Vercel Blob store.
2. Set `BLOB_READ_WRITE_TOKEN`.
3. Use homebrew portfolio or approval cards to upload JPG, PNG, WebP, or GIF images up to 5MB.
4. Uploaded URLs are stored on homebrew records and displayed in approvals, inventory-style cards, and the public library.

## Invite Links

- DMs can create invite tokens from campaign management.
- Share `/invite/TOKEN` with players.
- The invite page previews campaign name, DM, offered roles, and expiration.
- Logged-out users can sign in or register and return to the invite page.

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

This pass adds `CampaignSession`, `ActivityLog`, `CampaignNote`, `CharacterMilestone`, `Map`, `MapLayer`, `MapToken`, `CombatEncounter`, and `InitiativeEntry`. Run `npm run db:push` before testing sessions, notes, activity feeds, milestones, or VTT placeholders locally.

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
- [x] Email verification schema prep
- [x] Resend email verification links
- [x] Account email status and resend UI
- [x] Verification gates for campaign creation and public publishing
- [x] Dashboard route protection
- [x] Campaign CRUD foundation
- [x] Multi-role campaign membership schema
- [x] Invite token creation and acceptance foundation
- [x] Invite landing page
- [x] Campaign member role editing
- [x] Final DM role safety protection
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
- [x] Blob image upload endpoint and UI
- [x] Uploaded image rendering on homebrew, approval, inventory, and library cards
- [x] Validation utilities for email tokens, invites, role safety, and Blob uploads
- [x] Campaign session schema and APIs
- [x] Session create/start/end/archive controls
- [x] Campaign activity log schema and feed
- [x] Session/campaign/character note schema and UI
- [x] Event bus abstraction for future realtime
- [x] Campaign timeline UI
- [x] Character milestone tracking and display
- [x] VTT foundation schema for maps, layers, tokens, encounters, and initiative
- [x] VTT placeholder API and campaign dashboard panel
- [x] True campaign dashboard route
- [x] Gameplay infrastructure tests
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

- [ ] Campaign invite email delivery
- [ ] Rich spellbook and item detail editors
- [ ] Advanced homebrew balance validation
- [ ] Realtime transport behind event bus
- [ ] Rich markdown editor and sanitization for notes
- [ ] Route-level database tests for session/activity APIs

### Planned

- [ ] Session notes editor
- [ ] Discord integration
- [ ] Full VTT map rendering
- [ ] Dynamic lighting
- [ ] Realtime dice/activity updates
- [ ] Auth validation test suite
- [ ] Homebrew workflow test suite
- [ ] Rules engine test suite
- [ ] Homebrew item image generation support
- [ ] Vercel deployment verification
