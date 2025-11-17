import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Handler } from "@netlify/functions";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ImageRequest {
  query: string;
  style?: 'realistic' | 'illustration' | 'diagram' | 'cartoon';
}

interface ImageResponse {
  type: 'ai-image';
  imageUrl: string;
  prompt: string;
  description: string;
}

export const handler: Handler = async (event) => {
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
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API configuration error' }),
      };
    }

    const { query, style = 'illustration' }: ImageRequest = JSON.parse(event.body || '{}');

    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query is required' }),
      };
    }

    // Use Gemini's Imagen model for image generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // First, enhance the prompt using Gemini
    const promptEnhancement = await model.generateContent([
      {
        text: `Create a detailed, professional image generation prompt for: "${query}".
        
Style: ${style}
        
Requirements:
- Clear, visual description
- Professional quality
- Educational/learning focused
- Appropriate for tech/learning content

Return ONLY the enhanced prompt, no explanations.`
      }
    ]);

    const enhancedPrompt = promptEnhancement.response.text().trim();

    // Note: Gemini's image generation is currently in preview/limited access
    // For production, you'd use Imagen API or fallback to stable diffusion
    // For now, we'll generate a description and use a placeholder approach
    
    const descriptionResult = await model.generateContent([
      {
        text: `Based on this image prompt: "${enhancedPrompt}"
        
Describe what the image would show in 2-3 sentences for a user who can't see images yet.`
      }
    ]);

    const description = descriptionResult.response.text().trim();

    // In production, this would call Imagen API or Stable Diffusion
    // For now, return structured data that frontend can handle
    const response: ImageResponse = {
      type: 'ai-image',
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=800&height=600&nologo=true`,
      prompt: enhancedPrompt,
      description: description
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error: any) {
    console.error('Image generation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate image',
        details: error?.message || 'Unknown error'
      }),
    };
  }
};
