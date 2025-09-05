import { type NewsArticle } from "@shared/schema";
import { CATEGORY_COLORS, SOURCE_COLORS } from "@/lib/constants";
import { Eye, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NewsCardProps {
  article: NewsArticle;
  onClick: (article: NewsArticle) => void;
}

export function NewsCard({ article, onClick }: NewsCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });
  const categoryColorClass = CATEGORY_COLORS[article.category];
  const sourceInitial = article.source.name.charAt(0).toUpperCase();
  const sourceColorClass = SOURCE_COLORS[article.source.name] || SOURCE_COLORS.default;

  const handleClick = () => {
    onClick(article);
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <article 
      className="news-card bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
      onClick={handleClick}
      data-testid={`card-article-${article.id}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${categoryColorClass}`}>
            {article.category === "ai" ? "AI/ML Research" :
             article.category === "music-tech" ? "Music Technology" :
             article.category === "science-tech" ? "Science & Tech" :
             article.category === "materials" ? "Materials Science" :
             article.category === "embedded" ? "Embedded Systems" :
             article.category === "bci" ? "Brain Interfaces" :
             "All News"}
          </span>
          <time className="text-xs text-muted-foreground" data-testid={`text-time-${article.id}`}>
            {timeAgo}
          </time>
        </div>
        
        <h2 className="text-lg font-semibold text-foreground mb-3 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {article.title}
        </h2>
        
        {article.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
            {article.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 ${sourceColorClass} rounded-sm flex items-center justify-center`}>
              <span className="text-white text-xs font-bold">{sourceInitial}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground" data-testid={`text-source-${article.id}`}>
              {article.source.name}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Eye size={12} />
              <span data-testid={`text-views-${article.id}`}>{article.views}</span>
            </div>
            <button
              onClick={handleExternalClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`button-external-${article.id}`}
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
