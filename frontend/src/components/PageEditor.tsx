import type { PageConfig } from '../types';

interface PageEditorProps {
  page: PageConfig;
  onChange: (page: PageConfig) => void;
}

export function PageEditor({ page, onChange }: PageEditorProps) {
  const handleChange = (field: keyof PageConfig, value: unknown) => {
    onChange({ ...page, [field]: value });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="page-name" className="text-xs font-medium text-text-secondary">
          Page Name
        </label>
        <input
          id="page-name"
          type="text"
          value={page.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Page name"
          className="px-2 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="page-slug" className="text-xs font-medium text-text-secondary">
          Slug (URL path)
        </label>
        <input
          id="page-slug"
          type="text"
          value={page.slug || ''}
          onChange={(e) => handleChange('slug', e.target.value || undefined)}
          placeholder="Auto-generated from name"
          className="px-2 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm focus:outline-none focus:border-accent"
        />
        <span className="text-xs text-text-muted">Leave empty for auto-generated slug</span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="page-width" className="text-xs font-medium text-text-secondary">
          Page Width
        </label>
        <select
          id="page-width"
          value={page.width || ''}
          onChange={(e) => handleChange('width', e.target.value || undefined)}
          className="px-2 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm focus:outline-none focus:border-accent"
        >
          <option value="">Default (3 columns max)</option>
          <option value="wide">Wide (3 columns max)</option>
          <option value="slim">Slim (2 columns max)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={page['show-mobile-header'] || false}
            onChange={(e) => handleChange('show-mobile-header', e.target.checked || undefined)}
            className="w-4 h-4 rounded border-border bg-bg-primary accent-accent"
          />
          Show mobile header
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={page['hide-desktop-navigation'] || false}
            onChange={(e) => handleChange('hide-desktop-navigation', e.target.checked || undefined)}
            className="w-4 h-4 rounded border-border bg-bg-primary accent-accent"
          />
          Hide desktop navigation
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={page['center-vertically'] || false}
            onChange={(e) => handleChange('center-vertically', e.target.checked || undefined)}
            className="w-4 h-4 rounded border-border bg-bg-primary accent-accent"
          />
          Center content vertically
        </label>
      </div>
    </div>
  );
}
