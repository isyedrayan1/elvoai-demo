import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TrendingUp, Wrench, BookOpen, Search, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
  const [activeTab, setActiveTab] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [exaQuery, setExaQuery] = useState("");

  // Fetch RSS feed data
  const { data: feedData, isLoading: feedLoading } = useQuery<{ items: FeedItem[]; total: number }>({
    queryKey: ['discover-feed', activeTab],
    queryFn: async () => {
      const category = activeTab === 'trending' ? 'all' : activeTab;
      const response = await fetch(`/api/discover?category=${category}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch feed');
      return response.json();
    },
    enabled: activeTab !== 'search',
    refetchInterval: 60000, // Refresh every minute
  });

  // Exa semantic search
  const { data: exaData, isLoading: exaLoading, refetch: searchExa } = useQuery<{ results: ExaResult[]; total: number }>({
    queryKey: ['exa-search', exaQuery],
    queryFn: async () => {
      const response = await fetch('/api/exa-search', {
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
          <p className="text-sm sm:text-base text-muted-foreground">Real-time industry insights powered by AI</p>
        </div>
        <Badge variant="outline" className="gap-1 self-start">
          <Sparkles className="h-3 w-3" />
          Live Feed
        </Badge>
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
        <TabsList className="bg-muted grid grid-cols-4 sm:grid-cols-5 w-full h-10 sm:h-11">
          <TabsTrigger value="trending" className="text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Trending</span>
          </TabsTrigger>
          <TabsTrigger value="AI" className="text-xs sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">AI & ML</span>
          </TabsTrigger>
          <TabsTrigger value="Web Dev" className="text-xs sm:text-sm">
            <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Web Dev</span>
          </TabsTrigger>
          <TabsTrigger value="Tech" className="text-xs sm:text-sm">
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tech</span>
          </TabsTrigger>
          {exaQuery && (
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search Results
            </TabsTrigger>
          )}
        </TabsList>

        {/* RSS Feed Content */}
        {['trending', 'AI', 'Web Dev', 'Tech'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 sm:space-y-4">
            {feedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {feedData?.items?.map((item) => (
                  <Card key={item.id} className="border-border hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <Badge className={getCategoryBadge(item.category)}>
                          {item.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.published_at)}
                        </span>
                      </div>
                      <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{item.source}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        Read <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!feedLoading && (!feedData?.items || feedData.items.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                No articles found. Try another category.
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
                        <Badge variant="secondary">
                          Score: {Math.round(result.score * 100)}
                        </Badge>
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
    </div>
  );
};

export default Discover;
