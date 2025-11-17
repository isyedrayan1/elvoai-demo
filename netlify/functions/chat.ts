import { Handler, HandlerEvent } from '@netlify/functions';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  chatId?: string;
  useReasoning?: boolean;
  stream?: boolean;
  context?: {
    projectId?: string;
    milestoneId?: string;
    weakAreas?: string[];
  };
}

// Detect if query needs reasoning (DeepSeek R1) vs conversational (Groq)
function needsReasoning(userMessage: string): boolean {
  const reasoningKeywords = [
    'why', 'how does', 'explain', 'prove', 'what is the reason',
    'step by step', 'walk me through', 'understand', 'deep dive',
    'technical explanation', 'compare', 'difference between'
  ];
  
  const lowerMessage = userMessage.toLowerCase();
  return reasoningKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Detect agent type based on context and message content
function detectAgent(context: any, messages: any[]): 'general' | 'consultation' | 'project' | 'discovery' {
  // Check if in project context
  if (context?.projectId) {
    return 'project';
  }

  // Check last few messages for intent
  const recentMessages = messages.slice(-3).map((m: any) => m.content.toLowerCase()).join(' ');
  
  // Consultation agent: project creation, roadmap planning
  const consultationKeywords = [
    'create project', 'new project', 'learn', 'roadmap', 'plan',
    'want to learn', 'help me learn', 'study plan', 'learning path'
  ];
  if (consultationKeywords.some(kw => recentMessages.includes(kw))) {
    return 'consultation';
  }

  // Discovery agent: trends, news, industry updates
  const discoveryKeywords = [
    'trend', 'latest', 'news', 'what\'s new', 'industry', 
    'popular', 'best practices', 'tools', 'discover'
  ];
  if (discoveryKeywords.some(kw => recentMessages.includes(kw))) {
    return 'discovery';
  }

  // Default to general agent
  return 'general';
}

// Get system prompt for each agent type
function getAgentPrompt(agentType: 'general' | 'consultation' | 'project' | 'discovery', shouldUseReasoning: boolean): string {
  const basePrompts = {
    general: `You are MindCoach, an AI learning assistant focused on deep understanding, not just facts. 

Your approach:
- Explain concepts visually and with analogies
- Check understanding with questions
- Connect to real-world applications
- Adapt explanations to user's level
- Encourage active learning

When explaining:
1. Start with the simplest mental model
2. Build complexity gradually
3. Use concrete examples before abstract concepts
4. Relate to things the user already knows`,

    consultation: `You are MindCoach's Consultation Agent - a diagnostic AI that helps users discover and plan their learning journey.

Your role:
- Ask thoughtful questions to understand their goals, background, and learning style
- Diagnose their current knowledge level and learning needs
- Suggest personalized learning paths and project ideas
- Be conversational and encouraging, not robotic
- Once you understand their needs, help them create a structured learning project

Conversation Flow:
1. Ask about their learning goal (what they want to learn/achieve)
2. Understand their background (current knowledge level)
3. Discover their motivation (why this matters to them)
4. Suggest a tailored learning path
5. When ready, help them create a project with clear milestones

Keep it natural - like talking to a learning coach, not filling out a form.`,

    project: `You are MindCoach's Project Agent - an AI companion within a specific learning project.

Your role:
- Guide the user through their learning milestones
- Explain concepts related to their project goals
- Track their progress and weak areas
- Provide contextual help based on their current milestone
- Adapt difficulty to their demonstrated understanding

You have access to:
- Current project context and milestones
- User's weak areas and progress
- Previous conversations within this project

Be supportive, adaptive, and focused on helping them master their learning goals.`,

    discovery: `You are MindCoach's Discovery Agent - an AI that surfaces industry trends, tools, and learning opportunities.

Your role:
- Share latest trends in tech, learning methods, and industry news
- Recommend tools, resources, and best practices
- Explain emerging technologies and concepts
- Connect users to relevant learning opportunities
- Keep responses concise but informative

Stay current, practical, and focused on actionable insights.`
  };

  let prompt = basePrompts[agentType];
  
  if (shouldUseReasoning) {
    prompt += '\n\nThe user is asking a deep question. Provide a thorough, step-by-step explanation with reasoning.';
  }

  return prompt;
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
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
        body: JSON.stringify({ error: 'API configuration error. Please contact support.' }),
      };
    }

    const { messages, useReasoning, context, stream = true }: ChatRequest = JSON.parse(event.body || '{}');

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } as Record<string, string>,
        body: JSON.stringify({ error: 'Messages array is required' }),
      };
    }

    // Detect which agent to use
    const agentType = detectAgent(context, messages);
    console.log(`Using agent: ${agentType}`);

    // Use llama-3.3-70b-versatile for all requests (only working model)
    const model = 'llama-3.3-70b-versatile';
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const shouldUseReasoning = useReasoning || (lastUserMessage && needsReasoning(lastUserMessage.content));
    
    // Get agent-specific system prompt
    const systemPrompt = getAgentPrompt(agentType, shouldUseReasoning || false);
    
    // Clean messages - remove ALL frontend-only properties
    const cleanMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Retry logic for API calls
    let completion;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            ...cleanMessages,
          ],
          temperature: 0.7,
          max_tokens: 2048,
          stream: stream,
        });
        break; // Success, exit retry loop
      } catch (apiError) {
        lastError = apiError;
        retries--;
        console.error(`API call failed, retries left: ${retries}`, apiError);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }

    if (!completion) {
      throw new Error(`API call failed after retries: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
    }

    // Handle streaming vs non-streaming responses
    if (stream) {
      // Collect streaming chunks and format as SSE
      let sseResponse = '';
      try {
        // Type assertion for streaming response
        const streamingCompletion = completion as AsyncIterable<any>;
        for await (const chunk of streamingCompletion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            sseResponse += `data: ${JSON.stringify({ content })}\n\n`;
          }
        }
        // Add completion signal
        sseResponse += 'data: [DONE]\n\n';
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        throw streamError;
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        } as Record<string, string>,
        body: sseResponse,
      };
    } else {
      // Non-streaming JSON response
      const responseText = (completion as any).choices[0]?.message?.content || '';

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        } as Record<string, string>,
        body: JSON.stringify({
          response: responseText,
          model: model,
          reasoning: shouldUseReasoning,
          agent: agentType
        }),
      };
    }
  } catch (error) {
    console.error('Chat error:', error);
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to generate response. Please try again.';
    let statusCode = 500;
    
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid request format.';
      statusCode = 400;
    } else if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Service configuration error. Please contact support.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
        statusCode = 429;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try a shorter message.';
        statusCode = 504;
      }
    }
    
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
    };
  }
};
