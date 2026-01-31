# Phase 1.0 - Production Readiness

**Status:** Planning
**Version Target:** 1.0.0
**Date:** January 31, 2026

---

## Overview

This phase focuses on making Glance Editor robust and production-ready by:
- Comprehensive testing coverage for all features
- Complete documentation (README, API, contributing guides)
- Enhanced error handling and user feedback
- Performance optimization and technical debt cleanup
- Input validation and file security
- Code editor fixes and improvements

**Out of Scope:**
- Multi-user conflict resolution
- Authentication (assume reverse proxy or LAN deployment)
- Metrics/telemetry collection
- Widget templates library

---

## Roadmap

### 1. Documentation (High Priority)

#### 1.1 Professional README.md
- [ ] Create comprehensive README with:
  - Quick start guide (docker-compose up)
  - Screenshots/preview images
  - Core features list
  - Installation instructions (Docker, manual)
  - Configuration reference
  - Environment variables table
  - Troubleshooting section
  - Contributing guidelines
  - License information
- [ ] Add ASCII architecture diagram
- [ ] Document all 27+ widget types with YAML examples
- [ ] Keep tone professional (no excessive emojis or verbose text)
- [ ] Add keyboard shortcuts reference table

#### 1.2 API Documentation
- [ ] Document all REST endpoints:
  - `GET /api/health` - Health check
  - `GET /api/healthz` - Readiness probe
  - `GET /api/settings` - Editor settings
  - `GET /api/config` - Get parsed config
  - `GET /api/config/raw` - Get raw YAML
  - `PUT /api/config` - Update config (JSON)
  - `PUT /api/config/raw` - Update config (YAML)
  - `GET /api/includes/files` - List include files
  - `GET /api/includes/references` - Get include directives
  - `GET /api/includes/file/:path` - Read include file
  - `PUT /api/includes/file/:path` - Write include file
  - `DELETE /api/includes/file/:path` - Delete include file
- [ ] Document WebSocket events:
  - `config-changed` - Broadcast on file change
- [ ] Document request/response formats
- [ ] Document error codes and messages

#### 1.3 Contributing Guide
- [ ] Create `CONTRIBUTING.md` with:
  - Development setup (local vs Docker)
  - Project structure overview
  - Coding standards (ESLint, TypeScript, Tailwind)
  - Pre-commit hooks (husky)
  - Test writing guidelines (Vitest, React Testing Library)
  - Commit message format
  - Pull request process
  - Code review checklist

#### 1.4 CHANGELOG.md
- [ ] Create version history from v0.5.0 → v0.5.1 → v1.0.0
- [ ] Document breaking changes
- [ ] Add upgrade instructions

---

### 2. Testing Coverage (Critical)

#### 2.1 Backend Tests (Current: 24 tests)

**configService.test.js**
- [ ] Test deactivated widgets handling
- [ ] Test backup creation and restoration
- [ ] Test concurrent writes handling
- [ ] Test file permission error handling
- [ ] Test disk space error handling
- [ ] Test corrupt YAML recovery
- [ ] Test large config parsing (>1MB)
- [ ] Test circular include detection
- [ ] Test atomic write failure scenarios
- [ ] Test config validation (page/column structure)

**includeService.test.js** (Create)
- [ ] Test directory listing
- [ ] Test include directive parsing
- [ ] Test file reading with valid paths
- [ ] Test file writing with atomic operations
- [ ] Test file deletion
- [ ] Test path traversal attack prevention (`../`, etc.)
- [ ] Test absolute path rejection
- [ ] Test main config protection
- [ ] Test file extension validation (`.yml`, `.yaml`)
- [ ] Test non-existent file errors
- [ ] Test relative path resolution

**websocket.test.js** (Create)
- [ ] Test connection establishment
- [ ] Test message broadcast
- [ ] Test client disconnect handling
- [ ] Test reconnection with exponential backoff
- [ ] Test multiple simultaneous connections
- [ ] Test connection state tracking

