import { createClient, getUser } from '@/lib/supabase/server';
import { buildSystemPrompt, fetchUserContext } from '@/lib/ai/perplexity';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY || '',
  baseURL: 'https://api.perplexity.ai',
});

export async function POST(req: Request) {
  try {
    // Check if API key is configured
    if (!process.env.PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'AI service is not configured. Please add PERPLEXITY_API_KEY to your environment variables.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Authenticate user
    const user = await getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Rate limit: 10 requests per 60 seconds per user
    const { success: withinLimit } = rateLimit(`ai:${user.id}`, 10, 60_000);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch user's learning context
    const supabase = await createClient();
    let userContext;

    try {
      userContext = await fetchUserContext(supabase, user.id);
    } catch (error) {
      console.error('Error fetching user context:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user learning profile' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has any courses to work with
    if (userContext.enrolledCourses.length === 0 && userContext.availableCourses.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No courses found in the catalog. Please contact support.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Build system prompt with user context
    const systemPrompt = buildSystemPrompt(userContext);

    // Create streaming response
    const result = await streamText({
      model: perplexity.chat('sonar'),
      system: systemPrompt,
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI Learning Path Error:', error);

    // Handle rate limiting
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again in a moment.',
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
