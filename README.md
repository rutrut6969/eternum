# Eternum Tabletop

Eternum Tabletop is a production-ready Next.js foundation for a dark fantasy, arcane-tech campaign manager and D&D-compatible rules engine. The governing architecture is:

**AI Suggestion -> Rules Engine Calculation -> DM Approval -> Saved Content**

AI helps players and DMs express creative ideas. The Eternum rules engine owns numbers, costs, tiers, balance notes, and campaign legality. Nothing becomes usable in a campaign until a DM approves it.

## Implemented

- Next.js App Router scaffold with TypeScript and TailwindCSS.
- Dark fantasy / arcane-tech public UI: landing page, rules page, library page, about page, login/register pages, dashboard, campaign manager, character workbench, approval queue, and dice roller.
- Public site monetization redesign with a stronger landing page, global search entry, expanded Vision page, Eternum: Inheritance future RPG page, refreshed navigation/footer, Pricing page, donation page, and launch-prep Privacy/Terms placeholders.
- Mobile-first responsive layout pass across nav, public pages, auth forms, dashboards, campaign cards, character sheets, approval cards, library cards, and dice roll views.
- Prisma/PostgreSQL schema for users, auth sessions, campaigns, multi-role campaign members, invites, characters, character gameplay JSON, professions, backstory analysis, homebrew content, approvals, session notes, and dice rolls.
- NextAuth credentials configuration with Prisma adapter and password hashing.
- Account registration API and wired login/register forms with loading states, errors, and redirects.
- Unique username system with normalized lowercase storage, Prisma uniqueness, live debounced availability checks, and server-side duplicate protection.
- Registration password rules with live checklist feedback and server-side enforcement.
- Resend-based email verification links with 24-hour secure tokens, branded email copy, `/verify-email`, and resend support.
- Email verification feature gates for campaign creation and public homebrew publishing.
- Account email status UI with a resend verification button.
- Authenticated navigation now hides Sign In/Create Account and shows a session-aware avatar/account menu with profile links, logout, and attention indicator.
- Mobile app shell now uses a compact top bar with hamburger drawer, centered Eternum logo, and avatar/account button. Full public nav links are hidden on mobile.
- Logged-in mobile uses the app drawer instead of the public marketing nav. Logged-out mobile drawer shows public links, sign in, and create account.
- Mobile bottom dashboard nav was removed to prevent browser-control overlap and content coverage.
- Full repository audit pass rechecked app routes, components, core libraries, Prisma schema, README, package scripts, and gameplay tests before continuing integrations.
- Global mobile/UI hardening now adds document-level horizontal overflow prevention, safe `100dvh` sizing, compact mobile page padding, non-wrapping CTAs, and phone-first headings across public, auth, invite, verify-email, and dashboard pages.
- Live mobile QA used a Chrome-emulated iPhone 17 viewport (`402 x 874` CSS pixels) to verify public pages, auth forms, mobile drawer, and dashboard routes for overflow and readability.
- Homepage demo character card now keeps the Level badge, Blacksmithing/Arcane/Mining profession chips, and spell card content inside the iPhone-width viewport.
- Mobile drawer backdrop now explicitly fills `100dvh`; Chrome live metrics verified the overlay covers the full iPhone viewport behind the drawer.
- Register username reset control is compact on mobile and sits beside the username field while keeping the longer desktop label.
- App shell role navigation now derives DM-tool visibility from actual active campaign DM/Assistant DM membership, founder/subscription access, or Founder status instead of relying on stale UI-only role state.
- Dashboard quick actions and the campaign workspace now hide DM/create-campaign actions for new unverified player accounts while preserving join campaign, character, homebrew, dice, maps, library, and account access.
- `AGENTS.md` now documents project architecture, development rules, mobile UI rules, authorization rules, testing expectations, and current priorities for future Codex passes.
- Mobile hamburger drawer now renders as a solid dark fixed panel with blurred backdrop overlay, safe-area padding, scroll lock, high-contrast links, active-route styling, separated DM section, and bottom logout.
- Public and authenticated routing is server-enforced: logged-in visits to `/`, `/login`, or `/register` redirect to `/dashboard`.
- Route-group layouts now separate public/auth chrome from the authenticated dashboard app shell. Public pages use public navigation; `/dashboard` and `/dashboard/*` use the app shell.
- Protected dashboard routes using server-side session checks.
- Campaign CRUD foundation: authenticated users can create campaigns, campaign creators receive DM and Player roles, DMs can edit name, description, JSON settings, and archive campaigns.
- Campaign membership role arrays support DM, Player, Assistant DM, Spectator, and mixed-role users.
- Invite flow foundation: DMs create token invites and authenticated users can accept pending invites.
- Campaign invite landing page at `/invite/[token]` with campaign preview, DM name, role offer, auth return links, and expired/used/invalid states.
- DM-only campaign member role editor with multi-role support and final-DM safety protection.
- Character creation foundation tied to campaigns, with gameplay data fields for inventory, learned spells, custom spells, crafted items, professions, magical disciplines, traits, flaws, affinities, tamed creatures, undead servants, and dice rolls.
- Guided classless character creator at `/dashboard/characters/new` with labeled wizard steps for identity, SRD/Open5e species, backstory, attributes, training focus, review, and starting wallet.
- Reusable form UI components for labeled fields, helper text, errors, sections, checkboxes, and submit bars.
- Mobile-friendly character sheet shell with mana/stamina calculations and gameplay data counters.
- AI backstory suggestions now persist into `BackstoryAnalysis` as pending DM review.
- DM backstory approval route and UI can approve, reject, or request edits. Approved suggestions apply profession levels, traits, flaws, magical affinities, and starting inventory.
- Server-side dice rolling API with visibility states: `dm_only`, `roller_and_dm`, `party_visible`, `public`.
- Dice roller UI uses the server-side dice API. DMs can view all campaign rolls and reveal hidden rolls; players only receive allowed rolls.
- Character gameplay editors for inventory, learned spells, custom spells, crafted items, profession progress, magical disciplines, traits, flaws, affinities, tamed creatures, and undead servants.
- Inventory items can be added to character-owned inventory with name, type, rarity, quantity, description, equipped state, image URL, and source.
- SRD spell search endpoint converts Open5e spell data into Eternum spell cards with tier, mana cost, casting time, range, duration, save/attack text, and infusion options.
- SRD/Open5e species service and API routes for species lists/details plus generic SRD entries.
- Public Library now separates approved public homebrew from SRD/Open5e-compatible reference content, labels SRD sources, formats entries into readable sections, and uses collapsible mobile-friendly detail panels instead of raw source dumps.
- Currency wallet foundation with copper-based conversion helpers, character wallets, party treasuries, transaction audit records, transfer/split APIs, and wallet display cards.
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
- Public library Prisma query is now defensive: it filters only safe scalar fields in Prisma and moves fuzzy/search/JSON filters into application-side filtering with friendly error handling.
- Pricing page at `/pricing` with Free, DM, Worldbuilder, and purchasable Founder lifetime tiers plus Square checkout buttons for paid plans.
- Donation page at `/donate` with public no-account Square donation checkout that does not grant premium access.
- Eternum: Inheritance public page at `/inheritance` explaining the planned future story-driven fantasy RPG, opt-in living lore pipeline, VTT-to-game connection, community canon philosophy, development status, and support paths.
- Subscription and billing schema foundation for `SubscriptionPlan`, `UserSubscription`, `BillingEvent`, and `AIUsage`.
- Subscription feature-gate service foundation with `canCreateCampaign()`, `canUseAdvancedAI()`, `canPublishPublicHomebrew()`, `canUseFutureMapGeneration()`, and `canUseFutureDiscordFeatures()`.
- Founder/max-tier support with `isFounder`, `founderSince`, active Founder subscriptions, Founder badges, safe `npm run seed:founders`, and `npm run debug:user -- identifier`.
- Square billing foundation with server-side environment selector, checkout route at `/api/billing/checkout`, donation checkout route at `/api/billing/donate`, webhook route at `/api/billing/square/webhook`, payment-link creation, webhook signature verification, billing events, marketplace purchase models, and entitlement grant foundation.
- Server-side gates now include `canAccessDmTools()` and are wired into campaign creation, advanced AI routes, and public homebrew publishing.
- Monthly AI usage tracking is wired into backstory, spell, and item AI routes after authorization checks.
- Registration usernames can auto-generate from Display Name, stop auto-updating after manual edits, and reset from display name on demand.
- Registration and username availability APIs now catch Prisma lookup/create errors and return friendly messages instead of crashing pages.
- Validation utilities cover email token generation/expiry, invite token status, member role safety, and Blob upload type/size checks.
- Campaign session infrastructure with planned, active, completed, and archived session states.
- DM session controls for create, start, end, and archive.
- Players can view campaign sessions and session history from the campaign dashboard.
- Campaign activity log model and feed for character creation, updates, dice rolls, session events, notes, homebrew approvals/publications, loot, profession gains, spell learning, item crafting, and affinity gains.
- Session/campaign/character note model with markdown body storage and visibility modes for DM-only, campaign-shared, and character-private notes.
- Server-side event bus abstraction with `eventBus.publish()` and `eventBus.subscribe()` for future realtime updates.
- Campaign timeline UI combining sessions, notes, activity, homebrew events, and character milestones.
- VTT foundation schema and placeholder UI for maps, map layers, tokens, combat encounters, and initiative entries.
- AI-generated map support foundation with map visibility/status enums, map image records, map tags, AI prompt metadata, grid type/dimensions, party level, notes, spawn points, lighting notes, encounter suggestions, public map library search, and public map clone/import API.
- Top-down battle map prompt template utility that enforces VTT-friendly perspective, no labels, grid alignment, clear terrain, and high contrast.
- Character milestone tracking for profession levels, learned spells, crafted items, affinity gains, loot awards, and notable achievements.
- Campaign list page at `/dashboard/campaigns` is now an index/launcher with create, join, Campaigns I DM, Campaigns I play in, archived campaigns, state badges, and Open Campaign actions.
- True campaign workspace at `/dashboard/campaigns/[campaignId]` with local mobile-scroll tabs for Overview, Sessions, Characters, Members, Invites, Approvals, Dice Rolls, Notes, Maps/VTT, Homebrew, Enabled Content, and Settings.
- Campaign workspace overview shows active session, recent activity, party characters, pending approvals, recent dice rolls, current maps, and quick actions.
- Member role editing, invite creation/copy links, and campaign settings now live inside the dedicated campaign workspace instead of the campaign launcher.
- VTT campaign panel now displays map images, descriptions, tags, grid/status badges, AI-image badges, visible empty states, and lets DMs attach new map records to either the campaign or a specific session.
- Editable map builder foundation with `/dashboard/maps/new` and `/dashboard/maps/[mapId]/edit`, using SVG grid rendering and structured `MapLayer.data` rather than flat images.
- Map editor Phase 2 usability pass with selection, Shift+Click multi-select, drag/move, arrow-key nudging, room drag creation, straight wall/corridor creation, resize handles, rotation, duplicate/delete, undo/redo, zoom controls, grid toggle, styled terrain patterns, layer controls, and an editable properties panel.
- Map editor full-screen sandbox overhaul: `/dashboard/maps/[mapId]/edit` now opens as a dedicated fixed `100dvh` workspace with compact top bar, vertical tool rail, large SVG canvas, right inspector, bottom status bar, body scroll lock, and mobile light-edit warning.
- Map canvas input handling now uses explicit interaction state and pointer capture for object selection, drag/move, resize, room/wall drawing, marquee selection, panning, keyboard nudging, and rotation controls.
- Map canvas wheel events are captured with a non-passive listener on the editor canvas shell so wheel-over-canvas zooms the map without scrolling the page.
- Map source tracking now supports manual maps, AI blueprint drafts, uploaded image maps, and hybrid AI/manual workflows through `MapSourceType`.
- AI map blueprint route at `/api/ai/map-blueprint` generates strict JSON map blueprints, validates grid bounds and layer data, and can save validated drafts as editable map records.
- Map blueprint utilities validate rooms, corridors, walls, doors, windows, stairs, terrain, obstacles, lighting notes, spawn points, secret areas, labels, and DM notes before save.
- Maps workspace now documents the Prompt -> AI structured blueprint -> validation -> editable layers -> DM edits -> campaign/session use -> optional public publish flow.
- Logged-in workspace redesign with session-aware top navigation, mobile app drawer navigation, softer card styling, denser overview cards, quick actions, and discoverable routes.
- Dashboard overview now shows active campaigns, characters, pending approvals, recent dice rolls, recent homebrew, public library shortcuts, invite acceptance, email verification notice, and quick create actions.
- Dedicated workspace routes: `/dashboard/account`, `/dashboard/homebrew`, `/dashboard/homebrew/spells/new`, `/dashboard/homebrew/items/new`, and `/dashboard/maps`.
- Campaign workspace now separates campaigns the user DMs, campaigns they play in, archived campaigns, join-invite actions, and richer campaign state cards.
- Character workspace now includes mobile-friendly character cards with campaign, level, HP placeholder, mana/stamina bars, spell count, and profession count before the full editor.
- Homebrew workspace now groups authored content by draft, pending review, approved private, published public, and rejected/archived status lanes.
- Account workspace displays display name, username, email verification status, subscription placeholder, AI usage counts, linked-account placeholder, and Obsidian Systems branding.
- Account workspace, dashboard, and avatar menu show subtle Founder / Max Tier / Lifetime Access badges for founder accounts.
- Footer branding now displays "Powered by Obsidian Systems LLC" across public and logged-in pages.
- Vitest test setup with coverage for session transitions, timeline generation, milestone generation, invite token handling, member role safety, upload validation, and email token expiry.
- Eternum rules modules for ability modifiers, mana, stamina, spell tiers, spell infusion, homebrew status, disciplines, necromancy branches, and professions.
- OpenAI integration helpers and API routes for backstory and custom spell suggestions.
- Unified assistant panel now feels like a campaign operating system with a persistent slide-over, recent threads, workflow shortcuts, context cards, workflow response cards, mobile full-sheet behavior, and large-message warnings.
- Assistant routing recognizes character creation, backstory analysis, spell creation, item creation, NPC creation, NPC roleplay, monster creation, quest generation, worldbuilding, session summaries, rules questions, editable map blueprints, compendium creation, crafting help, loot tracking, currency split, campaign memory queries, and unknown/general requests.
- Assistant message handling validates payloads, rejects malformed/empty input, supports large lore/backstory/session text, stores full messages, condenses large source text before OpenAI calls, and returns clearer errors.
- NPC roleplay foundation schema tracks NPC profiles, memories, conversations, messages, hidden DM instructions, roleplay enablement, and auto-send policy flags.
- Provider-agnostic voice service foundation supports future transcription, speech, previews, NPC voice creation, and voice assignment with text-only fallback.
- Session listener foundation includes transcript segment schema and DM-gated transcript import/correction APIs.
- Loot tracking foundation includes loot events, loot claims, pending inventory/currency update records, and a DM-gated manual loot event API.
- Crafted item pricing service and API calculate values in copper with material, labor, profession, roll quality, rarity, quality, enchantments, durability, economy, legality, scarcity, reputation, and DM override modifiers.
- Campaign cards now distinguish Open Manager from Play Campaign, with `/dashboard/campaigns/[campaignId]/play` as the first live tabletop/player mode foundation.
- Dice roll and activity feed panels now use internal scroll regions so long logs do not stretch the entire page.
- Open5e SRD integration helper for public D&D-compatible spell data.
- Vercel-ready project scripts and environment variable template.

