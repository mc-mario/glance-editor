# Phase 5 Progress Report

**Date:** January 18, 2026  
**Status:** Complete  
**Version:** 0.5.0

---

## Overview

Phase 5 focuses on quality-of-life improvements including undo/redo functionality, YAML include file management, validation navigation, UI reorganization for better workflow, and separating import/export into dedicated panels.

---

## Completed Tasks

### 1. Undo/Redo System

Added the ability to undo and redo configuration changes made through the visual editor.

**Problem:** Users could accidentally make unwanted changes with no way to revert them without manually editing YAML or reloading.

**Solution:**
- Created `useHistory` hook that maintains a state stack (max 50 entries)
- Each modification pushes a new state with a description (e.g., "Add widget", "Delete page")
- Undo/Redo buttons in header with tooltips showing the action to be undone/redone
- Keyboard shortcuts support (Ctrl+Z / Ctrl+Y)
- History is truncated when branching (new changes after undo discard the "future")

**Files Created:**
- `frontend/src/hooks/useHistory.ts` - History state management hook

**Files Modified:**
- `frontend/src/hooks/useConfig.ts` - Integrated history tracking into config mutations
- `frontend/src/App.tsx` - Added undo/redo buttons to header

### 2. YAML Include File Management

Added support for managing Glance's `$include` directive files directly from the editor.

**Problem:** Glance supports splitting configuration across multiple YAML files using `$include:` directives, but there was no way to view or edit these files from the editor.

**Solution:**
- Backend service to scan for `$include` directives and manage include files
- API endpoints for listing, reading, writing, and deleting include files
- Security measures to prevent directory traversal attacks
- Atomic writes with temp files to prevent corruption
- Protection against modifying/deleting the main config through this API

**Files Created:**
- `backend/src/services/includeService.js` - Include file operations
- `backend/src/routes/includes.js` - REST API endpoints
- `frontend/src/components/IncludeFilesPanel.tsx` - UI panel (later integrated into CodeEditor)

**Files Modified:**
- `backend/src/server.js` - Registered includes router
- `frontend/src/services/api.ts` - Added include file API methods

### 3. Validation Navigation

Added the ability to click on validation errors/warnings to jump directly to the problematic widget in the YAML editor.

**Problem:** Validation panel showed issues but required manual searching to find the widget in the YAML.

**Solution:**
- Created YAML position utilities to locate widgets by page/column/widget indices
- Validation panel items are now clickable
- Clicking opens the YAML editor and scrolls to the exact line
- CodeEditor exposes `scrollToLine` method via ref

**Files Created:**
- `frontend/src/utils/yamlPosition.ts` - YAML parsing utilities to find widget locations

**Files Modified:**
- `frontend/src/components/CodeEditor.tsx` - Added `scrollToLine` via `forwardRef`/`useImperativeHandle`
- `frontend/src/components/ValidationPanel.tsx` - Added click handlers
- `frontend/src/App.tsx` - Added `handleValidationNavigate` to coordinate panels

### 4. UI Reorganization

Reorganized the header and sidebar layout for a cleaner, more intuitive workflow.

#### 4.1 Files Panel Integrated into YAML Editor

**Problem:** The Files panel was a separate floating panel, requiring extra clicks to manage include files while editing YAML.

**Solution:**
- Removed standalone "Files" button from header
- Added collapsible "Files" section directly below the YAML editor header
- Users can switch between main config and include files within the same editor
- Create, delete, and save include files inline

#### 4.2 Theme Button Moved to Left Sidebar

**Problem:** Theme button in header took space and was rarely used during active editing.

**Solution:**
- Removed Theme button from header
- Added Theme button at bottom of left sidebar (below PageList)
- Panel opens anchored to the left side

#### 4.3 Environment Variables Moved to Right Sidebar

**Problem:** Environment variables panel was a floating panel, disconnected from the editing workflow.

**Solution:**
- Removed Env button from header
- Added collapsible "Environment" section at bottom of right sidebar
- Added `compact` prop to `EnvVarManager` for condensed sidebar display
- Shows env var list with "Copy .env template" button

#### 4.4 Selection Styling Improvements

**Problem:** Selected widgets and pages lacked visual distinction.

**Solution:**
- Widget selection: Added glow shadow effect (`shadow-[0_0_0_2px_rgba(...]`)
- Page selection: Increased opacity and added shadow
- Edit/Preview toggle: Added `shadow-sm` to selected state

**Files Modified:**
- `frontend/src/App.tsx` - Removed header buttons, added sidebar sections, updated FloatingPanel type
- `frontend/src/components/CodeEditor.tsx` - Integrated file management
- `frontend/src/components/EnvVarManager.tsx` - Added `compact` prop
- `frontend/src/components/LayoutEditor.tsx` - Widget selection glow
- `frontend/src/components/PageList.tsx` - Page selection styling

### 5. Validate Button Simplification

**Problem:** Validate button with text took unnecessary space in the header.

**Solution:**
- Changed from text button to icon-only button (36x36px)
- Shows error count badge (red), warning count badge (yellow), or green checkmark
- Tooltip shows detailed status

**Files Modified:**
- `frontend/src/App.tsx` - Updated validate button rendering

### 6. Import/Export Panel Separation

