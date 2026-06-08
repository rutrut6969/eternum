# AGENTS.md

## Project Overview

Eternum Tabletop is an AI-assisted D&D-compatible VTT and campaign manager using custom Eternum rules layered on top of SRD/Open5e-style data. It supports players, DMs, campaign management, character-owned gameplay data, mana/stamina rules, AI-assisted drafting, rules-engine validation, DM approval workflows, public homebrew, and a growing VTT map foundation.

## Core Architecture Rule

AI Suggestion -> Rules Engine Calculation -> DM Approval -> Saved Content

AI can assist creativity, but the in-house rules engine owns final numbers, costs, tiers, balance warnings, and mechanical shape. Nothing AI-generated or homebrew becomes campaign-usable until a DM approves it.

## Stack

- Next.js App Router
- React
- TypeScript
- TailwindCSS
- Prisma
- PostgreSQL
- NextAuth
- OpenAI API
- Open5e / SRD integrations
- Vercel
- Vercel Blob

## Development Rules

- Keep the public marketing/rules site and logged-in app shell visually and structurally separate.
- Mobile-first design is mandatory for every page, card, form, drawer, dashboard, and editor.
- Never expose secrets and never commit `.env` files.
- Never rely only on frontend authorization.
- DM-only actions require server-side campaign membership checks.
- `/dashboard/campaigns` should stay a campaign launcher/index. Full campaign management belongs in `/dashboard/campaigns/[campaignId]`.
- A campaign workspace should expose Overview, Sessions, Characters, Members, Invites, Approvals, Dice, Notes, Maps/VTT, Homebrew, Enabled Content, and Settings as local sections or routes.
- Character-owned gameplay data must stay tied to `Character` records.
- Character creation is classless/archetype-based. Do not make traditional D&D class a required core identity; use training focus, professions, disciplines, and attributes instead.
- Currency math must use copper pieces as the internal base unit. UI can display CP/SP/EP/GP/PP, but services and audits should store copper totals.
- User account data must stay separate from character, campaign, and session gameplay data.
- AI can suggest content, but the rules engine owns all mechanical numbers.
- DM approval is required before AI or homebrew content becomes usable in a campaign.
- Public library queries must only show approved public content.
- Founder tier is the highest access tier and should pass all subscription gates.
- Founder access must be stored in the database with `User.isFounder` and an active `FOUNDER` subscription. `FOUNDER_ACCOUNTS` alone does not update existing users until `npm run seed:founders` runs against the target database.
- Founder accounts bypass all current premium gates. Existing founders can be promoted with `npm run seed:founders`; new supporters may purchase Founder lifetime access through Square checkout when billing is configured.
- Free users should not see DM tools unless they are DMs or Assistant DMs in a campaign.
- Do not implement payment processing, Discord, full VTT combat, dynamic lighting, or AI image generation unless explicitly requested.
- Square credentials must stay server-only. Use `SQUARE_ENVIRONMENT=sandbox|production` and the matching sandbox/production token/application/location/webhook variables.
- Public donations must remain separate from subscription state and must not grant premium access.
- Eternum: Inheritance is a planned future RPG concept, not a promised release. Use cautious language such as "may inspire", "planned future project", "opt-in", "reviewed", and "curated"; never promise automatic canon inclusion or a release date.
- The map builder may be inspired by the broad category of sketch-style tabletop map editors, but must not copy Dungeon Scrawl code, branding, UI, interaction design, or assets.
- Structured editable map data is preferred over flat map images. Rooms, corridors, terrain, notes, spawn points, and secrets should remain editable through `MapLayer.data`.
- AI map generation should produce validated map blueprints before any data is saved. AI image generation is separate and should not replace editable blueprint data.
- Hybrid map workflows are expected: AI drafts structure, the DM edits manually, uploaded images can act as reference/base visuals, and publication still follows approval rules.
- The unified assistant is a routing and drafting layer. It can store threads, messages, and workflow drafts, but it must not directly make content campaign-usable.
- Assistant-created spells, items, NPCs, monsters, maps, quests, compendiums, and rules suggestions must still flow through validation, rules-engine calculation where relevant, and DM approval.
- Assistant UX should feel like Eternum's campaign operating system: persistent, threaded, workflow-oriented, mobile-friendly, and capable of long-form character, lore, map, NPC, monster, item, spell, quest, rules, loot, and memory workflows.
- Large assistant inputs must be validated, stored safely, and condensed before model calls. Never send empty assistant messages or malformed tool/assistant content to OpenAI.
- NPC roleplay is draft-first. The DM controls approval, edits, hidden instructions, auto-send policy, and pause/disable behavior. NPC AI must not reveal secrets or hidden DM info unless the DM explicitly directs it.
- Voice features must stay provider-agnostic behind `voiceService` style helpers for transcription, speech, previews, NPC voice creation, and assignment. Text-only fallback is required.
- Live session listening is consent-first: DM starts it explicitly, players see a listening indicator, transcripts can be edited/deleted, and game-state changes create pending updates.
- SRD/Open5e content must remain visibly separate from homebrew and must be limited to SRD/Creative Commons/Open5e-compatible source data. Do not import proprietary non-SRD WOTC content.
- Public SRD/Open5e library pages should format data into readable sections and source labels instead of dumping raw API payloads.
- Loot, currency, inventory, and session-memory updates detected from AI/listeners must create pending records for DM approval by default.
- Crafted item prices must be calculated by rules services in copper, with AI limited to explanation/flavor.

## UI Rules

- Avoid giant glow borders and neon-box styling.
- Keep the dark fantasy / arcane-tech identity with restrained gold, violet, mana-blue, crimson, and stamina accents.
- Use subtle borders, shadows, and accent lines.
- Mobile headers must be compact, single-row, and readable.
- Use a hamburger drawer on mobile with a solid dark panel, backdrop overlay, high z-index, safe-area padding, and vertical tap targets.
- Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` where fixed or drawer UI touches screen edges.
- Prevent horizontal overflow on all public and dashboard pages.
- CTA buttons should not wrap awkwardly on 390px, 430px, or 768px widths.
- Cards should scale down gracefully and avoid desktop-only multi-column assumptions.
- Campaign workspace navigation should be mobile-friendly, using horizontal scroll tabs or a compact selector instead of forcing desktop tabs onto small screens.
- Maps/VTT controls should be visible from the campaign workspace even while full VTT rendering, combat automation, fog, lighting, and player view remain future work.
- Campaign cards should distinguish prep/admin manager entry points from live play/VTT entry points.
- Dice logs, activity feeds, approvals, notifications, and session logs should use internal scroll regions after a short visible list so pages do not grow without bound.
- Handouts and player notes should be designed as live-table objects with visibility controls rather than loose public text.

## Testing Rules

- Run `npm run build` before completing a meaningful implementation pass.
- Run tests when available with `npm test`.
- Run Prisma generation or database sync commands when schema changes require them.
- Update `README.md` after meaningful changes.
- Commit meaningful milestones with clear messages.
- Push after a successful commit when the remote is configured.

## Current Priorities

- Mobile UX polish
- Dashboard discoverability
- Session and gameplay loop
- VTT map foundation
- Editable map builder and AI blueprint workflow
- Unified assistant workflow foundation
- Classless character creator and SRD data integration
- Character wallets, party treasury, and currency audit foundation
- Activity feeds and timelines
- Campaign player/VTT mode
- NPC roleplay, session listener, and campaign memory foundations
- Future Square subscriptions
- Future Discord integration
- Future AI map/image generation
