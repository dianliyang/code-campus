# CodeCampus

CodeCampus is a Next.js course aggregator that scrapes, aggregates, and organizes university course data from top institutions like CMU, MIT, Stanford, and UC Berkeley.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link / OTP)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Scraping**: [Cheerio](https://cheerio.js.org/) & [Undici](https://undici.nodejs.org/)
- **Runtime/Tooling**: [tsx](https://tsx.is/)

## Project Structure

- `src/app/`: Next.js application routes and API endpoints.
- `src/lib/scrapers/`: Individual university scraper implementations (CMU, MIT, Stanford, UCB).
- `src/scripts/`: Utility scripts for running scrapers and database maintenance.
- `supabase_schema.sql`: Database schema definition for Supabase.

## Getting Started

### 1. Prerequisites
- Node.js (Latest LTS recommended)
- Supabase Account and Project

### 2. Environment Variables
Create a `.env.local` file with the following variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Installation
```bash
npm install
```

### 4. Database Setup
Apply the schema in `supabase_schema.sql` using the Supabase SQL Editor.

## Key Commands

### Running Scrapers
To scrape course data and populate the database:
```bash
npm run scrape
```

### Categorizing Courses
To categorize scraped courses into fields:
```bash
npm run categorize
```

### Local Development
Start the Next.js development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## Authentication Flow

The system uses passwordless authentication via Supabase Magic Link:
1. User enters email in the login form.
2. Supabase sends a verification token/link to the user's email.
3. User clicks the link, establishing a session through `/auth/callback`.

## License
MIT
