# Discover Page: Exa.ai Integration + Bookmarks Feature

## Overview
Replaced RSS feeds with **Exa.ai neural search** for dynamic, personalized content discovery. Added a **bookmarks sidebar** to save interesting discoveries for later.

## What Changed

### 1. **Exa.ai Content Discovery** (Replaced RSS)
Previously, Discover used static RSS feeds from Reddit/Hacker News. Now it uses **Exa.ai semantic search** to find fresh, relevant content based on:
- **User's learning projects** (topics from their existing projects)
- **Active category** (Next Skills, Trending, Tools, Quick Wins, Success)

#### Query Generation Logic:
```typescript
const queryMap = {
  'next-skills': userTopics 
    ? `advanced tutorials and courses for ${userTopics}` 
    : 'trending programming tutorials and web development courses',
  'trending': userTopics 
    ? `latest news and trends in ${userTopics}` 
    : 'latest tech news and software development trends',
  'tools': userTopics 
    ? `best developer tools and libraries for ${userTopics}` 
    : 'best developer tools frameworks and libraries',
  'quick-wins': userTopics 
    ? `quick tips and tricks for ${userTopics}` 
    : 'programming tips tricks and productivity hacks',
  'success': userTopics 
    ? `success stories and case studies in ${userTopics}` 
    : 'tech success stories and developer achievements'
}
```

**Dynamic Personalization:**
- Extracts topics from user's projects: `userProjects.map(p => p.title || p.description).join(', ')`
- Builds context-aware search queries
- Fetches 12 results per category using `/.netlify/functions/exa-search`
- Auto-refreshes every 5 minutes

### 2. **Bookmarks Sidebar**
Slide-out sidebar from the right side to save and manage bookmarked discoveries.

#### Features:
- **Bookmark Button**: Click the bookmark icon on any card to save it
- **Visual Feedback**: Filled bookmark icon for saved items
- **Bookmarks Sidebar**: 
  - Triggered by "Bookmarks" button in header (shows count badge)
  - Slides from right using `Sheet` component
  - Shows all saved discoveries
  - Click "X" to remove bookmark
  - "Add to Path" button to create project from bookmark
  - "Read" button to open original URL

#### Storage:
- Saved in localStorage as `elvo-bookmarks`
- Persists across sessions
- Loaded on page mount

#### Toast Notifications:
- **Bookmarked**: "📌 Bookmarked! \"[title]\" saved for later."
- **Removed**: "Removed from bookmarks \"[title]\" has been removed."

### 3. **Bookmark Functions**

```typescript
// Add/remove bookmark
const handleBookmark = (item: FeedItem) => {
  const isBookmarked = bookmarks.some(b => b.id === item.id);
  
  if (isBookmarked) {
    const newBookmarks = bookmarks.filter(b => b.id !== item.id);
    setBookmarks(newBookmarks);
    localStorage.setItem('elvo-bookmarks', JSON.stringify(newBookmarks));
    toast({ title: "Removed from bookmarks" });
  } else {
    const newBookmarks = [...bookmarks, item];
    setBookmarks(newBookmarks);
    localStorage.setItem('elvo-bookmarks', JSON.stringify(newBookmarks));
    toast({ title: "📌 Bookmarked!" });
  }
};

// Check if item is bookmarked
const isBookmarked = (itemId: string) => {
  return bookmarks.some(b => b.id === itemId);
};
```

## UI Components

### Header with Bookmarks Button
```tsx
<div className="flex items-center gap-2">
  <Badge variant="outline">
    <Sparkles className="h-3 w-3" />
    {userProjects.length > 0 ? 'Smart Feed' : 'Live Feed'}
  </Badge>
  <Sheet open={isBookmarksOpen} onOpenChange={setIsBookmarksOpen}>
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" className="gap-2">
        <Bookmark className="h-4 w-4" />
        Bookmarks {bookmarks.length > 0 && <Badge>{count}</Badge>}
      </Button>
    </SheetTrigger>
    <SheetContent side="right">
      {/* Bookmarks list */}
    </SheetContent>
  </Sheet>
</div>
```

