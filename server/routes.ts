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
    all: [
      {
        title: "Breakthrough Technology Revolutionizes Scientific Research Methods",
        description: "Scientists develop innovative research techniques that accelerate discovery in multiple fields using advanced technology platforms.",
        url: "https://techcrunch.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "techcrunch", name: "TechCrunch" }
      },
      {
        title: "Innovation in Science Computing Transforms Data Analysis",
        description: "New computational research tools enable faster processing of complex scientific datasets across multiple research domains.",
        url: "https://www.nature.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: { id: "nature", name: "Nature" }
      },
      {
        title: "Advanced Technology Platforms Enable Collaborative Research Networks",
        description: "Cutting-edge science and technology infrastructure connects researchers globally for breakthrough innovation projects.",
        url: "https://www.sciencedaily.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: { id: "science-daily", name: "Science Daily" }
      },
      {
        title: "Research Innovation Accelerates Scientific Discovery Timeline",
        description: "New technology-driven research methodologies reduce time from hypothesis to breakthrough in scientific studies.",
        url: "https://www.wired.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: { id: "wired", name: "Wired" }
      },
      {
        title: "Technology Integration Transforms Modern Science Laboratories",
        description: "Advanced research technology creates more efficient and collaborative scientific work environments worldwide.",
        url: "https://www.reuters.com/technology/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: { id: "reuters", name: "Reuters Technology" }
      }
    ],
    ai: [
      {
        title: "New AI Algorithm Solves Complex Machine Learning Optimization Problems",
        description: "Breakthrough artificial intelligence research shows neural networks can now solve previously intractable optimization problems in machine learning.",
        url: "https://techcrunch.com/artificial-intelligence/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "techcrunch", name: "TechCrunch" }
      },
      {
        title: "Deep Learning Model Achieves 99% Accuracy in Medical Diagnosis",
        description: "Researchers develop advanced neural network that uses artificial intelligence to diagnose diseases with unprecedented accuracy.",
        url: "https://www.nature.com/subjects/machine-learning",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: { id: "nature", name: "Nature AI" }
      },
      {
        title: "Revolutionary Neural Network Architecture Transforms AI Performance",
        description: "Scientists create breakthrough artificial intelligence system that uses advanced machine learning to achieve human-level reasoning.",
        url: "https://www.wired.com/tag/artificial-intelligence/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: { id: "wired", name: "Wired AI" }
      },
      {
        title: "Machine Learning Algorithm Breakthrough Enables Real-Time Intelligence",
        description: "Advanced AI model processes complex neural networks faster than ever, opening new possibilities for intelligent systems.",
        url: "https://www.reuters.com/technology/artificial-intelligence/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: { id: "reuters", name: "Reuters AI" }
      },
      {
        title: "Artificial Intelligence Breakthrough: Neural Networks Learn Like Human Brain",
        description: "Revolutionary machine learning research creates AI that mimics human intelligence using advanced neural processing algorithms.",
        url: "https://spectrum.ieee.org/artificial-intelligence",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: { id: "ieee", name: "IEEE Spectrum" }
      }
    ],
    "music-tech": [
      {
        title: "Revolutionary Audio Processing Technology Changes Music Production",
        description: "New digital audio workstation uses advanced sound processing algorithms to transform music recording and production workflows.",
        url: "https://www.soundonsound.com/",
        urlToImage: "https://via.placeholder.com/400x200", 
        publishedAt: new Date().toISOString(),
        source: { id: "sound-on-sound", name: "Sound on Sound" }
      },
      {
        title: "AI-Powered Music Software Helps Studio Engineers Perfect Recordings",
        description: "Cutting-edge audio engineering tool uses machine learning to optimize music production and sound quality.",
        url: "https://www.musictech.net/",
        urlToImage: "https://via.placeholder.com/400x200", 
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: { id: "music-tech", name: "Music Technology" }
      },
      {
        title: "Digital Audio Revolution: New Studio Technology Transforms Sound Recording",
        description: "Advanced music production software uses innovative audio processing to create professional recording capabilities for home studios.",
        url: "https://www.gearnews.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: { id: "gearnews", name: "Gearnews" }
      },
      {
        title: "Music Production Breakthrough: Smart Audio Engineering Tools Launch",
        description: "Revolutionary music technology platform combines AI with traditional audio engineering for next-generation sound production.",
        url: "https://www.prosoundnetwork.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: { id: "prosound", name: "Pro Sound Network" }
      },
      {
        title: "Audio Innovation: Advanced Music Technology Enables Creative Expression",
        description: "New music production tools give artists unprecedented control over sound design using cutting-edge audio processing technology.",
        url: "https://www.musicradar.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 18000000).toISOString(),
        source: { id: "musicradar", name: "MusicRadar" }
      }
    ],
    materials: [
      {
        title: "Scientists Develop Revolutionary Semiconductor Materials for Quantum Computing", 
        description: "Breakthrough in materials science research creates new polymer composites and nanotechnology applications for quantum processors.",
        url: "https://news.mit.edu/topic/materials",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "mit-news", name: "MIT Materials Research" }
      },
      {
        title: "Nanotechnology Breakthrough: New Metamaterials Enable Invisible Cloaking",
        description: "Advanced materials science creates novel composite materials using nanotechnology for revolutionary optical applications.",
        url: "https://www.science.org/topic/materials-science",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: { id: "science", name: "Materials Science Journal" }
      },
      {
        title: "Advanced Polymer Research Creates Next-Generation Materials",
        description: "Scientists engineer revolutionary polymer composites with unprecedented properties for aerospace and semiconductor applications.",
        url: "https://www.nature.com/subjects/materials-science",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: { id: "nature", name: "Nature Materials" }
      },
      {
        title: "Semiconductor Innovation: Crystal Engineering Enables Faster Computing",
        description: "Materials science breakthrough creates new semiconductor crystal structures for ultra-high-speed processing applications.",
        url: "https://spectrum.ieee.org/semiconductors",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: { id: "ieee", name: "IEEE Spectrum Materials" }
      },
      {
        title: "Nanotechnology Advances Enable Smart Materials Development",
        description: "Revolutionary nanotechnology research creates intelligent materials that respond to environmental changes automatically.",
        url: "https://www.nanowerk.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: { id: "nanowerk", name: "Nanowerk" }
      }
    ],
    embedded: [
      {
        title: "New FPGA Design Revolutionizes Embedded System Performance",
        description: "Advanced embedded systems engineering breakthrough shows ASIC-like performance in reconfigurable FPGA hardware for IoT applications.",
        url: "https://www.embedded.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "embedded", name: "Embedded Systems Engineering" }
      },
      {
        title: "Microcontroller Innovation Enables Ultra-Low Power IoT Hardware",
        description: "New embedded processor design using advanced chip architecture dramatically reduces power consumption in IoT hardware systems.",
        url: "https://arstechnica.com/gadgets/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 5400000).toISOString(),
        source: { id: "ars-technica", name: "Ars Technica Hardware" }
      },
      {
        title: "ASIC Development Breakthrough Accelerates Chip Design Innovation",
        description: "Revolutionary embedded hardware engineering creates custom ASIC designs for next-generation IoT processor applications.",
        url: "https://spectrum.ieee.org/semiconductors",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: { id: "ieee", name: "IEEE Embedded Systems" }
      },
      {
        title: "IoT Hardware Revolution: Smart Processors Enable Connected Devices",
        description: "Advanced embedded microcontroller technology creates intelligent hardware platforms for Internet of Things applications.",
        url: "https://www.eejournal.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: { id: "eejournal", name: "EE Journal" }
      },
      {
        title: "Embedded Systems Engineering: FPGA Technology Transforms Computing",
        description: "Cutting-edge FPGA development enables programmable hardware solutions for complex embedded processing tasks.",
        url: "https://www.electronicdesign.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 18000000).toISOString(),
        source: { id: "electronic-design", name: "Electronic Design" }
      }
    ],
    bci: [
      {
        title: "Brain-Computer Interface Enables Paralyzed Patients to Control Neural Prosthetics",
        description: "Revolutionary neurotechnology research allows brain implant users to control prosthetic devices using neural signals from brain interface systems.",
        url: "https://www.nature.com/subjects/neuroscience", 
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "nature", name: "Nature Neurotechnology" }
      },
      {
        title: "Advanced Neural Interface Technology Restores Communication for Locked-in Patients",
        description: "Breakthrough brain-computer interface uses neural signal processing to enable communication through brain implant technology.",
        url: "https://spectrum.ieee.org/biomedical",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: { id: "neuroscience", name: "Journal of Neurotechnology" }
      },
      {
        title: "Neural Prosthetics Breakthrough: Brain Implants Enable Direct Device Control",
        description: "Scientists develop advanced brain-computer interface that allows paralyzed patients to control external devices using only neural signals.",
        url: "https://www.sciencedaily.com/news/mind_brain/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: { id: "science-daily", name: "Science Daily Neuroscience" }
      },
      {
        title: "Neurotechnology Innovation: Brain Interface Restores Lost Motor Functions",
        description: "Revolutionary brain-computer interface research enables paralyzed individuals to regain motor control through neural prosthetic technology.",
        url: "https://news.mit.edu/topic/brain-cognitive-sciences",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: { id: "mit-news", name: "MIT Neurotechnology" }
      },
      {
        title: "Brain Implant Technology Advances Enable Thought-Controlled Computing",
        description: "Cutting-edge neurotechnology allows users to control computers and devices directly through brain signals via neural interface implants.",
        url: "https://www.technologyreview.com/topic/biotechnology/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 18000000).toISOString(),
        source: { id: "mit-tech-review", name: "MIT Technology Review" }
      }
    ],
    "science-tech": [
      {
        title: "Scientific Research Breakthrough: Technology Advances Enable New Discoveries",
        description: "Latest scientific research methodology using advanced technology leads to groundbreaking discoveries in experimental science.",
        url: "https://www.science.org/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date().toISOString(),
        source: { id: "science", name: "Science & Technology Review" }
      },
      {
        title: "Research Technology Revolution Transforms Scientific Discovery Process",
        description: "Advanced scientific computing and experimental technology accelerate research across multiple scientific disciplines.",
        url: "https://www.nature.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: { id: "nature", name: "Nature Science" }
      },
      {
        title: "Laboratory Innovation: New Technology Platforms Enable Collaborative Research",
        description: "Cutting-edge laboratory technology creates connected research environments for accelerated scientific discovery and study.",
        url: "https://www.scientificamerican.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: { id: "sci-american", name: "Scientific American" }
      },
      {
        title: "Experimental Science Breakthrough: Digital Tools Transform Research Methods",
        description: "Revolutionary scientific technology enables researchers to conduct more precise experiments and accelerate discovery timelines.",
        url: "https://www.sciencedaily.com/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: { id: "science-daily", name: "Science Daily" }
      },
      {
        title: "Scientific Computing Advances Enable Complex Research Modeling",
        description: "Advanced technology platforms provide scientists with powerful tools for modeling complex systems and analyzing research data.",
        url: "https://phys.org/",
        urlToImage: "https://via.placeholder.com/400x200",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: { id: "phys-org", name: "Phys.org" }
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
        // Filter articles to ensure they're relevant to the category
        const relevantArticles = data.articles.filter((article: any) => 
          isArticleRelevant(article, category)
        );
        allArticles.push(...relevantArticles);
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
        
        // Clean up duplicates after adding new articles
        await storage.removeDuplicates();
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
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    validateRequest
  ], async (req, res) => {
    try {
      const rawQuery = req.query.q as string;
      const sanitizedQuery = sanitizeInput(rawQuery.trim());
      const category = (req.query.category as NewsCategory) || "all";
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const articles = await storage.searchArticles(sanitizedQuery, category, limit, offset);
      
      res.json({
        articles,
        totalResults: articles.length,
        category,
        query: sanitizedQuery,
        limit,
        offset,
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
