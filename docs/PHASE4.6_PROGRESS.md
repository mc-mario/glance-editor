# Phase 4.6 Progress Report

**Date:** January 15, 2026  
**Status:** Complete  
**Version:** 0.4.6

---

## Overview

Phase 4.6 focuses on 8 bug fixes and feature improvements reported by users, addressing issues with error handling, editor synchronization, environment variables, and UX improvements.

---

## Completed Tasks

### 1. YAML Parse Error Handling

Fixed 500 errors and crash loops when the YAML configuration file has syntax errors.

**Problem:** When glance.yml contained invalid YAML, the backend would throw errors and return 500 responses, causing the frontend to enter a crash loop.

**Solution:**
- `getConfig()` now returns `{ config, parseError }` instead of throwing
- API returns 200 with `parseError` field containing line/column info
- Frontend displays a dedicated parse error view with "Open YAML Editor" button
- Users can fix syntax errors directly in the YAML editor

**Files Modified:**
- `backend/src/services/configService.js` - Try-catch with error extraction
- `backend/src/routes/config.js` - Returns parseError in response
- `frontend/src/types.ts` - Added `YamlParseError` interface
- `frontend/src/hooks/useConfig.ts` - Added `parseError` state
- `frontend/src/App.tsx` - Parse error view with recovery UI
- `frontend/src/index.css` - `.parse-error-view` styles

### 2. Monaco Editor Synchronization

Fixed issue where new pages added via the UI don't appear in the Monaco YAML Editor until a page refresh.

**Problem:** After adding a page through the visual editor, the YAML Editor still showed the old content.

**Solution:**
- `performSave()` now refetches `rawConfig` from the server after a successful save
- Added a Refresh button to the CodeEditor component for manual sync

**Files Modified:**
- `frontend/src/hooks/useConfig.ts` - Refetch rawConfig after save
- `frontend/src/components/CodeEditor.tsx` - Added `onRefresh` prop and Refresh button

### 3. Automatic Backup on First Run

Added automatic backup creation for safety when the editor is first used.

**Problem:** Users could accidentally corrupt their configuration without any backup to restore from.

**Solution:**
- Creates `glance.initial.backup` on first server startup
- Only creates once (checked by file existence)
- Separate from the rolling `.backup` file created on each save

**Files Modified:**
- `backend/src/services/configService.js` - Added `createInitialBackupIfNeeded()` function
- `backend/src/server.js` - Calls backup function on startup

### 4. GLANCE_URL Environment Variable (Runtime)

Fixed environment variable only working at build time, not runtime.

**Problem:** Setting `GLANCE_URL` in Docker compose didn't take effect because it was embedded at build time.

**Solution:**
- Added `/api/settings` endpoint that returns runtime environment settings
- Frontend fetches `glanceUrl` from API on mount instead of using build-time value

**Files Modified:**
- `backend/src/routes/health.js` - Added `/api/settings` endpoint
- `frontend/src/services/api.ts` - Added `getSettings()` method
- `frontend/src/App.tsx` - Fetches `glanceUrl` from API on mount

### 5. Custom API Parameters Display

Fixed parameters showing as `[object Object]` instead of actual values.

**Problem:** When custom-api widgets had object values in parameters, they displayed as `[object Object]`.

**Solution:**
- Modified `parseParameters()` to serialize object values to JSON strings for display

**Files Modified:**
- `frontend/src/components/CustomApiBuilder.tsx` - JSON.stringify for object parameter values

### 6. Content Editor Popup

Added expandable text editor for content fields that are too small.

**Problem:** Text areas for widget content were too small to comfortably edit longer text.

**Solution:**
- Created `ExpandableTextEditor` component with expand button
- Opens a full-screen modal for comfortable editing
- Supports keyboard shortcuts (Escape to close)
- Uses debounced input to prevent lag

**Files Created:**
- `frontend/src/components/inputs/ExpandableTextEditor.tsx` - New component

**Files Modified:**
- `frontend/src/components/WidgetEditor.tsx` - Uses ExpandableTextEditor for 'text' fields
- `frontend/src/index.css` - Modal and expandable editor styles

### 7. Move Widgets Between Pages

