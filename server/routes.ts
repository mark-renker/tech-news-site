import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsCategories, type NewsCategory, insertNewsArticleSchema, type InsertNewsArticle } from "@shared/schema";
import { z } from "zod";

// News API configuration
const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY || "";
const NEWS_API_BASE_URL = "https://newsapi.org/v2";

// Category mappings for News API queries
const categoryQueries: Record<NewsCategory, string[]> = {
  "all": ["technology", "science"],
  "ai": ["artificial intelligence", "machine learning", "deep learning", "AI research", "neural networks"],
  "music-tech": ["music technology", "audio technology", "music software", "digital audio", "music production"],
  "science-tech": ["technology", "science", "innovation", "research"],
  "materials": ["materials science", "nanotechnology", "polymer", "semiconductor materials", "advanced materials"],
  "embedded": ["embedded systems", "FPGA", "ASIC", "microcontroller", "chip design", "IoT hardware"],
  "bci": ["brain computer interface", "neural interface", "neurotechnology", "brain implant", "neuralink"]
};

async function fetchNewsFromAPI(category: NewsCategory, page = 1): Promise<any[]> {
  if (!NEWS_API_KEY) {
    console.warn("No News API key provided, returning empty results");
    return [];
  }

  const queries = categoryQueries[category];
  const allArticles: any[] = [];

  for (const query of queries) {
    try {
      const url = `${NEWS_API_BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&page=${page}&language=en&apiKey=${NEWS_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`News API error for query "${query}":`, response.status, response.statusText);
        continue;
      }

      const data = await response.json();
      if (data.articles) {
        allArticles.push(...data.articles);
      }
    } catch (error) {
      console.error(`Error fetching news for query "${query}":`, error);
    }
  }

  return allArticles;
}

function mapNewsAPIToSchema(article: any, category: NewsCategory): InsertNewsArticle {
  return {
    title: article.title || "Untitled",
    description: article.description || null,
    url: article.url,
    urlToImage: article.urlToImage || null,
    publishedAt: article.publishedAt,
    source: {
      id: article.source?.id || null,
      name: article.source?.name || "Unknown Source",
    },
    category,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get news articles with optional category filter
  app.get("/api/news", async (req, res) => {
    try {
      const category = (req.query.category as NewsCategory) || "all";
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const refresh = req.query.refresh === "true";

      if (!newsCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }

      // If refresh is requested or we have no articles, fetch from API
      const existingArticles = await storage.getArticles(category, 1);
      if (refresh || existingArticles.length === 0) {
        console.log(`Fetching fresh news for category: ${category}`);
        
        const newsData = await fetchNewsFromAPI(category);
        
        // Store new articles
        for (const article of newsData) {
          try {
            const mappedArticle = mapNewsAPIToSchema(article, category);
            await storage.createArticle(mappedArticle);
          } catch (error) {
            console.error("Error storing article:", error);
          }
        }
      }

      const articles = await storage.getArticles(category, limit, offset);
      const totalResults = await storage.getTotalArticles(category);
      
      res.json({
        articles,
        totalResults,
        category,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // Search articles
  app.get("/api/news/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const category = (req.query.category as NewsCategory) || "all";

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }

      if (!newsCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }

      const articles = await storage.searchArticles(query.trim(), category);
      
      res.json({
        articles,
        totalResults: articles.length,
        category,
        query: query.trim(),
      });
    } catch (error) {
      console.error("Error searching news:", error);
      res.status(500).json({ message: "Failed to search news" });
    }
  });

  // Get specific article and increment views
  app.get("/api/news/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.updateArticleViews(id);
      
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Refresh news for all categories
  app.post("/api/news/refresh", async (req, res) => {
    try {
      console.log("Refreshing news for all categories...");
      
      // Clear old articles first
      await storage.clearOldArticles();
      
      // Fetch fresh news for each category
      for (const category of newsCategories) {
        if (category === "all") continue;
        
        const newsData = await fetchNewsFromAPI(category as NewsCategory);
        
        for (const article of newsData) {
          try {
            const mappedArticle = mapNewsAPIToSchema(article, category as NewsCategory);
            await storage.createArticle(mappedArticle);
          } catch (error) {
            console.error(`Error storing article for category ${category}:`, error);
          }
        }
      }
      
      res.json({ message: "News refreshed successfully", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error refreshing news:", error);
      res.status(500).json({ message: "Failed to refresh news" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
