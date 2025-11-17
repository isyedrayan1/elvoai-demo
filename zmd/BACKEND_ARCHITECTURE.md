# MindCoach Backend Architecture
## Multi-Agent Conversational Learning System

---

## 🎯 Core Philosophy

**Not a course platform. Not a chatbot. A living coach.**

- Diagnose → Explain → Act → Feedback → Progress
- Everything in conversation
- Visuals when needed, not by default
- Resources as context, not curriculum
- Roadmap as navigation, not content

---

## 🏗️ Architecture Overview

```
User Input
    ↓
Intent Detector Agent (Orchestrator)
    ↓
├─→ General Agent (Casual learning, quick answers)
├─→ Consultation Agent (Project creation dialogue)
├─→ Project Agent (Inside project coaching)
└─→ Discovery Agent (Explore, trends, opportunities)
    ↓
Context Manager (Dynamic memory, cross-session awareness)
    ↓
Tool Layer (Search, Images, Diagrams, Resources)
    ↓
Response with context + visuals + next steps
```

---

## 🤖 Agent System

### 1. **Orchestrator Agent** (Router + Intent Detector)

**Role**: Figures out what the user wants and routes to the right agent.

**Capabilities**:
- Detect intent: `casual_question`, `create_project`, `inside_project`, `explore`
- Route to appropriate agent
- Maintain conversation coherence
- Handle agent switches mid-conversation

**Tools Access**:
- Context Manager (read user state)
- Session Memory

**Example Flow**:
```javascript
User: "I want to learn React"
Orchestrator detects: create_project intent
→ Routes to Consultation Agent

User: "What is closure?"
Orchestrator detects: casual_question
→ Routes to General Agent
```

---

### 2. **General Agent** (Spot Learning)

**Role**: Quick explanations, doubt-solving, concept clarification.

**Behavior**:
- Short, tight explanations (1-3 sentences + example)
- Ask diagnostic questions first
- Offer visuals when complexity detected
- **Never** teach in sequence
- **Never** create curriculum
- Suggests project creation if goal detected

**Tools Access**:
- Exa Search (real-time web search)
- Visual Generator (diagrams, flowcharts)
- Image Explainer (Gemini Vision)
- Resource Analyzer

**Tone**:
- Calm, clear, direct
- Like a mentor, not a professor
- No filler words

**Example**:
```
User: "What's async/await?"

Agent:
"Async/await makes asynchronous code look synchronous. 
Instead of .then() chains, you write code that reads top-to-bottom.

Example:
async function getData() {
  const response = await fetch('/api');
  const data = await response.json();
  return data;
}

Want to see how this compares to Promises?"
```

---

### 3. **Consultation Agent** (Project Creation)

**Role**: Guide user through creating a learning project via conversation.

**Behavior**:
- Have a natural dialogue (3-4 exchanges minimum)
- Ask about: topic, level, goal, time commitment
- Detect readiness to create project
- Generate roadmap in real-time
- Curate 2-3 starter resources from Exa

**Tools Access**:
- Exa Search (find best resources)
- Roadmap Generator
- Context Manager (save project intent)

**Conversation Flow**:
```
Agent: "What would you like to learn?"
User: "React"

Agent: "Great! Are you brand new to React, or do you know some JavaScript already?"
User: "I know JavaScript basics"

Agent: "Perfect. What's driving this? Job switch? Personal project? Just curious?"
User: "I want to build my own app"

Agent: "Nice. How much time can you dedicate weekly? 5 hours? 10? 20?"
User: "About 10 hours"

Agent: "Got it! I'll create a roadmap for building real React apps - starting from components to deployment. Ready?"
[CREATE_JOURNEY button appears]
```

**Real-time Actions on Creation**:
1. Generate dynamic roadmap (5-7 milestones)
2. Fetch 2-3 quality resources from Exa per milestone
3. Create project structure
4. Navigate user to project

---

### 4. **Project Agent** (The Coach)

**Role**: Inside-project conversational teaching.

**Behavior**:
- Diagnose before explaining
- Give micro-actions, not lectures
- Use visuals strategically
- Remember weak areas
- Reference user-provided resources
- Stay within project scope

**Tools Access**:
- Exa Search (milestone-specific resources)
- Visual Generator
- Image Explainer (Gemini Vision for diagrams)
- Resource Analyzer (parse user docs/videos)
- Context Manager (project memory)