Added ability to copy and move widgets between pages.

**Problem:** No way to copy or move widgets from one page to another without manually editing YAML.

**Solution:**
- Right-click context menu on widgets
- "Copy to page" submenu - duplicates widget to target page
- "Move to page" submenu - moves widget to target page (removes from source)
- Filters out current page from target list

**Files Created:**
- `frontend/src/components/WidgetContextMenu.tsx` - Right-click context menu

**Files Modified:**
- `frontend/src/components/LayoutEditor.tsx` - Context menu state and handlers
- `frontend/src/App.tsx` - Copy/move handler functions
- `frontend/src/index.css` - Context menu and submenu styles

### 8. Floating Panel Alignment

Fixed validation panel opening on wrong side of screen.

**Problem:** Validate button is on the right side of the toolbar, but the panel opened on the left.

**Solution:**
- Added `floating-panel-right` class with proper positioning
- Applied to theme, code, env-vars, and validation panels

**Files Modified:**
- `frontend/src/index.css` - Added `.floating-panel-right` class
- `frontend/src/App.tsx` - Applied class to right-side panels

---

## Files Changed Summary

### Backend
| File | Changes |
|------|---------|
| `backend/src/services/configService.js` | Parse error handling, initial backup function |
| `backend/src/routes/config.js` | Returns parseError in response |
| `backend/src/routes/health.js` | Added `/api/settings` endpoint |
| `backend/src/server.js` | Calls backup on startup |

### Frontend
| File | Changes |
|------|---------|
| `frontend/src/types.ts` | Added `YamlParseError` interface |
| `frontend/src/hooks/useConfig.ts` | parseError state, rawConfig refresh |
| `frontend/src/services/api.ts` | `getSettings()` method |
| `frontend/src/App.tsx` | Parse error view, settings fetch, copy/move handlers, right-aligned panels |
| `frontend/src/components/CodeEditor.tsx` | onRefresh prop, Refresh button |
| `frontend/src/components/CustomApiBuilder.tsx` | Parameter JSON serialization |
| `frontend/src/components/WidgetEditor.tsx` | Uses ExpandableTextEditor |
| `frontend/src/components/LayoutEditor.tsx` | Context menu support |
| `frontend/src/components/inputs/ExpandableTextEditor.tsx` | **NEW** - Expandable text editor |
| `frontend/src/components/WidgetContextMenu.tsx` | **NEW** - Widget context menu |
| `frontend/src/index.css` | Multiple new style sections |

---

## API Changes

### New Endpoint: GET /api/settings

Returns runtime settings from environment variables.

**Response:**
```json
{
  "glanceUrl": "http://localhost:8080"
}
```

### Modified Endpoint: GET /api/config

Now returns `parseError` field when YAML is invalid instead of 500 error.

**Response (on parse error):**
```json
{
  "config": null,
  "raw": "invalid: yaml: content",
  "parseError": {
    "message": "Unexpected token",
    "line": 5,
    "column": 10,
    "name": "YAMLParseError"
  }
}
```

---

## New Components

### ExpandableTextEditor

A textarea with an expand button that opens a full-screen modal.

**Props:**
- `id?: string` - Optional input ID
- `value: string` - Current text value
- `onChange: (value: string) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `label?: string` - Modal header label
- `rows?: number` - Initial textarea rows (default: 4)

### WidgetContextMenu

Right-click context menu for widgets with copy/move functionality.

**Props:**
- `widget: WidgetConfig` - The widget to operate on
- `columnIndex: number` - Source column index
- `widgetIndex: number` - Source widget index
- `pages: PageConfig[]` - All available pages
- `currentPageIndex: number` - Current page index (excluded from targets)
- `position: { x: number; y: number }` - Menu position
- `onClose: () => void` - Close handler
- `onCopyToPage: (targetPageIndex, widget) => void` - Copy handler
- `onMoveToPage: (targetPageIndex, columnIndex, widgetIndex, widget) => void` - Move handler

---

## Test Results

Tests added for:
- YAML parse error handling in configService
- `/api/settings` endpoint
- WidgetContextMenu component
- ExpandableTextEditor component
- CustomApiBuilder parameter serialization

All tests passing.