**api.test.js** (Enhance)
- [ ] Test all endpoints with valid inputs
- [ ] Test error responses (400, 404, 500)
- [ ] Test request validation
- [ ] Test concurrent requests
- [ ] Test CORS headers
- [ ] Test X-Forwarded-* header handling

**Integration Tests** (Create)
- [ ] Test config save → file watch → reload flow
- [ ] Test include file creation → include directive → parse
- [ ] Test backup creation on first save
- [ ] Test config restoration from backup

#### 2.2 Frontend Tests (Current: 201 tests)

**ExpandableTextEditor.test.tsx** (Create)
- [ ] Test expand/collapse functionality
- [ ] Test value changes
- [ ] Test placeholder rendering
- [ ] Test disabled state

**DraggableArrayInput.test.tsx** (Create)
- [ ] Test add item
- [ ] Test remove item
- [ ] Test move up/down
- [ ] Test drag and drop
- [ ] Test min/max items validation

**Widget Definition Schema Tests** (Create)
- [ ] Validate all 27 widget definitions have:
  - Valid type names
  - Required properties defined
  - Default values set
  - Proper property types
- [ ] Test schema-to-form generation
- [ ] Test invalid schema rejection

**Undo/Redo Edge Cases** (Create)
- [ ] Test history branching (new actions after undo)
- [ ] Test stack overflow protection (max 50 entries)
- [ ] Test history truncate on branch
- [ ] Test undo/redo with keyboard shortcuts (Ctrl+Z/Y)
- [ ] Test undo/redo with UI buttons
- [ ] Test action descriptions

**Widget Operations** (Create)
- [ ] Test widget copy to same page
- [ ] Test widget move between pages
- [ ] Test widget deletion
- [ ] Test widget type conversion

**Theme Tests** (Create)
- [ ] Test preset application
- [ ] Test preset saving
- [ ] Test preset deletion
- [ ] Test HSL color parsing (all formats)
- [ ] Test light/dark mode toggle
- [ ] Test contrast multiplier
- [ ] Test text saturation multiplier

**Environment Variables** (Create)
- [ ] Test ${VAR} detection
- [ ] Test ${secret:name} detection
- [ ] Test ${readFileFromEnv:VAR} detection
- [ ] Test variable usage counting
- [ ] Test variable location tracking
- [ ] Test export to .env format
- [ ] Test export to docker-compose snippet

**Monaco Editor Tests** (Enhance)
- [ ] Test YAML auto-completion triggers
- [ ] Test widget type snippets
- [ ] Test property suggestions
- [ ] Test syntax highlighting for Go templates
- [ ] Test validation error display
- [ ] Test format button
- [ ] Test scroll to line
- [ ] Test bidirectional sync (code ↔ visual)

**Custom API Template Editor** (Create)
- [ ] Test Go template syntax highlighting
- [ ] Test auto-completion for template functions
- [ ] Test control structure snippets
- [ ] Test JSON accessor suggestions
- [ ] Test function reference panel
- [ ] Test sample template insertion
- [ ] Test template validation errors

**Validation Panel** (Enhance)
- [ ] Test page existence validation
- [ ] Test slug validation
- [ ] Test slug duplication check
- [ ] Test reserved slug detection
- [ ] Test column requirement validation
- [ ] Test widget type validation
- [ ] Test RSS feed URL validation
- [ ] Test weather location validation
- [ ] Test reddit subreddit validation
- [ ] Test custom-api URL/template validation
- [ ] Test theme color format validation
- [ ] Test contrast multiplier range validation
- [ ] Test severity levels (error/warning/info)
- [ ] Test click-to-navigate functionality

**Layout Editor** (Enhance)
- [ ] Test drag and drop with many widgets (50+)
- [ ] Test widget selection visual feedback
- [ ] Test empty column state
- [ ] Test column size toggle
- [ ] Test column add/remove validation
- [ ] Test head widgets handling

