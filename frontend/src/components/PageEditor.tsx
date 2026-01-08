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
    <div className="page-editor">
      <div className="form-group">
        <label htmlFor="page-name">Page Name</label>
        <input
          id="page-name"
          type="text"
          value={page.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Page name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="page-slug">Slug (URL path)</label>
        <input
          id="page-slug"
          type="text"
          value={page.slug || ''}
          onChange={(e) => handleChange('slug', e.target.value || undefined)}
          placeholder="Auto-generated from name"
        />
        <span className="form-hint">Leave empty for auto-generated slug</span>
      </div>

      <div className="form-group">
        <label htmlFor="page-width">Page Width</label>
        <select
          id="page-width"
          value={page.width || ''}
          onChange={(e) => handleChange('width', e.target.value || undefined)}
        >
          <option value="">Default (3 columns max)</option>
          <option value="wide">Wide (3 columns max)</option>
          <option value="slim">Slim (2 columns max)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={page['show-mobile-header'] || false}
            onChange={(e) => handleChange('show-mobile-header', e.target.checked || undefined)}
          />
          Show mobile header
        </label>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={page['hide-desktop-navigation'] || false}
            onChange={(e) => handleChange('hide-desktop-navigation', e.target.checked || undefined)}
          />
          Hide desktop navigation
        </label>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={page['center-vertically'] || false}
            onChange={(e) => handleChange('center-vertically', e.target.checked || undefined)}
          />
          Center content vertically
        </label>
      </div>
    </div>
  );
}