**Coaching Loop**:
```
1. Diagnose: "What do you understand about closures so far?"
2. Explain: Short, clear answer + example
3. Micro Action: "Try writing a function that returns another function"
4. Feedback: User shares attempt
5. Correct/Guide: Point out specific issues
6. Next Step: "Now let's see how this applies in React hooks"
```

**Context Awareness**:
- Knows current milestone
- Tracks completed concepts
- Flags struggling areas
- Adjusts difficulty dynamically

**Example**:
```
User: "I don't get how useEffect works"

Agent: 
"Tell me what happens when you use useEffect. Walk me through what you think it does."

User: "It runs when component renders?"

Agent:
"Close. It runs AFTER the component renders to the DOM.

Think of it like:
1. React renders UI
2. Browser paints screen
3. THEN useEffect runs

This order matters because you might need the DOM to exist first.

Quick task: Write a useEffect that logs 'mounted' when component first appears."
```

---

### 5. **Discovery Agent** (Explore Mode)

**Role**: Help users explore opportunities, trends, unknown paths.

**Behavior**:
- Surface career paths, skills, domains
- Show industry trends
- Provide quick visual-first insights
- Convert interest → project suggestion

**Tools Access**:
- Exa Search (latest trends, opportunities)
- Visual Generator (infographics)

**Example**:
```
User browses "Data Engineering"

Agent surfaces:
- What data engineers do
- Tools they use
- Career growth
- Sample projects
→ "Want to start a Data Engineering learning journey?"
```

---

## 🛠️ Tool Layer (Shared Across Agents)

### 1. **Exa Search** (Real-time Web Knowledge)

**Purpose**: Get fresh, relevant information from the web.

**Use Cases**:
- Find quality learning resources
- Get latest framework updates
- Fetch real-world examples
- Industry trends

**Implementation**:
```typescript
async function exaSearch(query: string, options?: {
  category?: 'tutorial' | 'documentation' | 'article';
  numResults?: number;
}) {
  const response = await fetch('/.netlify/functions/exa-search', {
    method: 'POST',
    body: JSON.stringify({ query, ...options })
  });
  return response.json();
}
```

**Quality Filters**:
- Prioritize: official docs, trusted sites, recent content
- Avoid: outdated tutorials, low-quality blogs
- Return: 2-3 best resources only

---

### 2. **Visual Generator** (Diagrams, Flowcharts)

**Purpose**: Generate visual explanations when needed.

**Visual Types**:
- Flowcharts (processes, loops, workflows)
- Architecture diagrams (system design)
- Mind maps (concept relationships)
- Timeline (learning progression)
- Comparison tables (library A vs B)
- Step ladders (sequential learning)

**When to Use**:
- User asks "show me visually"
- Complex concept detected
- Process explanation needed
- Comparative analysis

**Implementation**:
```typescript
async function generateVisual(type: VisualType, data: any) {
  const response = await fetch('/.netlify/functions/generate-visual', {
    method: 'POST',
    body: JSON.stringify({ type, data })
  });
  return response.json(); // Returns Mermaid/SVG/Image URL
}
```

---

### 3. **Image Explainer** (Gemini Vision)

**Purpose**: Analyze images, diagrams, screenshots user provides.

**Use Cases**:
- User shares architecture diagram → AI explains it
- User shares error screenshot → AI debugs
- User shares concept visualization → AI breaks it down

**Implementation**:
```typescript
async function explainImage(imageUrl: string, question?: string) {
  const response = await fetch('/.netlify/functions/explain-image', {
    method: 'POST',
    body: JSON.stringify({ imageUrl, question })
  });
  return response.json();
}
```

---

### 4. **Resource Analyzer** (Parse Docs/Videos)

**Purpose**: Extract key points from user-provided resources.

**Capabilities**:
- Summarize documentation
- Extract code examples
- Identify important sections
- Generate practice tasks from content

**Implementation**:
```typescript
async function analyzeResource(url: string, type: 'doc' | 'video' | 'article') {
  const response = await fetch('/.netlify/functions/analyze-resource', {
    method: 'POST',
    body: JSON.stringify({ url, type })
  });
  return response.json();
  // Returns: { summary, keyPoints, examples, practiceIdeas }
}
```

---

### 5. **Roadmap Generator** (Dynamic Milestone Creation)

**Purpose**: Generate personalized learning roadmaps based on consultation.

**Input**:
```typescript
{
  topic: "React Development",
  level: "beginner",
  goal: "Build production apps",
  timeCommitment: "10 hours/week",
  userContext: { knowsJS: true, knowsHTML: true }
}
```