## Partially Implemented

- Campaign CRUD is usable with dedicated campaign workspaces, but true hard-delete workflows and richer approval/settings subroutes are still planned.
- Invite flow has landing pages and token acceptance, but email delivery for invites is still planned.
- Character creation stores classless identity, SRD species references, training focus, gameplay containers, and wallet records, but richer portrait upload, guided backstory analysis handoff, skill training, research, and archetype progression are still planned.
- AI backstory approval applies common JSON fields, but suggestion shape validation and a more guided DM diff/preview UI are still planned.
- Dice rolls are filtered by campaign visibility, but real-time updates, advanced roll expressions, and per-roll audit views are still planned.
- Email verification is required for campaign creation and public publishing, but not yet required for every account action.
- Gameplay editors are functional JSON-backed editors; richer dedicated item/spell/taming/undead forms and validation are still planned.
- Spellbook SRD import depends on Open5e availability at runtime.
- Homebrew item power validation is basic rarity heuristic validation, not a full balance simulator yet.
- Blob upload supports direct user-uploaded images, but AI image generation is still planned.
- Session notes support markdown storage and mobile display, but there is no rich markdown editor or sanitizer yet.
- Activity feed is persisted and displayed, but realtime delivery is still only an abstraction.
- Campaign play mode exposes maps/VTT, dice, character list, notes/handouts, and session activity, but token movement, fog of war, combat automation, player view separation, and handout reveal controls are still planned.
- VTT data models and a full-screen editable map renderer exist, but rich furniture asset libraries, token automation, fog of war, dynamic lighting, realtime collaboration, player view separation, and combat UI are intentionally not implemented.
- AI map generation is blueprint-first: structured JSON generation and validation exist, but OpenAI image generation and generated Blob upload pipelines are intentionally not wired yet.
- Campaign session dashboard is functional, but recurring scheduling/calendar integrations are not implemented.
- Subscription models, feature gates, pricing page, Square checkout, Founder lifetime checkout, donation checkout, webhook foundation, and AI usage tracking exist, but full Square subscription lifecycle sync, billing portal, invoices, refunds, and customer self-service are still partial.
- Homebrew spell/item builder routes are usable entry points, but rich field-level spell/item editors and post-save image-upload handoff are still basic.
- Unified assistant stores structured drafts and workflow state, but it does not yet convert assistant workflows directly into saved homebrew, characters, NPCs, monsters, quests, handouts, compendiums, or DM review submissions.
- Currency wallets, transfers, manual loot event records, and pending inventory/currency update schema exist, but rich loot claim queues, edit/approve/reject UI, listener-driven loot detection, and auto-approval settings are still planned.
- Voice/NPC roleplay/listener records and service abstractions are foundations only; no live transcription or text-to-speech provider is configured yet.
- SRD data currently uses live Open5e fetches plus cache schema foundation; import/refresh scripts and normalized high-volume SRD tables are still planned.
- Dashboard navigation is functional and mobile-friendly, but active-route highlighting and richer notification detail views are still planned.
- Account settings display user data, but editable profile fields and linked account management are still placeholders.
- DM-only mobile drawer links route to the current dashboard/campaign workspaces until dedicated standalone per-tool landing pages exist.
- `/invite/[token]` and `/verify-email` currently use the neutral root frame while public/auth/dashboard route groups have dedicated shells.
- Manual visual QA should continue on real devices and browser widths after each UI pass; this pass added CSS/layout safeguards for 390px, 430px, and 768px widths but still relies on build/test validation unless a local browser session is running.
- The live `https://eternumvtt.com` URL did not respond from this development environment during this pass, so visual QA was performed against localhost with Chrome device emulation.
- Donations create Square payment links without requiring an Eternum account and intentionally do not grant premium access.
- Founder can now be purchased as a lifetime plan through checkout, while `npm run seed:founders` remains available for manual promotion of existing founder accounts.
- Eternum: Inheritance is documented as a future concept/pre-development vision only. The page avoids release-date promises and explains that campaign lore may inspire official canon only through future opt-in, reviewed, curated workflows.

