# CodeCampus

CodeCampus is a modern web application designed to scrape, aggregate, and browse university course data from top institutions like CMU, MIT, Stanford, and UC Berkeley.

## Tech Stack

- **Framework**: [Next.js 16+](https://nextjs.org/) (App Router)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite-based)
- **Scraping**: [Cheerio](https://cheerio.js.org/) & [Undici](https://undici.nodejs.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Runtime/Tooling**: [TypeScript](https://www.typescript.org/), [tsx](https://tsx.is/), [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## Project Structure

- `src/app/`: Next.js application routes and API endpoints.
- `src/lib/scrapers/`: Individual university scraper implementations (CMU, MIT, Stanford, UCB).
- `src/scripts/`: Utility scripts for running scrapers and database maintenance.
- `schema.sql`: Database schema definition for Cloudflare D1.

## Getting Started

### 1. Prerequisites
- Node.js (Latest LTS recommended)
- Cloudflare Account (for D1)

### 2. Installation
```bash
npm install
```

### 3. Database Setup
Initialize your local D1 database:
```bash
npx wrangler d1 execute code-campus-db --local --file=./schema.sql
```

## Running Scrapers

Scrapers can be run locally or against the remote production database.

### Local Scraping
This will populate your local `.wrangler/state/v3/d1` database:
```bash
npm run scrape
```

### Remote Scraping
To update the production database (requires `wrangler login`):
```bash
npm run scrape:remote
```

## Local Development

Start the Next.js development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## Authentication

The project uses [NextAuth.js](https://next-auth.js.org/) for authentication, supporting both OAuth (GitHub, Google) and Credentials (Email/Password) providers.

### Default Admin User
For local development, an admin user can be created manually in the database. The system expects passwords to be hashed using `bcryptjs`.

## Database Management

### User Management
You can manage users via Wrangler:

```bash
# List all users
npx wrangler d1 execute code-campus-db --local --command "SELECT id, email, name, provider FROM user;"

# Manually insert a user (Password must be bcrypt hashed)
npx wrangler d1 execute code-campus-db --local --command "INSERT INTO user (email, password, provider, provider_id, name) VALUES ('admin@codecampus.com', 'HASHED_PASSWORD', 'credentials', 'admin@codecampus.com', 'Admin');"
```

### Searching the Local DB
You can query your local database directly using Wrangler:

```bash
# Search for a specific course
npx wrangler d1 execute code-campus-db --local --command "SELECT * FROM courses WHERE course_code LIKE '%CS106%';"

# Count courses by university
npx wrangler d1 execute code-campus-db --local --command "SELECT university, COUNT(*) FROM courses GROUP BY university;"
```

### Debugging Script
Alternatively, use the built-in debug script:
```bash
npx tsx src/scripts/debug-db.ts
```

## API Endpoints

- `GET /api/courses`: List courses with optional filtering.
- `GET /api/universities`: List supported universities.

## License
MIT