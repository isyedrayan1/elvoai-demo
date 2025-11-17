import { Handler, HandlerEvent } from '@netlify/functions';
import Exa from 'exa-js';
import Groq from 'groq-sdk';

const exa = new Exa(process.env.EXA_API_KEY);
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ResourceRequest {
  topic: string;
  type?: 'course' | 'tutorial' | 'article' | 'video' | 'documentation' | 'all';
  level?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
}

/**
 * Resource Gatherer - AI-powered resource discovery using Exa + LLM curation
 * 
 * Flow:
 * 1. Use Exa neural search to find resources
 * 2. Use Groq to analyze and curate results
 * 3. Return structured, categorized resources
 */
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      } as Record<string, string>,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' } as Record<string, string>,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const {
      topic,
      type = 'all',
      level = 'beginner',
      limit = 10,
    }: ResourceRequest = JSON.parse(event.body || '{}');

    if (!topic) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({ error: 'Topic is required' }),
      };
    }

    // Build optimized search queries for different resource types
    const searchQueries: string[] = [];
    
    if (type === 'all' || type === 'course') {
      searchQueries.push(`best online courses for learning ${topic} ${level}`);
    }
    if (type === 'all' || type === 'tutorial') {
      searchQueries.push(`${level} ${topic} tutorials step by step`);
    }
    if (type === 'all' || type === 'article') {
      searchQueries.push(`comprehensive guide to ${topic} for ${level}s`);
    }
    if (type === 'all' || type === 'video') {
      searchQueries.push(`${topic} video course ${level} friendly`);
    }
    if (type === 'all' || type === 'documentation') {
      searchQueries.push(`${topic} official documentation and getting started`);
    }

    // Parallel searches with Exa
    const searchPromises = searchQueries.map(async (query) => {
      try {
        const results = await exa.searchAndContents(query, {
          type: 'auto',
          numResults: Math.ceil(limit / searchQueries.length),
          useAutoprompt: true,
          text: {
            maxCharacters: 500,
            includeHtmlTags: false,
          },
        });
        return results.results;
      } catch (error) {
        console.error(`Search failed for: ${query}`, error);
        return [];
      }
    });

    const allResults = (await Promise.all(searchPromises)).flat();

    if (allResults.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } as Record<string, string>,
        body: JSON.stringify({
          resources: [],
          message: 'No resources found for this topic',
        }),
      };
    }

    // Use Groq to analyze and categorize resources
    const curationCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a learning resource curator. Analyze and categorize educational resources.

For each resource:
1. Determine type (course, tutorial, article, video, documentation, book)
2. Assess quality (1-5 stars based on content depth, clarity, authority)
3. Identify difficulty level (beginner, intermediate, advanced)
4. Extract key topics covered
5. Write a concise, helpful description (1-2 sentences)
6. Note if it's free or paid

Return as structured JSON array.`,
        },
        {
          role: 'user',
          content: `Analyze these resources about "${topic}" for ${level} learners:

${allResults.slice(0, limit).map((r, i) => `
${i + 1}. ${r.title}
URL: ${r.url}
${r.text ? `Content: ${r.text.substring(0, 300)}...` : ''}
`).join('\n')}

Categorize and curate these resources. Return JSON array with structure:
{
  "resources": [
    {
      "title": "string",
      "url": "string",
      "type": "course|tutorial|article|video|documentation|book",
      "level": "beginner|intermediate|advanced",
      "quality": 1-5,
      "topics": ["topic1", "topic2"],
      "description": "1-2 sentence description",
      "isPaid": boolean,
      "platform": "platform name if identifiable"
    }
  ]
}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const curatedData = JSON.parse(curationCompletion.choices[0]?.message?.content || '{"resources":[]}');

    // Categorize by type
    const categorized = {
      courses: curatedData.resources.filter((r: any) => r.type === 'course'),
      tutorials: curatedData.resources.filter((r: any) => r.type === 'tutorial'),
      articles: curatedData.resources.filter((r: any) => r.type === 'article'),
      videos: curatedData.resources.filter((r: any) => r.type === 'video'),
      documentation: curatedData.resources.filter((r: any) => r.type === 'documentation'),
      books: curatedData.resources.filter((r: any) => r.type === 'book'),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=7200', // Cache for 2 hours
      } as Record<string, string>,
      body: JSON.stringify({
        topic,
        level,
        total: curatedData.resources.length,
        resources: curatedData.resources,
        categorized,
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Resource gathering error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: JSON.stringify({
        error: 'Failed to gather resources',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
