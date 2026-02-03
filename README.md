# CodeCampus

CodeCampus is a comprehensive platform for students and learners, acting as a course aggregator that scrapes, organizes, and tracks university course data from top institutions like CMU, MIT, Stanford, and UC Berkeley, while also providing tools for personal study planning and progress tracking.

## Features

- **Course Aggregation**: Scrapes and centralizes course data from multiple world-class universities
- **Course Categorization**: Organizes courses into relevant fields and subjects
- **User Enrollment**: Allows authenticated users to enroll in courses of interest
- **Progress Tracking**: Track personal progress (0-100%), status, GPA, and scores
- **Study Planning**: Create detailed, recurring study plans with schedules and locations
- **Study Logging**: Log individual study sessions and mark them as completed
- **Study Calendar**: Visual calendar view of scheduled study sessions
- **Email Reminders**: Daily study reminder emails via Resend
- **PWA Support**: Install as a native app on mobile/desktop with offline support
- **Passwordless Auth**: Secure login via Supabase Magic Link

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link / OTP)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Email**: [Resend](https://resend.com/)
- **Scraping**: [Cheerio](https://cheerio.js.org/) & [Undici](https://undici.nodejs.org/)
- **Monitoring**: [Sentry](https://sentry.io/)

## Project Structure

```
src/
├── app/                    # Next.js routes and API endpoints
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── api/                # API routes
│   └── auth/               # Auth callback
├── components/             # React components
├── lib/                    # Utilities and services
│   ├── scrapers/           # University scrapers
│   └── supabase/           # Supabase client
└── scripts/                # Utility scripts

supabase/
├── config.toml             # Local Supabase config
├── migrations/             # Database migrations
├── seed.sql                # Seed data
└── templates/              # Email templates

public/
├── icons/                  # PWA icons
├── manifest.json           # PWA manifest
└── sw.js                   # Service worker
```

## Getting Started

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)
- Docker (required by Supabase CLI)

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/code-campus.git
cd code-campus
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

### 3. Local Supabase Setup

Start the local Supabase instance:

```bash
npm run supabase:start
```

This will start:
- **API**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323 (Database UI)
- **Inbucket**: http://127.0.0.1:54324 (Email testing)

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Login

1. Go to http://localhost:3000/login
2. Enter any email (e.g., `test@example.com`)
3. Open Inbucket at http://127.0.0.1:54324
4. Click the magic link in the email

### 6. Seed Test Data (Optional)

After logging in, get your user ID and seed data:

```sql
-- In Supabase Studio SQL Editor (http://127.0.0.1:54323)
SELECT id FROM auth.users;
SELECT seed_user_data('YOUR-USER-ID-HERE');
```

## Scripts

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run scrape` | Run course scrapers |
| `npm run categorize` | Categorize courses by field |
| `npm run supabase:start` | Start local Supabase |
| `npm run supabase:stop` | Stop local Supabase |
| `npm run supabase:reset` | Reset local database |
| `npm run generate:icons` | Generate PWA icons |

## Production Deployment

### Environment Variables

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com

# Sentry (Optional)
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

## Authentication Flow

1. User enters email in the login form
2. Supabase sends a magic link to the user's email
3. User clicks the link
4. Callback at `/auth/callback` exchanges code for session
5. User is redirected to the dashboard

## PWA Support

CodeCampus is a Progressive Web App:

- **Installable**: Add to home screen on mobile/desktop
- **Offline**: Cached pages work without internet
- **Fast**: Service worker caches assets

To install, look for "Add to Home Screen" or the install icon in your browser.

## License

MIT
