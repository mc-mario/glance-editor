import { Trash2 } from 'lucide-react';
import type { PageConfig } from '../types';

interface PageEditorProps {
  page: PageConfig;
  onChange: (page: PageConfig) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function PageEditor({ page, onChange, onDelete, canDelete = true }: PageEditorProps) {
  const handleChange = (field: keyof PageConfig, value: unknown) => {
    onChange({ ...page, [field]: value });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="page-name" className="text-[0.75rem] font-medium text-text-secondary">Page Name</label>
        <input
          id="page-name"
          className="p-2 bg-bg-primary border border-border rounded-[0.375rem] text-text-primary text-[0.875rem] focus:outline-none focus:border-accent"
          type="text"
          value={page.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Page name"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="page-slug" className="text-[0.75rem] font-medium text-text-secondary">Slug (URL path)</label>
        <input
          id="page-slug"
          className="p-2 bg-bg-primary border border-border rounded-[0.375rem] text-text-primary text-[0.875rem] focus:outline-none focus:border-accent"
          type="text"
          value={page.slug || ''}
          onChange={(e) => handleChange('slug', e.target.value || undefined)}
          placeholder="Auto-generated from name"
        />
        <span className="text-[0.75rem] text-text-muted">Leave empty for auto-generated slug</span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="page-width" className="text-[0.75rem] font-medium text-text-secondary">Page Width</label>
        <select
          id="page-width"
          className="p-2 bg-bg-primary border border-border rounded-[0.375rem] text-text-primary text-[0.875rem] focus:outline-none focus:border-accent"
          value={page.width || ''}
          onChange={(e) => handleChange('width', e.target.value || undefined)}
        >
          <option value="">Default (3 columns max)</option>
          <option value="wide">Wide (3 columns max)</option>
          <option value="slim">Slim (2 columns max)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer text-[0.875rem]">
          <input
            className="w-4 h-4"
            type="checkbox"
            checked={page['show-mobile-header'] || false}
            onChange={(e) => handleChange('show-mobile-header', e.target.checked || undefined)}
          />
          Show mobile header
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer text-[0.875rem]">
          <input
            className="w-4 h-4"
            type="checkbox"
            checked={page['hide-desktop-navigation'] || false}
            onChange={(e) => handleChange('hide-desktop-navigation', e.target.checked || undefined)}
          />
          Hide desktop navigation
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer text-[0.875rem]">
          <input
            className="w-4 h-4"
            type="checkbox"
            checked={page['center-vertically'] || false}
            onChange={(e) => handleChange('center-vertically', e.target.checked || undefined)}
          />
          Center content vertically
        </label>
      </div>

      {onDelete && (
        <div className="flex flex-col gap-1">
          <button
            className="flex items-center gap-[0.375rem] px-4 py-2 rounded-[0.375rem] text-[0.875rem] font-medium cursor-pointer transition-all duration-150 ease-in-out border-none bg-[rgba(191,97,106,0.2)] text-error hover:bg-[rgba(191,97,106,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onDelete}
            disabled={!canDelete}
            title={!canDelete ? 'Cannot delete the last page' : 'Delete this page'}
          >
            <Trash2 size={16} />
            Delete Page
          </button>
          {!canDelete && (
            <span className="text-[0.75rem] text-error">You must have at least one page</span>
          )}
        </div>
      )}
    </div>
  );
}
