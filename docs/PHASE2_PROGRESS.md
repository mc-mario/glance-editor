# Phase 2 Progress Report

**Date:** January 8, 2026  
**Status:** In Progress  
**Branch:** `phase2-widget-editor`

---

## Overview

Phase 2 implements the Layout Editor with page management, column designer, widget palette, and drag-and-drop functionality. A subsequent UI redesign transformed the interface to a two-mode layout with floating panels.

---

## Completed Tasks

### 1. Initial Implementation (Merged to main)

#### Page Management ✅

- `PageList.tsx` - List pages with selection, add/delete/reorder
- `PageEditor.tsx` - Edit page properties (name, slug, width, etc.)
- Drag-and-drop page reordering
- Inline page renaming

#### Column Designer ✅

- `ColumnDesigner.tsx` - Visual column layout
- Column size toggling (small ↔ full)
- Add/remove columns with validation
- Layout validation (1-2 full columns required)

#### Widget Palette ✅

- `WidgetPalette.tsx` - All 27 Glance widget types
- Search filtering
- Category filtering
- Click to add widgets to columns

#### Widget Definitions ✅

- `widgetDefinitions.ts` - Complete definitions for all widget types:
  - **General:** Bookmarks, Calendar, Clock, Custom API, Extension, Group, HTML, Iframe, Markets, Monitor, Releases, RSS, Search, Split Column, Videos, Weather
  - **Services:** Changedetection.io, Docker Containers, DNS Hole, Immich, Miniflux, Repository, Server Status, Site Monitor, Twitch Channels, Twitch Top Games

#### Drag & Drop ✅

- Reorder widgets within columns
- Move widgets between columns
- Visual feedback during drag operations

### 2. UI Redesign ✅

User feedback requested a major layout transformation:

#### New Two-Mode Interface

**Edit Mode:**
- Full-width `LayoutEditor.tsx` component
- Visual grid-based column layout
- Widget cards with drag handles
- Column management in header

**Preview Mode:**
- Live Glance iframe preview
- Device simulation (desktop/tablet/phone)
- Scaled viewports with device frames

#### New Component Structure

```
frontend/src/
├── components/
│   ├── ColumnDesigner.tsx    # Legacy (kept for compatibility)
│   ├── LayoutEditor.tsx      # NEW: Full-width visual editor
│   ├── PageEditor.tsx        # Page settings form
│   ├── PageList.tsx          # Page navigation
│   ├── Preview.tsx           # UPDATED: Device scaling
│   ├── StatusBadge.tsx       # Connection status
│   └── WidgetPalette.tsx     # Widget library
├── hooks/
│   └── useConfig.ts          # Config state management
├── test/
│   ├── App.test.tsx          # UPDATED: 17 tests
│   ├── ColumnDesigner.test.tsx
│   ├── LayoutEditor.test.tsx # NEW: 17 tests
│   ├── PageEditor.test.tsx
│   ├── PageList.test.tsx
│   ├── Preview.test.tsx      # UPDATED: 9 tests
│   ├── StatusBadge.test.tsx
│   └── WidgetPalette.test.tsx
├── App.tsx                   # UPDATED: New layout structure
├── index.css                 # UPDATED: New styles
├── types.ts
└── widgetDefinitions.ts
```

#### Toolbar

- App logo and status badge
- View mode toggle (Edit/Preview)
- Device toggle (Desktop/Tablet/Phone) - shown in preview mode
- YAML button, Open Glance link

#### Mini Sidebar (200px)

- Page list with selection
- Action buttons for settings and widget palette

#### Floating Panels

- **Page Settings:** Edit page name, slug, width, show-mobile-header
- **Widget Palette:** Search and add widgets
- **Raw YAML:** View current configuration

#### Device Preview Scaling

| Device | Viewport | Scale |
|--------|----------|-------|
| Desktop | 1920x1080 | 100% (full) |
| Tablet | 768x1024 | 75% |
| Phone | 375x667 | 90% |

---

## Test Coverage

### Frontend Tests (80 total)

| File | Tests | Status |
|------|-------|--------|
| `App.test.tsx` | 17 | ✅ |
| `LayoutEditor.test.tsx` | 17 | ✅ |
| `ColumnDesigner.test.tsx` | 9 | ✅ |
| `PageEditor.test.tsx` | 7 | ✅ |
| `PageList.test.tsx` | 8 | ✅ |
| `Preview.test.tsx` | 9 | ✅ |
| `WidgetPalette.test.tsx` | 8 | ✅ |
| `StatusBadge.test.tsx` | 5 | ✅ |

### Backend Tests (13 total)

| File | Tests | Status |
|------|-------|--------|
| `configService.test.js` | 6 | ✅ |
| `api.test.js` | 7 | ✅ |

**Total: 93 tests passing**

---

## Key Components

### LayoutEditor.tsx (New)

Full-width visual layout editor for Edit mode:

```tsx
interface LayoutEditorProps {
  page: PageConfig;
  selectedWidgetId: string | null;
  onColumnsChange: (columns: ColumnConfig[]) => void;
  onWidgetSelect: (columnIndex: number, widgetIndex: number) => void;
  onWidgetAdd: (columnIndex: number, widget: WidgetConfig) => void;
  onWidgetDelete: (columnIndex: number, widgetIndex: number) => void;
  onWidgetMove: (from: number, fromWidget: number, to: number, toWidget: number) => void;
}
```

Features:
- Page header with name and metadata
- Grid-based column layout
- Column size badges (FULL/SMALL)
- Widget cards with icons, titles, types
- Drag-and-drop reordering
- Delete buttons on hover
- Help text

