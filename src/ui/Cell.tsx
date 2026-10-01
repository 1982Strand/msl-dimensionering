import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { RotateCcw } from 'lucide-react';
import type { TableColumn } from '../engine/table-presentation';
const display = (v: unknown) => (v == null || v === '' ? '—' : String(v));
export function Cell({
  column,
  value,
  label,
  changed,
  standard,
  commit,
  restore,
  refresh,
  emphasized = false,
}: {
  column: TableColumn;
  value: unknown;
  label: string;
  changed: boolean;
  standard: unknown;
  commit: (value: unknown) => boolean;
  restore?: () => void;
  refresh: number;
  emphasized?: boolean;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setText(value == null ? '' : String(value));
    setInvalid(false);
  }, [value, refresh]);
  function finish() {
    if (text === (value == null ? '' : String(value))) return;
    if (
      !input.current ||
      input.current.validity.badInput ||
      input.current.validity.rangeOverflow ||
      input.current.validity.rangeUnderflow ||
      (column.required && !text.trim())
    ) {
      setInvalid(true);
      return;
    }
    const next = column.numeric ? (text === '' ? null : Number(text)) : text;
    const ok = commit(next);
    setInvalid(!ok);
    // Normalisation may produce the same active value (e.g. an optional zero).
    if (ok && next === value) setText(value == null ? '' : String(value));
  }
  return (
    <td
      className={[
        changed ? 'changed-cell' : emphasized ? 'read-point' : '',
        column.numeric ? 'num' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Input
        ref={input}
        className="cell-input"
        aria-label={label}
        title={column.help}
        aria-invalid={invalid}
        type={column.numeric ? 'number' : 'text'}
        min={column.min}
        max={column.max}
        step={column.step}
        required={column.required}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        onBlur={finish}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setText(value == null ? '' : String(value));
            setInvalid(false);
          }
        }}
      />
      {invalid && (
        <span className="text-xs text-destructive">
          {column.numeric
            ? `Angiv et gyldigt tal${column.min == null ? '' : ` fra ${column.min}`}${column.max == null ? '' : ` til ${column.max}`}.`
            : 'Kontrollér værdien.'}
        </span>
      )}
      {changed && restore && (
        <div className="standard-value">
          <span>Standard: {display(standard)}</span>
          <button
            className="cell-reset"
            aria-label={`Gendan ${label}`}
            title="Gendan standardværdi"
            onClick={restore}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      )}
    </td>
  );
}
