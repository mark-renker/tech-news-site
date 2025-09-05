import { type NewsArticle, type InsertNewsArticle, type NewsCategory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getArticles(category?: NewsCategory, limit?: number, offset?: number): Promise<NewsArticle[]>;
  getArticleById(id: string): Promise<NewsArticle | undefined>;
  createArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  updateArticleViews(id: string): Promise<NewsArticle | undefined>;
  searchArticles(query: string, category?: NewsCategory): Promise<NewsArticle[]>;
  getTotalArticles(category?: NewsCategory): Promise<number>;
  clearOldArticles(): Promise<void>;
}

export class MemStorage implements IStorage {
  private articles: Map<string, NewsArticle>;

  constructor() {
    this.articles = new Map();
  }

  async getArticles(category?: NewsCategory, limit = 20, offset = 0): Promise<NewsArticle[]> {
    let filteredArticles = Array.from(this.articles.values());
    
    if (category && category !== "all") {
      filteredArticles = filteredArticles.filter(article => article.category === category);
    }
    
    // Sort by publish date (newest first)
    filteredArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    return filteredArticles.slice(offset, offset + limit);
  }

  async getArticleById(id: string): Promise<NewsArticle | undefined> {
    return this.articles.get(id);
  }

  async createArticle(insertArticle: InsertNewsArticle): Promise<NewsArticle> {
    const id = randomUUID();
    const article: NewsArticle = { 
      ...insertArticle, 
      id,
      views: 0
    };
    this.articles.set(id, article);
    return article;
  }

  async updateArticleViews(id: string): Promise<NewsArticle | undefined> {
    const article = this.articles.get(id);
    if (article) {
      article.views += 1;
      this.articles.set(id, article);
      return article;
    }
    return undefined;
  }

  async searchArticles(query: string, category?: NewsCategory): Promise<NewsArticle[]> {
    const searchTerm = query.toLowerCase();
    let filteredArticles = Array.from(this.articles.values());
    
    if (category && category !== "all") {
      filteredArticles = filteredArticles.filter(article => article.category === category);
    }
    
    return filteredArticles.filter(article =>
      article.title.toLowerCase().includes(searchTerm) ||
      (article.description && article.description.toLowerCase().includes(searchTerm)) ||
      article.source.name.toLowerCase().includes(searchTerm)
    ).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  async getTotalArticles(category?: NewsCategory): Promise<number> {
    if (!category || category === "all") {
      return this.articles.size;
    }
    return Array.from(this.articles.values()).filter(article => article.category === category).length;
  }

  async clearOldArticles(): Promise<void> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    for (const [id, article] of this.articles) {
      if (new Date(article.publishedAt) < threeDaysAgo) {
        this.articles.delete(id);
      }
    }
  }
}

export const storage = new MemStorage();
