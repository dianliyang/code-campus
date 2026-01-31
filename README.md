# CodeCampus

CodeCampus is a comprehensive platform for students and learners, acting as a course aggregator that scrapes, organizes, and tracks university course data from top institutions like CMU, MIT, Stanford, and UC Berkeley, while also providing tools for personal study planning and progress tracking.

## Features

-   **Course Aggregation**: Scrapes and centralizes course data from multiple world-class universities.
-   **Course Categorization**: Organizes courses into relevant fields and subjects.
-   **User Enrollment**: Allows authenticated users to enroll in courses of interest (`user_courses` table).
-   **Progress Tracking**: Track personal progress (0-100%), status (pending, in\_progress, completed, dropped), GPA, and scores for enrolled courses.
-   **Study Planning**: Create detailed, recurring study plans (`study_plans` table) including type (lecture, exercise, exam), start/end dates, days of the week, and specific times/locations.
-   **Study Logging**: Log individual study sessions and mark them as completed (`study_logs` table) against a plan.
-   **Course Popularity**: Tracks and increments course popularity based on user interaction (via `increment_popularity` RPC).
-   **Passwordless Authentication**: Secure login via Supabase Magic Link / OTP.

## Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
-   **Authentication**: Supabase Auth (Magic Link / OTP)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **Scraping**: [Cheerio](https://cheerio.js.org/) & [Undici](https://undici.nodejs.org/)
-   **Runtime/Tooling**: [tsx](https://tsx.is/)
-   **Dependencies**: Includes `@supabase/supabase-js`, `bcryptjs`, `nodemailer`, and `resend` for email and security functionality.

## Project Structure

-   `src/app/`: Next.js application routes and API endpoints.
-   `src/lib/scrapers/`: Individual university scraper implementations (CMU, MIT, Stanford, UCB).
-   `src/scripts/`: Utility scripts for running scrapers and database maintenance (e.g., `run-all-scrapers.ts`, `categorize-smart.ts`).
-   `supabase_schema.sql`: Complete database schema definition for Supabase, including RLS policies.

## Getting Started

### 1. Prerequisites
-   Node.js (Latest LTS recommended)
-   Supabase Account and Project
-   `git` and `gh` CLI installed.

### 2. Environment Variables
Create a `.env.local` file with the following variables:
\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 3. Installation
\`\`\`bash
npm install
\`\`\`

### 4. Database Setup
Apply the schema in `supabase_schema.sql` using the Supabase SQL Editor to provision all tables, indexes, RLS policies, and RPC functions (like `increment_popularity`).

## Key Commands

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Start the Next.js development server at `http://localhost:3000`. |
| `build` | `npm run build` | Build the Next.js production bundle. |
| `scrape` | `npm run scrape` | Run all configured scrapers to fetch course data and populate the database. |
| `categorize` | `npm run categorize` | Run smart categorization logic to assign fields to scraped courses. |
| `mock` | `npm run mock` | Run scripts to generate mock data for development. |

## Authentication Flow

The system uses passwordless authentication via Supabase Magic Link:
1. User enters email in the login form.
2. Supabase sends a verification token/link to the user's email.
3. User clicks the link, establishing a session through `/auth/callback`.

## License
MIT