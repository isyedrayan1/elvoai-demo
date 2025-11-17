# Environment Variables - Add to Netlify

## Required API Keys

### 1. GROQ_API_KEY
Your existing Groq API key for LLM operations
```
GROQ_API_KEY=your_groq_key_here
```

### 2. GEMINI_API_KEY (NEW - AI Image Generation)
Your provided Gemini API key for AI-powered features
```
GEMINI_API_KEY=AIzaSyC8iWoqLQZ_7lO_ShgpUbwc4sCooo_zRkg
```

### 3. EXA_API_KEY
Your existing Exa API key for resource gathering
```
EXA_API_KEY=your_exa_key_here
```

## How to Add in Netlify

1. Go to your Netlify dashboard
2. Navigate to: **Site settings** → **Environment variables**
3. Click **Add a variable**
4. Add each key-value pair above
5. Click **Save**
6. Redeploy your site

## Visual Generation Features

### 🎨 AI Images (NEW!)
- **Trigger**: "generate image", "create picture", "draw", "illustrate"
- **Example**: "generate an image explaining javascript over c"
- **Result**: Real AI-generated illustration using Pollinations.ai
- **Free**: Unlimited usage

### 📊 Comparison Charts
- **Trigger**: "compare", "vs", "difference", "versus"
- **Example**: "compare python vs javascript"
- **Result**: Interactive bar/radar chart with metrics

### 📈 Flowcharts & Diagrams
- **Trigger**: "how does X work", "show process", "architecture"
- **Example**: "show me how react hooks work"
- **Result**: Mermaid.js flowchart/diagram

### 🧠 Mind Maps
- **Trigger**: "explain", "visualize concept"
- **Example**: "explain machine learning concepts"
- **Result**: Interactive mind map

## Auto-Detection System

The AI automatically detects what type of visual you need:

| User Query | Detected Intent | Visual Type | 
|-----------|----------------|-------------|
| "generate an image of..." | image_generation | AI Image |
| "compare X vs Y" | comparison | Chart |
| "how does X work" | visual_explanation | Flowchart |
| "architecture of X" | visual_explanation | Diagram |

## Cost & Limits

- **Groq**: Free tier, 30 req/min
- **Gemini**: Free tier (used for prompt enhancement only)
- **Pollinations.ai**: Free, unlimited AI image generation
- **Exa**: Paid tier, check your plan

## Testing Queries

Try these in your chat:

1. **AI Images**:
   - "generate an image explaining javascript over c"
   - "create a picture showing how neural networks work"
   - "illustrate the concept of recursion"

2. **Charts**:
   - "compare python vs javascript for beginners"
   - "difference between sql and nosql"

3. **Diagrams**:
   - "show me how oauth2 works"
   - "architecture of a microservices app"
   - "explain the react component lifecycle"

## Fallback Behavior

If image generation fails:
1. System tries to generate visual (Mermaid/Chart)
2. If that fails, returns text explanation
3. User-friendly error messages
4. Automatic retry (2 attempts)

## Privacy & Security

✅ API keys stored securely in Netlify
✅ Never exposed to client-side code
✅ Rate limiting handled automatically
✅ Error messages sanitized (no key leaks)
