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
 * Uses llama-3.3-70b-versatile for deep reasoning about learning progression
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
          content: `You are an expert learning path designer with 15+ years of experience in curriculum development. Create DEEP, COMPREHENSIVE roadmaps that:

**CRITICAL REQUIREMENTS:**
1. **Create AT LEAST 8-12 detailed milestones** (not just 4!)
2. **Break down complex topics** into granular, digestible steps
3. **Build progressively** - each milestone builds on the previous
4. **Include practical projects** - 70% hands-on, 30% theory
5. **Set realistic timelines** - based on ${timeframe} timeframe
6. **Align with goals** - ${goals.length > 0 ? goals.join(', ') : 'complete mastery'}

**Milestone Structure (REQUIRED for each):**
- **Clear objective**: What specific skill/knowledge you'll gain
- **Key concepts**: 3-5 core concepts to master
- **Hands-on project**: Real-world application (be specific!)
- **Success criteria**: 2-4 measurable outcomes
- **Estimated hours**: Realistic time investment
- **Prerequisites**: What you need before starting
- **Resources needed**: Tools, libraries, frameworks

**Depth Guidelines by Level:**
- **Beginner**: Start from absolute basics, explain everything, 10-15 milestones
- **Intermediate**: Assume foundational knowledge, focus on practical skills, 8-12 milestones
- **Advanced**: Deep dive into complex topics, optimization, best practices, 8-10 milestones

**Output Format (STRICT JSON):**
{
  "title": "Comprehensive Learning Path Title",
  "description": "Detailed overview of complete journey and outcomes",
  "level": "${userLevel}",
  "totalDuration": "realistic total time (e.g., '3 months at 10 hours/week')",
  "milestones": [
    {
      "id": 1,
      "title": "Specific Milestone Name",
      "objective": "Clear, measurable learning objective",
      "concepts": ["concept1", "concept2", "concept3"],
      "project": "Detailed hands-on project with specific deliverable",
      "successCriteria": ["criterion1", "criterion2", "criterion3"],
      "estimatedHours": 15,
      "prerequisites": ["prerequisite if any"],
      "duration": "1 week",
      "completed": false,
      "progress": 0,
      "status": "not-started"
    }
    // ... MINIMUM 8-12 milestones
  ],
  "diagram": "mermaid flowchart LR syntax showing learning progression"
}

**IMPORTANT**: Create a COMPLETE, PROFESSIONAL roadmap. This is a real learning journey!`,
        },
        {
          role: 'user',
          content: `Create a ${userLevel}-level learning roadmap for: ${topic}

${goals.length > 0 ? `Specific Goals: ${goals.join(', ')}` : 'Goal: Complete mastery from ${userLevel} to expert'}
Timeframe: ${timeframe}

**REQUIREMENTS:**
- Create AT LEAST 8-12 detailed, progressive milestones
- Each milestone should be actionable and specific
- Include real-world projects for each milestone
- Make it comprehensive and professional-quality
- Ensure logical progression from basics to advanced

Generate the complete roadmap now.`,
        },
      ],
      temperature: 0.8, // Higher for more creative, detailed roadmaps
      max_tokens: 8000, // Increased for comprehensive roadmaps
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