### Preview.tsx (Updated)

Device-aware preview component:

```tsx
type PreviewDevice = 'desktop' | 'tablet' | 'phone';

interface PreviewProps {
  glanceUrl: string;
  refreshKey?: number;
  device?: PreviewDevice;
}
```

Features:
- Device-specific viewport sizes
- CSS transform scaling for tablet/phone
- Device frame styling
- Device info display

### App.tsx (Updated)

Main application with new layout:

```tsx
type ViewMode = 'edit' | 'preview';
type PreviewDevice = 'desktop' | 'tablet' | 'phone';

// State
const [viewMode, setViewMode] = useState<ViewMode>('edit');
const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
const [showPageSettings, setShowPageSettings] = useState(false);
const [showWidgetPalette, setShowWidgetPalette] = useState(false);
const [showRawConfig, setShowRawConfig] = useState(false);
```

Layout structure:
```
┌──────────────────────────────────────────────────────────┐
│ Toolbar: Logo | Status | [Edit|Preview] [Devices] | YAML │
├────────┬─────────────────────────────────────────────────┤
│ Pages  │                                                 │
│ ────── │     Content Area (Edit or Preview mode)        │
│ Home   │                                                 │
│ About  │                                                 │
│        │     [Floating Panels when open]                │
│ ────── │                                                 │
│ ⚙️  +  │                                                 │
└────────┴─────────────────────────────────────────────────┘
```

---

## CSS Updates (index.css)

New style sections added:

- `.toolbar` - Top navigation bar
- `.view-toggle` - Edit/Preview switch
- `.device-toggle` - Device buttons
- `.sidebar-mini` - Compact page sidebar
- `.floating-panel` - Overlay panels
- `.layout-editor` - Full-width editor styles
- `.layout-column` - Column grid items
- `.layout-widget` - Widget cards
- `.preview-viewport` - Device-specific preview

---

## Widget Types Supported

All 27 Glance widget types are defined:

### General Widgets
| Type | Icon | Description |
|------|------|-------------|
| bookmarks | 🔖 | Link bookmarks |
| calendar | 📅 | Calendar events |
| clock | 🕐 | Time display |
| custom-api | 🔌 | Custom API data |
| extension | 🧩 | Browser extension |
| group | 📁 | Widget group |
| html | 📄 | Custom HTML |
| iframe | 🖼️ | Embedded iframe |
| markets | 📈 | Stock markets |
| monitor | 💻 | System monitor |
| releases | 📦 | Software releases |
| rss | 📰 | RSS feeds |
| search | 🔍 | Search box |
| split-column | ⬛ | Column splitter |
| videos | 🎬 | Video feeds |
| weather | ⛅ | Weather info |

### Service Widgets
| Type | Icon | Description |
|------|------|-------------|
| changedetectionio | 🔄 | Change detection |
| docker-containers | 🐳 | Docker status |
| dns-hole | 🛡️ | Pi-hole/AdGuard |
| immich | 📸 | Photo library |
| miniflux | 📖 | RSS reader |
| repository | 📂 | Git repos |
| server-status | 🖥️ | Server health |
| site-monitor | 🌐 | Website uptime |
| twitch-channels | 📺 | Twitch streams |
| twitch-top-games | 🎮 | Twitch games |
| hacker-news | 📰 | HN stories |

---

## Commands Reference

```bash
# Development
cd frontend && npm run dev     # Start frontend dev server
cd backend && npm run dev      # Start backend dev server

# Testing
cd frontend && npm test        # Run frontend tests (80)
cd backend && npm test         # Run backend tests (13)

# Build
cd frontend && npm run build   # Production build

# Full stack with Docker
docker compose -f docker-compose.dev.yml up
```

---

## Files Changed in UI Redesign

```
frontend/src/App.tsx                      # Major rewrite
frontend/src/components/LayoutEditor.tsx  # NEW
frontend/src/components/Preview.tsx       # Updated
frontend/src/index.css                    # Major additions
frontend/src/test/App.test.tsx            # Updated
frontend/src/test/LayoutEditor.test.tsx   # NEW
frontend/src/test/Preview.test.tsx        # Updated
```

---

## Known Issues / TODOs

1. **Widget Editor Panel** - Not yet implemented; clicking widgets selects them but no edit form
2. **Drag from Palette** - Widgets added via click, not drag-and-drop from palette
3. **Column Drag-and-Drop** - Columns cannot be reordered by dragging
4. **Undo/Redo** - Not implemented (planned for Phase 4)

---

## Next Steps (Phase 3)

1. **Widget Editor**
   - Property editor form for each widget type
   - Field validation
   - Preview of widget changes

2. **Enhanced Drag & Drop**
   - Drag widgets from palette to specific columns
   - Drag columns to reorder

3. **Theme Settings**
   - Edit global theme configuration
   - Color picker for accent colors

4. **Import/Export**
   - Download config as YAML
   - Upload/import config file

---

## Architecture Decisions

### Two-Mode Interface
Separating Edit and Preview modes provides:
- More space for the layout editor
- Cleaner visual hierarchy
- Better mobile/tablet preview simulation

### Floating Panels
Using floating panels instead of sidebar sections:
- Reduces visual clutter
- Allows full-width content area
- Panels can be dismissed easily

### Device Scaling
CSS transform scaling chosen over:
- Actual viewport resize (complex)
- Media query simulation (inaccurate)

Transform approach preserves actual Glance rendering while showing approximate responsive behavior.

---

## Performance Notes

- Widget definitions loaded once at startup
- Config updates debounced (600ms wait for Glance reload)
- WebSocket reconnection with exponential backoff
- React state updates batched where possible
