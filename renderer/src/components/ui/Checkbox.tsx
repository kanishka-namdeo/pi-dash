import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ checked, onChange }: CheckboxProps) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
      style={{
        backgroundColor: checked ? '#4f46e5' : '#1a1a1a',
        border: `2px solid ${checked ? '#4f46e5' : '#6b7280'}`,
      }}
    >
      {checked && <Check size={14} className="text-white" />}
    </button>
  );
}