**Problem:** Combined Import/Export panel was cluttered and required scrolling between sections.

**Solution:**
- Split into two dedicated panels: `ExportPanel` and `ImportPanel`
- Two separate header buttons with distinct icons (Upload/Download)
- Export panel: scope selection (widget/page/config), format (YAML/JSON), copy, download
- Import panel: file upload, paste area, target column selection
- Removed redact toggle (export always redacts sensitive data)

**Files Created:**
- `frontend/src/components/ExportPanel.tsx` - Dedicated export functionality
- `frontend/src/components/ImportPanel.tsx` - Dedicated import functionality

**Files Deleted:**
- `frontend/src/components/ImportExportPanel.tsx` - Replaced by separate panels

**Files Modified:**
- `frontend/src/App.tsx` - Updated FloatingPanel type, separate buttons and panel rendering

### 7. Context Menu Improvements

Enhanced the widget right-click context menu with better submenu positioning.

**Problem:** Copy/Move to page submenus could overflow the viewport.

**Solution:**
- Submenus now check available space and flip to left side if needed
- Improved hover states and visual feedback

**Files Modified:**
- `frontend/src/components/WidgetContextMenu.tsx` - Submenu positioning logic

---

## API Changes

### New Endpoints: Include File Management

#### GET /api/includes/files
Lists all YAML files in the config directory with their include status.

**Response:**
```json
{
  "files": [
    {
      "name": "widgets.yml",
      "path": "/app/config/widgets.yml",
      "relativePath": "widgets.yml",
      "size": 1234,
      "modified": "2026-01-18T10:00:00.000Z",
      "isMainConfig": false,
      "isIncluded": true
    }
  ]
}
```

#### GET /api/includes/references
Returns all `$include` directives found in the main config.

**Response:**
```json
{
  "includes": [
    {
      "path": "widgets.yml",
      "line": 15,
      "absolutePath": "/app/config/widgets.yml"
    }
  ]
}
```

#### GET /api/includes/file/:path
Reads content of a specific include file.

#### PUT /api/includes/file/:path
Creates or updates an include file. Body: `{ "content": "yaml content" }`

#### DELETE /api/includes/file/:path
Deletes an include file (protected against deleting main config).

---

## Files Changed Summary

### Backend
| File | Changes |
|------|---------|
| `backend/src/services/includeService.js` | **NEW** - Include file operations with security checks |
| `backend/src/routes/includes.js` | **NEW** - REST API for include file management |
| `backend/src/server.js` | Registered includes router |

### Frontend
| File | Changes |
|------|---------|
| `frontend/src/hooks/useHistory.ts` | **NEW** - Undo/redo state management |
| `frontend/src/utils/yamlPosition.ts` | **NEW** - YAML widget location utilities |
| `frontend/src/components/ExportPanel.tsx` | **NEW** - Dedicated export panel |
| `frontend/src/components/ImportPanel.tsx` | **NEW** - Dedicated import panel |
| `frontend/src/components/IncludeFilesPanel.tsx` | **NEW** - Include files UI (integrated into CodeEditor) |
| `frontend/src/components/ImportExportPanel.tsx` | **DELETED** - Replaced by separate panels |
| `frontend/src/App.tsx` | UI reorganization, undo/redo, validation navigation |
| `frontend/src/components/CodeEditor.tsx` | Integrated file management, scrollToLine method |
| `frontend/src/components/EnvVarManager.tsx` | Added compact mode for sidebar |
| `frontend/src/components/LayoutEditor.tsx` | Widget selection glow effect |
| `frontend/src/components/PageList.tsx` | Page selection styling |
| `frontend/src/components/WidgetContextMenu.tsx` | Submenu positioning improvements |
| `frontend/src/components/ValidationPanel.tsx` | Clickable navigation |
| `frontend/src/hooks/useConfig.ts` | History integration |
| `frontend/src/services/api.ts` | Include file API methods |

---

## UI Layout Changes

### Header (Before)
```
[Logo] [Pages dropdown] [YAML] [Files] [Theme] [Env] [Import/Export] [Validate] [Edit|Preview] [Devices]
```

### Header (After)
```
[Logo] [Undo] [Redo] [YAML] [Import] [Export] [Validate] [Edit|Preview] [Devices]
```

### Left Sidebar (After)
```
[Page List]
─────────────
[Theme Button]
```

### Right Sidebar (After)
```
[Widget Palette / Widget Editor]
─────────────
[▼ Environment]
  [Compact env var list]
```

### YAML Editor Panel (After)
```
[Header: YAML Editor] [Refresh] [X]
[▼ Files]
  [glance.yml (main)]
  [widgets.yml]
  [+ New file]
─────────────
[Monaco Editor]
```

---

## Security Considerations

### Include File API Protection
- Path normalization prevents directory traversal (`../`)
- Absolute paths are rejected
- All paths verified to be within config directory
- Main config file protected from modification/deletion via include API
- Only `.yml` and `.yaml` extensions allowed

---

## Next Steps

1. Add keyboard shortcuts documentation overlay
2. Consider adding a "Recent changes" panel showing history entries
3. Add file rename functionality for include files
4. Consider syntax highlighting for `$include` directives in Monaco
