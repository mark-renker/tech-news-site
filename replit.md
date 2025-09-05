# TechNews - Specialized News Aggregator

## Overview

TechNews is a modern news aggregation platform built with React and Express, designed to deliver curated technology news across specialized categories. The application features a full-stack architecture with a React frontend using shadcn/ui components, an Express.js backend, and PostgreSQL database integration via Drizzle ORM. The platform aggregates news from external APIs and provides categorized viewing, search functionality, and responsive design optimized for both desktop and mobile experiences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development and building
- **UI Library**: shadcn/ui components built on Radix UI primitives for accessible, customizable interfaces
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom theme provider supporting light/dark modes with localStorage persistence

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for news operations (`/api/news`, `/api/news/search`, `/api/news/refresh`)
- **Data Validation**: Zod schemas for type-safe data validation and parsing
- **External Integration**: News API integration with category-specific query mapping
- **Storage Abstraction**: Interface-based storage system supporting both in-memory and database implementations

### Data Storage Solutions
- **Database**: PostgreSQL configured via Drizzle ORM
- **ORM**: Drizzle with TypeScript-first approach for type safety
- **Connection**: Neon Database serverless connection for cloud deployment
- **Schema Management**: Centralized schema definitions in shared directory
- **Migrations**: Drizzle Kit for database schema migrations

### News Categories and Data Model
- **Categories**: Specialized categories including AI/ML Research, Music Technology, Science & Tech, Materials Science, Embedded Systems, and Brain-Computer Interfaces
- **Article Schema**: Structured data model with title, description, URL, image, publication date, source information, category classification, and view tracking
- **Search Functionality**: Full-text search across articles with category filtering
- **Data Freshness**: Manual refresh system for updating news content

### Development and Build System
- **Build Tool**: Vite for fast development server and optimized production builds
- **Development**: Hot module replacement and TypeScript checking
- **Production**: Optimized bundling with esbuild for server-side code
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Path Aliases**: Configured import aliases for clean code organization

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18 with TypeScript support, React DOM for rendering
- **TanStack Query**: Advanced server state management with caching, background updates, and error handling
- **Wouter**: Lightweight routing library for single-page application navigation

### UI and Styling
- **shadcn/ui**: Comprehensive component library built on Radix UI primitives
- **Radix UI**: Accessible, unstyled UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Consistent icon library for user interface elements
- **Class Variance Authority**: Type-safe variant management for component styling

### Backend and Database
- **Express.js**: Web application framework with middleware support
- **Drizzle ORM**: TypeScript-first ORM with PostgreSQL dialect
- **Neon Database**: Serverless PostgreSQL for cloud deployment
- **Zod**: Schema validation library for runtime type checking

### External Services
- **News API**: Third-party news aggregation service requiring API key configuration
- **Category Mapping**: Custom query mapping system for specialized technology news categories

### Development Tools
- **Vite**: Build tool with TypeScript support and development server
- **esbuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration
- **TypeScript**: Static type checking and enhanced development experience

### Deployment and Hosting
- **Replit Integration**: Custom plugins for Replit development environment
- **Environment Variables**: Configuration management for API keys and database connections
- **Static Asset Serving**: Vite-based static file serving in production