## Known Issues

- npm scripts use direct Node entrypoints for Prisma and Next commands so Windows paths containing `&` do not break local development.
- No database migration has been generated yet; run `npm run db:push` after this pass or create the first migration once the schema is accepted.
- Auth currently uses credentials only. OAuth providers can be added later if desired.
- AI backstory analysis requires `OPENAI_API_KEY`; the rest of the dashboard still works without it.
- Campaign archive is a soft delete via `archivedAt`.
- Existing development databases with users may need a migration/backfill strategy before making `username` required in production.
- Existing development databases need `npm run db:push` after this pass to add homebrew metadata columns.
- Public library profession filtering currently filters JSON requirements in application code after fetching approved public records.
- Public library search intentionally avoids Prisma JSON filtering and relation/fuzzy filters in the database query; creator/campaign/profession/search filters run in application code after fetching approved public records.
- Resend requires a verified sending domain for production email delivery.
- If `RESEND_API_KEY` is missing, registration still creates the account but verification email sending reports the configuration issue.
- Blob image upload requires `BLOB_READ_WRITE_TOKEN`; otherwise upload requests return a configuration error.
- Resend verification support is preserved, but production delivery is temporarily optional because sending-domain setup is limited.
- Legacy `SessionNote` remains in the schema for compatibility while new notes use `CampaignNote`.
- Session/activity/VTT/map schema changes require `npm run db:push` on development databases.
- Assistant/NPC/listener/loot/handout/pricing schema changes require `npm run db:push` on development databases.
- Editable map builder schema changes require `npm run db:push` to add `MapSourceType`, `Map.blueprintVersion`, and `Map.editorState`.
- Subscription/billing schema changes require `npm run db:push` on development databases.
- Square checkout and webhook foundations are implemented, but production Square configuration, subscription catalog mapping, refunds, invoices, and customer portal management still need operational setup.
- `npm run seed:founders` is update-only and safe for passwords/data. It must be run against the database where the target user already exists.
- Founder users can pass campaign member/DM checks through the shared campaign auth helper for administration and recovery access.
- The full-screen map editor renders structured SVG elements with tactical styling and common object editing, but keyboard shortcut discoverability, image export, fog, lighting, player view, and token automation are future phases.
- The full-screen map editor now supports object selection, movement, resizing, rotation, duplication, deletion, undo/redo, zoom controls, terrain styling, layer management, body scroll lock, canvas wheel capture, and properties editing, but mobile remains a simplified/light-edit experience.
- AI map blueprints require `OPENAI_API_KEY` and a plan that passes `canUseFutureMapGeneration()`.
- Unified assistant messages require `OPENAI_API_KEY` and currently use the existing advanced AI feature gate.
- Assistant workflows are persisted as drafts, but submit-to-review/save-to-content actions are still future implementation work.
- Wallet transfers require enough character balance and currently operate through API foundations; richer transfer/split UI and party treasury management screens are still planned.
- Pricing checkout creates payment links, but full customer self-service, cancellation flows, refunds, and invoice history still need Square lifecycle polish.

