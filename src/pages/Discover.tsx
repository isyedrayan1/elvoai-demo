import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TrendingUp, Target, Wrench, Zap, Star, Search, ExternalLink, Sparkles, Loader2, BookmarkPlus, Bookmark, X, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface FeedItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  category: string;
  published_at: string;
}

interface ExaResult {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score: number;
  text: string;
  highlights?: string[];
  summary?: string;
}

const Discover = () => {
  const [activeTab, setActiveTab] = useState("next-skills");
  const [searchQuery, setSearchQuery] = useState("");
  const [exaQuery, setExaQuery] = useState("");
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<FeedItem[]>([]);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch user's projects for context and load bookmarks
  useEffect(() => {
    const projects = db.getProjects();
    setUserProjects(projects || []);
    
    // Load bookmarks from localStorage
    const savedBookmarks = localStorage.getItem('elvo-bookmarks');
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }
  }, []);

  // Fetch content using Exa.ai based on user context
  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useQuery<{ items: FeedItem[]; total: number }>({
    queryKey: ['discover-feed', activeTab, userProjects.map(p => p.id)],
    queryFn: async () => {
      // Build search query based on user's projects and active tab
      const userTopics = userProjects.map(p => p.title || p.description).join(', ');
      
      const queryMap: Record<string, string> = {
        'next-skills': userTopics ? `advanced tutorials and courses for ${userTopics}` : 'trending programming tutorials and web development courses',
        'trending': userTopics ? `latest news and trends in ${userTopics}` : 'latest tech news and software development trends',
        'tools': userTopics ? `best developer tools and libraries for ${userTopics}` : 'best developer tools frameworks and libraries',
        'quick-wins': userTopics ? `quick tips and tricks for ${userTopics}` : 'programming tips tricks and productivity hacks',
        'success': userTopics ? `success stories and case studies in ${userTopics}` : 'tech success stories and developer achievements'
      };
      
      const searchQuery = queryMap[activeTab] || 'software development and programming';
      
      const response = await fetch('/.netlify/functions/exa-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          type: 'auto',
          numResults: 12,
          useAutoprompt: true,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      
      // Helper function to clean description text
      const cleanDescription = (text: string) => {
        if (!text) return '';
        
        // Remove code blocks and snippets
        let cleaned = text.replace(/```[\s\S]*?```/g, '');
        cleaned = cleaned.replace(/`[^`]+`/g, '');
        
        // Remove URLs
        cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
        
        // Remove special characters and excessive whitespace
        cleaned = cleaned.replace(/[#*_\[\](){}]/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        // Take first 150 characters and ensure it ends at a word
        if (cleaned.length > 150) {
          cleaned = cleaned.substring(0, 150);
          const lastSpace = cleaned.lastIndexOf(' ');
          if (lastSpace > 100) {
            cleaned = cleaned.substring(0, lastSpace) + '...';
          } else {
            cleaned = cleaned + '...';
          }
        }
        
        return cleaned.trim();
      };
      
      // Transform Exa results to FeedItem format
      const items = data.results.map((result: ExaResult, index: number) => ({
        id: result.id || `item-${index}`,
        title: result.title,
        description: cleanDescription(result.text || result.summary || ''),
        url: result.url,
        source: new URL(result.url).hostname.replace('www.', ''),
        category: activeTab.replace('-', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        published_at: result.publishedDate || new Date().toISOString()
      }));
      
      return { items, total: items.length };
    },
    enabled: activeTab !== 'search',
    refetchInterval: 300000, // Refresh every 5 min
  });

  // Refresh feed when projects change
  useEffect(() => {
    if (userProjects.length > 0 && activeTab !== 'search') {
      refetchFeed();
    }
  }, [userProjects.length]);

  // Exa semantic search
  const { data: exaData, isLoading: exaLoading, refetch: searchExa } = useQuery<{ results: ExaResult[]; total: number }>({
    queryKey: ['exa-search', exaQuery],
    queryFn: async () => {
      const response = await fetch('/.netlify/functions/exa-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: exaQuery,
          type: 'auto',
          numResults: 15,
          useAutoprompt: true,
        }),
      });
      if (!response.ok) throw new Error('Failed to search');
      return response.json();
    },
    enabled: false, // Manual trigger only
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setExaQuery(searchQuery);
      setActiveTab('search');
      searchExa();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchFeed();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const handleBookmark = (item: FeedItem) => {
    const isBookmarked = bookmarks.some(b => b.id === item.id);
    
    if (isBookmarked) {
      const newBookmarks = bookmarks.filter(b => b.id !== item.id);
      setBookmarks(newBookmarks);
      localStorage.setItem('elvo-bookmarks', JSON.stringify(newBookmarks));
      toast({
        title: "Removed from bookmarks",
        description: `"${item.title}" has been removed.`,
      });
    } else {
      const newBookmarks = [...bookmarks, item];
      setBookmarks(newBookmarks);
      localStorage.setItem('elvo-bookmarks', JSON.stringify(newBookmarks));
      toast({
        title: "📌 Bookmarked!",
        description: `"${item.title}" saved for later.`,
      });
    }
  };

  const isBookmarked = (itemId: string) => {
    return bookmarks.some(b => b.id === itemId);
  };

  const handleAddToPath = async (item: FeedItem) => {
    toast({
      title: "Creating learning path...",
      description: "Generating roadmap and resources",
    });

    try {
      // Create project with basic info first
      const projectId = `project-${Date.now()}`;
      const tempProject = {
        id: projectId,
        title: item.title,
        description: item.description,
        level: 'intermediate' as const,
        resources: [{
          id: '1',
          title: item.title,
          url: item.url,
          type: 'article' as const,
          level: 'intermediate' as const,
          quality: 5,
          description: item.description,
          topics: [item.category],
          estimatedTime: '15 min',
          isPaid: false,
          addedBy: 'user' as const,
          addedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }],
        chats: [],
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveProject(tempProject);
      setUserProjects(db.getProjects());

      // Generate detailed roadmap in background
      const roadmapResponse = await fetch('/.netlify/functions/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: item.title,
          level: 'intermediate',
          description: item.description
        })
      });

      if (roadmapResponse.ok) {
        const { roadmap } = await roadmapResponse.json();
        
        // Update project with roadmap
        const updatedProject = {
          ...tempProject,
          roadmap,
          updatedAt: new Date().toISOString()
        };
        
        db.saveProject(updatedProject);
        setUserProjects(db.getProjects());

        toast({
          title: "✨ Learning path created!",
          description: `"${item.title}" with full roadmap added to Projects`,
          action: (
            <Button size="sm" onClick={() => navigate('/projects')}>
              View
            </Button>
          )
        });
      } else {
        toast({
          title: "✅ Project created!",
          description: `"${item.title}" added. Roadmap generation in progress...`,
        });
      }
    } catch (error) {
      toast({
        title: "✅ Project created!",
        description: `"${item.title}" added to your projects.`,
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'AI': 'bg-purple-500/10 text-purple-500',
      'Tech': 'bg-blue-500/10 text-blue-500',
      'Web Dev': 'bg-green-500/10 text-green-500',
    };
    return colors[category] || 'bg-gray-500/10 text-gray-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Discover</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {userProjects.length > 0 
              ? `Personalized for your ${userProjects.length} learning project${userProjects.length > 1 ? 's' : ''}`
              : 'Real-time industry insights powered by AI'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {userProjects.length > 0 ? 'Smart Feed' : 'Live Feed'}
          </Badge>
          <Sheet open={isBookmarksOpen} onOpenChange={setIsBookmarksOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Bookmarks</span>
                {bookmarks.length > 0 && <Badge variant="secondary" className="ml-1">{bookmarks.length}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5" />
                  Saved Discoveries
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {bookmarks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No bookmarks yet</p>
                    <p className="text-sm mt-2">Click the bookmark icon on any discovery to save it</p>
                  </div>
                ) : (
                  bookmarks.map((item) => (
                    <Card key={item.id} className="border-border hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleBookmark(item)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {item.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => handleAddToPath(item)}
                            >
                              <BookmarkPlus className="h-4 w-4 mr-1" />
                              Add to Path
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              asChild
                            >
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* AI-Powered Search */}
      <Card className="border-accent/20 bg-accent/5">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            AI-Powered Web Search
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Search the entire web using neural semantic search powered by Exa.ai
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search for AI news, web dev trends, tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 h-10 sm:h-11"
            />
            <Button onClick={handleSearch} disabled={!searchQuery.trim() || exaLoading} className="h-10 sm:h-11 w-full sm:w-auto">
              {exaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="bg-muted grid grid-cols-5 sm:grid-cols-6 w-full h-10 sm:h-11">
          <TabsTrigger value="next-skills" className="text-xs sm:text-sm">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Next Skills</span>
          </TabsTrigger>
          <TabsTrigger value="trending" className="text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Trending</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="text-xs sm:text-sm">
            <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tools</span>
          </TabsTrigger>
          <TabsTrigger value="quick-wins" className="text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Quick Wins</span>
          </TabsTrigger>
          <TabsTrigger value="success" className="text-xs sm:text-sm">
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Success</span>
          </TabsTrigger>
          {exaQuery && (
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search Results
            </TabsTrigger>
          )}
        </TabsList>

        {/* Smart Category Content */}
        {['next-skills', 'trending', 'tools', 'quick-wins', 'success'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 sm:space-y-4">
            {feedLoading ? (
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="border-border animate-pulse">
                    <CardHeader className="p-4 sm:p-6 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="h-5 w-20 bg-muted rounded"></div>
                        <div className="h-4 w-16 bg-muted rounded"></div>
                      </div>
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded w-5/6"></div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2 p-4 sm:p-6 pt-0">
                      <div className="h-4 w-24 bg-muted rounded"></div>
                      <div className="flex gap-2">
                        <div className="h-8 w-16 bg-muted rounded"></div>
                        <div className="h-8 w-20 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : feedData?.items && feedData.items.length > 0 ? (
              <div className={`grid gap-3 sm:gap-4 sm:grid-cols-2 transition-opacity duration-300 ${isRefreshing ? 'opacity-0' : 'opacity-100'}`}>
                {feedData.items.map((item) => (
                  <Card key={item.id} className="border-border hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <Badge className={getCategoryBadge(item.category)}>
                          {item.category}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.published_at)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleBookmark(item)}
                          >
                            {isBookmarked(item.id) ? (
                              <Bookmark className="h-4 w-4 fill-current text-primary" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{item.source}</span>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleAddToPath(item)}
                        >
                          <BookmarkPlus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(item.url, '_blank')}
                        >
                          Read <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading fresh content...</p>
              </div>
            )}
          </TabsContent>
        ))}

        {/* Exa Search Results */}
        <TabsContent value="search" className="space-y-4">
          {exaLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : exaData?.results ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Found {exaData.total} results for "{exaQuery}"
              </div>
              <div className="space-y-4">
                {exaData.results.map((result) => (
                  <Card key={result.id} className="border-border hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-lg">{result.title}</CardTitle>
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline flex items-center gap-1"
                          >
                            {result.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            Score: {Math.round(result.score * 100)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleBookmark({
                              id: result.id,
                              title: result.title,
                              description: result.text || result.summary || '',
                              url: result.url,
                              source: new URL(result.url).hostname.replace('www.', ''),
                              category: 'Search Result',
                              published_at: result.publishedDate || new Date().toISOString()
                            })}
                          >
                            {isBookmarked(result.id) ? (
                              <Bookmark className="h-4 w-4 fill-current text-primary" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.highlights && result.highlights.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Key Highlights:</p>
                          {result.highlights.map((highlight, idx) => (
                            <p key={idx} className="text-sm text-muted-foreground pl-4 border-l-2 border-accent">
                              {highlight}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {result.text}
                      </p>
                      {result.author && (
                        <p className="text-xs text-muted-foreground">
                          By {result.author} • {result.publishedDate ? formatDate(result.publishedDate) : 'Recent'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Search for something to see AI-powered results
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Refresh Button */}
      <Button
        onClick={handleRefresh}
        disabled={feedLoading || activeTab === 'search' || isRefreshing}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        size="icon"
      >
        <RefreshCw className={`h-5 w-5 ${(feedLoading || isRefreshing) ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};

export default Discover;
