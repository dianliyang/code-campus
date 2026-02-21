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
- **AI Learning Path**: AI-generated personalized study recommendations
- **PWA Support**: Install as a native app on mobile/desktop with offline support
- **Passwordless Auth**: Secure login via Supabase Magic Link

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link / OTP)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/) + OpenAI
- **Email**: [Resend](https://resend.com/)
- **Scraping**: [Cheerio](https://cheerio.js.org/) & [Undici](https://undici.nodejs.org/)
- **Monitoring**: [Sentry](https://sentry.io/)

## Project Structure

```
src/
├── actions/                # Next.js server actions
├── app/
│   ├── (dashboard)/        # Protected routes (auth required)
│   │   ├── courses/        # Course catalog + detail
│   │   ├── import/         # Bulk course import
│   │   ├── profile/        # User profile & stats
│   │   ├── projects-seminars/  # Projects & seminars
│   │   ├── settings/       # User settings
│   │   ├── study-plan/     # Study planner & calendar
│   │   └── workouts/       # Workout tracking
│   ├── api/
│   │   ├── ai/             # AI learning path & course description
│   │   ├── courses/        # Enrollment & import endpoints
│   │   ├── cron/           # Scheduled jobs (daily reminder)
│   │   ├── external/       # Public external API
│   │   ├── schedule/       # Study schedule management
│   │   ├── study-plans/    # Study plan CRUD
│   │   └── user/           # User account management
│   ├── auth/               # Magic link callback & verify
│   └── login/logout/offline/
├── components/
│   ├── auth/               # Login form
│   ├── common/             # Shared UI (icons, back-to-top)
│   ├── courses/            # Course detail components
│   ├── dashboard/          # Dashboard layout shell
│   ├── home/               # Course list, cards, study plan
│   ├── import/             # Import UI
│   ├── layout/             # Navbar, sidebar, tab bar
│   ├── profile/            # Profile cards & stats
│   ├── projects-seminars/  # Project/seminar components
│   ├── ui/                 # Base UI primitives (button, etc.)
│   └── workouts/           # Workout list & cards
├── data/                   # Static data files
├── dictionaries/           # i18n strings (en, zh, de)
├── lib/
│   ├── ai/                 # AI prompt helpers
│   ├── scrapers/           # University scrapers (CMU, MIT, Stanford, UCB, CAU)
│   └── supabase/           # Supabase client, server, storage helpers
├── scripts/                # One-off data migration scripts
├── tests/
│   ├── integration/        # External API integration tests
│   ├── mocks/              # Test mocks
│   └── unit/               # Component & utility unit tests
└── types/                  # TypeScript type definitions

supabase/
├── migrations/             # Database schema migrations
├── seed.sql                # Dev seed data
└── templates/              # Transactional email templates

public/
├── icons/                  # PWA icons (all sizes)
├── manifest.json           # PWA web app manifest
└── sw.js                   # Service worker
```

## Getting Started

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)
- Docker (required by Supabase CLI)

### 1. Clone and Install

```bash
git clone https://github.com/dianliyang/code-campus.git
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

Copy `.env.example` to `.env.local` and fill in the values.

**Required**

| Variable | Description |
|:---------|:------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — server only, never expose |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (e.g. `https://your-domain.com`) |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key for transactional email |
| `EMAIL_FROM` | Sender address (e.g. `noreply@your-domain.com`) |

**Optional — AI Features**

| Variable | Description |
|:---------|:------------|
| `PERPLEXITY_API_KEY` | Perplexity API key — powers AI learning path recommendations |
| `GEMINI_API_KEY` | Google Gemini API key — powers AI course categorization |

**Optional — Infrastructure**

| Variable | Description |
|:---------|:------------|
| `CRON_SECRET` | Bearer token to authenticate cron job endpoints |
| `INTERNAL_API_KEY` | API key for the public external course API (`/api/external/`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for client-side error tracking |
| `SENTRY_ORG` | Sentry org slug — used during build for source map upload |
| `SENTRY_PROJECT` | Sentry project slug — used during build for source map upload |

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

MIT — see [LICENSE](./LICENSE)
