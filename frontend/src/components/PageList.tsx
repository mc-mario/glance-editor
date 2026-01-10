import { useState } from 'react';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PageConfig } from '../types';

interface PageListProps {
  pages: PageConfig[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRename: (index: number, newName: string) => void;
  onOpenSettings: (index: number) => void;
}

export function PageList({
  pages,
  selectedIndex,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
  onRename,
  onOpenSettings,
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

  const getPageInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="page-list">
      <div className="page-list-header">
        <span className="section-title">Pages</span>
        <button className="btn-icon btn-icon-sm" onClick={onAdd} title="Add page">
          <Plus size={14} />
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
            <div className="page-item-main">
              <div 
                className="page-icon-wrapper"
                onClick={(e) => {
                  if (selectedIndex === index) {
                    e.stopPropagation();
                    onOpenSettings(index);
                  }
                }}
                title={selectedIndex === index ? 'Edit page settings' : undefined}
              >
                <span className="page-icon">{getPageInitial(page.name)}</span>
                {selectedIndex === index && (
                  <span className="page-icon-edit">
                    <Pencil size={12} />
                  </span>
                )}
              </div>
              
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
                  title={page.name}
                >
                  {page.name}
                </span>
              )}
            </div>
            
            <div className="page-item-actions">
              <span className="page-drag-handle" title="Drag to reorder">
                <GripVertical size={12} />
              </span>
              <button
                className="btn-icon btn-icon-xs btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  if (pages.length > 1 && confirm(`Delete page "${page.name}"?`)) {
                    onDelete(index);
                  }
                }}
                title="Delete page"
                disabled={pages.length <= 1}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
