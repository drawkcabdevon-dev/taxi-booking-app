import { useEffect, useMemo, useRef, useState } from 'react';
import { matchLocations, type SuggestedLocation } from './locations';

/**
 * LocationInput — a text field with popular-place suggestions.
 *
 * Tapping the field shows a short list of popular Barbados places
 * (airport, cruise terminal, well-known hotels, areas); typing
 * filters the list. Picking a suggestion fills the field, but the
 * customer can always type any address — nothing here restricts
 * the input. Keyboard: arrows move, Enter picks, Escape closes.
 */

const GROUP_ORDER = ['Airport & Port', 'Hotels', 'Areas & Attractions'];

export default function LocationInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => matchLocations(value), [value]);

  // Close the dropdown on a tap/click outside the field.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open ]);

  const pick = (loc: SuggestedLocation) => {
    onChange(loc.name);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(0);
        return;
      }
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setHighlight((h) => {
        const next = h + dir;
        if (next < 0) return matches.length - 1;
        if (next >= matches.length) return 0;
        return next;
      });
    } else if (e.key === 'Enter' && open && highlight >= 0) {
      e.preventDefault();
      pick(matches[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  // Group the matches under their category headings, in group order.
  const groups = GROUP_ORDER.map((category) => ({
    category,
    items: matches.filter((m) => m.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="loc-wrap" ref={wrapRef}>
        <input
          id={id}
          ref={inputRef}
          value={value}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <button
          type="button"
          className="loc-chevron"
          aria-label="Show popular places"
          tabIndex={-1}
          onClick={() => {
            inputRef.current?.focus();
            setOpen((o) => !o);
          }}
        >
          ▾
        </button>
        {open && matches.length > 0 && (
          <div className="loc-list" role="listbox">
            {groups.map((group) => (
              <div key={group.category}>
                <div className="loc-group">{group.category}</div>
                {group.items.map((loc) => {
                  const idx = matches.indexOf(loc);
                  return (
                    <button
                      key={loc.name}
                      type="button"
                      role="option"
                      aria-selected={idx === highlight}
                      className={`loc-option${idx === highlight ? ' highlighted' : ''}`}
                      onMouseDown={(e) => {
                        // Select before the input blurs and closes us.
                        e.preventDefault();
                        pick(loc);
                      }}
                      onMouseEnter={() => setHighlight(idx)}
                    >
                      <span className="loc-option-name">{loc.name}</span>
                      <span className="loc-option-area">{loc.area}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="loc-hint">
        Start typing or pick a popular place — or type any address.
      </p>
    </div>
  );
}
