# Blog Website Specification

## Project Overview
- **Project Name**: ElegantBlog
- **Type**: Full-stack blog website with admin panel
- **Core Functionality**: A modern, SEO-optimized blog platform with AI-powered blog generation
- **Target Users**: Content creators, bloggers, and website owners

## Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: SQLite with better-sqlite3
- **Frontend**: Vanilla HTML/CSS/JS (no frameworks for simplicity)
- **Authentication**: Session-based auth with bcrypt
- **AI Integration**: Configurable AI providers (OpenAI, Anthropic)

## UI/UX Specification

### Public Blog Pages

#### Color Palette
- **Primary**: `#1a1a2e` (Deep navy)
- **Secondary**: `#16213e` (Dark blue)
- **Accent**: `#e94560` (Coral red)
- **Background**: `#0f0f1a` (Near black)
- **Surface**: `#1f1f3a` (Card background)
- **Text Primary**: `#f5f5f5` (Off-white)
- **Text Secondary**: `#a0a0b0` (Muted gray)
- **Border**: `#2a2a4a` (Subtle border)

#### Typography
- **Headings**: 'Playfair Display', serif (elegant, editorial feel)
- **Body**: 'Source Sans 3', sans-serif (clean readability)
- **Code**: 'JetBrains Mono', monospace

#### Layout
- **Max Content Width**: 1200px
- **Blog Card Grid**: 3 columns on desktop, 2 on tablet, 1 on mobile
- **Spacing**: 8px base unit (8, 16, 24, 32, 48, 64)

#### Components
1. **Navigation Bar**: Fixed top, glass-morphism effect, logo left, links right
2. **Hero Section**: Full-width featured post with gradient overlay
3. **Blog Cards**: Image top, category tag, title, excerpt, author, date, read time
4. **Blog Post View**: Clean reading layout, table of contents sidebar
5. **Footer**: 4-column layout with links, newsletter signup

### Admin Dashboard

#### Color Palette
- **Primary**: `#2d3748` (Slate)
- **Accent**: `#48bb78` (Green for actions)
- **Danger**: `#f56565` (Red for delete)
- **Background**: `#1a202c` (Dark)
- **Surface**: `#2d3748` (Cards)
- **Sidebar**: `#171923` (Fixed sidebar)

#### Layout
- **Sidebar**: 250px fixed left
- **Main Content**: Fluid width
- **Header**: Page title, user menu

#### Components
1. **Dashboard Overview**: Stats cards, recent posts, quick actions
2. **Posts Management**: Table with CRUD actions, status badges
3. **Categories/Tags**: Simple management list
4. **AI Settings**: Provider configuration form
5. **Settings**: Site configuration (title, description, etc.)

## Functionality Specification

### Public Features
1. **Blog Listing**: Paginated list of published posts
2. **Blog Post View**: Full article with SEO metadata
3. **Category Pages**: Filter by category
4. **Search**: Basic keyword search
5. **RSS Feed**: Auto-generated RSS 2.0
6. **Sitemap**: Auto-generated XML sitemap
7. **SEO**: Meta tags, Open Graph, JSON-LD

### Admin Features
1. **Authentication**: Login/logout with session
2. **Dashboard**: Overview statistics
3. **Posts CRUD**: Create, edit, delete, publish/draft
4. **Categories**: Manage categories and tags
5. **AI Generation**: Generate blog posts using configured AI
6. **Settings**: Site name, description, AI configuration

### AI Integration
- **Supported Providers**: OpenAI (GPT), Anthropic (Claude)
- **Configuration**: API key, model selection, temperature
- **Features**:
  - Generate blog post from topic
  - Generate title suggestions
  - Generate meta description
  - Expand bullet points to full content

### SEO Compliance
- Semantic HTML5
- Meta tags (title, description, keywords)
- Open Graph tags
- Twitter Card tags
- JSON-LD structured data
- XML sitemap
- RSS feed
- Canonical URLs
- Fast loading (minimal JS, optimized images)

## Database Schema

### users
- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE)
- password_hash (TEXT)
- created_at (DATETIME)

### posts
- id (INTEGER PRIMARY KEY)
- title (TEXT)
- slug (TEXT UNIQUE)
- content (TEXT)
- excerpt (TEXT)
- featured_image (TEXT)
- status (TEXT: 'draft' | 'published')
- category_id (INTEGER FK)
- author_id (INTEGER FK)
- meta_title (TEXT)
- meta_description (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)
- published_at (DATETIME)

### categories
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- slug (TEXT UNIQUE)
- description (TEXT)

### settings
- id (INTEGER PRIMARY KEY)
- key (TEXT UNIQUE)
- value (TEXT)

## API Endpoints

### Public
- GET /api/posts - List published posts
- GET /api/posts/:slug - Get single post
- GET /api/categories - List categories
- GET /api/categories/:slug/posts - Posts by category
- GET /sitemap.xml - XML sitemap
- GET /rss.xml - RSS feed

### Admin (Protected)
- POST /api/admin/login - Login
- POST /api/admin/logout - Logout
- GET /api/admin/dashboard - Dashboard stats
- GET /api/admin/posts - List all posts
- POST /api/admin/posts - Create post
- PUT /api/admin/posts/:id - Update post
- DELETE /api/admin/posts/:id - Delete post
- GET /api/admin/categories - List categories
- POST /api/admin/categories - Create category
- PUT /api/admin/categories/:id - Update category
- DELETE /api/admin/categories/:id - Delete category
- GET /api/admin/settings - Get settings
- PUT /api/admin/settings - Update settings
- POST /api/admin/ai/generate - Generate content

## Acceptance Criteria

### Visual
- [ ] Modern dark theme with coral accents
- [ ] Responsive on all screen sizes
- [ ] Smooth animations and transitions
- [ ] Clean typography hierarchy
- [ ] Professional admin interface

### Functional
- [ ] User can register/login to admin
- [ ] Admin can create/edit/delete posts
- [ ] Posts display on public blog
- [ ] Categories filter posts
- [ ] AI generates content (with valid API key)
- [ ] Settings persist
- [ ] SEO tags render correctly

### Technical
- [ ] SQLite database works
- [ ] Session auth works
- [ ] API returns proper JSON
- [ ] No console errors
- [ ] Fast page loads