## Next Recommended Steps

1. Configure Square sandbox credentials and verify `/api/billing/checkout` creates DM, Worldbuilder, and Founder payment links.
2. Run `npm run seed:founders` in each environment after adding `FOUNDER_ACCOUNTS`, then verify with `npm run debug:user -- email-or-username`.
3. Verify `/api/billing/donate` creates public donation payment links and confirms donations do not mutate subscription state.
4. Add session detail pages for transcript, session memory, loot, encounters, and per-session notes.
5. Add NPC roleplay profile editor, DM preview/approval controls, and text-only conversation UI before connecting voice.
6. Add loot claim queue UI and pending inventory/currency approve/edit/reject actions.
7. Add campaign player handout creation/reveal controls and player-private note surfaces.
8. Add dedicated shell treatment for invite and verify-email standalone routes if they should share public chrome.
9. Verify Square sandbox webhook payload metadata end-to-end and add deeper subscription lifecycle reconciliation.
10. Add active-route highlighting and richer notification detail views for the authenticated account menu.
11. Add richer map editor interactions: drag handles, snap controls, layer reordering, labels editing, and image export.
12. Add a campaign UI for importing/cloning public maps and attaching maps to active sessions.
13. Add optional AI image generation as a visual/reference layer after blueprint editing is stable.
14. Add assistant workflow actions that convert structured drafts into spell/item/NPC/monster/map records and submit them to DM review.
15. Add assistant campaign memory retrieval for session summaries, NPCs, quests, loot, decisions, and character milestones.

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
- `OPENAI_API_KEY`: Enables AI-assisted backstory, spell, item, unified assistant, and AI map blueprint workflows.
- `OPENAI_MODEL`: Defaults to `gpt-4o-mini`.
- `OPEN5E_BASE_URL`: Defaults to `https://api.open5e.com/v1`.
- `RESEND_API_KEY`: Required to send verification emails.
- `EMAIL_FROM`: Sender address for Resend, for example `noreply@eternumtabletop.com`.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token for homebrew image uploads. Image URL fields work without upload support.
- `FOUNDER_ACCOUNTS`: Optional comma-separated emails, usernames, or display usernames to promote with `npm run seed:founders`. If omitted, the seed exits safely without changing accounts.
- `FOUNDER_LIFETIME_PRICE_CENTS`: Optional Founder lifetime checkout price in cents. Defaults to `24900`.
- `SQUARE_ENVIRONMENT`: `sandbox` or `production`.
- `SQUARE_SANDBOX_ACCESS_TOKEN`, `SQUARE_SANDBOX_APPLICATION_ID`, `SQUARE_SANDBOX_LOCATION_ID`, `SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY`: Square sandbox credentials.
- `SQUARE_PRODUCTION_ACCESS_TOKEN`, `SQUARE_PRODUCTION_APPLICATION_ID`, `SQUARE_PRODUCTION_LOCATION_ID`, `SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY`: Square production credentials.
- `SQUARE_WEBHOOK_NOTIFICATION_URL`: Exact webhook URL registered in Square. Must match the URL used for signature verification.

