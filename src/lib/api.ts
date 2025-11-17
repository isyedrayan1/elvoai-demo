import { contextManager, type ConversationContext } from './context';
import { db, type Message as DBMessage, type Chat as DBChat } from './db';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
}

/**
 * Stream chat completion with context awareness
 * This handles both general chat and project chat with proper context
 */
export async function streamChatWithContext(
  messages: Message[],
  context: ConversationContext,
  onChunk: (content: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  let retries = 2;
  let lastError: Error | null = null;

  while (retries >= 0) {
    try {
      // Build system prompt based on context
      const mode = context.projectId ? "project" : "general";
      const systemPrompt = contextManager.generateSystemPrompt(context, mode);
      
      // Prepend system message (strip all extra properties)
      const messagesWithContext = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map(m => ({
          role: m.role,
          content: m.content
          // Explicitly exclude: timestamp, isStreaming, hasVisual, etc.
        }))
      ];

      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesWithContext,
          context: {
            projectId: context.projectId,
            milestoneId: context.currentMilestone?.id,
            weakAreas: context.weakAreas
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          return; // Success - exit function
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onComplete();
              return; // Success - exit function
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`API call failed, retries left: ${retries}`, lastError);
      
      retries--;
      if (retries >= 0) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, (2 - retries) * 1000));
        continue;
      }
      
      // All retries failed
      onError(lastError);
      return;
    }
  }
}

/**
 * Legacy streamChat function for backwards compatibility
 * Redirects to streamChatWithContext with minimal context
 */
export async function streamChat(
  messages: Message[],
  onChunk: (content: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  let retries = 2;
  let lastError: Error | null = null;

  while (retries >= 0) {
    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          return;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`API call failed, retries left: ${retries}`, lastError);
      
      retries--;
      if (retries >= 0) {
        await new Promise(resolve => setTimeout(resolve, (2 - retries) * 1000));
        continue;
      }
      
      onError(lastError);
      return;
    }
  }
}

/**
 * AI Orchestration - Detect user intent and route to appropriate workflow
 */
export interface OrchestrationResult {
  intent: 'casual_chat' | 'project_creation' | 'roadmap_request' | 'resource_search' | 'deep_learning' | 'explanation' | 'visual_explanation' | 'comparison' | 'image_generation';
  confidence: number;
  suggestedAction: {
    type: 'respond' | 'create_project' | 'generate_roadmap' | 'gather_resources' | 'deep_dive' | 'generate_visual';
    parameters?: Record<string, any>;
  };
  reasoning: string;
}

export async function detectIntent(
  message: string,
  context?: {
    hasActiveProject?: boolean;
    recentTopics?: string[];
    conversationLength?: number;
  }
): Promise<OrchestrationResult> {
  let retries = 2;
  let lastError: Error | null = null;

  while (retries >= 0) {
    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, context }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to detect intent: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Intent detection failed, retries left: ${retries}`, lastError);
      
      retries--;
      if (retries >= 0) {
        await new Promise(resolve => setTimeout(resolve, (2 - retries) * 1000));
        continue;
      }
      
      throw lastError;
    }
  }
  
  throw lastError || new Error('Intent detection failed');
}

/**
 * Generate learning roadmap with AI
 */
export interface Roadmap {
  title: string;
  description: string;
  level: string;
  totalDuration: string;
  milestones: Array<{
    id: number;
    title: string;
    objective: string;
    concepts: string[];
    project: string;
    successCriteria: string[];
    estimatedHours: number;
    prerequisites: number[];
  }>;
  diagram: string; // Mermaid.js syntax
}

export async function generateRoadmap(
  topic: string,
  userLevel?: 'beginner' | 'intermediate' | 'advanced',
  timeframe?: 'week' | 'month' | 'quarter' | 'year',
  goals?: string[]
): Promise<Roadmap> {
  const response = await fetch('/api/generate-roadmap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, userLevel, timeframe, goals }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate roadmap: ${response.status}`);
  }

  const data = await response.json();
  return data.roadmap;
}

/**
 * Gather learning resources using Exa + LLM curation
 */
export interface Resource {
  title: string;
  url: string;
  type: 'course' | 'tutorial' | 'article' | 'video' | 'documentation' | 'book';
  level: 'beginner' | 'intermediate' | 'advanced';
  quality: number; // 1-5
  topics: string[];
  description: string;
  isPaid: boolean;
  platform?: string;
}

export async function gatherResources(
  topic: string,
  type?: 'course' | 'tutorial' | 'article' | 'video' | 'documentation' | 'all',
  level?: 'beginner' | 'intermediate' | 'advanced',
  limit?: number
): Promise<Resource[]> {
  const response = await fetch('/api/gather-resources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, type, level, limit }),
  });

  if (!response.ok) {
    throw new Error(`Failed to gather resources: ${response.status}`);
  }

  const data = await response.json();
  return data.resources;
}

/**
 * Generate visual content (diagrams, charts, illustrations, AI images)
 */
export interface VisualData {
  type: 'mermaid' | 'comparison-chart' | 'illustration' | 'ai-image' | 'flow-diagram';
  content?: string; // Mermaid syntax (deprecated)
  flowData?: {
    nodes: any[];
    edges: any[];
  };
  data?: any[]; // Chart data
  chartType?: 'bar' | 'radar' | 'line';
  imageUrl?: string; // AI-generated image URL
  title: string;
  description: string;
  textExplanation: string;
  
  // Educational enhancements
  learningObjective?: string;
  prerequisites?: string;
  keyTakeaways?: string[];
  commonMistakes?: string[];
  realWorldExample?: string;
  realWorldExamples?: { item1Name?: string; item2Name?: string };
  whenToUse?: { item1Name?: string; item2Name?: string };
  practicePrompt?: string;
}

export async function generateVisual(
  query: string,
  visualType?: 'diagram' | 'comparison' | 'flowchart' | 'mindmap' | 'ai-image'
): Promise<VisualData> {
  const response = await fetch('/api/generate-visual', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, visualType }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate visual: ${response.status}`);
  }

  return await response.json();
}
