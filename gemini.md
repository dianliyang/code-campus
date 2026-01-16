# Gemini Context & Guidelines

## Project Overview

CodeCampus is a Next.js course aggregator. It uses Supabase for storage and authentication.

## Technical Stack

- Framework: Next.js 16 (App Router)
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth (Magic Link)
- Styling: Tailwind CSS 4

## Database Schema

The database uses PostgreSQL on Supabase:

- courses: The central catalog of scraped courses.
- user_courses: Tracks course enrollments and progress linked to Supabase User UUIDs.
- fields/semesters: Categorization and scheduling data.

## Authentication Flow

The system is passwordless using Supabase OTP:

1. User enters email in the login form.
2. Supabase generates a verification token.
3. User receives an email with a unique login URL.
4. User clicks the link, handled by `/auth/callback`, establishing a session.

## Middleware

- middleware.ts: Handles session refreshing and route protection via Supabase client.

## Key Commands

- Run Scrapers: npm run scrape
- Build Project: npm run build

## Workflow Rules

- **Git Protocol**: Every time a task or set of changes is finished, generate a git commit and push command.

## Environment Variables

- NEXT_PUBLIC_SUPABASE_URL: Supabase API URL.
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase public key.
- SUPABASE_SERVICE_ROLE_KEY: Supabase private key for administrative tasks (scrapers).
- NEXT_PUBLIC_SITE_URL: The base URL of the application.