**Output**:
```typescript
{
  milestones: [
    {
      id: "m1",
      title: "React Fundamentals",
      description: "Components, JSX, props, state",
      estimatedHours: 8,
      concepts: ["Components", "JSX", "Props", "State"],
      resources: [...], // From Exa
      dependencies: []
    },
    // ... 5-7 milestones total
  ]
}
```

**Smart Features**:
- Adapts to user's existing knowledge
- Adjusts difficulty based on goal
- Time-boxes based on commitment
- Includes practical projects per milestone

---

## 💾 Context Manager (Memory System)

**Purpose**: Maintain state across sessions, projects, conversations.

**Storage Structure**:
```typescript
interface UserContext {
  // Global
  userId: string;
  currentProject?: string;
  currentChat?: string;
  intent?: 'create_project' | 'casual' | 'inside_project';
  lastActivity: string;
  
  // Project-specific
  projectContext: {
    [projectId: string]: {
      currentMilestone: string;
      completedConcepts: string[];
      weakAreas: string[];
      learningStyle: 'visual' | 'text' | 'mixed';
      lastTopic: string;
      progress: number;
    }
  };
  
  // Conversation memory
  conversationHistory: {
    lastTopics: string[];
    preferredExplanationStyle: string;
    commonMisconceptions: string[];
  };
}
```

**Dynamic Updates**:
- Track milestone progress
- Detect weak areas from conversation
- Remember preferred learning style
- Update roadmap based on performance

---

## 📡 Netlify Functions (Backend API)

### Function Structure

```
netlify/functions/
├── orchestrate.ts          # Main orchestrator
├── general-chat.ts         # General agent
├── consultation.ts         # Consultation agent
├── project-chat.ts         # Project agent
├── discover.ts             # Discovery agent
├── exa-search.ts          # Exa integration
├── generate-visual.ts     # Visual generation
├── explain-image.ts       # Gemini Vision
├── analyze-resource.ts    # Resource parsing
└── generate-roadmap.ts    # Roadmap creation
```

---

### Core Function: `orchestrate.ts`

**Role**: Route requests to appropriate agent.

```typescript
export async function handler(event) {
  const { message, context, projectId } = JSON.parse(event.body);
  
  // Detect intent
  const intent = await detectIntent(message, context);
  
  // Route to agent
  switch(intent) {
    case 'create_project':
      return await consultationAgent(message, context);
    
    case 'inside_project':
      return await projectAgent(message, context, projectId);
    
    case 'casual':
      return await generalAgent(message, context);
    
    case 'discover':
      return await discoveryAgent(message, context);
  }
}
```

---

### Agent Function Example: `project-chat.ts`

```typescript
export async function handler(event) {
  const { message, projectId, chatId } = JSON.parse(event.body);
  
  // Load project context
  const project = await getProject(projectId);
  const context = await getProjectContext(projectId);
  
  // Build system prompt
  const systemPrompt = `
You are a calm, expert coach helping someone learn ${project.title}.

Current milestone: ${context.currentMilestone}
Weak areas: ${context.weakAreas.join(', ')}
Learning style: ${context.learningStyle}

RULES:
1. Diagnose before explaining
2. Keep explanations to 1-3 sentences + example
3. Give micro-actions, not lectures
4. Ask questions to check understanding
5. Use visuals only when asked or truly needed
6. Reference their added resources when relevant
7. Stay within project scope

Coaching Loop:
- Diagnose → Short Explain → Micro Action → Feedback → Next Step
`;

  // Stream response with tool access
  const response = await streamWithTools({
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ],
    tools: [
      exaSearchTool,
      visualGeneratorTool,
      imageExplainerTool
    ]
  });
  
  // Update context based on response
  await updateProjectContext(projectId, {
    lastTopic: extractTopic(response),
    weakAreas: detectWeakAreas(response)
  });
  
  return response;
}
```

---

## 🎨 Frontend Integration Points

### 1. **Main Chat Page** (`AskMindCoach.tsx`)

**Responsibilities**:
- General learning
- Project creation consultation
- Intent detection triggers

**API Calls**:
```typescript
// General chat
await fetch('/.netlify/functions/orchestrate', {
  method: 'POST',
  body: JSON.stringify({
    message: userInput,
    context: getUserContext(),
    mode: 'general'
  })
});

// When [CREATE_JOURNEY] button clicked
await fetch('/.netlify/functions/generate-roadmap', {
  method: 'POST',
  body: JSON.stringify(projectData)
});
```

---