`EMAIL_VERIFICATION_PROVIDER` and `EMAIL_VERIFICATION_API_KEY` have been deprecated in favor of Resend verification links.

New Square environment variables were added in this pass. The deprecated email verification provider variables remain removed in favor of Resend.

Square subscription integration uses server-only credentials selected by `SQUARE_ENVIRONMENT`. Founder accounts can be purchased through checkout, and existing accounts can still be promoted safely with `npm run seed:founders`.

## Founder Account Setup

1. Add comma-separated emails/usernames/display usernames to `FOUNDER_ACCOUNTS`.
2. Run `npm run seed:founders` against the target database.
3. Verify with `npm run debug:user -- plagueformula@gmail.com`.
4. For Vercel/production, add `FOUNDER_ACCOUNTS` to Vercel env vars and run the seed against the production database. Adding the env var alone does not update existing users.

Founder seeding:

- Matches email, username, or display username case-insensitively.
- Does not change passwords.
- Does not recreate accounts.
- Does not delete user data.
- Sets `emailVerified`.
- Sets `User.isFounder`, `founderSince`, and an active `FOUNDER` subscription with source `FOUNDER`.

## Square Billing Setup

1. Set `SQUARE_ENVIRONMENT=sandbox`.
2. Add sandbox access token, application ID, location ID, and webhook signature key.
3. Register `/api/billing/square/webhook` in Square and set `SQUARE_WEBHOOK_NOTIFICATION_URL` to the exact public URL.
4. Set `FOUNDER_LIFETIME_PRICE_CENTS` if the Founder lifetime price should differ from `$249`.
5. Use `/pricing` checkout buttons for DM, Worldbuilder, and Founder test payment links.
6. Use `/donate` to verify no-account Square donations. Donations must remain separate from premium access and subscription state.
7. Switch `SQUARE_ENVIRONMENT=production` only after production credentials and webhook URL are configured.

