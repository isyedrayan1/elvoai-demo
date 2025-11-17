# Quick Test Guide - Multi-Agent Backend

## 🚀 Start Testing

### 1. Start the Dev Server
```bash
npm run dev
```

The app should start at `http://localhost:8080`

## 🧪 Test Scenarios

### Test 1: General Agent (Educational)
**Location:** Main Chat Page (/)

**Test Message:**
```
How does recursion work in programming?
```

**Expected Behavior:**
- ✅ Response uses analogies and visual explanations
- ✅ Breaks down complexity gradually
- ✅ Asks checking questions
- ✅ Console log shows: "Using agent: general"

---

### Test 2: Consultation Agent (Project Creation)
**Location:** Main Chat Page (/)

**Test Message:**
```
I want to create a new learning project
```

**Expected Behavior:**
- ✅ Response asks diagnostic questions:
  - What do you want to learn?
  - What's your current knowledge level?
  - Why does this matter to you?
- ✅ Conversational tone, not form-like
- ✅ Console log shows: "Using agent: consultation"

---

### Test 3: Project Agent (Inside Project)
**Location:** Project Detail Page (/projects/:id)

**Prerequisites:**
1. Create a project first using Test 2
2. Navigate to the project detail page
3. Go to the "Chat" tab

**Test Message:**
```
I'm stuck on the first milestone
```

**Expected Behavior:**
- ✅ Response references the project context
- ✅ Provides milestone-specific guidance
- ✅ Supportive and adaptive tone
- ✅ Console log shows: "Using agent: project"

---

### Test 4: Discovery Agent (Trends)
**Location:** Main Chat Page (/)

**Test Message:**
```
What are the latest trends in AI?
```

**Expected Behavior:**
- ✅ Concise, actionable insights
- ✅ Mentions current tools/technologies
- ✅ Focused on practical information
- ✅ Console log shows: "Using agent: discovery"

---

## 🔍 Debugging

### Check Console Logs
Open browser DevTools (F12) and look for:
```
Using agent: general
Using agent: consultation
Using agent: project
Using agent: discovery
```

### Check Network Tab
1. Open DevTools → Network tab
2. Filter: `chat`
3. Send a message
4. Check the response:
   - Status: `200 OK`
   - Content-Type: `text/event-stream`
   - Response Preview: Should see `data: {"content":"..."}` format

### If Streaming Doesn't Work
Check `src/lib/api.ts` - the `streamChat` function should:
- Parse lines starting with `data: `
- Extract JSON content
- Call `onChunk()` for each content piece
- Call `onComplete()` when `[DONE]` received

---

## ✅ Success Criteria

All tests pass if:
1. **Streaming works**: Messages appear word-by-word
2. **Agent routing works**: Console shows correct agent type
3. **Responses are contextual**: Each agent has distinct personality
4. **No errors**: No red errors in console or network tab
5. **Loading animation shows**: Loader2 spinner appears while waiting

---

## 🐛 Common Issues

### Issue: "No response"
**Solution:** Check Netlify Functions are running:
```bash
# Should see: "◈ Netlify Dev ◈" with functions loaded
```

### Issue: "API configuration error"
**Solution:** Check `.env` file has:
```
GROQ_API_KEY=your_key_here
```

### Issue: "Streaming not working"
**Solution:** 
1. Check backend returns `text/event-stream`
2. Check frontend parses `data: ` prefix
3. Verify `onChunk()` is called in ChatInterface

### Issue: "Wrong agent selected"
**Solution:** 
1. Check console log for agent type
2. Verify keywords match in `detectAgent()`
3. Ensure context is passed from frontend

---

## 📊 What to Look For

### General Agent Response Example:
> "Great question! Let's think of recursion like Russian nesting dolls 🪆..."
> 
> "The simplest mental model: A function calling itself with a smaller problem..."

### Consultation Agent Response Example:
> "Awesome! I'd love to help you create a learning project. Let me understand your goals better:"
> 
> "1. What specific topic or skill are you looking to learn?"

### Project Agent Response Example:
> "I see you're working on Milestone 1: Python Basics. Let's tackle this together!"
> 
> "Based on your project goals, here's what you need to focus on..."

### Discovery Agent Response Example:
> "Here are the top AI trends in 2024:"
> 
> "1. **Multimodal AI**: Models combining text, image, and audio..."

---

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Mark "Test multi-agent backend" as complete
2. 🔄 Add Exa search integration
3. 🔄 Enhance roadmap with auto-fetched resources
4. 🔄 Add visual generation integration

If tests fail:
1. 🐛 Debug using console logs
2. 🔧 Check backend streaming format
3. 📝 Review agent detection logic
4. 💬 Ask for help with specific error messages
