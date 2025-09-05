import { z } from "zod";

export const newsCategories = [
  "all",
  "ai",
  "music-tech", 
  "science-tech",
  "materials",
  "embedded",
  "bci"
] as const;

export type NewsCategory = typeof newsCategories[number];

export const newsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  urlToImage: z.string().nullable(),
  publishedAt: z.string(),
  source: z.object({
    id: z.string().nullable(),
    name: z.string(),
  }),
  category: z.enum(newsCategories),
  views: z.number().default(0),
});

export const insertNewsArticleSchema = newsArticleSchema.omit({
  id: true,
  views: true,
});

export type NewsArticle = z.infer<typeof newsArticleSchema>;
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;

export const newsResponseSchema = z.object({
  articles: z.array(newsArticleSchema),
  totalResults: z.number(),
  category: z.enum(newsCategories),
  lastUpdated: z.string(),
});

export type NewsResponse = z.infer<typeof newsResponseSchema>;