## Account Rules

Usernames:

- 3-24 characters.
- Letters, numbers, and underscores only.
- No spaces.
- Stored as normalized lowercase `username` for uniqueness.
- Optional `displayUsername` preserves chosen casing for future UI use.
- Register form auto-generates usernames from Display Name using lowercase text, underscores for spaces, invalid-character removal, repeated-underscore collapse, and a 24-character limit until the username is manually edited.
- The username field includes a mobile-friendly reset button to regenerate from Display Name.

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

## AI Map Generation Foundation

- Map records support `MapVisibility`: `CAMPAIGN_ONLY`, `PRIVATE_USER`, and `PUBLIC_LIBRARY`.
- Map records support `MapApprovalStatus`: `DRAFT`, `PENDING_DM_REVIEW`, `APPROVED_PRIVATE`, `APPROVED_PUBLIC`, `REJECTED`, and `ARCHIVED`.
- Map records support `MapSourceType`: `MANUAL`, `AI_BLUEPRINT`, `UPLOAD`, and `HYBRID`.
- Map records store `blueprintVersion` and `editorState`; canonical editable geometry is stored in `MapLayer.data`.
- The first map builder is conceptually inspired by fast sketch-style tabletop map tools, but it must not copy Dungeon Scrawl code, branding, UI, interactions, or assets.
- Editable map data supports rooms, corridors, walls, doors, windows, stairs, terrain, obstacles, lighting notes, spawn points, secret areas, labels, DM notes, and layers.
- AI map generation is blueprint-first: `/api/ai/map-blueprint` asks OpenAI for structured JSON, validates the blueprint, and saves only valid editable layer data.
- Manual builder, AI blueprint builder, uploaded image reference maps, and hybrid AI/manual workflows are all represented in the data model.
- Map records support uploaded or future AI-generated images through `MapImage`.
- Map metadata supports prompts, grid type, grid width/height, recommended party level, environment/theme tags, interactive notes, spawn point JSON, lighting notes, and encounter suggestion JSON.
- Blueprint prompt templates require top-down structure, square-grid alignment, no baked-in labels, clear terrain, VTT-readable contrast, and strict JSON output by default.
- Static AI image prompt templates remain for later optional image generation and must not replace editable blueprint data.
- Public map library search exists at `/maps` and filters by name/description, environment, theme, grid type, size, and creator.
- Public map clone/import API foundation exists at `/api/maps/[mapId]/clone` for DMs to copy approved public maps into campaigns.
- Full AI image generation is still planned; generated images should be saved to Blob storage before attaching to `MapImage`.
- Future editor phases should add export image, token placement, fog of war, dynamic lighting, player view, and marketplace map packs.

## Subscription and Billing Foundation

