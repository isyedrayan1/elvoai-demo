# MindCoach Implementation Roadmap
## From Architecture to Working Product

---

## 📁 File Structure

```
learn-grow-hub/
├── netlify/functions/
│   ├── orchestrate.ts           # Main router
│   ├── agents/
│   │   ├── general.ts           # Spot learning agent
│   │   ├── consultation.ts      # Project creation agent  
│   │   ├── project.ts           # Inside-project coach
│   │   └── discovery.ts         # Explore agent
│   ├── tools/
│   │   ├── exa-search.ts        # Web search
│   │   ├── generate-visual.ts   # Diagrams
│   │   ├── explain-image.ts     # Gemini Vision
│   │   ├── analyze-resource.ts  # Parse docs/videos
│   │   └── generate-roadmap.ts  # Roadmap creation
│   └── utils/
│       ├── intent-detector.ts   # Classify user intent
│       ├── context-manager.ts   # Memory system
│       └── streaming.ts         # SSE helpers
│
├── src/
│   ├── lib/
│   │   ├── agents.ts            # Frontend agent API
│   │   ├── context.ts           # Context manager (enhanced)
│   │   └── tools.ts             # Tool API wrappers
│   └── pages/
│       ├── AskMindCoach.tsx     # General + Consultation
│       ├── ProjectDetail.tsx    # Project Agent
│       └── Discover.tsx         # Discovery Agent
```

---

## 🛠️ Implementation Steps

### Step 1: Refactor Existing Backend (Day 1-2)

#### A. Create Orchestrator Function

**File**: `netlify/functions/orchestrate.ts`

