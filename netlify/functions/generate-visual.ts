import Groq from "groq-sdk";
import type { Handler } from "@netlify/functions";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface VisualRequest {
  query: string;
  visualType?: 'diagram' | 'comparison' | 'flowchart' | 'mindmap' | 'ai-image';
}

interface VisualResponse {
  type: 'mermaid' | 'comparison-chart' | 'illustration' | 'ai-image' | 'flow-diagram';
  content?: string; // Mermaid syntax (legacy)
  flowData?: {
    nodes: Array<{
      id: string;
      type?: 'input' | 'output' | 'default';
      data: { label: string };
      position: { x: number; y: number };
      style?: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      type?: string;
      animated?: boolean;
    }>;
  };
  data?: any[]; // Chart data
  chartType?: 'bar' | 'radar' | 'line';
  imageUrl?: string; // For AI-generated images
  title: string;
  description: string;
  textExplanation: string; // Fallback text
  
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

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  } as Record<string, string>;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API configuration error' }),
      };
    }

    const { query, visualType }: VisualRequest = JSON.parse(event.body || '{}');

    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query is required' }),
      };
    }

    // Detect what type of visual would work best
    const isAIImage = /\b(generate image|create picture|draw|illustrate|show me visually)\b/i.test(query) || visualType === 'ai-image';
    const isComparison = /\b(vs|versus|difference|compare|over)\b/i.test(query);
    const isProcess = /\b(how|process|flow|steps|work|lifecycle)\b/i.test(query);
    const isStructure = /\b(architecture|structure|system|design|components)\b/i.test(query);

    let response: VisualResponse;

    // Generate AI image for illustration requests
    if (isAIImage) {
      let completion;
      let retries = 2;
      
      while (retries >= 0) {
        try {
          completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Create a detailed, professional image prompt for educational illustration.

IMPORTANT: Make the prompt detailed, specific, and visual. Include:
- Art style (e.g., "clean vector illustration", "detailed infographic", "modern diagram")
- Color scheme (e.g., "blue and purple gradient", "warm educational colors")
- Specific elements to include
- Perspective/layout

Return JSON:
{
  "title": "Image Title",
  "prompt": "DETAILED prompt (50+ words) with style, colors, composition, specific elements",
  "description": "What the image will show",
  "textExplanation": "Educational explanation"
}`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      });
          break; // Success
        } catch (apiError) {
          retries--;
          console.error(`Visual API failed (image), retries left: ${retries}`, apiError);
          if (retries < 0) throw apiError;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!completion) {
        throw new Error('Failed to generate image prompt after retries');
      }

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      const imagePrompt = result.prompt || query;
      
      // Use Pollinations.ai with better parameters for consistency
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=800&nologo=true&model=flux&seed=${Date.now()}`;
      
      response = {
        type: 'ai-image',
        imageUrl: imageUrl,
        title: result.title || 'AI Generated Illustration',
        description: result.description || '',
        textExplanation: result.textExplanation || ''
      };
    }
    // Generate comparison chart for "X vs Y" queries
    else if (isComparison) {
      let completion;
      let retries = 2;
      
      while (retries >= 0) {
        try {
          completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are an EDUCATIONAL VISUAL DESIGNER creating comparison charts for students.

🎓 EDUCATIONAL CONTEXT:
Query: "${query}"

Your job: Create a comprehensive comparison that helps students UNDERSTAND, not just see data.

📊 REQUIRED OUTPUT:
{
  "title": "Clear comparison title",
  "description": "1-sentence learning objective",
  "learningObjective": "After seeing this, students will understand...",
  "items": [
    {
      "name": "Attribute 1 (e.g., Learning Curve)",
      "value": <0-100 score for item 1>,
      "value2": <0-100 score for item 2>,
      "explanation": "Why this matters: ..."
    }
  ],
  "realWorldExamples": {
    "item1Name": "Example: Used in Netflix for...",
    "item2Name": "Example: Used in SpaceX for..."
  },
  "whenToUse": {
    "item1Name": "Choose this when you need...",
    "item2Name": "Choose this when you need..."
  },
  "textExplanation": "Detailed breakdown with examples",
  "practicePrompt": "Try this: Build a simple [project] to understand the difference"
}

ATTRIBUTES TO COMPARE (choose 5-7 most relevant):
- For programming languages: Speed, Learning Curve, Ecosystem, Job Market, Community Support, Use Cases
- For frameworks: Performance, Developer Experience, Community, Documentation, Flexibility
- For concepts: Complexity, Real-world Usage, Prerequisites, Learning Time, Practical Value

SCORING RULES:
- 0-30: Poor/Weak
- 31-60: Moderate/Average  
- 61-85: Good/Strong
- 86-100: Excellent/Best-in-class

Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
          break; // Success
        } catch (apiError) {
          retries--;
          console.error(`Visual API failed (comparison), retries left: ${retries}`, apiError);
          if (retries < 0) throw apiError;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!completion) {
        throw new Error('Failed to generate comparison after retries');
      }

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      response = {
        type: 'comparison-chart',
        data: result.items || [],
        chartType: result.items?.length > 4 ? 'radar' : 'bar',
        title: result.title || 'Comparison',
        description: result.description || '',
        textExplanation: result.textExplanation || '',
        learningObjective: result.learningObjective,
        realWorldExamples: result.realWorldExamples,
        whenToUse: result.whenToUse,
        practicePrompt: result.practicePrompt
      };
    }
    // Generate React Flow diagram for processes/flows/architectures (NO MORE MERMAID!)
    else if (isProcess || isStructure) {
      let completion;
      let retries = 2;
      
      while (retries >= 0) {
        try {
          completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are an EDUCATIONAL VISUAL DESIGNER creating interactive flowcharts for students.

🎓 EDUCATIONAL CONTEXT:
Query: "${query}"

Your mission: Transform complex concepts into clear, step-by-step visual learning experiences.

🎨 VISUAL REQUIREMENTS:
✅ 12-20 nodes minimum (comprehensive coverage)
✅ Use emoji icons for visual clarity: 🎯📝✅❌⚠️🔄💾🔐🌐📊🎯🔍💡⚡🛡️
✅ Progressive disclosure (simple → complex)
✅ Show relationships and dependencies
✅ Include decision points with clear labels
✅ Show error handling ("What if it fails?")
✅ Parallel processes where relevant

📐 PROFESSIONAL LAYOUT:
- Main flow: x=300, y increases by 120
- Left branch: x=100  
- Right branch: x=500
- Parallel: x=150, 300, 450 at same Y

🎯 NODE TYPES:
- "input" = Start/Trigger (green)
- "output" = End/Result (red)
- "default" = Process/Decision (purple)

🔗 EDGE STYLES:
- All edges: type="smoothstep"
- Main path: animated=true
- Branches: label="Yes"/"No"/"Error"/"If..."

📋 REQUIRED JSON OUTPUT:
{
  "title": "Clear process/concept title",
  "description": "What students will learn from this diagram",
  "learningObjective": "After this, you'll understand how to...",
  "prerequisites": "What you should know first: ...",
  "nodes": [
    {"id":"1","type":"input","data":{"label":"🚀 Start Here"},"position":{"x":300,"y":0}},
    {"id":"2","data":{"label":"📝 Step Name"},"position":{"x":300,"y":120}}
  ],
  "edges": [
    {"id":"e1-2","source":"1","target":"2","animated":true,"type":"smoothstep"}
  ],
  "keyTakeaways": [
    "💡 Important point 1",
    "💡 Important point 2"
  ],
  "commonMistakes": [
    "❌ Students often confuse...",
    "❌ Don't forget to..."
  ],
  "realWorldExample": "In real life, this is used in... (specific example)",
  "practicePrompt": "Now try: [hands-on activity to reinforce learning]",
  "textExplanation": "Detailed step-by-step walkthrough"
}

DESIGN PRINCIPLES:
✅ Top-to-bottom or left-to-right flow
✅ Group related concepts visually
✅ Keep labels concise (3-7 words)
✅ Show complete flow (input → process → output)

Return ONLY valid JSON. No markdown.`
          },
          {
            role: 'user',
            content: `Create comprehensive educational flowchart for: ${query}`
          }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      });
          break; // Success
        } catch (apiError) {
          retries--;
          console.error(`Visual API failed (flowchart), retries left: ${retries}`, apiError);
          if (retries < 0) throw apiError;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!completion) {
        throw new Error('Failed to generate flowchart after retries');
      }

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      response = {
        type: 'flow-diagram',
        flowData: {
          nodes: result.nodes || [],
          edges: result.edges || []
        },
        title: result.title || 'Diagram',
        description: result.description || '',
        textExplanation: result.textExplanation || '',
        learningObjective: result.learningObjective,
        prerequisites: result.prerequisites,
        keyTakeaways: result.keyTakeaways,
        commonMistakes: result.commonMistakes,
        realWorldExample: result.realWorldExample,
        practicePrompt: result.practicePrompt
      };
    }
    // Default: Create a simple educational diagram
    else {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are an EDUCATIONAL VISUAL DESIGNER creating concept visualizations for students.

🎓 EDUCATIONAL CONTEXT:
Query: "${query}"

Create a simple but informative React Flow diagram that helps students understand this concept.

📋 REQUIRED JSON OUTPUT:
{
  "title": "Clear concept title",
  "description": "What students will learn",
  "learningObjective": "After this, you'll understand...",
  "nodes": [
    { "id": "1", "type": "input", "data": { "label": "🎯 Main Concept" }, "position": { "x": 250, "y": 0 } },
    { "id": "2", "data": { "label": "💡 Key Point 1" }, "position": { "x": 100, "y": 100 } },
    { "id": "3", "data": { "label": "⚡ Key Point 2" }, "position": { "x": 400, "y": 100 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "type": "smoothstep" },
    { "id": "e1-3", "source": "1", "target": "3", "type": "smoothstep" }
  ],
  "keyTakeaways": ["Important insight 1", "Important insight 2"],
  "realWorldExample": "In practice, this is used for...",
  "practicePrompt": "Try this: [simple exercise]",
  "textExplanation": "Detailed explanation with examples"
}

Use emoji icons for clarity. Keep it simple but educational.
Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      response = {
        type: 'flow-diagram',
        flowData: {
          nodes: result.nodes || [],
          edges: result.edges || []
        },
        title: result.title || 'Visualization',
        description: result.description || '',
        textExplanation: result.textExplanation || '',
        learningObjective: result.learningObjective,
        keyTakeaways: result.keyTakeaways,
        realWorldExample: result.realWorldExample,
        practicePrompt: result.practicePrompt
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error: any) {
    console.error('Visual generation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate visual',
        details: error?.message || 'Unknown error'
      }),
    };
  }
};