- Planned tiers are `FREE`, `DM`, `WORLDBUILDER`, and `FOUNDER`.
- `SubscriptionPlan` stores tier metadata, planned prices, sort order, and feature JSON.
- `UserSubscription` stores the active user plan, status, start/expiry dates, `squareCustomerId`, and `squareSubscriptionId`.
- `User` stores `isFounder` and `founderSince` so Founder access remains fast and provider-independent.
- `BillingEvent` stores future provider events and webhook payloads. Provider defaults to `square`.
- `AIUsage` stores monthly request counts by user and month.
- `subscriptionService` centralizes feature-gate decisions for campaign creation, advanced AI, public homebrew publishing, future map generation, and future Discord features.
- Founder accounts are treated as the highest tier and pass all current/future premium gates, including DM tools, advanced AI, public publishing, future map generation, and future Discord/VTT premium features.
- Run `npm run seed:founders` to promote existing accounts. The script never changes passwords, never recreates existing accounts, skips missing accounts, masks email output, and marks founder accounts verified.
- Square checkout currently creates hosted payment links for DM, Worldbuilder, and Founder. The webhook route records Square events and promotes Founder when valid metadata is received, but full subscription reconciliation, billing portal support, invoices, refunds, and customer self-service remain planned.
- Donations use a separate public Square payment-link route and intentionally do not grant premium access.
- Stripe is intentionally not implemented.

## Eternum: Inheritance Future RPG

- `/inheritance` presents Eternum: Inheritance as a planned future story-driven fantasy RPG connected to the EternumVTT universe.
- The page explains the living lore pipeline: VTT campaigns -> campaign lore -> curated canon -> game world -> Eternum: Inheritance.
- Campaign content is not automatically canon. Any future lore contribution should be opt-in, reviewed, curated, adapted, and credited where appropriate.
- The page positions EternumVTT as the current priority and foundation for future game lore, mechanics, factions, characters, artifacts, regions, and conflicts.
- Donations remain separate from subscriptions and do not grant premium access. Founder lifetime access remains a separate pricing path.

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

Recent passes added `CampaignSession`, `ActivityLog`, `CampaignNote`, `CharacterMilestone`, `Map`, `MapImage`, `MapTag`, `MapLayer`, `MapToken`, `CombatEncounter`, `InitiativeEntry`, `SubscriptionPlan`, `UserSubscription`, `BillingEvent`, `AIUsage`, `User.isFounder`, `User.founderSince`, `Map.sourceType`, `Map.blueprintVersion`, `Map.editorState`, `AssistantThread`, `AssistantMessage`, `AssistantWorkflow`, `SrdSource`, `SrdEntry`, `CharacterWallet`, `PartyTreasury`, and `CurrencyTransaction`. Run `npm run db:push` before testing sessions, notes, activity feeds, milestones, public maps, subscription placeholders, founder access, AI usage tracking, editable map builder features, unified assistant features, SRD cache features, or currency wallets locally.

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
- [x] Session-aware authenticated account menu
- [x] Logged-out Sign In/Create Account nav state
- [x] Mobile hamburger drawer shell
- [x] Mobile drawer solid panel/backdrop readability fix
- [x] Logged-in mobile app shell
- [x] Removed mobile bottom nav overlap
- [x] Global mobile overflow and safe-area hardening
- [x] Chrome-emulated iPhone 17 mobile QA
- [x] Homepage demo character card mobile fix
- [x] Full-screen mobile drawer backdrop verification
- [x] Player-safe campaign workspace visibility
- [x] Full repository audit pass
- [x] Root AGENTS.md project guidance
- [x] Server-side redirect from `/`, `/login`, and `/register` for authenticated users
- [x] Separate public/auth/app route-group layouts
- [x] Public shell no longer wraps dashboard routes
- [x] Subtle global Obsidian Systems LLC footer branding
- [x] Verification gates for campaign creation and public publishing
- [x] Dashboard route protection
- [x] Campaign CRUD foundation
- [x] Multi-role campaign membership schema
- [x] Invite token creation and acceptance foundation
- [x] Invite landing page
- [x] Campaign member role editing
- [x] Final DM role safety protection
- [x] Character creation foundation
- [x] Guided classless character creator route
- [x] SRD/Open5e species API foundation
- [x] Public library SRD/Open5e source section
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
- [x] Public library safe Prisma query and friendly error fallback
- [x] Pricing page foundation
- [x] Subscription plan/user subscription/billing event schema foundation
- [x] Subscription feature gate service foundation
- [x] Founder/max-tier schema fields
- [x] Founder seed/update script
- [x] Server-side founder/subscription gates for DM tools, campaign creation, advanced AI, and public publishing
- [x] Founder debug script
- [x] Founder subscriptions with database-stored lifetime source
- [x] Square sandbox/production config helper
- [x] Square checkout route and pricing buttons
- [x] Square webhook route with signature verification
- [x] Marketplace purchase and entitlement schema foundation
- [x] AI usage tracking schema and route increments
- [x] Display-name-to-username autofill and reset behavior
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
- [x] AI map generation data model foundation
- [x] Public map library page and safe search filters
- [x] Public map clone/import API foundation
- [x] Top-down VTT map prompt templates
- [x] Editable map builder routes
- [x] AI map blueprint route
- [x] Map blueprint validation and layer conversion utilities
- [x] Structured SVG map renderer foundation
- [x] Map editor Phase 2 selection, movement, resizing, rotation, layers, history, zoom, and visual styling
- [x] Full-screen map editor sandbox shell
- [x] Canvas wheel zoom capture without page scroll
- [x] Reliable map object pointer-capture dragging
- [x] Unified assistant schema for threads, messages, and workflows
- [x] Persistent dashboard assistant launcher
- [x] Assistant workspace route
- [x] Assistant intent routing and workflow draft persistence
- [x] Production-style assistant panel with shortcuts, context cards, and workflow cards
- [x] Assistant large-message validation and model input compaction
- [x] NPC roleplay, voice, transcript, loot, handout, and pending-update schema foundations
- [x] Provider-agnostic voice service foundation
- [x] DM-gated transcript import/correction API foundations
- [x] DM-gated manual loot event API foundation
- [x] Currency conversion helpers
- [x] Character wallet schema and display cards
- [x] Party treasury and currency transaction schema foundation
- [x] Currency transfer and split API foundations
- [x] Crafted item pricing rules service and API
- [x] True campaign dashboard route
- [x] Campaign gameplay loop dashboard polish
- [x] Campaign Manager vs Play Campaign entry points
- [x] Campaign player/live VTT foundation route
- [x] Internal scroll limits for dice rolls and activity feeds
- [x] Maps foundation UI polish
- [x] Logged-in workspace redesign
- [x] Dashboard workspace navigation
- [x] Mobile app drawer navigation
- [x] Dashboard overview quick actions and summary cards
- [x] Account workspace route
- [x] Founder badge UI on account/menu/dashboard
- [x] Homebrew workspace route
- [x] Spell builder entry route
- [x] Item builder entry route
- [x] Maps workspace route
- [x] Campaign workspace summary sections
- [x] Character workspace summary cards
- [x] Gameplay infrastructure tests
- [x] Username autofill and map prompt utility tests
- [x] Server-side dice roll foundation
- [x] Dice roll UI and visibility filtering foundation
- [x] DM reveal foundation for hidden rolls
- [x] Mobile-first responsiveness pass
- [x] Mana, stamina, spell tier, infusion, profession, and discipline rules modules
- [x] OpenAI integration foundation
- [x] Open5e SRD integration foundation
- [x] Public pages and dashboard shells
- [x] Public homepage conversion redesign
- [x] Expanded Vision/About page
- [x] Eternum: Inheritance future RPG public page
- [x] Public nav and footer monetization links
- [x] Global public search foundation
- [x] Readable SRD/Open5e public library cards
- [x] Founder lifetime checkout foundation
- [x] Public Square donation page and route
- [x] Launch-prep Privacy and Terms pages
- [x] README tracker

