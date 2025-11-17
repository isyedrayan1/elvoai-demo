# MindCoach Backend Setup Guide

## 🚀 Quick Start

This guide will help you set up the complete backend infrastructure for MindCoach using **Supabase** + **Netlify**.

---

## 📋 Prerequisites

1. Node.js 18+ installed
2. Supabase account (free tier: https://supabase.com)
3. Netlify account (free tier: https://netlify.com)
4. API keys for:
   - Groq (https://console.groq.com)
   - JINA AI (https://jina.ai)
   - (Optional) DeepSeek (https://platform.deepseek.com)
   - (Optional) Fal.ai (https://fal.ai)

---

## 🗄️ Step 1: Setup Supabase Database

### 1.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: `mindcoach` (or your preferred name)
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to you
4. Wait for project provisioning (~2 minutes)

### 1.2 Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from this repo
4. Paste into the SQL editor
5. Click **Run** (bottom right)
6. ✅ Verify: You should see tables created under **Table Editor**

### 1.3 Enable Realtime (for cross-tab sync)

1. Go to **Database** → **Replication**
2. Find the `chats` table
3. Toggle **Realtime** ON
4. Repeat for: `messages`, `projects`, `project_chats`

### 1.4 Setup Storage Buckets

1. Go to **Storage** in sidebar
2. Create 3 buckets:

**Bucket 1: chat-diagrams**
- Name: `chat-diagrams`
- Public: ✅ ON
- File size limit: 5 MB
- Allowed MIME types: `image/svg+xml, image/png`

**Bucket 2: ai-images**
- Name: `ai-images`
- Public: ✅ ON
- File size limit: 10 MB
- Allowed MIME types: `image/png, image/jpeg, image/webp`

**Bucket 3: user-uploads**
- Name: `user-uploads`
- Public: ❌ OFF (private)
- File size limit: 20 MB
- Allowed MIME types: `image/*, application/pdf`

### 1.5 Enable Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** (already enabled by default)
3. (Optional) Enable **Google OAuth**:
   - Click Google
   - Toggle Enabled
   - Add Client ID and Secret from Google Cloud Console

### 1.6 Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ Keep secret! Server-side only)

---

## 🔑 Step 2: Setup Environment Variables

### 2.1 Create `.env` file

```bash
# Copy example file
cp .env.example .env
```

### 2.2 Fill in values in `.env`

```env
# Supabase (from Step 1.6)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Groq API (https://console.groq.com)
VITE_GROQ_API_KEY=gsk_xxxxx

# JINA AI (https://jina.ai/embeddings)
VITE_JINA_API_KEY=jina_xxxxx

# Optional: DeepSeek for reasoning
VITE_DEEPSEEK_API_KEY=sk-xxxxx

# Optional: Fal.ai for image generation
VITE_FAL_API_KEY=xxxxx

# Server-side keys (for Netlify Functions)
SUPABASE_SERVICE_KEY=your_service_role_key
GROQ_API_KEY=gsk_xxxxx
DEEPSEEK_API_KEY=sk-xxxxx
JINA_API_KEY=jina_xxxxx
FAL_API_KEY=xxxxx
```

⚠️ **Important**: 
- `VITE_*` variables are exposed to the browser
- Non-prefixed variables are server-side only (Netlify Functions)

---

## 📦 Step 3: Install Dependencies

```bash
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase client
- `groq-sdk` - Groq AI streaming
- `rss-parser` - RSS feed parsing
- `@netlify/functions` - Netlify Functions types

---

## 🧪 Step 4: Test Locally

### 4.1 Install Netlify CLI

```bash
npm install -g netlify-cli
```

### 4.2 Run development server

```bash
netlify dev
```

This will:
- Start Vite dev server (port 8080)
- Start Netlify Functions emulator
- Proxy `/api/*` to `/.netlify/functions/*`

### 4.3 Test endpoints

Open in browser:
- **Frontend**: http://localhost:8080
- **Chat API**: http://localhost:8080/api/chat (POST)
- **Discover API**: http://localhost:8080/api/discover (GET)

---

## 🚀 Step 5: Deploy to Netlify

### 5.1 Link to Netlify

```bash
netlify init
```

Follow prompts:
1. "Create & configure a new site"
2. Choose team
3. Site name: `mindcoach` (or preferred)
4. Build command: `npm run build`
5. Publish directory: `dist`

### 5.2 Add Environment Variables in Netlify

1. Go to Netlify dashboard → Your site → **Site settings** → **Environment variables**
2. Add all variables from `.env` (both `VITE_*` and server-side)

### 5.3 Deploy

```bash
netlify deploy --prod
```

✅ Your site is now live!

---

## 🔐 Step 6: Configure Supabase for Production

### 6.1 Add Netlify URL to Supabase

1. In Supabase dashboard → **Authentication** → **URL Configuration**
2. Add your Netlify URL to **Site URL**: `https://your-site.netlify.app`
3. Add to **Redirect URLs**: `https://your-site.netlify.app/**`

### 6.2 Update CORS (if needed)

1. Go to **Settings** → **API** → **CORS settings**
2. Add your Netlify URL

---

## 🧪 Testing Checklist

After setup, test these features:

- [ ] **Authentication**: Sign up with email
- [ ] **Chat**: Send message, get AI response (streaming)
- [ ] **Chat History**: Create chat, see in sidebar
- [ ] **Cross-tab sync**: Open 2 tabs, create chat in one, see in other
- [ ] **Discover Feed**: Load RSS articles
- [ ] **Projects**: Create project (conversational flow)
- [ ] **Resources**: Add resource to project

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution**: Check `.env` file exists and has correct values

### Issue: Netlify Functions not working locally
**Solution**: 
```bash
# Kill any running processes on port 8080
npx kill-port 8080
# Restart
netlify dev
```

### Issue: CORS errors
**Solution**: Add Netlify URL to Supabase CORS settings (Step 6.2)

### Issue: Chat streaming not working
**Solution**: Check Groq API key is valid, check browser console for errors

### Issue: Database connection failed
**Solution**: Verify Supabase URL and anon key are correct in `.env`

---

## 📊 Monitoring & Limits

### Supabase Free Tier Limits
- **Database**: 500 MB
- **Storage**: 1 GB
- **Bandwidth**: 2 GB/month
- **Realtime**: 200 concurrent connections

### Groq Free Tier Limits
- **Requests**: 14,400/day
- **Rate limit**: 6,000 requests/minute
- **Models**: Llama 3.3 70B, Mixtral 8x7B

### Netlify Free Tier Limits
- **Bandwidth**: 100 GB/month
- **Build minutes**: 300/month
- **Function invocations**: 125K/month

---

## 🎯 Next Steps

1. **Add DeepSeek R1** for reasoning queries (optional)
2. **Implement RAG** with JINA Embeddings + pgvector
3. **Add Mermaid.js** for diagram generation
4. **Setup Fal.ai** for AI image generation
5. **Add analytics** with Langfuse or Helicone

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **Netlify Functions**: https://docs.netlify.com/functions/overview/
- **Groq API**: https://console.groq.com/docs
- **JINA Embeddings**: https://jina.ai/embeddings
- **pgvector Guide**: https://supabase.com/docs/guides/ai/vector-columns

---

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Check Netlify function logs: `netlify functions:log`
3. Check Supabase logs in dashboard
4. Review this guide's troubleshooting section

**Happy building! 🚀**
