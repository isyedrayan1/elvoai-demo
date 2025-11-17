# 🧪 Quick Testing Guide

## Start the App
```powershell
netlify dev
```

Wait for: `Local dev server ready: http://localhost:8888`

---

## Test 1: Chat with Intent Detection

**Open**: http://localhost:8888

**Try these queries** (copy-paste):

### 1. Casual Explanation
```
Explain how async/await works in JavaScript
```
**Expected**:
- ✅ Intent badge: "explanation"
- ✅ Streaming response
- ✅ Clear explanation with examples

### 2. Project Creation Trigger
```
I want to learn React from scratch
```
**Expected**:
- ✅ Intent badge: "project_creation"
- ✅ Offers to create roadmap
- ✅ Suggests saying "yes" or "create roadmap"

### 3. Resource Search
```
Find me the best courses on machine learning for beginners
```
**Expected**:
- ✅ Intent badge: "resource_search"
- ✅ Shows "Searching the web..." message
- ✅ Returns ~10 curated resources
- ✅ Shows quality stars (⭐⭐⭐⭐⭐)
- ✅ Marks free/paid (🆓 or 💰)

### 4. Deep Reasoning Question
```
Why does garbage collection in JavaScript use mark-and-sweep instead of reference counting?
```
**Expected**:
- ✅ Intent badge: "deep_learning"
- ✅ Uses reasoning model (Qwen 3 32B)
- ✅ Detailed step-by-step explanation

---

## Test 2: Project Creation Flow

**Open**: http://localhost:8888 → Click "Upskill" tab

### Steps:
1. Click "New Project" button
2. Enter: `Data Structures and Algorithms`
3. Level: `Intermediate`
4. Timeframe: `1 Month`
5. Goals (enter each on new line):
   ```
   Ace coding interviews
   Build portfolio projects
   Understand Big O notation
   ```
6. Click "Generate AI Learning Path"

**Expected** (~15 seconds):
- ✅ Shows "Generating roadmap..." animation
- ✅ Returns roadmap with:
  - Title: "Data Structures & Algorithms Learning Path" (or similar)
  - Description
  - 5-8 milestones
  - Each milestone has: objective, concepts, project, time estimate
- ✅ Shows ~10 curated resources
- ✅ Preview shows:
  - Milestone cards
  - Resource list with ratings
  - "Regenerate" and "Start Learning" buttons
7. Click "Start Learning"

**Expected**:
- ✅ Project card appears on Upskill page
- ✅ Shows progress bar (0%)
- ✅ Shows milestone count
- ✅ Shows resource count

---

## Test 3: Discover Feed

**Open**: http://localhost:8888 → Click "Discover" tab

### Test RSS Feed:
**Expected**:
- ✅ Loads articles from Hacker News, Reddit, Dev.to
- ✅ Shows category badges (AI, Tech, Web Dev)
- ✅ Shows timestamps ("3h ago", "1d ago")
- ✅ Auto-refreshes every 60s (wait and observe)

### Test AI Search:
1. Type in search box: `React Server Components tutorial`
2. Click search button

**Expected** (~3 seconds):
- ✅ Switches to "Search Results" tab
- ✅ Shows neural search results from Exa.ai
- ✅ Shows article titles, descriptions, URLs
- ✅ Shows relevance scores

---

## Test 4: Orchestration Flow (Advanced)

**Chat sequence** (copy-paste one by one):

```
1. "I want to become a full-stack developer"
```
- AI offers roadmap → **Say "yes"**

```
2. "yes"
```
- AI generates full roadmap with 8+ milestones
- Shows resources

```
3. "Can you explain what REST APIs are?"
```
- Intent switches to "explanation"
- Gives clear explanation

```
4. "Now find me courses on REST API design"
```
- Intent switches to "resource_search"
- Searches and curates courses

---

## 🐛 Troubleshooting

### Issue: "Failed to detect intent"
**Fix**: Check Groq API key in `.env`
```powershell
cat .env | Select-String "GROQ_API_KEY"
```

### Issue: "Failed to gather resources"
**Fix**: Check Exa API key
```powershell
cat .env | Select-String "EXA_API_KEY"
```

### Issue: Functions not loading
**Fix**: Restart netlify dev
```powershell
# Press Ctrl+C to stop
netlify dev
```

### Issue: Chat not streaming
**Fix**: Check browser console (F12)
- Should see: `POST /api/chat 200 OK`
- If 500 error, check Netlify function logs in terminal

---

## ✅ Success Checklist

After testing, you should have:

- ✅ Chat works with streaming responses
- ✅ Intent detection shows correct badges
- ✅ Project creation generates roadmaps (~15s)
- ✅ Resource gathering returns 10+ curated links
- ✅ Discover feed loads RSS articles
- ✅ Exa search returns relevant results
- ✅ All orchestration flows work (chat → project → resources)

---

## 📊 Performance Expectations

| Feature | Response Time | Quality |
|---------|---------------|---------|
| Chat streaming | 2-5 seconds | High (Llama 3.3 70B) |
| Intent detection | 1-2 seconds | Very High (function calling) |
| Roadmap generation | 8-15 seconds | Very High (Qwen 3 32B) |
| Resource gathering | 10-20 seconds | High (Exa + LLM curation) |
| Discover feed | 1-3 seconds | Medium (RSS freshness varies) |
| Exa search | 2-4 seconds | Very High (neural search) |

---

## 🎯 Next Steps After Testing

If everything works:
1. ✅ You have a production-ready AI learning platform
2. ✅ All features work without backend database (using orchestration)
3. ✅ $0/month cost on free tiers

Optional enhancements:
- Add Mermaid.js for visual roadmaps
- Add Supabase Auth for user accounts
- Migrate from localStorage to Supabase
- Add RAG for contextual memory
- Add Fal.ai for image generation

---

**Start testing now**: `netlify dev` → http://localhost:8888 🚀