### In Progress

- [ ] Campaign invite email delivery
- [ ] Rich spellbook and item detail editors
- [ ] Advanced homebrew balance validation
- [ ] Realtime transport behind event bus
- [ ] Rich markdown editor and sanitization for notes
- [ ] Route-level database tests for session/activity APIs
- [ ] Assistant workflow conversion into saved homebrew/character/map records
- [ ] Assistant submit-to-DM-review controls
- [ ] Assistant campaign memory retrieval
- [ ] NPC roleplay editor and DM approval controls
- [ ] Live voice provider integration
- [ ] Session listener consent UI and live transcript feed
- [ ] Loot claim and pending inventory update queue UI
- [ ] Character creator portrait upload and richer SRD trait application
- [ ] SRD cache import/refresh scripts
- [ ] Party treasury management UI
- [ ] Currency transfer/split UI
- [ ] Rich map editor snap controls, asset palettes, export, and advanced layer tooling
- [ ] AI map image generation and Blob save pipeline
- [ ] Campaign UI for public map clone/import
- [ ] Square production credential setup and live checkout verification
- [ ] Full Square subscription lifecycle reconciliation
- [ ] Active route highlighting for workspace navigation
- [ ] Editable account profile settings
- [ ] Richer notification inbox/details
- [ ] Dedicated DM tools landing pages
- [ ] Optional public shell for invite and email verification standalone routes

### Planned

- [ ] Session notes editor
- [ ] Session transcript import/listener foundation
- [ ] Speaker assignment and voice profile foundation
- [ ] NPC profile and roleplay mode
- [ ] Monster creator and statblock balancing
- [ ] Campaign memory summaries and retrieval
- [ ] Subscription billing portal
- [ ] Subscription enforcement policy
- [ ] AI-generated top-down map images
- [ ] Uploaded map image attachment UI
- [ ] Map approval/publication workflow UI
- [ ] Discord integration
- [ ] Full VTT token/map rendering
- [ ] Dynamic lighting
- [ ] Realtime dice/activity updates
- [ ] Auth validation test suite
- [ ] Homebrew workflow test suite
- [ ] Rules engine test suite
- [ ] Homebrew item image generation support
- [ ] Vercel deployment verification