```typescript
import { Handler } from '@netlify/functions';
import { detectIntent } from './utils/intent-detector';
import { generalAgent } from './agents/general';
import { consultationAgent } from './agents/consultation';
import { projectAgent } from './agents/project';
import { discoveryAgent } from './agents/discovery';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, context, projectId, mode } = JSON.parse(event.body || '{}');
    
    // Detect intent if not specified
    const intent = mode || await detectIntent(message, context);
    
    // Route to appropriate agent
    let response;
    switch (intent) {
      case 'consultation':
        response = await consultationAgent(message, context);
        break;
      
      case 'project':
        response = await projectAgent(message, context, projectId);
        break;
      
      case 'discovery':
        response = await discoveryAgent(message, context);
        break;
      
      case 'general':
      default:
        response = await generalAgent(message, context);
        break;
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: response,
    };
    
  } catch (error) {
    console.error('Orchestrator error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

#### B. Intent Detector

**File**: `netlify/functions/utils/intent-detector.ts`

```typescript
export async function detectIntent(
  message: string, 
  context: any
): Promise<'general' | 'consultation' | 'project' | 'discovery'> {
  
  // If inside a project context
  if (context.currentProject) {
    return 'project';
  }
  
  // Keywords for project creation
  const createProjectKeywords = [
    'create project', 'learning journey', 'roadmap',
    'i want to learn', 'help me learn', 'start learning'
  ];
  
  if (createProjectKeywords.some(kw => message.toLowerCase().includes(kw))) {
    return 'consultation';
  }
  
  // Keywords for discovery
  const discoveryKeywords = [
    'explore', 'what can i learn', 'career', 'opportunities',
    'trends', 'discover'
  ];
  
  if (discoveryKeywords.some(kw => message.toLowerCase().includes(kw))) {
    return 'discovery';
  }
  
  // Default to general
  return 'general';
}
```

---

### Step 2: Build Agents (Day 3-5)

#### A. General Agent

**File**: `netlify/functions/agents/general.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { exaSearch } from '../tools/exa-search';
import { generateVisual } from '../tools/generate-visual';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generalAgent(message: string, context: any) {
  const systemPrompt = `You are MindCoach - a calm, expert learning coach.

PERSONALITY:
- Clear, concise, direct
- Like a mentor, not a professor
- No filler, no lectures
- Ask diagnostic questions first
- Give 1-3 sentence explanations + example
- Suggest visuals when complexity is high

RULES:
1. Diagnose before explaining ("What do you understand about X?")
2. Short explanations only
3. Use real examples
4. No teaching in sequence (this is spot learning)
5. If user expresses a learning goal, suggest creating a project

TOOLS AVAILABLE:
- Search web for fresh info
- Generate diagrams/flowcharts
- Analyze images user shares

Respond conversationally and helpfully.`;

  // Stream response with tool use
  const stream = await anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      ...context.conversationHistory || [],
      { role: 'user', content: message }
    ],
    tools: [
      {
        name: 'search_web',
        description: 'Search the web for current information, tutorials, or examples',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            category: { 
              type: 'string', 
              enum: ['tutorial', 'documentation', 'example', 'general'],
              description: 'Type of content to find'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'generate_diagram',
        description: 'Generate a visual diagram (flowchart, mindmap, architecture)',
        input_schema: {
          type: 'object',
          properties: {
            type: { 
              type: 'string',
              enum: ['flowchart', 'mindmap', 'architecture', 'timeline', 'comparison']
            },
            concept: { type: 'string', description: 'Concept to visualize' },
            details: { type: 'string', description: 'Key points to include' }
          },
          required: ['type', 'concept']
        }
      }
    ]
  });

  // Handle tool calls
  stream.on('tool_use', async (toolUse) => {
    if (toolUse.name === 'search_web') {
      const results = await exaSearch(toolUse.input.query, {
        category: toolUse.input.category,
        numResults: 3
      });
      // Return results to Claude
      return results;
    }
    
    if (toolUse.name === 'generate_diagram') {
      const visual = await generateVisual(
        toolUse.input.type,
        toolUse.input.concept,
        toolUse.input.details
      );
      return visual;
    }
  });

  return stream;
}
```

#### B. Consultation Agent

**File**: `netlify/functions/agents/consultation.ts`

```typescript
export async function consultationAgent(message: string, context: any) {
  const systemPrompt = `You are MindCoach helping someone create a learning project.

GOAL: Have a natural conversation (3-4 exchanges) to gather:
1. What they want to learn (topic)
2. Current level (beginner/intermediate/advanced)
3. Learning goal (why they want to learn)
4. Time commitment (hours per week)

BEHAVIOR:
- Ask ONE question at a time
- Be conversational, not interrogative
- Adapt questions based on their answers
- Build on what they say

When you have ALL 4 pieces of info, respond:
"Perfect! I'll create a personalized roadmap for [topic] that [aligns with goal]. Ready?"

Then add this EXACT tag:
[CREATE_JOURNEY: topic="X", level="Y", goal="Z", time="N"]

DO NOT show this tag until you have all info.

EXAMPLES:

User: "I want to learn React"
You: "Great! Are you brand new to React, or do you already know JavaScript?"

User: "I know JavaScript basics"
You: "Perfect. What's motivating you? Job switch, personal project, or just exploring?"

User: "I want to build my own app"
You: "Nice! How much time can you dedicate weekly? 5 hours? 10?"

User: "About 10 hours"
You: "Got it! I'll create a roadmap for building React apps from scratch to deployment. Ready? 🚀"
[CREATE_JOURNEY: topic="React Development", level="beginner", goal="Build apps", time="10"]`;

  // Similar streaming setup as general agent
  // But focused on gathering project creation data
  
  return stream;
}
```

#### C. Project Agent

**File**: `netlify/functions/agents/project.ts`

```typescript
export async function projectAgent(
  message: string, 
  context: any,
  projectId: string
) {
  // Load project details
  const project = context.projects?.[projectId];
  
  const systemPrompt = `You are coaching someone learning: ${project.title}

CURRENT CONTEXT:
- Milestone: ${project.currentMilestone}
- Weak areas: ${project.weakAreas?.join(', ') || 'None detected'}
- Learning style: ${project.learningStyle || 'mixed'}
- Last topic: ${project.lastTopic || 'Just starting'}

COACHING LOOP:
1. Diagnose: Ask what they understand
2. Explain: 1-3 sentences + example
3. Micro-action: Small task to try
4. Feedback: Review their attempt
5. Guide: Correct + next step

RULES:
- Stay within ${project.title} scope
- Reference their added resources when relevant
- Use visuals when process/architecture needs explaining
- Give tiny actions, not big assignments
- Ask questions to check understanding
- No lectures

TOOLS:
- Search for ${project.title}-specific resources
- Generate diagrams when needed
- Analyze code/images they share

Be a coach, not a content machine.`;

  return stream;
}
```

---

### Step 3: Build Tools Layer (Day 6-7)

#### A. Enhanced Exa Search

**File**: `netlify/functions/tools/exa-search.ts`

```typescript
export async function exaSearch(
  query: string,
  options: {
    category?: 'tutorial' | 'documentation' | 'article' | 'tool';
    numResults?: number;
  } = {}
) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.EXA_API_KEY!,
    },
    body: JSON.stringify({
      query,
      numResults: options.numResults || 3,
      useAutoprompt: true,
      type: 'neural',
      category: options.category,
      // Quality filters
      excludeDomains: ['w3schools.com', 'tutorialspoint.com'],
      includeDomains: options.category === 'documentation' 
        ? ['developer.mozilla.org', 'reactjs.org', 'docs.python.org']
        : undefined,
    }),
  });

  const data = await response.json();
  
  return data.results.map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.text?.substring(0, 200),
    score: r.score
  }));
}
```

#### B. Visual Generator

**File**: `netlify/functions/tools/generate-visual.ts`

```typescript
export async function generateVisual(
  type: 'flowchart' | 'mindmap' | 'architecture' | 'timeline',
  concept: string,
  details: string
) {
  // Use Claude to generate Mermaid diagram syntax
  const mermaidCode = await generateMermaidCode(type, concept, details);
  
  // Return as visual data
  return {
    type: 'diagram',
    format: 'mermaid',
    code: mermaidCode,
    concept: concept
  };
}

