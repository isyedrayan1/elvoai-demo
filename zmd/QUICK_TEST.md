# Quick Testing Guide for MindCoach

## 🎯 What to Test

### 1. Chat Isolation (Critical Fix)
**Test:** Verify messages don't bleed between chats

1. **Open homepage** (http://localhost:8081/)
2. **Type a message:** "Tell me about JavaScript"
3. **Wait for response**
4. **Click "New Chat"** button (+ icon in sidebar)
5. **Verify:** New chat should be EMPTY (no previous messages)
6. **Type new message:** "Explain Python"
7. **Go back to first chat** (click it in sidebar)
8. **Verify:** First chat still has JavaScript conversation, NOT Python

**Expected:** Each chat has its own isolated messages
**Previously Broken:** New chat showed all old messages

### 2. Project Chat Isolation
**Test:** Project chats are separate from general chats

1. **Create a project:** Click "Projects" → "+" → Follow chat to create project
2. **Open the project**
3. **Start a chat** in the project
4. **Type:** "Explain this concept"
5. **Go to homepage**
6. **Verify:** Project chat NOT shown in homepage chats
7. **Verify:** Homepage chats NOT shown in project

**Expected:** Complete separation between general and project chats

### 3. Context Awareness (NEW)
**Test:** AI knows about project, roadmap, progress

1. **Open a project chat**
2. **Type:** "What should I learn first?"
3. **Expected:** AI mentions the first milestone from roadmap
4. **Type:** "I don't understand [concept]"
5. **Type same question again later**
6. **Expected:** AI recognizes repeat question, tries different explanation

### 4. Resume Prompts (NEW)
**Test:** Continue where you left off

1. **Have an active conversation** in any chat
2. **Refresh the page** or close and reopen app
3. **Open homepage**
4. **Look for card:** "Continue where you left off?"
5. **Click "Continue"**
6. **Expected:** Opens that exact chat

### 5. Data Persistence
**Test:** Everything saves correctly

1. **Create chat** → Type messages
2. **Refresh page**
3. **Verify:** Chat still exists in sidebar
4. **Verify:** Messages still there
5. **Create project**
6. **Refresh page**
7. **Verify:** Project still exists

## ✅ What's Working

- ✅ Chat isolation (messages stay in their chat)
- ✅ Project chat isolation (separate from general chats)
- ✅ Database persistence (localStorage)
- ✅ Context manager (RAG system ready)
- ✅ Sidebar loads from DB
- ✅ Mobile UI (floating toggle)
- ✅ All core pages (Explore, ProjectDetail, Upskill, Discover)

## 🚀 Dev Server

**Running on:** http://localhost:8081/
**Backend:** Netlify functions at /.netlify/functions/

## 🎯 Success Criteria

✅ New chats start EMPTY
✅ Switching chats shows correct messages
✅ Projects isolated from general chats
✅ Data persists after refresh
✅ AI mentions roadmap in project chats
✅ Sidebar updates when creating chats
✅ Mobile UI works properly

If all above pass → **Implementation Complete!** 🎉
