import { useState } from 'react';
import type { PageConfig } from '../types';

interface PageListProps {
  pages: PageConfig[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRename: (index: number, newName: string) => void;
}

export function PageList({
  pages,
  selectedIndex,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
  onRename,
}: PageListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleStartEdit = (index: number, name: string) => {
    setEditingIndex(index);
    setEditingName(name);
  };

  const handleFinishEdit = () => {
    if (editingIndex !== null && editingName.trim()) {
      onRename(editingIndex, editingName.trim());
    }
    setEditingIndex(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditingName('');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getWidgetCount = (page: PageConfig): number => {
    return page.columns.reduce((sum, col) => sum + col.widgets.length, 0);
  };

  return (
    <div className="page-list">
      <div className="page-list-header">
        <span className="section-title">Pages ({pages.length})</span>
        <button className="btn-icon" onClick={onAdd} title="Add page">
          +
        </button>
      </div>
      <ul className="page-list-items">
        {pages.map((page, index) => (
          <li
            key={index}
            className={`page-item ${selectedIndex === index ? 'selected' : ''} ${
              draggedIndex === index ? 'dragging' : ''
            }`}
            draggable={editingIndex !== index}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(index)}
          >
            <span className="page-drag-handle" title="Drag to reorder">
              ⋮⋮
            </span>
            <div className="page-item-content">
              {editingIndex === index ? (
                <input
                  type="text"
                  className="page-name-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="page-name"
                  onDoubleClick={() => handleStartEdit(index, page.name)}
                >
                  {page.name}
                </span>
              )}
              <span className="page-meta">
                {page.slug && <span className="page-slug">/{page.slug}</span>}
                <span className="page-stats">
                  {page.columns.length}c · {getWidgetCount(page)}w
                </span>
              </span>
            </div>
            <div className="page-actions">
              <button
                className="btn-icon btn-icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(index, page.name);
                }}
                title="Rename"
              >
                ✏️
              </button>
              <button
                className="btn-icon btn-icon-sm btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  if (pages.length > 1 && confirm(`Delete page "${page.name}"?`)) {
                    onDelete(index);
                  }
                }}
                title="Delete"
                disabled={pages.length <= 1}
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
