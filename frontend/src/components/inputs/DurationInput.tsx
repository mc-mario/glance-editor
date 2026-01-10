import { useState, useEffect } from 'react';

interface DurationInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  id?: string;
}

// Parse duration string to components
function parseDuration(value: string): { amount: number; unit: string } {
  const match = value.match(/^(\d+(?:\.\d+)?)(s|m|h|d)$/);
  if (match) {
    return { amount: parseFloat(match[1]), unit: match[2] };
  }
  return { amount: 30, unit: 'm' };
}

export function DurationInput({ value, onChange, placeholder, id }: DurationInputProps) {
  const [amount, setAmount] = useState<string>('');
  const [unit, setUnit] = useState<string>('m');

  useEffect(() => {
    if (value) {
      const parsed = parseDuration(value);
      setAmount(parsed.amount.toString());
      setUnit(parsed.unit);
    } else {
      setAmount('');
      setUnit('m');
    }
  }, [value]);

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
    if (newAmount && !isNaN(parseFloat(newAmount))) {
      onChange(`${newAmount}${unit}`);
    } else if (!newAmount) {
      onChange(undefined);
    }
  };

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    if (amount && !isNaN(parseFloat(amount))) {
      onChange(`${amount}${newUnit}`);
    }
  };

  return (
    <div className="duration-input">
      <input
        type="number"
        id={id}
        value={amount}
        onChange={(e) => handleAmountChange(e.target.value)}
        placeholder={placeholder || '30'}
        min={0}
        step={1}
        className="duration-amount"
      />
      <select
        value={unit}
        onChange={(e) => handleUnitChange(e.target.value)}
        className="duration-unit"
      >
        <option value="s">seconds</option>
        <option value="m">minutes</option>
        <option value="h">hours</option>
        <option value="d">days</option>
      </select>
    </div>
  );
}
