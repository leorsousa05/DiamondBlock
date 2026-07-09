import { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onChange: (value: string) => void;
  initialValue?: string;
}

export function SearchBar({ placeholder = 'Search…', onChange, initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(value);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, onChange]);

  function handleClear() {
    setValue('');
    onChange('');
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button
          className="search-clear"
          onClick={handleClear}
          aria-label="Clear search"
          title="Clear"
        >
          ×
        </button>
      )}
    </div>
  );
}
