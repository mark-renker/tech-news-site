import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type NewsCategory, type NewsResponse } from "@shared/schema";
import { Header } from "@/components/header";
import { CategoryTabs } from "@/components/category-tabs";
import { NewsCard } from "@/components/news-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Circle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch initial news articles
  const { data: newsData, isLoading, error, refetch } = useQuery<NewsResponse>({
    queryKey: ["/api/news", activeCategory, isSearchMode ? "search" : "normal", searchQuery],
    queryFn: async () => {
      const url = isSearchMode && searchQuery 
        ? `/api/news/search?q=${encodeURIComponent(searchQuery)}&category=${activeCategory}&limit=20&offset=0`
        : `/api/news?category=${activeCategory}&limit=20&offset=0`;
      
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load more articles mutation
  const loadMoreMutation = useMutation({
    mutationFn: async (params: { offset: number; category: NewsCategory; searchMode: boolean; query: string }) => {
      const { offset, category, searchMode, query } = params;
      const url = searchMode && query 
        ? `/api/news/search?q=${encodeURIComponent(query)}&category=${category}&limit=20&offset=${offset}`
        : `/api/news?category=${category}&limit=20&offset=${offset}`;
      
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data: NewsResponse) => {
      if (data.articles.length === 0) {
        setHasMoreArticles(false);
        toast({
          title: "No More Articles",
          description: "You've reached the end of available articles.",
        });
      } else {
        // Filter out duplicate articles based on ID
        setAllArticles(prev => {
          const existingIds = new Set(prev.map(article => article.id));
          const newArticles = data.articles.filter(article => !existingIds.has(article.id));
          return [...prev, ...newArticles];
        });
        setCurrentOffset(prev => prev + 20);
        setHasMoreArticles(data.articles.length === 20);
      }
    },
    onError: () => {
      toast({
        title: "Load More Failed",
        description: "Failed to load more articles. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Reset pagination when category or search changes
  useEffect(() => {
    setCurrentOffset(0);
    setAllArticles([]);
    setHasMoreArticles(true);
  }, [activeCategory, isSearchMode, searchQuery]);

  // Update articles when initial data loads
  useEffect(() => {
    if (newsData?.articles) {
      // Remove duplicates from initial data as well
      const uniqueArticles = newsData.articles.filter((article, index, self) => 
        index === self.findIndex(a => a.id === article.id)
      );
      setAllArticles(uniqueArticles);
      setCurrentOffset(20);
      setHasMoreArticles(newsData.articles.length === 20);
    }
  }, [newsData]);

  const handleCategoryChange = (category: NewsCategory) => {
    setActiveCategory(category);
    setIsSearchMode(false);
    setSearchQuery("");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearchMode(query.trim().length > 0);
  };

  const handleRefresh = async () => {
    try {
      await apiRequest("POST", "/api/news/refresh");
      refetch();
      toast({
        title: "News Refreshed",
        description: "Latest articles have been fetched successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh news. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleArticleClick = async (article: any) => {
    try {
      // Track article view
      await fetch(`/api/news/${article.id}`, { credentials: "include" });
      // Open article in new tab
      window.open(article.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      // Fallback to direct URL open if tracking fails
      window.open(article.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLoadMore = () => {
    if (hasMoreArticles && !loadMoreMutation.isPending) {
      loadMoreMutation.mutate({
        offset: currentOffset,
        category: activeCategory,
        searchMode: isSearchMode,
        query: searchQuery
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading News</h1>
              <p className="text-muted-foreground mb-4">
                Failed to fetch the latest news. Please check your internet connection and try again.
              </p>
              <Button onClick={() => refetch()} data-testid="button-retry">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} searchQuery={searchQuery} />
      <CategoryTabs 
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />
      
      <main className="container mx-auto px-4 lg:px-6 py-6">
        {/* Stats Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span data-testid="text-article-count">
              {allArticles.length > 0 ? `${formatNumber(allArticles.length)} articles loaded` : "0 articles"}
            </span>
            <span>•</span>
            <span data-testid="text-last-updated">
              {newsData ? `Updated ${new Date(newsData.lastUpdated).toLocaleTimeString()}` : "Not updated"}
            </span>
            <span className="flex items-center space-x-1">
              <Circle className="text-green-500 text-xs animate-pulse" size={8} />
              <span>Live</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-sm"
              data-testid="button-refresh"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Results Header */}
        {isSearchMode && searchQuery && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Search results for "{searchQuery}"
              {activeCategory !== "all" && ` in ${activeCategory}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {newsData ? newsData.totalResults : 0} articles found
            </p>
          </div>
        )}

        {/* News Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-card border border-border rounded-lg p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="h-5 bg-muted rounded-full w-24"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        ) : allArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allArticles.map((article, index) => (
                <NewsCard
                  key={`${article.id}-${index}`}
                  article={article}
                  onClick={handleArticleClick}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreArticles && (
              <div className="text-center mt-8">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadMoreMutation.isPending}
                  className="px-6 py-3"
                  data-testid="button-load-more"
                >
                  {loadMoreMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading More...
                    </>
                  ) : (
                    "Load More Articles"
                  )}
                </Button>
              </div>
            )}

            {/* End of articles message */}
            {!hasMoreArticles && allArticles.length > 20 && (
              <div className="text-center mt-8">
                <p className="text-muted-foreground">
                  You've reached the end of available articles for this category.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
            <p className="text-muted-foreground">
              {isSearchMode 
                ? "Try adjusting your search terms or browse a different category."
                : "No articles available for this category at the moment. Try refreshing or check back later."
              }
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
