import { Handler, HandlerEvent } from '@netlify/functions';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface OrchestrationRequest {
  message: string;
  context?: {
    hasActiveProject?: boolean;
    recentTopics?: string[];
    conversationLength?: number;
  };
}

interface OrchestrationResponse {
  intent: 'casual_chat' | 'project_creation' | 'roadmap_request' | 'resource_search' | 'deep_learning' | 'explanation';
  confidence: number;
  suggestedAction: {
    type: 'respond' | 'create_project' | 'generate_roadmap' | 'gather_resources' | 'deep_dive' | 'generate_visual';
    parameters?: Record<string, any>;
  };
  reasoning: string;
}

/**
 * AI Orchestrator - Detects user intent and routes to appropriate workflow
 * 
 * This is the brain of MindCoach that decides:
 * - Is this casual chat or serious learning?
 * - Should we create a project?
 * - Do they need a roadmap?
 * - Should we gather resources?
 * - Do they want deep explanations?
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
    // Validate environment
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } as Record<string, string>,
        body: JSON.stringify({ error: 'API configuration error' }),
      };
    }

    const { message, context }: OrchestrationRequest = JSON.parse(event.body || '{}');

    if (!message) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Use Groq's function calling to detect intent with retry logic
    let completion;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Best for function calling
      messages: [
        {
          role: 'system',
          content: `You are MindCoach's intent detection system. Analyze user messages and determine their learning intent.

Context awareness:
- hasActiveProject: ${context?.hasActiveProject || false}
- conversationLength: ${context?.conversationLength || 0}
- recentTopics: ${context?.recentTopics?.join(', ') || 'none'}

Intent Categories:
1. **casual_chat**: General questions, quick facts, simple explanations
2. **project_creation**: User wants structured learning path (keywords: "learn", "master", "become", "career", "project")
3. **roadmap_request**: User wants step-by-step learning plan (keywords: "roadmap", "steps", "path", "guide", "how do I learn")
4. **resource_search**: User needs courses, tutorials, articles (keywords: "recommend", "resources", "courses", "tutorials")
5. **deep_learning**: User wants comprehensive understanding (keywords: "explain deeply", "understand", "how does", "why")
6. **explanation**: User wants concept explained simply (keywords: "what is", "explain", "ELI5")
7. **visual_explanation**: User wants diagrams, flowcharts, mind maps (keywords: "show diagram", "flowchart", "visualize structure", "architecture")
8. **comparison**: User wants to compare concepts with charts (keywords: "difference", "compare", "vs", "versus", "over")
9. **image_generation**: User wants AI-generated images/illustrations (keywords: "generate image", "create picture", "draw", "illustrate", "show me visually")

Return your analysis as a structured decision.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      functions: [
        {
          name: 'detect_intent',
          description: 'Detect the user\'s learning intent and suggest appropriate action',
          parameters: {
            type: 'object',
            properties: {
              intent: {
                type: 'string',
                enum: ['casual_chat', 'project_creation', 'roadmap_request', 'resource_search', 'deep_learning', 'explanation', 'visual_explanation', 'comparison', 'image_generation'],
                description: 'The detected intent category',
              },
              confidence: {
                type: 'number',
                description: 'Confidence score between 0 and 1',
              },
              reasoning: {
                type: 'string',
                description: 'Brief explanation of why this intent was chosen',
              },
              extractedTopic: {
                type: 'string',
                description: 'The main topic/skill the user wants to learn (if applicable)',
              },
              suggestedProjectTitle: {
                type: 'string',
                description: 'Suggested project title if intent is project_creation',
              },
            },
            required: ['intent', 'confidence', 'reasoning'],
          },
        },
      ],
      function_call: { name: 'detect_intent' },
      temperature: 0.3, // Low temperature for consistent intent detection
    });
        break; // Success
      } catch (apiError) {
        lastError = apiError;
        retries--;
        console.error(`Orchestrate API failed, retries left: ${retries}`, apiError);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!completion) {
      throw new Error(`Orchestration failed after retries: ${lastError instanceof Error ? lastError.message : 'Unknown'}`);
    }

    const functionCall = completion.choices[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      // Fallback to casual chat
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } as Record<string, string>,
        body: JSON.stringify({
          intent: 'casual_chat',
          confidence: 0.5,
          suggestedAction: {
            type: 'respond',
          },
          reasoning: 'Could not determine intent, defaulting to casual chat',
        }),
      };
    }

    const intentData = JSON.parse(functionCall.arguments);

    // Map intent to action
    const actionMap: Record<string, OrchestrationResponse['suggestedAction']> = {
      casual_chat: { type: 'respond' },
      project_creation: {
        type: 'create_project',
        parameters: {
          title: intentData.suggestedProjectTitle || intentData.extractedTopic,
          topic: intentData.extractedTopic,
        },
      },
      roadmap_request: {
        type: 'generate_roadmap',
        parameters: {
          topic: intentData.extractedTopic,
        },
      },
      resource_search: {
        type: 'gather_resources',
        parameters: {
          topic: intentData.extractedTopic,
          searchQuery: message,
        },
      },
      deep_learning: {
        type: 'deep_dive',
        parameters: {
          topic: intentData.extractedTopic,
          useReasoning: true,
        },
      },
      explanation: {
        type: 'respond',
        parameters: {
          useVisuals: false,
          simplify: true,
        },
      },
      visual_explanation: {
        type: 'generate_visual',
        parameters: {
          topic: intentData.extractedTopic,
          visualType: 'diagram',
          query: message,
        },
      },
      comparison: {
        type: 'generate_visual',
        parameters: {
          topic: intentData.extractedTopic,
          visualType: 'comparison',
          query: message,
        },
      },
      image_generation: {
        type: 'generate_visual',
        parameters: {
          topic: intentData.extractedTopic,
          visualType: 'ai-image',
          query: message,
        },
      },
    };

    const response: OrchestrationResponse = {
      intent: intentData.intent,
      confidence: intentData.confidence,
      suggestedAction: actionMap[intentData.intent] || { type: 'respond' },
      reasoning: intentData.reasoning,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache', // Intent detection should be real-time
      } as Record<string, string>,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Orchestration error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: JSON.stringify({
        error: 'Failed to detect intent',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