### Card with Bookmark Icon
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <Badge>{category}</Badge>
      <span>{date}</span>
      <Button onClick={() => handleBookmark(item)}>
        {isBookmarked(item.id) ? (
          <Bookmark className="fill-current text-primary" />
        ) : (
          <Bookmark />
        )}
      </Button>
    </div>
    <CardTitle>{title}</CardTitle>
  </CardHeader>
</Card>
```

## Data Flow

### 1. **On Page Load:**
```
User loads Discover page
  ↓
Fetch user's projects from localStorage (db.getProjects())
  ↓
Load saved bookmarks from localStorage ('elvo-bookmarks')
  ↓
Generate Exa search query based on projects + category
  ↓
Call /.netlify/functions/exa-search with query
  ↓
Transform Exa results to FeedItem format
  ↓
Display cards with bookmark icons
```

### 2. **When User Bookmarks:**
```
User clicks bookmark icon
  ↓
Check if already bookmarked
  ↓
If bookmarked → Remove from array
If not → Add to array
  ↓
Save to localStorage ('elvo-bookmarks')
  ↓
Update UI state
  ↓
Show toast notification
```

### 3. **Bookmarks Sidebar:**
```
User clicks "Bookmarks" button
  ↓
Sidebar slides in from right
  ↓
Display all bookmarked items
  ↓
User can:
  - Remove bookmark (X button)
  - Add to learning path (BookmarkPlus button)
  - Read original article (ExternalLink button)
```

## Benefits

### ✅ **Dynamic Content**
- Real-time search results instead of static RSS feeds
- Content adapts to user's learning journey
- Always fresh and relevant

### ✅ **Personalization**
- Queries built from user's project topics
- Smarter recommendations as they create more projects
- Fallback to general tech content for new users

### ✅ **Better Quality**
- Exa.ai's neural search finds high-quality sources
- Eliminates Reddit-heavy content
- More diverse sources (blogs, tutorials, docs, articles)

### ✅ **Bookmarking**
- Save interesting discoveries for later
- Persistent storage across sessions
- Easy conversion to learning projects
- Organized sidebar view

## File Changes

### Modified:
- **src/pages/Discover.tsx**
  - Replaced RSS feed query with Exa.ai search
  - Added bookmarks state management
  - Added `handleBookmark()` and `isBookmarked()` functions
  - Added bookmarks sidebar (Sheet component)
  - Added bookmark icons to all cards (feed + search results)
  - Updated header with bookmarks button

### Unchanged:
- **netlify/functions/exa-search.ts** (already configured)
- **netlify/functions/discover.ts** (still exists but not used anymore)
- **src/lib/db.ts** (localStorage management)

## Testing Checklist

- [ ] Load Discover page → See Exa.ai content (not RSS)
- [ ] Content changes based on active tab (Next Skills, Trending, etc.)
- [ ] If user has projects → See personalized queries
- [ ] If no projects → See general tech content
- [ ] Click bookmark icon → Item saved to localStorage
- [ ] Click again → Item removed
- [ ] Toast notifications appear on bookmark/unbookmark
- [ ] Click "Bookmarks" button → Sidebar slides from right
- [ ] Sidebar shows all bookmarked items
- [ ] Click "X" in sidebar → Removes bookmark
- [ ] Click "Add to Path" → Creates project with roadmap
- [ ] Click external link → Opens article in new tab
- [ ] Refresh page → Bookmarks persist
- [ ] Bookmark count badge updates correctly
- [ ] Search results also have bookmark buttons

## Next Steps (Optional)

1. **Export Bookmarks**: Add download as JSON/Markdown
2. **Collections**: Organize bookmarks into folders/tags
3. **Sharing**: Share bookmark collections with others
4. **Smart Reminders**: "You bookmarked this 7 days ago, have you read it?"
5. **Analytics**: Track which categories get bookmarked most
