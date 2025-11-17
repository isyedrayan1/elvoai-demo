import { Handler, HandlerEvent } from '@netlify/functions';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface RoadmapRequest {
  topic: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
  goals?: string[];
}

/**
 * Roadmap Generator - Creates structured learning paths with milestones
 * 
 * Uses Qwen-3-32B for deep reasoning about learning progression
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
      userLevel = 'beginner',
      timeframe = 'month',
      goals = [],
    }: RoadmapRequest = JSON.parse(event.body || '{}');

    if (!topic) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({ error: 'Topic is required' }),
      };
    }

    // Use Llama 3.3 70B for learning path generation
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Only working model
      messages: [
        {
          role: 'system',
          content: `You are an expert learning path designer. Create comprehensive, structured roadmaps that:

1. **Break down complex topics** into digestible milestones
2. **Build progressively** - each step prepares for the next
3. **Include practical projects** - learning by doing
4. **Mix theory and practice** - 30% theory, 70% hands-on
5. **Set realistic timelines** - based on ${timeframe} timeframe
6. **Align with goals** - ${goals.length > 0 ? goals.join(', ') : 'general mastery'}

For each milestone, provide:
- Clear objective (what you'll learn)
- Key concepts to master
- Hands-on project or exercise
- Success criteria (how you know you've learned it)
- Estimated time
- Prerequisites

Output as structured JSON following this schema:
{
  "title": "Learning Path Title",
  "description": "Overview of what you'll achieve",
  "level": "${userLevel}",
  "totalDuration": "estimated total time",
  "milestones": [
    {
      "id": 1,
      "title": "Milestone name",
      "objective": "What you'll learn",
      "concepts": ["concept1", "concept2"],
      "project": "Hands-on project description",
      "successCriteria": ["criterion1", "criterion2"],
      "estimatedHours": 10,
      "prerequisites": []
    }
  ],
  "diagram": "mermaid flowchart syntax for visual roadmap"
}`,
        },
        {
          role: 'user',
          content: `Create a ${userLevel} learning roadmap for: ${topic}

${goals.length > 0 ? `Goals: ${goals.join(', ')}` : ''}
Timeframe: ${timeframe}

Generate a comprehensive, actionable roadmap.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const roadmapData = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // Auto-fetch resources for each milestone using Exa search
    if (roadmapData.milestones && Array.isArray(roadmapData.milestones)) {
      try {
        const exaApiKey = process.env.EXA_API_KEY;
        
        for (const milestone of roadmapData.milestones) {
          // Build search query for this milestone
          const searchQuery = `${topic} ${milestone.title} tutorial guide`;
          
          let resources = [];
          
          if (exaApiKey) {
            // Try to fetch from Exa
            try {
              const exaResponse = await fetch('https://api.exa.ai/search', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': exaApiKey,
                },
                body: JSON.stringify({
                  query: searchQuery,
                  num_results: 3,
                  type: 'auto',
                  category: 'tutorial',
                  use_autoprompt: true,
                }),
              });
              
              if (exaResponse.ok) {
                const exaData = await exaResponse.json();
                resources = (exaData.results || []).slice(0, 3).map((result: any) => ({
                  title: result.title || 'Resource',
                  url: result.url,
                  description: result.text || result.snippet || 'No description',
                  type: 'article',
                }));
              }
            } catch (exaError) {
              console.warn(`Exa search failed for milestone: ${milestone.title}`, exaError);
            }
          }
          
          // Fallback to curated resources if Exa failed or no API key
          if (resources.length === 0) {
            resources = generateFallbackResourcesForMilestone(topic, milestone.title);
          }
          
          // Add resources to milestone
          milestone.resources = resources;
        }
      } catch (resourceError) {
        console.error('Resource fetching error:', resourceError);
        // Continue without resources rather than failing
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      } as Record<string, string>,
      body: JSON.stringify({
        roadmap: roadmapData,
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Roadmap generation error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: JSON.stringify({
        error: 'Failed to generate roadmap',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

// Generate fallback resources when Exa API is unavailable
function generateFallbackResourcesForMilestone(topic: string, milestoneTitle: string): any[] {
  const searchQuery = `${topic} ${milestoneTitle}`;
  
  return [
    { 
      title: `${milestoneTitle} - Official Documentation`, 
      url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' official documentation')}`,
      description: `Official documentation and guides for ${milestoneTitle}`,
      type: 'documentation'
    },
    { 
      title: `${milestoneTitle} - Video Tutorial`, 
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery + ' tutorial')}`,
      description: `Video tutorials for ${milestoneTitle}`,
      type: 'video'
    },
    { 
      title: `${milestoneTitle} - Community Resources`, 
      url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' tutorial guide')}`,
      description: `Community tutorials and guides for ${milestoneTitle}`,
      type: 'article'
    },
  ];
}
