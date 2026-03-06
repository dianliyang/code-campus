# Athena

**Architecture for your academic record.**

Athena is a professional-grade operational workspace designed for rigorous academic management. It consolidates course discovery, AI-supported planning, roadmap tracking, and execution workflows into a single, cohesive interface.

## Core Modalities

### 1. Smart Assist (AI Planning)
Athena leverages advanced LLMs (OpenAI, Gemini, Perplexity) to ingest raw course syllabi and generate structured "intelligence."
- **Data Ingestion**: Transform unstructured text into relational registry data.
- **Custom Scheduling**: Generate personalized study plans based on course workloads and your availability.
- **Bi-directional Sync**: Directly apply AI suggestions to your active roadmap and weekly calendar.

### 2. Study Path & Roadmap
A high-density visualization of your academic journey.
- **Knowledge Mastery**: Automatically calculate curriculum breadth and mastery levels.
- **Learning Identity**: Visualize your focus areas across different university modules and disciplines.
- **Progress Tracking**: Verified completion logging for courses and credits.

### 3. Study Calendar
A unified view for daily execution.
- **Recurring Sessions**: Manage weekly study blocks and recurring university logistics.
- **Task Management**: Prioritize specific course tasks and assignments.
- **Timezone Aware**: Seamlessly handle scheduling across different time zones and physical locations.

### 4. Workout Workflows
Physical balance engineered for mental performance.
- **Fitness Registry**: Discover and enroll in university sports courses and fitness sessions.
- **Integrated View**: Workouts appear in your daily routine and calendar automatically.

## Technical Architecture

Athena is built with a modern, type-safe stack:
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database/Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & Lucide Icons
- **AI Integration**: AI SDK with support for OpenAI, Vertex AI, and Perplexity models.

## Development

### Getting Started
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set up environment variables (see `.env.example`).
4. Initialize Supabase: `npm run supabase:start`.
5. Run the development server: `npm run dev`.

### Data Ingestion
Use the included scrapers to synchronize course catalogs from top institutions:
```bash
npm run scrape
```

## Contributing
Athena is designed in the pursuit of clarity. We welcome contributions that maintain high information density while engineering for ease of use.

---
© 2026 Athena Systems. Data processed locally.