**Code Editor Integration** (Enhance)
- [ ] Test file switching (main vs includes)
- [ ] Test include file creation
- [ ] Test include file deletion
- [ ] Test external file change detection
- [ ] Test broken YAML handling with parseError
- [ ] Test tab character detection

#### 2.3 E2E Tests (Playwright) - Prove Value

**Basic Workflow**
- [ ] Test: Load editor → Check dashboard displays
- [ ] Test: Add page → Verify_yaml_update → Preview new page
- [ ] Test: Add widget → Config saves → Preview shows widget
- [ ] Test: Edit widget property → Config saves -> Preview updates
- [ ] Test: Delete widget → Config saves → Preview removes

**YAML Operations**
- [ ] Test: Open YAML editor → Make changes → Save → Preview updates
- [ ] Test: Broken YAML → Error message → Fix → Save
- [ ] Test: Create include file → Add directive → Valid

**Theme Operations**
- [ ] Test: Open theme designer → Change colors → Save → Preview updates
- [ ] Test: Save preset → List presets → Load preset → Preview updates

**Undo/Redo**
- [ ] Test: Make changes → Undo → Revert → Verify config
- [ ] Test: Undo → Make new change → Verify history truncates
- [ ] Test: Ctrl+Z/Y shortcuts

**Complex Scenario**
- [ ] Test: Create multi-page dashboard → Add various widgets → Customize theme → Save → Verify Glance renders correctly

---

### 3. Error Handling & Reliability (High Priority)

#### 3.1 File Operations
- [ ] Handle concurrent config saves (implement file locking)
- [ ] Test file permission errors and show user-friendly messages
- [ ] Implement config corruption recovery from `.backup` files
- [ ] Show disk space warnings before critical operations
- [ ] Implement automatic backup cleanup (keep last 5 backups)

#### 3.2 WebSocket Stability
- [ ] Implement auto-reconnection with exponential backoff (2s, 4s, 8s, 16s, 32s, 60s max)
- [ ] Show connection status in UI (connected/reconnecting/disconnected)
- [ ] Queue changes during offline and replay on reconnect
- [ ] Log WebSocket events for debugging

#### 3.3 Preview Reliability
- [ ] Show error state when Glance iframe fails to load
- [ ] Add "Reload Preview" button
- [ ] Handle Glance unavailability gracefully
- [ ] Show preview loading state

#### 3.4 Debounce Optimization
- [ ] Review and adjust debounce values:
  - Config save: Currently 300ms - test optimal value
  - Preview reload: Currently 600ms after write
- [ ] Add progress indicator during save operations
- [ ] Cancel pending save on rapid changes
- [ ] Show "Saving..." with spinner, then "Saved" confirmation

---

### 4. User Feedback & UX (High Priority)

#### 4.1 Toast Notifications
- [ ] Implement toast system for:
  - Save success/failure
  - Error messages (with retry option)
  - Warnings (with dismiss action)
  - Info messages
- [ ] Toast positioning: Top-right corner
- [ ] Auto-dismiss after 5 seconds (configurable)
- [ ] Different styles for severity (success/error/warning/info)

#### 4.2 Loading States
- [ ] Show loading spinners during:
  - Config save
  - Fetch operations
  - Preview refresh
  - File operations
- [ ] Skeleton screens for initial load

#### 4.3 Confirmation Dialogs
- [ ] Before deleting pages
- [ ] Before deleting include files
- [ ] Before destructive operations

#### 4.4 Keyboard Shortcuts
- [ ] Implement and document shortcuts:
  - `Ctrl/Cmd+S` - Save config
  - `Ctrl/Cmd+Z` - Undo
  - `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` - Redo
  - `Ctrl/Cmd+E` - Toggle Edit/Preview mode
  - `Ctrl/Cmd+,` - Open YAML editor
  - `Ctrl/Cmd+K` - Open keyboard shortcuts modal
  - `Escape` - Close active panel
  - `Delete` / `Backspace` - Delete selected widget (when not editing)
- [ ] Create command palette overlay (`Ctrl/Cmd+K`)
- [ ] Show shortcuts in tooltips