async function generateMermaidCode(type: string, concept: string, details: string) {
  // Call Claude to generate Mermaid syntax
  // Based on type, concept, and details
  
  const prompt = `Generate a ${type} diagram in Mermaid syntax for: ${concept}
  
Details: ${details}

Return ONLY the Mermaid code, no explanation.`;

  // ... call Claude and return mermaid code
}
```

#### C. Image Explainer (Gemini Vision)

**File**: `netlify/functions/tools/explain-image.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function explainImage(
  imageUrl: string,
  question?: string
) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = question 
    ? `Analyze this image and answer: ${question}`
    : 'Explain what this image shows in detail, especially any technical concepts, code, or diagrams.';

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: await fetchImageAsBase64(imageUrl),
        mimeType: 'image/jpeg'
      }
    }
  ]);

  return {
    explanation: result.response.text(),
    imageUrl
  };
}
```

#### D. Roadmap Generator

**File**: `netlify/functions/tools/generate-roadmap.ts`

```typescript
export async function generateRoadmap(
  topic: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  goal: string,
  timeCommitment: string
) {
  // Use Claude to generate structured roadmap
  const systemPrompt = `Generate a learning roadmap for:
  
Topic: ${topic}
Level: ${level}
Goal: ${goal}
Time: ${timeCommitment} hours/week

Create 5-7 milestones that:
1. Progress logically
2. Include practical projects
3. Match the user's level
4. Align with their goal
5. Fit their time commitment

Return as JSON:
{
  "milestones": [
    {
      "title": "...",
      "description": "...",
      "concepts": ["...", "..."],
      "estimatedHours": 8,
      "project": "..."
    }
  ]
}`;

  const roadmap = await callClaude(systemPrompt);
  
  // For each milestone, fetch 2-3 resources from Exa
  for (const milestone of roadmap.milestones) {
    milestone.resources = await exaSearch(
      `${topic} ${milestone.title} tutorial`,
      { category: 'tutorial', numResults: 3 }
    );
  }
  
  return roadmap;
}
```

---

### Step 4: Update Frontend (Day 8-9)

#### A. Update Main Chat to Use Orchestrator

**File**: `src/lib/agents.ts`

```typescript
export async function sendToOrchestrator(
  message: string,
  context: any,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  try {
    const response = await fetch('/.netlify/functions/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: {
          currentProject: context.currentProject,
          conversationHistory: context.conversationHistory,
          userPreferences: context.userPreferences
        }
      })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
    
    onComplete();
  } catch (error) {
    onError(error as Error);
  }
}
```

#### B. Update AskMindCoach.tsx

```typescript
// Replace existing chat API call with:
import { sendToOrchestrator } from '@/lib/agents';

const handleSendMessage = async (message: string) => {
  setIsLoading(true);
  
  await sendToOrchestrator(
    message,
    {
      conversationHistory: messages,
      currentProject: undefined, // General chat
    },
    (chunk) => {
      // Update streaming message
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content += chunk;
        return updated;
      });
    },
    () => {
      setIsLoading(false);
    },
    (error) => {
      console.error(error);
      setIsLoading(false);
    }
  );
};
```

---

### Step 5: Testing & Refinement (Day 10)

#### Test Each Agent:

1. **General Agent**:
   - Ask casual questions
   - Verify short, clear responses
   - Test visual generation
   - Test web search integration

2. **Consultation Agent**:
   - Test project creation flow
   - Verify 3-4 exchange pattern
   - Test [CREATE_JOURNEY] tag detection
   - Verify roadmap generation

3. **Project Agent**:
   - Test coaching loop
   - Verify context awareness
   - Test resource integration
   - Test visual explanations

---

## 🎯 Success Criteria

- ✅ Orchestrator routes correctly
- ✅ Each agent has distinct personality
- ✅ Tools integrate seamlessly
- ✅ Roadmaps generate with resources
- ✅ Context persists across sessions
- ✅ Visuals appear when needed
- ✅ Responses are conversational, not robotic

---

## 📊 Monitoring & Iteration

Track these metrics:
- Agent routing accuracy
- Conversation length (target: 5+ messages)
- Resource quality ratings
- Visual usage (when generated)
- Project creation completion rate
- User return rate

---

Ready to build this? Start with orchestrator + general agent, then add others incrementally! 🚀