### 2. **Project Detail Page** (`ProjectDetail.tsx`)

**Chat Tab**:
```typescript
await fetch('/.netlify/functions/project-chat', {
  method: 'POST',
  body: JSON.stringify({
    message: userInput,
    projectId,
    chatId,
    context: getProjectContext(projectId)
  })
});
```

**Roadmap Tab**:
- Display milestones from project data
- "Discuss" button → creates new chat with milestone context
- Progress updates → update context manager

**Resources Tab**:
- Auto-populated from Exa during roadmap creation
- User can add custom resources
- AI can analyze them on demand

---

### 3. **Discover Page** (`Discover.tsx`)

```typescript
await fetch('/.netlify/functions/discover', {
  method: 'POST',
  body: JSON.stringify({
    query: searchTerm,
    userInterests: getUserInterests()
  })
});
```

---

## 🔄 Data Flow Example

### Creating a Project (End-to-End)

```
1. User clicks "New Project" on Projects page
   ↓
2. Navigate to / (main chat)
   ↓
3. Auto-send: "I want to create a learning project"
   ↓
4. Orchestrator detects: create_project intent
   ↓
5. Routes to Consultation Agent
   ↓
6. Agent asks: topic, level, goal, time
   ↓
7. After 3-4 exchanges, agent returns: [CREATE_JOURNEY: ...]
   ↓
8. Frontend shows inline button
   ↓
9. User clicks → calls generate-roadmap function
   ↓
10. Function:
    - Generates 5-7 milestones
    - Calls Exa for 2-3 resources per milestone
    - Creates project in DB
    - Returns project ID
   ↓
11. Frontend navigates to /projects/{projectId}
   ↓
12. Project page loads with:
    - Chat tab (empty, ready for first conversation)
    - Roadmap tab (shows all milestones)
    - Resources tab (pre-populated from Exa)
```

---

## 📊 Database Schema (IndexedDB)

```typescript
// Projects
interface Project {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: string;
  timeCommitment: string;
  roadmap: {
    milestones: Milestone[];
  };
  chats: Chat[];
  resources: Resource[];
  context: ProjectContext;
  createdAt: string;
  updatedAt: string;
}

// Milestones
interface Milestone {
  id: string;
  title: string;
  description: string;
  concepts: string[];
  estimatedHours: number;
  resources: Resource[];
  completed: boolean;
  progress: number;
}

// Chats (within project)
interface Chat {
  id: string;
  title: string;
  milestoneId?: string; // Optional link to milestone
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// Resources
interface Resource {
  id: string;
  url: string;
  title: string;
  type: 'doc' | 'video' | 'article' | 'tool';
  milestoneId?: string;
  userAdded: boolean;
  summary?: string;
}

// Global Context
interface GlobalContext {
  userId: string;
  currentProject?: string;
  currentChat?: string;
  intent?: string;
  lastActivity: string;
}
```

---

## 🚀 Implementation Priority

### Phase 1: Core Foundation (Week 1)
✅ Multi-agent orchestrator
✅ General Agent (spot learning)
✅ Consultation Agent (project creation)
✅ Exa integration (resource fetching)
✅ Context Manager
✅ Roadmap Generator

### Phase 2: Project Experience (Week 2)
✅ Project Agent (coaching loop)
✅ Visual Generator integration
✅ Resource Analyzer
✅ Dynamic roadmap updates
✅ Weak area detection

### Phase 3: Enhancement (Week 3)
✅ Image Explainer (Gemini Vision)
✅ Discovery Agent
✅ Cross-project context
✅ Resume prompts everywhere
✅ Learning style adaptation

---

## 💡 Key Differentiators

1. **No pre-generated content** - Everything emerges from conversation
2. **Multi-agent intelligence** - Right agent for right context
3. **Real-time resource curation** - Always fresh, relevant content from Exa
4. **Visual-first when needed** - Diagrams that actually help, not decorate
5. **Coaching loop** - Diagnose → Explain → Act → Feedback
6. **Context-aware memory** - Remembers everything, suggests intelligently
7. **Resource-driven learning** - Users bring docs/videos, AI uses them

---

## 🎯 Success Metrics

- **Conversation depth**: 5+ messages per learning session
- **Resource relevance**: 80%+ user-rated quality
- **Visual impact**: 60%+ concepts clearer with visuals
- **Milestone completion**: 70%+ users complete first milestone
- **Resume rate**: 50%+ users return to continue

---

This is your blueprint. Clean, focused, no over-engineering.

Ready to build? 🚀