#### 4.5 Context-Sensitive Help
- [ ] Add (?) button next to each widget type in editor
- [ ] Show help modal with:
  - Widget description
  - Required properties
  - Example configuration
  - Link to Glance documentation (if available)
- [ ] Add tooltips for complex inputs (HSL colors, durations, Go templates)
- [ ] Document Go template functions in Custom API builder

#### 4.6 Error Messages
- [ ] Show actionable error messages
- [ ] Provide "View in YAML" button for parsing errors
- [ ] Include error details in collapsible section
- [ ] Offer quick fix suggestions when possible

---

### 5. Code Editor Fixes & Improvements (Critical)

#### 5.1 Critical Bugs
- [ ] Fix "View in YAML" functionality - currently broken
- [ ] Test bidirectional sync (visual editor changes → YAML updates, YAML changes → visual updates)
- [ ] Fix scroll-to-line navigation from validation panel
- [ ] Fix include file switching glitches

#### 5.2 Validations & Formatting
- [ ] Add YAML syntax validation with real-time error highlighting
- [ ] Implement "Format YAML" button with Prettier
- [ ] Highlight tabs vs spaces conflict
- [ ] Show line numbers
- [ ] Highlight syntax errors with underlines

#### 5.3 Auto-Completion
- [ ] Improve widget type snippets (full template insertion)
- [ ] Add common property suggestions (title, cache, columns)
- [ ] Suggest enum values (size: small/full, widget types)
- [ ] Complete YAML anchors/aliases

#### 5.4 Navigation
- [ ] Implement "Go to definition" for widget types
- [ ] Add file outline panel (for include files)
- [ ] Show data breadcrumbs (pages → columns → widgets)

---

### 6. Theme Enhancements (Medium Priority)

#### 6.1 Export/Import
- [ ] Export theme configuration as JSON
- [ ] Import theme from JSON file
- [ ] Export theme as CSS variables

#### 6.2 Advanced Features
- [ ] Theme library management (save, delete, rename presets)
- [ ] Community preset sharing (documentation only)
- [ ] Theme preview without reloading Glance

---

### 7. Variable Substitution (Medium Priority)

#### 7.1 Detection & Display
- [ ] Scan config for environment variable patterns:
  - `${VAR_NAME}`
  - `${secret:name}`
  - `${readFileFromEnv:VAR}`
- [ ] Show usage count per variable
- [ ] Display line numbers where variables are used
- [ ] List variables by type

#### 7.2 Validation
- [ ] Warn for undefined variables
- [ ] Validate variable name format
- [ ] Show missing variables in validation panel

#### 7.3 Mocking for Preview
- [ ] Edit mock values for each variable
- [ ] Store mock values in local storage
- [ ] Export mock values to `.env` file

#### 7.4 Export Options
- [ ] Copy docker-compose.yml environment variables snippet
- [ ] Copy .env file format
- [ ] Generate .env.example template

---

### 8. Input Validation & File Security (Critical)

#### 8.1 Backend Validation
- [ ] Validate widget names (no special chars, length limits)
- [ ] Validate page slugs (valid URL characters, length limits)
- [ ] Validate YAML size limits (<5MB)
- [ ] Validate file upload sizes (<1MB for include files)
- [ ] Validate URLs (RSS feeds, API endpoints) with regex
- [ ] Validate HSL color ranges (0-360, 0-100, 0-100)
- [ ] Validate duration formats (30s, 5m, 2h, 1d)

#### 8.2 File Security
- [ ] Enforce path normalization (prevent `../` attacks)
- [ ] Reject absolute paths in include operations
- [ ] Verify all paths are within config directory
- [ ] Protect main config from modification via include API
- [ ] Only allow `.yml` and `.yaml` extensions
- [ ] Validate YAML syntax before saving
- [ ] Detect circular includes

#### 8.3 Sanitization
- [ ] Sanitize widget titles (prevent XSS in templates)
- [ ] Sanitize user-defined CSS classes
- [ ] Escape YAML comments properly

