import { Plus, Trash2 } from 'lucide-react';

interface KeyValueInputProps {
  value: Record<string, string> | undefined;
  onChange: (value: Record<string, string> | undefined) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

interface KeyValuePair {
  key: string;
  value: string;
}

export function KeyValueInput({
  value,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueInputProps) {
  // Convert object to array of pairs for editing
  const pairs: KeyValuePair[] = value
    ? Object.entries(value).map(([key, val]) => ({ key, value: val }))
    : [];

  const handleAdd = () => {
    const newPairs = [...pairs, { key: '', value: '' }];
    updateFromPairs(newPairs);
  };

  const handleRemove = (index: number) => {
    const newPairs = pairs.filter((_, i) => i !== index);
    updateFromPairs(newPairs);
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const newPairs = pairs.map((pair, i) =>
      i === index ? { ...pair, key: newKey } : pair
    );
    updateFromPairs(newPairs);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const newPairs = pairs.map((pair, i) =>
      i === index ? { ...pair, value: newValue } : pair
    );
    updateFromPairs(newPairs);
  };

  const updateFromPairs = (newPairs: KeyValuePair[]) => {
    // Filter out pairs with empty keys and convert back to object
    const validPairs = newPairs.filter((p) => p.key.trim() !== '');
    if (validPairs.length === 0 && newPairs.length === 0) {
      onChange(undefined);
    } else {
      const obj = newPairs.reduce((acc, pair) => {
        if (pair.key.trim()) {
          acc[pair.key] = pair.value;
        }
        return acc;
      }, {} as Record<string, string>);
      onChange(Object.keys(obj).length > 0 ? obj : undefined);
    }
  };

  return (
    <div className="key-value-input">
      {pairs.length === 0 ? (
        <div className="key-value-empty">No entries</div>
      ) : (
        <div className="key-value-pairs">
          {pairs.map((pair, index) => (
            <div key={index} className="key-value-pair">
              <input
                type="text"
                value={pair.key}
                onChange={(e) => handleKeyChange(index, e.target.value)}
                placeholder={keyPlaceholder}
                className="form-input key-input"
              />
              <input
                type="text"
                value={pair.value}
                onChange={(e) => handleValueChange(index, e.target.value)}
                placeholder={valuePlaceholder}
                className="form-input value-input"
              />
              <button
                type="button"
                className="btn-icon btn-icon-sm btn-danger"
                onClick={() => handleRemove(index)}
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn btn-secondary key-value-add-btn"
        onClick={handleAdd}
      >
        <Plus size={16} />
        Add Entry
      </button>
    </div>
  );
}
