# Glance Visual Editor - Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Version History](#version-history)
3. [Configuration System](#configuration-system)
4. [Widget System Architecture](#widget-system-architecture)
5. [Theme System](#theme-system)
6. [Page & Column Layout](#page--column-layout)
7. [Template Rendering](#template-rendering)
8. [Authentication & Server](#authentication--server)
9. [Visual Editor Requirements](#visual-editor-requirements)
10. [Development Workflow](#development-workflow)
11. [Styling Guide](#styling-guide)

---

## Project Overview

Glance is a self-hosted dashboard application written in Go that displays widgets configured via YAML. The application follows a strict architecture:

- **Language**: Go (Backend), Vanilla JS (Frontend)
- **Configuration**: YAML-based with environment variable support
- **Rendering**: Server-side Go templates
- **Update Model**: Widgets update independently based on cache duration
- **State Management**: No global state; each widget manages its own state

### Key Files

```
internal/glance/
├── config.go              # Configuration parsing & validation
├── config-fields.go       # Custom YAML field types
├── widget.go              # Widget base interface
├── widget-*.go            # Individual widget implementations
├── theme.go               # Theme system
├── glance.go              # Application & HTTP server
├── auth.go                # Authentication system
└── templates/             # Go HTML templates
```

---

## Version History

### v0.1 - Core Infrastructure
Project setup with Docker, Express backend, React/TypeScript frontend, WebSocket for live updates, and basic YAML read/write.

### v0.2 - Layout Editor
Page management, column designer, widget palette (27 types), and drag-and-drop. UI later redesigned with two-mode interface (Edit/Preview).

### v0.3 - Widget Configuration
Widget editor panel with schema-driven forms, specialized inputs (Duration, HSL Color, Array, KeyValue), debounced saves with file locking.

### v0.4 - Advanced Features
Theme Designer with presets, Monaco YAML editor with auto-completion, Environment Variables Manager, Validation Panel, Custom API Builder with Go template support.

### v0.4.5 - UX Improvements
N8N-style right sidebar for widget settings, improved color contrast, clickable empty columns, animated drag-and-drop. *(CSS later migrated to Tailwind in v0.4.7)*

### v0.4.6 - Bug Fixes
YAML parse error handling with recovery UI, Monaco sync fixes, automatic initial backup, runtime GLANCE_URL, expandable text editor, widget copy/move between pages.

### v0.4.7 - Tailwind Migration
Full migration from legacy CSS classes (~3,200 lines) to Tailwind CSS v4. All styling now uses utility classes with Nord-based theme configuration.

### v0.5 - Quality of Life
Undo/Redo system (50 entry history), YAML include file management, validation navigation to YAML line, UI reorganization (theme to sidebar, env vars to sidebar), separated Import/Export panels.

### v1.0 - Production Readiness (Planning)
Comprehensive testing, documentation, error handling, performance optimization, input validation, and security hardening.

---

## Configuration System

### Configuration Structure

The main configuration is defined in `internal/glance/config.go:30`:

```go
type config struct {
    Server struct {
        Host       string
        Port       uint16
        Proxied    bool
        AssetsPath string
        BaseURL    string
    }
    
    Auth struct {
        SecretKey string
        Users     map[string]*user
    }
    
    Document struct {
        Head template.HTML
    }
    
    Theme struct {
        themeProperties
        CustomCSSFile   string
        DisablePicker   bool
        Presets         orderedYAMLMap[string, *themeProperties]
    }
    
    Branding struct {
        HideFooter         bool
        CustomFooter       template.HTML
        LogoText           string
        LogoURL            string
        FaviconURL         string
        AppName            string
        AppIconURL         string
        AppBackgroundColor string
    }
    
    Pages []page
}
```

### Configuration Parsing

**Location**: `internal/glance/config.go:94-129`

The configuration parsing process:

1. **Variable Substitution** (`parseConfigVariables`): Replaces environment variables
   - `${VAR_NAME}` - Environment variable
   - `${secret:name}` - Docker secrets from `/run/secrets/`
   - `${readFileFromEnv:VAR}` - Read file path from environment variable
   - `\${VAR}` - Escaped, treated as literal

2. **YAML Unmarshaling**: Uses `gopkg.in/yaml.v3`

3. **Include Processing** (`parseYAMLIncludes`): Supports `$include` directive
   - Recursion depth limited to 20
   - Relative paths resolved from parent file
   - Watch system monitors all included files

4. **Validation** (`isConfigStateValid`): Validates configuration structure
   - At least 1 page required
   - Pages must have 1-3 columns (1-2 for slim width)
   - Each page must have 1-2 full-width columns
   - Page slugs must not conflict with reserved routes

5. **Widget Initialization**: Each widget's `initialize()` method is called

### File Watching

**Location**: `internal/glance/config.go:305-445`

- Uses `fsnotify` for file system events
- 500ms debounce on changes
- Tracks all included files
- Auto-reloads on write/rename/remove events

### Custom Field Types

**Location**: `internal/glance/config-fields.go`

#### HSL Color Field
```go
type hslColorField struct {
    H float64  // 0-360
    S float64  // 0-100
    L float64  // 0-100
}
```
Accepts: `"240 13 95"`, `"hsl(240, 13%, 95%)"`, `"240, 13, 95"`

#### Duration Field
```go
type durationField time.Duration
```
Accepts: `"30s"`, `"5m"`, `"2h"`, `"1d"`

#### Custom Icon Field
```go
type customIconField struct {
    URL        template.URL
    AutoInvert bool
}
```
Prefixes:
- `si:name` → Simple Icons (auto-invert)
- `di:name` → Dashboard Icons
- `mdi:name` → Material Design Icons (auto-invert)
- `sh:name` → Selfhost Icons
- `auto-invert https://...` → Custom URL with invert

#### Proxy Options Field
```go
type proxyOptionsField struct {
    URL           string
    AllowInsecure bool
    Timeout       durationField
}
```

---

## Widget System Architecture

### Widget Interface

**Location**: `internal/glance/widget.go:126-139`

Every widget must implement:

```go
type widget interface {
    // Public methods (called in templates)
    Render() template.HTML
    GetType() string
    GetID() uint64
    
    // Internal methods
    initialize() error
    requiresUpdate(*time.Time) bool
    setProviders(*widgetProviders)
    update(context.Context)
    setID(uint64)
    handleRequest(http.ResponseWriter, *http.Request)
    setHideHeader(bool)
}
```

### Widget Base

**Location**: `internal/glance/widget.go:149-167`

All widgets embed `widgetBase`:

```go
type widgetBase struct {
    ID                  uint64
    Providers           *widgetProviders
    Type                string
    Title               string
    TitleURL            string
    HideHeader          bool
    CSSClass            string
    CustomCacheDuration durationField
    ContentAvailable    bool
    WIP                 bool
    Error               error
    Notice              error
    cacheDuration       time.Duration
    cacheType           cacheType
    nextUpdate          time.Time
    updateRetriedTimes  int
}
```

### Cache Types

**Location**: `internal/glance/widget.go:141-147`

```go
const (
    cacheTypeInfinite    // Never updates
    cacheTypeDuration    // Updates after duration
    cacheTypeOnTheHour   // Updates at top of hour
)
```

### Widget Factory

**Location**: `internal/glance/widget.go:20-91`

```go
func newWidget(widgetType string) (widget, error)
```

Supported widget types:
- `calendar`, `calendar-legacy`, `clock`
- `weather`, `bookmarks`, `iframe`, `html`
- `hacker-news`, `lobsters`, `reddit`
- `releases`, `videos`, `markets`
- `rss`, `monitor`, `search`
- `twitch-top-games`, `twitch-channels`
- `change-detection`, `repository`
- `extension`, `group`, `split-column`
- `dns-stats`, `docker-containers`
- `server-stats`, `custom-api`, `to-do`

### Widget Update Lifecycle

**Location**: `internal/glance/glance.go:233-270`

1. Check if widget `requiresUpdate(now)`
2. Call `widget.update(context)` in goroutine
3. Widget fetches data
4. Widget renders to internal buffer
5. Sets `nextUpdate` time based on cache type
6. On error: schedules early retry with exponential backoff (1², 2², 3², 4², 5² minutes)

### Container Widgets

**Location**: `internal/glance/widget-container.go`

Widgets that contain other widgets (group, split-column):

```go
type containerWidgetBase struct {
    Widgets widgets
}
```

Methods:
- `_initializeWidgets()` - Initialize all child widgets
- `_update(ctx)` - Update outdated children concurrently
- `_setProviders()` - Pass providers to children
- `_requiresUpdate()` - Check if any child needs update

### Example Widget Implementation

**Location**: `internal/glance/widget-rss.go`

```go
type rssWidget struct {
    widgetBase       `yaml:",inline"`
    FeedRequests     []rssFeedRequest
    Style            string
    ThumbnailHeight  float64
    CardHeight       float64
    Limit            int
    CollapseAfter    int
    SingleLineTitles bool
    PreserveOrder    bool
    Items            rssFeedItemList
    NoItemsMessage   string
}

func (widget *rssWidget) initialize() error {
    widget.withTitle("RSS Feed").withCacheDuration(2 * time.Hour)
    // Set defaults...
    return nil
}

func (widget *rssWidget) update(ctx context.Context) {
    items, err := widget.fetchItemsFromFeeds()
    if !widget.canContinueUpdateAfterHandlingErr(err) {
        return
    }
    widget.Items = items
}

func (widget *rssWidget) Render() template.HTML {
    return widget.renderTemplate(widget, rssWidgetTemplate)
}
```

### Custom API Widget (Advanced)

**Location**: `internal/glance/widget-custom-api.go`

The most flexible widget - allows custom API requests and Go templates:

```go
type customAPIWidget struct {
    widgetBase
    *CustomAPIRequest
    Subrequests       map[string]*CustomAPIRequest
    Options           customAPIOptions
    Template          string
    Frameless         bool
    compiledTemplate  *template.Template
    CompiledHTML      template.HTML
}
```

Template functions available (`customAPITemplateFuncs`):
- Math: `add`, `sub`, `mul`, `div`, `mod`, `toFloat`, `toInt`
- Time: `now`, `offsetNow`, `duration`, `parseTime`, `formatTime`, `parseLocalTime`, `toRelativeTime`, `startOfDay`, `endOfDay`
- String: `trimPrefix`, `trimSuffix`, `trimSpace`, `replaceAll`, `replaceMatches`, `findMatch`, `findSubmatch`, `concat`
- Array: `sortByString`, `sortByInt`, `sortByFloat`, `sortByTime`, `unique`
- Request: `newRequest`, `withHeader`, `withParameter`, `withStringBody`, `getResponse`
- JSON: Access via `decoratedGJSONResult` with methods like `String()`, `Int()`, `Float()`, `Bool()`, `Array()`, `Get()`

---

## Theme System

### Theme Properties

**Location**: `internal/glance/theme.go:41-54`

```go
type themeProperties struct {
    BackgroundColor          *hslColorField
    PrimaryColor             *hslColorField
    PositiveColor            *hslColorField
    NegativeColor            *hslColorField
    Light                    bool
    ContrastMultiplier       float32
    TextSaturationMultiplier float32
    
    // Computed fields
    Key                  string
    CSS                  template.CSS
    PreviewHTML          template.HTML
    BackgroundColorAsHex string
}
```

### Theme Compilation

**Location**: `internal/glance/theme.go:56-76`

1. Executes `theme-style.gotmpl` template with theme properties
2. Generates CSS with HSL color values
3. Compiles preview HTML from `theme-preset-preview.html`
4. Converts background color to hex for manifest

### Theme Selection

**Location**: `internal/glance/theme.go:15-39`

- Stored in `theme` cookie
- Defaults to `"default"` theme
- Can select from preset themes
- Theme picker UI appears in header (unless disabled)

### Default Themes

**Location**: `internal/glance/glance.go:104-128`

```yaml
# Default dark theme (if not specified)
background-color: 0 0 16
primary-color: 0 0 0
contrast-multiplier: 1.0

# Default light theme (always added)
light: true
background-color: 240 13 95
primary-color: 230 100 30
negative-color: 0 70 50
contrast-multiplier: 1.3
text-saturation-multiplier: 0.5
```

---

## Page & Column Layout

### Page Structure

**Location**: `internal/glance/config.go:77-92`

```go
type page struct {
    Title                  string
    Slug                   string
    Width                  string  // "", "wide", "slim"
    DesktopNavigationWidth string
    ShowMobileHeader       bool
    HideDesktopNavigation  bool
    CenterVertically       bool
    HeadWidgets            widgets
    Columns                []struct {
        Size    string  // "small", "full"
        Widgets widgets
    }
    PrimaryColumnIndex int8
}
```

### Layout Rules

**Validation Location**: `internal/glance/config.go:486-534`

1. **Page Width**:
   - Default: 3 columns max
   - Wide: 3 columns max
   - Slim: 2 columns max

2. **Column Sizes**:
   - Must be "small" or "full"
   - Exactly 1 or 2 columns must be "full"
   - Remaining columns are "small"

3. **Layouts**:
   - `[full]` - Single full column
   - `[small, full]` - Small sidebar + full
   - `[full, small]` - Full + small sidebar
   - `[small, full, small]` - Two sidebars + full center
   - `[full, full]` - Two full columns

4. **Primary Column**:
   - First "full" column found
   - Used for mobile navigation default

5. **Slug Generation**:
   - Auto-generated from title if not specified
   - Used in URL: `/{slug}`
   - Empty slug for first page (home)

### Head Widgets

Special widgets displayed above page columns:
- Don't appear in columns
- Typically used for markets ticker, etc.
- Rendered in `page.html` template

---

## Template Rendering

### Template System

**Location**: `internal/glance/templates/`

Glance uses Go's `html/template` package with the following structure:

#### Document Template (`document.html`)
Base HTML structure, defines blocks:
- `document-title`
- `document-head-after`
- `document-body`

#### Page Template (`page.html`)
Extends document.html:
- Desktop navigation header
- Mobile navigation
- Theme picker
- Page content container
- Footer

#### Widget Base Template (`widget-base.html`)
Wrapper for all widgets:
```html
<div class="widget widget-type-{{ .GetType }}{{ if .CSSClass }} {{ .CSSClass }}{{ end }}">
    {{- if not .HideHeader }}
    <div class="widget-header">
        <h2>{{ .Title }}</h2>
        <!-- Error/notice icons -->
    </div>
    {{- end }}
    <div class="widget-content">
        {{- if .ContentAvailable }}
        {{ block "widget-content" . }}{{ end }}
        {{- else }}
        <!-- Error display -->
        {{- end}}
    </div>
</div>
```

#### Widget-Specific Templates
Each widget has its own template that defines the `widget-content` block.

### Template Data

**Location**: `internal/glance/glance.go:280-288`

```go
type templateData struct {
    App     *application
    Page    *page
    Request templateRequestData
}

type templateRequestData struct {
    Theme *themeProperties
}
```

### Rendering Flow

**Location**: `internal/glance/glance.go:306-332`

1. User requests page: `GET /{page_slug}`
2. Server renders full HTML with `page.html`
3. JavaScript loads: `static/js/page.js`
4. JS requests: `GET /api/pages/{page_slug}/content/`
5. Server renders: `page-content.html` (just widgets)
6. JS updates DOM with new content
7. JS polls for updates (respects widget cache times)

### Widget Rendering

**Location**: `internal/glance/widget.go:217-241`

```go
func (w *widgetBase) renderTemplate(data any, t *template.Template) template.HTML {
    w.templateBuffer.Reset()
    err := t.Execute(&w.templateBuffer, data)
    if err != nil {
        // Set error and re-render
    }
    return template.HTML(w.templateBuffer.String())
}
```

### Template Functions

Global template functions available to all widgets:
- Standard Go template functions
- Custom functions from `customAPITemplateFuncs` (for custom-api widget)

---

## Authentication & Server

### Authentication System

**Location**: `internal/glance/auth.go`

#### Session Tokens

Structure (base64 encoded):
```
[32 bytes: username hash] + [4 bytes: expiry timestamp] + [32 bytes: HMAC signature]
```

- Generated with `generateSessionToken()`
- Verified with `verifySessionToken()`
- Stored in `session_token` cookie
- Valid for 14 days, regenerated after 7 days
- HMAC signature prevents tampering

#### Secret Key

Format: 64 bytes total
- First 32 bytes: Token signing key
- Last 32 bytes: Username hashing key

Must be base64 encoded in config:
```yaml
auth:
  secret-key: <base64 encoded 64 bytes>
  users:
    admin:
      password: "plaintext_password"
      # OR
      password-hash: "$2a$10$..."  # bcrypt hash
```

#### Rate Limiting

**Location**: `internal/glance/auth.go:134-179`

- Max 5 attempts per 5 minutes per IP
- Failed attempts tracked in memory
- Old attempts cleaned up automatically
- Returns `429 Too Many Requests` with `Retry-After` header

#### Authorization Flow

1. User submits credentials to `POST /api/authenticate`
2. Server validates username/password with bcrypt
3. Server generates session token
4. Token stored in httpOnly, SameSite=Lax cookie
5. Future requests include cookie
6. Server validates token on each request
7. User redirected to `/login` if unauthorized

### Server Configuration

**Location**: `internal/glance/config.go:31-37`

```go
Server struct {
    Host       string  // Default: "" (all interfaces)
    Port       uint16  // Default: 8080
    Proxied    bool    // Trust X-Forwarded-For header
    AssetsPath string  // Custom assets directory
    BaseURL    string  // Base path for reverse proxy
}
```

### HTTP Routes

**Location**: `internal/glance/glance.go:436-489`

```go
// Pages
GET  /                              → handlePageRequest
GET  /{page}                        → handlePageRequest
GET  /api/pages/{page}/content/     → handlePageContentRequest

// Auth
GET  /login                         → handleLoginPageRequest
GET  /logout                        → handleLogoutRequest
POST /api/authenticate              → handleAuthenticationAttempt

// Theme
POST /api/set-theme/{key}           → handleThemeChangeRequest

// Widgets
*    /api/widgets/{widget}/{path...} → handleWidgetRequest

// Health
GET  /api/healthz                   → 200 OK

// Static
GET  /static/{hash}/{path...}       → Static file server
GET  /manifest.json                 → App manifest
GET  /assets/{path...}              → User assets (if configured)
```

### Static Assets

**Location**: `internal/glance/embed.go`

Assets embedded at build time:
- CSS bundles
- JavaScript modules
- Icons, fonts
- SVG files

Hash-based cache busting:
```
/static/{hash}/css/bundle.css
/static/{hash}/js/page.js
```

Cache-Control: 24 hours

---

## Visual Editor Requirements

### Core Features Needed

#### 1. Live Configuration Management

The visual editor must:
- Parse existing `glance.yml` file
- Generate valid YAML output
- Support environment variable placeholders
- Handle include directives
- Preserve comments and formatting where possible

#### 2. Live Preview

- Embed Glance as subprocess or Docker container
- Watch `glance.yml` for changes
- Hot-reload Glance when config changes
- Display live dashboard in iframe or webview
- Support for live theme preview

#### 3. Drag-and-Drop Interface

**Page Management:**
- Create/edit/delete pages
- Reorder pages
- Configure page properties:
  - Name, slug, width
  - Desktop navigation width
  - Mobile header visibility
  - Center vertically option

**Column Layout:**
- Visual column layout designer
- Drag columns to resize (small/full)
- Validate: 1-2 full columns required
- Show layout preview

**Widget Management:**
- Widget palette/library
- Drag widgets into columns
- Reorder widgets within column
- Drag between columns
- Visual indicators for collapse/expand

#### 4. Widget Configuration UI

For each widget type, provide forms for:

**Common Properties:**
- Type (dropdown)
- Title (text)
- Title URL (text)
- Hide header (checkbox)
- CSS class (text)
- Cache duration (duration picker)

**Widget-Specific Properties:**

Generate forms dynamically based on widget schema. Example for RSS widget:

```typescript
interface RSSWidgetConfig {
  type: "rss"
  title?: string
  style?: "horizontal-cards" | "horizontal-cards-2" | "detailed-list" | "vertical-list"
  limit?: number
  "collapse-after"?: number
  "single-line-titles"?: boolean
  "preserve-order"?: boolean
  "thumbnail-height"?: number
  "card-height"?: number
  feeds: Array<{
    url: string
    title?: string
    limit?: number
    "hide-categories"?: boolean
    "hide-description"?: boolean
    "item-link-prefix"?: string
    headers?: Record<string, string>
  }>
}
```

Need UI for:
- Text inputs
- Number inputs
- Dropdowns/selects
- Checkboxes
- Color pickers (HSL)
- Duration pickers (s/m/h/d)
- Arrays (add/remove items)
- Nested objects (feed configuration)
- Icon picker (with prefix support)
- Headers/parameters key-value editor

#### 5. Theme Designer

Visual theme editor:
- Color picker for HSL colors
  - Hue slider (0-360)
  - Saturation slider (0-100)
  - Lightness slider (0-100)
- Light/dark mode toggle
- Contrast multiplier slider
- Text saturation multiplier slider
- Custom CSS file upload
- Preset management
- Live preview

#### 6. Custom Widget Support

For `custom-api` widget:
- API request builder
  - URL input
  - Method dropdown
  - Headers editor
  - Parameters editor
  - Body editor (JSON/string)
- Subrequests management
- Template editor with:
  - Syntax highlighting
  - Auto-completion for available functions
  - Template validation
  - Error display
- Options editor (key-value)

For `extension` widget:
- URL input
- Headers editor
- Parameters editor
- Allow dangerous HTML checkbox

#### 7. Environment Variables

- Display environment variable usage
- Highlight missing variables
- Provide mock values for preview
- Warning when using undefined variables
- Quick actions:
  - Define variable
  - Escape variable (add backslash)
  - Convert to secret
  - Convert to file reference

#### 8. Validation & Errors

Real-time validation:
- YAML syntax
- Config structure
- Required fields
- Value ranges
- Duplicate slugs
- Reserved slugs
- Column layout rules
- Widget type existence
- Circular includes

Display errors:
- Inline in forms
- Summary panel
- Highlighting in code view

---

## Docker Image Build

### Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend + Frontend
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --production

# Copy backend code
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:8081/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

CMD ["node", "server.js"]
```

### Environment Variables

```bash
# Required
CONFIG_PATH=/app/config/glance.yml    # Path to glance.yml
GLANCE_URL=http://glance:8080         # Glance container URL

# Optional
EDITOR_PORT=8081                      # Editor port (default: 8081)
NODE_ENV=production                   # Environment
LOG_LEVEL=info                        # Logging level
ENABLE_AUTH=false                     # Enable authentication
AUTH_USER=admin                       # Editor username
AUTH_PASS=changeme                    # Editor password
```

## Progress Documentation

For detailed implementation notes, see the progress files in `docs/`:
- `v0.1_PROGRESS.md` - Core infrastructure
- `v0.2_PROGRESS.md` - Layout editor
- `v0.3_PROGRESS.md` - Widget configuration
- `v0.4_PROGRESS.md` - Advanced features (theme, Monaco, validation, custom API)
- `v0.4.5_PROGRESS.md` - UX improvements (right sidebar, contrast, drag-drop)
- `v0.4.6_PROGRESS.md` - Bug fixes (error handling, backups, copy/move)
- `v0.4.7_PROGRESS.md` - Tailwind CSS migration
- `v0.5_PROGRESS.md` - Quality of life (undo/redo, include files, UI reorganization)
- `v1.0_PROGRESS.md` - Production readiness (planning)

---

## Development Workflow

### Pre-commit Requirements

**IMPORTANT:** Always run lint and tests before committing changes.

```bash
# Frontend lint (required - must pass with 0 warnings)
cd frontend && npm run lint

# Frontend tests (required - all must pass)
cd frontend && npm test

# Backend tests (required - all must pass)
cd backend && npm test
```

### Commit Process

1. Make your changes
2. Run lint: `cd frontend && npm run lint`
3. Fix any lint errors before proceeding
4. Run tests: `cd frontend && npm test` and `cd backend && npm test`
5. Fix any failing tests
6. Stage and commit your changes

### Auto-fix Lint Errors

Many lint errors can be auto-fixed:

```bash
cd frontend && npm run lint -- --fix
```

### Common Lint Rules

- Use single quotes for strings (not double quotes)
- Remove unused imports and variables
- Follow TypeScript strict mode requirements

---

## Styling Guide

The project uses **Tailwind CSS v4** for all styling. Legacy CSS classes have been fully migrated to Tailwind utility classes.

### Theme Configuration

All theme colors are defined in `frontend/src/index.css` using Tailwind's `@theme` block:

```css
@theme {
  /* Nord Palette */
  --color-nord0: #2e3440;
  --color-nord1: #3b4252;
  /* ... nord2 through nord15 */
  
  /* Semantic Colors */
  --color-bg-primary: #2e3440;
  --color-bg-secondary: #323846;
  --color-bg-tertiary: #3d4555;
  --color-bg-elevated: #4a5264;
  --color-text-primary: #f0f4f8;
  --color-text-secondary: #c8d0dc;
  --color-text-muted: #8892a2;
  --color-accent: #8dd4e0;
  --color-accent-hover: #a8e0ea;
  --color-accent-muted: #5e81ac;
  --color-border: #4a5568;
  --color-error: #e86876;
  --color-warning: #f0d080;
  --color-success: #a8cc8c;
}
```

### Using Theme Colors

Use Tailwind utilities with the custom color names:

```tsx
// Background colors
<div className="bg-bg-primary">       // Main background
<div className="bg-bg-secondary">     // Secondary panels
<div className="bg-bg-tertiary">      // Elevated surfaces
<div className="bg-bg-elevated">      // Hover states, dropdowns

// Text colors
<span className="text-text-primary">  // Main text
<span className="text-text-secondary"> // Secondary text
<span className="text-text-muted">    // Muted/disabled text
<span className="text-accent">        // Accent/highlight text

// Border colors
<div className="border border-border"> // Standard borders

// Status colors
<span className="text-error">         // Error text
<span className="text-warning">       // Warning text
<span className="text-success">       // Success text
<div className="bg-error/10">         // Error background (10% opacity)
```

### Direct Nord Palette Access

For specific design needs, use Nord colors directly:

```tsx
<div className="bg-nord8">            // Frost cyan
<div className="bg-nord11">           // Aurora red
<div className="bg-nord2/30">         // Nord2 at 30% opacity
```

### Common Patterns

#### Buttons

```tsx
// Primary action button
<button className="px-3 py-1.5 bg-accent text-bg-primary hover:bg-accent-hover rounded-md text-sm font-medium transition-colors">

// Secondary button
<button className="px-3 py-1.5 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated rounded-md text-sm font-medium transition-colors border border-border">

// Danger button
<button className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 rounded-md text-sm font-medium transition-colors">
```

#### Form Inputs

```tsx
// Text input
<input className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted" />

// Select dropdown
<select className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent">
```

#### Panels & Cards

```tsx
// Floating panel
<div className="bg-bg-secondary border border-border rounded-lg shadow-xl">

// Card with hover effect
<div className="p-3 bg-bg-secondary border border-border rounded-md hover:border-accent/50 transition-colors">
```

#### Labels

```tsx
// Section header
<h4 className="text-[0.75rem] font-semibold uppercase tracking-wider text-accent mb-3 pb-2 border-b border-border">

// Form label
<label className="flex items-center gap-1.5 text-[0.75rem] font-medium text-text-secondary">
```

### Spacing Guidelines

Use standard Tailwind spacing tokens:

| Value | Pixels | Use Case |
|-------|--------|----------|
| `p-1` / `gap-1` | 4px | Tight spacing |
| `p-2` / `gap-2` | 8px | Standard small |
| `p-3` / `gap-3` | 12px | Standard medium |
| `p-4` / `gap-4` | 16px | Standard large |
| `p-6` / `gap-6` | 24px | Section spacing |

### Typography

| Class | Size | Use Case |
|-------|------|----------|
| `text-xs` | 12px | Small labels, badges |
| `text-sm` | 14px | Default body text |
| `text-base` | 16px | Headers, emphasis |
| `text-lg` | 18px | Large headers |
| `text-[0.65rem]` | 10.4px | Very small labels |
| `text-[0.75rem]` | 12px | Form labels (preferred over text-xs for consistency) |

### Avoid These Patterns

1. **Arbitrary values for common sizes** - Use tokens instead:
   ```tsx
   // Bad
   <div className="p-[0.375rem_1rem]">
   
   // Good
   <div className="py-1.5 px-4">
   ```

2. **rgba() colors** - Use opacity modifiers:
   ```tsx
   // Bad
   <div className="bg-[rgba(136,192,208,0.1)]">
   
   // Good
   <div className="bg-accent/10">
   ```

3. **Custom CSS classes** - Use Tailwind utilities:
   ```tsx
   // Bad
   <div className="form-field">
   
   // Good
   <div className="flex flex-col gap-1.5">
   ```

### Files Structure

- `frontend/src/index.css` - Theme configuration, base styles, scrollbar styles
- Component files - All styling via Tailwind utility classes in JSX

### What's in index.css

The CSS file contains only essential configuration:

1. Tailwind import
2. `@theme` block with custom colors
3. `:root` CSS variables (for runtime access)
4. Base reset styles
5. Two layout utilities (`.main-container`, `.content-area`)
6. Custom scrollbar styles (`.scrollbar-thin`)

**No component-specific CSS classes should be added to index.css.**

---

## Quick Start Guide for Development

### 1. Clone and Setup

```bash
# Create project
mkdir glance-editor
cd glance-editor
npm init -y

# Install dependencies
npm install express yaml chokidar ws ajv cors
npm install --save-dev typescript @types/node @types/express

# Frontend
cd frontend
npm create vite@latest . -- --template react-ts
npm install axios @dnd-kit/core @dnd-kit/sortable @monaco-editor/react
npm install zustand react-hook-form zod
npm install -D tailwindcss postcss autoprefixer
```

### 2. Create Basic Backend

```javascript
// backend/server.js
const express = require('express');
const fs = require('fs').promises;
const YAML = require('yaml');
const path = require('path');

const app = express();
const PORT = process.env.EDITOR_PORT || 8081;
const CONFIG_PATH = process.env.CONFIG_PATH || '/app/config/glance.yml';

app.use(express.json());
app.use(express.static('public'));

// Get current config
app.get('/api/config', async (req, res) => {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf8');
    const config = YAML.parse(content);
    res.json({ config, raw: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update config
app.put('/api/config', async (req, res) => {
  try {
    const yaml = YAML.stringify(req.body, { indent: 2 });
    
    // Atomic write
    const tempPath = `${CONFIG_PATH}.tmp`;
    await fs.writeFile(tempPath, yaml, 'utf8');
    await fs.rename(tempPath, CONFIG_PATH);
    
    // Wait for Glance to reload
    await new Promise(resolve => setTimeout(resolve, 600));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Glance Editor running on port ${PORT}`);
  console.log(`Config path: ${CONFIG_PATH}`);
});
```

### 3. Create Basic Frontend

```typescript
// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await axios.get('/api/config');
      setConfig(data.config);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      await axios.put('/api/config', config);
      alert('Config saved!');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save config');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, padding: 20 }}>
        <h1>Glance Editor</h1>
        <button onClick={saveConfig}>Save</button>
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
      <div style={{ flex: 1 }}>
        <iframe 
          src="http://localhost:8080"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}

export default App;
```

### 4. Create docker-compose.yml

```yaml
version: '3.8'

services:
  glance:
    image: glanceapp/glance:latest
    container_name: glance
    ports:
      - "8080:8080"
    volumes:
      - ./config:/app/config
    restart: unless-stopped

  glance-editor:
    build: .
    container_name: glance-editor
    ports:
      - "8081:8081"
    volumes:
      - ./config:/app/config
    environment:
      - GLANCE_URL=http://glance:8080
      - CONFIG_PATH=/app/config/glance.yml
    depends_on:
      - glance
    restart: unless-stopped
```

### 5. Create Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./
COPY --from=builder /app/frontend/dist ./public
EXPOSE 8081
CMD ["node", "server.js"]
```

### 6. Run

```bash
# Start services
docker-compose up -d

# Access editor
open http://localhost:8081

# Access Glance
open http://localhost:8080
```

---

## Docker-Based Web UI Architecture

### Overview

The visual editor will be deployed as a companion Docker container alongside Glance in a docker-compose setup. This provides a clean separation and easy deployment.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐       ┌────────────────────────┐ │
│  │  Glance Editor UI   │       │  Glance Dashboard      │ │
│  │  (Port 8081)        │       │  (Port 8080)           │ │
│  │                     │       │                        │ │
│  │  - React Frontend   │       │  - Go Application      │ │
│  │  - Node.js Backend  │       │  - Serves Dashboard    │ │
│  │  - YAML Parser      │       │  - Reads glance.yml    │ │
│  │  - File Watcher     │       │  - Auto-reloads        │ │
│  └──────────┬──────────┘       └────────┬───────────────┘ │
│             │                            │                 │
│             │   Shared Volume            │                 │
│             │   /config                  │                 │
│             │   - glance.yml             │                 │
│             │   - theme.css (optional)   │                 │
│             │   - includes/*.yml         │                 │
│             └────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Docker Compose Setup

```yaml
version: '3.8'

services:
  glance:
    image: glanceapp/glance:latest
    container_name: glance
    ports:
      - "8080:8080"
    volumes:
      - ./glance-config:/app/config
    environment:
      - TZ=America/New_York
    restart: unless-stopped

  glance-editor:
    image: glanceapp/glance-editor:latest  # Your new editor image
    container_name: glance-editor
    ports:
      - "8081:8081"
    volumes:
      - ./glance-config:/app/config  # Same volume as Glance
    environment:
      - GLANCE_URL=http://glance:8080
      - CONFIG_PATH=/app/config/glance.yml
      - EDITOR_PORT=8081
    depends_on:
      - glance
    restart: unless-stopped

volumes:
  glance-config:
```

### Component Architecture

#### Backend (Node.js/Express)

```
glance-editor/
├── backend/
│   ├── server.js              # Express server
│   ├── routes/
│   │   ├── config.js          # Config CRUD operations
│   │   ├── preview.js         # Glance preview proxy
│   │   ├── validation.js      # Config validation
│   │   └── widgets.js         # Widget schemas
│   ├── services/
│   │   ├── yamlService.js     # YAML parsing/generation
│   │   ├── fileService.js     # File operations
│   │   ├── watchService.js    # File watching
│   │   └── glanceService.js   # Glance interaction
│   ├── schemas/
│   │   └── widgets/           # Widget schemas (JSON)
│   └── utils/
│       ├── validator.js       # Config validation
│       └── envVars.js         # Environment variable handling
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PageEditor/
│   │   │   ├── WidgetPalette/
│   │   │   ├── WidgetEditor/
│   │   │   ├── ThemeDesigner/
│   │   │   ├── Preview/
│   │   │   └── CodeEditor/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── utils/
│   └── public/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### API Endpoints

The editor backend exposes these REST endpoints:

```typescript
// Configuration Management
GET    /api/config              // Get current config
PUT    /api/config              // Update entire config
PATCH  /api/config              // Partial update

// Page Management
GET    /api/pages               // List all pages
POST   /api/pages               // Create page
PUT    /api/pages/:index        // Update page
DELETE /api/pages/:index        // Delete page
POST   /api/pages/:index/move   // Reorder page

// Widget Management
GET    /api/pages/:pageIndex/columns/:columnIndex/widgets
POST   /api/pages/:pageIndex/columns/:columnIndex/widgets
PUT    /api/pages/:pageIndex/columns/:columnIndex/widgets/:widgetIndex
DELETE /api/pages/:pageIndex/columns/:columnIndex/widgets/:widgetIndex
POST   /api/pages/:pageIndex/columns/:columnIndex/widgets/:widgetIndex/move

// Widget Schemas
GET    /api/widget-schemas      // Get all widget schemas
GET    /api/widget-schemas/:type // Get specific widget schema

// Theme Management
GET    /api/theme               // Get theme config
PUT    /api/theme               // Update theme
GET    /api/theme/presets       // List theme presets
POST   /api/theme/presets       // Create theme preset

// Validation
POST   /api/validate            // Validate config
POST   /api/validate/widget     // Validate widget config

// File Operations
GET    /api/files               // List config directory files
GET    /api/files/:path         // Read file
PUT    /api/files/:path         // Write file
DELETE /api/files/:path         // Delete file

// Glance Preview
GET    /api/preview             // Proxy to Glance dashboard
POST   /api/preview/reload      // Trigger Glance reload (watches file)

// Environment Variables
GET    /api/env-vars            // List detected env vars
POST   /api/env-vars/mock       // Set mock values for preview
```

### File Management Strategy

#### Shared Volume Access

Both containers mount the same volume:
- **Glance**: Reads from `/app/config/glance.yml` (or custom path)
- **Editor**: Reads/writes to `/app/config/glance.yml`

#### File Watching

The editor backend watches `glance.yml` for external changes:

```javascript
// backend/services/watchService.js
const chokidar = require('chokidar');

class WatchService {
  constructor(configPath) {
    this.watcher = chokidar.watch(configPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });
    
    this.watcher.on('change', (path) => {
      console.log(`Config changed externally: ${path}`);
      // Notify connected WebSocket clients
      this.notifyClients('config-changed', { path });
    });
  }
  
  notifyClients(event, data) {
    // WebSocket broadcast to all connected frontends
  }
}
```

#### Atomic Writes

To prevent Glance from reading partial writes:

```javascript
// backend/services/fileService.js
const fs = require('fs').promises;
const path = require('path');

async function writeConfigSafely(configPath, content) {
  const tempPath = `${configPath}.tmp`;
  const backupPath = `${configPath}.backup`;
  
  // Write to temp file
  await fs.writeFile(tempPath, content, 'utf8');
  
  // Backup current config
  try {
    await fs.copyFile(configPath, backupPath);
  } catch (err) {
    // Ignore if config doesn't exist yet
  }
  
  // Atomic rename
  await fs.rename(tempPath, configPath);
  
  return true;
}
```

### Technology Stack

#### Backend
- **Runtime**: Node.js 20 (Alpine Linux for small image)
- **Framework**: Express.js
- **YAML Parser**: `yaml` (preserves formatting) or `js-yaml`
- **File Watching**: `chokidar`
- **WebSocket**: `ws` or `socket.io` (for live updates)
- **Validation**: `ajv` (JSON Schema validator)

#### Frontend
- **Framework**: React 18 with TypeScript
- **Drag & Drop**: `@dnd-kit/core` or `react-beautiful-dnd`
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **UI Components**: Tailwind CSS + Headless UI or shadcn/ui
- **State Management**: Zustand or React Context
- **HTTP Client**: Axios or native fetch
- **Forms**: React Hook Form + Zod validation

#### Build & Deployment
- **Bundler**: Vite (fast builds, HMR)
- **Docker**: Multi-stage build (build frontend → copy to backend)
- **Image**: Node:20-alpine (base) → ~100MB final image

### Technical Considerations

#### 1. Handling Glance's File Watching

Since Glance already watches `glance.yml`, the editor just needs to:
1. Write the file atomically
2. Wait 500ms+ for Glance to detect and reload
3. Poll Glance's `/api/healthz` to detect when reload is complete
4. Notify frontend that preview is ready

```javascript
async function saveConfigAndWaitForReload(config) {
  // Save config
  await fileService.writeConfigSafely('/app/config/glance.yml', config);
  
  // Wait for Glance to reload (it has 500ms debounce)
  await sleep(600);
  
  // Poll until Glance responds (indicates reload complete)
  const reloaded = await pollUntilReady('http://glance:8080/api/healthz', {
    timeout: 5000,
    interval: 200
  });
  
  return reloaded;
}
```

#### 2. YAML Formatting Preservation

Use `yaml` library with custom options:

```javascript
const YAML = require('yaml');

function generateYAML(config) {
  return YAML.stringify(config, {
    indent: 2,
    lineWidth: 0,  // Don't wrap lines
    minContentWidth: 0,
    singleQuote: false,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'PLAIN'
  });
}
```

For comment preservation (advanced):
- Parse with `yaml` library (preserves comments in AST)
- Modify specific nodes
- Regenerate while preserving comments

#### 3. Environment Variables in Editor

The editor needs to handle env vars differently:

**Detection:**
```javascript
function extractEnvVars(yamlContent) {
  const envVarPattern = /\$\{(?:([a-zA-Z]+):)?([a-zA-Z0-9_-]+)\}/g;
  const vars = [];
  let match;
  
  while ((match = envVarPattern.exec(yamlContent)) !== null) {
    vars.push({
      type: match[1] || 'env',  // env, secret, readFileFromEnv
      name: match[2],
      raw: match[0]
    });
  }
  
  return vars;
}
```

**Mock Values:**
Store in separate file: `/app/config/.glance-editor-mocks.json`

```json
{
  "GITHUB_TOKEN": "ghp_mock_1234567890",
  "API_KEY": "test_key_123",
  "RSS_URL": "https://example.com/feed.xml"
}
```

**Preview with Mocks:**
When rendering preview in iframe, inject mock values:
- Option A: Proxy Glance and replace env vars in responses
- Option B: Start a separate Glance instance with mocked env vars (complex)
- **Recommended**: Just show warning about env vars, let user set real values in docker-compose

#### 4. Preview Strategy

The editor can preview Glance in two ways:

**Option A: Iframe Proxy** (Recommended)
```typescript
// Frontend component
<iframe 
  src="http://localhost:8081/api/preview" 
  style={{ width: '100%', height: '100%' }}
/>

// Backend proxy
app.get('/api/preview', (req, res) => {
  // Proxy request to Glance
  const glanceUrl = process.env.GLANCE_URL || 'http://glance:8080';
  // Forward request and response
});
```

**Option B: Direct Link**
- Just link to Glance: `http://localhost:8080`
- Requires user to have both tabs open
- Simpler but less integrated

#### 5. Multi-user Considerations

For single-user (typical self-hosted):
- No auth needed (editor only accessible on local network)
- Single WebSocket connection
- File locking not necessary

For multi-user (future):
- Add basic auth (match Glance's auth)
- WebSocket per user
- Optimistic locking (last write wins + conflict detection)

#### 6. Include File Support

When config uses `$include`:

```javascript
async function resolveIncludes(mainPath, depth = 0) {
  if (depth > 20) throw new Error('Include depth limit');
  
  const content = await fs.readFile(mainPath, 'utf8');
  const includePattern = /^[ \t]*(?:-[ \t]*)?(?:!|\$)include:[ \t]*(.+)$/gm;
  
  let resolved = content;
  let match;
  
  while ((match = includePattern.exec(content)) !== null) {
    const includePath = path.resolve(path.dirname(mainPath), match[1].trim());
    const includeContent = await resolveIncludes(includePath, depth + 1);
    resolved = resolved.replace(match[0], includeContent);
  }
  
  return resolved;
}
```

The editor should:
- Show included files in a tree view
- Allow editing included files separately
- Validate across all files
- Option to "flatten" includes into single file

### 2. YAML Handling

#### Preserve Formatting
Using standard YAML libraries will lose comments and formatting. Options:

1. **AST-based parser** (yaml-ast-parser)
   - Preserves comments
   - Allows precise edits
   - More complex

2. **Template-based** (mustache/handlebars)
   - Replace specific sections
   - Keep rest intact
   - Less flexible

3. **Regenerate entirely**
   - Clean, consistent output
   - Loses comments
   - Simpler implementation

**Recommendation:** Start with option 3 (regenerate), add comment preservation in Phase 5.

### 3. Live Reload Strategy

#### Option A: File Watching
1. Visual editor saves `glance.yml`
2. Glance detects change via fsnotify
3. Glance reloads automatically
4. Editor detects Glance restart

**Pros:** Uses Glance's built-in reload
**Cons:** No control over reload timing

#### Option B: API Endpoint
1. Add reload endpoint to Glance: `POST /api/reload`
2. Visual editor calls endpoint after save
3. Glance reloads config

**Pros:** Controlled reload timing
**Cons:** Requires Glance modification

**Recommendation:** Use Option A (file watching) to avoid modifying Glance.

### 4. Widget Schema Definition

Create a JSON schema for each widget type:

```json
{
  "type": "rss",
  "displayName": "RSS Feed",
  "description": "Display items from RSS feeds",
  "properties": {
    "title": {
      "type": "string",
      "default": "RSS Feed",
      "description": "Widget title"
    },
    "style": {
      "type": "enum",
      "values": ["horizontal-cards", "horizontal-cards-2", "detailed-list", "vertical-list"],
      "default": "vertical-list",
      "description": "Display style"
    },
    "limit": {
      "type": "number",
      "default": 25,
      "min": 1,
      "max": 100,
      "description": "Maximum items to display"
    },
    "feeds": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "required": true,
            "description": "Feed URL"
          },
          "title": {
            "type": "string",
            "description": "Override feed title"
          }
        }
      }
    }
  }
}
```

Generate forms from schema + render to YAML.

### 5. Environment Variable Handling

**Parsing:**
```typescript
interface EnvVar {
  name: string
  type: "env" | "secret" | "readFileFromEnv"
  usageLocations: Array<{
    widgetType: string
    widgetId: string
    property: string
  }>
}
```

**Mock Values:**
Store in separate file or memory:
```json
{
  "GITHUB_TOKEN": "ghp_mock_token_123",
  "API_KEY": "test_key",
  "RSS_FEED_URL": "https://example.com/feed.xml"
}
```

Apply mocks when spawning Glance for preview.

### 6. State Management

Use React Context or similar for:
- Current config state
- Undo/redo history
- Dirty state (unsaved changes)
- Validation errors
- Environment variables
- Selected page/widget

### 7. Testing Strategy

**Unit Tests:**
- YAML parser/generator
- Validation logic
- Schema processing

**Integration Tests:**
- Glance process spawning
- File watching
- Config reload

**E2E Tests:**
- Complete workflows
- Widget configuration
- Theme editing

---

## API Reference for Visual Editor

### Config Object Structure

```typescript
interface GlanceConfig {
  server?: ServerConfig
  auth?: AuthConfig
  document?: DocumentConfig
  theme?: ThemeConfig
  branding?: BrandingConfig
  pages: PageConfig[]
}

interface ServerConfig {
  host?: string
  port?: number
  proxied?: boolean
  "assets-path"?: string
  "base-url"?: string
}

interface AuthConfig {
  "secret-key": string
  users: Record<string, UserConfig>
}

interface UserConfig {
  password?: string
  "password-hash"?: string
}

interface ThemeConfig {
  "background-color"?: HSLColor
  "primary-color"?: HSLColor
  "positive-color"?: HSLColor
  "negative-color"?: HSLColor
  light?: boolean
  "contrast-multiplier"?: number
  "text-saturation-multiplier"?: number
  "custom-css-file"?: string
  "disable-picker"?: boolean
  presets?: Record<string, ThemeProperties>
}

interface HSLColor {
  h: number  // 0-360
  s: number  // 0-100
  l: number  // 0-100
}

interface PageConfig {
  name: string
  slug?: string
  width?: "wide" | "slim"
  "desktop-navigation-width"?: "wide" | "slim"
  "show-mobile-header"?: boolean
  "hide-desktop-navigation"?: boolean
  "center-vertically"?: boolean
  "head-widgets"?: WidgetConfig[]
  columns: ColumnConfig[]
}

interface ColumnConfig {
  size: "small" | "full"
  widgets: WidgetConfig[]
}

interface WidgetConfig {
  type: string
  title?: string
  "title-url"?: string
  "hide-header"?: boolean
  "css-class"?: string
  cache?: string  // "30s", "5m", "2h", "1d"
  [key: string]: any  // Widget-specific properties
}
```

### Validation Functions

```typescript
function validateConfig(config: GlanceConfig): ValidationResult
function validatePage(page: PageConfig): ValidationResult
function validateWidget(widget: WidgetConfig): ValidationResult
function validateTheme(theme: ThemeConfig): ValidationResult

interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

interface ValidationError {
  path: string  // "pages[0].columns[1].widgets[2].feeds[0].url"
  message: string
  code: string
}
```

### YAML Operations

```typescript
function parseYAML(content: string): GlanceConfig
function generateYAML(config: GlanceConfig): string
function resolveIncludes(mainFile: string): string
function extractEnvVars(config: GlanceConfig): EnvVar[]
```

### Glance Process Management

```typescript
interface GlanceProcess {
  start(configPath: string, mockEnv?: Record<string, string>): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
  isRunning(): boolean
  getPort(): number
  getErrors(): string[]
}
```

---

## Example: Building an RSS Widget Editor

Here's how you'd implement the RSS widget editor as an example:

```typescript
// 1. Widget Schema
const rssWidgetSchema = {
  type: "rss",
  properties: {
    title: { type: "string", default: "RSS Feed" },
    style: {
      type: "enum",
      values: ["horizontal-cards", "horizontal-cards-2", "detailed-list", "vertical-list"],
      default: "vertical-list"
    },
    limit: { type: "number", default: 25, min: 1 },
    "collapse-after": { type: "number", default: 5, min: -1 },
    "single-line-titles": { type: "boolean", default: false },
    "preserve-order": { type: "boolean", default: false },
    "thumbnail-height": { type: "number", min: 0 },
    "card-height": { type: "number", min: 0 },
    feeds: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          url: { type: "string", required: true },
          title: { type: "string" },
          limit: { type: "number", min: 1 },
          "hide-categories": { type: "boolean" },
          "hide-description": { type: "boolean" },
          "item-link-prefix": { type: "string" },
          headers: { type: "object" }
        }
      }
    }
  }
}

// 2. React Component
function RSSWidgetEditor({ widget, onChange }) {
  return (
    <div className="widget-editor">
      <TextInput
        label="Title"
        value={widget.title}
        onChange={(value) => onChange({ ...widget, title: value })}
      />
      
      <Select
        label="Style"
        value={widget.style}
        options={[
          { value: "horizontal-cards", label: "Horizontal Cards" },
          { value: "horizontal-cards-2", label: "Horizontal Cards 2" },
          { value: "detailed-list", label: "Detailed List" },
          { value: "vertical-list", label: "Vertical List" }
        ]}
        onChange={(value) => onChange({ ...widget, style: value })}
      />
      
      <NumberInput
        label="Limit"
        value={widget.limit}
        min={1}
        onChange={(value) => onChange({ ...widget, limit: value })}
      />
      
      <NumberInput
        label="Collapse After"
        value={widget["collapse-after"]}
        min={-1}
        onChange={(value) => onChange({ ...widget, "collapse-after": value })}
      />
      
      <Checkbox
        label="Single Line Titles"
        checked={widget["single-line-titles"]}
        onChange={(value) => onChange({ ...widget, "single-line-titles": value })}
      />
      
      <Checkbox
        label="Preserve Order"
        checked={widget["preserve-order"]}
        onChange={(value) => onChange({ ...widget, "preserve-order": value })}
      />
      
      <h3>Feeds</h3>
      <ArrayEditor
        items={widget.feeds}
        onChange={(feeds) => onChange({ ...widget, feeds })}
        renderItem={(feed, index, onFeedChange) => (
          <div className="feed-editor">
            <TextInput
              label="URL"
              value={feed.url}
              placeholder="https://example.com/feed.xml"
              onChange={(value) => onFeedChange({ ...feed, url: value })}
              required
            />
            <TextInput
              label="Title (optional)"
              value={feed.title}
              onChange={(value) => onFeedChange({ ...feed, title: value })}
            />
            <NumberInput
              label="Limit (optional)"
              value={feed.limit}
              min={1}
              onChange={(value) => onFeedChange({ ...feed, limit: value })}
            />
          </div>
        )}
        addButtonText="Add Feed"
      />
    </div>
  )
}

// 3. Generate YAML
function widgetToYAML(widget: WidgetConfig): string {
  return yaml.stringify(widget, {
    indent: 2,
    quotingType: '"',
    forceQuotes: false
  })
}

// 4. Full Config Generation
function generateFullConfig(state: EditorState): string {
  const config: GlanceConfig = {
    pages: state.pages.map(page => ({
      name: page.name,
      ...(page.slug && { slug: page.slug }),
      ...(page.width && { width: page.width }),
      columns: page.columns.map(column => ({
        size: column.size,
        widgets: column.widgets
      }))
    }))
  }
  
  return yaml.stringify(config)
}
```

---

---

## Appendix A: Complete Widget Schema Examples

### RSS Widget Schema

```json
{
  "type": "rss",
  "displayName": "RSS Feed",
  "category": "Content",
  "icon": "📰",
  "description": "Display items from RSS/Atom feeds with various layout styles",
  "properties": {
    "title": {
      "type": "string",
      "label": "Widget Title",
      "default": "RSS Feed",
      "description": "Title displayed in widget header"
    },
    "style": {
      "type": "enum",
      "label": "Display Style",
      "values": [
        { "value": "vertical-list", "label": "Vertical List" },
        { "value": "horizontal-cards", "label": "Horizontal Cards" },
        { "value": "horizontal-cards-2", "label": "Horizontal Cards 2" },
        { "value": "detailed-list", "label": "Detailed List" }
      ],
      "default": "vertical-list",
      "description": "How feed items are displayed"
    },
    "limit": {
      "type": "number",
      "label": "Item Limit",
      "default": 25,
      "min": 1,
      "max": 100,
      "description": "Maximum total items to display from all feeds"
    },
    "collapse-after": {
      "type": "number",
      "label": "Collapse After",
      "default": 5,
      "min": -1,
      "description": "Number of items visible before collapse. -1 to disable"
    },
    "single-line-titles": {
      "type": "boolean",
      "label": "Single Line Titles",
      "default": false,
      "description": "Truncate titles to single line"
    },
    "preserve-order": {
      "type": "boolean",
      "label": "Preserve Feed Order",
      "default": false,
      "description": "Keep items in feed order instead of sorting by date"
    },
    "thumbnail-height": {
      "type": "number",
      "label": "Thumbnail Height (px)",
      "min": 0,
      "description": "Custom thumbnail height. Leave empty for default"
    },
    "card-height": {
      "type": "number",
      "label": "Card Height (px)",
      "min": 0,
      "description": "Custom card height for horizontal styles"
    },
    "feeds": {
      "type": "array",
      "label": "RSS Feeds",
      "minItems": 1,
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "label": "Feed URL",
            "required": true,
            "placeholder": "https://example.com/feed.xml",
            "description": "URL of the RSS or Atom feed"
          },
          "title": {
            "type": "string",
            "label": "Custom Title",
            "description": "Override the feed's title"
          },
          "limit": {
            "type": "number",
            "label": "Items per Feed",
            "min": 1,
            "description": "Limit items from this specific feed"
          },
          "hide-categories": {
            "type": "boolean",
            "label": "Hide Categories",
            "default": false,
            "description": "Don't show item categories/tags"
          },
          "hide-description": {
            "type": "boolean",
            "label": "Hide Description",
            "default": false,
            "description": "Don't show item descriptions"
          },
          "item-link-prefix": {
            "type": "string",
            "label": "Link Prefix",
            "placeholder": "https://custom-reader.com/?url=",
            "description": "Prefix to add to all item links"
          },
          "headers": {
            "type": "object",
            "label": "Custom Headers",
            "description": "HTTP headers to send with request",
            "keyLabel": "Header Name",
            "valueLabel": "Header Value"
          }
        }
      }
    }
  },
  "examples": [
    {
      "name": "Tech News Aggregator",
      "config": {
        "title": "Tech News",
        "style": "horizontal-cards",
        "limit": 20,
        "collapse-after": 10,
        "feeds": [
          { "url": "https://hnrss.org/frontpage", "title": "Hacker News" },
          { "url": "https://lobste.rs/rss", "title": "Lobsters" }
        ]
      }
    }
  ]
}
```

### Weather Widget Schema

```json
{
  "type": "weather",
  "displayName": "Weather",
  "category": "Information",
  "icon": "🌤️",
  "description": "Display current weather and 7-day forecast",
  "properties": {
    "location": {
      "type": "string",
      "label": "Location",
      "required": true,
      "placeholder": "London, United Kingdom",
      "description": "City name and country"
    },
    "units": {
      "type": "enum",
      "label": "Units",
      "values": [
        { "value": "metric", "label": "Metric (°C, km/h)" },
        { "value": "imperial", "label": "Imperial (°F, mph)" }
      ],
      "default": "metric",
      "description": "Temperature and speed units"
    },
    "hour-format": {
      "type": "enum",
      "label": "Hour Format",
      "values": [
        { "value": "12h", "label": "12-hour (AM/PM)" },
        { "value": "24h", "label": "24-hour" }
      ],
      "default": "24h",
      "description": "Time display format"
    },
    "hide-location": {
      "type": "boolean",
      "label": "Hide Location Name",
      "default": false,
      "description": "Don't show location name in widget"
    },
    "show-area-name": {
      "type": "boolean",
      "label": "Show Area Name",
      "default": false,
      "description": "Show full area name from weather API"
    }
  },
  "examples": [
    {
      "name": "Basic Weather",
      "config": {
        "location": "New York, USA",
        "units": "imperial"
      }
    }
  ]
}
```

### Monitor Widget Schema

```json
{
  "type": "monitor",
  "displayName": "Service Monitor",
  "category": "Monitoring",
  "icon": "🔍",
  "description": "Monitor uptime of websites and services",
  "properties": {
    "show-failing-only": {
      "type": "boolean",
      "label": "Show Failing Only",
      "default": false,
      "description": "Only display services that are down"
    },
    "style": {
      "type": "enum",
      "label": "Display Style",
      "values": [
        { "value": "detailed", "label": "Detailed (default)" },
        { "value": "compact", "label": "Compact" }
      ],
      "default": "detailed"
    },
    "sites": {
      "type": "array",
      "label": "Sites to Monitor",
      "minItems": 1,
      "items": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "label": "Service Name",
            "required": true
          },
          "url": {
            "type": "string",
            "label": "URL to Check",
            "required": true,
            "placeholder": "https://example.com"
          },
          "icon": {
            "type": "icon",
            "label": "Icon",
            "description": "Service icon (si:name, mdi:name, or URL)"
          },
          "allow-insecure": {
            "type": "boolean",
            "label": "Allow Insecure SSL",
            "default": false
          },
          "alt-status-codes": {
            "type": "array",
            "label": "Acceptable Status Codes",
            "items": { "type": "number" },
            "description": "Additional HTTP codes considered successful"
          },
          "basic-auth": {
            "type": "object",
            "label": "Basic Authentication",
            "properties": {
              "username": { "type": "string", "label": "Username" },
              "password": { "type": "string", "label": "Password", "secret": true }
            }
          }
        }
      }
    }
  }
}
```

### Custom API Widget Schema

```json
{
  "type": "custom-api",
  "displayName": "Custom API",
  "category": "Advanced",
  "icon": "🔧",
  "description": "Fetch and display data from any API using Go templates",
  "properties": {
    "url": {
      "type": "string",
      "label": "API URL",
      "required": true,
      "placeholder": "https://api.example.com/data"
    },
    "method": {
      "type": "enum",
      "label": "HTTP Method",
      "values": ["GET", "POST", "PUT", "PATCH", "DELETE"],
      "default": "GET"
    },
    "headers": {
      "type": "object",
      "label": "Request Headers",
      "keyLabel": "Header Name",
      "valueLabel": "Header Value"
    },
    "parameters": {
      "type": "object",
      "label": "Query Parameters",
      "keyLabel": "Parameter Name",
      "valueLabel": "Parameter Value"
    },
    "body-type": {
      "type": "enum",
      "label": "Body Type",
      "values": [
        { "value": "json", "label": "JSON" },
        { "value": "string", "label": "String/Text" }
      ],
      "default": "json",
      "showWhen": { "method": ["POST", "PUT", "PATCH"] }
    },
    "body": {
      "type": "code",
      "label": "Request Body",
      "language": "json",
      "showWhen": { "method": ["POST", "PUT", "PATCH"] }
    },
    "allow-insecure": {
      "type": "boolean",
      "label": "Allow Insecure SSL",
      "default": false
    },
    "skip-json-validation": {
      "type": "boolean",
      "label": "Skip JSON Validation",
      "default": false
    },
    "template": {
      "type": "code",
      "label": "Go Template",
      "language": "go-template",
      "required": true,
      "description": "Template to render the API response",
      "multiline": true,
      "rows": 15
    },
    "frameless": {
      "type": "boolean",
      "label": "Frameless",
      "default": false,
      "description": "Remove widget frame/border"
    },
    "options": {
      "type": "object",
      "label": "Template Options",
      "description": "Custom options accessible in template"
    },
    "subrequests": {
      "type": "object",
      "label": "Subrequests",
      "description": "Additional API requests available in template",
      "items": {
        "type": "request",
        "properties": {
          "url": { "type": "string" },
          "method": { "type": "string" },
          "headers": { "type": "object" }
        }
      }
    }
  },
  "documentation": {
    "template": {
      "title": "Template Functions",
      "functions": [
        {
          "name": "add",
          "signature": "add(a, b number) number",
          "description": "Add two numbers"
        },
        {
          "name": "parseTime",
          "signature": "parseTime(layout, value string) Time",
          "description": "Parse time from string"
        }
        // ... all 30+ functions
      ]
    }
  }
}
```

---

## Appendix B: Docker Compose Production Example

```yaml
version: '3.8'

services:
  # Main Glance Dashboard
  glance:
    image: glanceapp/glance:latest
    container_name: glance
    ports:
      - "8080:8080"
    volumes:
      - ./config:/app/config
      - ./assets:/app/assets  # Custom assets (icons, logos, etc.)
    environment:
      - TZ=America/New_York
      # Your environment variables for widgets
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - WEATHER_API_KEY=${WEATHER_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/api/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # Glance Visual Editor
  glance-editor:
    image: glanceapp/glance-editor:latest
    container_name: glance-editor
    ports:
      - "8081:8081"
    volumes:
      - ./config:/app/config
      - ./assets:/app/assets
    environment:
      - GLANCE_URL=http://glance:8080
      - CONFIG_PATH=/app/config/glance.yml
      - EDITOR_PORT=8081
      - NODE_ENV=production
      # Optional: Enable authentication
      - ENABLE_AUTH=true
      - AUTH_USER=admin
      - AUTH_PASS=${EDITOR_PASSWORD}
    depends_on:
      glance:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8081/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Reverse Proxy (Traefik example)
  traefik:
    image: traefik:v2.10
    container_name: traefik
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
      - "8082:8080"  # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels:
      # Glance dashboard
      - "traefik.enable=true"
      - "traefik.http.routers.glance.rule=Host(`dashboard.yourdomain.com`)"
      - "traefik.http.routers.glance.entrypoints=web"
      - "traefik.http.services.glance.loadbalancer.server.port=8080"
      
      # Glance editor
      - "traefik.http.routers.editor.rule=Host(`editor.yourdomain.com`)"
      - "traefik.http.routers.editor.entrypoints=web"
      - "traefik.http.services.editor.loadbalancer.server.port=8081"

volumes:
  config:
  assets:

networks:
  default:
    name: glance-network
```

### .env File Example

```bash
# Glance Configuration
GITHUB_TOKEN=ghp_yourtoken123456789
WEATHER_API_KEY=your_api_key
REDDIT_APP_NAME=MyApp
REDDIT_APP_CLIENT_ID=client_id
REDDIT_APP_SECRET=secret

# Editor Authentication
EDITOR_PASSWORD=changeme_secure_password

# Timezone
TZ=America/New_York
```

---

## Conclusion

This documentation provides everything needed to build a Docker-based visual editor for Glance:

1. **Docker Architecture**: Companion container design with shared volumes
2. **Configuration System**: Complete YAML structure, parsing, validation
3. **Widget System**: 27 widget types with detailed schemas
4. **API Design**: RESTful backend for config management
5. **Implementation Roadmap**: 5-phase plan (12 weeks) with clear deliverables
6. **Quick Start**: Working examples to start development immediately

The visual editor will:
- Deploy alongside Glance via docker-compose
- Share config volume for seamless integration
- Provide live preview in iframe
- Generate valid `glance.yml` files
- Support all 27 widget types
- Handle environment variables
- Validate in real-time

**Next Steps:**
1. Set up project structure (backend + frontend)
2. Implement Phase 1 (core infrastructure)
3. Create widget schemas for common widgets
4. Build drag-and-drop interface
5. Add advanced features incrementally

Start simple and iterate. Focus on RSS, Weather, and Monitor widgets first, then expand to cover all widget types.
