import { type NewsCategory } from "@shared/schema";

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  "all": "All News",
  "ai": "AI/ML Research", 
  "music-tech": "Music Technology",
  "science-tech": "Science & Tech",
  "materials": "Materials Science",
  "embedded": "Embedded Systems",
  "bci": "Brain Interfaces"
};

export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  "all": "bg-primary text-primary-foreground",
  "ai": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "music-tech": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "science-tech": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", 
  "materials": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "embedded": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "bci": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
};

export const SOURCE_COLORS: Record<string, string> = {
  "TechCrunch": "bg-red-500",
  "Ars Technica": "bg-red-500", 
  "Wired": "bg-indigo-500",
  "Nature": "bg-blue-600",
  "MIT News": "bg-gray-700",
  "NASA": "bg-blue-800",
  "Apple": "bg-gray-800",
  "DeepMind": "bg-blue-600",
  "Sound on Sound": "bg-green-500",
  "default": "bg-gray-500"
};