---

### 9. Technical Debt & Performance (Medium Priority)

#### 9.1 TypeScript Strict Mode
- [ ] Fix all remaining `any` types
- [ ] Add proper type definitions for all props
- [ ] Enable `noImplicitAny` in tsconfig
- [ ] Enable `strictNullChecks` in tsconfig

#### 9.2 Code Organization
- [ ] Split `App.tsx` (39KB) into smaller components:
  - `EditorLayout.tsx` - Main layout structure
  - `Toolbar.tsx` - Header actions
  - `SidebarLeft.tsx` - Pages and theme
  - `SidebarRight.tsx` - Widgets and env vars
  - `FloatingPanels.tsx` - Panel management
- [ ] Organize widget definitions by category
- [ ] Consolidate duplicate utility functions
- [ ] Extract constants to separate files

#### 9.3 Performance Optimization
- [ ] Lazy load Monaco editor (reduce initial bundle size)
- [ ] Add React.memo for expensive components (LayoutEditor, CustomApiBuilder)
- [ ] Virtualize large lists (widget palette, validation list)
- [ ] Implement request debouncing on API calls
- [ ] Optimize widget definitions bundle size

#### 9.4 Bundle Analysis
- [ ] Add `rollup-plugin-visualizer` to Vite config
- [ ] Generate bundle size reports on build
- [ ] Identify and remove unused dependencies
- [ ] Implement code splitting by route/feature
- [ ] Set bundle size limits in CI

#### 9.5 Build & Docker
- [ ] Verify multi-stage Docker build
- [ ] Optimize Alpine layer caching
- [ ] Remove development dependencies from production image
- [ ] Minify CSS and JS
- [ ] Enable gzip compression in Docker setup

---

### 10. Deployment & Configuration

#### 10.1 Health Checks
- [ ] Include config file existence in health check
- [ ] Check Glance connectivity status
- [ ] Add readiness endpoint (`/api/ready`)
- [ ] Include config version in health response

#### 10.2 Reverse Proxy Support
- [ ] Handle `X-Forwarded-Proto` header
- [ ] Handle `X-Forwarded-Host` header
- [ ] Handle `X-Forwarded-Port` header
- [ ] Support `BASE_URL` environment variable
- [ ] Document reverse proxy configuration

#### 10.3 Docker Configuration
- [ ] Non-root user in container
- [ ] Read-only file system where possible
- [ ] Proper signal handling (SIGTERM graceful shutdown)
- [ ] Resource limits (memory, CPU)

---

### 11. Logging (Low Priority)

#### 11.1 Backend Logging
- [ ] Implement structured logging (JSON format)
- [ ] Log levels: debug, info, warn, error
- [ ] Add request ID tracing
- [ ] Make log level configurable via `LOG_LEVEL` env var

#### 11.2 Client Logs
- [ ] Collect client errors via window.onerror
- [ ] Allow opt-in debug mode
- [ ] Export diagnostic info (config version, browser info)

---

## Success Criteria

Phase 1.0 will be considered complete when:

1. **Documentation**: Complete README, API docs, and contributing guide
2. **Testing**: Backend tests >50, Frontend tests >300, E2E tests >15
3. **Reliability**: All critical error paths tested and handled
4. **Code Editor**: fully functional bidirectional sync
5. **Performance**: Bundle size <500KB, Lighthouse score >90
6. **Security**: All input validation and file security implemented
7. **UX**: Keyboard shortcuts, toast notifications, and help system complete

---

## Estimated Timeline

| Week | Focus |
|------|-------|
| 1 | Documentation + Backend tests + Code editor fixes |
| 2 | Frontend tests + E2E test suite + Error handling |
| 3 | UX improvements + Input validation + Security |
| 4 | Performance optimization + Technical debt + Beta release |

---

## Next Steps

1. Create branch `phase-1.0-readiness`
2. Implement tasks in priority order
3. Request feedback from beta users
4. Address issues and refine
5. Prepare v1.0.0 release