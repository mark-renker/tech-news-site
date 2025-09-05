import { type NewsCategory } from "@shared/schema";
import { CATEGORY_LABELS } from "@/lib/constants";

interface CategoryTabsProps {
  activeCategory: NewsCategory;
  onCategoryChange: (category: NewsCategory) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  const categories: NewsCategory[] = ["all", "ai", "music-tech", "science-tech", "materials", "embedded", "bci"];

  return (
    <div className="bg-secondary border-b border-border sticky top-16 z-40">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="overflow-x-auto scrollbar-hide py-4">
          <div className="flex space-x-2 min-w-max md:justify-center px-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                data-testid={`button-category-${category}`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
