import { Handler, HandlerEvent } from '@netlify/functions';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['description', 'content:encoded', 'pubDate'],
  },
});

interface FeedSource {
  url: string;
  source: string;
  category: string;
}

const RSS_FEEDS: FeedSource[] = [
  // AI & Machine Learning
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News', category: 'Tech' },
  { url: 'https://www.reddit.com/r/MachineLearning/.rss', source: 'Reddit ML', category: 'AI' },
  { url: 'https://www.reddit.com/r/artificial/.rss', source: 'Reddit AI', category: 'AI' },
  
  // Web Development
  { url: 'https://dev.to/feed', source: 'Dev.to', category: 'Web Dev' },
  {url: 'https://isyedrayan.online/', source:'isyedrayan.online', category:'AI'},
  { url: 'https://www.reddit.com/r/webdev/.rss', source: 'Reddit WebDev', category: 'Web Dev' },
  
  // General Tech
  { url: 'https://www.reddit.com/r/programming/.rss', source: 'Reddit Programming', category: 'Tech' },
  { url: 'https://news.ycombinator.com/rss', source: 'Hacker News', category: 'Tech' },
];

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      } as Record<string, string>,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' } as Record<string, string>,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const category = event.queryStringParameters?.category || 'all';
    const limit = parseInt(event.queryStringParameters?.limit || '20');

    // Filter feeds by category
    const feedsToFetch = category === 'all' 
      ? RSS_FEEDS 
      : RSS_FEEDS.filter(f => f.category.toLowerCase() === category.toLowerCase());

    // Fetch all feeds in parallel
    const feedPromises = feedsToFetch.map(async (feedSource) => {
      try {
        const feed = await parser.parseURL(feedSource.url);
        return feed.items.map(item => ({
          id: item.guid || item.link,
          title: item.title || 'Untitled',
          description: item.contentSnippet || item.description || '',
          url: item.link || '',
          source: feedSource.source,
          category: feedSource.category,
          published_at: item.pubDate || item.isoDate || new Date().toISOString(),
        }));
      } catch (error) {
        console.error(`Error fetching feed from ${feedSource.source}:`, error);
        return [];
      }
    });

    const allFeeds = await Promise.all(feedPromises);
    const allItems = allFeeds.flat();

    // Sort by published date (newest first)
    allItems.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA;
    });

    // Limit results
    const limitedItems = allItems.slice(0, limit);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: JSON.stringify({
        items: limitedItems,
        total: limitedItems.length,
        category,
      }),
    };
  } catch (error) {
    console.error('Discover feed error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch discover feed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
