import { useState } from "react";
import { Moon, Sun, Menu, Newspaper } from "lucide-react";
import { useTheme } from "./theme-provider";
import { SearchBar } from "./search-bar";

interface HeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function Header({ onSearch, searchQuery }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Newspaper className="text-primary-foreground text-sm" size={16} />
            </div>
            <h1 className="text-xl font-bold text-foreground">TechNews</h1>
          </div>

          {/* Desktop Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <SearchBar 
              onSearch={onSearch}
              searchQuery={searchQuery}
              placeholder="Search news across all categories..."
            />
          </div>

          {/* Theme Toggle & Menu */}
          <div className="flex items-center space-x-4">
            <button 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <SearchBar 
            onSearch={onSearch}
            searchQuery={searchQuery}
            placeholder="Search news..."
          />
        </div>
      </div>
    </header>
  );
}
