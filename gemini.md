# Gemini Context & Guidelines

## Project Overview
CodeCampus is a Next.js course aggregator. It uses Cloudflare D1 for storage and Resend for passwordless authentication.

## Technical Stack
- Framework: Next.js 16 (App Router)
- Database: Cloudflare D1 (SQLite)
- Authentication: NextAuth v5 (Auth.js) - Magic Link only
- Email: Resend
- Styling: Tailwind CSS 4

## Database Schema
The database uses a simplified structure where user identity and account details are merged:
- accounts: The primary user table. Stores email, profile info, and auth provider details.
- user_courses: Tracks course enrollments and progress linked to account IDs.
- courses: The central catalog of scraped courses.
- fields/semesters: Categorization and scheduling data.

## Authentication Flow
The system is passwordless. Users authenticate via Magic Links sent through Resend:
1. User enters email in the login form.
2. NextAuth generates a verification token.
3. Resend sends an email with a unique login URL using a stylish HTML template.
4. User clicks the link to establish a session.

## Middleware & Edge
To support Cloudflare's Edge Runtime, the auth configuration is split:
- auth.config.ts: Contains edge-compatible settings.
- auth.ts: Contains the full configuration (Adapter, Providers, etc).
- proxy.ts: The middleware file (renamed per Next.js conventions).

## Key Commands
- Initialize DB: npx wrangler d1 execute code-campus-db --local --file=./schema.sql
- Run Scrapers: npm run scrape
- Build Project: npm run build

## Workflow Rules
- **Git Protocol**: Every time a task or set of changes is finished, generate a git commit and push command. 
- **Clipboard Utility**: Use `echo "command" | pbcopy` to copy the command to the user's clipboard for easy execution.

## Environment Variables
- AUTH_SECRET: Session encryption key.
- AUTH_RESEND_KEY: Resend API key.
- EMAIL_FROM: Verified sender email address.
- DB: D1 Database binding.
