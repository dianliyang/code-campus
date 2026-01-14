# Gemini Context & Guidelines

This file provides project-specific context and instructions for AI agents (like Gemini) working on the CourseSpider codebase.

## Project Overview
CodeCampus is a Next.js-based course aggregator that scrapes data from top universities and stores it in a Cloudflare D1 database.

## Technical Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Cloudflare D1 (SQLite)
- **Scraping**: Cheerio + Undici
- **Styling**: Tailwind CSS 4
- **Runtime**: Node.js / Wrangler

## Key Files & Directories
- `src/lib/scrapers/`: Core scraping logic. Each university has its own scraper class inheriting from `BaseScraper`.
- `src/lib/d1.ts`: Database abstraction layer for D1.
- `src/scripts/run-all-scrapers.ts`: Main entry point for data ingestion.
- `schema.sql`: The source of truth for the database schema.

## Database Workflow
The project uses Cloudflare D1. For local development, wrangler uses a local SQLite file.
- **Initialize Local DB**: `npx wrangler d1 execute code-campus-db --local --file=./schema.sql`
- **Query Local DB**: `npx wrangler d1 execute code-campus-db --local --command "..."`

## Coding Conventions
- **TypeScript**: Use strict typing. Avoid `any`.
- **Scrapers**: Always handle pagination and rate limiting (if applicable). Use the `BaseScraper` interface.
- **Database**: Queries should be performed through the `queryD1` utility in `src/lib/d1.ts` to maintain compatibility between local and remote environments.
- **API Routes**: Follow Next.js App Router conventions (e.g., `src/app/api/.../route.ts`).

## Workflow & Git
- **Committing Changes**: When a task or sub-task is complete, always `git add` and `git commit` your changes with a descriptive message.
- **Commit Signing**: Commits in this repository require a signature. Ensure you are aware that a signature/authentication step might be triggered during the commit process.

## Common Tasks for AI
- **Adding a Scraper**: Implement the `Scraper` interface in `src/lib/scrapers/types.ts` and create a new file in `src/lib/scrapers/`.
- **Modifying Schema**: Update `schema.sql` and provide the migration command to the user.
- **UI Updates**: Use Tailwind 4 utility classes. Components are located in `src/app/`.

## Important Note on Environment
The project expects a Cloudflare environment. Local execution of database-related scripts requires the `--local` flag with wrangler or setting up the appropriate D1 binding mocks.
