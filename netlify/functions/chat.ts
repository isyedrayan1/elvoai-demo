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

// Get system prompt for each agent type with context awareness
function getAgentPrompt(agentType: 'general' | 'consultation' | 'project' | 'discovery', shouldUseReasoning: boolean, context?: any): string {
  // Extract context information
  const chatHistory = context?.recentMessages || [];
  const lastTopic = context?.lastTopic || '';
  const conversationLength = context?.conversationLength || 0;
  const isOngoing = conversationLength > 2;
  
  const basePrompts = {
    general: `You are MindCoach, an AI learning assistant focused on deep understanding and meaningful conversations.

**CONTEXT AWARENESS** (CRITICAL):
${isOngoing ? `- This is an ongoing conversation (${conversationLength} messages)` : '- This is a new conversation'}
${lastTopic ? `- Recent topic: ${lastTopic}` : '- No previous context'}
${chatHistory.length > 0 ? `- Chat history available: Use it to maintain continuity and remember what the user asked before` : ''}

**YOUR BEHAVIOR:**
- **Reference previous messages** when relevant ("As we discussed earlier...", "Building on your question about...")
- **Maintain conversation flow** - don't repeat information already covered
- **Be contextually aware** - if user asks "tell me more", know what "more" refers to
- **Follow up intelligently** - ask clarifying questions based on conversation history
- **Connect concepts** - relate new topics to previously discussed ones
- **Remember user preferences** shown in chat (learning style, interests, goals)

**CRITICAL: Format ALL responses using Markdown for better readability:**
- Use **bold** for key terms and important points
- Use *italics* for emphasis
- Use \`code\` for technical terms, commands, or syntax
- Use headings (##, ###) to structure longer explanations
- Use bullet points for lists
- Use numbered lists for steps or sequences
- Use > for important notes or quotes
- Break content into short, digestible paragraphs

**Your personality:**
- Warm, enthusiastic, and encouraging
- Natural and conversational (not robotic)
- Adapt to the user's energy and context
- Use emojis sparingly but appropriately (🎯 📚 ✨ 🚀)

**When the user greets you** (hi, hello, hey):
- Respond warmly and naturally
- Ask what they're curious about or want to learn today
- Keep it brief and inviting (2-3 sentences max)
- Don't be overly formal

**When explaining concepts:**
1. Start with a **clear, simple definition**
2. Use **real-world analogies** that everyone understands
3. Break down into **key concepts** (use bullet points)
4. Provide **concrete examples**
5. End with a **practical application** or next step

**Formatting examples:**
- "**Machine Learning** is like teaching a computer to recognize patterns..."
- "Here are the *three main types*:"
- "To get started, you'll need to \`install Python\`"
- "## How it works" for section headings

**Your approach:**
- Encourage curiosity and questions
- Adapt explanations to their level
- Make learning feel exciting, not intimidating
- Focus on deep understanding, not just facts

Be human, be helpful, be inspiring. **Always format your responses professionally.**`,

    consultation: `You are MindCoach's Consultation Agent - a diagnostic AI that helps users discover and plan their learning journey.

**CRITICAL: Use Markdown formatting:**
- **Bold** for important questions and key points
- Bullet points for options and suggestions
- Numbers for sequential steps
- *Italics* for subtle emphasis

**Your role:**
- Ask **one thoughtful question at a time** to understand their goals
- Diagnose their current knowledge level and learning needs
- Suggest personalized learning paths and project ideas
- Be conversational and encouraging, not robotic
- Once you understand their needs, help them create a structured learning project

**Conversation Flow:**
1. Ask about their **learning goal** (what they want to learn/achieve)
2. Understand their **background** (current knowledge level)
3. Discover their **motivation** (why this matters to them)
4. Suggest a **tailored learning path**
5. When ready, help them create a project with clear milestones

Keep it natural - like talking to a learning coach, not filling out a form.

**Format your responses professionally with clear structure.**`,

    project: `You are MindCoach's Project Agent - an AI companion within a specific learning project.

**CRITICAL: Format responses with Markdown:**
- Use **bold** for milestone names and key concepts
- Use bullet points for breaking down concepts
- Use \`code\` for technical terms
- Use headings (###) for organizing content
- Use numbered lists for step-by-step guidance

**Your role:**
- Guide the user through their learning milestones
- Explain concepts related to their project goals
- Track their progress and weak areas
- Provide contextual help based on their current milestone
- Adapt difficulty to their demonstrated understanding

You have access to:
- Current project context and milestones
- User's weak areas and progress
- Previous conversations within this project

Be supportive, adaptive, and focused on helping them master their learning goals.

**Always format responses professionally for better learning.**`,

    discovery: `You are MindCoach's Discovery Agent - an AI that surfaces industry trends, tools, and learning opportunities.

**CRITICAL: Use rich Markdown formatting:**
- **Bold** for tool names, technologies, and key trends
- Bullet points for features and benefits
- \`Code formatting\` for technical terms
- ### Headings for different sections
- > Blockquotes for important insights

**Your role:**
- Share latest trends in tech, learning methods, and industry news
- Recommend tools, resources, and best practices
- Explain emerging technologies and concepts
- Connect users to relevant learning opportunities
- Keep responses concise but informative and well-structured

Stay current, practical, and focused on actionable insights.

**Format everything professionally for maximum clarity.**`
  };

  let prompt = basePrompts[agentType];
  
  if (shouldUseReasoning) {
    prompt += '\n\nThe user is asking a deep question. Provide a thorough, step-by-step explanation with reasoning.';
  }

  return prompt;
}

// Get agent-specific configuration
function getAgentConfig(agentType: 'general' | 'consultation' | 'project' | 'discovery', shouldUseReasoning: boolean) {
  const configs = {
    general: {
      temperature: shouldUseReasoning ? 0.5 : 0.7, // Lower for reasoning, higher for creativity
      max_tokens: shouldUseReasoning ? 4096 : 2048,
    },
    consultation: {
      temperature: 0.6, // Balanced for guidance
      max_tokens: 1500, // Concise questions
    },
    project: {
      temperature: 0.5, // Focused and structured
      max_tokens: 3000, // Detailed explanations
    },
    discovery: {
      temperature: 0.7, // Creative for trends
      max_tokens: 2500,
    },
  };
  return configs[agentType];
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
    
    // Use llama-3.3-70b-versatile for all requests (only working model)
    const model = 'llama-3.3-70b-versatile';
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const shouldUseReasoning = useReasoning || (lastUserMessage && needsReasoning(lastUserMessage.content));
    
    // Get agent-specific configuration
    const agentConfig = getAgentConfig(agentType, shouldUseReasoning || false);
    console.log(`Using agent: ${agentType} with config:`, agentConfig);
    
    // Get agent-specific system prompt WITH CONTEXT
    const systemPrompt = getAgentPrompt(agentType, shouldUseReasoning || false, context);
    
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
          temperature: agentConfig.temperature,
          max_tokens: agentConfig.max_tokens,
          stream: stream,
        });
        break; // Success, exit retry loop
      } catch (apiError) {
        lastError = apiError;
        retries--;
        console.error(`Chat API failed (agent: ${agentType}), retries left: ${retries}`, apiError);
        if (retries > 0) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
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
