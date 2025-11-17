import { Handler, HandlerEvent } from '@netlify/functions';
import Exa from 'exa-js';

const exa = new Exa(process.env.EXA_API_KEY);

interface SearchRequest {
  query: string;
  type?: 'neural' | 'keyword' | 'auto';
  numResults?: number;
  useAutoprompt?: boolean;
  category?: string;
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS
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
      query,
      type = 'auto',
      numResults = 10,
      useAutoprompt = true,
      category
    }: SearchRequest = JSON.parse(event.body || '{}');

    if (!query) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({ error: 'Query is required' }),
      };
    }

    // Exa search with contents (parsed HTML)
    const searchResults = await exa.searchAndContents(query, {
      type,
      numResults,
      useAutoprompt,
      text: {
        maxCharacters: 1000, // Get first 1000 chars of content
        includeHtmlTags: false,
      },
    });

    // Transform results for frontend
    const results = searchResults.results.map(result => ({
      id: result.id,
      title: result.title,
      url: result.url,
      publishedDate: result.publishedDate,
      author: result.author,
      score: result.score,
      text: result.text,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800', // Cache for 30 min
      } as Record<string, string>,
      body: JSON.stringify({
        results,
        total: results.length,
        query,
      }),
    };
  } catch (error) {
    console.error('Exa search error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: JSON.stringify({
        error: 'Failed to search with Exa',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
