import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface ArrayInputProps<T> {
  value: T[] | undefined;
  onChange: (value: T[] | undefined) => void;
  renderItem: (item: T, index: number, onChange: (value: T) => void) => React.ReactNode;
  createItem: () => T;
  itemLabel?: string;
  minItems?: number;
  maxItems?: number;
}

export function ArrayInput<T>({
  value,
  onChange,
  renderItem,
  createItem,
  itemLabel = 'Item',
  minItems = 0,
  maxItems,
}: ArrayInputProps<T>) {
  const items = value || [];

  const handleAdd = () => {
    if (maxItems !== undefined && items.length >= maxItems) return;
    onChange([...items, createItem()]);
  };

  const handleRemove = (index: number) => {
    if (items.length <= minItems) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems.length > 0 ? newItems : undefined);
  };

  const handleItemChange = (index: number, newValue: T) => {
    const newItems = items.map((item, i) => (i === index ? newValue : item));
    onChange(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems);
  };

  return (
    <div className="array-input">
      {items.length === 0 ? (
        <div className="array-empty">
          No {itemLabel.toLowerCase()}s added
        </div>
      ) : (
        <div className="array-items">
          {items.map((item, index) => (
            <div key={index} className="array-item">
              <div className="array-item-header">
                <div className="array-item-reorder">
                  <button
                    type="button"
                    className="btn-icon btn-icon-sm"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon-sm"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    title="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="array-item-label">
                  {itemLabel} {index + 1}
                </span>
                <button
                  type="button"
                  className="btn-icon btn-icon-sm btn-danger"
                  onClick={() => handleRemove(index)}
                  disabled={items.length <= minItems}
                  title={`Remove ${itemLabel.toLowerCase()}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="array-item-content">
                {renderItem(item, index, (newValue) => handleItemChange(index, newValue))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn btn-secondary array-add-btn"
        onClick={handleAdd}
        disabled={maxItems !== undefined && items.length >= maxItems}
      >
        <Plus size={16} />
        Add {itemLabel}
      </button>
    </div>
  );
}

// Simple string array input
interface StringArrayInputProps {
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
  placeholder?: string;
  itemLabel?: string;
  minItems?: number;
  maxItems?: number;
}

export function StringArrayInput({
  value,
  onChange,
  placeholder,
  itemLabel = 'Item',
  minItems = 0,
  maxItems,
}: StringArrayInputProps) {
  return (
    <ArrayInput<string>
      value={value}
      onChange={onChange}
      createItem={() => ''}
      itemLabel={itemLabel}
      minItems={minItems}
      maxItems={maxItems}
      renderItem={(item, _index, onItemChange) => (
        <input
          type="text"
          value={item}
          onChange={(e) => onItemChange(e.target.value)}
          placeholder={placeholder}
          className="form-input"
        />
      )}
    />
  );
}
