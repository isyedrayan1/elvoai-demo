# 🎯 SETUP CHECKLIST - Start Here!

## ✅ Step 1: Run Database Schema (5 minutes)

1. **Open Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard
   - Select your project: `vlnqjqxiiloxztzeokcn`

2. **Run SQL Schema**:
   - Click **SQL Editor** in left sidebar
   - Click **New Query**
   - Open `supabase-schema.sql` in your code editor
   - **Copy ALL contents** (Ctrl+A, Ctrl+C)
   - **Paste** into Supabase SQL editor
   - Click **Run** (bottom right green button)
   
3. **Verify Tables Created**:
   - Click **Table Editor** in left sidebar
   - You should see 8 tables:
     - ✅ users
     - ✅ chats
     - ✅ messages
     - ✅ projects
     - ✅ project_chats
     - ✅ resources
     - ✅ embeddings
     - ✅ discover_feed

4. **Enable Realtime** (for cross-tab sync):
   - In **Table Editor**, click each table
   - Go to **Replication** tab
   - Toggle **Realtime** ON for:
     - chats
     - messages
     - projects
     - project_chats

---

## ✅ Step 2: Test Locally (2 minutes)

Open your terminal and run:

```powershell
netlify dev
```

**Expected output**:
```
◈ Netlify Dev ◈
◈ Injecting environment variable values...
◈ Starting Netlify Dev with vite
  
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8888/
  ➜  Network: use --host to expose

◈ Functions server is listening on 50739
```

**If it works**: Visit http://localhost:8888

---

## ✅ Step 3: Test Discover Page (1 minute)

1. Open browser: http://localhost:8888
2. Click **Discover** in sidebar
3. **You should see**:
   - Live RSS feed cards (Hacker News, Reddit, Dev.to)
   - Category tabs (Trending, AI & ML, Web Dev, Tech)
   - AI search bar at top
   - "Live Feed" badge

4. **Test AI Search**:
   - Type: "react server components tutorial"
   - Click Search button
   - Wait 2-3 seconds
   - **You should see**: Neural search results with highlights

---

## 🐛 Troubleshooting

### Issue: "netlify: command not found"
**Fix**:
```powershell
npm install -g netlify-cli
```

### Issue: "Missing environment variables"
**Fix**: 
- Check `.env` file exists in project root
- Contains all keys from `.env.example`

### Issue: "Port 8888 already in use"
**Fix**:
```powershell
npx kill-port 8888
netlify dev
```

### Issue: Discover page shows "Failed to fetch feed"
**Fix**:
- Make sure `netlify dev` is running
- Check terminal for errors
- Try refreshing the page

### Issue: Exa search not working
**Fix**:
- Verify `EXA_API_KEY` in `.env`
- Check browser console for errors
- Try a different search query

---

## 🎯 What Should Work Now

### ✅ Working Features:
1. **Discover Page**:
   - Real-time RSS feeds
   - Category filtering
   - AI-powered semantic search (Exa.ai)
   - Auto-refresh every 60 seconds

2. **Backend Functions**:
   - `/api/discover` → RSS feed aggregation
   - `/api/exa-search` → Neural web search
   - `/api/chat` → Groq streaming (not connected to UI yet)

3. **Database**:
   - Schema created
   - Tables ready
   - RLS policies active

### 🔨 Not Working Yet (Coming Next):
1. **Chat Interface**: Still using localStorage, not Supabase
2. **Authentication**: No login/signup yet
3. **Projects**: Still localStorage
4. **RAG**: No embeddings/semantic search on chats yet

---

## 🚀 Next Development Phases

### **Phase 1: Migrate Chat to Supabase** (30 min)
- Replace localStorage with Supabase queries
- Connect streaming chat to `/api/chat`
- Enable realtime cross-tab sync

### **Phase 2: Add Authentication** (20 min)
- Supabase Auth integration
- Login/signup UI
- Protected routes

### **Phase 3: Implement RAG** (40 min)
- Embed messages with JINA
- Store in pgvector
- Semantic search on chat history

### **Phase 4: Visual Enhancements** (30 min)
- Mermaid.js diagrams
- Fal.ai image generation
- Supabase Storage integration

---

## 📊 Current Tech Stack Summary

```
Frontend:
├─ React 18 + TypeScript + Vite
├─ TanStack Query (data fetching)
├─ shadcn/ui + Tailwind (UI)
└─ Supabase Client (realtime + auth)

Backend:
├─ Netlify Functions (serverless)
├─ Supabase PostgreSQL (database)
├─ pgvector (vector similarity)
└─ Realtime (WebSocket sync)

AI/APIs:
├─ Groq (Qwen 3, Llama 3.3 70B)
├─ Exa.ai (neural search)
├─ JINA AI (embeddings)
└─ RSS Feeds (news aggregation)
```

---

## 💡 Quick Tips

1. **Development Workflow**:
   ```powershell
   netlify dev          # Start dev server
   Ctrl+C               # Stop server
   ```

2. **Check Function Logs**:
   - Terminal shows function invocations
   - Look for: `◈ Invoking function: chat`

3. **Browser DevTools**:
   - F12 → Network tab
   - Filter by `/api/` to see function calls

4. **Hot Reload**:
   - Frontend: Auto-reloads on save
   - Functions: Need to restart `netlify dev`

---

## 🎓 Documentation Links

- **Setup Guide**: `BACKEND_SETUP.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Database Schema**: `supabase-schema.sql`
- **Environment Template**: `.env.example`

---

## ✅ Success Criteria

**You're ready to move forward when**:

1. ✅ `netlify dev` runs without errors
2. ✅ Discover page loads with real RSS articles
3. ✅ AI search returns results with highlights
4. ✅ Supabase tables visible in dashboard
5. ✅ No console errors in browser

---

**🎉 Once you see the Discover page working, you're 70% done!**

Next: Let me know if you want to tackle chat migration or authentication first.
