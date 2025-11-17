# Quick Test Guide: Discover Page Updates

## Prerequisites
- Dev server running: `npm run dev`
- Browser at: `http://localhost:8080/discover`
- Exa API key configured in environment

## Test Scenarios

### ✅ Test 1: Exa.ai Content Loading (No Projects)
**Steps:**
1. Clear localStorage: Open DevTools → Application → Local Storage → Delete all
2. Refresh Discover page
3. Verify header shows: "Real-time industry insights powered by AI"
4. Verify badge shows: "🌟 Live Feed"
5. Click "Next Skills" tab
6. Wait for content to load

**Expected:**
- Content loads from Exa.ai (not RSS feeds)
- Cards show recent programming tutorials
- No "Reddit" or "Hacker News" heavy content
- 12 results displayed
- Each card has bookmark icon (outline)

---

### ✅ Test 2: Personalized Content (With Projects)
**Steps:**
1. Go to Projects page
2. Create 2 projects: "React Advanced Patterns", "Docker Fundamentals"
3. Return to Discover page
4. Verify header shows: "Personalized for your 2 learning projects"
5. Verify badge shows: "🌟 Smart Feed"

**Expected:**
- Content related to React and Docker
- Queries include user's project topics
- More targeted results than Test 1

---

### ✅ Test 3: Bookmark Functionality
**Steps:**
1. On Discover page, click bookmark icon on first card
2. Verify icon fills with color
3. Verify toast appears: "📌 Bookmarked!"
4. Verify header button shows: "Bookmarks (1)"
5. Click bookmark icon again
6. Verify icon becomes outline
7. Verify toast appears: "Removed from bookmarks"
8. Verify header button shows: "Bookmarks"

**Expected:**
- Bookmark icon toggles between outline/filled
- Toast notifications appear
- Count updates in real-time
- localStorage 'elvo-bookmarks' updates

---

### ✅ Test 4: Bookmarks Sidebar
**Steps:**
1. Bookmark 3 different articles
2. Click "Bookmarks" button in header
3. Verify sidebar slides in from right
4. Verify 3 bookmarked items shown
5. Click "X" on one item
6. Verify item removed
7. Verify toast: "Removed from bookmarks"
8. Verify count updates to (2)

**Expected:**
- Sidebar slides smoothly from right
- All bookmarked items displayed
- Each has: title, description, category badge
- X button removes bookmark
- Add to Path button visible
- External link button visible

---

### ✅ Test 5: Add to Path from Bookmarks
**Steps:**
1. Open bookmarks sidebar
2. Click "Add to Path" on a bookmark
3. Verify toast: "Creating learning path..."
4. Wait for completion
5. Verify toast: "✅ Project created!"
6. Go to Projects page
7. Verify new project exists

**Expected:**
- Project created with bookmark as resource
- Roadmap generation triggered
- Resource has: quality=5, addedBy='user'
- Project appears in Projects list

---

### ✅ Test 6: Search Results Bookmarking
**Steps:**
1. In search box, type: "Next.js 14 features"
2. Click search
3. Wait for Exa results
4. Click bookmark icon on first result
5. Verify bookmark saved
6. Open bookmarks sidebar
7. Verify search result appears with "Search Result" category

**Expected:**
- Search results also have bookmark icons
- Bookmarking works same as feed items
- Category shows "Search Result"
- All metadata preserved

---

### ✅ Test 7: Persistence Across Sessions
**Steps:**
1. Bookmark 3 articles
2. Close browser completely
3. Reopen browser
4. Navigate to Discover page
5. Verify bookmarks still exist
6. Click "Bookmarks" button

**Expected:**
- All 3 bookmarks restored from localStorage
- No data loss
- Count badge shows (3)
- Sidebar shows all items

---

### ✅ Test 8: Empty Bookmarks State
**Steps:**
1. Clear all bookmarks (remove all items from sidebar)
2. Click "Bookmarks" button

**Expected:**
- Empty state shown
- Large faded bookmark icon
- Text: "No bookmarks yet"
- Help text: "Click the bookmark icon on any discovery to save it"

---

### ✅ Test 9: Category Switching
**Steps:**
1. Click "Next Skills" tab → wait for content
2. Click "Trending" tab → wait for content
3. Click "Tools" tab → wait for content
4. Click "Quick Wins" tab → wait for content
5. Click "Success" tab → wait for content

**Expected:**
- Each tab loads different Exa query
- Content changes based on category
- All cards have bookmark icons
- Loading skeletons shown while fetching
- Auto-refetch every 5 minutes

---

### ✅ Test 10: Responsive Design
**Steps:**
1. Resize browser to mobile width (<640px)
2. Verify layout adapts
3. Click "Bookmarks" button
4. Verify sidebar takes full width

**Expected:**
- Mobile: Single column grid
- Mobile: Icon-only tabs
- Mobile: "Bookmarks" text hidden
- Mobile: Sidebar full screen width
- Desktop: 2-column grid, full text

---

## DevTools Checks

### localStorage Inspection
```javascript
// Open DevTools Console:
localStorage.getItem('elvo-bookmarks')
// Should return: JSON array of bookmarked items

// Parse and view:
JSON.parse(localStorage.getItem('elvo-bookmarks'))
```

### Network Tab
- Check for calls to: `/.netlify/functions/exa-search`
- Verify POST body includes: query, type, numResults, useAutoprompt
- Verify response includes: results array with title, url, score, text

### Console Errors
- No errors should appear
- No warnings about missing keys
- No CORS issues

---

## Quick Fixes

### If content doesn't load:
1. Check Exa API key: `process.env.EXA_API_KEY`
2. Check network tab for 500 errors
3. Verify exa-search function is deployed
4. Check function logs in Netlify dashboard

### If bookmarks don't persist:
1. Check localStorage quota (shouldn't be full)
2. Verify 'elvo-bookmarks' key exists
3. Check browser privacy settings (localStorage enabled)

### If sidebar doesn't open:
1. Verify Sheet component imported correctly
2. Check `isBookmarksOpen` state
3. Verify SheetTrigger onClick handler

---

## Success Criteria

✅ All 10 tests pass  
✅ No console errors  
✅ Content loads from Exa.ai (not RSS)  
✅ Bookmarks persist across sessions  
✅ Sidebar slides smoothly  
✅ Toast notifications appear  
✅ Personalization works with projects  
✅ Add to Path creates complete projects  
✅ Mobile responsive  
✅ No TypeScript errors
