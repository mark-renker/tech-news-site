import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsCategories, type NewsCategory, insertNewsArticleSchema, type InsertNewsArticle } from "@shared/schema";
import { z } from "zod";
import { body, query, param, validationResult } from "express-validator";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM('').window;
const domPurify = DOMPurify(window);

// Input validation helpers
const sanitizeInput = (input: string): string => {
  return domPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Invalid input",
      errors: errors.array()
    });
  }
  next();
};

// News API configuration
const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY || "";
const NEWS_API_BASE_URL = "https://newsapi.org/v2";

// Category mappings for News API queries - more specific and targeted
const categoryQueries: Record<NewsCategory, string[]> = {
  "all": ["technology innovation", "science breakthrough"],
  "ai": ["artificial intelligence breakthrough", "machine learning research", "deep learning model", "AI algorithm", "neural network"],
  "music-tech": ["music production software", "audio processing technology", "digital audio workstation", "music AI", "audio engineering"],
  "science-tech": ["scientific research technology", "laboratory innovation", "research methodology", "scientific computing"],
  "materials": ["materials science research", "nanotechnology breakthrough", "semiconductor development", "polymer research", "metamaterials"],
  "embedded": ["embedded system design", "FPGA development", "ASIC chip", "microcontroller programming", "IoT hardware"],
  "bci": ["brain computer interface", "neural prosthetics", "neurotechnology research", "brain implant technology", "neural signal processing"]
};

// Keywords that must be present for each category (content filtering)
const categoryKeywords: Record<NewsCategory, string[]> = {
  "all": ["technology", "science", "research", "innovation"],
  "ai": ["artificial", "intelligence", "machine", "learning", "neural", "algorithm", "model", "AI"],
  "music-tech": ["music", "audio", "sound", "recording", "production", "studio", "instrument", "acoustic"],
  "science-tech": ["science", "scientific", "research", "study", "experiment", "discovery", "technology"],
  "materials": ["material", "materials", "nanotechnology", "polymer", "semiconductor", "crystal", "composite"],
  "embedded": ["embedded", "FPGA", "ASIC", "microcontroller", "chip", "processor", "hardware", "IoT"],
  "bci": ["brain", "neural", "neuron", "interface", "implant", "prosthetic", "neurotechnology"]
};

// Function to check if article content matches category
const isArticleRelevant = (article: any, category: NewsCategory): boolean => {
  if (category === "all") return true;
  
  const keywords = categoryKeywords[category];
  const title = (article.title || "").toLowerCase();
  const description = (article.description || "").toLowerCase();
  const content = `${title} ${description}`;
  
  // Article must contain at least one category-specific keyword
  return keywords.some(keyword => content.includes(keyword.toLowerCase()));
};

// Sample news data to demonstrate functionality when API is rate limited
const getSampleNews = (category: NewsCategory): any[] => {
  const sampleArticles = {
    ai: [
      {
        title: "Revolutionary AI Model Achieves Human-Level Performance in Scientific Reasoning",
        description: "Researchers unveil a new AI system that demonstrates unprecedented capabilities in understanding and solving complex scientific problems.",
        url: "https://example.com/ai-breakthrough",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "techcrunch", name: "TechCrunch" }
      },
      {
        title: "Neural Networks Learn to Self-Optimize Through Novel Training Method",
        description: "Scientists develop a groundbreaking approach that allows neural networks to improve their own architecture during training.",
        url: "https://example.com/neural-optimization",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: { id: "nature", name: "Nature" }
      }
    ],
    "music-tech": [
      {
        title: "AI-Powered Music Production Tool Transforms How Artists Create",
        description: "New software leverages machine learning to assist musicians in composing, mixing, and mastering their tracks.",
        url: "https://example.com/ai-music-production",
        urlToImage: "https://via.placeholder.com/400x200", 
        publishedAt: new Date().toISOString(),
        source: { id: "sound-on-sound", name: "Sound on Sound" }
      }
    ],
    materials: [
      {
        title: "Breakthrough in Quantum Dot Technology Promises Better Solar Cells", 
        description: "Researchers develop new quantum dot materials that could significantly improve solar panel efficiency.",
        url: "https://example.com/quantum-dots",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "mit-news", name: "MIT News" }
      }
    ],
    embedded: [
      {
        title: "New RISC-V Processor Design Challenges ARM and Intel Dominance",
        description: "Open-source processor architecture gains momentum with new high-performance implementations.",
        url: "https://example.com/riscv-processor",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "ars-technica", name: "Ars Technica" }
      }
    ],
    bci: [
      {
        title: "Brain-Computer Interface Allows Paralyzed Patients to Control Robotic Arms",
        description: "Latest BCI technology enables precise control of robotic limbs through thought alone.",
        url: "https://example.com/bci-breakthrough", 
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "nature", name: "Nature Medicine" }
      }
    ],
    "science-tech": [
      {
        title: "Fusion Energy Milestone: Reactor Achieves Net Energy Gain",
        description: "Scientists announce a major breakthrough in fusion energy, bringing commercial fusion power closer to reality.",
        url: "https://example.com/fusion-breakthrough",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "science", name: "Science Magazine" }
      }
    ]
  };

  return sampleArticles[category] || sampleArticles["science-tech"];
};

async function fetchNewsFromAPI(category: NewsCategory, page = 1): Promise<any[]> {
  if (!NEWS_API_KEY) {
    console.warn("No News API key provided, returning sample data");
    return getSampleNews(category);
  }

  const queries = categoryQueries[category];
  const allArticles: any[] = [];

  for (const query of queries) {
    try {
      const url = `${NEWS_API_BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&page=${page}&language=en&apiKey=${NEWS_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`News API rate limited for query "${query}", using sample data`);
          return getSampleNews(category);
        }
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

  // If no articles were fetched due to rate limiting, use sample data
  if (allArticles.length === 0) {
    return getSampleNews(category);
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
  app.get("/api/news", [
    query('category').optional().isIn(newsCategories).withMessage('Invalid category'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    query('refresh').optional().isBoolean().withMessage('Refresh must be boolean'),
    validateRequest
  ], async (req, res) => {
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
  app.get("/api/news/search", [
    query('q').notEmpty().trim().isLength({ min: 1, max: 200 }).withMessage('Search query must be 1-200 characters'),
    query('category').optional().isIn(newsCategories).withMessage('Invalid category'),
    validateRequest
  ], async (req, res) => {
    try {
      const rawQuery = req.query.q as string;
      const sanitizedQuery = sanitizeInput(rawQuery.trim());
      const category = (req.query.category as NewsCategory) || "all";

      const articles = await storage.searchArticles(sanitizedQuery, category);
      
      res.json({
        articles,
        totalResults: articles.length,
        category,
        query: sanitizedQuery,
      });
    } catch (error) {
      console.error("Error searching news:", error);
      res.status(500).json({ message: "Failed to search news" });
    }
  });

  // Get specific article and increment views
  app.get("/api/news/:id", [
    param('id').isUUID().withMessage('Invalid article ID format'),
    validateRequest
  ], async (req, res) => {
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
